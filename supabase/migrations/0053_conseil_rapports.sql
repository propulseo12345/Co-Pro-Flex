-- ============================================================================
-- 0053 — Conseil syndical (J2-bis lot 5) : rapports d'activité du CS
-- ----------------------------------------------------------------------------
-- La feature rapport CS (page conseil-syndical + éditeur rapport/[id]) tournait
-- sur un service 100 % MOCK (rapports en mémoire, perdus au rechargement) ; la
-- liste lisait council_documents avec une colonne fantôme (document_type).
-- On crée la persistance réelle : 1 rapport (HTML + texte brut), N sections
-- ordonnées, N annexes. Colonnes CANONIQUES (anglais, copro_id) — le service
-- front mappe vers son API camelCase ; valeurs de statut FRANÇAISES conservées
-- (enum métier affiché tel quel par l'UI).
-- RLS classe A (modèle 0034) : lecture collective, écriture gestionnaire.
-- NOTE MÉTIER (différé portail J3) : à terme les MEMBRES du conseil doivent
-- pouvoir rédiger — nécessitera une policy council_members (pas de helper
-- user-level aujourd'hui côté écriture).
-- ============================================================================

create table public.rapports_activite_cs (
  id            uuid         not null default gen_random_uuid(),
  copro_id      uuid         not null references public.copros(id) on delete cascade,
  author_id     uuid         references public.profiles(id) on delete set null,
  period_start  date         not null,
  period_end    date         not null,
  title         text         not null,
  introduction  text         not null default '',
  content       text         not null default '',  -- HTML de l'éditeur
  content_text  text         not null default '',  -- texte brut (recherche/PV)
  status        text         not null default 'brouillon',
  ag_id         uuid         references public.ag_meetings(id) on delete set null,
  resolution_id uuid         references public.ag_resolutions(id) on delete set null,
  validated_by  uuid         references public.profiles(id) on delete set null,
  validated_at  timestamptz,
  created_at    timestamptz  not null default now(),
  updated_at    timestamptz  not null default now(),
  constraint pk_rapports_activite_cs primary key (id),
  constraint ck_rapports_cs_status  check (status in ('brouillon','en_revision','valide','publie','archive')),
  constraint ck_rapports_cs_period  check (period_end >= period_start),
  -- cible des FK composites des enfants : garantit rapport.copro = enfant.copro
  constraint uq_rapports_cs_id_copro unique (id, copro_id)
);
create index idx_rapports_cs_copro on public.rapports_activite_cs (copro_id);
create index idx_rapports_cs_ag    on public.rapports_activite_cs (ag_id);
-- un SEUL rapport publié par AG (le compte rendu annexé à la convocation/PV)
create unique index uq_rapports_cs_ag_publie
  on public.rapports_activite_cs (ag_id) where status = 'publie';
create trigger trg_rapports_cs_updated
  before update on public.rapports_activite_cs
  for each row execute function public.set_updated_at();

create table public.sections_rapport_cs (
  id          uuid         not null default gen_random_uuid(),
  copro_id    uuid         not null references public.copros(id) on delete cascade,
  rapport_id  uuid         not null,
  sort_order  integer      not null default 0,
  title       text         not null,
  content     text         not null default '',
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now(),
  constraint pk_sections_rapport_cs primary key (id),
  -- FK COMPOSITE : impossible d'attacher une section d'une copro X à un rapport
  -- d'une copro Y (la RLS WITH CHECK ne valide que le copro_id de l'enfant)
  constraint fk_sections_cs_rapport foreign key (rapport_id, copro_id)
    references public.rapports_activite_cs (id, copro_id) on delete cascade
);
create index idx_sections_cs_rapport on public.sections_rapport_cs (rapport_id);
create trigger trg_sections_cs_updated
  before update on public.sections_rapport_cs
  for each row execute function public.set_updated_at();

create table public.annexes_rapport_cs (
  id                uuid         not null default gen_random_uuid(),
  copro_id          uuid         not null references public.copros(id) on delete cascade,
  rapport_id        uuid         not null,
  name              text         not null,
  description       text,
  kind              text         not null default 'document',
  file_url          text,
  file_name         text,
  file_size         bigint,
  embedded_content  text,
  sort_order        integer      not null default 0,
  created_at        timestamptz  not null default now(),
  constraint pk_annexes_rapport_cs primary key (id),
  constraint ck_annexes_cs_kind check (kind in ('document','image','tableau')),
  constraint fk_annexes_cs_rapport foreign key (rapport_id, copro_id)
    references public.rapports_activite_cs (id, copro_id) on delete cascade
);
create index idx_annexes_cs_rapport on public.annexes_rapport_cs (rapport_id);

-- RLS classe A (collectif lecture / back-office écriture) — modèle 0034.
alter table public.rapports_activite_cs enable row level security;
create policy p_sel_access on public.rapports_activite_cs
  for select to authenticated
  using (public.user_has_copro_access(copro_id));
create policy p_mgr_all on public.rapports_activite_cs
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

alter table public.sections_rapport_cs enable row level security;
create policy p_sel_access on public.sections_rapport_cs
  for select to authenticated
  using (public.user_has_copro_access(copro_id));
create policy p_mgr_all on public.sections_rapport_cs
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

alter table public.annexes_rapport_cs enable row level security;
create policy p_sel_access on public.annexes_rapport_cs
  for select to authenticated
  using (public.user_has_copro_access(copro_id));
create policy p_mgr_all on public.annexes_rapport_cs
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

comment on table public.rapports_activite_cs is
  'Rapports d''activité du conseil syndical (art. 21) : contenu HTML + sections ordonnées + annexes. Statuts FR (brouillon→en_revision→valide→publie→archive).';

-- Bascule env FAIL-SAFE (B1, registre central 0034) : les 3 tables sont
-- désormais DANS la liste de apply_rls_environment() (0034, protégées par
-- to_regclass au rejeu). Ici elles existent : on ré-applique la bascule.
select public.apply_rls_environment();
