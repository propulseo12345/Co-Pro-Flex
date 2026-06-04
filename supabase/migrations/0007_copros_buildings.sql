-- 0007_copros_buildings.sql — copros sous cabinet + buildings (01 §1.1-1.2)
-- Source : .planning/db-cible/01-copros-lots-personnes.md §1.1-1.2
-- cabinet_id FK NOT NULL (A12), sans compteurs morts (lots_count/total_tantiemes/buildings_count)

create table public.copros (
  id                  uuid        not null default gen_random_uuid(),
  cabinet_id          uuid        not null references public.cabinets(id) on delete restrict,
  name                text        not null,
  address             text,
  city                text,
  postal_code         text,
  siret               text,
  num_immatriculation text,
  date_reglement      date,
  annee_construction  int2,
  exercice_debut      int2        not null default 1,
  onboarding_step     int2        default 0,
  onboarding_max_step int2,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint pk_copros primary key (id),
  constraint ck_copro_exercice_mois check (exercice_debut between 1 and 12),
  constraint ck_copro_annee check (annee_construction is null or (annee_construction between 1700 and extract(year from now())::int + 5))
);
create index idx_copros_cabinet on public.copros (cabinet_id);
create index idx_copros_name on public.copros (name);
create trigger trg_copros_updated before update on public.copros
  for each row execute function public.set_updated_at();

create table public.buildings (
  id                uuid        not null default gen_random_uuid(),
  copro_id          uuid        not null references public.copros(id) on delete cascade,
  name              text        not null,
  address           text,
  floors_count      int2        default 1,
  construction_year int2,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint pk_buildings primary key (id),
  constraint ck_building_annee check (construction_year is null or (construction_year between 1700 and extract(year from now())::int + 5))
);
create index idx_buildings_copro_id on public.buildings (copro_id);
create trigger trg_buildings_updated before update on public.buildings
  for each row execute function public.set_updated_at();
