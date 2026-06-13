-- Gate 0052 : vues de compat GED + table pv_templates.
-- Méthode 0049/0051 : contrats de colonnes STRICTS (égalité d'ensembles ×6),
-- dérivations prouvées en VALEUR (compteurs dossiers, stats par catégorie,
-- fenêtres 30/90 j, mapping confidentiality←visibility, soft-delete exclu),
-- pv_templates : contraintes (scope système, défaut unique) + RLS prouvée
-- sous SET ROLE authenticated (lecture membre, écriture refusée, manager OK)
-- + registre apply_rls_environment (pv_templates ET ag_documents, rattrapage 0050).
-- Auto-rollback (ROLLBACK_TEST_OK).
DO $$
DECLARE
  v_copro uuid; v_root uuid; v_sub uuid;
  v_doc_a uuid; v_doc_b uuid; v_doc_c uuid; v_doc_d uuid;
  v_mgr uuid := gen_random_uuid();   -- gestionnaire (créateur des docs)
  v_mem uuid := gen_random_uuid();   -- copropriétaire (lecture seule)
  v_tpl_sys uuid; v_tpl_copro uuid;
  v_n int; v_big bigint; v_txt text; v_bool boolean; v_arr text[];
BEGIN
  -- (1) Contrats STRICTS — compat front 5c8209e
  SELECT array_agg(column_name::text ORDER BY column_name) INTO v_arr
    FROM information_schema.columns WHERE table_schema='public' AND table_name='v_documents_with_folder';
  IF v_arr IS DISTINCT FROM ARRAY['ag_id','archived_at','category','confidentiality','contract_id',
    'copro_id','copro_name','coproprietaire_id','created_at','created_by','deletion_blocked',
    'description','document_date','dossier_id','expiration_date','file_hash','file_name',
    'file_path','file_size','folder_color','folder_icon','folder_id','folder_name','id',
    'invoice_id','is_archived','is_current_version','lot_id','mime_type','mutation_id',
    'parent_document_id','parent_folder_name','resolution_id','retention_years','search_text',
    'service_order_id','source_module','status','tags','title','updated_at','version','year'] THEN
    RAISE EXCEPTION 'ASSERT FAIL : contrat v_documents_with_folder : %', v_arr;
  END IF;
  SELECT array_agg(column_name::text ORDER BY column_name) INTO v_arr
    FROM information_schema.columns WHERE table_schema='public' AND table_name='v_documents_expiring';
  IF v_arr IS DISTINCT FROM ARRAY['ag_id','archived_at','category','confidentiality','contract_id',
    'copro_id','coproprietaire_id','created_at','created_by','days_until_expiration',
    'deletion_blocked','description','document_date','dossier_id','expiration_date','file_hash',
    'file_name','file_path','file_size','folder_id','folder_name','id','invoice_id','is_archived',
    'is_current_version','lot_id','mime_type','mutation_id','parent_document_id','resolution_id',
    'retention_years','search_text','service_order_id','source_module','status','tags','title',
    'updated_at','version','year'] THEN
    RAISE EXCEPTION 'ASSERT FAIL : contrat v_documents_expiring : %', v_arr;
  END IF;
  SELECT array_agg(column_name::text ORDER BY column_name) INTO v_arr
    FROM information_schema.columns WHERE table_schema='public' AND table_name='v_folders_with_counts';
  IF v_arr IS DISTINCT FROM ARRAY['category_default','color','copro_id','created_at','created_by',
    'description','document_count','icon','id','is_system','name','parent_id','parent_name',
    'sort_order','subfolder_count','updated_at'] THEN
    RAISE EXCEPTION 'ASSERT FAIL : contrat v_folders_with_counts : %', v_arr;
  END IF;
  SELECT array_agg(column_name::text ORDER BY column_name) INTO v_arr
    FROM information_schema.columns WHERE table_schema='public' AND table_name='v_recent_documents';
  IF v_arr IS DISTINCT FROM ARRAY['category','confidentiality','copro_id','created_at','created_by',
    'created_by_name','file_name','file_size','folder_id','folder_name','id','mime_type','title'] THEN
    RAISE EXCEPTION 'ASSERT FAIL : contrat v_recent_documents : %', v_arr;
  END IF;
  SELECT array_agg(column_name::text ORDER BY column_name) INTO v_arr
    FROM information_schema.columns WHERE table_schema='public' AND table_name='v_documents_stats';
  IF v_arr IS DISTINCT FROM ARRAY['active_count','archived_count','contrat_count','copro_id',
    'diagnostic_count','expiring_soon_count','facture_count','last_document_date','pv_ag_count',
    'total_documents','total_size_bytes'] THEN
    RAISE EXCEPTION 'ASSERT FAIL : contrat v_documents_stats : %', v_arr;
  END IF;
  SELECT array_agg(column_name::text ORDER BY column_name) INTO v_arr
    FROM information_schema.columns WHERE table_schema='public' AND table_name='v_documents_by_category';
  IF v_arr IS DISTINCT FROM ARRAY['category','copro_id','count','last_added','total_size'] THEN
    RAISE EXCEPTION 'ASSERT FAIL : contrat v_documents_by_category : %', v_arr;
  END IF;

  -- (2) Les 6 vues en security_invoker
  SELECT count(*) INTO v_n
  FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
  WHERE ns.nspname='public' AND c.relkind='v'
    AND c.relname IN ('v_documents_with_folder','v_folders_with_counts','v_recent_documents',
                      'v_documents_stats','v_documents_by_category','v_documents_expiring')
    AND coalesce((SELECT bool_or(opt ILIKE 'security_invoker%true%') FROM unnest(c.reloptions) opt), false);
  IF v_n <> 6 THEN RAISE EXCEPTION 'ASSERT FAIL : vues GED security_invoker %/6', v_n; END IF;

  -- (3) Harnais : copro + gestionnaire/copropriétaire + arborescence + 4 documents
  v_copro := create_clean_test_copro('g52');
  INSERT INTO auth.users (id, email) VALUES (v_mgr, 'mgr52.'||substr(v_mgr::text,1,8)||'@test.fr');
  INSERT INTO auth.users (id, email) VALUES (v_mem, 'mem52.'||substr(v_mem::text,1,8)||'@test.fr');
  -- user_is_copro_manager exige le rattachement cabinet du profil (anti cross-cabinet)
  UPDATE public.profiles SET full_name = 'Manager G52',
    cabinet_id = (SELECT cabinet_id FROM public.copros WHERE id = v_copro)
  WHERE id = v_mgr;
  INSERT INTO public.memberships (user_id, copro_id, role)
  VALUES (v_mgr, v_copro, 'gestionnaire'), (v_mem, v_copro, 'coproprietaire');

  INSERT INTO public.document_folders (copro_id, name, icon, color, sort_order, is_system)
  VALUES (v_copro, 'Racine G52', 'folder', '#888888', 0, false) RETURNING id INTO v_root;
  INSERT INTO public.document_folders (copro_id, parent_id, name, icon, color, sort_order, is_system)
  VALUES (v_copro, v_root, 'Sous G52', 'folder', '#777777', 1, false) RETURNING id INTO v_sub;

  -- expiration_date est DÉRIVÉE (trg_document_expiration : document_date +
  -- retention_years, granularité année). Pour des fenêtres jour-précises (20 j /
  -- 80 j), on suspend le trigger le temps du harnais — tout est rollback ensuite.
  EXECUTE 'alter table public.documents disable trigger trg_document_expiration';

  -- A : actif, contrat, public, sous-dossier, expire dans 20 j
  INSERT INTO public.documents (copro_id, folder_id, file_name, file_path, file_size, mime_type,
                                title, category, status, visibility, expiration_date, created_by)
  VALUES (v_copro, v_sub, 'a.pdf', v_copro||'/a.pdf', 100, 'application/pdf',
          'Contrat A', 'contrat', 'active', 'tous_coproprietaires', current_date + 20, v_mgr)
  RETURNING id INTO v_doc_a;
  -- B : actif, facture, gestionnaire_seul, racine, expire dans 80 j
  INSERT INTO public.documents (copro_id, folder_id, file_name, file_path, file_size, mime_type,
                                title, category, status, visibility, expiration_date, created_by)
  VALUES (v_copro, v_root, 'b.pdf', v_copro||'/b.pdf', 50, 'application/pdf',
          'Facture B', 'facture', 'active', 'gestionnaire_seul', current_date + 80, v_mgr)
  RETURNING id INTO v_doc_b;
  -- C : archivé, pv_ag, conseil
  INSERT INTO public.documents (copro_id, file_name, file_path, file_size, title, category,
                                status, visibility, is_archived, archived_at, created_by)
  VALUES (v_copro, 'c.pdf', v_copro||'/c.pdf', 25, 'PV C', 'pv_ag', 'archived', 'conseil', true, now(), v_mgr)
  RETURNING id INTO v_doc_c;
  -- D : soft-deleted — ne doit apparaître NULLE PART
  INSERT INTO public.documents (copro_id, file_name, file_path, file_size, title, category,
                                status, visibility, created_by)
  VALUES (v_copro, 'd.pdf', v_copro||'/d.pdf', 999, 'Mort D', 'autre', 'deleted', 'gestionnaire_seul', v_mgr)
  RETURNING id INTO v_doc_d;

  EXECUTE 'alter table public.documents enable trigger trg_document_expiration';

  -- (4) v_documents_with_folder : jointures + mapping + soft-delete exclu
  SELECT count(*) INTO v_n FROM public.v_documents_with_folder
   WHERE id = v_doc_a AND folder_name = 'Sous G52' AND parent_folder_name = 'Racine G52'
     AND copro_name IS NOT NULL AND confidentiality = 'public'
     AND version = 1 AND is_current_version = true AND ag_id IS NULL AND status = 'active';
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : v_documents_with_folder doc A'; END IF;
  SELECT confidentiality INTO v_txt FROM public.v_documents_with_folder WHERE id = v_doc_b;
  IF v_txt IS DISTINCT FROM 'manager' THEN
    RAISE EXCEPTION 'ASSERT FAIL : confidentiality B % (attendu manager)', v_txt; END IF;
  SELECT confidentiality INTO v_txt FROM public.v_documents_with_folder WHERE id = v_doc_c;
  IF v_txt IS DISTINCT FROM 'council' THEN
    RAISE EXCEPTION 'ASSERT FAIL : confidentiality C % (attendu council)', v_txt; END IF;
  SELECT count(*) INTO v_n FROM public.v_documents_with_folder WHERE id = v_doc_d;
  IF v_n <> 0 THEN RAISE EXCEPTION 'ASSERT FAIL : doc soft-deleted visible dans with_folder'; END IF;

  -- (5) v_folders_with_counts : compteurs actifs seulement + hiérarchie
  SELECT count(*) INTO v_n FROM public.v_folders_with_counts
   WHERE id = v_root AND document_count = 1 AND subfolder_count = 1 AND parent_name IS NULL;
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : v_folders_with_counts racine'; END IF;
  SELECT count(*) INTO v_n FROM public.v_folders_with_counts
   WHERE id = v_sub AND document_count = 1 AND subfolder_count = 0 AND parent_name = 'Racine G52';
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : v_folders_with_counts sous-dossier'; END IF;

  -- (6) v_recent_documents : actifs seulement, créateur résolu
  SELECT count(*) INTO v_n FROM public.v_recent_documents WHERE copro_id = v_copro;
  IF v_n <> 2 THEN RAISE EXCEPTION 'ASSERT FAIL : v_recent_documents % lignes (attendu 2)', v_n; END IF;
  SELECT count(*) INTO v_n FROM public.v_recent_documents
   WHERE id = v_doc_a AND created_by_name = 'Manager G52' AND folder_name = 'Sous G52';
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : v_recent_documents doc A'; END IF;

  -- (7) v_documents_stats : valeurs exactes (D exclu, expiring 30 j = A seul)
  SELECT count(*) INTO v_n FROM public.v_documents_stats
   WHERE copro_id = v_copro AND total_documents = 3
     AND contrat_count = 1 AND facture_count = 1 AND pv_ag_count = 1 AND diagnostic_count = 0
     AND active_count = 2 AND archived_count = 1 AND expiring_soon_count = 1
     AND total_size_bytes = 175 AND last_document_date IS NOT NULL;
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : v_documents_stats valeurs'; END IF;

  -- (8) v_documents_by_category : actifs seulement
  SELECT count(*) INTO v_n FROM public.v_documents_by_category WHERE copro_id = v_copro;
  IF v_n <> 2 THEN RAISE EXCEPTION 'ASSERT FAIL : by_category % lignes (attendu 2)', v_n; END IF;
  SELECT count(*) INTO v_n FROM public.v_documents_by_category
   WHERE copro_id = v_copro AND category = 'contrat' AND count = 1 AND total_size = 100;
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : by_category contrat'; END IF;

  -- (9) v_documents_expiring : fenêtre 90 j + jours restants exacts
  SELECT count(*) INTO v_n FROM public.v_documents_expiring WHERE copro_id = v_copro;
  IF v_n <> 2 THEN RAISE EXCEPTION 'ASSERT FAIL : expiring % lignes (attendu 2)', v_n; END IF;
  SELECT count(*) INTO v_n FROM public.v_documents_expiring
   WHERE id = v_doc_a AND days_until_expiration = 20 AND folder_name = 'Sous G52';
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : expiring doc A (20 j)'; END IF;
  SELECT count(*) INTO v_n FROM public.v_documents_expiring
   WHERE id = v_doc_b AND days_until_expiration = 80;
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : expiring doc B (80 j)'; END IF;

  -- (10) pv_templates : scope système et défaut unique
  INSERT INTO public.pv_templates (copro_id, name, status, is_system_template, spec)
  VALUES (NULL, 'Systeme G52', 'active', true, '{"k":1}'::jsonb) RETURNING id INTO v_tpl_sys;
  INSERT INTO public.pv_templates (copro_id, name, status, is_default, spec, created_by)
  VALUES (v_copro, 'Copro G52', 'active', true, '{"k":2}'::jsonb, v_mgr) RETURNING id INTO v_tpl_copro;
  BEGIN
    INSERT INTO public.pv_templates (copro_id, name, is_system_template, spec)
    VALUES (v_copro, 'Scope KO', true, '{}'::jsonb);
    RAISE EXCEPTION 'ASSERT FAIL : ck_pv_templates_scope non appliquée';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.pv_templates (copro_id, name, status, is_default, spec)
    VALUES (v_copro, 'Defaut 2 KO', 'active', true, '{}'::jsonb);
    RAISE EXCEPTION 'ASSERT FAIL : uq_pv_templates_default non appliquée';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  -- (11) RLS pv_templates prouvée (mécanique gate_rls : ENABLE+FORCE en sous-bloc,
  --      SET ROLE authenticated, claims utilisateur) + registre 0034 (rattrapage
  --      ag_documents) : apply_rls_environment() en simulation production doit
  --      activer la RLS des DEUX tables.
  BEGIN
    PERFORM set_config('app.environment', 'production', true);
    PERFORM public.apply_rls_environment();
    SELECT relrowsecurity INTO v_bool FROM pg_class WHERE oid = 'public.pv_templates'::regclass;
    IF v_bool IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'ASSERT FAIL : pv_templates hors registre apply_rls_environment'; END IF;
    SELECT relrowsecurity INTO v_bool FROM pg_class WHERE oid = 'public.ag_documents'::regclass;
    IF v_bool IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'ASSERT FAIL : ag_documents hors registre apply_rls_environment'; END IF;

    EXECUTE 'alter table public.pv_templates force row level security';

    -- copropriétaire : lit le template système + celui de sa copro, ne peut PAS écrire
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_mem, 'role','authenticated')::text, true);
    PERFORM set_config('role', 'authenticated', true);
    SELECT count(*) INTO v_n FROM public.pv_templates WHERE id IN (v_tpl_sys, v_tpl_copro);
    IF v_n <> 2 THEN PERFORM set_config('role','service_role',true);
      RAISE EXCEPTION 'ASSERT FAIL : lecture membre pv_templates %/2', v_n; END IF;
    BEGIN
      INSERT INTO public.pv_templates (copro_id, name, spec) VALUES (v_copro, 'Membre KO', '{}'::jsonb);
      PERFORM set_config('role','service_role',true);
      RAISE EXCEPTION 'ASSERT FAIL : écriture pv_templates autorisée à un copropriétaire';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    -- gestionnaire : écrit
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_mgr, 'role','authenticated')::text, true);
    INSERT INTO public.pv_templates (copro_id, name, spec, created_by)
    VALUES (v_copro, 'Manager OK', '{}'::jsonb, v_mgr);
    PERFORM set_config('role', 'service_role', true);
  END;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
