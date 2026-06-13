-- Gate 0055 : sélection des copros éligibles aux relances automatiques.
-- Le déclenchement HTTP (pg_net → edge → Resend) est cloud-only (GUC absents en
-- local → run_daily_payment_reminders est no-op) ; ici on prouve la LOGIQUE de
-- sélection : règle active email → inclus ; pause active → exclu ; sans règle →
-- exclu ; + no-op de l'orchestrateur sans GUC. Auto-rollback (ROLLBACK_TEST_OK).
DO $$
DECLARE
  v_copro_ok uuid; v_copro_pause uuid; v_copro_norule uuid;
  v_rule_tpl uuid; v_n int;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);

  -- (1) extensions + objets présents
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE EXCEPTION 'ASSERT FAIL : pg_cron non installée'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE EXCEPTION 'ASSERT FAIL : pg_net non installée'; END IF;
  IF to_regprocedure('public.copros_due_for_reminders()') IS NULL
     OR to_regprocedure('public.run_daily_payment_reminders()') IS NULL THEN
    RAISE EXCEPTION 'ASSERT FAIL : fonctions relances absentes'; END IF;

  -- (2) job cron planifié
  SELECT count(*) INTO v_n FROM cron.job WHERE jobname = 'daily-payment-reminders';
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : job cron daily-payment-reminders absent (%)', v_n; END IF;

  -- (3) Harnais : 3 copros légères
  v_copro_ok     := create_clean_test_copro('g55-ok');
  v_copro_pause  := create_clean_test_copro('g55-pause');
  v_copro_norule := create_clean_test_copro('g55-norule');

  -- copro OK : 1 règle active email (les copros seedées ont des règles par défaut ?
  -- on en pose une explicitement pour ne dépendre d'aucun seed)
  INSERT INTO public.payment_reminder_rules (copro_id, delay_days, channel, is_active)
  VALUES (v_copro_ok, 15, 'email', true);

  -- copro PAUSE : 1 règle active MAIS en pause active
  INSERT INTO public.payment_reminder_rules (copro_id, delay_days, channel, is_active)
  VALUES (v_copro_pause, 15, 'email', true);
  INSERT INTO public.reminder_settings (copro_id, is_paused, paused_until)
  VALUES (v_copro_pause, true, now() + interval '30 days')
  ON CONFLICT (copro_id) DO UPDATE SET is_paused = true, paused_until = now() + interval '30 days';

  -- copro NORULE : AUCUNE règle active (create_clean_test_copro pose des règles
  -- email par défaut → on les désactive toutes pour tester ce cas).
  UPDATE public.payment_reminder_rules SET is_active = false WHERE copro_id = v_copro_norule;

  -- (4) Sélection : OK présent, PAUSE absent, NORULE absent
  IF NOT EXISTS (SELECT 1 FROM public.copros_due_for_reminders() c WHERE c = v_copro_ok) THEN
    RAISE EXCEPTION 'ASSERT FAIL : copro avec règle active non sélectionnée'; END IF;
  IF EXISTS (SELECT 1 FROM public.copros_due_for_reminders() c WHERE c = v_copro_pause) THEN
    RAISE EXCEPTION 'ASSERT FAIL : copro EN PAUSE sélectionnée'; END IF;
  IF EXISTS (SELECT 1 FROM public.copros_due_for_reminders() c WHERE c = v_copro_norule) THEN
    RAISE EXCEPTION 'ASSERT FAIL : copro sans règle active sélectionnée'; END IF;

  -- pause expirée → redevient éligible
  UPDATE public.reminder_settings SET paused_until = now() - interval '1 day'
   WHERE copro_id = v_copro_pause;
  IF NOT EXISTS (SELECT 1 FROM public.copros_due_for_reminders() c WHERE c = v_copro_pause) THEN
    RAISE EXCEPTION 'ASSERT FAIL : copro pause EXPIRÉE non re-sélectionnée'; END IF;

  -- (5) Orchestrateur sans GUC = no-op (pas d'exception, pas d'appel HTTP)
  PERFORM public.run_daily_payment_reminders();

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
