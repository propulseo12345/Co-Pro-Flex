-- Lot 1 V3-light : filtre nature OPTIONNEL sur l'imputation (pas de colonne stockée sur payments).
-- Le GL dérive déjà la nature et crédite le bon 450-x. Le filtre restreint l'auto-allocation à une
-- nature (current/works/alur) ; NULL = multi-nature (défaut légal art.1342-10). Consolide les overloads.
-- Vérifié non-cascade : seed_golden_loop (9 args positionnels) + edge record_payment (named params)
-- tombent sur les défauts. Appliquée via MCP le 2026-06-03 (test filtre nature PASS sur copro jetable).

-- 1) allocate_payment : ajoute p_nature_filter (DROP 2-arg -> CREATE 3-arg superset)
DROP FUNCTION IF EXISTS public.allocate_payment(uuid, uuid[]);
CREATE OR REPLACE FUNCTION public.allocate_payment(
  p_payment_id uuid, p_call_line_ids uuid[] DEFAULT NULL::uuid[], p_nature_filter text DEFAULT NULL::text)
 RETURNS TABLE(call_line_id uuid, amount_allocated numeric)
 LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE
  v_payment RECORD; v_remaining NUMERIC; v_line RECORD; v_alloc NUMERIC; v_copro_id UUID;
BEGIN
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found: %', p_payment_id; END IF;
  v_copro_id := v_payment.copro_id;
  v_remaining := v_payment.amount;
  DELETE FROM payment_allocations WHERE payment_id = p_payment_id;

  IF p_call_line_ids IS NULL THEN
    FOR v_line IN
      SELECT cfl.id, cfl.amount_due - cfl.amount_paid AS remaining
      FROM call_for_funds_lines cfl
      JOIN call_for_funds cf ON cf.id = cfl.call_id
      LEFT JOIN budgets b ON b.id = cf.budget_id
      WHERE cfl.lot_id = v_payment.lot_id AND cfl.copro_id = v_copro_id
        AND cfl.status != 'paid' AND cf.status != 'cancelled'
        AND (p_nature_filter IS NULL OR COALESCE(b.budget_type::text,'current') = p_nature_filter)
      ORDER BY cf.issue_date ASC, cf.id ASC
    LOOP
      EXIT WHEN v_remaining <= 0;
      v_alloc := LEAST(v_remaining, v_line.remaining);
      IF v_alloc > 0 THEN
        INSERT INTO payment_allocations (copro_id, payment_id, call_line_id, amount_allocated)
        VALUES (v_copro_id, p_payment_id, v_line.id, v_alloc);
        v_remaining := v_remaining - v_alloc;
        call_line_id := v_line.id; amount_allocated := v_alloc; RETURN NEXT;
      END IF;
    END LOOP;
  ELSE
    FOR v_line IN
      SELECT cfl.id, cfl.amount_due - cfl.amount_paid AS remaining
      FROM call_for_funds_lines cfl
      JOIN call_for_funds cf ON cf.id = cfl.call_id
      LEFT JOIN budgets b ON b.id = cf.budget_id
      WHERE cfl.id = ANY(p_call_line_ids) AND cfl.copro_id = v_copro_id AND cfl.lot_id = v_payment.lot_id
        AND cfl.status != 'paid' AND cf.status != 'cancelled'
        AND (p_nature_filter IS NULL OR COALESCE(b.budget_type::text,'current') = p_nature_filter)
      ORDER BY array_position(p_call_line_ids, cfl.id)
    LOOP
      EXIT WHEN v_remaining <= 0;
      v_alloc := LEAST(v_remaining, v_line.remaining);
      IF v_alloc > 0 THEN
        INSERT INTO payment_allocations (copro_id, payment_id, call_line_id, amount_allocated)
        VALUES (v_copro_id, p_payment_id, v_line.id, v_alloc);
        v_remaining := v_remaining - v_alloc;
        call_line_id := v_line.id; amount_allocated := v_alloc; RETURN NEXT;
      END IF;
    END LOOP;
  END IF;

  UPDATE call_for_funds cf SET status = CASE
    WHEN cf.status IN ('draft', 'cancelled') THEN cf.status
    WHEN NOT EXISTS (SELECT 1 FROM call_for_funds_lines cfl WHERE cfl.call_id = cf.id AND cfl.status != 'paid') THEN 'paid'
    WHEN EXISTS (SELECT 1 FROM call_for_funds_lines cfl WHERE cfl.call_id = cf.id AND cfl.amount_paid > 0) THEN 'partially_paid'
    ELSE 'issued' END
  WHERE cf.id IN (
    SELECT DISTINCT cfl.call_id FROM payment_allocations pa
    JOIN call_for_funds_lines cfl ON cfl.id = pa.call_line_id WHERE pa.payment_id = p_payment_id);
  RETURN;
END;
$function$;

-- 2) post_owner_payment : consolide en UNE fonction avec p_nature_filter (DROP overloads 8 et 9 args)
DROP FUNCTION IF EXISTS public.post_owner_payment(uuid,uuid,uuid,numeric,date,text,text,uuid[]);
DROP FUNCTION IF EXISTS public.post_owner_payment(uuid,uuid,uuid,numeric,date,text,text,uuid[],uuid);
CREATE OR REPLACE FUNCTION public.post_owner_payment(
  p_copro_id uuid, p_period_id uuid, p_lot_id uuid, p_amount numeric, p_payment_date date,
  p_method text DEFAULT 'bank_transfer'::text, p_reference text DEFAULT NULL::text,
  p_call_line_ids uuid[] DEFAULT NULL::uuid[], p_idempotency_key uuid DEFAULT NULL::uuid,
  p_nature_filter text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_acct512 uuid; v_payment_id uuid; v_allocated numeric := 0; v_overpay numeric;
  v_entries jsonb := '[]'::jsonb; v_ltx jsonb; v_tx_id uuid; v_existing_id uuid; v_existing_tx uuid; r RECORD;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'post_owner_payment: le montant doit être positif (reçu %)', p_amount;
  END IF;
  SELECT id INTO v_acct512 FROM accounts WHERE copro_id = p_copro_id AND code = '512';
  IF v_acct512 IS NULL THEN
    RAISE EXCEPTION 'post_owner_payment: compte 512 (Banque) introuvable pour la copro %', p_copro_id;
  END IF;

  INSERT INTO payments (copro_id, period_id, lot_id, amount, payment_date, method, reference, status, idempotency_key)
  VALUES (p_copro_id, p_period_id, p_lot_id, p_amount, p_payment_date, p_method::payment_method, p_reference, 'recorded', p_idempotency_key)
  ON CONFLICT (copro_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
  RETURNING id INTO v_payment_id;

  IF v_payment_id IS NULL THEN
    SELECT id, ledger_tx_id INTO v_existing_id, v_existing_tx
    FROM payments WHERE copro_id = p_copro_id AND idempotency_key = p_idempotency_key;
    RETURN jsonb_build_object('success', true, 'payment_id', v_existing_id,
      'ledger_tx_id', v_existing_tx, 'idempotent_replay', true);
  END IF;

  PERFORM allocate_payment(v_payment_id, p_call_line_ids, p_nature_filter);

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
      'entry_label', 'Règlement copropriétaire'));
  END LOOP;

  v_overpay := round(p_amount - v_allocated, 2);
  IF v_overpay > 0 THEN
    v_entries := v_entries || jsonb_build_array(jsonb_build_object(
      'account_id', resolve_lot_tiers_account(p_copro_id, 'advance'),
      'lot_id', p_lot_id, 'direction', 'credit', 'amount', v_overpay,
      'entry_label', 'Avance / trop-perçu'));
  END IF;

  v_entries := v_entries || jsonb_build_array(jsonb_build_object(
    'account_id', v_acct512, 'direction', 'debit', 'amount', p_amount,
    'entry_label', 'Encaissement copropriétaire'));

  v_ltx := create_ledger_transaction(
    p_copro_id, p_period_id, p_payment_date, 'Paiement copropriétaire', 'payment', v_payment_id, v_entries, true);
  IF NOT (v_ltx->>'success')::boolean THEN
    RAISE EXCEPTION 'post_owner_payment: échec écriture grand livre : %', v_ltx->>'error';
  END IF;
  v_tx_id := (v_ltx->>'tx_id')::uuid;
  UPDATE payments SET ledger_tx_id = v_tx_id WHERE id = v_payment_id;

  RETURN jsonb_build_object('success', true, 'payment_id', v_payment_id, 'ledger_tx_id', v_tx_id,
    'allocated', v_allocated, 'overpayment', GREATEST(v_overpay, 0));
END;
$function$;
