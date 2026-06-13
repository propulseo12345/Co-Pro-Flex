-- Gate 0051 : v_conversations_overview + is_archived & câblage mark_conversation_read.
-- Méthode 0049 : contrat de colonnes STRICT (égalité d'ensembles), valeurs prouvées
-- sous claims utilisateur (my_unread_count via trigger 0032, reset via RPC),
-- test NÉGATIF (RPC refusée à un non-membre, 42501), passthrough is_archived.
-- Auto-rollback (ROLLBACK_TEST_OK).
DO $$
DECLARE
  v_copro uuid; v_conv uuid;
  v_user_a uuid := gen_random_uuid();  -- gestionnaire (auteur du message)
  v_user_b uuid := gen_random_uuid();  -- copropriétaire (lecteur)
  v_user_c uuid := gen_random_uuid();  -- intrus (non membre de la conversation)
  v_n int; v_arr text[]; v_claims text; v_bool boolean; v_ts timestamptz;
BEGIN
  -- (1) Contrat de colonnes STRICT — 0049 + is_archived
  SELECT array_agg(column_name::text ORDER BY column_name) INTO v_arr
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='v_conversations_overview';
  IF v_arr IS DISTINCT FROM ARRAY['copro_id','created_at','created_by','id','is_archived',
    'is_group','last_message_at','last_message_preview','my_last_read_at','my_unread_count',
    'other_members','subject'] THEN
    RAISE EXCEPTION 'ASSERT FAIL : contrat v_conversations_overview : %', v_arr;
  END IF;

  -- (2) security_invoker préservé par le CREATE OR REPLACE
  SELECT coalesce((SELECT bool_or(opt ILIKE 'security_invoker%true%') FROM unnest(c.reloptions) opt), false)
    INTO v_bool
  FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
  WHERE ns.nspname='public' AND c.relname='v_conversations_overview' AND c.relkind='v';
  IF v_bool IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'ASSERT FAIL : v_conversations_overview sans security_invoker';
  END IF;

  -- (3) Harnais : copro jetable + 2 membres + 1 intrus
  v_copro := create_clean_test_copro('g51');
  INSERT INTO auth.users (id, email) VALUES (v_user_a, 'a51.'||substr(v_user_a::text,1,8)||'@test.fr');
  INSERT INTO auth.users (id, email) VALUES (v_user_b, 'b51.'||substr(v_user_b::text,1,8)||'@test.fr');
  INSERT INTO auth.users (id, email) VALUES (v_user_c, 'c51.'||substr(v_user_c::text,1,8)||'@test.fr');
  UPDATE public.profiles SET full_name = 'Gestionnaire G51' WHERE id = v_user_a;
  UPDATE public.profiles SET full_name = 'Copro G51'        WHERE id = v_user_b;
  INSERT INTO public.memberships (user_id, copro_id, role)
  VALUES (v_user_a, v_copro, 'gestionnaire'),
         (v_user_b, v_copro, 'coproprietaire'),
         (v_user_c, v_copro, 'coproprietaire');

  INSERT INTO public.conversations (copro_id, subject, is_group, created_by)
  VALUES (v_copro, 'Conv Gate 51', false, v_user_a)
  RETURNING id INTO v_conv;
  INSERT INTO public.conversation_members (copro_id, conversation_id, user_id)
  VALUES (v_copro, v_conv, v_user_a), (v_copro, v_conv, v_user_b);
  INSERT INTO public.messages (copro_id, conversation_id, author_id, content, message_type)
  VALUES (v_copro, v_conv, v_user_a, 'Ping gate 51', 'text');

  -- (4) Sous claims B : non archivée, 1 non-lu (trigger 0032), pas encore de last_read
  v_claims := current_setting('request.jwt.claims', true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('role','authenticated','sub',v_user_b)::text, true);

  SELECT count(*) INTO v_n FROM public.v_conversations_overview
   WHERE id = v_conv AND is_archived = false AND my_unread_count = 1;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'ASSERT FAIL : état initial attendu (is_archived=false, my_unread_count=1)';
  END IF;

  -- (5) mark_conversation_read en tant que B → unread 0, last_read posé, read_by complété
  PERFORM public.mark_conversation_read(v_conv);
  SELECT my_unread_count, my_last_read_at INTO v_n, v_ts
    FROM public.v_conversations_overview WHERE id = v_conv;
  IF v_n <> 0 OR v_ts IS NULL THEN
    RAISE EXCEPTION 'ASSERT FAIL : mark_conversation_read (unread=%, last_read=%)', v_n, v_ts;
  END IF;
  SELECT count(*) INTO v_n FROM public.messages
   WHERE conversation_id = v_conv AND v_user_b = ANY(read_by);
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : read_by non complété par la RPC'; END IF;

  -- (6) NÉGATIF : un non-membre de la conversation est refusé (42501)
  PERFORM set_config('request.jwt.claims',
    json_build_object('role','authenticated','sub',v_user_c)::text, true);
  BEGIN
    PERFORM public.mark_conversation_read(v_conv);
    RAISE EXCEPTION 'ASSERT FAIL : mark_conversation_read aurait dû refuser un non-membre';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;  -- refus attendu
  END;

  -- (7) Passthrough is_archived : archivage reflété par la vue (sous claims B)
  PERFORM set_config('request.jwt.claims', v_claims, true);
  UPDATE public.conversations SET is_archived = true WHERE id = v_conv;
  PERFORM set_config('request.jwt.claims',
    json_build_object('role','authenticated','sub',v_user_b)::text, true);
  SELECT is_archived INTO v_bool FROM public.v_conversations_overview WHERE id = v_conv;
  IF v_bool IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'ASSERT FAIL : is_archived non reflété par la vue';
  END IF;
  PERFORM set_config('request.jwt.claims', v_claims, true);

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
