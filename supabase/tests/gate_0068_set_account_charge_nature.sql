-- GATE E2E — T11 : RPC set_account_charge_nature (surcharge manager de la classification E3)
-- ============================================================================================
-- Prouve : (1) override d'un compte 6/7 courant->travaux OK (persiste + relu) ; (2) override d'un
-- compte hors classe 6/7 REFUSÉ proprement (errcode 0A000, AVANT la violation du CHECK) ; (3) nature
-- invalide refusée (22023) ; (4) compte inexistant refusé (23503) ; (5) garde manager (gestionnaire
-- rattaché OK sous claims authenticated, copro étrangère rejetée). Anti-vacuité : on relit la valeur
-- persistée. Auto-rollback (ROLLBACK_TEST_OK). Contexte service_role préfixé.
select set_config('request.jwt.claims', '{"role":"service_role"}', false);

DO $$
DECLARE
  v_copro uuid;
  v_other uuid;
  v_mgr uuid := gen_random_uuid();
  v_before text;
  v_after text;
  v_ok boolean;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);

  -- ── Harnais : copro seedée (chart complet) + un gestionnaire rattaché ───────────────────────
  v_copro := create_clean_test_copro_seeded('t11-set-charge-nature');

  -- (0) ÉTAT INITIAL : le 711 (subventions) est seedé 'courant' par défaut (bascule travaux = E4).
  SELECT charge_nature INTO v_before FROM accounts WHERE copro_id = v_copro AND code = '711';
  IF v_before IS DISTINCT FROM 'courant' THEN
    RAISE EXCEPTION 'T11 (0) : 711 attendu courant au départ, obtenu %', coalesce(v_before, 'NULL');
  END IF;

  -- (1) OVERRIDE 6/7 courant -> travaux : OK, persiste, relu (ANTI-VACUITÉ)
  PERFORM public.set_account_charge_nature(v_copro, '711', 'travaux');
  SELECT charge_nature INTO v_after FROM accounts WHERE copro_id = v_copro AND code = '711';
  IF v_after IS DISTINCT FROM 'travaux' THEN
    RAISE EXCEPTION 'T11 (1) : override 711 courant->travaux non persisté (relu = %)', coalesce(v_after, 'NULL');
  END IF;
  -- retour arrière travaux -> courant (prouve la réversibilité dans les deux sens)
  PERFORM public.set_account_charge_nature(v_copro, '711', 'courant');
  SELECT charge_nature INTO v_after FROM accounts WHERE copro_id = v_copro AND code = '711';
  IF v_after IS DISTINCT FROM 'courant' THEN
    RAISE EXCEPTION 'T11 (1b) : retour 711 travaux->courant non persisté (relu = %)', coalesce(v_after, 'NULL');
  END IF;

  -- (2) OVERRIDE HORS classe 6/7 : REFUS PROPRE (0A000) AVANT la violation du CHECK
  v_ok := false;
  BEGIN
    PERFORM public.set_account_charge_nature(v_copro, '450-1', 'travaux');
  EXCEPTION
    WHEN sqlstate '0A000' THEN v_ok := true;       -- refus métier anticipé (attendu)
    WHEN check_violation THEN
      RAISE EXCEPTION 'T11 (2) : le RPC a laissé remonter le CHECK brut au lieu de refuser proprement (0A000)';
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'T11 (2) : compte hors classe 6/7 (450-1) accepté à tort'; END IF;
  -- le compte hors classe est resté NULL (rien écrit)
  IF (SELECT charge_nature FROM accounts WHERE copro_id = v_copro AND code = '450-1') IS NOT NULL THEN
    RAISE EXCEPTION 'T11 (2b) : 450-1 a été muté malgré le refus';
  END IF;

  -- (3) NATURE INVALIDE : refus (22023)
  v_ok := false;
  BEGIN PERFORM public.set_account_charge_nature(v_copro, '601', 'mixte');
  EXCEPTION WHEN sqlstate '22023' THEN v_ok := true; END;
  IF NOT v_ok THEN RAISE EXCEPTION 'T11 (3) : nature invalide ''mixte'' acceptée'; END IF;
  -- 601 reste 'courant' (rien écrit)
  IF (SELECT charge_nature FROM accounts WHERE copro_id = v_copro AND code = '601') IS DISTINCT FROM 'courant' THEN
    RAISE EXCEPTION 'T11 (3b) : 601 muté malgré nature invalide';
  END IF;

  -- (4) COMPTE INEXISTANT : refus (23503)
  v_ok := false;
  BEGIN PERFORM public.set_account_charge_nature(v_copro, '999-inconnu', 'courant');
  EXCEPTION WHEN sqlstate '23503' THEN v_ok := true; END;
  IF NOT v_ok THEN RAISE EXCEPTION 'T11 (4) : compte inexistant accepté'; END IF;

  -- ── (5) GARDE MANAGER ──────────────────────────────────────────────────────────────────────
  -- gestionnaire rattaché à v_copro
  INSERT INTO auth.users (id, email) VALUES (v_mgr, 'mgr.t11.'||substr(v_mgr::text,1,8)||'@test.fr');
  UPDATE public.profiles SET full_name = 'Manager T11',
    cabinet_id = (SELECT cabinet_id FROM public.copros WHERE id = v_copro)
  WHERE id = v_mgr;
  INSERT INTO public.memberships (user_id, copro_id, role) VALUES (v_mgr, v_copro, 'gestionnaire');
  -- une 2e copro à laquelle ce gestionnaire n'a PAS accès
  v_other := create_clean_test_copro_seeded('t11-other');

  -- On bascule la garde du RPC en mode GESTIONNAIRE : il suffit de poser des claims authenticated
  -- (sub = v_mgr) pour que is_service_call() renvoie false et que user_is_copro_manager décide.
  -- On NE fait PAS SET ROLE authenticated : cela retirerait les droits de lecture du runner sur
  -- accounts (seul postgres a le SELECT direct, l'accès applicatif passant par les RPC DEFINER).
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_mgr, 'role', 'authenticated')::text, true);
  BEGIN
    -- (5a) gestionnaire de v_copro : OK sur SA copro (le RPC DEFINER fait l'UPDATE)
    PERFORM public.set_account_charge_nature(v_copro, '711', 'travaux');
    -- (5b) MÊME gestionnaire sur une copro ÉTRANGÈRE : refus (42501)
    v_ok := false;
    BEGIN PERFORM public.set_account_charge_nature(v_other, '711', 'travaux');
    EXCEPTION WHEN sqlstate '42501' THEN v_ok := true; END;
    IF NOT v_ok THEN
      PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
      RAISE EXCEPTION 'T11 (5b) : gestionnaire a pu surcharger une copro étrangère';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
    IF SQLERRM LIKE 'T11%' THEN RAISE; END IF;
    RAISE EXCEPTION 'T11 (5) : erreur inattendue sous rôle gestionnaire (%)', SQLERRM;
  END;
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  -- relecture (service_role) : la surcharge (5a) a bien persisté ; la copro étrangère est restée 'courant'
  IF (SELECT charge_nature FROM accounts WHERE copro_id = v_copro AND code = '711') IS DISTINCT FROM 'travaux' THEN
    RAISE EXCEPTION 'T11 (5a) : override par le gestionnaire propriétaire non persisté';
  END IF;
  IF (SELECT charge_nature FROM accounts WHERE copro_id = v_other AND code = '711') IS DISTINCT FROM 'courant' THEN
    RAISE EXCEPTION 'T11 (5b) : la copro étrangère a été mutée malgré le refus';
  END IF;

  RAISE NOTICE 'GATE T11 OK : set_account_charge_nature override 6/7 (persiste+relu), refuse hors 6/7 (0A000) avant CHECK, nature invalide (22023), compte inexistant (23503), garde manager (propre OK / étrangère 42501)';
  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
