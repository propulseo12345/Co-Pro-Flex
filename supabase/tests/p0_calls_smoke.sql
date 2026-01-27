-- =============================================================================
-- P0#3 Smoke Test: Appels de fonds (Calls for Funds)
-- Tests views and functions used by /finance/calls and /finance/unpaid
-- =============================================================================

-- Prerequisites: Run after p0_lots_repartition_smoke.sql

DO $$
DECLARE
  v_copro_id uuid;
  v_period_id uuid;
  v_key_id uuid;
  v_lot_id uuid;
  v_call_id uuid;
  v_line_id uuid;
  v_payment_id uuid;
  v_count int;
BEGIN
  -- ==========================================================================
  -- 1) Get test copro and create accounting period
  -- ==========================================================================
  SELECT id INTO v_copro_id FROM copros WHERE name = 'Résidence Smoke Test' LIMIT 1;
  IF v_copro_id IS NULL THEN
    RAISE EXCEPTION 'Test copro not found. Run p0_lots_repartition_smoke.sql first.';
  END IF;
  RAISE NOTICE '[SMOKE] Using copro_id=%', v_copro_id;

  -- Get or create accounting period
  SELECT id INTO v_period_id FROM accounting_periods WHERE copro_id = v_copro_id LIMIT 1;
  IF v_period_id IS NULL THEN
    INSERT INTO accounting_periods (copro_id, name, start_date, end_date, status)
    VALUES (v_copro_id, '2025', '2025-01-01', '2025-12-31', 'open')
    RETURNING id INTO v_period_id;
    RAISE NOTICE '[SMOKE] Created accounting_period id=%', v_period_id;
  ELSE
    RAISE NOTICE '[SMOKE] Using existing accounting_period id=%', v_period_id;
  END IF;

  -- Get repartition key
  SELECT id INTO v_key_id FROM repartition_keys WHERE copro_id = v_copro_id LIMIT 1;
  IF v_key_id IS NULL THEN
    RAISE EXCEPTION 'No repartition key found. Run p0_lots_repartition_smoke.sql first.';
  END IF;
  RAISE NOTICE '[SMOKE] Using repartition_key id=%', v_key_id;

  -- Get lot
  SELECT id INTO v_lot_id FROM lots WHERE copro_id = v_copro_id LIMIT 1;
  IF v_lot_id IS NULL THEN
    RAISE EXCEPTION 'No lot found. Run p0_lots_repartition_smoke.sql first.';
  END IF;
  RAISE NOTICE '[SMOKE] Using lot id=%', v_lot_id;

  -- ==========================================================================
  -- 2) Test call_for_funds table
  -- ==========================================================================
  INSERT INTO call_for_funds (
    copro_id, period_id, repartition_key_id, label,
    issue_date, due_date, total_amount, status
  )
  VALUES (
    v_copro_id, v_period_id, v_key_id, 'T1 2025 - Charges courantes',
    '2025-01-15', '2025-02-15', 5000.00, 'draft'
  )
  RETURNING id INTO v_call_id;
  RAISE NOTICE '[SMOKE] Created call_for_funds id=%', v_call_id;

  -- ==========================================================================
  -- 3) Test call_for_funds_lines table
  -- ==========================================================================
  INSERT INTO call_for_funds_lines (
    copro_id, call_id, lot_id, amount_due, amount_paid, status
  )
  VALUES (v_copro_id, v_call_id, v_lot_id, 1250.00, 0, 'unpaid')
  RETURNING id INTO v_line_id;
  RAISE NOTICE '[SMOKE] Created call_for_funds_line id=%', v_line_id;

  -- ==========================================================================
  -- 4) Test v_calls_overview view
  -- ==========================================================================
  SELECT COUNT(*) INTO v_count
  FROM v_calls_overview
  WHERE copro_id = v_copro_id AND id = v_call_id;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'v_calls_overview does not return the created call';
  END IF;
  RAISE NOTICE '[SMOKE] v_calls_overview returns data for call';

  -- ==========================================================================
  -- 5) Test v_call_lines_detailed view
  -- ==========================================================================
  SELECT COUNT(*) INTO v_count
  FROM v_call_lines_detailed
  WHERE call_id = v_call_id AND lot_id = v_lot_id;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'v_call_lines_detailed does not return the created line';
  END IF;
  RAISE NOTICE '[SMOKE] v_call_lines_detailed returns data for call lines';

  -- ==========================================================================
  -- 6) Test payments table
  -- ==========================================================================
  INSERT INTO payments (
    copro_id, period_id, lot_id, amount, payment_date, method, status
  )
  VALUES (v_copro_id, v_period_id, v_lot_id, 500.00, '2025-02-01', 'virement', 'recorded')
  RETURNING id INTO v_payment_id;
  RAISE NOTICE '[SMOKE] Created payment id=%', v_payment_id;

  -- ==========================================================================
  -- 7) Test payment_allocations table
  -- ==========================================================================
  INSERT INTO payment_allocations (copro_id, payment_id, call_line_id, amount_allocated)
  VALUES (v_copro_id, v_payment_id, v_line_id, 500.00);
  RAISE NOTICE '[SMOKE] Created payment_allocation for payment';

  -- Update line amount_paid
  UPDATE call_for_funds_lines
  SET amount_paid = 500.00, status = 'partial'
  WHERE id = v_line_id;

  -- ==========================================================================
  -- 8) Test v_payments_overview view
  -- ==========================================================================
  SELECT COUNT(*) INTO v_count
  FROM v_payments_overview
  WHERE copro_id = v_copro_id AND id = v_payment_id;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'v_payments_overview does not return the created payment';
  END IF;
  RAISE NOTICE '[SMOKE] v_payments_overview returns data for payment';

  -- ==========================================================================
  -- 9) Test v_unpaid_by_lot view
  -- ==========================================================================
  SELECT COUNT(*) INTO v_count
  FROM v_unpaid_by_lot
  WHERE copro_id = v_copro_id AND lot_id = v_lot_id;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'v_unpaid_by_lot does not return unpaid lot';
  END IF;
  RAISE NOTICE '[SMOKE] v_unpaid_by_lot returns data for unpaid lot';

  -- ==========================================================================
  -- 10) Test status transitions
  -- ==========================================================================
  -- Issue the call
  UPDATE call_for_funds SET status = 'issued', issued_at = now() WHERE id = v_call_id;
  RAISE NOTICE '[SMOKE] Call status changed to issued';

  -- Mark as partially paid (already done by having partial payment)
  UPDATE call_for_funds SET status = 'partially_paid' WHERE id = v_call_id;
  RAISE NOTICE '[SMOKE] Call status changed to partially_paid';

  -- ==========================================================================
  -- CLEANUP
  -- ==========================================================================
  DELETE FROM payment_allocations WHERE payment_id = v_payment_id;
  DELETE FROM payments WHERE id = v_payment_id;
  DELETE FROM call_for_funds_lines WHERE call_id = v_call_id;
  DELETE FROM call_for_funds WHERE id = v_call_id;
  RAISE NOTICE '[SMOKE] Cleaned up test data';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'P0#3 CALLS SMOKE TEST: ALL PASSED';
  RAISE NOTICE '========================================';
END $$;
