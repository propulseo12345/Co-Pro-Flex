-- 0005_set_updated_at.sql — fonction trigger horodatage unique (INVENTAIRE §N)
-- Source : .planning/db-cible/INVENTAIRE.md §N (consolidation des ~11 variantes en UNE)

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
