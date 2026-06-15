-- ============================================================================
-- 0061 — Vue v_council_members_detail : résolution nom/prénom/email des membres
--        du conseil syndical (onglet « Membres »)
-- ============================================================================
-- BUG corrigé : le hook useConseilSyndicalPage lisait last_name/first_name/email
-- DIRECTEMENT sur council_members — colonnes qui N'EXISTENT PAS sur cette table
-- (cf. 0017 §10 : id, copro_id, user_id, coproprietaire_id, role, start_date,
-- end_date, is_active, …). L'identité réelle vit dans :
--   - coproprietaires (first_name / last_name / email / company_name)  via coproprietaire_id
--   - profiles        (full_name / email)                              via user_id
-- ck_council_member_identity garantit qu'au moins l'un des deux liens existe.
--
-- Résolution (COALESCE coproprietaire D'ABORD — source la plus riche, prénom/nom
-- séparés —, puis profile en repli) :
--   - first_name / last_name : depuis coproprietaires uniquement (profiles n'a
--     que full_name, pas de découpage prénom/nom).
--   - full_name : société -> company_name ; sinon "prénom nom" du coproprietaire ;
--     sinon profiles.full_name ; jamais NULL (repli sur '' via nullif/coalesce).
--   - email : coproprietaires.email puis profiles.email.
--
-- security_invoker = true : la vue hérite de la RLS 0034 de l'appelant (même
-- convention que toutes les vues v_* du projet — cf. 0049). PAS de SECURITY
-- DEFINER : un copropriétaire ne doit voir que les membres des copros auxquelles
-- il a accès.
--
-- PAS de filtre is_active / end_date EN DUR : l'historique du conseil reste
-- consultable. La colonne is_active (et end_date) est EXPOSÉE pour que l'appelant
-- filtre lui-même (le hook ne charge que is_active = true ; un futur écran
-- « historique » pourra réutiliser la même vue).
-- ============================================================================

create or replace view public.v_council_members_detail
with (security_invoker = true) as
select
  cm.id,
  cm.copro_id,
  cm.role,
  cm.is_active,
  cm.start_date,
  cm.end_date,
  cm.coproprietaire_id,
  cm.user_id,
  -- full_name : jamais NULL. Priorité société -> coproprietaire (prénom nom) ->
  -- profile.full_name -> '' (repli défensif).
  coalesce(
    nullif(c.company_name, ''),
    nullif(trim(both ' ' from concat_ws(' ', c.first_name, c.last_name)), ''),
    nullif(p.full_name, ''),
    ''
  )                                                   as full_name,
  -- first_name / last_name : seul coproprietaires les porte séparément.
  c.first_name                                        as first_name,
  c.last_name                                         as last_name,
  -- email : coproprietaire d'abord, puis profile.
  coalesce(nullif(c.email, ''), nullif(p.email, ''))  as email
from public.council_members cm
left join public.coproprietaires c on c.id = cm.coproprietaire_id
left join public.profiles p       on p.id = cm.user_id;

comment on view public.v_council_members_detail is
  'Membres du conseil syndical avec identité résolue (full_name/first_name/last_name/email) '
  'depuis coproprietaires (coproprietaire_id) PUIS profiles (user_id). security_invoker = true '
  '(hérite RLS 0034). Pas de filtre is_active/end_date : l''appelant filtre. Corrige le bug '
  'de l''onglet Membres (council_members ne porte ni nom ni email).';

-- FIN 0061_council_members_detail.sql
