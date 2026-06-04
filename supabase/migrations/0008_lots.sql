-- 0008_lots.sql — unite de gestion canonique, sans tantiemes_* (01 §1.3)
-- Source : .planning/db-cible/01-copros-lots-personnes.md §1.3
-- DROP des 4 tantiemes_* (dette #1) — la quote-part vit dans repartition_key_lines

create table public.lots (
  id          uuid        not null default gen_random_uuid(),
  copro_id    uuid        not null references public.copros(id) on delete cascade,
  building_id uuid        references public.buildings(id) on delete set null,
  ref         text        not null,
  type        lot_type    not null default 'appartement',
  floor       int2,
  surface     numeric(8,2),
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint pk_lots primary key (id),
  constraint uq_lots_copro_ref unique (copro_id, ref)
);
create index idx_lots_copro on public.lots (copro_id);
create index idx_lots_building on public.lots (building_id);
create trigger trg_lots_updated before update on public.lots
  for each row execute function public.set_updated_at();

-- integrite : si building_id renseigne, building.copro_id = lot.copro_id
create or replace function public.tr_lot_copro_consistency()
returns trigger language plpgsql as $$
begin
  if new.building_id is not null then
    if (select copro_id from public.buildings where id = new.building_id) <> new.copro_id then
      raise exception 'lot % : building_id appartient a une autre copro', new.id using errcode='23514';
    end if;
  end if;
  return new;
end;
$$;
create trigger trg_lot_copro_consistency before insert or update on public.lots
  for each row execute function public.tr_lot_copro_consistency();
revoke execute on function public.tr_lot_copro_consistency() from public, anon, authenticated;
