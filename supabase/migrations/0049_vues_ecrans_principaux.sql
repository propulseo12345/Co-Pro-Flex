-- ============================================================================
-- 0049 — Vues « écrans principaux » AG / mur / conversations / événements
--        + rename revue 0047 (critical_unpaid_count -> unpaid_lots_count)
-- ============================================================================
-- Recrée les 4 vues que le front consomme (listAgMeetings — src/lib/ag/api/
-- meetings.api.ts ; listWallPosts / listConversations / listEvents —
-- src/lib/communication/api.ts), prévues en 0022 (« lot vues ») mais jamais
-- créées à la re-baseline. Philosophie 0047 : VUES DE COMPATIBILITÉ — le
-- contrat de colonnes est celui contre lequel le front a été compilé (ancien
-- src/types/supabase.ts, commit 5c8209e), à l'identique STRICT (ni plus,
-- ni moins — pas de tags/is_locked/pinned_by/is_archived non contractuels).
-- Toutes les vues : security_invoker = true (héritent la RLS 0034).
--
-- Choix de dérivation (documentés pour revue métier) :
--   - total_tantiemes      : Σ weight de la clé de répartition GÉNÉRALE active
--                            (lots.tantiemes_generaux droppée en 0008) —
--                            pattern compute_ag_quorum (0030).
--   - present_tantiemes    : Σ ag_attendance.tantiemes TOUTES présences
--                            confondues (present + proxy + correspondence) :
--                            le vote par correspondance compte pour le quorum
--                            (art. 17-1 A, loi du 10 juillet 1965).
--   - quorum_ratio         : pourcentage 0-100 arrondi à 2 décimales, même
--                            convention que compute_ag_quorum (0030).
--   - convocation_deadline : meeting_date - 21 jours (délai légal de
--                            convocation, art. 64 décret du 17 mars 1967) —
--                            la colonne n'existe plus en table, dérivée pour
--                            compat front (affichage seul).
--   - author_role (mur)    : dérivé à la volée de memberships (design
--                            0022:148, « v_wall_feed = unique source ») ;
--                            gestionnaire / platform_admin -> 'syndic',
--                            sinon 'copro' (valeurs AuthorRole du front,
--                            src/features/communication/mur/domain/types.ts).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Vue 1 : synthèse des AG (écran liste + dashboard AG)
-- ----------------------------------------------------------------------------
create or replace view public.v_ag_overview
with (security_invoker = true) as
select
  m.id,
  m.copro_id,
  c.name                                   as copro_name,
  m.title,
  m.meeting_type,
  m.meeting_date,
  m.location,
  m.status,
  m.convocation_date,
  (m.meeting_date - interval '21 days')    as convocation_deadline,
  m.president_name,
  m.secretary_name,
  m.current_step,
  m.max_step_reached,
  m.created_by,
  p.full_name                              as created_by_name,
  m.created_at,
  res.resolutions_count,
  res.approved_count,
  res.rejected_count,
  att.attendees_count,
  att.present_count,
  att.proxy_count,
  att.correspondence_count,
  att.present_tantiemes,
  tot.total_tantiemes,
  case when tot.total_tantiemes > 0
       then round(att.present_tantiemes / tot.total_tantiemes * 100, 2)
       else 0 end                          as quorum_ratio
from public.ag_meetings m
join public.copros c    on c.id = m.copro_id
left join public.profiles p on p.id = m.created_by
left join lateral (
  select count(*)::int                                          as resolutions_count,
         (count(*) filter (where r.status = 'approved'))::int   as approved_count,
         (count(*) filter (where r.status = 'rejected'))::int   as rejected_count
  from public.ag_resolutions r
  where r.ag_id = m.id
) res on true
left join lateral (
  select count(*)::int                                                  as attendees_count,
         (count(*) filter (where a.presence_type = 'present'))::int     as present_count,
         (count(*) filter (where a.presence_type = 'proxy'))::int       as proxy_count,
         (count(*) filter (where a.presence_type = 'correspondence'))::int as correspondence_count,
         coalesce(sum(a.tantiemes), 0)                                  as present_tantiemes
  from public.ag_attendance a
  where a.ag_id = m.id
) att on true
left join lateral (
  select coalesce(sum(rkl.weight), 0) as total_tantiemes
  from public.repartition_keys rk
  join public.repartition_key_lines rkl on rkl.key_id = rk.id
  where rk.copro_id = m.copro_id
    and rk.category = 'general'
    and rk.is_active = true
) tot on true;

comment on view public.v_ag_overview is
  'Synthèse AG (compteurs résolutions/présences, tantièmes via clé générale active, quorum % convention compute_ag_quorum) — contrat de compat front 5c8209e.';

-- ----------------------------------------------------------------------------
-- Vue 2 : fil du mur communautaire
-- ----------------------------------------------------------------------------
create or replace view public.v_wall_feed
with (security_invoker = true) as
select
  w.id,
  w.copro_id,
  w.author_id,
  p.full_name   as author_name,
  p.avatar_url  as author_avatar,
  case when mb.role in ('gestionnaire', 'platform_admin') then 'syndic'
       else 'copro' end as author_role,
  w.title,
  w.content,
  w.category,
  w.visibility,
  w.is_pinned,
  w.pinned_at,
  w.attachment_id,
  w.likes_count,
  w.comments_count,
  (auth.uid() is not null and exists (
     select 1 from public.wall_likes l
     where l.post_id = w.id and l.user_id = auth.uid()
  )) as is_liked_by_me,
  w.created_at,
  w.updated_at
from public.wall_posts w
left join public.profiles p     on p.id = w.author_id
left join public.memberships mb on mb.user_id = w.author_id and mb.copro_id = w.copro_id;

comment on view public.v_wall_feed is
  'Fil du mur : auteur résolu (profiles), rôle dérivé des memberships (0022:148), is_liked_by_me contextuel auth.uid(), compteurs dénormalisés (triggers 0032) — contrat de compat front 5c8209e.';

-- ----------------------------------------------------------------------------
-- Vue 3 : synthèse des conversations (messagerie privée)
-- ----------------------------------------------------------------------------
create or replace view public.v_conversations_overview
with (security_invoker = true) as
select
  cv.id,
  cv.copro_id,
  cv.subject,
  cv.is_group,
  cv.created_by,
  cv.last_message_at,
  cv.last_message_preview,
  cv.created_at,
  me.last_read_at                          as my_last_read_at,
  coalesce(me.unread_count, 0)             as my_unread_count,
  coalesce(others.members, array[]::jsonb[]) as other_members
from public.conversations cv
left join public.conversation_members me
  on me.conversation_id = cv.id and me.user_id = auth.uid()
left join lateral (
  select array_agg(
           jsonb_build_object(
             'user_id',    cm.user_id,
             'full_name',  pp.full_name,
             'avatar_url', pp.avatar_url
           )
           order by pp.full_name
         ) as members
  from public.conversation_members cm
  left join public.profiles pp on pp.id = cm.user_id
  where cm.conversation_id = cv.id
    and cm.user_id is distinct from auth.uid()
    and cm.left_at is null
) others on true;

comment on view public.v_conversations_overview is
  'Conversations vues par l''utilisateur courant : my_last_read_at/my_unread_count via son conversation_members, other_members = membres actifs restants (jsonb[]) — contrat de compat front 5c8209e.';

-- ----------------------------------------------------------------------------
-- Vue 4 : synthèse des événements (agenda communication)
-- ----------------------------------------------------------------------------
create or replace view public.v_events_overview
with (security_invoker = true) as
select
  e.id,
  e.copro_id,
  e.title,
  e.description,
  e.event_type,
  e.location,
  e.starts_at,
  e.ends_at,
  e.all_day,
  e.visibility,
  e.linked_ag_id,
  e.linked_service_order_id,
  e.created_by,
  p.full_name as creator_name,
  e.created_at,
  (coalesce(e.ends_at, e.starts_at) < now())  as is_past,
  (e.starts_at::date = current_date)          as is_today
from public.events e
left join public.profiles p on p.id = e.created_by;

comment on view public.v_events_overview is
  'Événements + créateur résolu, drapeaux is_past/is_today (fuseau du serveur, UTC en local/prod Supabase) — contrat de compat front 5c8209e.';

-- ----------------------------------------------------------------------------
-- Rename revue 0047 : critical_unpaid_count -> unpaid_lots_count
-- ----------------------------------------------------------------------------
-- Retour de revue tranché 2026-06-11 : le compteur de v_dashboard_kpis compte
-- TOUS les lots en impayé (pas seulement « critiques ») — le nom mentait.
-- Aucune dépendance SQL (vue feuille) ; le front est rebranché dans le même
-- lot (usePortefeuille + lib/dashboard/api.ts).
alter view public.v_dashboard_kpis rename column critical_unpaid_count to unpaid_lots_count;
