-- ============================================================================
-- 0051 — Communication (J2-bis lot 3) : v_conversations_overview + is_archived
-- ----------------------------------------------------------------------------
-- Le front filtre les conversations archivées (hub communication, messagerie)
-- mais la vue 0049 n'exposait pas la colonne : le hub lisait la table nue avec
-- une colonne fantôme (`unread_count` → 42703, KPIs morts) et la messagerie
-- perdait les compteurs non-lus. On ajoute `is_archived` (additif pur, fin de
-- liste — contrainte CREATE OR REPLACE VIEW) ; les écrans basculent sur la vue.
-- ============================================================================

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
  coalesce(others.members, array[]::jsonb[]) as other_members,
  cv.is_archived
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
  'Conversations vues par l''utilisateur courant : my_last_read_at/my_unread_count via son conversation_members, other_members = membres actifs restants (jsonb[]), is_archived pour le filtre des écrans — contrat de compat front 5c8209e étendu (0051).';
