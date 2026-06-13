-- ============================================================================
-- 0055 — Relances impayés AUTOMATIQUES (pg_cron) — décision Lyes 2026-06-13
-- ----------------------------------------------------------------------------
-- Le moteur de relances existe (règles J+15/30/60/90, edge run_payment_reminders
-- qui génère les relances dues à la volée + envoie via Resend + trace) mais AUCUN
-- déclencheur : promesse produit non tenue (audit 2026-06-12, HIGH avant J7).
-- L'edge prend UN copro_id ; on ajoute le wrapper multi-copros + la planification.
--
-- ARCHITECTURE :
--   1. copros_due_for_reminders()  — SQL pur, TESTABLE : copros à traiter
--      (≥1 règle active email ET pas en pause active).
--   2. run_daily_payment_reminders() — boucle sur (1) et POST vers l'edge par copro
--      (header x-cron-secret = chemin CRON de l'edge → service_role). URL + secret
--      lus dans des GUC posés EN CLOUD (app.reminders_edge_url / .cron_secret) ;
--      ABSENTS en local/CI → la fonction NO-OP proprement (pas d'appel HTTP).
--   3. cron.schedule — 1×/jour à 07:00 (UTC). Idempotent par nom (pg_cron ≥1.4).
--
-- TESTABILITÉ : le gate prouve (1) (sélection des copros). Le déclenchement HTTP
-- réel (pg_net → edge → Resend) se valide en J6 (cloud, secrets + edge déployée) :
-- en local/CI les GUC sont absents donc (2) ne fait aucun appel.
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ----------------------------------------------------------------------------
-- 1. Copros éligibles aux relances : au moins une règle email active ET pas en
--    pause active. (L'edge re-vérifie la pause ; on filtre ici pour ne pas
--    déclencher d'appel HTTP inutile.)
-- ----------------------------------------------------------------------------
create or replace function public.copros_due_for_reminders()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select r.copro_id
  from public.payment_reminder_rules r
  where r.is_active = true and r.channel = 'email'
    and not exists (
      select 1 from public.reminder_settings s
      where s.copro_id = r.copro_id
        and s.is_paused = true
        and (s.paused_until is null or s.paused_until >= now())
    )
  group by r.copro_id;
$$;
revoke execute on function public.copros_due_for_reminders() from public, anon;
grant  execute on function public.copros_due_for_reminders() to service_role;

-- ----------------------------------------------------------------------------
-- 2. Orchestrateur quotidien : déclenche l'edge run_payment_reminders pour chaque
--    copro éligible. NO-OP si les GUC cloud sont absents (local/CI).
-- ----------------------------------------------------------------------------
create or replace function public.run_daily_payment_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url    text := current_setting('app.reminders_edge_url', true);   -- posé en cloud
  v_secret text := current_setting('app.reminders_cron_secret', true);-- posé en cloud
  v_copro  uuid;
begin
  -- Sans configuration cloud (local/CI), on ne déclenche aucun appel HTTP.
  if v_url is null or v_url = '' or v_secret is null or v_secret = '' then
    raise notice 'run_daily_payment_reminders: GUC edge non configurés — no-op (local/CI)';
    return;
  end if;

  for v_copro in select public.copros_due_for_reminders() loop
    perform net.http_post(
      url     := v_url || '/run_payment_reminders',
      body    := jsonb_build_object('copro_id', v_copro, 'dry_run', false),
      headers := jsonb_build_object(
                   'Content-Type', 'application/json',
                   'x-cron-secret', v_secret
                 ),
      timeout_milliseconds := 8000
    );
  end loop;
end;
$$;
revoke execute on function public.run_daily_payment_reminders() from public, anon, authenticated;
grant  execute on function public.run_daily_payment_reminders() to service_role;

comment on function public.run_daily_payment_reminders() is
  'Wrapper cron des relances impayés : POST l''edge run_payment_reminders par copro éligible. URL+secret via GUC app.reminders_edge_url/.cron_secret (cloud) ; no-op si absents.';

-- ----------------------------------------------------------------------------
-- 3. Planification quotidienne (07:00 UTC). Idempotent par nom de job.
--    En cloud : poser au préalable les GUC (ALTER DATABASE postgres SET app.… )
--    + le secret REMINDERS_CRON_SECRET de l'edge = app.reminders_cron_secret.
-- ----------------------------------------------------------------------------
select cron.schedule(
  'daily-payment-reminders',
  '0 7 * * *',
  $cron$ select public.run_daily_payment_reminders(); $cron$
);
