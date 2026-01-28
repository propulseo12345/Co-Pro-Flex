-- ============================================================================
-- Smoke Test: Budget Tables & Views
-- Date: 2026-01-28
-- Purpose: Verify budget_expenses table and views work correctly
-- ============================================================================

DO $$
DECLARE
  v_copro_id UUID;
  v_period_id UUID;
  v_budget_id UUID;
  v_line_id UUID;
  v_expense_id UUID;
  v_view_result RECORD;
BEGIN
  RAISE NOTICE '=== Budget Smoke Test Starting ===';

  -- Get an existing copro and period
  SELECT c.id INTO v_copro_id FROM copros c LIMIT 1;
  IF v_copro_id IS NULL THEN
    RAISE EXCEPTION 'No copro found - cannot run smoke test';
  END IF;
  RAISE NOTICE 'Using copro_id: %', v_copro_id;

  -- Get an open period for this copro
  SELECT id INTO v_period_id
  FROM accounting_periods
  WHERE copro_id = v_copro_id AND status = 'open'
  LIMIT 1;
  IF v_period_id IS NULL THEN
    RAISE EXCEPTION 'No open period found for copro';
  END IF;
  RAISE NOTICE 'Using period_id: %', v_period_id;

  -- Test 1: Create a test budget
  RAISE NOTICE 'Test 1: Creating test budget...';
  INSERT INTO budgets (copro_id, period_id, budget_type, name, status)
  VALUES (v_copro_id, v_period_id, 'current', 'SMOKE_TEST_BUDGET', 'draft')
  RETURNING id INTO v_budget_id;
  ASSERT v_budget_id IS NOT NULL, 'Budget creation failed';
  RAISE NOTICE '  -> Budget created: %', v_budget_id;

  -- Test 2: Create a budget line
  RAISE NOTICE 'Test 2: Creating budget line...';
  -- First get a valid account_id and repartition_key_id
  INSERT INTO budget_lines (
    copro_id, budget_id, account_id, repartition_key_id,
    label, code, amount, sort_order
  )
  SELECT
    v_copro_id,
    v_budget_id,
    (SELECT id FROM accounts WHERE copro_id = v_copro_id LIMIT 1),
    (SELECT id FROM repartition_keys WHERE copro_id = v_copro_id LIMIT 1),
    'Smoke Test Line - Eau',
    'eau',
    12000.00,
    1
  RETURNING id INTO v_line_id;
  ASSERT v_line_id IS NOT NULL, 'Budget line creation failed';
  RAISE NOTICE '  -> Budget line created: %', v_line_id;

  -- Test 3: Create an expense
  RAISE NOTICE 'Test 3: Creating expense...';
  INSERT INTO budget_expenses (
    copro_id, budget_id, budget_line_id,
    label, amount, tx_date, status, fournisseur
  )
  VALUES (
    v_copro_id, v_budget_id, v_line_id,
    'Facture eau T1 2026', 3000.00, '2026-01-15', 'draft', 'Veolia'
  )
  RETURNING id INTO v_expense_id;
  ASSERT v_expense_id IS NOT NULL, 'Expense creation failed';
  RAISE NOTICE '  -> Expense created: %', v_expense_id;

  -- Test 4: Verify v_budgets_overview
  RAISE NOTICE 'Test 4: Checking v_budgets_overview...';
  SELECT * INTO v_view_result
  FROM v_budgets_overview
  WHERE id = v_budget_id;
  ASSERT v_view_result.total_planned = 12000.00, 'total_planned mismatch';
  ASSERT v_view_result.total_spent = 3000.00, 'total_spent mismatch';
  ASSERT v_view_result.validated_spent = 0, 'validated_spent should be 0';
  ASSERT v_view_result.remaining = 12000.00, 'remaining mismatch (should be total since expense is draft)';
  RAISE NOTICE '  -> v_budgets_overview OK (total_planned=%, total_spent=%, remaining=%)',
    v_view_result.total_planned, v_view_result.total_spent, v_view_result.remaining;

  -- Test 5: Validate expense and check impact
  RAISE NOTICE 'Test 5: Validating expense...';
  UPDATE budget_expenses
  SET status = 'validated', validated_at = NOW()
  WHERE id = v_expense_id;

  SELECT * INTO v_view_result
  FROM v_budgets_overview
  WHERE id = v_budget_id;
  ASSERT v_view_result.validated_spent = 3000.00, 'validated_spent should now be 3000';
  ASSERT v_view_result.remaining = 9000.00, 'remaining should be 9000 after validation';
  RAISE NOTICE '  -> After validation: validated_spent=%, remaining=%',
    v_view_result.validated_spent, v_view_result.remaining;

  -- Test 6: Check v_budget_lines_overview
  RAISE NOTICE 'Test 6: Checking v_budget_lines_overview...';
  SELECT * INTO v_view_result
  FROM v_budget_lines_overview
  WHERE id = v_line_id;
  ASSERT v_view_result.planned_amount = 12000.00, 'planned_amount mismatch';
  ASSERT v_view_result.validated_spent = 3000.00, 'validated_spent on line mismatch';
  ASSERT v_view_result.consumption_pct = 25.0, 'consumption_pct should be 25%';
  RAISE NOTICE '  -> v_budget_lines_overview OK (consumption_pct=%)', v_view_result.consumption_pct;

  -- Test 7: Check v_budget_expenses_detail
  RAISE NOTICE 'Test 7: Checking v_budget_expenses_detail...';
  SELECT * INTO v_view_result
  FROM v_budget_expenses_detail
  WHERE id = v_expense_id;
  ASSERT v_view_result.line_label = 'Smoke Test Line - Eau', 'line_label mismatch';
  ASSERT v_view_result.budget_name = 'SMOKE_TEST_BUDGET', 'budget_name mismatch';
  RAISE NOTICE '  -> v_budget_expenses_detail OK';

  -- Cleanup
  RAISE NOTICE 'Cleaning up test data...';
  DELETE FROM budget_expenses WHERE id = v_expense_id;
  DELETE FROM budget_lines WHERE id = v_line_id;
  DELETE FROM budgets WHERE id = v_budget_id;

  RAISE NOTICE '=== All Budget Smoke Tests PASSED ===';

EXCEPTION WHEN OTHERS THEN
  -- Cleanup on error
  RAISE NOTICE 'ERROR: % - Cleaning up...', SQLERRM;
  DELETE FROM budget_expenses WHERE budget_id = v_budget_id;
  DELETE FROM budget_lines WHERE budget_id = v_budget_id;
  DELETE FROM budgets WHERE id = v_budget_id;
  RAISE;
END $$;
