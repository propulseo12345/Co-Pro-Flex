-- ============================================================================================
-- 0033_rpc_ag_notif_transitoire.sql — ÎLE TRANSITOIRE notifications AG (tables 0018)
-- !!! TRANSITOIRE — fonctions à DROPER à l'ÉTAPE 3 (phase applicative) avec les 3 tables. JAMAIS en Phase 0. !!!
-- CIBLE-PURE (décision USER 2026-06-07) : calé sur les colonnes 0018 ; les edges (ag_send_convocations,
--   email_webhook) parlent à l'ancien schéma (notification_type/document_id/error_code/provider_message_id/
--   event_timestamp/raw_data/ip_address/user_agent supprimés ou renommés) → réécriture des edges = étape 3 différée.
-- Aucune table/enum/RLS. Gardes 0023. Conventions = 0030/0031/0032. RLS centralisée en 0034.
-- ============================================================================================

-- ------------------------------------------------------------
-- TRIGGER cohérence du copro_id DÉNORMALISÉ de ag_notification_events (différé de 0018:33-36)
-- ------------------------------------------------------------
-- TRANSITOIRE (DROP étape 3). Fonction DÉDIÉE (NE PAS réutiliser enforce_copro_consistency de 0030 :
--   son else rendrait le test tautologique = no-op silencieux pour une table parent-ligne).
-- BEFORE row-level : seul un BEFORE peut écrire NEW.copro_id (auto-remplissage de la dénormalisation).
-- Re-quête la ligne parente courante (leçon image figée) à chaque appel.
create or replace function public.tr_ag_notif_event_copro_consistency()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_parent uuid;
begin
  select copro_id into v_parent from public.ag_notifications where id = new.notification_id;
  if v_parent is null then
    raise exception 'ag_notification_event: notification % introuvable', new.notification_id using errcode = '23503';
  end if;
  if new.copro_id is null then
    new.copro_id := v_parent;                              -- dénormalisation auto-remplie
  elsif new.copro_id is distinct from v_parent then
    raise exception 'ag_notification_event: copro_id incoherent avec la notification %', new.notification_id using errcode = '23514';
  end if;
  return new;
end; $$;
revoke execute on function public.tr_ag_notif_event_copro_consistency() from public, anon, authenticated;
create trigger trg_ag_notif_event_copro_consistency
  before insert or update on public.ag_notification_events
  for each row execute function public.tr_ag_notif_event_copro_consistency();

-- ------------------------------------------------------------
-- create_ag_notification — crée une notification AG (écrite par l'edge ag_send_convocations). TRANSITOIRE.
-- ------------------------------------------------------------
-- copro_id DÉRIVÉ de l'AG (jamais saisi). status défaut 'queued'. G-MGR (garde APRÈS résolution du copro).
create or replace function public.create_ag_notification(
  p_ag_id            uuid,
  p_coproprietaire_id uuid                 default null,
  p_channel          notification_channel  default null,
  p_provider_ref     text                  default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_copro uuid; v_id uuid;
begin
  select copro_id into v_copro from public.ag_meetings where id = p_ag_id;
  if v_copro is null then
    raise exception 'create_ag_notification: AG % introuvable', p_ag_id using errcode = '23503';
  end if;
  if not public.is_service_call() and not public.user_is_copro_manager(v_copro) then
    raise exception 'forbidden: gestionnaire requis pour l''AG %', p_ag_id using errcode = '42501';
  end if;
  insert into public.ag_notifications (ag_id, copro_id, coproprietaire_id, channel, status, provider_ref)
  values (p_ag_id, v_copro, p_coproprietaire_id, p_channel, 'queued'::delivery_status, p_provider_ref)
  returning id into v_id;
  return v_id;
end; $$;
revoke execute on function public.create_ag_notification(uuid, uuid, notification_channel, text) from public, anon;
grant  execute on function public.create_ag_notification(uuid, uuid, notification_channel, text) to authenticated, service_role;

-- ------------------------------------------------------------
-- mark_notification_sent — callback succès provider. TRANSITOIRE. G-SVC strict (machine).
-- ------------------------------------------------------------
create or replace function public.mark_notification_sent(
  p_notification_id uuid,
  p_provider_ref    text  default null,
  p_event_payload   jsonb default '{}'::jsonb
)
returns void language plpgsql security definer set search_path = public as $$
declare v_copro uuid;
begin
  if not public.is_service_call() then
    raise exception 'forbidden: appel service requis (mark_notification_sent %)', p_notification_id using errcode = '42501';
  end if;
  update public.ag_notifications
     set status = 'sent'::delivery_status, sent_at = now(), provider_ref = coalesce(p_provider_ref, provider_ref)
   where id = p_notification_id
   returning copro_id into v_copro;
  if v_copro is null then
    raise exception 'mark_notification_sent: notification % introuvable', p_notification_id using errcode = '23503';
  end if;
  insert into public.ag_notification_events (notification_id, copro_id, event_type, payload, occurred_at)
  values (p_notification_id, v_copro, 'sent', coalesce(p_event_payload, '{}'::jsonb), now());
end; $$;
revoke execute on function public.mark_notification_sent(uuid, text, jsonb) from public, anon;
grant  execute on function public.mark_notification_sent(uuid, text, jsonb) to authenticated, service_role;

-- ------------------------------------------------------------
-- mark_notification_failed — callback échec provider. TRANSITOIRE. G-SVC strict.
-- ------------------------------------------------------------
create or replace function public.mark_notification_failed(
  p_notification_id uuid,
  p_error_message   text  default null,
  p_event_payload   jsonb default '{}'::jsonb
)
returns void language plpgsql security definer set search_path = public as $$
declare v_copro uuid;
begin
  if not public.is_service_call() then
    raise exception 'forbidden: appel service requis (mark_notification_failed %)', p_notification_id using errcode = '42501';
  end if;
  update public.ag_notifications
     set status = 'failed'::delivery_status, error_message = p_error_message
   where id = p_notification_id
   returning copro_id into v_copro;
  if v_copro is null then
    raise exception 'mark_notification_failed: notification % introuvable', p_notification_id using errcode = '23503';
  end if;
  insert into public.ag_notification_events (notification_id, copro_id, event_type, payload, occurred_at)
  values (p_notification_id, v_copro, 'failed', coalesce(p_event_payload, '{}'::jsonb), now());
end; $$;
revoke execute on function public.mark_notification_failed(uuid, text, jsonb) from public, anon;
grant  execute on function public.mark_notification_failed(uuid, text, jsonb) to authenticated, service_role;

-- ------------------------------------------------------------
-- get_ag_recipients — destinataires d'une notification AG (appelé front + edge). TRANSITOIRE. G-DEF-RO.
-- ------------------------------------------------------------
-- Destinataires = coproprietaires ACTIFS (≥1 lot_owners end_date NULL) de la copro de l'AG, AVEC OU SANS email :
-- la colonne email est renvoyée et l'appelant filtre selon le canal (email/registered_email exigent un email ;
-- postal/registered_postal/hand_delivery non — la convocation AG part souvent par recommandé papier). Liste multicanal.
-- p_only_missing exclut ceux déjà notifiés pour cette AG. p_notification_type ACCEPTÉ mais IGNORÉ
-- (pas de colonne 'type' en cible — param conservé pour compat appel front/edge transitoire).
create or replace function public.get_ag_recipients(
  p_ag_id            uuid,
  p_notification_type text    default null,
  p_only_missing     boolean default false
)
returns table (
  coproprietaire_id uuid,
  copro_id          uuid,
  full_name         text,
  email             text,
  is_company        boolean,
  already_notified  boolean
)
language plpgsql stable security definer set search_path = public as $$
declare v_copro uuid;
begin
  -- qualifier m.copro_id : la colonne OUT 'copro_id' (returns table) masque sinon la colonne de la table
  select m.copro_id into v_copro from public.ag_meetings m where m.id = p_ag_id;
  if v_copro is null then
    raise exception 'get_ag_recipients: AG % introuvable', p_ag_id using errcode = '23503';
  end if;
  if not public.is_service_call() and not public.user_has_copro_access(v_copro) then
    raise exception 'forbidden: acces copro requis pour l''AG %', p_ag_id using errcode = '42501';
  end if;
  return query
    select c.id, c.copro_id,
           case when c.is_company then coalesce(c.company_name, '')
                else trim(coalesce(c.first_name, '') || ' ' || coalesce(c.last_name, '')) end,
           c.email, c.is_company,
           exists (select 1 from public.ag_notifications n where n.ag_id = p_ag_id and n.coproprietaire_id = c.id)
    from public.coproprietaires c
    where c.copro_id = v_copro
      and exists (select 1 from public.lot_owners lo
                  where lo.coproprietaire_id = c.id and lo.copro_id = v_copro and lo.end_date is null)
      and (not p_only_missing
           or not exists (select 1 from public.ag_notifications n where n.ag_id = p_ag_id and n.coproprietaire_id = c.id))
    order by 3;
end; $$;
revoke execute on function public.get_ag_recipients(uuid, text, boolean) from public, anon;
grant  execute on function public.get_ag_recipients(uuid, text, boolean) to authenticated, service_role;
