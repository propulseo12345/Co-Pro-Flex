-- 0039 — RPC lecture des décisions d'une AG (page Finalisation = revue lecture seule)
create or replace function public.get_ag_pending_actions(p_ag_id uuid)
returns table (
  id uuid,
  ag_id uuid,
  resolution_id uuid,
  resolution_title text,
  resolution_variables jsonb,
  action_type public.ag_action_type,
  target_table text,
  target_id uuid,
  payload jsonb,
  status text,
  error_message text,
  activated_at timestamptz,
  result_data jsonb,
  created_at timestamptz
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
    raise exception 'get_ag_pending_actions: AG % introuvable', p_ag_id using errcode = '23503';
  end if;
  if not public.is_service_call() and not public.user_has_copro_access(v_copro) then
    raise exception 'forbidden: accès copropriété requis' using errcode = '42501';
  end if;

  return query
    select pa.id, pa.ag_id, pa.resolution_id,
           r.title       as resolution_title,
           r.variables   as resolution_variables,
           pa.action_type, pa.target_table, pa.target_id, pa.payload,
           pa.status, pa.error_message, pa.activated_at, pa.result_data, pa.created_at
    from public.ag_pending_actions pa
    left join public.ag_resolutions r on r.id = pa.resolution_id
    where pa.ag_id = p_ag_id
    order by pa.created_at;
end;
$$;

revoke execute on function public.get_ag_pending_actions(uuid) from public, anon;
grant execute on function public.get_ag_pending_actions(uuid) to authenticated, service_role;
