-- 0010_coproprietaires_lot_owners.sql (01 §1.4-1.5) — user_id FK ajoutee en 0011
-- Source : .planning/db-cible/01-copros-lots-personnes.md §1.4-1.5
-- user_id cable (NULL au depart - R15/R16). FK coproprietaires.user_id -> profiles ajoutee en Task 11

create table public.coproprietaires (
  id            uuid        not null default gen_random_uuid(),
  copro_id      uuid        not null references public.copros(id) on delete cascade,
  user_id       uuid,  -- FK -> profiles ajoutee en 0011 (NULL tant que non invite)
  is_company    boolean     not null default false,
  company_name  text,
  civility      text,
  first_name    text,
  last_name     text,
  email         text,
  phone         text,
  mobile        text,
  address_line1 text,
  address_line2 text,
  city          text,
  postal_code   text,
  country       text        not null default 'France',
  prefers_email boolean     not null default true,
  prefers_paper boolean     not null default false,
  is_resident   boolean     not null default true,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint pk_coproprietaires primary key (id),
  constraint ck_copro_person_company check (is_company = (company_name is not null)),
  constraint ck_copro_email check (email is null or email ~* '^[^@]+@[^@]+\.[^@]+$')
);
create index idx_coproprietaires_copro on public.coproprietaires (copro_id);
create index idx_coproprietaires_email on public.coproprietaires (email);
create index idx_coproprietaires_name on public.coproprietaires (last_name, first_name);
create index idx_coproprietaires_user on public.coproprietaires (user_id) where user_id is not null;
create trigger trg_coproprietaires_updated before update on public.coproprietaires
  for each row execute function public.set_updated_at();

create table public.lot_owners (
  id                  uuid          not null default gen_random_uuid(),
  lot_id              uuid          not null references public.lots(id) on delete cascade,
  coproprietaire_id   uuid          not null references public.coproprietaires(id) on delete cascade,
  copro_id            uuid          not null references public.copros(id) on delete cascade,
  share_percent       numeric(6,3)  not null default 100,
  is_primary          boolean       not null default true,
  start_date          date          not null default current_date,
  end_date            date,
  created_at          timestamptz   not null default now(),
  constraint pk_lot_owners primary key (id),
  constraint ck_lo_share check (share_percent > 0 and share_percent <= 100),
  constraint ck_lo_dates check (end_date is null or end_date >= start_date),
  constraint uq_active_ownership unique (lot_id, coproprietaire_id, start_date)
);
create unique index uq_lot_primary_active on public.lot_owners (lot_id) where end_date is null and is_primary;
create index idx_lo_active on public.lot_owners (lot_id) where end_date is null;
create index idx_lo_copro_active on public.lot_owners (copro_id, end_date);
create index idx_lo_owner_active on public.lot_owners (coproprietaire_id, end_date);
create index idx_lo_lot_active on public.lot_owners (lot_id, end_date);
create index idx_lo_owner_primary on public.lot_owners (coproprietaire_id, is_primary);

-- integrite copro (lot + coproprietaire = meme copro)
create or replace function public.tr_lot_owner_copro_consistency()
returns trigger language plpgsql as $$
begin
  if (select copro_id from public.lots where id = new.lot_id) <> new.copro_id
     or (select copro_id from public.coproprietaires where id = new.coproprietaire_id) <> new.copro_id then
    raise exception 'lot_owner % : lot/coproprietaire/copro incoherents', new.id using errcode='23514';
  end if;
  return new;
end;
$$;
create trigger trg_lot_owner_copro_consistency before insert or update on public.lot_owners
  for each row execute function public.tr_lot_owner_copro_consistency();
revoke execute on function public.tr_lot_owner_copro_consistency() from public, anon, authenticated;

-- Σ share_percent des owners actifs d'un lot = 100 (A4 01 §7, indivision coherente)
create or replace function public.tr_lot_owner_shares_sum()
returns trigger language plpgsql as $$
declare v_lot uuid; v_sum numeric;
begin
  v_lot := coalesce(new.lot_id, old.lot_id);
  select coalesce(sum(share_percent),0) into v_sum
  from public.lot_owners where lot_id = v_lot and end_date is null;
  if v_sum > 100.0005 then
    raise exception 'lot % : Σ share_percent actifs (%) > 100', v_lot, v_sum using errcode='23514';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger trg_lot_owner_shares_sum after insert or update or delete on public.lot_owners
  for each row execute function public.tr_lot_owner_shares_sum();
revoke execute on function public.tr_lot_owner_shares_sum() from public, anon, authenticated;
