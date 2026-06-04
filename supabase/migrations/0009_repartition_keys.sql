-- 0009_repartition_keys.sql — cles de charges + poids lot×cle (01 §1.6-1.7)
-- Source : .planning/db-cible/01-copros-lots-personnes.md §1.6-1.7
-- Source unique des quotes-parts. Trigger tr_rkl_copro_consistency (key.copro = lot.copro = copro)

create table public.repartition_keys (
  id            uuid                not null default gen_random_uuid(),
  copro_id      uuid                not null references public.copros(id) on delete cascade,
  name          text                not null,
  basis         repartition_basis   not null,
  category      repartition_category not null default 'general',
  coverage_mode coverage_mode       not null default 'all_lots',
  description   text,
  is_active     boolean             not null default true,
  valid_from    date                not null default current_date,
  valid_to      date,
  created_at    timestamptz         not null default now(),
  constraint pk_repartition_keys primary key (id),
  constraint uq_key_copro_name unique (copro_id, name),
  constraint ck_key_validity check (valid_to is null or valid_to >= valid_from)
);
create index idx_keys_copro_active on public.repartition_keys (copro_id, is_active);

create table public.repartition_key_lines (
  id         uuid        not null default gen_random_uuid(),
  key_id     uuid        not null references public.repartition_keys(id) on delete cascade,
  lot_id     uuid        not null references public.lots(id) on delete cascade,
  copro_id   uuid        not null references public.copros(id) on delete cascade,
  weight     numeric(12,4) not null,
  created_at timestamptz not null default now(),
  constraint pk_repartition_key_lines primary key (id),
  constraint uq_rkl_key_lot unique (key_id, lot_id),
  constraint ck_rkl_weight check (weight >= 0)
);
create index idx_rkl_copro on public.repartition_key_lines (copro_id);
create index idx_rkl_key on public.repartition_key_lines (key_id);
create index idx_rkl_lot on public.repartition_key_lines (lot_id);

create or replace function public.tr_rkl_copro_consistency()
returns trigger language plpgsql as $$
begin
  if (select copro_id from public.repartition_keys where id = new.key_id) <> new.copro_id
     or (select copro_id from public.lots where id = new.lot_id) <> new.copro_id then
    raise exception 'rkl % : key/lot/copro incoherents', new.id using errcode='23514';
  end if;
  return new;
end;
$$;
create trigger trg_rkl_copro_consistency before insert or update on public.repartition_key_lines
  for each row execute function public.tr_rkl_copro_consistency();
revoke execute on function public.tr_rkl_copro_consistency() from public, anon, authenticated;
