-- 0020_ged.sql — documents / GED / versioning (06 §1)
-- Source : .planning/db-cible/06-documents-ged.md §1.1-§1.5
-- Source : docs/superpowers/plans/2026-06-04-phase0-db-rebaseline.md Task 19 (renuméroté 0020 :
--          le plan dit 0019_ged mais 0019 = mutations déjà committé → décalage +1 ;
--          toutes les FK différées de 0016-0019 disent « ajoutée en 0020 »).
-- 5 tables (ORDRE imposé par dépendances FK) :
--   1) document_folders   (référencée par documents.folder_id)
--   2) documents          (table maîtresse)
--   3) document_relations (ex-document_links, polymorphe typé)
--   4) document_versions  (historique immuable)
--   5) technical_documents (carnet / diagnostics)
-- + 7 FK rétroactives vers documents (ALTER après création de documents).
--
-- Conception cible PROPRE (re-baseline Phase 0). Décisions USER verrouillées (blueprint §0/§7) :
--   A4 — confidentialité SIMPLE par document (documents.visibility, 3 niveaux) ;
--        table document_access (ACL fine) JAMAIS créée dans le build neuf (pas de DROP).
--   A5 — table dossiers (kanban) JAMAIS créée dans le build neuf (pas de DROP).
--   A9 — document_versions = source UNIQUE de versioning (bloc atomique).
--
-- ENUMS : tous référencés par nom (définis en 0003_enums_domaines.sql) — aucun create type ici :
--   document_category, document_status, document_source, document_visibility,
--   document_entity_type, document_relation_kind, technical_doc_type.
-- RLS : centralisée en 0026 (aucun enable/force/policy ici).
--
-- FONCTIONS + TRIGGERS PL/pgSQL DIFFÉRÉS au "lot fonctions" (option A — SCHÉMA PUR ; NON inclus
-- ici, fonctions inexistantes à ce stade). Même les triggers « déterministes » sont différés :
--   triggers différés :
--     trg_document_expiration        (documents, BEFORE I/U — calculate_document_expiration :
--                                      rétention légale, calcule expiration_date / deletion_blocked)
--     trg_document_search_text       (documents, BEFORE I/U — update_document_search_text :
--                                      to_tsvector('french', …) → search_text)
--     trg_prevent_document_deletion  (documents, BEFORE D — prevent_protected_document_deletion :
--                                      bloque la suppression d'un doc légal non expiré)
--     trg_documents_copro_consistency(documents, BEFORE I/U — folder/lot/coproprietaire ∈ copro_id)
--     trg_relation_copro_consistency (document_relations, BEFORE I/U — relation.copro_id = document.copro_id)
--     trg_tech_copro_consistency     (technical_documents, BEFORE I/U — document_id ∈ copro_id)
--     trg_version_no_update          (document_versions, BEFORE U/D — RAISE : immutabilité de l'historique, calquée GL)
--   CONSÉQUENCE ASSUMÉE EN SCHÉMA PUR : search_text / expiration_date / deletion_blocked restent
--   à leur défaut (NULL / NULL / false) tant que le lot fonctions n'est pas posé. Base fraîche,
--   0 donnée → aucun effet (les valeurs seront calculées dès que les triggers seront créés).
--
-- Seul trigger inclus ici : set_updated_at (public.set_updated_at() existe depuis 0005),
-- posé uniquement sur les 3 tables porteuses d'une colonne updated_at
-- (documents, document_folders, technical_documents).
-- document_relations (created_at seul) et document_versions (immuable, created_at seul)
-- N'ONT PAS de trigger set_updated_at.

-- ============================================================
-- 1. document_folders — arborescence (créée AVANT documents : référencée par folder_id)
-- ============================================================
create table public.document_folders (
  id                uuid               not null default gen_random_uuid(),
  copro_id          uuid               not null references public.copros(id) on delete cascade,
  parent_id         uuid                        references public.document_folders(id) on delete cascade,
  name              text               not null,
  description       text,
  icon              text               not null default 'Folder',
  color             text               not null default '#6B7280',
  sort_order        integer            not null default 0,
  is_system         boolean            not null default false,
  category_default  document_category,
  created_by        uuid                        references public.profiles(id) on delete set null,
  created_at        timestamptz        not null default now(),
  updated_at        timestamptz        not null default now(),
  constraint pk_document_folders          primary key (id),
  constraint uq_document_folders_name     unique (copro_id, parent_id, name),
  constraint ck_no_self_parent            check (parent_id is distinct from id)
);
create index idx_document_folders_copro
  on public.document_folders (copro_id);
create index idx_document_folders_parent
  on public.document_folders (parent_id);
create index idx_document_folders_sort
  on public.document_folders (copro_id, parent_id, sort_order);
create trigger trg_document_folders_updated
  before update on public.document_folders
  for each row execute function public.set_updated_at();

-- ============================================================
-- 2. documents — table maîtresse (nettoyée vs live : 8 liens *_id FK-less + versioning
--    parallèle supprimés → document_relations / document_versions)
-- ============================================================
-- search_text / expiration_date / deletion_blocked : dérivés par triggers DIFFÉRÉS (lot fonctions)
-- → restent à NULL/NULL/false en schéma pur (sans effet sur base fraîche).
create table public.documents (
  id                  uuid                 not null default gen_random_uuid(),
  copro_id            uuid                 not null references public.copros(id) on delete cascade,
  folder_id           uuid                          references public.document_folders(id) on delete set null,
  lot_id              uuid                          references public.lots(id) on delete set null,
  coproprietaire_id   uuid                          references public.coproprietaires(id) on delete set null,
  -- fichier
  file_name           text                 not null,
  file_path           text                 not null,
  file_size           integer,
  mime_type           text,
  file_hash           text,
  -- métadonnées
  title               text,
  description         text,
  category            document_category    not null default 'autre',
  tags                text[],
  document_date       date,
  year                integer,
  status              document_status      not null default 'active',
  visibility          document_visibility  not null default 'gestionnaire_seul',
  source_module       document_source      not null default 'manual',
  -- versioning (compteur courant ; historique dans document_versions)
  current_version_no  integer              not null default 1,
  -- rétention légale (dérivée trigger DIFFÉRÉ)
  retention_years     integer                       default 10,
  expiration_date     date,
  deletion_blocked    boolean              not null default false,
  -- archivage
  is_archived         boolean              not null default false,
  archived_at         timestamptz,
  is_starred          boolean              not null default false,
  -- recherche plein texte FR (dérivée trigger DIFFÉRÉ)
  search_text         tsvector,
  -- audit
  created_by          uuid                          references public.profiles(id) on delete set null,
  created_at          timestamptz          not null default now(),
  updated_at          timestamptz          not null default now(),
  constraint pk_documents                  primary key (id),
  constraint uq_documents_copro_path       unique (copro_id, file_path),
  constraint ck_year                       check (year is null or year between 1900 and 2100),
  constraint ck_retention                  check (retention_years is null or retention_years >= 0),
  constraint ck_archived                   check (is_archived = false or archived_at is not null)
);
create index idx_documents_copro
  on public.documents (copro_id);
create index idx_documents_folder
  on public.documents (folder_id);
create index idx_documents_lot
  on public.documents (lot_id);
-- Index partiel : documents nommément rattachés à un copropriétaire
create index idx_documents_coproprietaire
  on public.documents (coproprietaire_id)
  where coproprietaire_id is not null;
create index idx_documents_category
  on public.documents (copro_id, category);
create index idx_documents_status
  on public.documents (copro_id, status);
create index idx_documents_year
  on public.documents (copro_id, year);
create index idx_documents_created
  on public.documents (copro_id, created_at desc);
create index idx_documents_visibility
  on public.documents (copro_id, visibility);
-- Index partiel : documents favoris
create index idx_documents_starred
  on public.documents (copro_id)
  where is_starred;
-- GIN : recherche par tags
create index idx_documents_tags
  on public.documents using gin (tags);
-- GIN : recherche plein texte FR (alimentée par trigger DIFFÉRÉ)
create index idx_documents_search
  on public.documents using gin (search_text);
-- Index partiel dédup : hash de fichier
create index idx_documents_hash
  on public.documents (copro_id, file_hash)
  where file_hash is not null;
create trigger trg_documents_updated
  before update on public.documents
  for each row execute function public.set_updated_at();

-- ============================================================
-- 3. document_relations — liens polymorphes typés (ex-document_links text libre)
-- ============================================================
-- entity_id N'EST PAS une FK (polymorphe) — l'enum document_entity_type borne les cibles légales.
-- La cohérence relation.copro_id = document.copro_id est posée par trg_relation_copro_consistency (différé).
-- created_at seul → PAS de trigger set_updated_at.
create table public.document_relations (
  id             uuid                    not null default gen_random_uuid(),
  document_id    uuid                    not null references public.documents(id) on delete cascade,
  copro_id       uuid                    not null references public.copros(id) on delete cascade,
  entity_type    document_entity_type    not null,
  entity_id      uuid                    not null,
  relation_kind  document_relation_kind  not null default 'related',
  label          text,
  created_by     uuid                             references public.profiles(id) on delete set null,
  created_at     timestamptz             not null default now(),
  constraint pk_document_relations         primary key (id),
  constraint uq_document_relation          unique (document_id, entity_type, entity_id)
);
-- Recherche inverse « tous les docs de cette entité »
create index idx_document_relations_entity
  on public.document_relations (entity_type, entity_id);
create index idx_document_relations_copro
  on public.document_relations (copro_id);

-- ============================================================
-- 4. document_versions — historique (SOURCE UNIQUE de versioning, A9)
-- ============================================================
-- IMMUABLE (snapshot historique) : pas de updated_at → pas de trigger set_updated_at ;
-- l'immutabilité dure (BEFORE U/D → RAISE) est posée par trg_version_no_update (différé).
create table public.document_versions (
  id              uuid          not null default gen_random_uuid(),
  document_id     uuid          not null references public.documents(id) on delete cascade,
  version_number  integer       not null,
  file_path       text          not null,
  file_name       text          not null,
  file_size       integer,
  file_hash       text,
  change_summary  text,
  created_by      uuid                   references public.profiles(id) on delete set null,
  created_at      timestamptz   not null default now(),
  constraint pk_document_versions        primary key (id),
  constraint uq_document_version         unique (document_id, version_number),
  constraint ck_version_pos              check (version_number >= 1)
);
create index idx_document_versions_document
  on public.document_versions (document_id);

-- ============================================================
-- 5. technical_documents — carnet d'entretien / diagnostics (pointe TOUJOURS vers documents)
-- ============================================================
-- document_id NOT NULL -> documents ON DELETE RESTRICT (on ne supprime pas un fichier
-- encore référencé comme pièce technique ; JAMAIS SET NULL car colonne NOT NULL).
-- La cohérence document_id ∈ copro_id est posée par trg_tech_copro_consistency (différé).
create table public.technical_documents (
  id            uuid                not null default gen_random_uuid(),
  copro_id      uuid                not null references public.copros(id) on delete cascade,
  document_id   uuid                not null references public.documents(id) on delete restrict,
  name          text                not null,
  doc_type      technical_doc_type  not null,
  added_date    date                not null default current_date,
  validity_date date,
  observations  text,
  created_by    uuid                         references public.profiles(id) on delete set null,
  created_at    timestamptz         not null default now(),
  updated_at    timestamptz         not null default now(),
  constraint pk_technical_documents       primary key (id),
  constraint uq_technical_document        unique (copro_id, doc_type, document_id)
);
create index idx_technical_documents_type
  on public.technical_documents (copro_id, doc_type);
-- Index partiel : pièces avec date de validité (suivi d'échéance des diagnostics)
create index idx_technical_documents_validity
  on public.technical_documents (copro_id, validity_date)
  where validity_date is not null;
create trigger trg_technical_documents_updated
  before update on public.technical_documents
  for each row execute function public.set_updated_at();

-- ============================================================
-- 6. FK RÉTROACTIVES vers documents (7) — colonnes semées en 0016/0017/0019
-- ============================================================
-- ACTION ON DELETE IMPOSÉE pour respecter la nullabilité de chaque colonne source
-- (RÈGLE CASCADE ABSOLUE : jamais SET NULL sur une colonne NOT NULL).
--   - 6 colonnes nullables -> ON DELETE SET NULL
--   - council_documents.document_id NOT NULL -> ON DELETE CASCADE (JAMAIS SET NULL)

-- budget_expenses.piece_jointe (0016, nullable)
alter table public.budget_expenses
  add constraint fk_be_piece
  foreign key (piece_jointe)
  references public.documents(id)
  on delete set null;

-- ag_meetings.pv_document_id (0017, nullable)
alter table public.ag_meetings
  add constraint fk_ag_pv_doc
  foreign key (pv_document_id)
  references public.documents(id)
  on delete set null;

-- ag_attendance.proxy_document_id (0017, nullable)
alter table public.ag_attendance
  add constraint fk_ag_att_proxy
  foreign key (proxy_document_id)
  references public.documents(id)
  on delete set null;

-- ag_correspondence_votes.form_document_id (0017, nullable)
alter table public.ag_correspondence_votes
  add constraint fk_ag_corr_form
  foreign key (form_document_id)
  references public.documents(id)
  on delete set null;

-- ag_envoi_tracking.document_id (0017, nullable)
alter table public.ag_envoi_tracking
  add constraint fk_ag_envoi_doc
  foreign key (document_id)
  references public.documents(id)
  on delete set null;

-- council_documents.document_id (0017, NOT NULL -> CASCADE obligatoire)
alter table public.council_documents
  add constraint fk_council_doc
  foreign key (document_id)
  references public.documents(id)
  on delete cascade;

-- etat_date_snapshots.document_id (0019, nullable)
alter table public.etat_date_snapshots
  add constraint fk_etatdate_doc
  foreign key (document_id)
  references public.documents(id)
  on delete set null;