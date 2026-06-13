-- Gate 0053 : rapports d'activité du conseil syndical (3 tables).
-- Méthode 0052 : contrats de colonnes STRICTS, valeurs (cascade sections/annexes,
-- contraintes statut/période/kind), RLS prouvée sous SET ROLE authenticated
-- (lecture membre, écriture refusée, manager OK), registre 0034 prouvé par la
-- bascule dev (copro NON seedée → pas de triggers différés GL). Auto-rollback.
DO $$
DECLARE
  v_copro uuid; v_rapport uuid; v_sec uuid; v_annexe uuid;
  v_mgr uuid := gen_random_uuid();
  v_mem uuid := gen_random_uuid();
  v_n int; v_bool boolean; v_arr text[]; v_status text; v_intro text;
BEGIN
  -- (1) Contrats STRICTS
  SELECT array_agg(column_name::text ORDER BY column_name) INTO v_arr
    FROM information_schema.columns WHERE table_schema='public' AND table_name='rapports_activite_cs';
  IF v_arr IS DISTINCT FROM ARRAY['ag_id','author_id','content','content_text','copro_id',
    'created_at','id','introduction','period_end','period_start','resolution_id','status',
    'title','updated_at','validated_at','validated_by'] THEN
    RAISE EXCEPTION 'ASSERT FAIL : contrat rapports_activite_cs : %', v_arr;
  END IF;
  SELECT array_agg(column_name::text ORDER BY column_name) INTO v_arr
    FROM information_schema.columns WHERE table_schema='public' AND table_name='sections_rapport_cs';
  IF v_arr IS DISTINCT FROM ARRAY['content','copro_id','created_at','id','rapport_id',
    'sort_order','title','updated_at'] THEN
    RAISE EXCEPTION 'ASSERT FAIL : contrat sections_rapport_cs : %', v_arr;
  END IF;
  SELECT array_agg(column_name::text ORDER BY column_name) INTO v_arr
    FROM information_schema.columns WHERE table_schema='public' AND table_name='annexes_rapport_cs';
  IF v_arr IS DISTINCT FROM ARRAY['copro_id','created_at','description','embedded_content',
    'file_name','file_size','file_url','id','kind','name','rapport_id','sort_order'] THEN
    RAISE EXCEPTION 'ASSERT FAIL : contrat annexes_rapport_cs : %', v_arr;
  END IF;

  -- (2) Harnais : copro légère + gestionnaire (cabinet rattaché) + copropriétaire
  v_copro := create_clean_test_copro('g53');
  INSERT INTO auth.users (id, email) VALUES (v_mgr, 'mgr53.'||substr(v_mgr::text,1,8)||'@test.fr');
  INSERT INTO auth.users (id, email) VALUES (v_mem, 'mem53.'||substr(v_mem::text,1,8)||'@test.fr');
  UPDATE public.profiles SET full_name = 'Manager G53',
    cabinet_id = (SELECT cabinet_id FROM public.copros WHERE id = v_copro)
  WHERE id = v_mgr;
  INSERT INTO public.memberships (user_id, copro_id, role)
  VALUES (v_mgr, v_copro, 'gestionnaire'), (v_mem, v_copro, 'coproprietaire');

  -- (3) CRUD + contraintes
  INSERT INTO public.rapports_activite_cs (copro_id, author_id, period_start, period_end, title)
  VALUES (v_copro, v_mgr, current_date - 365, current_date, 'Rapport G53')
  RETURNING id INTO v_rapport;
  SELECT status, introduction INTO v_status, v_intro FROM public.rapports_activite_cs WHERE id = v_rapport;
  IF v_status <> 'brouillon' OR v_intro <> '' THEN
    RAISE EXCEPTION 'ASSERT FAIL : défauts rapport (status %, intro %)', v_status, v_intro; END IF;

  BEGIN
    INSERT INTO public.rapports_activite_cs (copro_id, period_start, period_end, title)
    VALUES (v_copro, current_date, current_date - 1, 'Période KO');
    RAISE EXCEPTION 'ASSERT FAIL : ck_rapports_cs_period non appliquée';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE public.rapports_activite_cs SET status = 'inconnu' WHERE id = v_rapport;
    RAISE EXCEPTION 'ASSERT FAIL : ck_rapports_cs_status non appliquée';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  INSERT INTO public.sections_rapport_cs (copro_id, rapport_id, sort_order, title, content)
  VALUES (v_copro, v_rapport, 0, 'Travaux', '<p>menés</p>')
  RETURNING id INTO v_sec;
  INSERT INTO public.annexes_rapport_cs (copro_id, rapport_id, name, kind, sort_order)
  VALUES (v_copro, v_rapport, 'Tableau charges', 'tableau', 0)
  RETURNING id INTO v_annexe;
  BEGIN
    INSERT INTO public.annexes_rapport_cs (copro_id, rapport_id, name, kind)
    VALUES (v_copro, v_rapport, 'Kind KO', 'video');
    RAISE EXCEPTION 'ASSERT FAIL : ck_annexes_cs_kind non appliquée';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- transitions de statut + validation
  UPDATE public.rapports_activite_cs
     SET status = 'valide', validated_by = v_mgr, validated_at = now()
   WHERE id = v_rapport;
  SELECT count(*) INTO v_n FROM public.rapports_activite_cs
   WHERE id = v_rapport AND status = 'valide' AND validated_by = v_mgr AND validated_at IS NOT NULL;
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : validation rapport'; END IF;

  -- (4) Cascade : la suppression du rapport emporte sections et annexes
  DELETE FROM public.rapports_activite_cs WHERE id = v_rapport;
  SELECT count(*) INTO v_n FROM public.sections_rapport_cs WHERE rapport_id = v_rapport;
  IF v_n <> 0 THEN RAISE EXCEPTION 'ASSERT FAIL : sections non cascadées'; END IF;
  SELECT count(*) INTO v_n FROM public.annexes_rapport_cs WHERE rapport_id = v_rapport;
  IF v_n <> 0 THEN RAISE EXCEPTION 'ASSERT FAIL : annexes non cascadées'; END IF;

  -- (5) Registre 0034 prouvé par la bascule DEV puis retour production
  --     (copro NON seedée → aucun trigger différé GL en attente).
  PERFORM set_config('app.environment', 'development', true);
  PERFORM public.apply_rls_environment();
  SELECT bool_and(NOT c.relrowsecurity) INTO v_bool
    FROM pg_class c
   WHERE c.oid IN ('public.rapports_activite_cs'::regclass,
                   'public.sections_rapport_cs'::regclass,
                   'public.annexes_rapport_cs'::regclass);
  IF v_bool IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'ASSERT FAIL : tables CS hors registre (bascule dev sans effet)'; END IF;
  PERFORM set_config('app.environment', 'production', true);
  PERFORM public.apply_rls_environment();

  -- (6) RLS prouvée : recrée un rapport, lecture membre OK, écriture membre KO,
  --     écriture manager OK (SET ROLE authenticated, claims utilisateur)
  INSERT INTO public.rapports_activite_cs (copro_id, author_id, period_start, period_end, title)
  VALUES (v_copro, v_mgr, current_date - 30, current_date, 'Rapport RLS G53')
  RETURNING id INTO v_rapport;
  BEGIN
    EXECUTE 'alter table public.rapports_activite_cs force row level security';
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_mem, 'role','authenticated')::text, true);
    PERFORM set_config('role', 'authenticated', true);
    SELECT count(*) INTO v_n FROM public.rapports_activite_cs WHERE id = v_rapport;
    IF v_n <> 1 THEN PERFORM set_config('role','service_role',true);
      RAISE EXCEPTION 'ASSERT FAIL : lecture membre rapports_activite_cs'; END IF;
    BEGIN
      INSERT INTO public.rapports_activite_cs (copro_id, period_start, period_end, title)
      VALUES (v_copro, current_date, current_date, 'Membre KO');
      PERFORM set_config('role','service_role',true);
      RAISE EXCEPTION 'ASSERT FAIL : écriture rapport autorisée à un copropriétaire';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_mgr, 'role','authenticated')::text, true);
    INSERT INTO public.sections_rapport_cs (copro_id, rapport_id, title)
    VALUES (v_copro, v_rapport, 'Section manager OK');
    PERFORM set_config('role', 'service_role', true);
  END;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
