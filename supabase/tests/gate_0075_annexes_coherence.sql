-- GATE E2E — 0075 / E7-E8 : refonte des annexes (shapes tableaux + règles légales)
-- ============================================================================================
-- Prouve :
--   S. CONTRAT DE SHAPE : toutes les clés .map du front sont des TABLEAUX (plus de crash .map-scalaire).
--   E7. 450-5 (ALUR) ABSENT de la section II de l'annexe 1 (ni créances ni dettes).
--   E7. NON-COMPENSATION : un lot débiteur ET un lot créditeur sur 450-1 apparaissent TOUS DEUX
--       (créances>0 ET dettes>0), pas nettés.
--   E8. 2 BLOCS annexe 2 : une charge TRAVAUX -> charges_travaux ; une charge COURANTE -> charges_courantes.
--   ARITÉ : fn_annexe_2 répond en 2 args (résolu vers la 4-args à défauts) ET en 4 args, sans ambiguïté.
-- Données works/450-5/débiteur-créditeur POSÉES DANS LE CORPS (la golden loop ne les fournit pas).
-- Auto-rollback (ROLLBACK_TEST_OK). Contexte service_role préfixé par db-test.mjs.
DO $$
DECLARE
  v_copro uuid; v_n uuid; v_lot1 uuid; v_lot2 uuid;
  v_a450_1 uuid; v_a450_5 uuid; v_a105 uuid; v_a701 uuid; v_a512 uuid;
  v_a_works uuid; v_a_cur uuid;
  r jsonb; v_crea_before numeric; v_crea_after numeric; v_det numeric;
  v_has_works boolean; v_has_cur boolean; v_line jsonb; v_found_4505 boolean;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);

  v_copro := create_clean_test_copro_seeded('0075-annexes');
  SELECT id INTO v_n FROM accounting_periods WHERE copro_id=v_copro AND status='open' ORDER BY start_date DESC LIMIT 1;
  SELECT id INTO v_lot1 FROM lots WHERE copro_id=v_copro ORDER BY id LIMIT 1;
  SELECT id INTO v_lot2 FROM lots WHERE copro_id=v_copro ORDER BY id OFFSET 1 LIMIT 1;
  SELECT id INTO v_a450_1 FROM accounts WHERE copro_id=v_copro AND code='450-1';
  SELECT id INTO v_a450_5 FROM accounts WHERE copro_id=v_copro AND code='450-5';
  SELECT id INTO v_a105 FROM accounts WHERE copro_id=v_copro AND code='105';
  SELECT id INTO v_a701 FROM accounts WHERE copro_id=v_copro AND code='701';
  SELECT id INTO v_a512 FROM accounts WHERE copro_id=v_copro AND code='512';
  SELECT id INTO v_a_works FROM accounts WHERE copro_id=v_copro AND charge_nature='travaux' LIMIT 1;
  SELECT id INTO v_a_cur   FROM accounts WHERE copro_id=v_copro AND charge_nature='courant' LIMIT 1;

  -- ════ S. CONTRAT DE SHAPE ════
  r := fn_annexe_1(v_copro, v_n);
  IF jsonb_typeof(r->'section_i'->'tresorerie') <> 'array'
     OR jsonb_typeof(r->'section_ii'->'creances') <> 'array'
     OR jsonb_typeof(r->'section_ii'->'dettes') <> 'array' THEN
    RAISE EXCEPTION 'S : annexe 1 section non-array';
  END IF;
  IF jsonb_typeof((fn_annexe_2(v_copro,v_n))->'charges_courantes') <> 'array'
     OR jsonb_typeof((fn_annexe_2(v_copro,v_n))->'charges_travaux') <> 'array'
     OR jsonb_typeof((fn_annexe_3(v_copro,v_n))->'cles') <> 'array'
     OR jsonb_typeof((fn_annexe_4(v_copro,v_n))->'operations') <> 'array'
     OR jsonb_typeof((fn_annexe_5(v_copro,v_n))->'operations') <> 'array'
     OR jsonb_typeof((fn_annexe_1_detail_copros(v_copro,v_n))->'copros') <> 'array' THEN
    RAISE EXCEPTION 'S : une annexe renvoie un scalaire au lieu d''un tableau';
  END IF;

  -- ════ NON-COMPENSATION : lot1 débiteur (D450-1), lot2 créditeur (C450-1) ════
  -- Montants VOLONTAIREMENT GRANDS (1 000 000) pour DOMINER tout solde seedé du lot (l'ordre des lots
  -- est aléatoire) : lot2 devient créditeur quoi qu'il arrive -> test déterministe.
  PERFORM create_ledger_transaction(v_copro, v_n, current_date, 'Appel lot1', 'call_for_funds', NULL,
    jsonb_build_array(
      jsonb_build_object('account_id',v_a450_1,'lot_id',v_lot1,'direction','debit','amount',1000000,'entry_label','appel'),
      jsonb_build_object('account_id',v_a701,'lot_id',NULL,'direction','credit','amount',1000000,'entry_label','produit')
    ), true);
  PERFORM create_ledger_transaction(v_copro, v_n, current_date, 'Avoir lot2', 'od', NULL,
    jsonb_build_array(
      jsonb_build_object('account_id',v_a701,'lot_id',NULL,'direction','debit','amount',1000000,'entry_label','annul'),
      jsonb_build_object('account_id',v_a450_1,'lot_id',v_lot2,'direction','credit','amount',1000000,'entry_label','avoir')
    ), true);

  r := fn_annexe_1(v_copro, v_n);
  -- Vérifier la LIGNE '45' spécifiquement (pas le total, qui inclut 46/47/48 seedés) : non-compensation
  -- = un lot débiteur ET un lot créditeur coexistent (jamais nettés en un seul solde).
  SELECT (x->>'exercice_clos')::numeric INTO v_crea_before
  FROM jsonb_array_elements(r->'section_ii'->'creances') x WHERE x->>'compte'='45';
  SELECT (x->>'exercice_clos')::numeric INTO v_det
  FROM jsonb_array_elements(r->'section_ii'->'dettes') x WHERE x->>'compte'='45';
  IF coalesce(v_crea_before,0) < 1000000 THEN RAISE EXCEPTION 'NON-COMPENSATION : ligne créances 45 (%) ne contient pas le lot débiteur (>=1000000)', v_crea_before; END IF;
  IF coalesce(v_det,0) < 900000 THEN RAISE EXCEPTION 'NON-COMPENSATION : ligne dettes 45 (%) ne contient pas le lot créditeur (>=900000)', v_det; END IF;
  -- mémoriser le total créances pour le test E7 (450-5 ne doit pas le bouger).
  v_crea_before := (r->'section_ii'->'total_creances'->>'exercice_clos')::numeric;

  -- ════ E7. 450-5 EXCLU de la section II ════
  PERFORM create_ledger_transaction(v_copro, v_n, current_date, 'Appel ALUR lot1', 'call_for_funds', NULL,
    jsonb_build_array(
      jsonb_build_object('account_id',v_a450_5,'lot_id',v_lot1,'direction','debit','amount',77,'entry_label','alur'),
      jsonb_build_object('account_id',v_a105,'lot_id',NULL,'direction','credit','amount',77,'entry_label','fonds')
    ), true);
  r := fn_annexe_1(v_copro, v_n);
  v_crea_after := (r->'section_ii'->'total_creances'->>'exercice_clos')::numeric;
  IF abs(v_crea_after - v_crea_before) > 0.001 THEN
    RAISE EXCEPTION 'E7 : le 450-5 ALUR (77) a été compté en section II créances (avant=% après=%)', v_crea_before, v_crea_after;
  END IF;
  -- aucune ligne section_ii ne porte le code 450-5
  v_found_4505 := false;
  FOR v_line IN SELECT * FROM jsonb_array_elements((r->'section_ii'->'creances') || (r->'section_ii'->'dettes')) LOOP
    IF v_line->>'compte' = '450-5' THEN v_found_4505 := true; END IF;
  END LOOP;
  IF v_found_4505 THEN RAISE EXCEPTION 'E7 : une ligne section II porte le compte 450-5 (doit être isolé)'; END IF;

  -- ════ E8. 2 BLOCS annexe 2 (charge travaux vs courant) ════
  PERFORM create_ledger_transaction(v_copro, v_n, current_date, 'Charge travaux', 'budget_expense', NULL,
    jsonb_build_array(
      jsonb_build_object('account_id',v_a_works,'lot_id',NULL,'direction','debit','amount',40,'entry_label','trav'),
      jsonb_build_object('account_id',v_a512,'lot_id',NULL,'direction','credit','amount',40,'entry_label','bq')
    ), true);
  PERFORM create_ledger_transaction(v_copro, v_n, current_date, 'Charge courante', 'budget_expense', NULL,
    jsonb_build_array(
      jsonb_build_object('account_id',v_a_cur,'lot_id',NULL,'direction','debit','amount',25,'entry_label','cour'),
      jsonb_build_object('account_id',v_a512,'lot_id',NULL,'direction','credit','amount',25,'entry_label','bq')
    ), true);
  r := fn_annexe_2(v_copro, v_n);
  SELECT count(*) > 0 INTO v_has_works FROM jsonb_array_elements(r->'charges_travaux') x WHERE (x->>'ex_clos_realise')::numeric <> 0;
  SELECT count(*) > 0 INTO v_has_cur   FROM jsonb_array_elements(r->'charges_courantes') x WHERE (x->>'ex_clos_realise')::numeric <> 0;
  IF NOT v_has_works THEN RAISE EXCEPTION 'E8 : la charge travaux n''apparaît pas dans charges_travaux'; END IF;
  IF NOT v_has_cur   THEN RAISE EXCEPTION 'E8 : la charge courante n''apparaît pas dans charges_courantes'; END IF;

  -- ════ ARITÉ : 2 args (défauts) ET 4 args, sans ambiguïté ════
  PERFORM fn_annexe_2(v_copro, v_n);                  -- 2 args -> résout vers la 4-args à défauts
  PERFORM fn_annexe_2(v_copro, v_n, NULL, v_n);       -- 4 args explicites
  PERFORM fn_annexe_3(v_copro, v_n);
  PERFORM fn_annexe_3(v_copro, v_n, NULL, v_n);

  RAISE NOTICE 'GATE 0075 OK : shapes tableaux (anti-crash) + 450-5 isolé hors section II + non-compensation (débiteur ET créditeur) + 2 blocs annexe 2 (travaux/courant) + arité 2/4 args sans ambiguïté';
  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
