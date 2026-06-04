-- Revue de code #4 [moyen] : allocate_payment — lettrage manuel non filtré
--
-- Problème : dans la branche "lettrage manuel" (p_call_line_ids fourni), la
--   sélection des lignes d'appel ne filtrait NI par lot NI par statut d'appel.
--   On pouvait donc lettrer un paiement du lot A sur des lignes du lot B, ou
--   sur un appel annulé. Comme post_owner_payment crédite toujours le compte
--   tiers 450-x du lot DU PAIEMENT, le solde individuel au grand livre devenait
--   faux (A apparaît à jour à tort, B reste débiteur malgré une ligne "payée").
--   La branche automatique (FIFO, p_call_line_ids NULL) était déjà saine.
--
-- Fix : aligner la branche manuelle sur la branche FIFO — JOIN call_for_funds
--   + filtres cfl.lot_id = lot du paiement ET cf.status != 'cancelled'.
--
-- Idempotent (CREATE OR REPLACE). Basé sur la définition en base au 2026-05-31.

CREATE OR REPLACE FUNCTION public.allocate_payment(p_payment_id uuid, p_call_line_ids uuid[] DEFAULT NULL::uuid[])
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
      JOIN call_for_funds cf ON cf.id = cfl.call_id
      WHERE cfl.id = ANY(p_call_line_ids)
        AND cfl.copro_id = v_copro_id
        AND cfl.lot_id = v_payment.lot_id        -- ne lettrer que sur le lot du paiement
        AND cfl.status != 'paid'
        AND cf.status != 'cancelled'             -- exclure les appels annulés
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
