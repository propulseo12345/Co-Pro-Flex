-- GATE E2E — B5 : assertion bloquante multi-clés dans regularize_period
-- ============================================================================================
-- Prouve : si l'exercice porte des appels sur PLUSIEURS clés de répartition distinctes,
-- regularize_period LÈVE une erreur explicite (répartition par clé d'origine non supportée)
-- plutôt que de produire un décompte par lot silencieusement faux ; et qu'en MONO-clé il ne
-- lève PAS cette assertion. Auto-rollback (ROLLBACK_TEST_OK). Contexte service_role préfixé.
DO $$
DECLARE
  v_copro uuid; v_n uuid; v_kgen uuid; v_kspe uuid;
  v_raised boolean := false; v_wrong boolean := false;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);

  v_copro := create_clean_test_copro_seeded('b5-multicles');
  SELECT id INTO v_n FROM accounting_periods WHERE copro_id = v_copro AND status = 'open' ORDER BY start_date DESC LIMIT 1;
  SELECT id INTO v_kgen FROM repartition_keys WHERE copro_id = v_copro AND category = 'general' AND is_active LIMIT 1;
  SELECT id INTO v_kspe FROM repartition_keys WHERE copro_id = v_copro AND category = 'special' AND is_active LIMIT 1;
  IF v_kgen IS NULL OR v_kspe IS NULL THEN RAISE EXCEPTION 'SETUP : clés general/special absentes (general=% special=%)', v_kgen, v_kspe; END IF;

  -- Deux appels sur DEUX clés distinctes dans l'exercice N -> situation multi-clés.
  INSERT INTO call_for_funds (copro_id, period_id, repartition_key_id, label, issue_date, due_date, total_amount, status)
  VALUES (v_copro, v_n, v_kgen, 'Appel courant général', current_date, current_date + 30, 1000, 'issued'),
         (v_copro, v_n, v_kspe, 'Appel ascenseur (clé spéciale)', current_date, current_date + 30, 500, 'issued');

  -- (1) regularize_period DOIT lever l'assertion multi-clés.
  BEGIN
    PERFORM regularize_period(v_copro, v_n);
  EXCEPTION WHEN sqlstate '23514' THEN
    IF position('multi-clés' in SQLERRM) > 0 OR position('clé d''origine' in SQLERRM) > 0 THEN
      v_raised := true;
    END IF;
  END;
  IF NOT v_raised THEN RAISE EXCEPTION 'B5 (1) : regularize_period n''a PAS levé l''assertion multi-clés'; END IF;

  -- (2) En MONO-clé (on retire l'appel sur clé spéciale), l'assertion multi-clés NE DOIT PLUS lever.
  DELETE FROM call_for_funds WHERE copro_id = v_copro AND repartition_key_id = v_kspe;
  BEGIN
    PERFORM regularize_period(v_copro, v_n);
  EXCEPTION WHEN OTHERS THEN
    IF position('multi-clés' in SQLERRM) > 0 THEN v_wrong := true; END IF;
    -- toute autre erreur (ex. N+1 absent) est acceptable ici : on ne teste que le multi-clés.
  END;
  IF v_wrong THEN RAISE EXCEPTION 'B5 (2) : mono-clé lève À TORT l''assertion multi-clés'; END IF;

  RAISE NOTICE 'GATE B5 OK : assertion multi-clés lève sur appels multi-clés, silencieuse en mono-clé';
  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
