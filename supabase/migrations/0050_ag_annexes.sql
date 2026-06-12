-- ============================================================================
-- 0050 — AG annexes : feuille de présence, votes détaillés, brouillons,
--        correspondance, documents générés, stats notifications
-- ============================================================================
-- J2-bis lot 2. Méthode 0047/0049 : VUES DE COMPATIBILITÉ au contrat STRICT de
-- l'ancien types committé (5c8209e) quand il existe ; sinon contrat = le type
-- front réel (AgDocument, AgNotificationStats — objets nés en live APRÈS
-- 5c8209e, jamais committés).
--
-- Périmètre tranché 2026-06-12 (appelants front RÉELS, audités) :
--   - 6 vues + table ag_documents + RPC register_ag_document + delete_ag_draft
--     + colonne ag_notifications.notification_type.
--   - NON CRÉÉS (zéro appelant = morts) : get/save_ag_milestone(s),
--     get/save/update/delete_ag_pouvoir(s)/justificatif, get/save_ag_envoi_choices.
--     Pouvoirs = ag_attendance.presence_type 'proxy' + represented_by_* ;
--     envoi = ag_envoi_tracking ; jalons = ag_milestones (0018, transitoire).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table ag_documents — registre des documents générés (convocation/feuille/PV)
-- ----------------------------------------------------------------------------
-- Alimentée par register_ag_document (appelée par l'edge ag_generate_document,
-- qui TOLÈRE l'échec d'enregistrement : le drift est resté invisible jusqu'ici).
create table public.ag_documents (
  id                   uuid         not null default gen_random_uuid(),
  copro_id             uuid         not null references public.copros(id) on delete cascade,
  ag_id                uuid         not null references public.ag_meetings(id) on delete cascade,
  doc_type             text         not null,
  storage_path         text         not null,
  file_name            text         not null,
  file_size            bigint,
  version              integer      not null default 1,
  generated_at         timestamptz  not null default now(),
  generated_by         uuid         references public.profiles(id) on delete set null,
  generation_metadata  jsonb        not null default '{}'::jsonb,
  document_id          uuid         references public.documents(id) on delete set null,
  retention_until      timestamptz,
  constraint pk_ag_documents          primary key (id),
  constraint uq_ag_documents_version  unique (ag_id, doc_type, version),
  constraint ck_ag_documents_type     check (doc_type in ('convocation','attendance_sheet','pv'))
);
create index idx_ag_documents_ag    on public.ag_documents (ag_id);
create index idx_ag_documents_copro on public.ag_documents (copro_id);

-- RLS classe A (collectif lecture / back-office écriture) — modèle 0034.
alter table public.ag_documents enable row level security;
create policy p_sel_access on public.ag_documents
  for select to authenticated
  using (public.user_has_copro_access(copro_id));
create policy p_mgr_all on public.ag_documents
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- ----------------------------------------------------------------------------
-- 2. ag_notifications.notification_type — distinction convocation / relance / pv
-- ----------------------------------------------------------------------------
-- Le front lit cette colonne sur la TABLE (useAgNotifications) ET via la vue
-- stats. L'edge ag_send_convocations ne la renseigne pas → default 'convocation'.
alter table public.ag_notifications
  add column notification_type text not null default 'convocation';
alter table public.ag_notifications
  add constraint ck_ag_notifications_type
  check (notification_type in ('convocation','relance','pv'));

-- ----------------------------------------------------------------------------
-- 3. Vue : feuille de présence enrichie
-- ----------------------------------------------------------------------------
create or replace view public.v_ag_attendance_summary
with (security_invoker = true) as
select
  a.id,
  a.ag_id,
  m.title         as ag_title,
  m.meeting_date  as ag_date,
  a.copro_id,
  a.coproprietaire_id,
  case when co.is_company then co.company_name
       else trim(coalesce(co.first_name, '') || ' ' || coalesce(co.last_name, '')) end as owner_name,
  co.email        as owner_email,
  a.lot_ids,
  (select array_agg(l.ref order by l.ref)
     from public.lots l
    where l.id = any(a.lot_ids)) as lot_refs,
  a.tantiemes,
  a.presence_type,
  a.represented_by_name,
  a.signed,
  a.signed_at,
  a.arrived_at,
  a.left_at,
  a.created_at
from public.ag_attendance a
join public.ag_meetings m       on m.id = a.ag_id
join public.coproprietaires co  on co.id = a.coproprietaire_id;

comment on view public.v_ag_attendance_summary is
  'Feuille de présence enrichie (noms, lots, tantièmes par présence) — contrat compat 5c8209e ; consommée aussi par l''edge ag_generate_document.';

-- ----------------------------------------------------------------------------
-- 4. Vue : votes détaillés par résolution
-- ----------------------------------------------------------------------------
create or replace view public.v_ag_votes_detailed
with (security_invoker = true) as
select
  v.id            as vote_id,
  v.resolution_id,
  r.ag_id,
  m.title         as ag_title,
  m.meeting_date,
  v.copro_id,
  v.coproprietaire_id,
  case when co.is_company then co.company_name
       else trim(coalesce(co.first_name, '') || ' ' || coalesce(co.last_name, '')) end as voter_name,
  r.resolution_number,
  r.title         as resolution_title,
  r.majority_type,
  v.vote,
  v.vote_source,
  v.tantiemes,
  v.is_excluded,
  v.exclusion_reason,
  v.created_at
from public.ag_votes v
join public.ag_resolutions r    on r.id = v.resolution_id
join public.ag_meetings m       on m.id = r.ag_id
join public.coproprietaires co  on co.id = v.coproprietaire_id;

comment on view public.v_ag_votes_detailed is
  'Votes nominatifs détaillés (résolution, votant, tantièmes, source live/correspondance) — contrat compat 5c8209e (labels for/against/abstention inchangés).';

-- ----------------------------------------------------------------------------
-- 5. Vue : progression des brouillons d'AG (wizard)
-- ----------------------------------------------------------------------------
create or replace view public.v_ag_drafts_progress
with (security_invoker = true) as
select
  m.id            as ag_id,
  m.copro_id,
  m.title,
  m.meeting_type,
  m.meeting_date,
  m.location,
  m.status,
  m.current_step,
  m.max_step_reached,
  m.step_data,
  m.wizard_mode,
  m.created_at,
  m.updated_at,
  res.resolutions_count,
  res.votes_count,
  att.attendance_count,
  (res.resolutions_count > 0) as has_resolutions,
  (res.votes_count > 0)       as has_votes,
  (att.attendance_count > 0)  as has_attendance,
  -- Wizard à 7 étapes (création → finalisation) : approximation d'avancement
  -- basée sur la dernière étape atteinte. À challenger côté métier si besoin.
  round(least(coalesce(m.max_step_reached, 1), 7)::numeric / 7 * 100) as completion_ratio,
  greatest(m.updated_at, coalesce(drafts.last_modified_at, m.updated_at)) as last_activity_at
from public.ag_meetings m
left join lateral (
  select count(*)::int as resolutions_count,
         coalesce((select count(*)
                     from public.ag_votes v
                    where v.resolution_id in (select r2.id from public.ag_resolutions r2 where r2.ag_id = m.id)), 0)::int as votes_count
  from public.ag_resolutions r
  where r.ag_id = m.id
) res on true
left join lateral (
  select count(*)::int as attendance_count
  from public.ag_attendance a
  where a.ag_id = m.id
) att on true
left join lateral (
  select max(d.last_modified_at) as last_modified_at
  from public.ag_session_drafts d
  where d.ag_id = m.id
) drafts on true;

comment on view public.v_ag_drafts_progress is
  'Progression des AG (notamment brouillons du wizard) : compteurs, drapeaux has_*, completion_ratio = max_step_reached/7, dernière activité (meeting OU session_drafts) — contrat compat 5c8209e.';

-- ----------------------------------------------------------------------------
-- 6. Vue : état du vote par correspondance par AG
-- ----------------------------------------------------------------------------
-- Compteurs CUMULATIFS sur l'enum pending→validated→integrated :
-- forms_validated inclut les fiches déjà intégrées (une fiche intégrée a
-- forcément été validée) — sinon les compteurs UI baisseraient à l'intégration.
create or replace view public.v_ag_correspondence_status
with (security_invoker = true) as
select
  m.id            as ag_id,
  m.copro_id,
  m.title         as ag_title,
  m.meeting_date,
  m.status        as ag_status,
  forms.forms_received,
  forms.forms_validated,
  forms.forms_integrated,
  det.vote_details_count,
  det.votes_integrated,
  corr.correspondence_tantiemes,
  tot.total_tantiemes,
  case when tot.total_tantiemes > 0
       then round(corr.correspondence_tantiemes / tot.total_tantiemes * 100, 2)
       else 0 end as correspondence_ratio
from public.ag_meetings m
left join lateral (
  select count(*)::int                                                       as forms_received,
         (count(*) filter (where cv.status in ('validated','integrated')))::int as forms_validated,
         (count(*) filter (where cv.status = 'integrated'))::int              as forms_integrated
  from public.ag_correspondence_votes cv
  where cv.ag_id = m.id
) forms on true
left join lateral (
  select count(*)::int                                                  as vote_details_count,
         (count(*) filter (where d.integrated_vote_id is not null))::int as votes_integrated
  from public.ag_correspondence_vote_details d
  join public.ag_correspondence_votes cv2 on cv2.id = d.correspondence_form_id
  where cv2.ag_id = m.id
) det on true
left join lateral (
  select coalesce(sum(a.tantiemes), 0) as correspondence_tantiemes
  from public.ag_attendance a
  where a.ag_id = m.id and a.presence_type = 'correspondence'
) corr on true
left join lateral (
  select coalesce(sum(rkl.weight), 0) as total_tantiemes
  from public.repartition_keys rk
  join public.repartition_key_lines rkl on rkl.key_id = rk.id
  where rk.copro_id = m.copro_id and rk.category = 'general' and rk.is_active = true
) tot on true;

comment on view public.v_ag_correspondence_status is
  'Suivi du vote par correspondance par AG : fiches (reçues/validées/intégrées, cumulatif), détails de vote, tantièmes correspondance vs clé générale — contrat compat 5c8209e.';

-- ----------------------------------------------------------------------------
-- 7. Vue : documents générés d'une AG
-- ----------------------------------------------------------------------------
create or replace view public.v_ag_documents
with (security_invoker = true) as
select
  d.id,
  d.copro_id,
  d.ag_id,
  m.title         as ag_title,
  m.meeting_date  as ag_date,
  m.status        as ag_status,
  d.doc_type,
  d.storage_path,
  d.file_name,
  d.file_size,
  d.version,
  d.generated_at,
  d.generated_by,
  p.full_name     as generated_by_name,
  d.generation_metadata,
  d.document_id,
  doc.file_name   as document_name,
  d.retention_until
from public.ag_documents d
join public.ag_meetings m      on m.id = d.ag_id
left join public.profiles p    on p.id = d.generated_by
left join public.documents doc on doc.id = d.document_id;

comment on view public.v_ag_documents is
  'Documents générés par AG (convocation, feuille de présence, PV) avec versions — contrat = type front AgDocument (objet né en live post-5c8209e).';

-- ----------------------------------------------------------------------------
-- 8. Vue : statistiques d'envoi des notifications AG
-- ----------------------------------------------------------------------------
create or replace view public.v_ag_notification_stats
with (security_invoker = true) as
select
  n.copro_id,
  n.ag_id,
  n.notification_type,
  count(*)::int                                                        as total_count,
  (count(*) filter (where n.status in ('pending','queued')))::int      as pending_count,
  (count(*) filter (where n.status = 'sent'))::int                     as sent_count,
  (count(*) filter (where n.status = 'delivered'))::int                as delivered_count,
  (count(*) filter (where n.status in ('opened','clicked')))::int      as opened_count,
  (count(*) filter (where n.status = 'bounced'))::int                  as bounced_count,
  (count(*) filter (where n.status = 'failed'))::int                   as failed_count
from public.ag_notifications n
group by n.copro_id, n.ag_id, n.notification_type;

comment on view public.v_ag_notification_stats is
  'Agrégats de livraison des notifications AG par (ag, type) — contrat = interface front AgNotificationStats (+ copro_id pour le contexte RLS).';

-- ----------------------------------------------------------------------------
-- 9. RPC register_ag_document — enregistre un document généré (versionné)
-- ----------------------------------------------------------------------------
-- Appelée par l'edge ag_generate_document (service role). Version = max+1 par
-- (ag, doc_type) ; la contrainte unique sert de filet en cas de concurrence.
create or replace function public.register_ag_document(
  p_copro_id     uuid,
  p_ag_id        uuid,
  p_doc_type     text,
  p_storage_path text,
  p_file_name    text,
  p_file_size    bigint default null,
  p_metadata     jsonb  default '{}'::jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_copro uuid;
  v_id uuid;
  v_version integer;
begin
  select m.copro_id into v_copro from public.ag_meetings m where m.id = p_ag_id;
  if v_copro is null then
    raise exception 'register_ag_document: AG % introuvable', p_ag_id using errcode = '23503';
  end if;
  if v_copro <> p_copro_id then
    raise exception 'register_ag_document: AG % n''appartient pas à la copro %', p_ag_id, p_copro_id
      using errcode = '42501';
  end if;
  if not public.is_service_call() and not public.user_is_copro_manager(v_copro) then
    raise exception 'forbidden: gestionnaire requis pour enregistrer un document AG'
      using errcode = '42501';
  end if;

  select coalesce(max(d.version), 0) + 1 into v_version
  from public.ag_documents d
  where d.ag_id = p_ag_id and d.doc_type = p_doc_type;

  insert into public.ag_documents
    (copro_id, ag_id, doc_type, storage_path, file_name, file_size, version,
     generated_by, generation_metadata)
  values
    (p_copro_id, p_ag_id, p_doc_type, p_storage_path, p_file_name, p_file_size, v_version,
     auth.uid(), coalesce(p_metadata, '{}'::jsonb))
  returning id into v_id;

  return jsonb_build_object('ag_document_id', v_id, 'version', v_version);
end;
$$;
revoke execute on function public.register_ag_document(uuid, uuid, text, text, text, bigint, jsonb) from public, anon;
grant  execute on function public.register_ag_document(uuid, uuid, text, text, text, bigint, jsonb) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 10. RPC delete_ag_draft — supprime un BROUILLON d'AG (et lui seul)
-- ----------------------------------------------------------------------------
-- Garde-fou : refuse tout statut ≠ 'draft' (une AG convoquée/clôturée est un
-- acte juridique, jamais supprimable ici). Le DELETE emporte par cascade
-- résolutions, présences, votes, brouillons UI, correspondance, notifications.
create or replace function public.delete_ag_draft(p_ag_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_copro uuid;
  v_status ag_status;
begin
  select m.copro_id, m.status into v_copro, v_status
  from public.ag_meetings m where m.id = p_ag_id;

  if v_copro is null then
    return jsonb_build_object('success', false, 'error', 'AG introuvable');
  end if;
  if not public.is_service_call() and not public.user_is_copro_manager(v_copro) then
    raise exception 'forbidden: gestionnaire requis pour supprimer un brouillon d''AG'
      using errcode = '42501';
  end if;
  if v_status <> 'draft' then
    return jsonb_build_object('success', false,
      'error', 'Seul un brouillon peut être supprimé (statut actuel : ' || v_status || ')');
  end if;

  delete from public.ag_meetings where id = p_ag_id;
  return jsonb_build_object('success', true);
end;
$$;
revoke execute on function public.delete_ag_draft(uuid) from public, anon;
grant  execute on function public.delete_ag_draft(uuid) to authenticated, service_role;
