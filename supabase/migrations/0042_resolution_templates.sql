-- 0042_resolution_templates.sql — banque de résolutions AG éditable (système / cabinet / copro).
-- Spec : docs/superpowers/specs/2026-06-09-banque-resolutions-editable-design.md
-- Calque email_templates (0016). cabinet_id NULL = système. copro_id = propre à une copro.

create table public.resolution_templates (
  id                uuid        not null default gen_random_uuid(),
  cabinet_id        uuid                 references public.cabinets(id) on delete cascade,
  copro_id          uuid                 references public.copros(id)   on delete cascade,
  code              text,
  titre             text        not null,
  categorie         text        not null,
  texte             text        not null,
  majorite          text        not null,
  is_information     boolean     not null default false,
  applicable_ag     text[],
  obligatoire_pour  text[]      not null default '{}',
  ordre_suggere     int,
  tags              text[]      not null default '{}',
  variables         text[]      not null default '{}',
  variables_typees  jsonb       not null default '[]'::jsonb,
  scope             text        not null default 'system',
  status            text        not null default 'active',
  legal_ref         text,
  version           text        not null default '1.0',
  deprecated_by     uuid                 references public.resolution_templates(id) on delete set null,
  action_type       text,
  usage_count       int         not null default 0,
  created_by        uuid                 references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint pk_resolution_templates primary key (id),
  constraint ck_resolution_template_scope  check ((cabinet_id is null) = (scope = 'system')),
  constraint ck_resolution_template_copro  check (copro_id is null or cabinet_id is not null),
  constraint ck_resolution_template_code   check ((cabinet_id is null and code is not null) or (cabinet_id is not null and code is null)),
  constraint ck_resolution_template_majorite check (majorite in ('ART_24','ART_25','ART_25_1','ART_26','ART_26_1','UNANIMITE','INFORMATION')),
  constraint ck_resolution_template_scope_vals check (scope in ('system','org')),
  constraint ck_resolution_template_status check (status in ('active','deprecated','draft')),
  constraint ck_resolution_template_categorie check (categorie in (
    'Assemblée Générale','Travaux','Finances','Conseil syndical et syndic','Contrats',
    'Action en justice','Impayés','Modification du règlement','Compteurs',
    'Règles de bonne conduite','Sécurité et conformité','Énergie et environnement',
    'Parking et espaces communs','Assurances','Copropriétaires','Divers'
  ))
);

create unique index uq_resolution_templates_code_system
  on public.resolution_templates (code) where cabinet_id is null;
create index idx_resolution_templates_cabinet_copro on public.resolution_templates (cabinet_id, copro_id);
create index idx_resolution_templates_categorie     on public.resolution_templates (categorie);
create index idx_resolution_templates_scope_status  on public.resolution_templates (scope, status);

create trigger trg_resolution_templates_updated
  before update on public.resolution_templates
  for each row execute function public.set_updated_at();

-- Trigger : une copro référencée doit appartenir au cabinet propriétaire.
create or replace function public.enforce_template_copro_cabinet()
returns trigger language plpgsql as $$
begin
  if NEW.copro_id is not null then
    if not exists (
      select 1 from public.copros c where c.id = NEW.copro_id and c.cabinet_id = NEW.cabinet_id
    ) then
      raise exception 'resolution_templates: copro_id % n''appartient pas au cabinet %', NEW.copro_id, NEW.cabinet_id;
    end if;
  end if;
  return NEW;
end $$;
create trigger trg_resolution_templates_copro_cabinet
  before insert or update on public.resolution_templates
  for each row execute function public.enforce_template_copro_cabinet();

-- Helper RLS cabinet (calqué sur user_is_copro_manager, 0023). Le gestionnaire pilote SON cabinet.
create or replace function public.user_is_cabinet_manager(p_cabinet_id uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  if public.user_is_platform_admin() then return true; end if;
  return exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.cabinet_id = p_cabinet_id
  );
end $$;
revoke execute on function public.user_is_cabinet_manager(uuid) from public, anon;
grant execute on function public.user_is_cabinet_manager(uuid) to authenticated, service_role;

-- Policies (classe hybride système/cabinet). Système = lecture publique authentifiée ; écriture = cabinet.
alter table public.resolution_templates enable row level security;
create policy p_sel_restpl on public.resolution_templates
  for select to authenticated
  using (cabinet_id is null or public.user_is_cabinet_manager(cabinet_id));
create policy p_ins_restpl on public.resolution_templates
  for insert to authenticated
  with check (cabinet_id is not null and public.user_is_cabinet_manager(cabinet_id));
create policy p_upd_restpl on public.resolution_templates
  for update to authenticated
  using (cabinet_id is not null and public.user_is_cabinet_manager(cabinet_id))
  with check (cabinet_id is not null and public.user_is_cabinet_manager(cabinet_id));
create policy p_del_restpl on public.resolution_templates
  for delete to authenticated
  using (cabinet_id is not null and public.user_is_cabinet_manager(cabinet_id));

-- Bascule env (OFF en dev, comme 0034). RLS active uniquement en production.
do $$
begin
  if current_setting('app.environment', true) = 'production' then
    execute 'alter table public.resolution_templates enable row level security';
  else
    execute 'alter table public.resolution_templates disable row level security';
  end if;
end $$;
