-- 0040 — RPC finalize_ag : classe définitivement une AG (statut 'finalized')
-- Préconditions : statut pv_signed/pv_sent ET toutes les décisions activées. Ne relance JAMAIS l'activation.
create or replace function public.finalize_ag(p_ag_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_copro         uuid;
  v_status        public.ag_status;
  v_not_activated int;
begin
  select m.copro_id, m.status into v_copro, v_status
  from public.ag_meetings m where m.id = p_ag_id;

  if v_copro is null then
    raise exception 'finalize_ag: AG % introuvable', p_ag_id using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_copro) then
    raise exception 'forbidden: gestionnaire requis pour finaliser l''AG %', p_ag_id using errcode = '42501';
  end if;

  -- idempotent : déjà finalisée
  if v_status = 'finalized' then
    return jsonb_build_object('success', true, 'ag_id', p_ag_id, 'status', 'finalized', 'message', 'AG déjà finalisée');
  end if;

  if v_status not in ('pv_signed', 'pv_sent') then
    raise exception 'finalize_ag: statut % invalide (attendu pv_signed ou pv_sent)', v_status using errcode = '23514';
  end if;

  select count(*) into v_not_activated
  from public.ag_pending_actions pa
  where pa.ag_id = p_ag_id and pa.status <> 'activated';

  if v_not_activated > 0 then
    raise exception 'finalize_ag: % décision(s) non activée(s) — finalisation impossible', v_not_activated using errcode = '23514';
  end if;

  update public.ag_meetings
  set status = 'finalized', updated_at = now()
  where id = p_ag_id;

  return jsonb_build_object('success', true, 'ag_id', p_ag_id, 'status', 'finalized');
end;
$$;

grant execute on function public.finalize_ag(uuid) to authenticated, service_role;
