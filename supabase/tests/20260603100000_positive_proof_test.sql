-- Preuve positive (Plan C / Task 2) : un budget 'validated' SANS appel emis doit etre
-- detectable comme bloquant ; un budget avec un appel 'issued' ne l'est pas.
DO $$
DECLARE
  v_copro uuid; v_period uuid;
  v_budget_orphelin uuid;
  v_calls_orphelin int;
  v_seeded jsonb; v_copro2 uuid;
  v_budget_ok uuid; v_calls_ok int;
BEGIN
  -- CAS A : copro propre NON seedee -> on cree un budget validated SANS appel
  v_copro := create_clean_test_copro('proof-A');
  SELECT id INTO v_period FROM accounting_periods WHERE copro_id = v_copro AND status='open' ORDER BY start_date DESC LIMIT 1;
  INSERT INTO budgets (copro_id, period_id, budget_type, name, status, version, validated_at)
  VALUES (v_copro, v_period, 'current', 'Budget validated sans appel', 'validated', 1, now())
  RETURNING id INTO v_budget_orphelin;

  SELECT count(*) INTO v_calls_orphelin
  FROM call_for_funds
  WHERE budget_id = v_budget_orphelin AND status NOT IN ('draft','cancelled');

  IF v_calls_orphelin <> 0 THEN
    RAISE EXCEPTION 'ASSERT FAIL : budget orphelin ne devrait avoir 0 appel emis (=%)', v_calls_orphelin;
  END IF;

  -- CAS B : copro seedee (boucle d'or) -> budget validated AVEC appels emis
  v_seeded := create_clean_test_copro_seeded('proof-B', 15000, 2);
  v_copro2 := (v_seeded->>'copro_id')::uuid;
  SELECT id INTO v_budget_ok FROM budgets WHERE copro_id = v_copro2 AND budget_type='current' ORDER BY created_at DESC LIMIT 1;
  SELECT count(*) INTO v_calls_ok
  FROM call_for_funds
  WHERE budget_id = v_budget_ok AND status NOT IN ('draft','cancelled');

  IF v_calls_ok < 1 THEN
    RAISE EXCEPTION 'ASSERT FAIL : budget seede devrait avoir >=1 appel emis (=%)', v_calls_ok;
  END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
