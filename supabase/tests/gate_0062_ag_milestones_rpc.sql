-- Gate 0062 : RPC jalons AG (get_ag_milestones / save_ag_milestone).
-- Prouve : (1) save = INSERT puis UPDATE du même (ag_id, milestone_key) sans
-- doublon (vrai UPSERT via index unique uq_ag_milestones_ag_key) ; (2) get
-- retourne la/les ligne(s) avec done dérivable ; (3) anti-vacuité (get non vide
-- après save, et le done basculé est bien relu) ; (4) garde d'accès (manager OK
-- sous SET ROLE authenticated, AG inexistante rejetée). Auto-rollback.
DO $$
DECLARE
  v_copro uuid;
  v_ag uuid;
  v_mgr uuid := gen_random_uuid();
  v_id1 uuid; v_id2 uuid; v_sent uuid;
  v_n int; v_done boolean; v_key text;
BEGIN
  -- (0) Index unique support de l'UPSERT bien présent
  SELECT count(*) INTO v_n FROM pg_indexes
   WHERE schemaname = 'public' AND indexname = 'uq_ag_milestones_ag_key';
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : index uq_ag_milestones_ag_key absent'; END IF;

  -- (1) Harnais : copro légère + gestionnaire rattaché + une AG
  v_copro := create_clean_test_copro('g62');
  INSERT INTO auth.users (id, email) VALUES (v_mgr, 'mgr62.'||substr(v_mgr::text,1,8)||'@test.fr');
  UPDATE public.profiles SET full_name = 'Manager G62',
    cabinet_id = (SELECT cabinet_id FROM public.copros WHERE id = v_copro)
  WHERE id = v_mgr;
  INSERT INTO public.memberships (user_id, copro_id, role) VALUES (v_mgr, v_copro, 'gestionnaire');

  INSERT INTO public.ag_meetings (copro_id, title, meeting_type, meeting_date, status)
  VALUES (v_copro, 'AG G62', 'ordinary', current_date + 30, 'draft')
  RETURNING id INTO v_ag;

  -- (2) save_ag_milestone : INSERT initial (done par défaut true) + due_date
  v_id1 := public.save_ag_milestone(v_ag, 'date_limite_convocation', true, current_date + 10);
  IF v_id1 IS NULL THEN RAISE EXCEPTION 'ASSERT FAIL : save INSERT a renvoyé NULL'; END IF;
  SELECT count(*) INTO v_n FROM public.ag_milestones WHERE ag_id = v_ag;
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : après INSERT, % lignes (attendu 1)', v_n; END IF;

  -- (3) UPSERT : ré-appel sur le MÊME (ag_id, milestone_key) -> pas de doublon,
  --     même id, done basculé à false
  v_id2 := public.save_ag_milestone(v_ag, 'date_limite_convocation', false, null);
  IF v_id2 IS DISTINCT FROM v_id1 THEN
    RAISE EXCEPTION 'ASSERT FAIL : UPSERT a créé une nouvelle ligne (% <> %)', v_id2, v_id1; END IF;
  SELECT count(*) INTO v_n FROM public.ag_milestones WHERE ag_id = v_ag;
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : UPSERT a dupliqué (% lignes)', v_n; END IF;
  -- done relu = false ; due_date conservée (coalesce sur NULL) = current_date + 10
  SELECT done, due_date INTO v_done, v_key FROM public.ag_milestones WHERE id = v_id1;
  IF v_done IS DISTINCT FROM false THEN RAISE EXCEPTION 'ASSERT FAIL : done non basculé à false'; END IF;
  IF (SELECT due_date FROM public.ag_milestones WHERE id = v_id1) IS DISTINCT FROM current_date + 10 THEN
    RAISE EXCEPTION 'ASSERT FAIL : due_date écrasée par NULL au lieu d''être conservée'; END IF;

  -- jalon distinct 'sent' (flux envoi) -> 2e ligne
  v_sent := public.save_ag_milestone(v_ag, 'sent', true, null);
  IF v_sent IS NULL THEN RAISE EXCEPTION 'ASSERT FAIL : save jalon sent NULL'; END IF;

  -- (4) milestone_key vide rejeté
  BEGIN
    PERFORM public.save_ag_milestone(v_ag, '   ', true, null);
    RAISE EXCEPTION 'ASSERT FAIL : milestone_key vide accepté';
  EXCEPTION WHEN sqlstate '22004' THEN NULL;
  END;

  -- (5) AG inexistante rejetée (les deux RPC)
  BEGIN
    PERFORM public.save_ag_milestone(gen_random_uuid(), 'x', true, null);
    RAISE EXCEPTION 'ASSERT FAIL : save sur AG inexistante accepté';
  EXCEPTION WHEN sqlstate '23503' THEN NULL;
  END;
  BEGIN
    PERFORM public.get_ag_milestones(gen_random_uuid());
    RAISE EXCEPTION 'ASSERT FAIL : get sur AG inexistante accepté';
  EXCEPTION WHEN sqlstate '23503' THEN NULL;
  END;

  -- (6) get_ag_milestones (service role) : ANTI-VACUITÉ — 2 jalons relus
  SELECT count(*) INTO v_n FROM public.get_ag_milestones(v_ag);
  IF v_n <> 2 THEN RAISE EXCEPTION 'ASSERT FAIL : get attend 2 jalons, obtenu %', v_n; END IF;
  -- le jalon convocation est relu avec done=false, le jalon sent avec done=true
  SELECT done INTO v_done FROM public.get_ag_milestones(v_ag)
   WHERE milestone_key = 'date_limite_convocation';
  IF v_done IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'ASSERT FAIL : get convocation done attendu false'; END IF;
  SELECT done INTO v_done FROM public.get_ag_milestones(v_ag) WHERE milestone_key = 'sent';
  IF v_done IS DISTINCT FROM true THEN RAISE EXCEPTION 'ASSERT FAIL : get sent done attendu true'; END IF;

  -- (7) Garde RLS-cohérente : gestionnaire OK sous claims authenticated
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_mgr, 'role','authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);
  BEGIN
    PERFORM public.save_ag_milestone(v_ag, 'date_envoi_documents', true, current_date + 5);
    SELECT count(*) INTO v_n FROM public.get_ag_milestones(v_ag);
    IF v_n <> 3 THEN
      PERFORM set_config('role','service_role',true);
      RAISE EXCEPTION 'ASSERT FAIL : manager get attend 3 jalons, obtenu %', v_n; END IF;
  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('role','service_role',true);
    IF SQLERRM LIKE 'ASSERT FAIL%' THEN RAISE; END IF;
    RAISE EXCEPTION 'ASSERT FAIL : gestionnaire rejeté à tort (%)', SQLERRM;
  END;
  PERFORM set_config('role', 'service_role', true);

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
