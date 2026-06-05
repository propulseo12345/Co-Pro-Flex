-- 0018_ag_notif_transitoire.sql — île notifications AG (foyer TRANSITOIRE — 04 §6.2)
-- Source : .planning/db-cible/04-ag-gouvernance.md §6.2 (schéma minimal de survie)
-- Source : docs/superpowers/plans/2026-06-04-phase0-db-rebaseline.md Task 17 (renuméroté 0018)
-- Rattache R13 (AUTORISATION §5.2.1).
--
-- ============================================================================
-- !!! FOYER TRANSITOIRE — A DROPER A L'ETAPE 3 — NE PAS DROPER EN PHASE 0 !!!
-- ============================================================================
-- Ces 3 tables (ag_notifications, ag_notification_events, ag_milestones) ne font
-- PAS partie du schéma cible définitif. Elles survivent VOLONTAIREMENT jusqu'à
-- l'ÉTAPE 3 de la séquence transitoire (04 §6.2) :
--   1. État transitoire (ici) : ag_notifications/_events ÉCRITES par l'edge
--      `email_webhook` (faux mort) ; ag_milestones LUE par `useAGDelais` /
--      `get_ag_wizard_state`.
--   2. Pré-condition : refacto edge `email_webhook` -> `ag_envoi_tracking` ET
--      réécriture `get_ag_wizard_state` / get|save_ag_milestone -> lecture des
--      jalons depuis ag_session_drafts / ag_meetings.step_data (cf. 04 §5),
--      prouvée iso-comportement sur HARNESS.
--   3. ÉTAPE 3 (même lot, Phase APPLICATIVE — JAMAIS ici) :
--        DROP TABLE ag_notifications, ag_notification_events, ag_milestones
--        + DROP FUNCTION create_ag_notification, mark_notification_sent,
--          mark_notification_failed.
-- ORDRE IMPÉRATIF : réécrire `get_ag_wizard_state` AVANT de droper ag_milestones
-- (la fonction conservée la LIT — un drop prématuré casserait « relation inexistante »).
-- Le canal légal cible reste ag_envoi_tracking (0017 §1.8).
--
-- ENUMS : notification_channel + delivery_status définis en 0003_enums_domaines.sql
--         — référencés par nom, AUCUN create type ici.
-- RLS : centralisée en 0026 (aucun enable/force/policy ici).
-- TRIGGERS : seul set_updated_at (public.set_updated_at() existe depuis 0005),
--   posé UNIQUEMENT sur ag_milestones (seule table porteuse d'updated_at).
--   ag_notifications / ag_notification_events n'ont PAS d'updated_at -> pas de trigger.
-- TRIGGER DIFFÉRÉ (NON inclus — fonction inexistante) : la cohérence du copro_id
--   DÉNORMALISÉ de ag_notification_events (aucune FK, dérivé de la notification
--   parente via notification_id -> ag_notifications.copro_id) devra être garantie
--   par enforce_copro_consistency au « lot fonctions ». Signalé ici, pas créé.

-- ============================================================
-- 1. ag_notifications — notification AG (écrite par edge email_webhook)
-- ============================================================
-- coproprietaire_id NULLABLE : honore le ON DELETE SET NULL (NOT NULL + SET NULL
-- serait contradictoire — la trace de notification survit à la suppression du destinataire).
-- channel NULLABLE ; status delivery_status not null default 'queued'.
-- Pas d'updated_at -> pas de trigger set_updated_at.
create table public.ag_notifications (
  id                 uuid                   not null default gen_random_uuid(),
  ag_id              uuid                   not null references public.ag_meetings(id) on delete cascade,
  copro_id           uuid                   not null references public.copros(id) on delete cascade,
  coproprietaire_id  uuid                   references public.coproprietaires(id) on delete set null,
  channel            notification_channel,
  status             delivery_status        not null default 'queued',
  provider_ref       text,
  error_message      text,
  sent_at            timestamptz,
  created_at         timestamptz            not null default now(),
  constraint pk_ag_notifications             primary key (id)
);
create index idx_ag_notifications_copro
  on public.ag_notifications (copro_id);

-- ============================================================
-- 2. ag_notification_events — événements de livraison (callback webhook)
-- ============================================================
-- copro_id DÉNORMALISÉ : AUCUNE FK (dérivé de la notification parente).
-- Cohérence assurée à terme par trigger enforce_copro_consistency (DIFFÉRÉ, cf. en-tête).
-- Pas d'updated_at -> pas de trigger set_updated_at.
create table public.ag_notification_events (
  id               uuid          not null default gen_random_uuid(),
  notification_id  uuid          not null references public.ag_notifications(id) on delete cascade,
  copro_id         uuid,         -- dénormalisé, AUCUNE FK (cohérence via trigger différé)
  event_type       text,
  payload          jsonb         not null default '{}'::jsonb,
  occurred_at      timestamptz,
  created_at       timestamptz   not null default now(),
  constraint pk_ag_notification_events       primary key (id)
);
create index idx_ag_notification_events_notification
  on public.ag_notification_events (notification_id);

-- ============================================================
-- 3. ag_milestones — jalons wizard (lue par useAGDelais / get_ag_wizard_state)
-- ============================================================
-- A updated_at -> trigger set_updated_at.
-- DROP CONDITIONNÉ à la réécriture préalable de get_ag_wizard_state (cf. en-tête).
create table public.ag_milestones (
  id             uuid          not null default gen_random_uuid(),
  ag_id          uuid          not null references public.ag_meetings(id) on delete cascade,
  copro_id       uuid          not null references public.copros(id) on delete cascade,
  milestone_key  text,
  due_date       date,
  done           boolean       not null default false,
  created_at     timestamptz   not null default now(),
  updated_at     timestamptz   not null default now(),
  constraint pk_ag_milestones                primary key (id)
);
create index idx_ag_milestones_copro
  on public.ag_milestones (copro_id);
create index idx_ag_milestones_ag
  on public.ag_milestones (ag_id);
create trigger trg_ag_milestones_updated
  before update on public.ag_milestones
  for each row execute function public.set_updated_at();