-- ============================================================================
-- 0062 — RPC jalons AG (ag_milestones) : get_ag_milestones / save_ag_milestone
-- ----------------------------------------------------------------------------
-- Le front (useAGDelais, useAgEnvoiPage) appelle deux RPC FANTÔMES qui
-- n'existaient pas : get_ag_milestones(p_ag_id) et save_ag_milestone(...).
-- En l'absence des fonctions, les jalons « faits » n'étaient jamais persistés
-- (chargement silencieusement vide) et l'écriture échouait. On crée les deux
-- RPC sur la table réelle 0018 (colonnes : milestone_key text, due_date date,
-- done boolean — PAS milestone_type, PAS de colonne value jsonb).
--
-- MODÈLE D'ÉTAT : un jalon est soit présent+done=true (fait) soit absent/false
-- (à faire). Le STATUT métier (urgent / dépassé / fait) est DÉRIVÉ côté app à
-- partir de due_date + done ; on ne stocke AUCUN statut en base (cf. consigne).
-- Le flux envoi (useAgEnvoiPage) marque simplement le jalon 'sent' comme fait ;
-- son ancien payload jsonb {sentAt,totalSent,...} n'a pas de colonne de stockage
-- dans 0018 et n'est plus persisté (la présence de 'sent'/done suffit à l'UI).
--
-- UPSERT : 0018 ne portait AUCUNE contrainte unique sur (ag_id, milestone_key).
-- On ajoute l'index unique requis pour le ON CONFLICT (NULLs distincts : seules
-- les clés non-null sont upsertées, donc pas de collision sur les NULL).
--
-- SÉCURITÉ : security definer + garde cohérente avec les RPC AG (0050) :
--   is_service_call() OR user_is_copro_manager(copro de l'AG). La copro est
--   dérivée de ag_meetings (jamais passée par le client). grant execute aux
--   rôles authenticated/service_role.
-- ============================================================================

-- Index unique support de l'UPSERT (absent en 0018).
create unique index if not exists uq_ag_milestones_ag_key
  on public.ag_milestones (ag_id, milestone_key);

-- ----------------------------------------------------------------------------
-- get_ag_milestones — liste les jalons d'une AG (statut dérivé côté app)
-- ----------------------------------------------------------------------------
create or replace function public.get_ag_milestones(p_ag_id uuid)
returns table (
  id            uuid,
  milestone_key text,
  due_date      date,
  done          boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_copro uuid;
begin
  select m.copro_id into v_copro from public.ag_meetings m where m.id = p_ag_id;
  if v_copro is null then
    raise exception 'get_ag_milestones: AG % introuvable', p_ag_id using errcode = '23503';
  end if;
  if not public.is_service_call() and not public.user_is_copro_manager(v_copro) then
    raise exception 'forbidden: gestionnaire requis pour l''AG %', p_ag_id using errcode = '42501';
  end if;

  return query
    select ms.id, ms.milestone_key, ms.due_date, ms.done
    from public.ag_milestones ms
    where ms.ag_id = p_ag_id
    order by ms.due_date nulls last, ms.milestone_key;
end;
$$;
revoke execute on function public.get_ag_milestones(uuid) from public, anon;
grant  execute on function public.get_ag_milestones(uuid) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- save_ag_milestone — UPSERT d'un jalon (ag_id, milestone_key)
-- ----------------------------------------------------------------------------
-- p_done par défaut true : marquer un jalon « fait » est le cas d'usage du front
-- (marquerJalonComplete + flux envoi 'sent'). p_due_date optionnel (le front
-- calcule les dates ; ici on ne l'écrase QUE si fourni — coalesce).
create or replace function public.save_ag_milestone(
  p_ag_id         uuid,
  p_milestone_key text,
  p_done          boolean default true,
  p_due_date      date    default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_copro uuid;
  v_id    uuid;
begin
  if p_milestone_key is null or btrim(p_milestone_key) = '' then
    raise exception 'save_ag_milestone: milestone_key requis' using errcode = '22004';
  end if;

  select m.copro_id into v_copro from public.ag_meetings m where m.id = p_ag_id;
  if v_copro is null then
    raise exception 'save_ag_milestone: AG % introuvable', p_ag_id using errcode = '23503';
  end if;
  if not public.is_service_call() and not public.user_is_copro_manager(v_copro) then
    raise exception 'forbidden: gestionnaire requis pour l''AG %', p_ag_id using errcode = '42501';
  end if;

  insert into public.ag_milestones (ag_id, copro_id, milestone_key, due_date, done)
  values (p_ag_id, v_copro, p_milestone_key, p_due_date, coalesce(p_done, true))
  on conflict (ag_id, milestone_key) do update
    set done     = excluded.done,
        due_date = coalesce(excluded.due_date, public.ag_milestones.due_date)
  returning id into v_id;

  return v_id;
end;
$$;
revoke execute on function public.save_ag_milestone(uuid, text, boolean, date) from public, anon;
grant  execute on function public.save_ag_milestone(uuid, text, boolean, date) to authenticated, service_role;
