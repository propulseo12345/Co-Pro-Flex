DO $$
DECLARE
  v jsonb; v_copro uuid; v_lot uuid; v_period uuid; v_budget uuid;
  v_rows_before int; v_rows_after int;
BEGIN
  -- Copro propre seedée (a au moins 1 lot + plan comptable + clé générale)
  v := create_clean_test_copro_seeded('i5-unpaid', 15000, 2);
  v_copro := (v->>'copro_id')::uuid;
  SELECT id INTO v_period FROM accounting_periods WHERE copro_id = v_copro ORDER BY start_date LIMIT 1;
  SELECT id INTO v_lot FROM lots WHERE copro_id = v_copro ORDER BY ref LIMIT 1;

  -- Émettre un appel échu impayé pour générer une ligne d'impayé
  SELECT id INTO v_budget FROM budgets WHERE copro_id = v_copro ORDER BY created_at DESC LIMIT 1;
  PERFORM post_budget_call_for_funds(
    v_copro, v_period, v_budget, 'Appel echu TEST', 1,
    (CURRENT_DATE - 90)::date, (CURRENT_DATE - 60)::date, 1.0, 1, 1
  );

  -- Cas A : copro NON onboarding -> la ligne doit apparaître dans v_unpaid_by_lot
  UPDATE copros SET onboarding_step = NULL WHERE id = v_copro;
  SELECT count(*) INTO v_rows_before FROM v_unpaid_by_lot WHERE copro_id = v_copro;
  IF v_rows_before < 1 THEN
    RAISE EXCEPTION 'ASSERT FAIL : impaye non visible alors que la copro est live (rows=%)', v_rows_before;
  END IF;

  -- Cas B : copro EN onboarding -> la ligne doit DISPARAITRE de v_unpaid_by_lot
  UPDATE copros SET onboarding_step = 7 WHERE id = v_copro;
  SELECT count(*) INTO v_rows_after FROM v_unpaid_by_lot WHERE copro_id = v_copro;
  IF v_rows_after <> 0 THEN
    RAISE EXCEPTION 'ASSERT FAIL : copro en onboarding remonte dans les impayes (rows=%)', v_rows_after;
  END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
