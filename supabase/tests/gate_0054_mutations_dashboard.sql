-- Gate 0054 : vues d'agrégat mutations + dashboard.
-- Méthode 0049/0052 : contrats de colonnes STRICTS ×4, security_invoker ×4,
-- dérivations prouvées en VALEUR (seller_name/notary_name dérivés, échéance
-- pré-état 15 j, has_pre_etat avant/après snapshot, v_etat_date_latest enrichie),
-- présence multi-sources dans les vues dashboard. Auto-rollback (ROLLBACK_TEST_OK).
DO $$
DECLARE
  v_copro uuid; v_lot uuid; v_seller uuid; v_buyer uuid; v_notary uuid;
  v_mut uuid; v_n int; v_bool boolean; v_arr text[];
  v_seller_name text; v_notary_name text; v_days int; v_has_pre boolean; v_has_final boolean;
  v_ag uuid;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);

  -- (1) Contrats STRICTS — compat front 5c8209e
  SELECT array_agg(column_name::text ORDER BY column_name) INTO v_arr
    FROM information_schema.columns WHERE table_schema='public' AND table_name='v_mutations_overview';
  IF v_arr IS DISTINCT FROM ARRAY['building_id','buyer_email','buyer_name','buyer_owner_id',
    'copro_id','created_at','days_until_pre_etat_deadline','effective_date','floor',
    'has_final_etat','has_pre_etat','id','lot_id','lot_ref','lot_type','mutation_type',
    'notary_email','notary_name','notes','requested_at','seller_email','seller_name',
    'seller_owner_id','signature_date','status','tantiemes_generaux','updated_at'] THEN
    RAISE EXCEPTION 'ASSERT FAIL : contrat v_mutations_overview : %', v_arr;
  END IF;
  SELECT array_agg(column_name::text ORDER BY column_name) INTO v_arr
    FROM information_schema.columns WHERE table_schema='public' AND table_name='v_etat_date_latest';
  IF v_arr IS DISTINCT FROM ARRAY['copro_id','document_id','generated_at','generated_by','id',
    'lot_id','lot_ref','mutation_id','mutation_status','payload','snapshot_type'] THEN
    RAISE EXCEPTION 'ASSERT FAIL : contrat v_etat_date_latest : %', v_arr;
  END IF;
  SELECT array_agg(column_name::text ORDER BY column_name) INTO v_arr
    FROM information_schema.columns WHERE table_schema='public' AND table_name='v_dashboard_recent_activity';
  IF v_arr IS DISTINCT FROM ARRAY['activity_type','copro_id','deep_link','event_date','label'] THEN
    RAISE EXCEPTION 'ASSERT FAIL : contrat v_dashboard_recent_activity : %', v_arr;
  END IF;
  SELECT array_agg(column_name::text ORDER BY column_name) INTO v_arr
    FROM information_schema.columns WHERE table_schema='public' AND table_name='v_dashboard_todos';
  IF v_arr IS DISTINCT FROM ARRAY['copro_id','deep_link','due_date','label','priority','todo_type'] THEN
    RAISE EXCEPTION 'ASSERT FAIL : contrat v_dashboard_todos : %', v_arr;
  END IF;

  -- (2) security_invoker ×4
  SELECT count(*) INTO v_n
  FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
  WHERE ns.nspname='public' AND c.relkind='v'
    AND c.relname IN ('v_mutations_overview','v_etat_date_latest',
                      'v_dashboard_recent_activity','v_dashboard_todos')
    AND coalesce((SELECT bool_or(opt ILIKE 'security_invoker%true%') FROM unnest(c.reloptions) opt), false);
  IF v_n <> 4 THEN RAISE EXCEPTION 'ASSERT FAIL : vues 0054 security_invoker %/4', v_n; END IF;

  -- (3) Harnais : copro seedée (lots + coproprietaires + clé générale)
  v_copro := create_clean_test_copro_seeded('g54');
  SELECT id INTO v_lot FROM public.lots WHERE copro_id = v_copro ORDER BY created_at LIMIT 1;
  SELECT id INTO v_seller FROM public.coproprietaires WHERE copro_id = v_copro ORDER BY created_at LIMIT 1;
  SELECT id INTO v_buyer  FROM public.coproprietaires WHERE copro_id = v_copro ORDER BY created_at OFFSET 1 LIMIT 1;
  IF v_lot IS NULL OR v_seller IS NULL THEN
    RAISE EXCEPTION 'SETUP FAIL : copro seedée sans lot/coproprietaire';
  END IF;
  INSERT INTO public.tiers (copro_id, name, email, is_notary, category)
  VALUES (v_copro, 'Maître Notaire G54', 'notaire@test.fr', true, 'externe')
  RETURNING id INTO v_notary;

  -- (4) Mutation draft (requested_at = now par défaut → échéance pré-état = 15 j)
  INSERT INTO public.mutations (copro_id, lot_id, seller_owner_id, buyer_owner_id,
                                notaire_id, mutation_type, status)
  VALUES (v_copro, v_lot, v_seller, v_buyer, v_notary, 'sale', 'draft')
  RETURNING id INTO v_mut;

  SELECT seller_name, notary_name, days_until_pre_etat_deadline, has_pre_etat, has_final_etat
    INTO v_seller_name, v_notary_name, v_days, v_has_pre, v_has_final
    FROM public.v_mutations_overview WHERE id = v_mut;
  IF v_seller_name IS NULL OR v_seller_name = 'Inconnu' THEN
    RAISE EXCEPTION 'ASSERT FAIL : seller_name non dérivé (%)', v_seller_name; END IF;
  IF v_notary_name IS DISTINCT FROM 'Maître Notaire G54' THEN
    RAISE EXCEPTION 'ASSERT FAIL : notary_name non dérivé de tiers (%)', v_notary_name; END IF;
  IF v_days <> 15 THEN
    RAISE EXCEPTION 'ASSERT FAIL : days_until_pre_etat_deadline % (attendu 15)', v_days; END IF;
  IF v_has_pre IS DISTINCT FROM false OR v_has_final IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'ASSERT FAIL : has_pre/final_etat devraient être false avant snapshot'; END IF;

  -- lot enrichi via v_lots_with_owners (ref + tantièmes)
  SELECT count(*) INTO v_n FROM public.v_mutations_overview
   WHERE id = v_mut AND lot_ref IS NOT NULL AND tantiemes_generaux IS NOT NULL
     AND buyer_name IS NOT NULL AND status = 'draft' AND mutation_type = 'sale';
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : enrichissement lot/acheteur v_mutations_overview'; END IF;

  -- (5) Snapshot pré-état → has_pre_etat bascule + v_etat_date_latest enrichie
  -- payload : la contrainte ck_etat_date_payload_parts exige les 3 parties art.5
  INSERT INTO public.etat_date_snapshots (copro_id, mutation_id, lot_id, snapshot_type,
                                          effective_date, payload)
  VALUES (v_copro, v_mut, v_lot, 'pre', current_date,
          '{"partie_1_sommes_dues_vendeur":{},"partie_2_dues_par_syndicat":{},"partie_3_charge_acquereur":{}}'::jsonb);
  SELECT has_pre_etat INTO v_bool FROM public.v_mutations_overview WHERE id = v_mut;
  IF v_bool IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'ASSERT FAIL : has_pre_etat non basculé après snapshot'; END IF;
  SELECT count(*) INTO v_n FROM public.v_etat_date_latest
   WHERE mutation_id = v_mut AND snapshot_type = 'pre'
     AND mutation_status = 'draft' AND lot_ref IS NOT NULL;
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : v_etat_date_latest n''enrichit pas le snapshot'; END IF;

  -- (6) v_dashboard_recent_activity : la copro seedée a des paiements (boucle d'or)
  --     → au moins une ligne FINANCE
  SELECT count(*) INTO v_n FROM public.v_dashboard_recent_activity
   WHERE copro_id = v_copro AND activity_type = 'FINANCE';
  IF v_n < 1 THEN RAISE EXCEPTION 'ASSERT FAIL : v_dashboard_recent_activity sans activité finance'; END IF;

  -- (7) v_dashboard_todos : une AG draft → ligne todo_type='ag_draft'
  INSERT INTO public.ag_meetings (copro_id, title, meeting_type, meeting_date, status)
  VALUES (v_copro, 'AG todo G54', 'ordinary', current_date + 40, 'draft')
  RETURNING id INTO v_ag;
  SELECT count(*) INTO v_n FROM public.v_dashboard_todos
   WHERE copro_id = v_copro AND todo_type = 'ag_draft' AND priority = 2;
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : v_dashboard_todos sans ag_draft (%))', v_n; END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
