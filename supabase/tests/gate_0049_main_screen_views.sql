-- Gate 0049 : vues écrans principaux (AG / mur / conversations / événements)
-- + rename v_dashboard_kpis.critical_unpaid_count -> unpaid_lots_count.
-- Méthode 0047 durcie : contrat de colonnes STRICT (égalité d'ensembles), chaque
-- dérivation assertée en VALEUR (compteurs, tantièmes, quorum, rôles, triggers
-- 0032), tests NÉGATIFS (ancienne colonne absente, membre exclu d'other_members),
-- et bascule de claims pour prouver les colonnes contextuelles auth.uid()
-- (is_liked_by_me, my_unread_count). Auto-rollback (ROLLBACK_TEST_OK).
DO $$
DECLARE
  v_copro uuid; v_ag uuid; v_post uuid; v_conv uuid; v_ev_past uuid; v_ev_today uuid;
  v_user_a uuid := gen_random_uuid();  -- gestionnaire
  v_user_b uuid := gen_random_uuid();  -- copropriétaire
  v_cp1 uuid; v_cp2 uuid; v_cp3 uuid; v_lot uuid;
  v_n int; v_num numeric; v_total numeric; v_txt text; v_bool boolean;
  v_arr text[]; v_members jsonb[]; v_claims text;
BEGIN
  -- (1) Les 4 vues existent en security_invoker
  SELECT count(*) INTO v_n
  FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
  WHERE ns.nspname = 'public' AND c.relkind = 'v'
    AND c.relname IN ('v_ag_overview','v_wall_feed','v_conversations_overview','v_events_overview')
    AND coalesce((SELECT bool_or(opt ILIKE 'security_invoker%true%') FROM unnest(c.reloptions) opt), false);
  IF v_n <> 4 THEN RAISE EXCEPTION 'ASSERT FAIL : vues security_invoker %/4', v_n; END IF;

  -- (2) Contrat de colonnes STRICT (égalité, pas inclusion) — compat front 5c8209e
  SELECT array_agg(column_name::text ORDER BY column_name) INTO v_arr
    FROM information_schema.columns WHERE table_schema='public' AND table_name='v_ag_overview';
  IF v_arr IS DISTINCT FROM ARRAY['approved_count','attendees_count','convocation_date',
    'convocation_deadline','copro_id','copro_name','correspondence_count','created_at',
    'created_by','created_by_name','current_step','id','location','max_step_reached',
    'meeting_date','meeting_type','present_count','present_tantiemes','president_name',
    'proxy_count','quorum_ratio','rejected_count','resolutions_count','secretary_name',
    'status','title','total_tantiemes'] THEN
    RAISE EXCEPTION 'ASSERT FAIL : contrat v_ag_overview : %', v_arr;
  END IF;
  SELECT array_agg(column_name::text ORDER BY column_name) INTO v_arr
    FROM information_schema.columns WHERE table_schema='public' AND table_name='v_wall_feed';
  IF v_arr IS DISTINCT FROM ARRAY['attachment_id','author_avatar','author_id','author_name',
    'author_role','category','comments_count','content','copro_id','created_at','id',
    'is_liked_by_me','is_pinned','likes_count','pinned_at','title','updated_at','visibility'] THEN
    RAISE EXCEPTION 'ASSERT FAIL : contrat v_wall_feed : %', v_arr;
  END IF;
  SELECT array_agg(column_name::text ORDER BY column_name) INTO v_arr
    FROM information_schema.columns WHERE table_schema='public' AND table_name='v_conversations_overview';
  IF v_arr IS DISTINCT FROM ARRAY['copro_id','created_at','created_by','id','is_archived',
    'is_group','last_message_at','last_message_preview','my_last_read_at','my_unread_count',
    'other_members','subject'] THEN
    RAISE EXCEPTION 'ASSERT FAIL : contrat v_conversations_overview : %', v_arr;
  END IF;
  SELECT array_agg(column_name::text ORDER BY column_name) INTO v_arr
    FROM information_schema.columns WHERE table_schema='public' AND table_name='v_events_overview';
  IF v_arr IS DISTINCT FROM ARRAY['all_day','copro_id','created_at','created_by','creator_name',
    'description','ends_at','event_type','id','is_past','is_today','linked_ag_id',
    'linked_service_order_id','location','starts_at','title','visibility'] THEN
    RAISE EXCEPTION 'ASSERT FAIL : contrat v_events_overview : %', v_arr;
  END IF;

  -- (3) Rename KPI : unpaid_lots_count présent, critical_unpaid_count ABSENT (négatif)
  SELECT count(*) INTO v_n FROM information_schema.columns
   WHERE table_schema='public' AND table_name='v_dashboard_kpis' AND column_name='unpaid_lots_count';
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : v_dashboard_kpis.unpaid_lots_count absent'; END IF;
  SELECT count(*) INTO v_n FROM information_schema.columns
   WHERE table_schema='public' AND table_name='v_dashboard_kpis' AND column_name='critical_unpaid_count';
  IF v_n <> 0 THEN RAISE EXCEPTION 'ASSERT FAIL : critical_unpaid_count encore exposé'; END IF;

  -- (4) Harnais : copro seedée (clé générale + coproprietaires + lots) + 2 utilisateurs
  v_copro := create_clean_test_copro_seeded('g49');
  INSERT INTO auth.users (id, email) VALUES (v_user_a, 'a49.'||substr(v_user_a::text,1,8)||'@test.fr');
  INSERT INTO auth.users (id, email) VALUES (v_user_b, 'b49.'||substr(v_user_b::text,1,8)||'@test.fr');
  UPDATE public.profiles SET full_name = 'Gestionnaire Gate' WHERE id = v_user_a;
  UPDATE public.profiles SET full_name = 'Copro Gate'        WHERE id = v_user_b;
  INSERT INTO public.memberships (user_id, copro_id, role) VALUES (v_user_a, v_copro, 'gestionnaire');
  INSERT INTO public.memberships (user_id, copro_id, role) VALUES (v_user_b, v_copro, 'coproprietaire');

  -- (5) v_ag_overview : compteurs, tantièmes et quorum en VALEUR
  INSERT INTO public.ag_meetings (copro_id, title, meeting_type, meeting_date, status,
                                  location, president_name, secretary_name, created_by)
  VALUES (v_copro, 'AG Gate 49', 'ordinary', current_date + 30, 'convoked',
          'Salle Gate', 'Pres G', 'Sec G', v_user_a)
  RETURNING id INTO v_ag;
  INSERT INTO public.ag_resolutions (ag_id, copro_id, resolution_number, title, resolution_type, majority_type, status)
  VALUES (v_ag, v_copro, 1, 'R1', 'budget', 'art24', 'approved'),
         (v_ag, v_copro, 2, 'R2', 'works',  'art25', 'rejected'),
         (v_ag, v_copro, 3, 'R3', 'other',  'art24', 'pending');

  SELECT id INTO v_cp1 FROM public.coproprietaires WHERE copro_id = v_copro ORDER BY created_at LIMIT 1;
  SELECT id INTO v_cp2 FROM public.coproprietaires WHERE copro_id = v_copro ORDER BY created_at OFFSET 1 LIMIT 1;
  SELECT id INTO v_cp3 FROM public.coproprietaires WHERE copro_id = v_copro ORDER BY created_at OFFSET 2 LIMIT 1;
  IF v_cp3 IS NULL THEN
    RAISE EXCEPTION 'SETUP FAIL : copro harnais sans 3 coproprietaires (seed boucle d''or attendu)';
  END IF;

  -- 3 lots DISTINCTS pris dans la clé générale active : le trigger
  -- tr_ag_attendance_tantiemes ÉCRASE tantiemes avec la somme des poids de
  -- lot_ids — on fournit donc les lots et on recalcule l'attendu depuis la clé.
  SELECT array_agg(lot_id ORDER BY weight DESC), sum(weight) INTO v_arr, v_num FROM (
    SELECT rkl.lot_id::text AS lot_id, rkl.weight
    FROM public.repartition_keys rk
    JOIN public.repartition_key_lines rkl ON rkl.key_id = rk.id
    WHERE rk.copro_id = v_copro AND rk.category = 'general' AND rk.is_active = true
    ORDER BY rkl.weight DESC LIMIT 3
  ) s;
  IF coalesce(array_length(v_arr, 1), 0) <> 3 OR v_num <= 0 THEN
    RAISE EXCEPTION 'SETUP FAIL : clé générale sans 3 lignes de lots pondérées';
  END IF;
  INSERT INTO public.ag_attendance (ag_id, copro_id, coproprietaire_id, lot_ids, presence_type, signed, represented_by_id, represented_by_name)
  VALUES (v_ag, v_copro, v_cp1, ARRAY[v_arr[1]::uuid], 'present', true, NULL, NULL),
         (v_ag, v_copro, v_cp2, ARRAY[v_arr[2]::uuid], 'proxy', false, v_cp1, 'Pres G'),
         (v_ag, v_copro, v_cp3, ARRAY[v_arr[3]::uuid], 'correspondence', false, NULL, NULL);

  SELECT coalesce(sum(rkl.weight), 0) INTO v_total
  FROM public.repartition_keys rk
  JOIN public.repartition_key_lines rkl ON rkl.key_id = rk.id
  WHERE rk.copro_id = v_copro AND rk.category = 'general' AND rk.is_active = true;
  IF v_total <= 0 THEN RAISE EXCEPTION 'SETUP FAIL : clé générale active sans tantièmes'; END IF;

  SELECT count(*) INTO v_n FROM public.v_ag_overview
   WHERE id = v_ag AND copro_name IS NOT NULL AND title = 'AG Gate 49'
     AND created_by_name = 'Gestionnaire Gate'
     AND president_name = 'Pres G' AND secretary_name = 'Sec G'
     AND resolutions_count = 3 AND approved_count = 1 AND rejected_count = 1
     AND attendees_count = 3 AND present_count = 1 AND proxy_count = 1
     AND correspondence_count = 1 AND present_tantiemes = v_num
     AND total_tantiemes = v_total
     AND quorum_ratio = round(v_num / v_total * 100, 2)
     AND convocation_deadline = (meeting_date - interval '21 days');
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : v_ag_overview valeurs (AG %)', v_ag; END IF;

  -- (6) v_wall_feed : rôle dérivé, compteurs triggers 0032, is_liked_by_me contextuel
  INSERT INTO public.wall_posts (copro_id, author_id, title, content, category, visibility)
  VALUES (v_copro, v_user_a, 'Post Gate', 'Contenu gate', 'information', 'all_members')
  RETURNING id INTO v_post;
  INSERT INTO public.wall_likes (copro_id, post_id, user_id) VALUES (v_copro, v_post, v_user_b);
  INSERT INTO public.wall_comments (copro_id, post_id, author_id, content)
  VALUES (v_copro, v_post, v_user_b, 'Commentaire gate');

  SELECT count(*) INTO v_n FROM public.v_wall_feed
   WHERE id = v_post AND author_name = 'Gestionnaire Gate' AND author_role = 'syndic'
     AND likes_count = 1 AND comments_count = 1 AND is_liked_by_me = false;
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : v_wall_feed (rôle/compteurs/like service)'; END IF;

  v_claims := current_setting('request.jwt.claims', true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('role','authenticated','sub',v_user_b)::text, true);
  SELECT is_liked_by_me INTO v_bool FROM public.v_wall_feed WHERE id = v_post;
  IF v_bool IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'ASSERT FAIL : is_liked_by_me attendu true sous claims user_b';
  END IF;

  -- (7) v_conversations_overview : my_* et other_members sous claims user_b
  --     (claims user_b toujours actifs). Le message de A déclenche le trigger
  --     update_conversation_last_message (0032) : preview + unread_count de B.
  INSERT INTO public.conversations (copro_id, subject, is_group, created_by)
  VALUES (v_copro, 'Conv Gate', false, v_user_a)
  RETURNING id INTO v_conv;
  INSERT INTO public.conversation_members (copro_id, conversation_id, user_id)
  VALUES (v_copro, v_conv, v_user_a), (v_copro, v_conv, v_user_b);
  INSERT INTO public.messages (copro_id, conversation_id, author_id, content, message_type)
  VALUES (v_copro, v_conv, v_user_a, 'Bonjour gate', 'text');

  SELECT my_unread_count, other_members INTO v_n, v_members
    FROM public.v_conversations_overview WHERE id = v_conv;
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : my_unread_count % (attendu 1, trigger 0032)', v_n; END IF;
  IF coalesce(array_length(v_members, 1), 0) <> 1
     OR (v_members[1]->>'user_id')::uuid IS DISTINCT FROM v_user_a
     OR v_members[1]->>'full_name' IS DISTINCT FROM 'Gestionnaire Gate' THEN
    RAISE EXCEPTION 'ASSERT FAIL : other_members % (attendu [user_a seul])', v_members;
  END IF;
  SELECT count(*) INTO v_n FROM public.v_conversations_overview
   WHERE id = v_conv AND last_message_preview IS NOT NULL AND last_message_at IS NOT NULL;
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : last_message_* non posés par le trigger'; END IF;
  PERFORM set_config('request.jwt.claims', v_claims, true);

  -- (8) v_events_overview : is_past / is_today en valeur, creator_name résolu
  INSERT INTO public.events (copro_id, title, event_type, starts_at, ends_at, all_day, visibility, created_by)
  VALUES (v_copro, 'Event passé', 'autre', now() - interval '2 days', now() - interval '47 hours',
          false, 'all_members', v_user_a)
  RETURNING id INTO v_ev_past;
  -- starts_at = now() EXACTEMENT : now() est figé par transaction -> is_today
  -- (starts_at::date = current_date) et is_past (starts_at < now() = false) sont
  -- stables même entre 23h et minuit UTC (now()+1h franchissait minuit -> flaky).
  INSERT INTO public.events (copro_id, title, event_type, starts_at, all_day, visibility, created_by)
  VALUES (v_copro, 'Event du jour', 'reunion_cs', now(), false, 'all_members', v_user_a)
  RETURNING id INTO v_ev_today;

  SELECT count(*) INTO v_n FROM public.v_events_overview
   WHERE id = v_ev_past AND is_past = true AND is_today = false AND creator_name = 'Gestionnaire Gate';
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : v_events_overview event passé'; END IF;
  SELECT count(*) INTO v_n FROM public.v_events_overview
   WHERE id = v_ev_today AND is_today = true AND is_past = false;
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : v_events_overview event du jour'; END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
