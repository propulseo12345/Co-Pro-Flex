-- Vérifie l'invariant DB que le code TS doit garantir : au plus 1 budget 'current'
-- par (copro, période) une fois des appels émis. Ce test pose l'invariant ; le code
-- TS (createOnboardingBudget) le respecte en réutilisant le budget verrouillé.
DO $$
DECLARE
  v jsonb; v_copro uuid; v_period uuid; v_budget uuid; v_count int;
BEGIN
  v := create_clean_test_copro_seeded('i6-budget', 15000, 2);
  v_copro := (v->>'copro_id')::uuid;
  SELECT id INTO v_period FROM accounting_periods WHERE copro_id = v_copro ORDER BY start_date LIMIT 1;
  SELECT id INTO v_budget FROM budgets WHERE copro_id = v_copro AND budget_type='current' ORDER BY created_at DESC LIMIT 1;

  -- Émettre un appel -> le budget est désormais "verrouillé" (référencé par des appels)
  PERFORM post_budget_call_for_funds(
    v_copro, v_period, v_budget, 'Appel T1', 1,
    CURRENT_DATE::date, (CURRENT_DATE + 30)::date, 1.0, 1, 4
  );

  -- Invariant : 1 seul budget current pour cette période
  SELECT count(*) INTO v_count FROM budgets WHERE copro_id = v_copro AND period_id = v_period AND budget_type='current';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'ASSERT FAIL : % budgets current pour la periode (attendu 1)', v_count;
  END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
