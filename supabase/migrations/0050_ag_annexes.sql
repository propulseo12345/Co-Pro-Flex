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
  -- Nom du générateur FIGÉ à l'enregistrement : la vue ne peut pas le dériver via
  -- profiles en prod (RLS profiles = lecture de son propre profil uniquement).
  generated_by_name    text,
  generation_metadata  jsonb        not null default '{}'::jsonb,
  document_id          uuid         references public.documents(id) on delete set null,
  retention_until      timestamptz,
  updated_at           timestamptz  not null default now(),
  constraint pk_ag_documents          primary key (id),
  constraint uq_ag_documents_version  unique (ag_id, doc_type, version),
  constraint ck_ag_documents_type     check (doc_type in ('convocation','attendance_sheet','pv'))
);
create index idx_ag_documents_ag    on public.ag_documents (ag_id);
create index idx_ag_documents_copro on public.ag_documents (copro_id);
create trigger trg_ag_documents_updated
  before update on public.ag_documents
  for each row execute function public.set_updated_at();

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
-- Index manquant : la vue stats et useAgNotifications filtrent sur ag_id.
create index idx_ag_notifications_ag on public.ag_notifications (ag_id);

-- ----------------------------------------------------------------------------
-- 2bis. Verrou métier : une seule clé de répartition GÉNÉRALE active par copro
-- ----------------------------------------------------------------------------
-- Le moteur AG (compute_ag_quorum, trigger tantièmes) suppose UNE clé générale
-- active (limit 1). On ferme la porte au cas « 2 clés actives » qui fausserait
-- silencieusement tous les dénominateurs de tantièmes.
create unique index uq_one_active_general_key
  on public.repartition_keys (copro_id)
  where category = 'general' and is_active = true;

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
  -- Wizard à 9 étapes (cf. ck_ag_meetings_max_step 1..9) : avancement = dernière
  -- étape atteinte, en pourcentage 0..100 (100 % à la dernière étape).
  round(least(coalesce(m.max_step_reached, 1), 9)::numeric / 9 * 100) as completion_ratio,
  greatest(
    m.updated_at,
    coalesce(drafts.last_modified_at, m.updated_at),
    coalesce(res.last_resolution_at, m.updated_at),
    coalesce(att.last_attendance_at, m.updated_at)
  ) as last_activity_at
from public.ag_meetings m
left join lateral (
  select count(*)::int as resolutions_count,
         max(r.created_at) as last_resolution_at,
         coalesce((select count(*)
                     from public.ag_votes v
                    where v.resolution_id in (select r2.id from public.ag_resolutions r2 where r2.ag_id = m.id)), 0)::int as votes_count
  from public.ag_resolutions r
  where r.ag_id = m.id
) res on true
left join lateral (
  select count(*)::int as attendance_count,
         max(a.created_at) as last_attendance_at
  from public.ag_attendance a
  where a.ag_id = m.id
) att on true
left join lateral (
  select max(d.last_modified_at) as last_modified_at
  from public.ag_session_drafts d
  where d.ag_id = m.id
) drafts on true
where m.status = 'draft';

comment on view public.v_ag_drafts_progress is
  'Brouillons d''AG du wizard (status=draft uniquement) : compteurs, drapeaux has_*, completion_ratio = max_step_reached/9 en %, dernière activité (meeting, session_drafts, résolutions ou présences) — contrat compat 5c8209e.';

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
  -- Tantièmes ayant voté par correspondance, dérivés des votes RÉELS
  -- (vote_source='correspondence'), pas de la feuille de présence : la RPC
  -- register_correspondence_form_votes n'écrit pas ag_attendance. max() par
  -- copropriétaire pour ne pas multiplier le poids par le nombre de résolutions.
  select coalesce(sum(t.w), 0) as correspondence_tantiemes
  from (
    select v.coproprietaire_id, max(v.tantiemes) as w
    from public.ag_votes v
    join public.ag_resolutions r on r.id = v.resolution_id
    where r.ag_id = m.id and v.vote_source = 'correspondence'
    group by v.coproprietaire_id
  ) t
) corr on true
left join lateral (
  -- UNE seule clé générale active (aligné sur compute_ag_quorum / trigger).
  select coalesce(sum(rkl.weight), 0) as total_tantiemes
  from public.repartition_key_lines rkl
  where rkl.key_id = (
    select rk.id from public.repartition_keys rk
    where rk.copro_id = m.copro_id and rk.category = 'general' and rk.is_active = true
    limit 1
  )
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
  d.generated_by_name,
  d.generation_metadata,
  d.document_id,
  doc.file_name   as document_name,
  d.retention_until
from public.ag_documents d
join public.ag_meetings m      on m.id = d.ag_id
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
  -- total = somme des buckets ci-dessous (on exclut 'cancelled', qui n'a aucun
  -- bucket dédié — sinon total_count > somme des compteurs).
  (count(*) filter (where n.status <> 'cancelled'))::int               as total_count,
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
-- 8bis. RPC create_ag_notification — RECRÉÉE pour matcher les edges réels
-- ----------------------------------------------------------------------------
-- La version 0033 (p_ag_id, p_coproprietaire_id, p_channel, p_provider_ref)
-- NE correspond PAS à ce que les edges appellent (ag_send_convocations,
-- ag_send_relance passent p_copro_id, p_notification_type, p_document_id) :
-- l'appel échouait silencieusement → ag_notifications jamais alimentée,
-- notification_type figé à 'convocation', vue stats morte. On recrée la
-- signature attendue et on renseigne enfin notification_type.
drop function if exists public.create_ag_notification(uuid, uuid, notification_channel, text);
create or replace function public.create_ag_notification(
  p_copro_id          uuid,
  p_ag_id             uuid,
  p_coproprietaire_id uuid    default null,
  p_notification_type text    default 'convocation',
  p_channel           notification_channel default null,
  p_document_id       uuid    default null,
  p_provider_ref      text    default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_copro uuid;
  v_id uuid;
begin
  select m.copro_id into v_copro from public.ag_meetings m where m.id = p_ag_id;
  if v_copro is null then
    raise exception 'create_ag_notification: AG % introuvable', p_ag_id using errcode = '23503';
  end if;
  if v_copro <> p_copro_id then
    raise exception 'create_ag_notification: AG % n''appartient pas à la copro %', p_ag_id, p_copro_id
      using errcode = '42501';
  end if;
  if not public.is_service_call() and not public.user_is_copro_manager(v_copro) then
    raise exception 'forbidden: gestionnaire requis pour l''AG %', p_ag_id using errcode = '42501';
  end if;

  -- p_document_id reçu pour compat d'appel (lien convocation↔PDF) mais non
  -- persisté : ag_notifications n'a pas de colonne dédiée (hors périmètre).
  insert into public.ag_notifications
    (ag_id, copro_id, coproprietaire_id, channel, status, provider_ref, notification_type)
  values
    (p_ag_id, v_copro, p_coproprietaire_id, p_channel, 'queued'::delivery_status,
     p_provider_ref, coalesce(p_notification_type, 'convocation'))
  returning id into v_id;

  return v_id;
end;
$$;
revoke execute on function public.create_ag_notification(uuid, uuid, uuid, text, notification_channel, uuid, text) from public, anon;
grant  execute on function public.create_ag_notification(uuid, uuid, uuid, text, notification_channel, uuid, text) to authenticated, service_role;

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
  v_name text;
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

  -- Sérialise les générations concurrentes du même (AG, type) : sans ce verrou,
  -- deux appels simultanés calculent le même max+1 → violation uq_ag_documents_version.
  perform pg_advisory_xact_lock(hashtextextended(p_ag_id::text || ':' || p_doc_type, 0));

  select coalesce(max(d.version), 0) + 1 into v_version
  from public.ag_documents d
  where d.ag_id = p_ag_id and d.doc_type = p_doc_type;

  -- Nom du générateur figé (la vue ne peut pas le dériver via profiles sous RLS).
  select p.full_name into v_name from public.profiles p where p.id = auth.uid();

  insert into public.ag_documents
    (copro_id, ag_id, doc_type, storage_path, file_name, file_size, version,
     generated_by, generated_by_name, generation_metadata)
  values
    (p_copro_id, p_ag_id, p_doc_type, p_storage_path, p_file_name, p_file_size, v_version,
     auth.uid(), v_name, coalesce(p_metadata, '{}'::jsonb))
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
  v_paths text[];
  v_deleted int;
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

  -- Récupère les fichiers générés AVANT cascade pour que l'appelant nettoie le
  -- bucket storage (la cascade SQL ne touche pas le stockage objet).
  select array_agg(d.storage_path) into v_paths
  from public.ag_documents d where d.ag_id = p_ag_id;

  -- Re-vérifie status='draft' DANS le DELETE (anti-TOCTOU : le statut a pu
  -- changer entre le SELECT et ici). row_count = filet supplémentaire.
  delete from public.ag_meetings where id = p_ag_id and status = 'draft';
  get diagnostics v_deleted = row_count;
  if v_deleted = 0 then
    return jsonb_build_object('success', false,
      'error', 'Le brouillon n''a pas pu être supprimé (statut modifié entre-temps ?)');
  end if;

  return jsonb_build_object('success', true, 'deleted_storage_paths', coalesce(to_jsonb(v_paths), '[]'::jsonb));
end;
$$;
revoke execute on function public.delete_ag_draft(uuid) from public, anon;
grant  execute on function public.delete_ag_draft(uuid) to authenticated, service_role;
