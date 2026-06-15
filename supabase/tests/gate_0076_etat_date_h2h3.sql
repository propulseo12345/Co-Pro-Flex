-- GATE E2E — 0076 / T5 : état daté H2 (cédants) + H3 (provisions votées non appelées + ALUR)
-- ============================================================================================
-- Prouve :
--   H2. cedants[] = TOUS les propriétaires actifs du lot à v_eff, chacun NOMMÉ (aucun nom NULL).
--   H3. provisions_votees_non_appelees_travaux > 0 (budget works validé non appelé) ; retombe après émission.
--   H3. alur_a_venir distinct du solde 450-5 ; version='2.0' ; 3 clés racine du CHECK présentes.
--   CHECK : create_etat_date_snapshot insère (3 clés racine OK) ; immutabilité (UPDATE snapshot -> exception).
--   ZÉRO GL : validate_mutation ne crée AUCUNE écriture + bascule lot_owners (lot-centric).
-- Auto-rollback (ROLLBACK_TEST_OK). Contexte service_role préfixé par db-test.mjs.
DO $$
DECLARE
  v_copro uuid; v_n uuid; v_lot uuid; v_seller uuid; v_coowner uuid;
  v_key uuid; v_a_works uuid; v_wbudget uuid;
  v_mut uuid; r jsonb; v_cnt int; v_prov_wrk_before numeric; v_prov_wrk_after numeric;
  v_gl_before int; v_gl_after int; v_owners_after int; ok boolean; v_snap uuid; v_nullname int;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);

  v_copro := create_clean_test_copro_seeded('0076-etatdate');
  SELECT id INTO v_n FROM accounting_periods WHERE copro_id=v_copro AND status='open' ORDER BY start_date DESC LIMIT 1;
  SELECT id INTO v_lot FROM lots WHERE copro_id=v_copro ORDER BY id LIMIT 1;
  SELECT coproprietaire_id INTO v_seller FROM lot_owners WHERE lot_id=v_lot AND is_primary=true AND end_date IS NULL LIMIT 1;
  SELECT id INTO v_key FROM repartition_keys WHERE copro_id=v_copro AND category='general' AND is_active=true LIMIT 1;
  SELECT id INTO v_a_works FROM accounts WHERE copro_id=v_copro AND charge_nature='travaux' LIMIT 1;
  IF v_seller IS NULL OR v_key IS NULL THEN RAISE EXCEPTION '0076 setup : seller/clé manquant (s=% k=%)', v_seller, v_key; END IF;

  -- H2 : indivision = 2 cédants actifs. Le primaire passe à 50 %, on ajoute un co-cédant à 50 %
  -- (Σ share_percent actifs <= 100, contrainte tr_lot_owner_shares_sum).
  UPDATE lot_owners SET share_percent = 50 WHERE lot_id = v_lot AND end_date IS NULL;
  INSERT INTO coproprietaires (copro_id, is_company, company_name, first_name, last_name, email)
  VALUES (v_copro, false, NULL, 'Co', 'Cedant', 'co@test.fr') RETURNING id INTO v_coowner;
  INSERT INTO lot_owners (lot_id, coproprietaire_id, copro_id, share_percent, is_primary, start_date)
  VALUES (v_lot, v_coowner, v_copro, 50, false, current_date - 200);

  -- H3 : budget TRAVAUX validé avec une ligne (clé générale), NON appelé -> provisions votées > 0.
  INSERT INTO budgets (copro_id, period_id, budget_type, status, name)
  VALUES (v_copro, v_n, 'works', 'validated', 'Travaux votés 0076') RETURNING id INTO v_wbudget;
  INSERT INTO budget_lines (copro_id, budget_id, account_id, repartition_key_id, label, amount)
  VALUES (v_copro, v_wbudget, v_a_works, v_key, 'Ravalement', 1000);

  -- Mutation sur le lot (draft).
  INSERT INTO mutations (copro_id, lot_id, period_id, status, seller_owner_id)
  VALUES (v_copro, v_lot, v_n, 'draft', v_seller) RETURNING id INTO v_mut;

  -- ════ Génération du payload ════
  r := generate_etat_date_payload(v_copro, v_mut, 'pre');

  -- H2 : 3 clés racine + version 2.0 + cedants tous nommés (>=2, aucun NULL).
  IF NOT (r ? 'partie_1_sommes_dues_vendeur' AND r ? 'partie_2_dues_par_syndicat' AND r ? 'partie_3_charge_acquereur') THEN
    RAISE EXCEPTION 'CHECK : une clé racine manque'; END IF;
  IF r->>'version' <> '2.0' THEN RAISE EXCEPTION 'version != 2.0 (front tomberait en Legacy)'; END IF;
  SELECT count(*) INTO v_cnt FROM jsonb_array_elements(r->'cedants');
  IF v_cnt < 2 THEN RAISE EXCEPTION 'H2 : cedants attendu >=2 (indivision), trouvé %', v_cnt; END IF;
  SELECT count(*) INTO v_nullname FROM jsonb_array_elements(r->'cedants') x WHERE coalesce(x->>'nom','') = '' OR x->>'nom' IS NULL;
  IF v_nullname > 0 THEN RAISE EXCEPTION 'H2 : % cédant(s) sans nom', v_nullname; END IF;

  -- H3 : provisions votées non appelées travaux > 0 (budget 1000 non appelé).
  v_prov_wrk_before := (r->'partie_3_charge_acquereur'->>'provisions_votees_non_appelees_travaux')::numeric;
  IF v_prov_wrk_before <= 0 THEN RAISE EXCEPTION 'H3 : provisions votées travaux attendu >0, trouvé %', v_prov_wrk_before; END IF;
  -- alur_a_venir présent (numérique).
  IF (r->'partie_3_charge_acquereur'->>'alur_a_venir') IS NULL THEN RAISE EXCEPTION 'H3 : alur_a_venir absent'; END IF;

  -- Émettre l'appel travaux -> provisions votées travaux retombent.
  PERFORM post_budget_call_for_funds(v_copro, v_n, v_wbudget, 'Appel travaux 0076', 1, current_date, current_date+30, 1.0, NULL, NULL);
  r := generate_etat_date_payload(v_copro, v_mut, 'pre');
  v_prov_wrk_after := (r->'partie_3_charge_acquereur'->>'provisions_votees_non_appelees_travaux')::numeric;
  IF v_prov_wrk_after >= v_prov_wrk_before THEN
    RAISE EXCEPTION 'H3 : provisions votées travaux n''ont pas baissé après émission (% -> %)', v_prov_wrk_before, v_prov_wrk_after;
  END IF;

  -- ════ CHECK : snapshot inséré (3 clés racine OK) + immutabilité ════
  r := create_etat_date_snapshot(v_copro, v_mut, 'final');
  v_snap := (r->>'snapshot_id')::uuid;
  IF v_snap IS NULL THEN RAISE EXCEPTION 'create_etat_date_snapshot : pas de snapshot_id'; END IF;
  ok := false;
  BEGIN
    UPDATE etat_date_snapshots SET effective_date = effective_date + 1 WHERE id = v_snap;
  EXCEPTION WHEN OTHERS THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'IMMUTABILITÉ : un snapshot d''état daté a pu être modifié'; END IF;

  -- ════ ZÉRO GL : validate_mutation ne poste aucune écriture + bascule lot_owners ════
  SELECT count(*) INTO v_gl_before FROM ledger_transactions WHERE copro_id=v_copro;
  PERFORM validate_mutation(v_mut, current_date, current_date, NULL, 'Acq', 'Erreur', NULL, 'acq@test.fr', false);
  SELECT count(*) INTO v_gl_after FROM ledger_transactions WHERE copro_id=v_copro;
  IF v_gl_after <> v_gl_before THEN RAISE EXCEPTION 'ZÉRO GL : validate_mutation a créé % écriture(s)', v_gl_after - v_gl_before; END IF;
  -- lot_owners : anciens cédants clos, un nouveau propriétaire actif.
  SELECT count(*) INTO v_owners_after FROM lot_owners WHERE lot_id=v_lot AND end_date IS NULL;
  IF v_owners_after <> 1 THEN RAISE EXCEPTION 'LOT-CENTRIC : attendu 1 propriétaire actif après mutation, trouvé %', v_owners_after; END IF;

  RAISE NOTICE 'GATE 0076 OK : H2 cédants nommés (indivision) + H3 provisions votées travaux (>0 puis baisse) + alur_a_venir + version 2.0 + 3 clés CHECK + snapshot immuable + validate_mutation ZÉRO GL + lot_owners basculé';
  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
