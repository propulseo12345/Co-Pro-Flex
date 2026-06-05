-- 0017_ag_conseil.sql — assemblées générales + conseil syndical (04 §1)
-- Source : .planning/db-cible/04-ag-gouvernance.md §1.1-§1.9
-- Source : docs/superpowers/plans/2026-06-04-phase0-db-rebaseline.md Task 16 (renumeroté 0017)
-- 13 tables : ag_meetings, ag_resolutions, ag_votes, ag_attendance,
--             ag_correspondence_votes, ag_correspondence_vote_details,
--             ag_pending_actions, ag_session_drafts, ag_envoi_tracking,
--             council_members, council_decisions, council_votes, council_documents
-- FK rétroactive : budgets.source_ag_id -> ag_meetings (créée ICI)
-- FK différées vers documents (ajoutées en 0020) — ACTION ON DELETE IMPOSÉE pour éviter
-- toute contradiction NOT NULL + SET NULL (cf. leçon ag_envoi_tracking.coproprietaire_id) :
--   ag_meetings.pv_document_id               (nullable) -> documents ON DELETE SET NULL
--   ag_attendance.proxy_document_id          (nullable) -> documents ON DELETE SET NULL
--   ag_correspondence_votes.form_document_id (nullable) -> documents ON DELETE SET NULL
--   ag_envoi_tracking.document_id            (nullable) -> documents ON DELETE SET NULL
--   council_documents.document_id            (NOT NULL) -> documents ON DELETE CASCADE  [JAMAIS SET NULL : colonne NOT NULL]
--
-- ENUMS : tous référencés par nom (définis en 0003_enums_domaines.sql) — aucun create type ici.
-- RLS : centralisée en 0026 (aucun enable/force/policy ici).
-- TRIGGERS DIFFÉRÉS au "lot fonctions" (NON inclus ici, fonctions inexistantes) :
--   enforce_copro_consistency (toutes tables à copro_id),
--   trg_ag_attendance_tantiemes (ag_attendance, recalcul tantiemes depuis lot_ids),
--   trg_ag_vote_requires_attendance (ag_votes, garde présence — ex trg_ag_vote_check_duplicate),
--   trg_ag_close_clear_drafts (ag_meetings, purge ag_session_drafts à la clôture).
-- Seul trigger inclus ici : set_updated_at (public.set_updated_at() existe depuis 0005),
-- posé uniquement sur les tables porteuses d'une colonne updated_at.

-- ============================================================
-- 1. ag_meetings — séance d'AG (entité racine)
-- ============================================================
create table public.ag_meetings (
  id                       uuid              not null default gen_random_uuid(),
  copro_id                 uuid              not null references public.copros(id) on delete cascade,
  title                    text              not null,
  meeting_type             ag_meeting_type   not null default 'ordinary',
  meeting_date             timestamptz       not null,
  location                 text,
  convocation_date         timestamptz,
  status                   ag_status         not null default 'draft',
  quorum_required          boolean           not null default true,
  president_id             uuid              references public.coproprietaires(id) on delete set null,
  president_name           text,
  secretary_id             uuid              references public.profiles(id) on delete set null,
  secretary_name           text,
  scrutineer1_id           uuid              references public.coproprietaires(id) on delete set null,
  scrutineer1_name         text,
  scrutineer2_id           uuid              references public.coproprietaires(id) on delete set null,
  scrutineer2_name         text,
  session_started_at       timestamptz,
  session_ended_at         timestamptz,
  opening_notes            text,
  closing_notes            text,
  incidents                text,
  pv_document_id           uuid,             -- FK documents ON DELETE SET NULL, ajoutée en 0020
  pv_generated_at          timestamptz,
  pv_sent_at               timestamptz,
  closed_at                timestamptz,
  current_step             integer           default 1,
  max_step_reached         integer           default 1,
  step_data                jsonb             default '{}'::jsonb,
  wizard_mode              text              default 'guided',
  remote_meeting_url       text,
  remote_meeting_provider  text,
  created_by               uuid              references public.profiles(id) on delete set null,
  created_at               timestamptz       not null default now(),
  updated_at               timestamptz       not null default now(),
  constraint pk_ag_meetings                  primary key (id),
  constraint ck_ag_meetings_current_step     check (current_step between 1 and 9),
  constraint ck_ag_meetings_max_step         check (max_step_reached between 1 and 9),
  constraint ck_ag_meetings_wizard_mode      check (wizard_mode in ('guided','expert'))
);
create index idx_ag_meetings_copro_date
  on public.ag_meetings (copro_id, meeting_date desc);
create index idx_ag_meetings_copro_status
  on public.ag_meetings (copro_id, status);
-- Index partiel : AG en visio (blueprint §1.1)
create index idx_ag_meetings_remote
  on public.ag_meetings (copro_id)
  where remote_meeting_url is not null;
create trigger trg_ag_meetings_updated
  before update on public.ag_meetings
  for each row execute function public.set_updated_at();

-- FK rétroactive : budgets.source_ag_id -> ag_meetings (03 §1.1)
-- budgets existe depuis 0016 ; ag_meetings vient d'être créée
alter table public.budgets
  add constraint fk_budgets_source_ag
  foreign key (source_ag_id)
  references public.ag_meetings(id)
  on delete set null;

-- ============================================================
-- 2. ag_resolutions — résolutions à voter
-- ============================================================
-- 8 compteurs dénormalisés supprimés (tantiemes_*/voters_*/is_approved/vote_details)
-- → dérivés de ag_votes via v_ag_resolution_vote_summary (blueprint §1.2 / A19)
create table public.ag_resolutions (
  id                     uuid                not null default gen_random_uuid(),
  ag_id                  uuid                not null references public.ag_meetings(id) on delete cascade,
  copro_id               uuid                not null references public.copros(id) on delete cascade,
  resolution_number      integer             not null,
  title                  text                not null,
  description            text,
  resolution_type        resolution_type     not null default 'other',
  majority_type          majority_type       not null default 'art24',
  action_type            ag_action_type,
  linked_budget_id       uuid                references public.budgets(id) on delete set null,
  linked_work_budget_id  uuid                references public.budgets(id) on delete set null,
  bridge_vote_id         uuid                references public.ag_resolutions(id) on delete set null,
  is_bridgeable          boolean             default false,
  variables              jsonb               default '{}'::jsonb,
  is_customized          boolean             default false,
  status                 resolution_status   not null default 'draft',
  threshold_tantiemes    numeric,
  threshold_voters       integer,
  voted_at               timestamptz,
  created_at             timestamptz         not null default now(),
  updated_at             timestamptz         not null default now(),
  constraint pk_ag_resolutions               primary key (id),
  constraint uq_ag_resolution_number         unique (ag_id, resolution_number),
  constraint ck_ag_resolution_bridge         check (bridge_vote_id is null or majority_type in ('art25_1','art26_1'))
);
create index idx_ag_resolutions_ag
  on public.ag_resolutions (ag_id);
create index idx_ag_resolutions_copro
  on public.ag_resolutions (copro_id);
create index idx_ag_resolutions_majority
  on public.ag_resolutions (majority_type);
create index idx_ag_resolutions_status
  on public.ag_resolutions (status);
create trigger trg_ag_resolutions_updated
  before update on public.ag_resolutions
  for each row execute function public.set_updated_at();

-- ============================================================
-- 3. ag_votes — vote nominatif lot-pondéré
-- ============================================================
create table public.ag_votes (
  id                 uuid           not null default gen_random_uuid(),
  resolution_id      uuid           not null references public.ag_resolutions(id) on delete cascade,
  copro_id           uuid           not null references public.copros(id) on delete cascade,
  coproprietaire_id  uuid           not null references public.coproprietaires(id) on delete restrict,
  vote               vote_choice    not null,
  tantiemes          numeric        not null,
  vote_source        vote_source    not null default 'live',
  is_excluded        boolean        default false,
  exclusion_reason   text,
  created_at         timestamptz    not null default now(),
  updated_at         timestamptz    not null default now(),
  constraint pk_ag_votes              primary key (id),
  constraint uq_ag_vote_resolution    unique (resolution_id, coproprietaire_id),
  constraint ck_ag_vote_exclusion     check (is_excluded = false or exclusion_reason is not null)
);
create index idx_ag_votes_copro
  on public.ag_votes (copro_id);
create trigger trg_ag_votes_updated
  before update on public.ag_votes
  for each row execute function public.set_updated_at();

-- ============================================================
-- 4. ag_attendance — présence / représentation (modèle UNIQUE du mandat)
-- ============================================================
-- tantiemes calculé par trigger trg_ag_attendance_tantiemes (différé) depuis lot_ids
create table public.ag_attendance (
  id                    uuid              not null default gen_random_uuid(),
  ag_id                 uuid              not null references public.ag_meetings(id) on delete cascade,
  copro_id              uuid              not null references public.copros(id) on delete cascade,
  coproprietaire_id     uuid              not null references public.coproprietaires(id) on delete restrict,
  lot_ids               uuid[]            not null default '{}'::uuid[],
  tantiemes             numeric           not null default 0,
  presence_type         attendance_type   not null default 'present',
  represented_by_id     uuid              references public.coproprietaires(id) on delete set null,
  represented_by_name   text,
  proxy_document_id     uuid,             -- FK documents ON DELETE SET NULL, ajoutée en 0020
  proxy_signed_at       timestamptz,
  signed                boolean           not null default false,
  signed_at             timestamptz,
  signature_data        text,
  arrived_at            timestamptz,
  left_at               timestamptz,
  created_at            timestamptz       not null default now(),
  updated_at            timestamptz       not null default now(),
  constraint pk_ag_attendance               primary key (id),
  constraint uq_ag_attendance_owner         unique (ag_id, coproprietaire_id),
  constraint ck_ag_attendance_proxy         check (presence_type <> 'proxy' or represented_by_id is not null),
  constraint ck_ag_attendance_self          check (represented_by_id <> coproprietaire_id)
);
create index idx_ag_attendance_lots
  on public.ag_attendance using gin (lot_ids);
create index idx_ag_attendance_copro
  on public.ag_attendance (copro_id);
create trigger trg_ag_attendance_updated
  before update on public.ag_attendance
  for each row execute function public.set_updated_at();

-- ============================================================
-- 5. ag_correspondence_votes — vote par correspondance, en-tête (loi 2019, art.17-1 A)
-- ============================================================
-- updated_at AJOUTÉ (manquait en live) → trigger set_updated_at (blueprint §1.5)
create table public.ag_correspondence_votes (
  id                 uuid                          not null default gen_random_uuid(),
  ag_id              uuid                          not null references public.ag_meetings(id) on delete cascade,
  copro_id           uuid                          not null references public.copros(id) on delete cascade,
  coproprietaire_id  uuid                          not null references public.coproprietaires(id) on delete restrict,
  form_document_id   uuid,                         -- FK documents ON DELETE SET NULL, ajoutée en 0020
  reception_method   text                          default 'postal',
  received_at        timestamptz,
  status             correspondence_form_status    not null default 'pending',
  integrated_at      timestamptz,
  notes              text,
  recorded_by        uuid                          references public.profiles(id) on delete set null,
  created_at         timestamptz                   not null default now(),
  updated_at         timestamptz                   not null default now(),
  constraint pk_ag_correspondence_votes          primary key (id),
  constraint uq_ag_corr_vote_owner               unique (ag_id, coproprietaire_id),
  constraint ck_ag_corr_reception_method         check (reception_method in ('postal','email','hand_delivery'))
);
create index idx_ag_corr_votes_ag
  on public.ag_correspondence_votes (ag_id);
create index idx_ag_corr_votes_copro
  on public.ag_correspondence_votes (copro_id);
create trigger trg_ag_corr_votes_updated
  before update on public.ag_correspondence_votes
  for each row execute function public.set_updated_at();

-- ============================================================
-- 6. ag_correspondence_vote_details — vote par correspondance, 1 ligne par résolution
-- ============================================================
-- recorded_at default now() ; pas d'updated_at → pas de trigger set_updated_at
create table public.ag_correspondence_vote_details (
  id                    uuid          not null default gen_random_uuid(),
  correspondence_form_id uuid         not null references public.ag_correspondence_votes(id) on delete cascade,
  resolution_id         uuid          not null references public.ag_resolutions(id) on delete cascade,
  copro_id              uuid          not null references public.copros(id) on delete cascade,
  coproprietaire_id     uuid          not null references public.coproprietaires(id) on delete restrict,
  vote                  vote_choice   not null,
  integrated_vote_id    uuid          references public.ag_votes(id) on delete set null,
  integrated_at         timestamptz,
  recorded_at           timestamptz   not null default now(),
  recorded_by           uuid          references public.profiles(id) on delete set null,
  constraint pk_ag_corr_vote_details         primary key (id),
  constraint uq_ag_corr_detail_resolution    unique (correspondence_form_id, resolution_id)
);
create index idx_ag_corr_details_form
  on public.ag_correspondence_vote_details (correspondence_form_id);
create index idx_ag_corr_details_resolution
  on public.ag_correspondence_vote_details (resolution_id);
create index idx_ag_corr_details_copro
  on public.ag_correspondence_vote_details (copro_id);

-- ============================================================
-- 7. ag_pending_actions — PIVOT auto-population canonique
-- ============================================================
-- Pas d'updated_at → pas de trigger set_updated_at (blueprint §1.6)
-- target_table = liste blanche alignée sur les cibles RÉELLES de prepare_ag_decisions
create table public.ag_pending_actions (
  id             uuid             not null default gen_random_uuid(),
  ag_id          uuid             not null references public.ag_meetings(id) on delete cascade,
  resolution_id  uuid             not null references public.ag_resolutions(id) on delete cascade,
  action_type    ag_action_type   not null,
  target_table   text             not null,
  target_id      uuid,
  payload        jsonb            not null default '{}'::jsonb,
  status         text             not null default 'pending',
  error_message  text,
  activated_at   timestamptz,
  result_data    jsonb,
  created_at     timestamptz      not null default now(),
  constraint pk_ag_pending_actions           primary key (id),
  constraint uq_ag_pending_action            unique (ag_id, resolution_id),
  constraint ck_ag_pending_target_table      check (target_table in ('budgets','call_for_funds','council_members','accounting_periods','copros','contracts')),
  constraint ck_ag_pending_status            check (status in ('pending','activated','failed'))
);
create index idx_ag_pending_ag
  on public.ag_pending_actions (ag_id);
create index idx_ag_pending_status
  on public.ag_pending_actions (status);

-- ============================================================
-- 8. ag_session_drafts — brouillons UI du wizard
-- ============================================================
-- last_modified_at + created_at, PAS de updated_at → pas de trigger set_updated_at (blueprint §1.7)
create table public.ag_session_drafts (
  id                uuid            not null default gen_random_uuid(),
  ag_id             uuid            not null references public.ag_meetings(id) on delete cascade,
  copro_id          uuid            not null references public.copros(id) on delete cascade,
  user_id           uuid            not null references public.profiles(id) on delete cascade,
  draft_type        ag_draft_type   not null,
  draft_data        jsonb           not null default '{}'::jsonb,
  version           integer         not null default 1,
  last_modified_at  timestamptz     not null default now(),
  created_at        timestamptz     not null default now(),
  constraint pk_ag_session_drafts            primary key (id),
  constraint uq_ag_session_draft             unique (ag_id, user_id, draft_type)
);
create index idx_ag_session_drafts_ag
  on public.ag_session_drafts (ag_id);
create index idx_ag_session_drafts_copro
  on public.ag_session_drafts (copro_id);

-- ============================================================
-- 9. ag_envoi_tracking — suivi d'expédition convocation/PV (messagerie LÉGALE)
-- ============================================================
-- coproprietaire_id NULLABLE : honore le ON DELETE SET NULL (la trace d'envoi
-- légale survit à la suppression du destinataire ; NOT NULL + SET NULL serait
-- contradictoire — corrige une incohérence du blueprint §1.8)
create table public.ag_envoi_tracking (
  id                 uuid                   not null default gen_random_uuid(),
  ag_id              uuid                   not null references public.ag_meetings(id) on delete cascade,
  coproprietaire_id  uuid                   references public.coproprietaires(id) on delete set null,
  method             notification_channel   not null,
  status             delivery_status        not null default 'queued',
  tracking_ref       text,
  document_id        uuid,                  -- FK documents ON DELETE SET NULL, ajoutée en 0020
  error_message      text,
  sent_at            timestamptz,
  delivered_at       timestamptz,
  created_at         timestamptz            not null default now(),
  updated_at         timestamptz            not null default now(),
  constraint pk_ag_envoi_tracking            primary key (id)
);
create index idx_ag_envoi_tracking_ag
  on public.ag_envoi_tracking (ag_id);
create index idx_ag_envoi_tracking_status
  on public.ag_envoi_tracking (status);
create trigger trg_ag_envoi_tracking_updated
  before update on public.ag_envoi_tracking
  for each row execute function public.set_updated_at();

-- ============================================================
-- 10. council_members — membres du conseil syndical
-- ============================================================
create table public.council_members (
  id                 uuid            not null default gen_random_uuid(),
  copro_id           uuid            not null references public.copros(id) on delete cascade,
  user_id            uuid            references public.profiles(id) on delete set null,
  coproprietaire_id  uuid            references public.coproprietaires(id) on delete set null,
  role               council_role    not null default 'member',
  start_date         date            not null default current_date,
  end_date           date,
  is_active          boolean         not null default true,
  created_at         timestamptz     not null default now(),
  updated_at         timestamptz     not null default now(),
  constraint pk_council_members              primary key (id),
  constraint ck_council_member_identity      check (user_id is not null or coproprietaire_id is not null),
  constraint uq_council_member               unique (copro_id, coproprietaire_id, start_date)
);
-- Index partiel : conseil courant (blueprint §1.9)
create index idx_council_members_active
  on public.council_members (copro_id)
  where is_active;
create trigger trg_council_members_updated
  before update on public.council_members
  for each row execute function public.set_updated_at();

-- ============================================================
-- 11. council_decisions — décisions du conseil syndical
-- ============================================================
-- linked_ag_id / linked_resolution_id : vraies FK AJOUTÉES (uuid nus en live — blueprint §1.9)
create table public.council_decisions (
  id                   uuid                       not null default gen_random_uuid(),
  copro_id             uuid                       not null references public.copros(id) on delete cascade,
  title                text                       not null,
  description          text,
  status               council_decision_status    not null default 'draft',
  created_by           uuid                       not null references public.profiles(id) on delete restrict,
  submitted_at         timestamptz,
  submitted_by         uuid                       references public.profiles(id) on delete set null,
  decided_at           timestamptz,
  decided_by           uuid                       references public.profiles(id) on delete set null,
  linked_ag_id         uuid                       references public.ag_meetings(id) on delete set null,
  linked_resolution_id uuid                       references public.ag_resolutions(id) on delete set null,
  rejection_reason     text,
  created_at           timestamptz                not null default now(),
  updated_at           timestamptz                not null default now(),
  constraint pk_council_decisions            primary key (id)
);
create index idx_council_decisions_copro
  on public.council_decisions (copro_id);
create index idx_council_decisions_status
  on public.council_decisions (status);
create trigger trg_council_decisions_updated
  before update on public.council_decisions
  for each row execute function public.set_updated_at();

-- ============================================================
-- 12. council_votes — vote du conseil (majorité simple)
-- ============================================================
-- copro_id AJOUTÉ (dérivé de la décision parent) ; pas d'updated_at → pas de trigger (blueprint §1.9)
create table public.council_votes (
  id                 uuid           not null default gen_random_uuid(),
  copro_id           uuid           not null references public.copros(id) on delete cascade,
  decision_id        uuid           not null references public.council_decisions(id) on delete cascade,
  council_member_id  uuid           not null references public.council_members(id) on delete cascade,
  vote               vote_choice    not null,
  comment            text,
  voted_at           timestamptz    not null default now(),
  constraint pk_council_votes                primary key (id),
  constraint uq_council_vote                 unique (decision_id, council_member_id)
);
create index idx_council_votes_copro
  on public.council_votes (copro_id);
create index idx_council_votes_decision
  on public.council_votes (decision_id);

-- ============================================================
-- 13. council_documents — GED conseil (faux-mort câblé — CONSERVÉ)
-- ============================================================
-- document_id : NOT NULL -> FK documents ON DELETE CASCADE (JAMAIS SET NULL), ajoutée en 0020 ; pas d'updated_at → pas de trigger (blueprint §1.9)
create table public.council_documents (
  id           uuid                    not null default gen_random_uuid(),
  copro_id     uuid                    not null references public.copros(id) on delete cascade,
  document_id  uuid                    not null,   -- FK documents ajoutée en 0020
  visibility   content_visibility      not null default 'council_only',
  linked_type  council_doc_link_type,
  linked_id    uuid,                   -- polymorphe, pas de FK
  label        text,
  notes        text,
  created_by   uuid                    not null references public.profiles(id) on delete restrict,
  created_at   timestamptz             not null default now(),
  constraint pk_council_documents            primary key (id),
  constraint uq_council_document             unique (copro_id, document_id)
);
create index idx_council_documents_copro
  on public.council_documents (copro_id);