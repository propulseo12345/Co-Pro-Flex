-- ============================================================================
-- 0052 — GED avancée (J2-bis lot 4) : 6 vues de compat + table pv_templates
-- ----------------------------------------------------------------------------
-- Le front GED (lib/documents/api.ts → useGedPageSupabase → page documents/ged)
-- a été écrit contre l'ANCIEN schéma : 6 vues v_documents_*/v_folders_* et des
-- colonnes legacy (confidentiality, version, is_current_version, FK ag_id/...).
-- La base canonique porte documents + document_folders + document_relations.
-- On recrée les vues au CONTRAT EXACT de l'ancien types (5c8209e) en mappant :
--   confidentiality  ← visibility   (tous_coproprietaires→public, conseil→council,
--                                    gestionnaire_seul→manager ; 'restricted' n'est
--                                    plus jamais produit)
--   version          ← current_version_no
--   is_current_version ← true       (le canonique ne stocke que la version courante,
--                                    l'historique vit dans document_versions)
--   FK legacy (ag_id, contract_id, invoice_id, mutation_id, resolution_id,
--   service_order_id, dossier_id, parent_document_id) ← NULL : les liens vivent
--   dans document_relations ; aucun lecteur front ne consomme ces colonnes.
-- pv_templates : vraie feature (éditeur de templates PV, settings/templates) sans
-- équivalent canonique → table créée, RLS modèle 0034, registre mis à jour.
-- document_entity_type : + 'budget_expense' (les PJ de dépenses étaient liées au
-- legacy 'depense' ; 'budget' désigne déjà le budget lui-même).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Enum : valeur dédiée aux pièces justificatives de dépense
-- ----------------------------------------------------------------------------
alter type public.document_entity_type add value if not exists 'budget_expense';

-- ----------------------------------------------------------------------------
-- 1. v_documents_with_folder — liste/recherche GED (contrat 5c8209e, 42 col)
-- ----------------------------------------------------------------------------
create or replace view public.v_documents_with_folder
with (security_invoker = true) as
select
  d.id,
  d.copro_id,
  c.name                                   as copro_name,
  d.folder_id,
  f.name                                   as folder_name,
  f.icon                                   as folder_icon,
  f.color                                  as folder_color,
  pf.name                                  as parent_folder_name,
  d.lot_id,
  d.coproprietaire_id,
  d.file_name,
  d.file_path,
  d.file_size,
  d.mime_type,
  d.file_hash,
  d.title,
  d.description,
  d.category,
  d.tags,
  d.document_date,
  d.year,
  d.status,
  case d.visibility
    when 'tous_coproprietaires' then 'public'
    when 'conseil'              then 'council'
    when 'gestionnaire_seul'    then 'manager'
  end                                      as confidentiality,
  d.source_module,
  d.current_version_no                     as version,
  true                                     as is_current_version,
  d.retention_years,
  d.expiration_date,
  d.deletion_blocked,
  d.is_archived,
  d.archived_at,
  d.search_text,
  null::uuid                               as ag_id,
  null::uuid                               as contract_id,
  null::uuid                               as invoice_id,
  null::uuid                               as mutation_id,
  null::uuid                               as resolution_id,
  null::uuid                               as service_order_id,
  null::uuid                               as dossier_id,
  null::uuid                               as parent_document_id,
  d.created_by,
  d.created_at,
  d.updated_at
from public.documents d
left join public.document_folders f  on f.id = d.folder_id
left join public.document_folders pf on pf.id = f.parent_id
left join public.copros c            on c.id = d.copro_id
where d.status <> 'deleted';

comment on view public.v_documents_with_folder is
  'Documents + dossier (compat 5c8209e, hors soft-deleted) : confidentiality mappée depuis visibility, version=current_version_no, is_current_version=true, FK legacy NULL (liens → document_relations).';

-- ----------------------------------------------------------------------------
-- 2. v_folders_with_counts — arborescence GED
-- ----------------------------------------------------------------------------
create or replace view public.v_folders_with_counts
with (security_invoker = true) as
select
  f.id,
  f.copro_id,
  f.parent_id,
  pf.name                                  as parent_name,
  f.name,
  f.description,
  f.icon,
  f.color,
  f.sort_order,
  f.is_system,
  f.category_default,
  (select count(*) from public.documents d
    where d.folder_id = f.id and d.status = 'active')::int      as document_count,
  (select count(*) from public.document_folders sf
    where sf.parent_id = f.id)::int                             as subfolder_count,
  f.created_by,
  f.created_at,
  f.updated_at
from public.document_folders f
left join public.document_folders pf on pf.id = f.parent_id;

comment on view public.v_folders_with_counts is
  'Dossiers GED + compteurs (documents actifs, sous-dossiers) — compat 5c8209e.';

-- ----------------------------------------------------------------------------
-- 3. v_recent_documents — widget « récents »
-- ----------------------------------------------------------------------------
create or replace view public.v_recent_documents
with (security_invoker = true) as
select
  d.id,
  d.copro_id,
  d.file_name,
  d.title,
  d.category,
  d.file_size,
  d.mime_type,
  case d.visibility
    when 'tous_coproprietaires' then 'public'
    when 'conseil'              then 'council'
    when 'gestionnaire_seul'    then 'manager'
  end                                      as confidentiality,
  d.folder_id,
  f.name                                   as folder_name,
  d.created_at,
  d.created_by,
  p.full_name                              as created_by_name
from public.documents d
left join public.document_folders f on f.id = d.folder_id
left join public.profiles p         on p.id = d.created_by
where d.status = 'active';

comment on view public.v_recent_documents is
  'Documents actifs pour le widget récents (le front trie/limite) — compat 5c8209e.';

-- ----------------------------------------------------------------------------
-- 4. v_documents_stats — KPIs GED par copro
-- ----------------------------------------------------------------------------
create or replace view public.v_documents_stats
with (security_invoker = true) as
select
  d.copro_id,
  count(*)::int                                                       as total_documents,
  count(*) filter (where d.category = 'pv_ag')::int                   as pv_ag_count,
  count(*) filter (where d.category = 'contrat')::int                 as contrat_count,
  count(*) filter (where d.category = 'facture')::int                 as facture_count,
  count(*) filter (where d.category = 'diagnostic')::int              as diagnostic_count,
  count(*) filter (where d.status = 'active')::int                    as active_count,
  count(*) filter (where d.status = 'archived')::int                  as archived_count,
  count(*) filter (where d.status = 'active'
                   and d.expiration_date is not null
                   and d.expiration_date <= current_date + interval '30 days')::int
                                                                      as expiring_soon_count,
  coalesce(sum(d.file_size), 0)::bigint                               as total_size_bytes,
  max(d.created_at)                                                   as last_document_date
from public.documents d
where d.status <> 'deleted'
group by d.copro_id;

comment on view public.v_documents_stats is
  'KPIs GED par copro (hors documents supprimés ; expiring_soon = actifs expirant sous 30 j) — compat 5c8209e.';

-- ----------------------------------------------------------------------------
-- 5. v_documents_by_category — répartition par catégorie
-- ----------------------------------------------------------------------------
create or replace view public.v_documents_by_category
with (security_invoker = true) as
select
  d.copro_id,
  d.category,
  count(*)::int                            as count,
  coalesce(sum(d.file_size), 0)::bigint    as total_size,
  max(d.created_at)                        as last_added
from public.documents d
where d.status = 'active'
group by d.copro_id, d.category;

comment on view public.v_documents_by_category is
  'Répartition des documents actifs par catégorie — compat 5c8209e.';

-- ----------------------------------------------------------------------------
-- 6. v_documents_expiring — documents actifs expirant sous 90 jours (40 col)
-- ----------------------------------------------------------------------------
create or replace view public.v_documents_expiring
with (security_invoker = true) as
select
  d.id,
  d.copro_id,
  d.folder_id,
  f.name                                   as folder_name,
  d.lot_id,
  d.coproprietaire_id,
  d.file_name,
  d.file_path,
  d.file_size,
  d.mime_type,
  d.file_hash,
  d.title,
  d.description,
  d.category,
  d.tags,
  d.document_date,
  d.year,
  d.status,
  case d.visibility
    when 'tous_coproprietaires' then 'public'
    when 'conseil'              then 'council'
    when 'gestionnaire_seul'    then 'manager'
  end                                      as confidentiality,
  d.source_module,
  d.current_version_no                     as version,
  true                                     as is_current_version,
  d.retention_years,
  d.expiration_date,
  (d.expiration_date - current_date)::int  as days_until_expiration,
  d.deletion_blocked,
  d.is_archived,
  d.archived_at,
  d.search_text,
  null::uuid                               as ag_id,
  null::uuid                               as contract_id,
  null::uuid                               as invoice_id,
  null::uuid                               as mutation_id,
  null::uuid                               as resolution_id,
  null::uuid                               as service_order_id,
  null::uuid                               as parent_document_id,
  null::uuid                               as dossier_id,
  d.created_by,
  d.created_at,
  d.updated_at
from public.documents d
left join public.document_folders f on f.id = d.folder_id
where d.status = 'active'
  and d.expiration_date is not null
  and d.expiration_date <= current_date + interval '90 days';

comment on view public.v_documents_expiring is
  'Documents actifs expirant sous 90 j + days_until_expiration — compat 5c8209e.';

-- ----------------------------------------------------------------------------
-- 7. pv_templates — templates de mise en page des PV (éditeur settings/templates)
-- ----------------------------------------------------------------------------
create table public.pv_templates (
  id                uuid         not null default gen_random_uuid(),
  -- NULL = template système global (lecture seule pour tous, écrit par service_role)
  copro_id          uuid         references public.copros(id) on delete cascade,
  name              text         not null,
  description       text,
  status            text         not null default 'draft',
  is_default        boolean      not null default false,
  is_system_template boolean     not null default false,
  spec              jsonb        not null default '{}'::jsonb,
  usage_count       integer      not null default 0,
  created_by        uuid         references public.profiles(id) on delete set null,
  last_modified_by  uuid         references public.profiles(id) on delete set null,
  created_at        timestamptz  not null default now(),
  updated_at        timestamptz  not null default now(),
  constraint pk_pv_templates           primary key (id),
  constraint ck_pv_templates_status    check (status in ('draft','active','archived')),
  -- un template système est global (sans copro) ; un template cabinet est rattaché
  constraint ck_pv_templates_scope     check (is_system_template = (copro_id is null))
);

create index idx_pv_templates_copro on public.pv_templates (copro_id);
-- un seul template par défaut actif par copro
create unique index uq_pv_templates_default
  on public.pv_templates (copro_id) where is_default and copro_id is not null;

create trigger trg_pv_templates_updated
  before update on public.pv_templates
  for each row execute function public.set_updated_at();

-- RLS classe A (collectif lecture / back-office écriture) — modèle 0034.
-- Lecture : membres de la copro + templates système globaux pour tout authentifié.
alter table public.pv_templates enable row level security;
create policy p_sel_access on public.pv_templates
  for select to authenticated
  using (
    (copro_id is not null and public.user_has_copro_access(copro_id))
    or (copro_id is null and is_system_template)
  );
create policy p_mgr_all on public.pv_templates
  as permissive for all to authenticated
  using (copro_id is not null and public.user_is_copro_manager(copro_id))
  with check (copro_id is not null and public.user_is_copro_manager(copro_id));

comment on table public.pv_templates is
  'Templates de mise en page des PV d''AG (spec jsonb) : système (copro_id NULL) ou par copro. Éditeur : settings/templates.';

-- Bascule env FAIL-SAFE (B1, registre central 0034) : ag_documents (0050, oubli
-- corrigé) et pv_templates sont désormais DANS la liste de apply_rls_environment()
-- (0034, protégés par to_regclass au rejeu). Ici les tables existent : on
-- re-applique la bascule → RLS ON sauf app.environment='development' explicite.
select public.apply_rls_environment();
