-- ============================================================================
-- WP1 — Socle grand livre : RPC métier qui passent par create_ledger_transaction
-- ============================================================================
-- Contexte : les 4 opérations financières (facture fournisseur, paiement
-- fournisseur, paiement copropriétaire, appel de fonds) doivent ALIMENTER le
-- grand livre via la route canonique create_ledger_transaction, en respectant :
--   - le modèle 450-x par nature + lot_id obligatoire (trigger enforce_lot_id_on_45x)
--   - l'équilibre débit/crédit (post_ledger_transaction)
--   - source_id renseigné (backref pièce <-> écriture)
-- Les edge functions deviennent de simples wrappers qui appellent ces RPC.
--
-- Inclut aussi un correctif de allocate_payment (double comptage amount_paid).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Correctif allocate_payment : NE PLUS incrémenter amount_paid à la main.
--    Le trigger AFTER trg_allocation_update_line recalcule déjà
--    amount_paid = SUM(amount_allocated). L'incrément manuel doublait la valeur.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.allocate_payment(
  p_payment_id uuid,
  p_call_line_ids uuid[] DEFAULT NULL::uuid[]
)
RETURNS TABLE(call_line_id uuid, amount_allocated numeric)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_payment RECORD;
  v_remaining NUMERIC;
  v_line RECORD;
  v_alloc NUMERIC;
  v_copro_id UUID;
BEGIN
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found: %', p_payment_id;
  END IF;

  v_copro_id := v_payment.copro_id;
  v_remaining := v_payment.amount;

  DELETE FROM payment_allocations WHERE payment_id = p_payment_id;

  IF p_call_line_ids IS NULL THEN
    FOR v_line IN
      SELECT cfl.id, cfl.amount_due, cfl.amount_paid, cfl.amount_due - cfl.amount_paid AS remaining
      FROM call_for_funds_lines cfl
      JOIN call_for_funds cf ON cf.id = cfl.call_id
      WHERE cfl.lot_id = v_payment.lot_id
        AND cfl.copro_id = v_copro_id
        AND cfl.status != 'paid'
        AND cf.status != 'cancelled'
      ORDER BY cf.issue_date ASC, cf.id ASC
    LOOP
      EXIT WHEN v_remaining <= 0;
      v_alloc := LEAST(v_remaining, v_line.remaining);
      IF v_alloc > 0 THEN
        INSERT INTO payment_allocations (copro_id, payment_id, call_line_id, amount_allocated)
        VALUES (v_copro_id, p_payment_id, v_line.id, v_alloc);
        -- amount_paid maintenu par le trigger trg_allocation_update_line (pas d'update manuel)
        v_remaining := v_remaining - v_alloc;
        call_line_id := v_line.id;
        amount_allocated := v_alloc;
        RETURN NEXT;
      END IF;
    END LOOP;
  ELSE
    FOR v_line IN
      SELECT cfl.id, cfl.amount_due, cfl.amount_paid, cfl.amount_due - cfl.amount_paid AS remaining
      FROM call_for_funds_lines cfl
      WHERE cfl.id = ANY(p_call_line_ids)
        AND cfl.copro_id = v_copro_id
        AND cfl.status != 'paid'
      ORDER BY array_position(p_call_line_ids, cfl.id)
    LOOP
      EXIT WHEN v_remaining <= 0;
      v_alloc := LEAST(v_remaining, v_line.remaining);
      IF v_alloc > 0 THEN
        INSERT INTO payment_allocations (copro_id, payment_id, call_line_id, amount_allocated)
        VALUES (v_copro_id, p_payment_id, v_line.id, v_alloc);
        v_remaining := v_remaining - v_alloc;
        call_line_id := v_line.id;
        amount_allocated := v_alloc;
        RETURN NEXT;
      END IF;
    END LOOP;
  END IF;

  -- Recalage du statut des appels concernés (idempotent, en complément des triggers)
  UPDATE call_for_funds cf
  SET status = CASE
    WHEN cf.status IN ('draft', 'cancelled') THEN cf.status
    WHEN NOT EXISTS (SELECT 1 FROM call_for_funds_lines cfl WHERE cfl.call_id = cf.id AND cfl.status != 'paid') THEN 'paid'
    WHEN EXISTS (SELECT 1 FROM call_for_funds_lines cfl WHERE cfl.call_id = cf.id AND cfl.amount_paid > 0) THEN 'partially_paid'
    ELSE 'issued'
  END
  WHERE cf.id IN (
    SELECT DISTINCT cfl.call_id FROM payment_allocations pa
    JOIN call_for_funds_lines cfl ON cfl.id = pa.call_line_id
    WHERE pa.payment_id = p_payment_id
  );

  RETURN;
END;
$function$;

-- ----------------------------------------------------------------------------
-- 1. post_supplier_invoice : comptabilise une facture fournisseur
--    Débit comptes de charges (6xx, une écriture par ligne) / Crédit 401.
--    TVA portée sur la pièce (montant_ht/tva/taux), pas sur le grand livre.
--    Montant des lignes = TTC (TVA non récupérable en copropriété).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_supplier_invoice(
  p_copro_id uuid,
  p_period_id uuid,
  p_supplier_id uuid,
  p_invoice_number text,
  p_invoice_date date,
  p_due_date date,
  p_label text,
  p_lines jsonb,
  p_document_id uuid DEFAULT NULL,
  p_related_service_order_id uuid DEFAULT NULL,
  p_post_immediately boolean DEFAULT true,
  p_montant_ht numeric DEFAULT NULL,
  p_montant_tva numeric DEFAULT NULL,
  p_taux_tva numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total numeric;
  v_acct401 uuid;
  v_invoice_id uuid;
  v_entries jsonb;
  v_ltx jsonb;
  v_tx_id uuid := NULL;
BEGIN
  IF p_lines IS NULL OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'post_supplier_invoice: au moins une ligne de charge est requise';
  END IF;

  SELECT sum((l->>'amount')::numeric) INTO v_total
  FROM jsonb_array_elements(p_lines) l;

  IF v_total IS NULL OR v_total <= 0 THEN
    RAISE EXCEPTION 'post_supplier_invoice: le total TTC doit être positif (reçu %)', v_total;
  END IF;

  INSERT INTO supplier_invoices (
    copro_id, period_id, supplier_id, invoice_number, invoice_date, due_date,
    label, total_amount, status, related_service_order_id, document_id,
    montant_ht, montant_tva, taux_tva
  ) VALUES (
    p_copro_id, p_period_id, p_supplier_id, p_invoice_number, p_invoice_date, p_due_date,
    p_label, v_total,
    (CASE WHEN p_post_immediately THEN 'posted' ELSE 'draft' END)::supplier_invoice_status,
    p_related_service_order_id, p_document_id,
    p_montant_ht, p_montant_tva, p_taux_tva
  )
  RETURNING id INTO v_invoice_id;

  INSERT INTO supplier_invoice_lines (
    copro_id, invoice_id, account_id, label, amount,
    repartition_key_id, budget_line_id, amount_ht, amount_tva, taux_pct
  )
  SELECT
    p_copro_id, v_invoice_id, (l->>'account_id')::uuid, l->>'label', (l->>'amount')::numeric,
    NULLIF(l->>'repartition_key_id','')::uuid, NULLIF(l->>'budget_line_id','')::uuid,
    NULLIF(l->>'amount_ht','')::numeric, NULLIF(l->>'amount_tva','')::numeric, NULLIF(l->>'taux_pct','')::numeric
  FROM jsonb_array_elements(p_lines) l;

  IF p_post_immediately THEN
    SELECT id INTO v_acct401 FROM accounts WHERE copro_id = p_copro_id AND code = '401';
    IF v_acct401 IS NULL THEN
      RAISE EXCEPTION 'post_supplier_invoice: compte 401 (Fournisseurs) introuvable pour la copro %', p_copro_id;
    END IF;

    -- Débit charges (une écriture par ligne)
    SELECT jsonb_agg(jsonb_build_object(
      'account_id', (l->>'account_id')::uuid,
      'direction', 'debit',
      'amount', (l->>'amount')::numeric,
      'entry_label', COALESCE(l->>'label', p_label)
    ))
    INTO v_entries
    FROM jsonb_array_elements(p_lines) l;

    -- Crédit fournisseur (total)
    v_entries := v_entries || jsonb_build_array(jsonb_build_object(
      'account_id', v_acct401,
      'direction', 'credit',
      'amount', v_total,
      'entry_label', 'Dette fournisseur : ' || p_label
    ));

    v_ltx := create_ledger_transaction(
      p_copro_id, p_period_id, p_invoice_date,
      'Facture fournisseur : ' || p_label,
      'supplier_invoice', v_invoice_id, v_entries, true
    );

    IF NOT (v_ltx->>'success')::boolean THEN
      RAISE EXCEPTION 'post_supplier_invoice: échec écriture grand livre : %', v_ltx->>'error';
    END IF;

    v_tx_id := (v_ltx->>'tx_id')::uuid;
    UPDATE supplier_invoices SET ledger_tx_id = v_tx_id WHERE id = v_invoice_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'invoice_id', v_invoice_id,
    'ledger_tx_id', v_tx_id,
    'total_amount', v_total
  );
END;
$function$;

-- ----------------------------------------------------------------------------
-- 2. post_supplier_payment : règle une facture fournisseur
--    Débit 401 (la dette diminue) / Crédit 512 (la banque diminue).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_supplier_payment(
  p_copro_id uuid,
  p_period_id uuid,
  p_supplier_invoice_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_method text DEFAULT 'bank_transfer',
  p_reference text DEFAULT NULL
)
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

  INSERT INTO supplier_payments (
    copro_id, period_id, supplier_invoice_id, payment_date, amount, method, reference
  ) VALUES (
    p_copro_id, p_period_id, p_supplier_invoice_id, p_payment_date, p_amount,
    p_method::payment_method, p_reference
  )
  RETURNING id INTO v_payment_id;

  v_entries := jsonb_build_array(
    jsonb_build_object('account_id', v_acct401, 'direction', 'debit',  'amount', p_amount, 'entry_label', 'Règlement fournisseur'),
    jsonb_build_object('account_id', v_acct512, 'direction', 'credit', 'amount', p_amount, 'entry_label', 'Décaissement banque')
  );

  v_ltx := create_ledger_transaction(
    p_copro_id, p_period_id, p_payment_date,
    'Paiement fournisseur', 'supplier_payment', v_payment_id, v_entries, true
  );

  IF NOT (v_ltx->>'success')::boolean THEN
    RAISE EXCEPTION 'post_supplier_payment: échec écriture grand livre : %', v_ltx->>'error';
  END IF;

  v_tx_id := (v_ltx->>'tx_id')::uuid;
  UPDATE supplier_payments SET ledger_tx_id = v_tx_id WHERE id = v_payment_id;

  -- Statut de la facture (le trigger le fait déjà ; recalage idempotent)
  SELECT COALESCE(sum(amount), 0) INTO v_paid FROM supplier_payments WHERE supplier_invoice_id = p_supplier_invoice_id;
  IF v_paid >= v_inv.total_amount - 0.01 THEN
    UPDATE supplier_invoices SET status = 'paid' WHERE id = p_supplier_invoice_id AND status != 'paid';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'ledger_tx_id', v_tx_id,
    'invoice_status', CASE WHEN v_paid >= v_inv.total_amount - 0.01 THEN 'paid' ELSE 'posted' END
  );
END;
$function$;

-- ----------------------------------------------------------------------------
-- 3. post_owner_payment : encaisse un paiement copropriétaire
--    Débit 512 (banque) / Crédit 450-x ventilé par nature des appels lettrés
--    (FIFO via allocate_payment), le trop-perçu va en 450-3 (avances).
--    lot_id obligatoire sur chaque écriture 450-x.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_owner_payment(
  p_copro_id uuid,
  p_period_id uuid,
  p_lot_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_method text DEFAULT 'bank_transfer',
  p_reference text DEFAULT NULL,
  p_call_line_ids uuid[] DEFAULT NULL
)
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
  r RECORD;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'post_owner_payment: le montant doit être positif (reçu %)', p_amount;
  END IF;

  SELECT id INTO v_acct512 FROM accounts WHERE copro_id = p_copro_id AND code = '512';
  IF v_acct512 IS NULL THEN
    RAISE EXCEPTION 'post_owner_payment: compte 512 (Banque) introuvable pour la copro %', p_copro_id;
  END IF;

  INSERT INTO payments (
    copro_id, period_id, lot_id, amount, payment_date, method, reference, status
  ) VALUES (
    p_copro_id, p_period_id, p_lot_id, p_amount, p_payment_date,
    p_method::payment_method, p_reference, 'recorded'
  )
  RETURNING id INTO v_payment_id;

  -- Allocation FIFO (alimente payment_allocations + maj amount_paid via trigger)
  PERFORM allocate_payment(v_payment_id, p_call_line_ids);

  -- Crédits 450-x regroupés par nature (depuis les allocations de ce paiement)
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
      'lot_id', p_lot_id,
      'direction', 'credit',
      'amount', r.amt,
      'entry_label', 'Règlement copropriétaire'
    ));
  END LOOP;

  -- Trop-perçu -> 450-3 (avances)
  v_overpay := round(p_amount - v_allocated, 2);
  IF v_overpay > 0 THEN
    v_entries := v_entries || jsonb_build_array(jsonb_build_object(
      'account_id', resolve_lot_tiers_account(p_copro_id, 'advance'),
      'lot_id', p_lot_id,
      'direction', 'credit',
      'amount', v_overpay,
      'entry_label', 'Avance / trop-perçu'
    ));
  END IF;

  -- Débit banque (total encaissé)
  v_entries := v_entries || jsonb_build_array(jsonb_build_object(
    'account_id', v_acct512,
    'direction', 'debit',
    'amount', p_amount,
    'entry_label', 'Encaissement copropriétaire'
  ));

  v_ltx := create_ledger_transaction(
    p_copro_id, p_period_id, p_payment_date,
    'Paiement copropriétaire', 'payment', v_payment_id, v_entries, true
  );

  IF NOT (v_ltx->>'success')::boolean THEN
    RAISE EXCEPTION 'post_owner_payment: échec écriture grand livre : %', v_ltx->>'error';
  END IF;

  v_tx_id := (v_ltx->>'tx_id')::uuid;
  UPDATE payments SET ledger_tx_id = v_tx_id WHERE id = v_payment_id;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'ledger_tx_id', v_tx_id,
    'allocated', v_allocated,
    'overpayment', GREATEST(v_overpay, 0)
  );
END;
$function$;

-- ----------------------------------------------------------------------------
-- 4. post_call_for_funds : émet un appel de fonds
--    N écritures (une par lot) Débit 450-x (avec lot_id) / 1 écriture Crédit :
--      - courant -> 701 (provisions sur opérations courantes)
--      - travaux -> 702 (provisions sur travaux art. 14-2)
--      - ALUR    -> 105 (Fonds de travaux, RÉSERVE classe 1, art. 14-2 II) :
--        la cotisation au fonds de travaux n'est PAS un produit de l'exercice,
--        elle alimente directement la réserve (705 ne sert qu'à l'AFFECTATION
--        ultérieure du fonds à des travaux : Débit 105 / Crédit 705).
--    Nature dérivée du budget.
--    total_amount recalculé = somme des lignes arrondies (garantit l'équilibre
--    et l'invariant somme(lignes)=total).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_call_for_funds(
  p_copro_id uuid,
  p_period_id uuid,
  p_budget_id uuid,
  p_repartition_key_id uuid,
  p_label text,
  p_trimester integer,
  p_issue_date date,
  p_due_date date,
  p_total_amount numeric,
  p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_nature text;
  v_debit_acct uuid;
  v_credit_code text;
  v_credit_acct uuid;
  v_total_weight numeric;
  v_actual_total numeric;
  v_call_id uuid;
  v_entries jsonb;
  v_ltx jsonb;
  v_tx_id uuid;
  v_nb integer;
BEGIN
  IF p_total_amount IS NULL OR p_total_amount <= 0 THEN
    RAISE EXCEPTION 'post_call_for_funds: total_amount doit être positif (reçu %)', p_total_amount;
  END IF;

  -- Nature depuis le budget (sinon courant)
  IF p_budget_id IS NOT NULL THEN
    SELECT budget_type::text INTO v_nature FROM budgets WHERE id = p_budget_id;
  END IF;
  v_nature := COALESCE(v_nature, 'current');

  v_debit_acct := resolve_lot_tiers_account(p_copro_id, v_nature);

  -- Compte crédité selon la nature (cf. arrêté 14 mars 2005, plan comptable copro) :
  --   courant -> 701, travaux -> 702, fonds de travaux ALUR -> 105 (réserve, pas un produit)
  v_credit_code := CASE v_nature
    WHEN 'current' THEN '701'
    WHEN 'works'   THEN '702'
    WHEN 'alur'    THEN '105'
    ELSE '701'
  END;
  SELECT id INTO v_credit_acct FROM accounts WHERE copro_id = p_copro_id AND code = v_credit_code;
  IF v_credit_acct IS NULL THEN
    RAISE EXCEPTION 'post_call_for_funds: compte de contrepartie % introuvable pour la copro %', v_credit_code, p_copro_id;
  END IF;

  SELECT sum(weight) INTO v_total_weight FROM repartition_key_lines WHERE key_id = p_repartition_key_id;
  IF v_total_weight IS NULL OR v_total_weight <= 0 THEN
    RAISE EXCEPTION 'post_call_for_funds: clé de répartition % vide ou sans poids', p_repartition_key_id;
  END IF;

  -- Total réel = somme des lignes arrondies (évite tout écart d'arrondi)
  SELECT sum(round(p_total_amount * weight / v_total_weight, 2))
  INTO v_actual_total
  FROM repartition_key_lines WHERE key_id = p_repartition_key_id;

  -- Création de l'appel (total = total réel pour respecter l'invariant)
  INSERT INTO call_for_funds (
    copro_id, period_id, budget_id, repartition_key_id, label, trimester,
    issue_date, due_date, total_amount, status, issued_at, description
  ) VALUES (
    p_copro_id, p_period_id, p_budget_id, p_repartition_key_id, p_label, p_trimester,
    p_issue_date, p_due_date, v_actual_total, 'issued', now(), p_description
  )
  RETURNING id INTO v_call_id;

  -- Lignes par lot, en UNE seule instruction (les triggers AFTER ROW
  -- d'invariant se déclenchent en fin d'instruction => somme complète = total).
  INSERT INTO call_for_funds_lines (copro_id, call_id, lot_id, amount_due)
  SELECT p_copro_id, v_call_id, lot_id, round(p_total_amount * weight / v_total_weight, 2)
  FROM repartition_key_lines WHERE key_id = p_repartition_key_id;

  -- Écritures : N débits 450-x (avec lot_id), 1 crédit 701/702 (total)
  SELECT jsonb_agg(jsonb_build_object(
    'account_id', v_debit_acct,
    'lot_id', lot_id,
    'direction', 'debit',
    'amount', round(p_total_amount * weight / v_total_weight, 2),
    'entry_label', 'Appel : ' || p_label
  ))
  INTO v_entries
  FROM repartition_key_lines WHERE key_id = p_repartition_key_id;

  v_entries := v_entries || jsonb_build_array(jsonb_build_object(
    'account_id', v_credit_acct,
    'direction', 'credit',
    'amount', v_actual_total,
    'entry_label', 'Appel : ' || p_label
  ));

  v_ltx := create_ledger_transaction(
    p_copro_id, p_period_id, p_issue_date,
    'Appel de fonds : ' || p_label,
    'call_for_funds', v_call_id, v_entries, true
  );

  IF NOT (v_ltx->>'success')::boolean THEN
    RAISE EXCEPTION 'post_call_for_funds: échec écriture grand livre : %', v_ltx->>'error';
  END IF;

  v_tx_id := (v_ltx->>'tx_id')::uuid;
  UPDATE call_for_funds SET ledger_tx_id = v_tx_id WHERE id = v_call_id;

  SELECT count(*) INTO v_nb FROM call_for_funds_lines WHERE call_id = v_call_id;

  RETURN jsonb_build_object(
    'success', true,
    'call_id', v_call_id,
    'ledger_tx_id', v_tx_id,
    'total_amount', v_actual_total,
    'nb_lines', v_nb,
    'nature', v_nature
  );
END;
$function$;

-- ----------------------------------------------------------------------------
-- Droits d'exécution (les edge functions appellent ces RPC avec le JWT user)
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.post_supplier_invoice(uuid, uuid, uuid, text, date, date, text, jsonb, uuid, uuid, boolean, numeric, numeric, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.post_supplier_payment(uuid, uuid, uuid, numeric, date, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.post_owner_payment(uuid, uuid, uuid, numeric, date, text, text, uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.post_call_for_funds(uuid, uuid, uuid, uuid, text, integer, date, date, numeric, text) TO authenticated, service_role;
