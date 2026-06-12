-- Gate 0050 : AG annexes (6 vues + ag_documents + register_ag_document +
-- delete_ag_draft + ag_notifications.notification_type).
-- Méthode 0049 durcie : contrats de colonnes STRICTS, valeurs prouvées sur copro
-- harnais (présences via lots réels de la clé — le trigger tantièmes ÉCRASE),
-- versionnage register_ag_document prouvé, delete_ag_draft refusé hors brouillon,
-- NÉGATIFS : les 8 RPC mortes (pouvoirs/jalons/envoi_choices) ne doivent PAS exister.
-- Auto-rollback (ROLLBACK_TEST_OK).
DO $$
DECLARE
  v_copro uuid; v_ag uuid; v_ag2 uuid; v_res1 uuid; v_res2 uuid;
  v_user_a uuid := gen_random_uuid();
  v_cp1 uuid; v_cp2 uuid; v_cp3 uuid;
  v_form1 uuid; v_form2 uuid; v_vote1 uuid; v_doc1 jsonb; v_doc2 jsonb;
  v_n int; v_num numeric; v_total numeric; v_txt text; v_arr text[]; v_json jsonb;
  v_lots text[]; v_w numeric;
BEGIN
  -- (1) Les 6 vues existent en security_invoker
  SELECT count(*) INTO v_n
  FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
  WHERE ns.nspname = 'public' AND c.relkind = 'v'
    AND c.relname IN ('v_ag_attendance_summary','v_ag_votes_detailed','v_ag_drafts_progress',
                      'v_ag_correspondence_status','v_ag_documents','v_ag_notification_stats')
    AND coalesce((SELECT bool_or(opt ILIKE 'security_invoker%true%') FROM unnest(c.reloptions) opt), false);
  IF v_n <> 6 THEN RAISE EXCEPTION 'ASSERT FAIL : vues security_invoker %/6', v_n; END IF;

  -- (2) Contrats de colonnes STRICTS
  SELECT array_agg(column_name::text ORDER BY column_name) INTO v_arr
    FROM information_schema.columns WHERE table_schema='public' AND table_name='v_ag_attendance_summary';
  IF v_arr IS DISTINCT FROM ARRAY['ag_date','ag_id','ag_title','arrived_at','copro_id',
    'coproprietaire_id','created_at','id','left_at','lot_ids','lot_refs','owner_email',
    'owner_name','presence_type','represented_by_name','signed','signed_at','tantiemes'] THEN
    RAISE EXCEPTION 'ASSERT FAIL : contrat v_ag_attendance_summary : %', v_arr;
  END IF;
  SELECT array_agg(column_name::text ORDER BY column_name) INTO v_arr
    FROM information_schema.columns WHERE table_schema='public' AND table_name='v_ag_votes_detailed';
  IF v_arr IS DISTINCT FROM ARRAY['ag_id','ag_title','copro_id','coproprietaire_id','created_at',
    'exclusion_reason','is_excluded','majority_type','meeting_date','resolution_id',
    'resolution_number','resolution_title','tantiemes','vote','vote_id','vote_source','voter_name'] THEN
    RAISE EXCEPTION 'ASSERT FAIL : contrat v_ag_votes_detailed : %', v_arr;
  END IF;
  SELECT array_agg(column_name::text ORDER BY column_name) INTO v_arr
    FROM information_schema.columns WHERE table_schema='public' AND table_name='v_ag_drafts_progress';
  IF v_arr IS DISTINCT FROM ARRAY['ag_id','attendance_count','completion_ratio','copro_id',
    'created_at','current_step','has_attendance','has_resolutions','has_votes','last_activity_at',
    'location','max_step_reached','meeting_date','meeting_type','resolutions_count','status',
    'step_data','title','updated_at','votes_count','wizard_mode'] THEN
    RAISE EXCEPTION 'ASSERT FAIL : contrat v_ag_drafts_progress : %', v_arr;
  END IF;
  SELECT array_agg(column_name::text ORDER BY column_name) INTO v_arr
    FROM information_schema.columns WHERE table_schema='public' AND table_name='v_ag_correspondence_status';
  IF v_arr IS DISTINCT FROM ARRAY['ag_id','ag_status','ag_title','copro_id','correspondence_ratio',
    'correspondence_tantiemes','forms_integrated','forms_received','forms_validated','meeting_date',
    'total_tantiemes','vote_details_count','votes_integrated'] THEN
    RAISE EXCEPTION 'ASSERT FAIL : contrat v_ag_correspondence_status : %', v_arr;
  END IF;
  SELECT array_agg(column_name::text ORDER BY column_name) INTO v_arr
    FROM information_schema.columns WHERE table_schema='public' AND table_name='v_ag_documents';
  IF v_arr IS DISTINCT FROM ARRAY['ag_date','ag_id','ag_status','ag_title','copro_id','doc_type',
    'document_id','document_name','file_name','file_size','generated_at','generated_by',
    'generated_by_name','generation_metadata','id','retention_until','storage_path','version'] THEN
    RAISE EXCEPTION 'ASSERT FAIL : contrat v_ag_documents : %', v_arr;
  END IF;
  SELECT array_agg(column_name::text ORDER BY column_name) INTO v_arr
    FROM information_schema.columns WHERE table_schema='public' AND table_name='v_ag_notification_stats';
  IF v_arr IS DISTINCT FROM ARRAY['ag_id','bounced_count','copro_id','delivered_count','failed_count',
    'notification_type','opened_count','pending_count','sent_count','total_count'] THEN
    RAISE EXCEPTION 'ASSERT FAIL : contrat v_ag_notification_stats : %', v_arr;
  END IF;

  -- (3) NÉGATIF : les RPC mortes ne doivent pas exister (décision 2026-06-12)
  SELECT count(*) INTO v_n FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
  WHERE ns.nspname = 'public'
    AND p.proname IN ('get_ag_milestones','save_ag_milestone','get_ag_pouvoirs','save_ag_pouvoir',
                      'update_ag_pouvoir_justificatif','delete_ag_pouvoir',
                      'get_ag_envoi_choices','save_ag_envoi_choices');
  IF v_n <> 0 THEN RAISE EXCEPTION 'ASSERT FAIL : % RPC mortes présentes (interdites)', v_n; END IF;

  -- (4) Harnais : copro seedée + 1 gestionnaire
  v_copro := create_clean_test_copro_seeded('g50');
  INSERT INTO auth.users (id, email) VALUES (v_user_a, 'a50.'||substr(v_user_a::text,1,8)||'@test.fr');
  UPDATE public.profiles SET full_name = 'Gestionnaire Gate50' WHERE id = v_user_a;
  INSERT INTO public.memberships (user_id, copro_id, role) VALUES (v_user_a, v_copro, 'gestionnaire');

  SELECT id INTO v_cp1 FROM public.coproprietaires WHERE copro_id = v_copro ORDER BY created_at LIMIT 1;
  SELECT id INTO v_cp2 FROM public.coproprietaires WHERE copro_id = v_copro ORDER BY created_at OFFSET 1 LIMIT 1;
  SELECT id INTO v_cp3 FROM public.coproprietaires WHERE copro_id = v_copro ORDER BY created_at OFFSET 2 LIMIT 1;
  SELECT array_agg(lot_id ORDER BY weight DESC), sum(weight) INTO v_lots, v_num FROM (
    SELECT rkl.lot_id::text AS lot_id, rkl.weight
    FROM public.repartition_keys rk
    JOIN public.repartition_key_lines rkl ON rkl.key_id = rk.id
    WHERE rk.copro_id = v_copro AND rk.category = 'general' AND rk.is_active = true
    ORDER BY rkl.weight DESC LIMIT 3
  ) s;
  IF v_cp3 IS NULL OR coalesce(array_length(v_lots,1),0) <> 3 THEN
    RAISE EXCEPTION 'SETUP FAIL : harnais sans 3 coproprietaires/lots pondérés';
  END IF;
  SELECT coalesce(sum(rkl.weight), 0) INTO v_total
  FROM public.repartition_keys rk
  JOIN public.repartition_key_lines rkl ON rkl.key_id = rk.id
  WHERE rk.copro_id = v_copro AND rk.category = 'general' AND rk.is_active = true;

  -- AG brouillon (wizard étape 3/7) + 2 résolutions + 3 présences (1 par type)
  INSERT INTO public.ag_meetings (copro_id, title, meeting_type, meeting_date, status,
                                  current_step, max_step_reached, created_by)
  VALUES (v_copro, 'AG Gate 50', 'ordinary', current_date + 45, 'draft', 3, 3, v_user_a)
  RETURNING id INTO v_ag;
  INSERT INTO public.ag_resolutions (ag_id, copro_id, resolution_number, title, resolution_type, majority_type, status)
  VALUES (v_ag, v_copro, 1, 'R1 gate50', 'budget', 'art24', 'pending') RETURNING id INTO v_res1;
  INSERT INTO public.ag_resolutions (ag_id, copro_id, resolution_number, title, resolution_type, majority_type, status)
  VALUES (v_ag, v_copro, 2, 'R2 gate50', 'works', 'art25', 'pending') RETURNING id INTO v_res2;
  INSERT INTO public.ag_attendance (ag_id, copro_id, coproprietaire_id, lot_ids, presence_type, signed, represented_by_id, represented_by_name)
  VALUES (v_ag, v_copro, v_cp1, ARRAY[v_lots[1]::uuid], 'present', true, NULL, NULL),
         (v_ag, v_copro, v_cp2, ARRAY[v_lots[2]::uuid], 'proxy', false, v_cp1, 'Mandataire G50'),
         (v_ag, v_copro, v_cp3, ARRAY[v_lots[3]::uuid], 'correspondence', false, NULL, NULL);

  -- (5) v_ag_attendance_summary : nom résolu, lot_refs non vides, tantièmes trigger
  SELECT lot_refs, tantiemes INTO v_arr, v_w
  FROM public.v_ag_attendance_summary WHERE ag_id = v_ag AND coproprietaire_id = v_cp1;
  IF coalesce(array_length(v_arr,1),0) <> 1 OR v_arr[1] IS NULL THEN
    RAISE EXCEPTION 'ASSERT FAIL : lot_refs % (attendu 1 ref de lot)', v_arr;
  END IF;
  SELECT count(*) INTO v_n FROM public.v_ag_attendance_summary
   WHERE ag_id = v_ag AND ag_title = 'AG Gate 50' AND owner_name IS NOT NULL AND owner_name <> ''
     AND tantiemes > 0;
  IF v_n <> 3 THEN RAISE EXCEPTION 'ASSERT FAIL : v_ag_attendance_summary % lignes valides (attendu 3)', v_n; END IF;

  -- (6) v_ag_votes_detailed : vote de cp1 (présent) sur R1
  INSERT INTO public.ag_votes (resolution_id, copro_id, coproprietaire_id, vote, tantiemes, vote_source)
  VALUES (v_res1, v_copro, v_cp1, 'for', 100, 'live') RETURNING id INTO v_vote1;
  SELECT count(*) INTO v_n FROM public.v_ag_votes_detailed
   WHERE vote_id = v_vote1 AND ag_id = v_ag AND resolution_number = 1
     AND resolution_title = 'R1 gate50' AND vote = 'for' AND vote_source = 'live'
     AND voter_name IS NOT NULL AND majority_type = 'art24';
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : v_ag_votes_detailed (vote cp1/R1)'; END IF;

  -- (7) v_ag_drafts_progress : compteurs + drapeaux + ratio 3/7 + activité drafts
  INSERT INTO public.ag_session_drafts (ag_id, copro_id, user_id, draft_type, draft_data)
  VALUES (v_ag, v_copro, v_user_a, 'roles', '{"x":1}'::jsonb);
  SELECT count(*) INTO v_n FROM public.v_ag_drafts_progress
   WHERE ag_id = v_ag AND status = 'draft'
     AND resolutions_count = 2 AND votes_count = 1 AND attendance_count = 3
     AND has_resolutions = true AND has_votes = true AND has_attendance = true
     AND completion_ratio = 43
     AND last_activity_at >= (SELECT max(last_modified_at) FROM public.ag_session_drafts WHERE ag_id = v_ag);
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : v_ag_drafts_progress (compteurs/ratio/activité)'; END IF;

  -- (8) v_ag_correspondence_status : 2 fiches (validated + integrated), 2 détails dont 1 intégré
  INSERT INTO public.ag_correspondence_votes (ag_id, copro_id, coproprietaire_id, status, reception_method, received_at)
  VALUES (v_ag, v_copro, v_cp2, 'validated', 'email', now()) RETURNING id INTO v_form1;
  INSERT INTO public.ag_correspondence_votes (ag_id, copro_id, coproprietaire_id, status, reception_method, received_at, integrated_at)
  VALUES (v_ag, v_copro, v_cp3, 'integrated', 'postal', now(), now()) RETURNING id INTO v_form2;
  INSERT INTO public.ag_correspondence_vote_details (correspondence_form_id, resolution_id, copro_id, coproprietaire_id, vote)
  VALUES (v_form1, v_res1, v_copro, v_cp2, 'against');
  INSERT INTO public.ag_correspondence_vote_details (correspondence_form_id, resolution_id, copro_id, coproprietaire_id, vote, integrated_vote_id, integrated_at)
  VALUES (v_form2, v_res1, v_copro, v_cp3, 'for', v_vote1, now());

  SELECT correspondence_tantiemes INTO v_w FROM public.v_ag_correspondence_status WHERE ag_id = v_ag;
  SELECT count(*) INTO v_n FROM public.v_ag_correspondence_status
   WHERE ag_id = v_ag AND forms_received = 2 AND forms_validated = 2 AND forms_integrated = 1
     AND vote_details_count = 2 AND votes_integrated = 1
     AND correspondence_tantiemes = (SELECT tantiemes FROM public.ag_attendance
                                      WHERE ag_id = v_ag AND coproprietaire_id = v_cp3)
     AND total_tantiemes = v_total
     AND correspondence_ratio = round(v_w / v_total * 100, 2);
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : v_ag_correspondence_status (compteurs/tantièmes)'; END IF;

  -- (9) register_ag_document : versionnage 1 puis 2, visible dans v_ag_documents
  v_doc1 := public.register_ag_document(v_copro, v_ag, 'convocation', 'ged/x/1.pdf', 'Convocation.pdf', 1234, '{"a":1}'::jsonb);
  v_doc2 := public.register_ag_document(v_copro, v_ag, 'convocation', 'ged/x/2.pdf', 'Convocation.pdf', 2345, '{"a":2}'::jsonb);
  IF (v_doc1->>'version')::int <> 1 OR (v_doc2->>'version')::int <> 2 THEN
    RAISE EXCEPTION 'ASSERT FAIL : versions register_ag_document % / %', v_doc1, v_doc2;
  END IF;
  SELECT count(*) INTO v_n FROM public.v_ag_documents
   WHERE ag_id = v_ag AND doc_type = 'convocation' AND ag_title = 'AG Gate 50'
     AND version IN (1,2) AND storage_path LIKE 'ged/x/%';
  IF v_n <> 2 THEN RAISE EXCEPTION 'ASSERT FAIL : v_ag_documents % lignes (attendu 2)', v_n; END IF;
  -- Négatif : copro incohérente refusée
  BEGIN
    PERFORM public.register_ag_document(gen_random_uuid(), v_ag, 'pv', 'p', 'f', NULL, NULL);
    RAISE EXCEPTION 'ASSERT FAIL : register_ag_document accepte une copro incohérente';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'ASSERT FAIL%' THEN RAISE; END IF;
  END;

  -- (10) v_ag_notification_stats : 3 notifications (queued/sent/bounced), type par défaut
  INSERT INTO public.ag_notifications (ag_id, copro_id, coproprietaire_id, channel, status)
  VALUES (v_ag, v_copro, v_cp1, 'email', 'queued'),
         (v_ag, v_copro, v_cp2, 'email', 'sent'),
         (v_ag, v_copro, v_cp3, 'email', 'bounced');
  SELECT count(*) INTO v_n FROM public.v_ag_notification_stats
   WHERE ag_id = v_ag AND notification_type = 'convocation'
     AND total_count = 3 AND pending_count = 1 AND sent_count = 1 AND bounced_count = 1
     AND delivered_count = 0 AND opened_count = 0 AND failed_count = 0;
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : v_ag_notification_stats agrégats'; END IF;

  -- (11) delete_ag_draft : refuse une AG convoquée, supprime un brouillon (cascade)
  INSERT INTO public.ag_meetings (copro_id, title, meeting_type, meeting_date, status)
  VALUES (v_copro, 'AG convoquée G50', 'ordinary', current_date + 60, 'convoked')
  RETURNING id INTO v_ag2;
  v_json := public.delete_ag_draft(v_ag2);
  IF (v_json->>'success')::boolean IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'ASSERT FAIL : delete_ag_draft a accepté une AG convoquée : %', v_json;
  END IF;
  v_json := public.delete_ag_draft(v_ag);
  IF (v_json->>'success')::boolean IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'ASSERT FAIL : delete_ag_draft a refusé un brouillon : %', v_json;
  END IF;
  SELECT count(*) INTO v_n FROM public.ag_meetings WHERE id = v_ag;
  IF v_n <> 0 THEN RAISE EXCEPTION 'ASSERT FAIL : brouillon non supprimé'; END IF;
  SELECT count(*) INTO v_n FROM public.ag_documents WHERE ag_id = v_ag;
  IF v_n <> 0 THEN RAISE EXCEPTION 'ASSERT FAIL : ag_documents non cascadés'; END IF;
  SELECT count(*) INTO v_n FROM public.ag_session_drafts WHERE ag_id = v_ag;
  IF v_n <> 0 THEN RAISE EXCEPTION 'ASSERT FAIL : ag_session_drafts non cascadés'; END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
