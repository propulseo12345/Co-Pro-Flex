-- Revue de code #5 [moyen] : idempotence des paiements — RPC (couche 2/4)
--
-- post_owner_payment et post_supplier_payment acceptent désormais une clé
-- d'idempotence optionnelle (p_idempotency_key). Le INSERT utilise
-- ON CONFLICT DO NOTHING sur l'index unique partiel : si la clé a déjà servi,
-- on n'insère rien et on renvoie le paiement existant (idempotent_replay).
-- C'est atomique -> protège aussi des courses concurrentes (2 onglets / retry).
-- Clé NULL = comportement actuel inchangé (rétro-compatible).
--
-- Basé sur les définitions en base au 2026-05-31. Idempotent (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION public.post_owner_payment(p_copro_id uuid, p_period_id uuid, p_lot_id uuid, p_amount numeric, p_payment_date date, p_method text DEFAULT 'bank_transfer'::text, p_reference text DEFAULT NULL::text, p_call_line_ids uuid[] DEFAULT NULL::uuid[], p_idempotency_key uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_acct512 uuid;
  v_payment_id uuid;
  v_allocated numeric := 0;
  v_overpay numeric;
  v_entries jsonb := '[]'::jsonb;
  v_ltx jsonb;
  v_tx_id uuid;
  v_existing_id uuid;
  v_existing_tx uuid;
  r RECORD;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'post_owner_payment: le montant doit être positif (reçu %)', p_amount;
  END IF;

  SELECT id INTO v_acct512 FROM accounts WHERE copro_id = p_copro_id AND code = '512';
  IF v_acct512 IS NULL THEN
    RAISE EXCEPTION 'post_owner_payment: compte 512 (Banque) introuvable pour la copro %', p_copro_id;
  END IF;

  -- Idempotence : si la clé a déjà servi, on n'insère rien (ON CONFLICT atomique).
  INSERT INTO payments (copro_id, period_id, lot_id, amount, payment_date, method, reference, status, idempotency_key)
  VALUES (p_copro_id, p_period_id, p_lot_id, p_amount, p_payment_date, p_method::payment_method, p_reference, 'recorded', p_idempotency_key)
  ON CONFLICT (copro_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
  RETURNING id INTO v_payment_id;

  IF v_payment_id IS NULL THEN
    -- Clé déjà utilisée : on renvoie le paiement déjà enregistré, sans le rejouer.
    SELECT id, ledger_tx_id INTO v_existing_id, v_existing_tx
    FROM payments WHERE copro_id = p_copro_id AND idempotency_key = p_idempotency_key;
    RETURN jsonb_build_object('success', true, 'payment_id', v_existing_id,
      'ledger_tx_id', v_existing_tx, 'idempotent_replay', true);
  END IF;

  PERFORM allocate_payment(v_payment_id, p_call_line_ids);

  FOR r IN
    SELECT COALESCE(b.budget_type::text, 'current') AS nature, sum(pa.amount_allocated) AS amt
    FROM payment_allocations pa
    JOIN call_for_funds_lines cfl ON cfl.id = pa.call_line_id
    JOIN call_for_funds cf ON cf.id = cfl.call_id
    LEFT JOIN budgets b ON b.id = cf.budget_id
    WHERE pa.payment_id = v_payment_id
    GROUP BY COALESCE(b.budget_type::text, 'current')
  LOOP
    v_allocated := v_allocated + r.amt;
    v_entries := v_entries || jsonb_build_array(jsonb_build_object(
      'account_id', resolve_lot_tiers_account(p_copro_id, r.nature),
      'lot_id', p_lot_id, 'direction', 'credit', 'amount', r.amt,
      'entry_label', 'Règlement copropriétaire'
    ));
  END LOOP;

  v_overpay := round(p_amount - v_allocated, 2);
  IF v_overpay > 0 THEN
    v_entries := v_entries || jsonb_build_array(jsonb_build_object(
      'account_id', resolve_lot_tiers_account(p_copro_id, 'advance'),
      'lot_id', p_lot_id, 'direction', 'credit', 'amount', v_overpay,
      'entry_label', 'Avance / trop-perçu'
    ));
  END IF;

  v_entries := v_entries || jsonb_build_array(jsonb_build_object(
    'account_id', v_acct512, 'direction', 'debit', 'amount', p_amount,
    'entry_label', 'Encaissement copropriétaire'
  ));

  v_ltx := create_ledger_transaction(
    p_copro_id, p_period_id, p_payment_date, 'Paiement copropriétaire', 'payment', v_payment_id, v_entries, true
  );
  IF NOT (v_ltx->>'success')::boolean THEN
    RAISE EXCEPTION 'post_owner_payment: échec écriture grand livre : %', v_ltx->>'error';
  END IF;
  v_tx_id := (v_ltx->>'tx_id')::uuid;
  UPDATE payments SET ledger_tx_id = v_tx_id WHERE id = v_payment_id;

  RETURN jsonb_build_object(
    'success', true, 'payment_id', v_payment_id, 'ledger_tx_id', v_tx_id,
    'allocated', v_allocated, 'overpayment', GREATEST(v_overpay, 0)
  );
END;
$function$;


CREATE OR REPLACE FUNCTION public.post_supplier_payment(p_copro_id uuid, p_period_id uuid, p_supplier_invoice_id uuid, p_amount numeric, p_payment_date date, p_method text DEFAULT 'bank_transfer'::text, p_reference text DEFAULT NULL::text, p_idempotency_key uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inv RECORD;
  v_acct401 uuid;
  v_acct512 uuid;
  v_payment_id uuid;
  v_paid numeric;
  v_entries jsonb;
  v_ltx jsonb;
  v_tx_id uuid;
  v_existing_id uuid;
  v_existing_tx uuid;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'post_supplier_payment: le montant doit être positif';
  END IF;

  SELECT * INTO v_inv FROM supplier_invoices WHERE id = p_supplier_invoice_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'post_supplier_payment: facture % introuvable', p_supplier_invoice_id;
  END IF;
  IF v_inv.status::text NOT IN ('posted', 'paid') THEN
    RAISE EXCEPTION 'post_supplier_payment: la facture doit être comptabilisée (posted) avant paiement (statut=%)', v_inv.status;
  END IF;

  SELECT id INTO v_acct401 FROM accounts WHERE copro_id = p_copro_id AND code = '401';
  SELECT id INTO v_acct512 FROM accounts WHERE copro_id = p_copro_id AND code = '512';
  IF v_acct401 IS NULL OR v_acct512 IS NULL THEN
    RAISE EXCEPTION 'post_supplier_payment: comptes 401/512 manquants pour la copro %', p_copro_id;
  END IF;

  -- Idempotence : si la clé a déjà servi, on n'insère rien (ON CONFLICT atomique).
  INSERT INTO supplier_payments (copro_id, period_id, supplier_invoice_id, payment_date, amount, method, reference, idempotency_key)
  VALUES (p_copro_id, p_period_id, p_supplier_invoice_id, p_payment_date, p_amount, p_method::payment_method, p_reference, p_idempotency_key)
  ON CONFLICT (copro_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
  RETURNING id INTO v_payment_id;

  IF v_payment_id IS NULL THEN
    SELECT id, ledger_tx_id INTO v_existing_id, v_existing_tx
    FROM supplier_payments WHERE copro_id = p_copro_id AND idempotency_key = p_idempotency_key;
    RETURN jsonb_build_object('success', true, 'payment_id', v_existing_id,
      'ledger_tx_id', v_existing_tx, 'idempotent_replay', true);
  END IF;

  v_entries := jsonb_build_array(
    jsonb_build_object('account_id', v_acct401, 'direction', 'debit',  'amount', p_amount, 'entry_label', 'Règlement fournisseur'),
    jsonb_build_object('account_id', v_acct512, 'direction', 'credit', 'amount', p_amount, 'entry_label', 'Décaissement banque')
  );

  v_ltx := create_ledger_transaction(
    p_copro_id, p_period_id, p_payment_date, 'Paiement fournisseur', 'supplier_payment', v_payment_id, v_entries, true
  );
  IF NOT (v_ltx->>'success')::boolean THEN
    RAISE EXCEPTION 'post_supplier_payment: échec écriture grand livre : %', v_ltx->>'error';
  END IF;
  v_tx_id := (v_ltx->>'tx_id')::uuid;
  UPDATE supplier_payments SET ledger_tx_id = v_tx_id WHERE id = v_payment_id;

  SELECT COALESCE(sum(amount), 0) INTO v_paid FROM supplier_payments WHERE supplier_invoice_id = p_supplier_invoice_id;
  IF v_paid >= v_inv.total_amount - 0.01 THEN
    UPDATE supplier_invoices SET status = 'paid' WHERE id = p_supplier_invoice_id AND status != 'paid';
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'payment_id', v_payment_id, 'ledger_tx_id', v_tx_id,
    'invoice_status', CASE WHEN v_paid >= v_inv.total_amount - 0.01 THEN 'paid' ELSE 'posted' END
  );
END;
$function$;
