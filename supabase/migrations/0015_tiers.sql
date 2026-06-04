-- 0015_tiers.sql — entite fusionnee tiers (fournisseurs + prestataires + notaires)
-- Source : .planning/db-cible/07-maintenance-tiers.md §1.1 (table tiers), §1.13 (vue tiers_directory)
-- Source : docs/superpowers/plans/2026-06-04-phase0-db-rebaseline.md Task 14
-- Pivot consomme par finance (supplier_invoices, period_cutoff_items) ET maintenance
-- (contracts, service_orders, logbook_entries).
-- FK retroactive : period_cutoff_items.tiers_id -> tiers ajoutee ici (annonce dans 0013).
-- Tables tiers-dependantes (contracts, service_orders, etc.) creees en 0021+ (domaine maintenance).

-- ============================================================
-- 1. table tiers + index + trigger updated_at
-- ============================================================

create table public.tiers (
  id                     uuid          not null default gen_random_uuid(),
  copro_id               uuid          not null references public.copros(id) on delete cascade,
  name                   text          not null,
  is_supplier            boolean       not null default false,
  is_provider            boolean       not null default false,
  is_notary              boolean       not null default false,
  category               tiers_category not null default 'externe',
  domain_ids             uuid[]        not null default '{}',
  siret                  text,
  vat_number             text,
  iban                   text,
  bic                    text,
  office_name            text,
  notary_reference       text,
  contact_name           text,
  contact_role           text,
  email                  text,
  phone                  text,
  phone_emergency        text,
  address                text,
  postal_code            text,
  city                   text,
  rating_avg             numeric(2,1),
  rating_count           integer       not null default 0,
  interventions_count    integer       not null default 0,
  last_intervention_at   timestamptz,
  intervention_radius_km integer,
  certifications         text[]        not null default '{}',
  description            text,
  availability           text,
  internal_notes         text,
  is_active              boolean       not null default true,
  created_at             timestamptz   not null default now(),
  updated_at             timestamptz   not null default now(),
  constraint pk_tiers         primary key (id),
  constraint uq_tiers_name    unique (copro_id, name),
  constraint ck_tiers_rating  check (rating_avg is null or rating_avg between 0 and 5),
  constraint ck_tiers_role    check (is_supplier or is_provider or is_notary),
  constraint ck_tiers_siret   check (siret is null or siret ~ '^[0-9]{14}$')
);

create index idx_tiers_copro    on public.tiers (copro_id);
create index idx_tiers_active   on public.tiers (copro_id, is_active);
create index idx_tiers_category on public.tiers (copro_id, category);
create index idx_tiers_domains  on public.tiers using gin (domain_ids);
create index idx_tiers_supplier on public.tiers (copro_id) where is_supplier;
create index idx_tiers_provider on public.tiers (copro_id) where is_provider;
create index idx_tiers_notary   on public.tiers (copro_id) where is_notary;

create trigger trg_tiers_updated before update on public.tiers
  for each row execute function public.set_updated_at();

-- ============================================================
-- 2. fonction check_tiers_domain_ids + trigger + revoke
-- ============================================================
-- Integrite referentielle des tableau uuid[] :
-- chaque domain_id doit exister dans public.work_domain.
-- PG ne supporte pas les FK sur les colonnes tableau ;
-- ce trigger compense ce manque (equivalent CHECK FK array).

create or replace function public.check_tiers_domain_ids()
returns trigger language plpgsql as $$
declare d uuid;
begin
  foreach d in array new.domain_ids loop
    if not exists (select 1 from public.work_domain where id = d) then
      raise exception 'tiers % : domain_id % absent de work_domain', new.id, d using errcode='23503';
    end if;
  end loop;
  return new;
end;
$$;

create trigger trg_check_tiers_domain_ids before insert or update on public.tiers
  for each row execute function public.check_tiers_domain_ids();

revoke execute on function public.check_tiers_domain_ids() from public, anon, authenticated;

-- ============================================================
-- 3. vue tiers_directory — annuaire prestataires coproprietaire
-- ============================================================
-- Expose uniquement les colonnes publiques (identite + metier).
-- Colonnes masquees : iban, bic, siret, internal_notes, phone_emergency,
--   interventions_count, office_name, notary_reference, availability.
-- Filtre is_notary = false : les notaires n'apparaissent jamais
--   dans l'annuaire (donnee de mutation, sensible).
-- security_invoker = true : la vue herite des policies RLS de tiers
--   (cloisonnement copro/cabinet porte par la table sous-jacente).

create view public.tiers_directory with (security_invoker = true) as
select id,
       copro_id,
       name,
       category,
       domain_ids,
       vat_number,
       contact_name,
       contact_role,
       email,
       phone,
       address,
       postal_code,
       city,
       rating_avg,
       rating_count,
       certifications,
       description,
       is_active
from public.tiers
where is_notary = false;

-- ============================================================
-- 4. FK retroactive period_cutoff_items.tiers_id -> tiers
-- ============================================================
-- period_cutoff_items cree dans 0013_ledger.sql avec tiers_id uuid nullable.
-- La FK n'etait pas posable a ce moment (tiers n'existait pas encore).
-- on delete set null : la suppression d'un tiers n'invalide pas le cut-off.

alter table public.period_cutoff_items
  add constraint fk_cutoff_tiers
    foreign key (tiers_id)
    references public.tiers(id)
    on delete set null;
