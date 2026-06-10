-- Gate 0042 : table resolution_templates + contraintes + trigger copro∈cabinet + helper + policies.
-- Auto-rollback (ROLLBACK_TEST_OK). Lancé par db-test.mjs (contexte service_role préfixé).
DO $$
DECLARE
  v_copro uuid; v_cabinet uuid; v_other_cabinet uuid; v_id uuid; v_a uuid; v_b uuid; v_n int;
  v_tpl_cab uuid; v_coown uuid := gen_random_uuid(); v_mgr uuid := gen_random_uuid();
BEGIN
  v_copro := create_clean_test_copro('restpl');
  SELECT cabinet_id INTO v_cabinet FROM public.copros WHERE id = v_copro;
  INSERT INTO public.cabinets (name) VALUES ('AUTRE CABINET TEST') RETURNING id INTO v_other_cabinet;

  -- (1) Table présente avec colonnes clés
  SELECT count(*) INTO v_n FROM information_schema.columns
   WHERE table_schema='public' AND table_name='resolution_templates'
     AND column_name IN ('id','cabinet_id','copro_id','code','titre','categorie','majorite','scope','status');
  IF v_n <> 9 THEN RAISE EXCEPTION 'ASSERT FAIL : colonnes %/9', v_n; END IF;
  -- (1b) Type des colonnes clés : scope et majorite stockées en text (pas en enum dédié).
  SELECT count(*) INTO v_n FROM information_schema.columns
   WHERE table_schema='public' AND table_name='resolution_templates'
     AND column_name IN ('scope','majorite') AND data_type = 'text';
  IF v_n <> 2 THEN RAISE EXCEPTION 'ASSERT FAIL : scope/majorite pas en text (%/2)', v_n; END IF;

  -- (2) Helper cabinet présent
  IF to_regprocedure('public.user_is_cabinet_manager(uuid)') IS NULL THEN
    RAISE EXCEPTION 'ASSERT FAIL : user_is_cabinet_manager absent';
  END IF;

  -- (3) Insert système OK (cabinet_id NULL + code + scope system)
  INSERT INTO public.resolution_templates (code, titre, categorie, texte, majorite, scope)
  VALUES ('test-sys-1','T','Divers','x','ART_24','system') RETURNING id INTO v_id;

  -- (4) CHECK scope : système avec scope 'org' rejeté
  BEGIN
    INSERT INTO public.resolution_templates (titre, categorie, texte, majorite, scope)
    VALUES ('bad','Divers','x','ART_24','org');
    RAISE EXCEPTION 'ASSERT FAIL : scope org sans cabinet accepté';
  EXCEPTION WHEN check_violation THEN NULL; END;

  -- (5) CHECK code : modèle cabinet AVEC code rejeté
  BEGIN
    INSERT INTO public.resolution_templates (cabinet_id, code, titre, categorie, texte, majorite, scope)
    VALUES (v_cabinet,'x-code','T','Divers','x','ART_24','org');
    RAISE EXCEPTION 'ASSERT FAIL : code sur modèle cabinet accepté';
  EXCEPTION WHEN check_violation THEN NULL; END;

  -- (6) Unicité code système
  BEGIN
    INSERT INTO public.resolution_templates (code, titre, categorie, texte, majorite, scope)
    VALUES ('test-sys-1','dup','Divers','x','ART_24','system');
    RAISE EXCEPTION 'ASSERT FAIL : code système dupliqué accepté';
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- (7) Trigger copro∈cabinet : copro d'un autre cabinet rejetée (SQLSTATE check_violation dédié)
  BEGIN
    INSERT INTO public.resolution_templates (cabinet_id, copro_id, titre, categorie, texte, majorite, scope)
    VALUES (v_other_cabinet, v_copro, 'T','Divers','x','ART_24','org'); -- v_copro ∉ v_other_cabinet
    RAISE EXCEPTION 'ASSERT FAIL : copro étrangère au cabinet acceptée';
  EXCEPTION WHEN check_violation THEN NULL; END;

  -- (8) deprecated_by ON DELETE SET NULL
  INSERT INTO public.resolution_templates (cabinet_id, titre, categorie, texte, majorite, scope)
  VALUES (v_cabinet,'A','Divers','x','ART_24','org') RETURNING id INTO v_a;
  INSERT INTO public.resolution_templates (cabinet_id, titre, categorie, texte, majorite, scope, deprecated_by)
  VALUES (v_cabinet,'B','Divers','x','ART_24','org', v_a) RETURNING id INTO v_b;
  DELETE FROM public.resolution_templates WHERE id = v_a;            -- ne doit PAS être bloqué
  SELECT count(*) INTO v_n FROM public.resolution_templates WHERE id = v_b AND deprecated_by IS NULL;
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : deprecated_by non remis à NULL'; END IF;

  -- (9) 4 policies présentes
  SELECT count(*) INTO v_n FROM pg_policies
   WHERE schemaname='public' AND tablename='resolution_templates';
  IF v_n <> 4 THEN RAISE EXCEPTION 'ASSERT FAIL : %/4 policies', v_n; END IF;

  -- (10) EFFET DES POLICIES (anti-régression B1 : le helper doit contrôler le RÔLE, pas le seul cabinet_id).
  --   On force la RLS DANS un savepoint (bloc BEGIN…EXCEPTION = savepoint implicite). Deux utilisateurs du
  --   MÊME cabinet : un coproprietaire (membership 'coproprietaire') et un gestionnaire (membership
  --   'gestionnaire'), tous deux avec profiles.cabinet_id = ce cabinet. On simule leur JWT (request.jwt.claims
  --   .sub + role 'authenticated') et on vérifie qu'un modèle CABINET n'est visible/modifiable QUE par le
  --   gestionnaire. À la fin (succès comme échec) on lève RLS_SUBTEST_OK pour ROLLBACK le savepoint -> la
  --   bascule ENABLE/FORCE RLS est défaite, on ne laisse pas la table en RLS forcée pour la suite/les autres gates.
  BEGIN
    -- modèle CABINET de ce cabinet (rattaché à la copro pour bien situer le tenant)
    INSERT INTO public.resolution_templates (cabinet_id, copro_id, titre, categorie, texte, majorite, scope)
    VALUES (v_cabinet, v_copro, 'Modele cabinet RLS', 'Divers', 'x', 'ART_24', 'org')
    RETURNING id INTO v_tpl_cab;

    -- 2 utilisateurs auth.users -> profiles créés par le trigger handle_new_user ; on pose leur cabinet
    INSERT INTO auth.users (id, email)
    VALUES (v_coown, 'coown.' || substr(v_coown::text,1,8) || '@test.fr'),
           (v_mgr,   'mgr.'   || substr(v_mgr::text,1,8)   || '@test.fr');
    UPDATE public.profiles SET cabinet_id = v_cabinet WHERE id IN (v_coown, v_mgr);
    INSERT INTO public.memberships (user_id, copro_id, role) VALUES
      (v_coown, v_copro, 'coproprietaire'),
      (v_mgr,   v_copro, 'gestionnaire');

    -- active ET force la RLS (FORCE : s'applique même au propriétaire de la table)
    ALTER TABLE public.resolution_templates ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.resolution_templates FORCE ROW LEVEL SECURITY;

    -- (10a) COPROPRIÉTAIRE : ne voit PAS et ne modifie PAS le modèle cabinet
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_coown, 'role','authenticated')::text, true);
    PERFORM set_config('role', 'authenticated', true);
    SELECT count(*) INTO v_n FROM public.resolution_templates WHERE id = v_tpl_cab;
    IF v_n <> 0 THEN
      PERFORM set_config('role','service_role', true);
      RAISE EXCEPTION 'ASSERT FAIL : fuite RLS copropriétaire (SELECT, % ligne(s) vues)', v_n;
    END IF;
    UPDATE public.resolution_templates SET titre = 'hack' WHERE id = v_tpl_cab;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n <> 0 THEN
      PERFORM set_config('role','service_role', true);
      RAISE EXCEPTION 'ASSERT FAIL : fuite RLS copropriétaire (UPDATE, % ligne(s) modifiées)', v_n;
    END IF;

    -- (10b) GESTIONNAIRE : voit ET modifie le modèle cabinet
    PERFORM set_config('role','service_role', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_mgr, 'role','authenticated')::text, true);
    PERFORM set_config('role', 'authenticated', true);
    SELECT count(*) INTO v_n FROM public.resolution_templates WHERE id = v_tpl_cab;
    IF v_n <> 1 THEN
      PERFORM set_config('role','service_role', true);
      RAISE EXCEPTION 'ASSERT FAIL : gestionnaire ne voit PAS son modèle cabinet (% ligne)', v_n;
    END IF;
    UPDATE public.resolution_templates SET titre = 'maj-gestionnaire' WHERE id = v_tpl_cab;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n <> 1 THEN
      PERFORM set_config('role','service_role', true);
      RAISE EXCEPTION 'ASSERT FAIL : gestionnaire ne PEUT PAS modifier son modèle cabinet (% ligne)', v_n;
    END IF;

    -- rétablit service_role et provoque le ROLLBACK du savepoint (défait la RLS forcée)
    PERFORM set_config('role','service_role', true);
    PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
    RAISE EXCEPTION 'RLS_SUBTEST_OK';
  EXCEPTION WHEN OTHERS THEN
    -- garantit le retour en service_role même sur échec (le savepoint a déjà annulé la bascule RLS)
    PERFORM set_config('role','service_role', true);
    PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
    IF SQLERRM <> 'RLS_SUBTEST_OK' THEN RAISE; END IF;
  END;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
