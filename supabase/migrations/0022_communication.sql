-- 0022_communication.sql — messagerie interne / mur communautaire / agenda / boîte email Resend (08 §1.1-§1.8)
-- Source : .planning/db-cible/08-communication.md §1.1-§1.8
-- Source : docs/superpowers/plans/2026-06-04-phase0-db-rebaseline.md Task 21 (renuméroté 0022, décalage +1).
-- DERNIER domaine de tables.
-- 8 tables (que des self-FK, pas de cycle inter-tables) :
--   conversations, conversation_members, messages,
--   wall_posts, wall_comments, wall_likes,
--   events, mails.
--
-- ENUMS : tous référencés par nom (définis en 0003_enums_domaines.sql) — aucun create type ici.
--   message_type (text/file/system), wall_post_category, content_visibility, event_type.
--
-- CIBLES FK EXTERNES déjà créées ailleurs (NON recréées ici) :
--   copros          -> 0007
--   profiles        -> 0011
--   documents       -> 0020
--   ag_meetings     -> 0017
--   service_orders  -> 0021
--
-- ÎLE CAMPAGNES — JAMAIS créée (R32, DROP décision USER) :
--   mail_campaigns, mail_recipients, mail_inbox, mail_templates, mail_folders, mail_labels_v2
--   + leurs fonctions/vues (create_mail_system_folders, generate_campaign_recipients,
--     update_mail_campaign_stats, v_mail_campaigns_overview, v_mail_inbox_overview).
--   NB : `mails` (§1.8) N'EST PAS du bloc campagnes — c'est la boîte email transactionnelle
--        Resend câblée au front (useMailbox.ts + routes mail/{send,inbound}), reprise comme 8ᵉ table.
--
-- RLS : centralisée en 0026 (aucun enable/force/policy ici).
--
-- VUES DIFFÉRÉES (NON créées ici) -> lot vues :
--   v_conversations_overview, v_conversation_messages, v_wall_feed, v_events_overview.
--   (v_mail_* NON reconduites.)
--
-- TRIGGERS + FONCTIONS DIFFÉRÉS au "lot fonctions" (option A — SCHÉMA PUR ; NON inclus ici,
-- fonctions PL/pgSQL inexistantes à ce stade) :
--   triggers métier différés :
--     update_conversation_last_message      (messages AFTER INSERT — maj conversations.last_message_* + conversation_members.unread_count des membres actifs sauf auteur)
--     update_wall_post_comments_count       (wall_comments AFTER I/D — wall_posts.comments_count ± 1, GREATEST 0)
--     update_wall_post_likes_count          (wall_likes AFTER I/D — wall_posts.likes_count ± 1, GREATEST 0)
--     trg_member_copro_consistency          (conversation_members — conversations.copro_id = copro_id)
--     trg_message_copro_consistency         (messages — conversations.copro_id = copro_id)
--     trg_comment_copro_consistency         (wall_comments — wall_posts.copro_id = copro_id)
--     trg_like_copro_consistency            (wall_likes — wall_posts.copro_id = copro_id)
--     trg_event_copro_consistency           (events — linked_ag_id/linked_service_order_id non-null ∈ même copro)
--     trg_mail_copro_consistency            (mails — in_reply_to non-null ∈ même copro)
--   fonctions différées : voir 08 §5 (is_conversation_member, mark_conversation_read, + futures post_message/create_conversation/toggle_wall_like).
--
-- Seul trigger inclus ici : set_updated_at (public.set_updated_at() existe depuis 0005),
-- posé uniquement sur les 5 tables porteuses d'une colonne updated_at :
--   conversations, wall_posts, wall_comments, events, mails.
-- PAS de updated_at (donc PAS de trigger) sur :
--   messages (R38 — bug live corrigé : le trigger live ciblait une colonne inexistante ; edited_at seul),
--   conversation_members (table d'appartenance — joined_at seul),
--   wall_likes (réaction — created_at seul).

-- ============================================================
-- 1. conversations — fil de messagerie interne (08 §1.1)
-- ============================================================
-- created_by en RESTRICT (l'auteur du fil ne disparaît pas en silence).
-- last_message_at / last_message_preview : dénormalisation de feed (maj par update_conversation_last_message, différé).
create table public.conversations (
  id                    uuid          not null default gen_random_uuid(),
  copro_id              uuid          not null references public.copros(id) on delete cascade,
  subject               text,
  is_group              boolean       not null default false,
  created_by            uuid          not null references public.profiles(id) on delete restrict,
  last_message_at       timestamptz,
  last_message_preview  text,
  is_archived           boolean       not null default false,
  created_at            timestamptz   not null default now(),
  updated_at            timestamptz   not null default now(),
  constraint pk_conversations            primary key (id)
);
create index idx_conversations_copro
  on public.conversations (copro_id);
-- Tri de la liste de fils : derniers messages en tête (NULL = jamais de message, en fin)
create index idx_conversations_copro_last_message
  on public.conversations (copro_id, last_message_at desc nulls last);
create trigger trg_conversations_updated
  before update on public.conversations
  for each row execute function public.set_updated_at();

-- ============================================================
-- 2. conversation_members — appartenance + lu/non-lu dénormalisé (08 §1.2)
-- ============================================================
-- Snapshots user_name/user_role SUPPRIMÉS (divergence garantie ; nom/rôle joints depuis profiles à la lecture).
-- user_id en CASCADE (l'appartenance disparaît avec le profil) ; conversation en CASCADE.
-- left_at NULL = membre actif. PAS de updated_at -> PAS de trigger (table d'appartenance, joined_at seul).
create table public.conversation_members (
  id               uuid          not null default gen_random_uuid(),
  copro_id         uuid          not null references public.copros(id) on delete cascade,
  conversation_id  uuid          not null references public.conversations(id) on delete cascade,
  user_id          uuid          not null references public.profiles(id) on delete cascade,
  last_read_at     timestamptz,
  unread_count     int           not null default 0,
  is_admin         boolean       not null default false,
  is_muted         boolean       not null default false,
  left_at          timestamptz,
  joined_at        timestamptz   not null default now(),
  constraint pk_conversation_members     primary key (id),
  constraint uq_conversation_member      unique (conversation_id, user_id),
  constraint ck_unread_count             check (unread_count >= 0)
);
create index idx_conversation_members_conversation
  on public.conversation_members (conversation_id);
create index idx_conversation_members_user
  on public.conversation_members (user_id);
-- Index partiel : membres actifs (requête chaude de la messagerie)
create index idx_conversation_members_active
  on public.conversation_members (user_id, conversation_id)
  where left_at is null;

-- ============================================================
-- 3. messages — corps du fil (nettoyée) (08 §1.3)
-- ============================================================
-- author_id en RESTRICT ; conversation en CASCADE.
-- attachment_id -> documents SET NULL (un seul mécanisme de PJ) ; reply_to_id -> messages SET NULL (self).
-- message_type = ENUM (remplace le text libre live). read_by = accusé de lecture fin (qui exactement a lu).
-- PAS de updated_at (R38, bug live corrigé) -> PAS de trigger set_updated_at ; l'édition est tracée par edited_at.
-- Colonnes legacy NON reprises : attachments (jsonb, doublon de attachment_id), is_edited (dérivé de edited_at), sender_name (snapshot).
create table public.messages (
  id               uuid           not null default gen_random_uuid(),
  copro_id         uuid           not null references public.copros(id) on delete cascade,
  conversation_id  uuid           not null references public.conversations(id) on delete cascade,
  author_id        uuid           not null references public.profiles(id) on delete restrict,
  content          text           not null,
  message_type     message_type   not null default 'text',
  attachment_id    uuid           references public.documents(id) on delete set null,
  reply_to_id      uuid           references public.messages(id) on delete set null,
  read_by          uuid[]         not null default '{}'::uuid[],
  edited_at        timestamptz,
  created_at       timestamptz    not null default now(),
  constraint pk_messages                 primary key (id)
);
-- Pagination du fil : derniers messages d'abord
create index idx_messages_conversation_created
  on public.messages (conversation_id, created_at desc);
create index idx_messages_author
  on public.messages (author_id);
-- Index partiel : galerie des pièces jointes du fil
create index idx_messages_attachment
  on public.messages (conversation_id)
  where attachment_id is not null;

-- ============================================================
-- 4. wall_posts — mur communautaire (08 §1.4)
-- ============================================================
-- author_id en RESTRICT ; pinned_by / attachment_id en SET NULL (nullable).
-- Snapshots author_role/author_name SUPPRIMÉS (rôle dérivé à la volée par v_wall_feed — unique source).
-- likes_count / comments_count : compteurs dénormalisés (maj par triggers différés).
create table public.wall_posts (
  id              uuid                 not null default gen_random_uuid(),
  copro_id        uuid                 not null references public.copros(id) on delete cascade,
  author_id       uuid                 not null references public.profiles(id) on delete restrict,
  title           text                 not null,
  content         text                 not null,
  category        wall_post_category   not null default 'information',
  visibility      content_visibility   not null default 'all_members',
  is_pinned       boolean              not null default false,
  pinned_at       timestamptz,
  pinned_by       uuid                 references public.profiles(id) on delete set null,
  is_locked       boolean              not null default false,
  attachment_id   uuid                 references public.documents(id) on delete set null,
  tags            text[]               not null default '{}'::text[],
  likes_count     int                  not null default 0,
  comments_count  int                  not null default 0,
  created_at      timestamptz          not null default now(),
  updated_at      timestamptz          not null default now(),
  constraint pk_wall_posts               primary key (id),
  constraint ck_wall_counts              check (likes_count >= 0 and comments_count >= 0),
  constraint ck_pinned                   check (is_pinned = false or pinned_at is not null)
);
create index idx_wall_posts_copro_created
  on public.wall_posts (copro_id, created_at desc);
-- Feed avec épinglés en tête
create index idx_wall_posts_copro_pinned
  on public.wall_posts (copro_id, is_pinned, created_at desc);
create index idx_wall_posts_copro_visibility
  on public.wall_posts (copro_id, visibility);
create index idx_wall_posts_author
  on public.wall_posts (author_id);
create index idx_wall_posts_tags
  on public.wall_posts using gin (tags);
create trigger trg_wall_posts_updated
  before update on public.wall_posts
  for each row execute function public.set_updated_at();

-- ============================================================
-- 5. wall_comments — fil de commentaires (08 §1.5)
-- ============================================================
-- author_id en RESTRICT ; post_id en CASCADE ; parent_comment_id -> wall_comments CASCADE (self, fil de réponses).
-- Snapshot author_name SUPPRIMÉ (jointure profiles).
create table public.wall_comments (
  id                 uuid          not null default gen_random_uuid(),
  copro_id           uuid          not null references public.copros(id) on delete cascade,
  post_id            uuid          not null references public.wall_posts(id) on delete cascade,
  author_id          uuid          not null references public.profiles(id) on delete restrict,
  content            text          not null,
  parent_comment_id  uuid          references public.wall_comments(id) on delete cascade,
  created_at         timestamptz   not null default now(),
  updated_at         timestamptz   not null default now(),
  constraint pk_wall_comments            primary key (id),
  constraint ck_no_self_parent           check (parent_comment_id is distinct from id)
);
create index idx_wall_comments_post_created
  on public.wall_comments (post_id, created_at);
-- Index partiel : réponses imbriquées (threads)
create index idx_wall_comments_parent
  on public.wall_comments (parent_comment_id)
  where parent_comment_id is not null;
create trigger trg_wall_comments_updated
  before update on public.wall_comments
  for each row execute function public.set_updated_at();

-- ============================================================
-- 6. wall_likes — réactions (08 §1.6)
-- ============================================================
-- user_id en CASCADE ; post_id en CASCADE. created_at seul -> PAS de updated_at, PAS de trigger.
create table public.wall_likes (
  id          uuid          not null default gen_random_uuid(),
  copro_id    uuid          not null references public.copros(id) on delete cascade,
  post_id     uuid          not null references public.wall_posts(id) on delete cascade,
  user_id     uuid          not null references public.profiles(id) on delete cascade,
  created_at  timestamptz   not null default now(),
  constraint pk_wall_likes               primary key (id),
  constraint uq_wall_like                unique (post_id, user_id)
);
create index idx_wall_likes_post
  on public.wall_likes (post_id);

-- ============================================================
-- 7. events — agenda copro (FK liens posées) (08 §1.7)
-- ============================================================
-- created_by en RESTRICT ; linked_ag_id -> ag_meetings SET NULL ; linked_service_order_id -> service_orders SET NULL (nouvelles FK).
create table public.events (
  id                       uuid                 not null default gen_random_uuid(),
  copro_id                 uuid                 not null references public.copros(id) on delete cascade,
  title                    text                 not null,
  description              text,
  event_type               event_type           not null default 'autre',
  location                 text,
  starts_at                timestamptz          not null,
  ends_at                  timestamptz,
  all_day                  boolean              not null default false,
  visibility               content_visibility   not null default 'all_members',
  linked_ag_id             uuid                 references public.ag_meetings(id) on delete set null,
  linked_service_order_id  uuid                 references public.service_orders(id) on delete set null,
  created_by               uuid                 not null references public.profiles(id) on delete restrict,
  created_at               timestamptz          not null default now(),
  updated_at               timestamptz          not null default now(),
  constraint pk_events                   primary key (id),
  constraint ck_event_dates              check (ends_at is null or ends_at >= starts_at)
);
-- Vue calendrier
create index idx_events_copro_starts
  on public.events (copro_id, starts_at);
create index idx_events_copro_type
  on public.events (copro_id, event_type);
create trigger trg_events_updated
  before update on public.events
  for each row execute function public.set_updated_at();

-- ============================================================
-- 8. mails — boîte email transactionnelle Resend (GARDÉE, câblée front) (08 §1.8)
-- ============================================================
-- Boîte email externe (envoi/réception Resend), distincte de la messagerie interne conversations/messages
-- et du bloc campagnes droppé. owner_id en RESTRICT (durci vs live NO ACTION) ; in_reply_to -> mails SET NULL (self).
-- attachments reste jsonb (métadonnées Resend brutes, PAS de FK documents — différence assumée vs messages).
-- status = text libre (côté Resend, pas d'enum cible) ; label_ids = text[] (plus de table mail_labels_v2, droppée) ;
-- thread_id = uuid sans FK (id de thread Resend) ; resend_id = id externe Resend.
create table public.mails (
  id            uuid          not null default gen_random_uuid(),
  copro_id      uuid          not null references public.copros(id) on delete cascade,
  owner_id      uuid          not null references public.profiles(id) on delete restrict,
  from_email    text          not null,
  from_name     text          not null,
  to_emails     jsonb         not null,
  cc_emails     jsonb,
  subject       text          not null,
  body          text          not null,
  body_html     text,
  attachments   jsonb,
  status        text          not null,
  is_read       boolean       not null default false,
  is_starred    boolean       not null default false,
  is_archived   boolean       not null default false,
  is_deleted    boolean       not null default false,
  label_ids     text[],
  in_reply_to   uuid          references public.mails(id) on delete set null,
  thread_id     uuid,
  resend_id     text,
  sent_at       timestamptz,
  received_at   timestamptz,
  deleted_at    timestamptz,
  created_at    timestamptz   not null default now(),
  updated_at    timestamptz   not null default now(),
  constraint pk_mails                    primary key (id)
);
-- Liste de boîte par agent
create index idx_mails_copro_owner_created
  on public.mails (copro_id, owner_id, created_at desc);
-- Index partiel : boîte active (corbeille exclue)
create index idx_mails_active
  on public.mails (copro_id)
  where is_deleted = false;
-- Index partiel : regroupement de fil Resend
create index idx_mails_thread
  on public.mails (thread_id)
  where thread_id is not null;
-- Index partiel : rapprochement webhook entrant Resend
create index idx_mails_resend
  on public.mails (resend_id)
  where resend_id is not null;
create trigger trg_mails_updated
  before update on public.mails
  for each row execute function public.set_updated_at();