-- 0006_cabinets.sql — tenant racine multi-cabinet (01 §1.0)
-- Source : .planning/db-cible/01-copros-lots-personnes.md §1.0

create table public.cabinets (
  id            uuid        not null default gen_random_uuid(),
  name          text        not null,
  siret         text,
  email         text,
  phone         text,
  address_line1 text,
  address_line2 text,
  city          text,
  postal_code   text,
  country       text        not null default 'France',
  is_active     boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint pk_cabinets primary key (id),
  constraint ck_cabinet_email check (email is null or email ~* '^[^@]+@[^@]+\.[^@]+$')
);
create index idx_cabinets_name on public.cabinets (name);
create trigger trg_cabinets_updated before update on public.cabinets
  for each row execute function public.set_updated_at();
