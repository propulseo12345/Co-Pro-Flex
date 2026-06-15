-- Gate 0063 : choix d'envoi AG (brouillon ag_meetings.envoi_choices).
-- Prouve :
--   (1) save stocke le brouillon, get le relit (format SendingChoice du front) ;
--   (2) CRITIQUE — save_ag_envoi_choices NE TOUCHE JAMAIS ag_envoi_tracking :
--       une trace d'envoi LÉGALE pré-existante (canal recommandé, status='queued',
--       sent_at non nul) SURVIT intacte à save ET à re-save (preuve d'expédition
--       non perdue — c'était le bug attrapé en revue adversariale) ;
--   (3) anti-injection : copropriétaire d'une autre copro rejeté ;
--   (4) AG inexistante rejetée (get & save) ;
--   (5) re-save remplace le brouillon ; (6) anti-vacuité (choix relus).
-- Le runner pose le contexte service_role (pas de SET ROLE authenticated).
-- Auto-rollback via RAISE EXCEPTION 'ROLLBACK_TEST_OK'.
DO $$
DECLARE
  v_copro uuid; v_ag uuid;
  v_cop1 uuid; v_cop_other uuid; v_copro2 uuid;
  v_choices jsonb; v_got jsonb; v_n int; v_trace uuid;
BEGIN
  v_copro := create_clean_test_copro('g63');
  INSERT INTO public.ag_meetings (copro_id, title, meeting_type, meeting_date, status)
  VALUES (v_copro, 'AG G63', 'ordinary', current_date + 30, 'draft') RETURNING id INTO v_ag;
  INSERT INTO public.coproprietaires (id, copro_id, is_company, first_name, last_name)
  VALUES (gen_random_uuid(), v_copro, false, 'Anne', 'Choix') RETURNING id INTO v_cop1;

  -- (2 setup) TRACE d'envoi LÉGALE déjà expédiée, en status 'queued' (cas réel
  -- des canaux recommandés ecrits par le dispatch) : doit etre INTOUCHABLE.
  INSERT INTO public.ag_envoi_tracking (ag_id, coproprietaire_id, method, status, sent_at)
  VALUES (v_ag, v_cop1, 'registered_postal', 'queued', now()) RETURNING id INTO v_trace;

  -- (1) save un choix multi-canal (recommande + email)
  v_choices := jsonb_build_array(jsonb_build_object(
    'coproprietaireId', v_cop1, 'methods', jsonb_build_array('RECOMMANDE','EMAIL')));
  PERFORM public.save_ag_envoi_choices(v_ag, v_choices);

  -- get relit le brouillon
  v_got := public.get_ag_envoi_choices(v_ag);
  IF jsonb_array_length(v_got) <> 1 THEN
    RAISE EXCEPTION 'ASSERT FAIL : get attend 1 choix, obtenu %', jsonb_array_length(v_got);
  END IF;
  IF (v_got -> 0 ->> 'coproprietaireId') <> v_cop1::text THEN
    RAISE EXCEPTION 'ASSERT FAIL : coproprietaireId non relu (%)', v_got;
  END IF;
  IF NOT (v_got -> 0 -> 'methods' @> '["RECOMMANDE"]'::jsonb
          AND v_got -> 0 -> 'methods' @> '["EMAIL"]'::jsonb) THEN
    RAISE EXCEPTION 'ASSERT FAIL : methods non relues (%)', v_got -> 0 -> 'methods';
  END IF;

  -- (2) CRITIQUE : la trace d'envoi légale est INTACTE (non purgée par save_choices)
  SELECT count(*) INTO v_n FROM public.ag_envoi_tracking
   WHERE id = v_trace AND status = 'queued' AND sent_at IS NOT NULL
     AND method = 'registered_postal';
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'ASSERT FAIL : trace d''envoi legale alteree/purgee par save_choices (preuve perdue)';
  END IF;

  -- (5) re-save (remplacement) : methods réduites à LETTRE_SIMPLE
  PERFORM public.save_ag_envoi_choices(v_ag, jsonb_build_array(jsonb_build_object(
    'coproprietaireId', v_cop1, 'methods', jsonb_build_array('LETTRE_SIMPLE'))));
  v_got := public.get_ag_envoi_choices(v_ag);
  IF NOT (v_got -> 0 -> 'methods' @> '["LETTRE_SIMPLE"]'::jsonb)
     OR (v_got -> 0 -> 'methods' @> '["RECOMMANDE"]'::jsonb) THEN
    RAISE EXCEPTION 'ASSERT FAIL : re-save n''a pas remplace le brouillon (%)', v_got;
  END IF;
  -- la trace est TOUJOURS intacte après re-save
  SELECT count(*) INTO v_n FROM public.ag_envoi_tracking WHERE id = v_trace;
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : trace perdue apres re-save'; END IF;

  -- (3) anti-injection : copropriétaire d'une AUTRE copro rejeté (23503)
  v_copro2 := create_clean_test_copro('g63b');
  INSERT INTO public.coproprietaires (id, copro_id, is_company, first_name, last_name)
  VALUES (gen_random_uuid(), v_copro2, false, 'Etranger', 'X') RETURNING id INTO v_cop_other;
  BEGIN
    PERFORM public.save_ag_envoi_choices(v_ag, jsonb_build_array(jsonb_build_object(
      'coproprietaireId', v_cop_other, 'methods', jsonb_build_array('EMAIL'))));
    RAISE EXCEPTION 'ASSERT FAIL : copropriétaire etranger accepte';
  EXCEPTION WHEN sqlstate '23503' THEN NULL;
  END;

  -- (4) AG inexistante rejetée (get & save)
  BEGIN
    PERFORM public.get_ag_envoi_choices(gen_random_uuid());
    RAISE EXCEPTION 'ASSERT FAIL : get AG inexistante accepte';
  EXCEPTION WHEN sqlstate '23503' THEN NULL;
  END;
  BEGIN
    PERFORM public.save_ag_envoi_choices(gen_random_uuid(), '[]'::jsonb);
    RAISE EXCEPTION 'ASSERT FAIL : save AG inexistante accepte';
  EXCEPTION WHEN sqlstate '23503' THEN NULL;
  END;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
