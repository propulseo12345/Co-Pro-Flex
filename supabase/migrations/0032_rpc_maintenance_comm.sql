-- ============================================================================================
-- 0032_rpc_maintenance_comm.sql — MAINTENANCE/TIERS + COMMUNICATION (tables 0021/0022/0015/0004)
-- Aucune table/enum/vue/RLS créée. Gardes 0023. RLS centralisée en 0034.
-- Conventions : cf. docs/superpowers/specs/2026-06-07-0032-maintenance-comm-design.md
-- ============================================================================================

-- PALIER 1 — cœur ordres de service ---------------------------------------------------------
create or replace function public.is_valid_service_order_transition(
  p_from service_order_status, p_to service_order_status
) returns boolean language sql immutable as $$
  select case p_from
    when 'draft'             then p_to in ('sent','cancelled')
    when 'sent'              then p_to in ('awaiting_provider','refused','cancelled')
    when 'awaiting_provider' then p_to in ('scheduled','refused','cancelled')
    when 'scheduled'         then p_to in ('in_progress','cancelled')
    when 'in_progress'       then p_to in ('completed','cancelled')
    when 'completed'         then p_to in ('closed','in_progress','cancelled')
    when 'refused'           then p_to in ('sent','cancelled')
    else false
  end;
$$;
revoke execute on function public.is_valid_service_order_transition(service_order_status, service_order_status) from public, anon;
grant  execute on function public.is_valid_service_order_transition(service_order_status, service_order_status) to authenticated, service_role;

create or replace function public.generate_service_order_number(p_copro_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_year text := to_char(current_date, 'YYYY'); v_seq int;
begin
  perform pg_advisory_xact_lock(hashtext(p_copro_id::text));
  select coalesce(max(substring(order_number from '(\d+)$')::int), 0) + 1
    into v_seq
  from public.service_orders
  where copro_id = p_copro_id and order_number like 'OS-' || v_year || '-%';
  return 'OS-' || v_year || '-' || lpad(v_seq::text, 4, '0');
end; $$;
revoke execute on function public.generate_service_order_number(uuid) from public, anon;
grant  execute on function public.generate_service_order_number(uuid) to authenticated, service_role;

create or replace function public.update_service_order_status(
  p_order_id uuid, p_new_status service_order_status,
  p_comment text default null, p_user_id uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_so   public.service_orders%rowtype;
  v_user uuid := coalesce(p_user_id, auth.uid());
  v_evt  service_order_event_type;
begin
  select * into v_so from public.service_orders where id = p_order_id for update;
  if not found then
    raise exception 'update_service_order_status: ordre de service % introuvable', p_order_id using errcode='23503';
  end if;
  if not public.is_service_call() and not public.user_is_copro_manager(v_so.copro_id) then
    raise exception 'forbidden: gestionnaire requis pour l''ordre de service %', p_order_id using errcode='42501';
  end if;
  if v_so.status = p_new_status then
    return jsonb_build_object('success', true, 'order_id', p_order_id, 'status', p_new_status, 'noop', true);
  end if;
  if not public.is_valid_service_order_transition(v_so.status, p_new_status) then
    raise exception 'update_service_order_status: transition interdite vers le statut %', p_new_status using errcode='23514';
  end if;

  update public.service_orders set
    status          = p_new_status,
    sent_at         = case when p_new_status='sent'              then coalesce(sent_at, now())         else sent_at end,
    acknowledged_at = case when p_new_status='awaiting_provider' then coalesce(acknowledged_at, now()) else acknowledged_at end,
    scheduled_at    = case when p_new_status='scheduled'         then coalesce(scheduled_at, now())    else scheduled_at end,
    started_at      = case when p_new_status='in_progress'       then coalesce(started_at, now())      else started_at end,
    completed_at    = case when p_new_status='completed'         then coalesce(completed_at, now())    else completed_at end,
    closed_at       = case when p_new_status='closed'            then coalesce(closed_at, now())       else closed_at end,
    refused_at      = case when p_new_status='refused'           then coalesce(refused_at, now())      else refused_at end,
    cancelled_at    = case when p_new_status='cancelled'         then coalesce(cancelled_at, now())    else cancelled_at end,
    refusal_reason  = case when p_new_status='refused'           then coalesce(p_comment, refusal_reason) else refusal_reason end
  where id = p_order_id;

  v_evt := case when p_new_status='sent'      then 'sent'::service_order_event_type
                when p_new_status='cancelled' then 'cancelled'::service_order_event_type
                else 'status_change'::service_order_event_type end;
  insert into public.service_order_events (copro_id, service_order_id, event_type, from_status, to_status, comment, created_by)
  values (v_so.copro_id, p_order_id, v_evt, v_so.status, p_new_status, p_comment, v_user);

  return jsonb_build_object('success', true, 'order_id', p_order_id, 'from', v_so.status, 'to', p_new_status);
end; $$;
revoke execute on function public.update_service_order_status(uuid, service_order_status, text, uuid) from public, anon;
grant  execute on function public.update_service_order_status(uuid, service_order_status, text, uuid) to authenticated, service_role;

create or replace function public.create_logbook_from_service_order(p_order_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_so public.service_orders%rowtype; v_existing uuid; v_status logbook_status; v_id uuid;
begin
  select * into v_so from public.service_orders where id = p_order_id for update;  -- sérialise les appels concurrents (idempotence)
  if not found then
    raise exception 'create_logbook_from_service_order: ordre de service % introuvable', p_order_id using errcode='23503';
  end if;
  if not public.is_service_call() and not public.user_is_copro_manager(v_so.copro_id) then
    raise exception 'forbidden: gestionnaire requis pour l''ordre de service %', p_order_id using errcode='42501';
  end if;
  select id into v_existing from public.logbook_entries where service_order_id = p_order_id order by created_at, id limit 1;
  if v_existing is not null then
    -- répare un éventuel back-link manquant (entrée carnet orpheline) puis renvoie l'existant
    update public.service_orders set logbook_entry_id = v_existing
      where id = p_order_id and logbook_entry_id is distinct from v_existing;
    return v_existing;
  end if;

  v_status := case when v_so.status in ('completed','closed') then 'terminee'::logbook_status else 'planifiee'::logbook_status end;
  insert into public.logbook_entries
    (copro_id, building_id, tiers_id, contract_id, service_order_id, entry_type, category, title, happened_at, completed_at, status, created_by)
  values
    (v_so.copro_id, v_so.building_id, v_so.tiers_id, v_so.contract_id, p_order_id,
     'intervention'::logbook_entry_type, 'courante'::intervention_category, v_so.title,
     coalesce(v_so.completed_at::date, current_date),
     case when v_status='terminee' then coalesce(v_so.completed_at::date, current_date) else null end,
     v_status, auth.uid())
  returning id into v_id;
  update public.service_orders set logbook_entry_id = v_id where id = p_order_id and logbook_entry_id is null;
  return v_id;
end; $$;
revoke execute on function public.create_logbook_from_service_order(uuid) from public, anon;
grant  execute on function public.create_logbook_from_service_order(uuid) to authenticated, service_role;

create or replace function public.delete_service_order(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_copro uuid;
begin
  select copro_id into v_copro from public.service_orders where id = p_order_id;
  if v_copro is null then
    raise exception 'delete_service_order: ordre de service % introuvable', p_order_id using errcode='23503';
  end if;
  if not public.is_service_call() and not public.user_is_copro_manager(v_copro) then
    raise exception 'forbidden: gestionnaire requis pour l''ordre de service %', p_order_id using errcode='42501';
  end if;
  delete from public.service_orders where id = p_order_id; -- service_order_events CASCADE ; logbook_entries / budget_payment_schedules / supplier_invoices / events.linked_service_order_id SET NULL (FK)
  return jsonb_build_object('success', true, 'deleted_order_id', p_order_id);
end; $$;
revoke execute on function public.delete_service_order(uuid) from public, anon;
grant  execute on function public.delete_service_order(uuid) to authenticated, service_role;

-- PALIER 2 — triggers maintenance ----------------------------------------------------------
create or replace function public.update_provider_stats()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_t uuid;
begin
  for v_t in
    select t from (values
      (case when tg_op <> 'DELETE' then new.tiers_id end),
      (case when tg_op <> 'INSERT' then old.tiers_id end)
    ) as s(t) where t is not null
    group by t
    order by t  -- ordre de verrouillage déterministe (anti-deadlock sur réassignation croisée de tiers_id)
  loop
    perform 1 from public.tiers where id = v_t for update;  -- sérialise les recalculs concurrents (anti lost-update)
    update public.tiers ti set
      interventions_count  = (select count(*)              from public.logbook_entries le where le.tiers_id = v_t),
      last_intervention_at = (select max(le.happened_at)::timestamptz from public.logbook_entries le where le.tiers_id = v_t)
    where ti.id = v_t;
  end loop;
  return case when tg_op='DELETE' then old else new end;
end; $$;
revoke execute on function public.update_provider_stats() from public, anon, authenticated;
-- insert/delete : toujours ; update : seulement si tiers_id ou happened_at change (évite recompute+verrou inutiles)
create trigger trg_update_provider_stats_ins_del
  after insert or delete on public.logbook_entries
  for each row execute function public.update_provider_stats();
create trigger trg_update_provider_stats_upd
  after update on public.logbook_entries
  for each row when (old.tiers_id is distinct from new.tiers_id or old.happened_at is distinct from new.happened_at)
  execute function public.update_provider_stats();

create or replace function public.update_contract_status_auto()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Statut DÉRIVÉ à l'écriture (pas de cron) : recalculé à chaque insert/update du contrat depuis les dates.
  -- Pour un reporting « actuellement expiré / à renouveler » fiable hors écriture, dériver de end_date (cf. lot vues).
  if new.status = 'terminated' then return new; end if;   -- résiliation manuelle préservée
  if new.end_date is not null and current_date > new.end_date then
    new.status := 'expired'::contract_status;
  elsif new.end_date is not null and current_date >= (new.end_date - make_interval(months => new.notice_months))::date then
    new.status := 'to_renew'::contract_status;
  elsif current_date >= new.start_date then
    new.status := 'active'::contract_status;
  else
    new.status := 'draft'::contract_status;
  end if;
  return new;
end; $$;
revoke execute on function public.update_contract_status_auto() from public, anon, authenticated;
create trigger trg_contract_status_auto
  before insert or update on public.contracts
  for each row execute function public.update_contract_status_auto();

-- tiers d'un contrat ∈ même copro
create or replace function public.tr_contract_tiers_copro_consistency()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_c uuid;
begin
  select copro_id into v_c from public.tiers where id = new.tiers_id;
  if v_c is distinct from new.copro_id then
    raise exception 'contract: tiers % hors copro', new.tiers_id using errcode='23514';
  end if;
  return new;
end; $$;
revoke execute on function public.tr_contract_tiers_copro_consistency() from public, anon, authenticated;
create trigger tr_contract_tiers_copro_consistency before insert or update on public.contracts
  for each row execute function public.tr_contract_tiers_copro_consistency();

-- OS : tiers (obligatoire) + contract + lot (si présents) ∈ même copro
create or replace function public.tr_so_copro_consistency()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_c uuid;
begin
  select copro_id into v_c from public.tiers where id = new.tiers_id;
  if v_c is distinct from new.copro_id then raise exception 'service_order: tiers % hors copro', new.tiers_id using errcode='23514'; end if;
  if new.contract_id is not null then
    select copro_id into v_c from public.contracts where id = new.contract_id;
    if v_c is distinct from new.copro_id then raise exception 'service_order: contrat % hors copro', new.contract_id using errcode='23514'; end if;
  end if;
  if new.lot_id is not null then
    select copro_id into v_c from public.lots where id = new.lot_id;
    if v_c is distinct from new.copro_id then raise exception 'service_order: lot % hors copro', new.lot_id using errcode='23514'; end if;
  end if;
  return new;
end; $$;
revoke execute on function public.tr_so_copro_consistency() from public, anon, authenticated;
create trigger tr_so_copro_consistency before insert or update on public.service_orders
  for each row execute function public.tr_so_copro_consistency();

-- police d'assurance : contrat ∈ même copro ET domaine 'assurance'
create or replace function public.tr_insurance_contract_copro_consistency()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_c uuid; v_dom uuid;
begin
  select copro_id, domain_id into v_c, v_dom from public.contracts where id = new.contract_id;
  if v_c is distinct from new.copro_id then
    raise exception 'insurance: contrat % hors copro', new.contract_id using errcode='23514';
  end if;
  if v_dom is distinct from (select id from public.work_domain where slug='assurance') then
    raise exception 'insurance: contrat % n''est pas un contrat assurance', new.contract_id using errcode='23514';
  end if;
  return new;
end; $$;
revoke execute on function public.tr_insurance_contract_copro_consistency() from public, anon, authenticated;
create trigger tr_insurance_contract_copro_consistency before insert or update on public.insurance_policies
  for each row execute function public.tr_insurance_contract_copro_consistency();

-- PALIER 3 — communication -----------------------------------------------------------------
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if not public.is_service_call() and not public.is_conversation_member(p_conversation_id, v_uid) then
    raise exception 'forbidden: non membre de la conversation %', p_conversation_id using errcode='42501';
  end if;
  update public.conversation_members set last_read_at = now(), unread_count = 0
    where conversation_id = p_conversation_id and user_id = v_uid;
  if v_uid is not null then
    -- perf : réécrit les messages non encore lus du fil ; à l'échelle, borner par last_read_at (cf. DEFERRED 0032)
    update public.messages set read_by = array_append(read_by, v_uid)
      where conversation_id = p_conversation_id and not (v_uid = any(read_by));
  end if;
end; $$;
revoke execute on function public.mark_conversation_read(uuid) from public, anon;
grant  execute on function public.mark_conversation_read(uuid) to authenticated, service_role;

create or replace function public.update_conversation_last_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations
    set last_message_at = new.created_at,
        last_message_preview = left(new.content, 140),
        updated_at = now()
    where id = new.conversation_id
      and (last_message_at is null or new.created_at >= last_message_at);  -- pas de régression sur insert antidaté
  update public.conversation_members
    set unread_count = unread_count + 1
    where conversation_id = new.conversation_id and left_at is null and user_id <> new.author_id;
  return new;
end; $$;
revoke execute on function public.update_conversation_last_message() from public, anon, authenticated;
create trigger trg_conversation_last_message after insert on public.messages
  for each row execute function public.update_conversation_last_message();

create or replace function public.update_wall_post_comments_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op='INSERT' then
    update public.wall_posts set comments_count = comments_count + 1 where id = new.post_id;
    return new;
  else
    update public.wall_posts set comments_count = greatest(0, comments_count - 1) where id = old.post_id;
    return old;
  end if;
end; $$;
revoke execute on function public.update_wall_post_comments_count() from public, anon, authenticated;
create trigger trg_wall_comments_count after insert or delete on public.wall_comments
  for each row execute function public.update_wall_post_comments_count();

create or replace function public.update_wall_post_likes_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op='INSERT' then
    update public.wall_posts set likes_count = likes_count + 1 where id = new.post_id;
    return new;
  else
    update public.wall_posts set likes_count = greatest(0, likes_count - 1) where id = old.post_id;
    return old;
  end if;
end; $$;
revoke execute on function public.update_wall_post_likes_count() from public, anon, authenticated;
create trigger trg_wall_likes_count after insert or delete on public.wall_likes
  for each row execute function public.update_wall_post_likes_count();

-- cohérence inter-copro : member / message (parent = conversations)
create or replace function public.tr_member_copro_consistency()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_c uuid;
begin
  select copro_id into v_c from public.conversations where id = new.conversation_id;
  if v_c is distinct from new.copro_id then
    raise exception 'conversation_member: conversation % hors copro', new.conversation_id using errcode='23514';
  end if;
  return new;
end; $$;
revoke execute on function public.tr_member_copro_consistency() from public, anon, authenticated;
create trigger tr_member_copro_consistency before insert or update on public.conversation_members
  for each row execute function public.tr_member_copro_consistency();

create or replace function public.tr_message_copro_consistency()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_c uuid;
begin
  select copro_id into v_c from public.conversations where id = new.conversation_id;
  if v_c is distinct from new.copro_id then
    raise exception 'message: conversation % hors copro', new.conversation_id using errcode='23514';
  end if;
  return new;
end; $$;
revoke execute on function public.tr_message_copro_consistency() from public, anon, authenticated;
create trigger tr_message_copro_consistency before insert or update on public.messages
  for each row execute function public.tr_message_copro_consistency();

-- cohérence inter-copro : comment / like (parent = wall_posts)
create or replace function public.tr_comment_copro_consistency()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_c uuid;
begin
  select copro_id into v_c from public.wall_posts where id = new.post_id;
  if v_c is distinct from new.copro_id then
    raise exception 'wall_comment: post % hors copro', new.post_id using errcode='23514';
  end if;
  return new;
end; $$;
revoke execute on function public.tr_comment_copro_consistency() from public, anon, authenticated;
create trigger tr_comment_copro_consistency before insert or update on public.wall_comments
  for each row execute function public.tr_comment_copro_consistency();

create or replace function public.tr_like_copro_consistency()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_c uuid;
begin
  select copro_id into v_c from public.wall_posts where id = new.post_id;
  if v_c is distinct from new.copro_id then
    raise exception 'wall_like: post % hors copro', new.post_id using errcode='23514';
  end if;
  return new;
end; $$;
revoke execute on function public.tr_like_copro_consistency() from public, anon, authenticated;
create trigger tr_like_copro_consistency before insert or update on public.wall_likes
  for each row execute function public.tr_like_copro_consistency();

-- cohérence inter-copro : event (liens AG / OS optionnels)
create or replace function public.tr_event_copro_consistency()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_c uuid;
begin
  if new.linked_ag_id is not null then
    select copro_id into v_c from public.ag_meetings where id = new.linked_ag_id;
    if v_c is distinct from new.copro_id then raise exception 'event: AG % hors copro', new.linked_ag_id using errcode='23514'; end if;
  end if;
  if new.linked_service_order_id is not null then
    select copro_id into v_c from public.service_orders where id = new.linked_service_order_id;
    if v_c is distinct from new.copro_id then raise exception 'event: OS % hors copro', new.linked_service_order_id using errcode='23514'; end if;
  end if;
  return new;
end; $$;
revoke execute on function public.tr_event_copro_consistency() from public, anon, authenticated;
create trigger tr_event_copro_consistency before insert or update on public.events
  for each row execute function public.tr_event_copro_consistency();

-- cohérence inter-copro : mail (réponse in_reply_to optionnelle)
create or replace function public.tr_mail_copro_consistency()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_c uuid;
begin
  if new.in_reply_to is not null then
    select copro_id into v_c from public.mails where id = new.in_reply_to;
    if v_c is distinct from new.copro_id then raise exception 'mail: reponse % hors copro', new.in_reply_to using errcode='23514'; end if;
  end if;
  return new;
end; $$;
revoke execute on function public.tr_mail_copro_consistency() from public, anon, authenticated;
create trigger tr_mail_copro_consistency before insert or update on public.mails
  for each row execute function public.tr_mail_copro_consistency();
