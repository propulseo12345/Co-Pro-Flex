-- Gate 0042 : table resolution_templates + contraintes + trigger copro∈cabinet + helper + policies.
-- Auto-rollback (ROLLBACK_TEST_OK). Lancé par db-test.mjs (contexte service_role préfixé).
DO $$
DECLARE
  v_copro uuid; v_cabinet uuid; v_other_cabinet uuid; v_id uuid; v_a uuid; v_b uuid; v_n int;
BEGIN
  v_copro := create_clean_test_copro('restpl');
  SELECT cabinet_id INTO v_cabinet FROM public.copros WHERE id = v_copro;
  INSERT INTO public.cabinets (name) VALUES ('AUTRE CABINET TEST') RETURNING id INTO v_other_cabinet;

  -- (1) Table présente avec colonnes clés
  SELECT count(*) INTO v_n FROM information_schema.columns
   WHERE table_schema='public' AND table_name='resolution_templates'
     AND column_name IN ('id','cabinet_id','copro_id','code','titre','categorie','majorite','scope','status');
  IF v_n <> 9 THEN RAISE EXCEPTION 'ASSERT FAIL : colonnes %/9', v_n; END IF;

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

  -- (7) Trigger copro∈cabinet : copro d'un autre cabinet rejetée
  BEGIN
    INSERT INTO public.resolution_templates (cabinet_id, copro_id, titre, categorie, texte, majorite, scope)
    VALUES (v_other_cabinet, v_copro, 'T','Divers','x','ART_24','org'); -- v_copro ∉ v_other_cabinet
    RAISE EXCEPTION 'ASSERT FAIL : copro étrangère au cabinet acceptée';
  EXCEPTION WHEN others THEN
    IF SQLERRM LIKE '%n''appartient pas%' THEN NULL; ELSE RAISE; END IF;
  END;

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

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
