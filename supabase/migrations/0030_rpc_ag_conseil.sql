-- 0030_rpc_ag_conseil.sql — RPC AG + CONSEIL SYNDICAL (lot fonctions du domaine gouvernance)
-- ============================================================================================
-- PALIER 1 / 3 : VOTE / SESSION / CONSEIL (coeur scrutin). Ce fichier NE CRÉE AUCUNE TABLE
--   (schéma 0001→0022 déjà posé). Sur tables 0017_ag_conseil + 0018_ag_notif_transitoire.
--   Sections de CE palier : 0 (en-tête) · 1 (fonctions) · 2 (vues) · 3 (triggers).
--   Les paliers 2 (chaîne auto-population AG→GL, SECTION 4) et 3 (wizard/correspondance/envoi/
--   bundles, SECTION 5) sont ajoutés ENSUITE dans le MÊME fichier (un commit quand les 3 gates passent).
--
-- PRINCIPE DIRECTEUR (blueprint §0) : l'AG est le moteur d'auto-population — une résolution
--   approuvée incrémente l'état de la copro TOUJOURS via le grand livre. Le palier 1 pose
--   seulement le scrutin (vote, quorum, résultats, session, conseil) ; il N'ÉCRIT JAMAIS le GL.
--
-- CONVENTIONS (durcissement transverse 0023→0029, OBLIGATOIRES) :
--   - Toutes les fonctions : SECURITY DEFINER + set search_path = public.
--     compute_majority_threshold est IMMUTABLE (math pure). Lectures = STABLE, écritures = VOLATILE.
--   - Gardes via helpers 0023 (réutilisés tels quels), motif systématique :
--       if not public.is_service_call() and not <garde>(...) then
--         raise exception 'forbidden: ...' using errcode = '42501'; end if;
--     G-MGR=user_is_copro_manager · G-DEF-RO=user_has_copro_access · G-OWNER=is_council_member
--     (source UNIQUE du rôle conseil) · G-INTERNAL=aucune garde (helper interne).
--   - ACL deny-by-default : revoke execute ... from public, anon ; grant execute ... to authenticated, service_role.
--   - AUCUN bloc EXCEPTION WHEN OTHERS masquant. Errcodes explicites : 42501 (garde),
--     23514 (règle métier), 23503 (introuvable). L'UNIQUE (23505) remonte tel quel (non avalé).
--   - Un seul % dans les format()/RAISE (jamais %%).
--   - Tout trigger CONSTRAINT ... DEFERRED RE-QUÊTE la ligne courante (jamais new.* figé) et
--     exempte les lignes annulées/supprimées (leçon tr_cff_ledger_required, image figée).
--   - Vues : with (security_invoker = true) (héritent la RLS de la table sous-jacente, posée en 0034).
--   - NE JAMAIS recréer : set_updated_at (0005), les trg_*_updated (0017/0018), ni aucun objet abandonné
--     (vote_direction, council_vote_choice, user_is_council_member, create_budget_from_ag & co bespoke).
--
-- SOURCE DES TANTIÈMES (CRITIQUE — utilisée partout, il n'y a PAS de colonne tantiemes sur lots) :
--   La clé GÉNÉRALE active est résolue en UNE ligne (select id ... limit 1) puis on somme sur CE key_id —
--   PATTERN regularize_period (0027) : il N'EXISTE AUCUNE contrainte d'unicité sur
--   (copro_id, category, is_active) (0009 ne pose que uq_key_copro_name). Un join nu sur
--   repartition_keys (category='general' and is_active) double-compterait les poids si 2+ clés
--   générales étaient actives → seuils et tantièmes FAUX silencieusement. On résout donc TOUJOURS
--   v_key d'abord (raise 23503 si introuvable), jamais de join direct multi-clés.
--   tantièmes d'un copropriétaire = somme, sur ses lots ACTIFS (lot_owners.end_date is null), de
--     repartition_key_lines.weight * lot_owners.share_percent / 100, sur CE key_id.
--   total_t (syndicat) = sum(weight) des lignes de CE key_id.
--   total_owners = count(distinct coproprietaire_id) des lot_owners actifs de la copro.
--
-- MAJORITÉS (calculate_resolution_result) — agrégats sur ag_votes is_excluded = false ; voix EXPRIMÉES :
--   art24      : adopté si for_t > against_t (abstentions exclues — PAS sur les présents).
--   art25      : adopté si for_t >= floor(total_t/2)+1 ; si rejeté, bridge = for_t >= ceil(total_t/3) → art24.
--   art25_1    : évaluée à la règle art24 (c'est déjà le 2nd vote).
--   art26      : adopté si for_t >= floor(2*total_t/3)+1 ET for_n > floor(total_owners/2) ;
--                si rejeté, bridge = for_t >= floor(total_t/2) → art25.
--   art26_1    : évaluée à la règle art25.
--   unanimity  : adopté si for_t = total_t ET against_t = 0.
--   Passerelle = INFORMATIVE (éligibilité exposée, PAS d'orchestration auto du 2nd vote — décision §3.3).
-- compute_decision_result (conseil) = majorité SIMPLE distincte : adopté si votes_for > votes_against ;
--   quorum atteint = total_votes >= moitié des membres actifs du conseil (ceil). « Membre actif » =
--   is_active ET end_date is null (aligné sur le helper is_council_member, source unique du rôle).
--
-- DETTE FRONT PHASE 4 (documentée, NON bloquante pour 0030) : src/lib/ag/api/finalisation.api.ts
--   (+ useFinalisationPage/Data) appelle encore la couche bespoke ABANDONNÉE → renverra 42883 après
--   reset tant que le front n'est pas recâblé sur finalize_and_activate_ag (palier 2). Accepté.
--
-- DIFFÉRÉS (TODO — ne PAS implémenter ici) :
--   - Plafond pouvoirs art.22 (3 délégations, sauf ≤10 % des voix) → lot « conformité vote ».
--   - Neutralisation correspondance art.17-1 A (colonne is_amended absente) → différé.
--   - Orchestration auto de la passerelle 25-1/26-1 → 0030 calcule l'éligibilité et alerte seulement.
--   - Drop séquencé ag_milestones + île notifications (ag_notifications/_events) → étape 3 ultérieure
--     (après refacto edge email_webhook). 0030 NE DROPPE PAS ces tables.
--   - Notifications transitoires (create_ag_notification, mark_notification_*) → migration 0033.
--   - APPOINT_SYNDIC : modélisation du mandat syndic → migration de schéma dédiée après la phase finance.

-- ============================================================================================
-- SECTION 1 — FONCTIONS (palier 1)
-- Ordre de déclaration : un objet appelé est défini AVANT son appelant.
--   1) compute_majority_threshold (IMMUTABLE)   7) get_ag_live_results
--   2) calculate_resolution_result              8) create_ag_with_standard_resolutions
--   3) compute_decision_result                  9) start_ag
--   4) cast_vote                               10) close_ag
--   5) compute_ag_quorum                       11) rpc_finalize_ag_session
--   6) (vues SECTION 2 lues par get_ag_live_results / get résultats)  12) archive_ag
--                                              13) check_convocation_delay
--                                              14) validate_ag_variables
-- ============================================================================================

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 1. compute_majority_threshold — seuils de majorité (math pure, IMMUTABLE)  [G-INTERNAL]
-- ────────────────────────────────────────────────────────────────────────────────────────────
-- Renvoie le seuil EN TANTIÈMES requis et (le cas échéant) le seuil EN VOIX, + la base de calcul.
-- Conforme à la math des majorités ci-dessus. art24/art25_1 : la base est « voix exprimées »
--   (le seuil tantièmes renvoyé est la majorité absolue indicative floor(total/2)+1, mais l'adoption
--   art24/art25_1 se décide par for_t > against_t côté calculate_resolution_result). art26 porte
--   un seuil en VOIX (floor(total_owners/2)+1). unanimity : seuil = total_t, seuil voix = total_owners.
create or replace function public.compute_majority_threshold(
  p_majority           majority_type,
  p_total_tantiemes    numeric,
  p_present_tantiemes  numeric,
  p_total_owners       integer,
  p_present_owners     integer
)
returns jsonb
language sql
immutable
security definer
set search_path = public
as $$
  select case p_majority
    when 'art24' then jsonb_build_object(
      'threshold_tantiemes', floor(coalesce(p_total_tantiemes, 0) / 2) + 1,
      'threshold_voters', null,
      'basis', 'art24 — majorité des voix exprimées (for > against, abstentions exclues)')
    when 'art25' then jsonb_build_object(
      'threshold_tantiemes', floor(coalesce(p_total_tantiemes, 0) / 2) + 1,
      'threshold_voters', null,
      'basis', 'art25 — majorité absolue de tous les tantièmes (floor(total/2)+1)')
    when 'art25_1' then jsonb_build_object(
      'threshold_tantiemes', floor(coalesce(p_total_tantiemes, 0) / 2) + 1,
      'threshold_voters', null,
      'basis', 'art25-1 — 2nd vote à la règle art24 (majorité des voix exprimées)')
    when 'art26' then jsonb_build_object(
      'threshold_tantiemes', floor(2 * coalesce(p_total_tantiemes, 0) / 3) + 1,
      'threshold_voters', floor(coalesce(p_total_owners, 0) / 2) + 1,
      'basis', 'art26 — double majorité : floor(2*total/3)+1 tantièmes ET majorité des copropriétaires')
    when 'art26_1' then jsonb_build_object(
      'threshold_tantiemes', floor(coalesce(p_total_tantiemes, 0) / 2) + 1,
      'threshold_voters', null,
      'basis', 'art26-1 — 2nd vote à la règle art25 (majorité absolue)')
    when 'unanimity' then jsonb_build_object(
      'threshold_tantiemes', coalesce(p_total_tantiemes, 0),
      'threshold_voters', coalesce(p_total_owners, 0),
      'basis', 'unanimité — 100 % des tantièmes, aucun contre')
    else jsonb_build_object(
      'threshold_tantiemes', floor(coalesce(p_total_tantiemes, 0) / 2) + 1,
      'threshold_voters', null,
      'basis', 'défaut — majorité des voix exprimées (art24)')
  end;
$$;
revoke execute on function public.compute_majority_threshold(majority_type, numeric, numeric, integer, integer) from public, anon;
grant execute on function public.compute_majority_threshold(majority_type, numeric, numeric, integer, integer) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 2. calculate_resolution_result — fige le résultat d'une résolution  [G-MGR]
-- ────────────────────────────────────────────────────────────────────────────────────────────
-- Agrège les votes (is_excluded = false), calcule l'adoption selon la règle exacte de l'article,
-- écrit status('approved'|'rejected')/voted_at/threshold_tantiemes/threshold_voters/is_bridgeable,
-- et renvoie le détail (dont l'éligibilité passerelle, INFORMATIVE). Sans WHEN OTHERS.
-- NB : la clé générale active est résolue en UNE ligne (limit 1) puis sommée sur CE key_id
-- (pattern 0027 — évite le double-comptage si plusieurs clés générales étaient actives).
create or replace function public.calculate_resolution_result(p_resolution_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_copro_id        uuid;
  v_majority        majority_type;
  v_key             uuid;
  v_for_t           numeric := 0;
  v_against_t       numeric := 0;
  v_for_n           integer := 0;
  v_total_t         numeric := 0;
  v_total_owners    integer := 0;
  v_thr             jsonb;
  v_threshold_t     numeric;
  v_threshold_v     integer;
  v_is_approved     boolean := false;
  v_bridge_eligible boolean := false;
  v_bridge_target   text := null;
begin
  -- 1) résolution + copro
  select r.copro_id, r.majority_type
    into v_copro_id, v_majority
  from public.ag_resolutions r
  where r.id = p_resolution_id;

  if v_copro_id is null then
    raise exception 'calculate_resolution_result: résolution % introuvable', p_resolution_id
      using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_copro_id) then
    raise exception 'forbidden: gestionnaire requis pour calculer le résultat de la résolution %', p_resolution_id
      using errcode = '42501';
  end if;

  -- 2) agrégats de votes (voix exprimées, hors exclusions)
  select
    coalesce(sum(case when v.vote = 'for'     then v.tantiemes else 0 end), 0),
    coalesce(sum(case when v.vote = 'against' then v.tantiemes else 0 end), 0),
    count(distinct case when v.vote = 'for' then v.coproprietaire_id end)
  into v_for_t, v_against_t, v_for_n
  from public.ag_votes v
  where v.resolution_id = p_resolution_id
    and v.is_excluded = false;

  -- 3) totaux copro — clé générale active résolue en UNE ligne, puis somme sur CE key_id
  select rk.id
    into v_key
  from public.repartition_keys rk
  where rk.copro_id = v_copro_id
    and rk.category = 'general'
    and rk.is_active = true
  limit 1;

  if v_key is null then
    raise exception 'calculate_resolution_result: clé de répartition générale active introuvable (copro %)', v_copro_id
      using errcode = '23503';
  end if;

  select coalesce(sum(rkl.weight), 0)
    into v_total_t
  from public.repartition_key_lines rkl
  where rkl.key_id = v_key;

  select count(distinct lo.coproprietaire_id)
    into v_total_owners
  from public.lot_owners lo
  where lo.copro_id = v_copro_id
    and lo.end_date is null;

  -- 4) seuils (math pure) — present_* non requis pour les règles retenues
  v_thr := public.compute_majority_threshold(v_majority, v_total_t, v_total_t, v_total_owners, v_total_owners);
  v_threshold_t := nullif(v_thr ->> 'threshold_tantiemes', '')::numeric;
  v_threshold_v := nullif(v_thr ->> 'threshold_voters', '')::integer;

  -- 5) adoption selon la règle EXACTE de l'article
  case v_majority
    when 'art24' then
      v_is_approved := v_for_t > v_against_t;
    when 'art25_1' then
      v_is_approved := v_for_t > v_against_t;
    when 'art26_1' then
      v_is_approved := v_for_t >= floor(v_total_t / 2) + 1;
    when 'art25' then
      v_is_approved := v_for_t >= floor(v_total_t / 2) + 1;
      if not v_is_approved then
        v_bridge_eligible := v_for_t >= ceil(v_total_t / 3.0);
        v_bridge_target := 'art24';
      end if;
    when 'art26' then
      v_is_approved := v_for_t >= floor(2 * v_total_t / 3) + 1
                   and v_for_n > floor(v_total_owners / 2);
      if not v_is_approved then
        v_bridge_eligible := v_for_t >= floor(v_total_t / 2);
        v_bridge_target := 'art25';
      end if;
    when 'unanimity' then
      v_is_approved := v_for_t = v_total_t and v_against_t = 0;
    else
      v_is_approved := v_for_t > v_against_t;
  end case;

  -- 6) effets : fige status/voted_at/threshold_*/is_bridgeable
  update public.ag_resolutions
  set status              = (case when v_is_approved then 'approved' else 'rejected' end)::resolution_status,
      voted_at            = now(),
      threshold_tantiemes = v_threshold_t,
      threshold_voters    = case when v_majority = 'art26' then v_threshold_v else null end,
      is_bridgeable       = v_bridge_eligible
  where id = p_resolution_id;

  -- 7) retour informatif
  return jsonb_build_object(
    'success', true,
    'resolution_id', p_resolution_id,
    'majority_type', v_majority,
    'status', case when v_is_approved then 'approved' else 'rejected' end,
    'for_t', v_for_t,
    'against_t', v_against_t,
    'for_n', v_for_n,
    'total_t', v_total_t,
    'total_owners', v_total_owners,
    'threshold_tantiemes', v_threshold_t,
    'threshold_voters', case when v_majority = 'art26' then v_threshold_v else null end,
    'bridge_eligible', v_bridge_eligible,
    'bridge_target_majority', v_bridge_target
  );
end;
$$;
revoke execute on function public.calculate_resolution_result(uuid) from public, anon;
grant execute on function public.calculate_resolution_result(uuid) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 3. compute_decision_result — résultat d'une décision du conseil (majorité SIMPLE)  [G-OWNER]
-- ────────────────────────────────────────────────────────────────────────────────────────────
-- Distincte des art.24/25/26 : adopté si votes_for > votes_against ; quorum atteint si le nombre
-- de votes exprimés >= moitié (ceil) des membres ACTIFS du conseil. « Membre actif » = is_active
-- ET end_date is null (aligné sur le helper is_council_member, source unique du rôle). Lecture pure.
create or replace function public.compute_decision_result(p_decision_id uuid)
returns table(
  is_passed         boolean,
  quorum_reached    boolean,
  total_votes       integer,
  votes_for         integer,
  votes_against     integer,
  votes_abstention  integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_copro_id       uuid;
  v_active_members integer := 0;
  v_for            integer := 0;
  v_against        integer := 0;
  v_abstention     integer := 0;
  v_total          integer := 0;
begin
  select d.copro_id into v_copro_id
  from public.council_decisions d
  where d.id = p_decision_id;

  if v_copro_id is null then
    raise exception 'compute_decision_result: décision % introuvable', p_decision_id
      using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.is_council_member(v_copro_id, auth.uid()) then
    raise exception 'forbidden: membre du conseil requis pour la décision %', p_decision_id
      using errcode = '42501';
  end if;

  select count(*)
    into v_active_members
  from public.council_members cm
  where cm.copro_id = v_copro_id
    and cm.is_active
    and cm.end_date is null;

  -- ne compter QUE les votes des membres ACTIFS (numérateur aligné sur le dénominateur v_active_members) :
  -- un vote d'un membre révoqué (is_active=false / end_date renseigné) ne doit pas gonfler le scrutin.
  select
    coalesce(count(*) filter (where cv.vote = 'for'), 0),
    coalesce(count(*) filter (where cv.vote = 'against'), 0),
    coalesce(count(*) filter (where cv.vote = 'abstention'), 0)
  into v_for, v_against, v_abstention
  from public.council_votes cv
  join public.council_members cm
    on cm.id = cv.council_member_id
   and cm.copro_id = v_copro_id
   and cm.is_active
   and cm.end_date is null
  where cv.decision_id = p_decision_id;

  v_total := v_for + v_against + v_abstention;

  is_passed        := v_for > v_against;
  -- conseil vide : aucun quorum possible (ceil(0/2)=0 rendrait la condition toujours vraie).
  quorum_reached   := v_active_members > 0 and v_total >= ceil(v_active_members::numeric / 2);
  total_votes      := v_total;
  votes_for        := v_for;
  votes_against    := v_against;
  votes_abstention := v_abstention;
  return next;
end;
$$;
revoke execute on function public.compute_decision_result(uuid) from public, anon;
grant execute on function public.compute_decision_result(uuid) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 4. cast_vote — enregistre un vote nominatif lot-pondéré  [G-MGR]
-- ────────────────────────────────────────────────────────────────────────────────────────────
-- Dérive copro_id + tantièmes du votant (clé générale, lots actifs × share_percent) puis INSERT
-- ag_votes. Refuse le vote si l'AG n'est pas dans un état ouvert au scrutin (intégrité des tallies
-- gelés : les résultats étant dérivés en temps réel des lignes ag_votes, un INSERT post-clôture
-- falsifierait silencieusement un résultat figé). Le trigger trg_ag_vote_requires_attendance rejette
-- un vote 'live' sans présence (present/proxy). L'UNIQUE (resolution_id, coproprietaire_id) bloque le
-- doublon : on laisse remonter 23505 (jamais avalé). Sans WHEN OTHERS.
create or replace function public.cast_vote(
  p_resolution_id     uuid,
  p_coproprietaire_id uuid,
  p_vote              vote_choice,
  p_vote_source       vote_source default 'live'
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_copro_id   uuid;
  v_ag_status  ag_status;
  v_key        uuid;
  v_tantiemes  numeric;
  v_vote_id    uuid;
begin
  -- résolution + copro + statut de l'AG parente
  select r.copro_id, m.status
    into v_copro_id, v_ag_status
  from public.ag_resolutions r
  join public.ag_meetings m on m.id = r.ag_id
  where r.id = p_resolution_id;

  if v_copro_id is null then
    raise exception 'cast_vote: résolution % introuvable', p_resolution_id
      using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_copro_id) then
    raise exception 'forbidden: gestionnaire requis pour enregistrer un vote sur la résolution %', p_resolution_id
      using errcode = '42501';
  end if;

  -- l'AG doit être ouverte au scrutin (jamais après clôture : intégrité des résultats figés)
  if v_ag_status not in ('convoked', 'in_progress', 'session_active') then
    raise exception 'cast_vote: AG non ouverte au vote (status=%) — vote refusé sur la résolution %', v_ag_status, p_resolution_id
      using errcode = '23514';
  end if;

  -- le votant doit être copropriétaire de cette copro
  if not exists (
    select 1 from public.coproprietaires co
    where co.id = p_coproprietaire_id and co.copro_id = v_copro_id
  ) then
    raise exception 'cast_vote: copropriétaire % absent de la copro %', p_coproprietaire_id, v_copro_id
      using errcode = '23503';
  end if;

  -- le votant doit détenir au moins un lot ACTIF (droit de vote lié à la détention). Cohérence avec
  -- total_owners de calculate_resolution_result (= lot_owners actifs) : sinon un EX-propriétaire à 0
  -- tantième gonflerait for_n (numérateur art.26) sans figurer au dénominateur.
  if not exists (
    select 1 from public.lot_owners lo
    where lo.coproprietaire_id = p_coproprietaire_id
      and lo.copro_id = v_copro_id
      and lo.end_date is null
  ) then
    raise exception 'cast_vote: le copropriétaire % ne détient aucun lot actif dans la copro % — vote refusé', p_coproprietaire_id, v_copro_id
      using errcode = '23514';
  end if;

  -- clé générale active résolue en UNE ligne, puis tantièmes dérivés sur CE key_id
  select rk.id
    into v_key
  from public.repartition_keys rk
  where rk.copro_id = v_copro_id
    and rk.category = 'general'
    and rk.is_active = true
  limit 1;

  if v_key is null then
    raise exception 'cast_vote: clé de répartition générale active introuvable (copro %)', v_copro_id
      using errcode = '23503';
  end if;

  select coalesce(sum(rkl.weight * lo.share_percent / 100.0), 0)
    into v_tantiemes
  from public.lot_owners lo
  join public.repartition_key_lines rkl
    on rkl.key_id = v_key and rkl.lot_id = lo.lot_id
  where lo.coproprietaire_id = p_coproprietaire_id
    and lo.copro_id = v_copro_id
    and lo.end_date is null;

  -- VOTE FIGÉ (décision USER 2026-06-07) : un vote déjà enregistré sur cette résolution — en séance OU
  -- par correspondance (déjà intégré + compté en direct) — ne se réécrit pas. On lève un message métier
  -- clair plutôt que de laisser remonter l'UNIQUE 23505 brut.
  if exists (
    select 1 from public.ag_votes av
    where av.resolution_id = p_resolution_id and av.coproprietaire_id = p_coproprietaire_id
  ) then
    raise exception 'cast_vote: le copropriétaire % a déjà voté sur la résolution % (vote figé) — modification refusée', p_coproprietaire_id, p_resolution_id
      using errcode = '23514';
  end if;

  -- INSERT (trigger présence → 23514 si vote live sans présence ; UNIQUE = filet de sécurité)
  insert into public.ag_votes (resolution_id, copro_id, coproprietaire_id, vote, tantiemes, vote_source)
  values (p_resolution_id, v_copro_id, p_coproprietaire_id, p_vote, v_tantiemes, p_vote_source)
  returning id into v_vote_id;

  -- ouvrir le scrutin au 1er vote (transition souple draft/pending → voting)
  update public.ag_resolutions
  set status = 'voting'
  where id = p_resolution_id
    and status in ('draft', 'pending');

  return jsonb_build_object(
    'success', true,
    'vote_id', v_vote_id,
    'resolution_id', p_resolution_id,
    'coproprietaire_id', p_coproprietaire_id,
    'vote', p_vote,
    'vote_source', p_vote_source,
    'tantiemes', v_tantiemes
  );
end;
$$;
revoke execute on function public.cast_vote(uuid, uuid, vote_choice, vote_source) from public, anon;
grant execute on function public.cast_vote(uuid, uuid, vote_choice, vote_source) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 5. compute_ag_quorum — présence + tantièmes présents / total  [G-DEF-RO]
-- ────────────────────────────────────────────────────────────────────────────────────────────
-- total_tantiemes = clé générale active (PAS lots.tantiemes_generaux, dropée), résolue en UNE ligne
-- puis sommée sur CE key_id. present_tantiemes = somme des tantièmes des présences. Pas de quorum
-- légal minimum en copropriété : is_quorum_reached = présence > 0 (donnée indicative). Lecture pure.
create or replace function public.compute_ag_quorum(p_ag_id uuid)
returns table(
  attendees_count      integer,
  present_count        integer,
  proxy_count          integer,
  correspondence_count integer,
  present_tantiemes     numeric,
  total_tantiemes       numeric,
  is_quorum_reached     boolean,
  quorum_ratio         numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_copro_id uuid;
  v_key      uuid;
begin
  select m.copro_id into v_copro_id
  from public.ag_meetings m
  where m.id = p_ag_id;

  if v_copro_id is null then
    raise exception 'compute_ag_quorum: AG % introuvable', p_ag_id
      using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_has_copro_access(v_copro_id) then
    raise exception 'forbidden: accès copro requis pour le quorum de l''AG %', p_ag_id
      using errcode = '42501';
  end if;

  select rk.id
    into v_key
  from public.repartition_keys rk
  where rk.copro_id = v_copro_id
    and rk.category = 'general'
    and rk.is_active = true
  limit 1;

  if v_key is null then
    raise exception 'compute_ag_quorum: clé de répartition générale active introuvable (copro %)', v_copro_id
      using errcode = '23503';
  end if;

  select coalesce(sum(rkl.weight), 0)
    into total_tantiemes
  from public.repartition_key_lines rkl
  where rkl.key_id = v_key;

  select
    coalesce(count(*), 0),
    coalesce(count(*) filter (where a.presence_type = 'present'), 0),
    coalesce(count(*) filter (where a.presence_type = 'proxy'), 0),
    coalesce(count(*) filter (where a.presence_type = 'correspondence'), 0),
    coalesce(sum(a.tantiemes), 0)
  into attendees_count, present_count, proxy_count, correspondence_count, present_tantiemes
  from public.ag_attendance a
  where a.ag_id = p_ag_id;

  is_quorum_reached := present_tantiemes > 0;
  quorum_ratio := case when total_tantiemes > 0
    then round(present_tantiemes / total_tantiemes * 100, 2)
    else 0 end;
  return next;
end;
$$;
revoke execute on function public.compute_ag_quorum(uuid) from public, anon;
grant execute on function public.compute_ag_quorum(uuid) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 6. get_ag_live_results — résultats temps réel par résolution (mode projecteur)  [G-DEF-RO]
-- ────────────────────────────────────────────────────────────────────────────────────────────
-- Agrège les votes via la vue v_ag_resolution_vote_summary (SECTION 2) — plus aucun compteur
-- dénormalisé. Renvoie l'AG, le quorum et la liste des résolutions avec leurs agrégats. Lecture pure.
create or replace function public.get_ag_live_results(p_ag_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_copro_id    uuid;
  v_ag          record;
  v_quorum      record;
  v_resolutions jsonb;
begin
  select m.copro_id into v_copro_id
  from public.ag_meetings m
  where m.id = p_ag_id;

  if v_copro_id is null then
    raise exception 'get_ag_live_results: AG % introuvable', p_ag_id
      using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_has_copro_access(v_copro_id) then
    raise exception 'forbidden: accès copro requis pour les résultats de l''AG %', p_ag_id
      using errcode = '42501';
  end if;

  select m.id, m.title, m.status, m.meeting_date, m.session_started_at
    into v_ag
  from public.ag_meetings m
  where m.id = p_ag_id;

  select * into v_quorum from public.compute_ag_quorum(p_ag_id);

  select jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'resolution_number', r.resolution_number,
      'title', r.title,
      'majority_type', r.majority_type,
      'status', r.status,
      'threshold_tantiemes', r.threshold_tantiemes,
      'threshold_voters', r.threshold_voters,
      'is_bridgeable', r.is_bridgeable,
      'voted_at', r.voted_at,
      'votes_for', coalesce(s.votes_for, 0),
      'votes_against', coalesce(s.votes_against, 0),
      'votes_abstention', coalesce(s.votes_abstention, 0),
      'tantiemes_for', coalesce(s.tantiemes_for, 0),
      'tantiemes_against', coalesce(s.tantiemes_against, 0),
      'tantiemes_abstention', coalesce(s.tantiemes_abstention, 0),
      'total_expressed', coalesce(s.total_expressed, 0),
      'participation_percent', case
        when coalesce(v_quorum.present_tantiemes, 0) > 0
          then round(coalesce(s.total_expressed, 0) * 100.0 / v_quorum.present_tantiemes, 1)
        else 0 end
    ) order by r.resolution_number
  )
  into v_resolutions
  from public.ag_resolutions r
  left join public.v_ag_resolution_vote_summary s on s.resolution_id = r.id
  where r.ag_id = p_ag_id;

  return jsonb_build_object(
    'success', true,
    'ag', jsonb_build_object(
      'id', v_ag.id,
      'title', v_ag.title,
      'status', v_ag.status,
      'meeting_date', v_ag.meeting_date,
      'session_started_at', v_ag.session_started_at
    ),
    'quorum', jsonb_build_object(
      'attendees_count', v_quorum.attendees_count,
      'present_count', v_quorum.present_count,
      'proxy_count', v_quorum.proxy_count,
      'correspondence_count', v_quorum.correspondence_count,
      'present_tantiemes', v_quorum.present_tantiemes,
      'total_tantiemes', v_quorum.total_tantiemes,
      'quorum_ratio', v_quorum.quorum_ratio
    ),
    'resolutions', coalesce(v_resolutions, '[]'::jsonb),
    'timestamp', now()
  );
end;
$$;
revoke execute on function public.get_ag_live_results(uuid) from public, anon;
grant execute on function public.get_ag_live_results(uuid) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 7. create_ag_with_standard_resolutions — crée une AG + résolutions standard  [G-MGR]
-- ────────────────────────────────────────────────────────────────────────────────────────────
-- Crée ag_meetings puis, pour une AG ordinaire/mixte, le jeu de résolutions standard (mappé sur
-- resolution_type cible : 'other'/'accounts'/'budget'/'contract'/'council' + action_type pivot).
-- Renvoie l'uuid de l'AG créée (signature plan). Sans WHEN OTHERS.
create or replace function public.create_ag_with_standard_resolutions(
  p_copro_id     uuid,
  p_title        text,
  p_meeting_date timestamptz,
  p_meeting_type ag_meeting_type default 'ordinary',
  p_location     text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_ag_id uuid;
begin
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: gestionnaire requis pour créer une AG sur la copro %', p_copro_id
      using errcode = '42501';
  end if;

  insert into public.ag_meetings (copro_id, title, meeting_type, meeting_date, location, status, created_by)
  values (p_copro_id, p_title, p_meeting_type, p_meeting_date, p_location, 'draft', auth.uid())
  returning id into v_ag_id;

  if p_meeting_type in ('ordinary', 'mixed') then
    insert into public.ag_resolutions
      (ag_id, copro_id, resolution_number, title, description, resolution_type, majority_type, action_type)
    values
      (v_ag_id, p_copro_id, 1, 'Désignation du président de séance, du secrétaire et des scrutateurs',
       'Constitution du bureau de l''assemblée', 'other', 'art24', 'DESIGNATE_BUREAU'),
      (v_ag_id, p_copro_id, 2, 'Approbation des comptes de l''exercice clos',
       'Approbation des comptes de gestion de l''exercice écoulé', 'accounts', 'art24', 'APPROVE_ACCOUNTS'),
      (v_ag_id, p_copro_id, 3, 'Quitus au syndic pour sa gestion',
       'Donner quitus au syndic pour sa gestion au cours de l''exercice écoulé', 'syndic', 'art24', 'GRANT_QUITUS'),
      (v_ag_id, p_copro_id, 4, 'Approbation du budget prévisionnel',
       'Approbation du budget prévisionnel pour l''exercice à venir', 'budget', 'art24', 'CREATE_BUDGET'),
      (v_ag_id, p_copro_id, 5, 'Cotisation au fonds de travaux (art. 14-2)',
       'Fixation de la cotisation annuelle au fonds de travaux ALUR', 'budget', 'art25', 'CREATE_ALUR_FUND'),
      (v_ag_id, p_copro_id, 6, 'Renouvellement du contrat de syndic',
       'Renouvellement du contrat de syndic', 'contract', 'art25', 'APPOINT_SYNDIC'),
      (v_ag_id, p_copro_id, 7, 'Élection des membres du conseil syndical',
       'Élection ou renouvellement des membres du conseil syndical', 'council', 'art25', 'ELECT_COUNCIL');
  end if;

  return v_ag_id;
end;
$$;
revoke execute on function public.create_ag_with_standard_resolutions(uuid, text, timestamptz, ag_meeting_type, text) from public, anon;
grant execute on function public.create_ag_with_standard_resolutions(uuid, text, timestamptz, ag_meeting_type, text) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 8. start_ag — ouvre la séance (status → 'session_active')  [G-MGR]
-- ────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.start_ag(
  p_ag_id         uuid,
  p_opening_notes text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_copro_id uuid;
  v_status   ag_status;
begin
  select m.copro_id, m.status into v_copro_id, v_status
  from public.ag_meetings m
  where m.id = p_ag_id;

  if v_copro_id is null then
    raise exception 'start_ag: AG % introuvable', p_ag_id using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_copro_id) then
    raise exception 'forbidden: gestionnaire requis pour ouvrir l''AG %', p_ag_id
      using errcode = '42501';
  end if;

  -- idempotent : déjà ouverte → succès
  if v_status = 'session_active' then
    return jsonb_build_object('success', true, 'ag_id', p_ag_id, 'status', 'session_active',
                              'message', 'séance déjà ouverte');
  end if;

  if v_status in ('closed', 'pv_generated', 'pv_signed', 'pv_sent', 'finalized', 'archived') then
    raise exception 'start_ag: l''AG % est déjà close (status=%)', p_ag_id, v_status
      using errcode = '23514';
  end if;

  update public.ag_meetings
  set status             = 'session_active',
      session_started_at = coalesce(session_started_at, now()),
      opening_notes      = coalesce(p_opening_notes, opening_notes)
  where id = p_ag_id;

  return jsonb_build_object('success', true, 'ag_id', p_ag_id, 'status', 'session_active',
                            'session_started_at', now());
end;
$$;
revoke execute on function public.start_ag(uuid, text) from public, anon;
grant execute on function public.start_ag(uuid, text) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 9. close_ag — clôt la séance + calcule les résultats restants (status → 'closed')  [G-MGR]
-- ────────────────────────────────────────────────────────────────────────────────────────────
-- NB sémantique (acté par le plan) : à la clôture, TOUTE résolution encore en draft/pending/voting/
-- voted est figée par calculate_resolution_result. Une résolution sans aucun vote (for_t=against_t=0)
-- devient donc 'rejected' (pas 'adjourned'). Choix assumé : figer l'état de séance.
create or replace function public.close_ag(
  p_ag_id         uuid,
  p_closing_notes text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_copro_id uuid;
  v_status   ag_status;
  v_res      record;
  v_count    integer := 0;
begin
  select m.copro_id, m.status into v_copro_id, v_status
  from public.ag_meetings m
  where m.id = p_ag_id;

  if v_copro_id is null then
    raise exception 'close_ag: AG % introuvable', p_ag_id using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_copro_id) then
    raise exception 'forbidden: gestionnaire requis pour clôturer l''AG %', p_ag_id
      using errcode = '42501';
  end if;

  -- idempotent : déjà close → succès
  if v_status in ('closed', 'pv_generated', 'pv_signed', 'pv_sent', 'finalized', 'archived') then
    return jsonb_build_object('success', true, 'ag_id', p_ag_id, 'status', v_status,
                              'message', 'AG déjà close', 'resolutions_calculated', 0);
  end if;

  if v_status <> 'session_active' then
    raise exception 'close_ag: la séance de l''AG % n''est pas ouverte (status=%)', p_ag_id, v_status
      using errcode = '23514';
  end if;

  -- fige les résultats des résolutions encore en cours/non figées
  for v_res in
    select r.id
    from public.ag_resolutions r
    where r.ag_id = p_ag_id
      and r.status in ('draft', 'pending', 'voting', 'voted')
    order by r.resolution_number
  loop
    perform public.calculate_resolution_result(v_res.id);
    v_count := v_count + 1;
  end loop;

  update public.ag_meetings
  set status           = 'closed',
      session_ended_at = now(),
      closed_at        = now(),
      closing_notes    = coalesce(p_closing_notes, closing_notes)
  where id = p_ag_id;

  return jsonb_build_object('success', true, 'ag_id', p_ag_id, 'status', 'closed',
                            'closed_at', now(), 'resolutions_calculated', v_count);
end;
$$;
revoke execute on function public.close_ag(uuid, text) from public, anon;
grant execute on function public.close_ag(uuid, text) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 10. rpc_finalize_ag_session — clôture + finalisation de séance (idempotent)  [G-MGR]
-- ────────────────────────────────────────────────────────────────────────────────────────────
-- Point d'entrée de l'étape « validation de séance » du wizard. Idempotent : si déjà close/
-- finalisée, renvoie succès. Sinon fige les résultats restants et passe l'AG à 'closed'
-- (la purge des brouillons est faite par trg_ag_close_clear_drafts).
create or replace function public.rpc_finalize_ag_session(
  p_ag_id         uuid,
  p_closing_notes text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_copro_id uuid;
  v_status   ag_status;
  v_res      record;
  v_count    integer := 0;
begin
  select m.copro_id, m.status into v_copro_id, v_status
  from public.ag_meetings m
  where m.id = p_ag_id;

  if v_copro_id is null then
    raise exception 'rpc_finalize_ag_session: AG % introuvable', p_ag_id using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_copro_id) then
    raise exception 'forbidden: gestionnaire requis pour finaliser la séance de l''AG %', p_ag_id
      using errcode = '42501';
  end if;

  -- idempotent
  if v_status in ('closed', 'pv_generated', 'pv_signed', 'pv_sent', 'finalized', 'archived') then
    return jsonb_build_object('success', true, 'ag_id', p_ag_id, 'status', v_status,
                              'message', 'séance déjà finalisée', 'resolutions_calculated', 0);
  end if;

  if v_status <> 'session_active' then
    raise exception 'rpc_finalize_ag_session: la séance de l''AG % n''est pas ouverte (status=%)', p_ag_id, v_status
      using errcode = '23514';
  end if;

  for v_res in
    select r.id
    from public.ag_resolutions r
    where r.ag_id = p_ag_id
      and r.status in ('draft', 'pending', 'voting', 'voted')
    order by r.resolution_number
  loop
    perform public.calculate_resolution_result(v_res.id);
    v_count := v_count + 1;
  end loop;

  update public.ag_meetings
  set status           = 'closed',
      session_ended_at = coalesce(session_ended_at, now()),
      closed_at        = now(),
      closing_notes    = coalesce(p_closing_notes, closing_notes)
  where id = p_ag_id;

  return jsonb_build_object('success', true, 'ag_id', p_ag_id, 'status', 'closed',
                            'closed_at', now(), 'resolutions_calculated', v_count,
                            'message', 'séance finalisée');
end;
$$;
revoke execute on function public.rpc_finalize_ag_session(uuid, text) from public, anon;
grant execute on function public.rpc_finalize_ag_session(uuid, text) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 11. archive_ag — archive une AG (status → 'archived', état terminal)  [G-MGR]
-- ────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.archive_ag(p_ag_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_copro_id uuid;
  v_status   ag_status;
begin
  select m.copro_id, m.status into v_copro_id, v_status
  from public.ag_meetings m
  where m.id = p_ag_id;

  if v_copro_id is null then
    raise exception 'archive_ag: AG % introuvable', p_ag_id using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_copro_id) then
    raise exception 'forbidden: gestionnaire requis pour archiver l''AG %', p_ag_id
      using errcode = '42501';
  end if;

  if v_status = 'archived' then
    return jsonb_build_object('success', true, 'ag_id', p_ag_id, 'status', 'archived',
                              'message', 'AG déjà archivée');
  end if;

  if v_status not in ('closed', 'pv_generated', 'pv_signed', 'pv_sent', 'finalized') then
    raise exception 'archive_ag: l''AG % doit être close avant archivage (status=%)', p_ag_id, v_status
      using errcode = '23514';
  end if;

  update public.ag_meetings
  set status = 'archived'
  where id = p_ag_id;

  return jsonb_build_object('success', true, 'ag_id', p_ag_id, 'status', 'archived');
end;
$$;
revoke execute on function public.archive_ag(uuid) from public, anon;
grant execute on function public.archive_ag(uuid) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 12. check_convocation_delay — respect du délai légal de convocation (21 j)  [G-DEF-RO]
-- ────────────────────────────────────────────────────────────────────────────────────────────
-- Art. 64 décret 67-223 : 21 jours minimum. Renvoie le délai restant et un message d'alerte.
-- meeting_date exposée en timestamptz (signature front). Lecture pure.
create or replace function public.check_convocation_delay(p_ag_id uuid)
returns table(
  is_valid        boolean,
  days_remaining  integer,
  minimum_delay   integer,
  meeting_date    timestamptz,
  warning_message text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_copro_id     uuid;
  v_meeting_date timestamptz;
  v_days         integer;
begin
  select m.copro_id, m.meeting_date into v_copro_id, v_meeting_date
  from public.ag_meetings m
  where m.id = p_ag_id;

  if v_copro_id is null then
    raise exception 'check_convocation_delay: AG % introuvable', p_ag_id
      using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_has_copro_access(v_copro_id) then
    raise exception 'forbidden: accès copro requis pour le délai de convocation de l''AG %', p_ag_id
      using errcode = '42501';
  end if;

  v_days := (v_meeting_date::date - current_date);

  is_valid        := v_days >= 21;
  days_remaining  := v_days;
  minimum_delay   := 21;
  meeting_date    := v_meeting_date;
  warning_message := case
    when v_days < 0  then 'ERREUR : la date de l''AG est passée'
    when v_days < 21 then 'ATTENTION : délai légal de 21 jours non respecté (art. 64 décret 67-223)'
    else 'OK : délai légal respecté'
  end;
  return next;
end;
$$;
revoke execute on function public.check_convocation_delay(uuid) from public, anon;
grant execute on function public.check_convocation_delay(uuid) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 13. validate_ag_variables — cohérence des `variables` des résolutions de l'AG  [G-DEF-RO]
-- ────────────────────────────────────────────────────────────────────────────────────────────
-- Vérifie, par résolution porteuse d'un action_type, que les `variables` requises sont présentes
-- (pré-vol avant finalisation). N'écrit rien ; renvoie la liste des problèmes + un drapeau global.
create or replace function public.validate_ag_variables(p_ag_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_copro_id uuid;
  v_res      record;
  v_issues   jsonb := '[]'::jsonb;
  v_vars     jsonb;
begin
  select m.copro_id into v_copro_id
  from public.ag_meetings m
  where m.id = p_ag_id;

  if v_copro_id is null then
    raise exception 'validate_ag_variables: AG % introuvable', p_ag_id
      using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_has_copro_access(v_copro_id) then
    raise exception 'forbidden: accès copro requis pour valider les variables de l''AG %', p_ag_id
      using errcode = '42501';
  end if;

  for v_res in
    select r.id, r.resolution_number, r.title, r.action_type, coalesce(r.variables, '{}'::jsonb) as variables
    from public.ag_resolutions r
    where r.ag_id = p_ag_id
      and r.action_type is not null
    order by r.resolution_number
  loop
    v_vars := v_res.variables;

    case v_res.action_type
      when 'CREATE_BUDGET', 'CREATE_WORK_BUDGET', 'CREATE_ALUR_FUND' then
        if not (v_vars ? 'amount') and not (v_vars ? 'total_amount')
           and v_res.action_type <> 'CREATE_ALUR_FUND' then
          v_issues := v_issues || jsonb_build_object(
            'resolution_number', v_res.resolution_number, 'action_type', v_res.action_type,
            'issue', 'montant du budget manquant (variables.amount ou total_amount)');
        end if;
      when 'APPROVE_ACCOUNTS' then
        if not (v_vars ? 'date_debut') or not (v_vars ? 'date_fin') then
          v_issues := v_issues || jsonb_build_object(
            'resolution_number', v_res.resolution_number, 'action_type', v_res.action_type,
            'issue', 'période à approuver incomplète (variables.date_debut / date_fin)');
        end if;
      when 'SCHEDULE_BUDGET_PAYMENTS', 'SCHEDULE_ALUR_PAYMENTS', 'CREATE_EXCEPTIONAL_CALL' then
        if not (v_vars ? 'mode') then
          v_issues := v_issues || jsonb_build_object(
            'resolution_number', v_res.resolution_number, 'action_type', v_res.action_type,
            'issue', 'mode d''échéancier manquant (variables.mode)');
        end if;
      when 'ELECT_COUNCIL' then
        if not (v_vars ? 'council_members')
           or jsonb_typeof(v_vars -> 'council_members') <> 'array'
           or jsonb_array_length(v_vars -> 'council_members') = 0 then
          v_issues := v_issues || jsonb_build_object(
            'resolution_number', v_res.resolution_number, 'action_type', v_res.action_type,
            'issue', 'liste des membres élus manquante ou vide (variables.council_members[])');
        end if;
      when 'MANAGE_CONTRACT' then
        if not (v_vars ? 'contract_id') then
          v_issues := v_issues || jsonb_build_object(
            'resolution_number', v_res.resolution_number, 'action_type', v_res.action_type,
            'issue', 'contrat à activer manquant (variables.contract_id)');
        end if;
      else
        null;
    end case;
  end loop;

  return jsonb_build_object(
    'success', true,
    'ag_id', p_ag_id,
    'is_valid', (jsonb_array_length(v_issues) = 0),
    'issues', v_issues
  );
end;
$$;
revoke execute on function public.validate_ag_variables(uuid) from public, anon;
grant execute on function public.validate_ag_variables(uuid) to authenticated, service_role;

-- ============================================================================================
-- SECTION 2 — VUES (palier 1) — remplacent les 8 compteurs dénormalisés supprimés de ag_resolutions
-- Toutes en security_invoker = true (héritent la RLS de la table sous-jacente, posée en 0034).
-- ============================================================================================

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- v_ag_resolution_vote_summary — agrégats bruts des votes par résolution
-- ────────────────────────────────────────────────────────────────────────────────────────────
-- Ne compte que les votes non exclus (is_excluded = false). counts (nb votants) + tantièmes par sens.
create or replace view public.v_ag_resolution_vote_summary
with (security_invoker = true) as
select
  v.resolution_id,
  count(*) filter (where v.vote = 'for')                                          as votes_for,
  count(*) filter (where v.vote = 'against')                                      as votes_against,
  count(*) filter (where v.vote = 'abstention')                                   as votes_abstention,
  coalesce(sum(v.tantiemes) filter (where v.vote = 'for'), 0)                     as tantiemes_for,
  coalesce(sum(v.tantiemes) filter (where v.vote = 'against'), 0)                 as tantiemes_against,
  coalesce(sum(v.tantiemes) filter (where v.vote = 'abstention'), 0)              as tantiemes_abstention,
  coalesce(sum(v.tantiemes), 0)                                                   as total_expressed
from public.ag_votes v
where v.is_excluded = false
group by v.resolution_id;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- v_ag_resolutions_results — résolution + statut/seuils + agrégats de votes
-- ────────────────────────────────────────────────────────────────────────────────────────────
create or replace view public.v_ag_resolutions_results
with (security_invoker = true) as
select
  r.id                                  as resolution_id,
  r.ag_id,
  r.copro_id,
  r.resolution_number,
  r.title,
  r.resolution_type,
  r.majority_type,
  r.action_type,
  r.status,
  r.threshold_tantiemes,
  r.threshold_voters,
  r.is_bridgeable,
  r.voted_at,
  coalesce(s.votes_for, 0)              as votes_for,
  coalesce(s.votes_against, 0)          as votes_against,
  coalesce(s.votes_abstention, 0)       as votes_abstention,
  coalesce(s.tantiemes_for, 0)          as tantiemes_for,
  coalesce(s.tantiemes_against, 0)      as tantiemes_against,
  coalesce(s.tantiemes_abstention, 0)   as tantiemes_abstention,
  coalesce(s.total_expressed, 0)        as total_expressed
from public.ag_resolutions r
left join public.v_ag_resolution_vote_summary s on s.resolution_id = r.id;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- v_ag_vote_stats_by_resolution — ratios (% pour/contre/abstention) sur exprimés et sur total copro
-- ────────────────────────────────────────────────────────────────────────────────────────────
-- total_tantiemes = clé générale active de la copro de la résolution. La lateral résout d'abord
-- l'id de la clé générale active (limit 1) puis somme sur CE key_id — pattern 0027 : évite le
-- double-comptage si plusieurs clés générales étaient actives (aucune contrainte d'unicité en 0009).
create or replace view public.v_ag_vote_stats_by_resolution
with (security_invoker = true) as
select
  r.id                                  as resolution_id,
  r.ag_id,
  r.copro_id,
  coalesce(s.tantiemes_for, 0)          as tantiemes_for,
  coalesce(s.tantiemes_against, 0)      as tantiemes_against,
  coalesce(s.tantiemes_abstention, 0)   as tantiemes_abstention,
  coalesce(s.total_expressed, 0)        as total_expressed,
  coalesce(t.total_tantiemes, 0)        as total_tantiemes,
  case when coalesce(s.total_expressed, 0) > 0
    then round(coalesce(s.tantiemes_for, 0) * 100.0 / s.total_expressed, 2) else 0 end       as pct_for_expressed,
  case when coalesce(s.total_expressed, 0) > 0
    then round(coalesce(s.tantiemes_against, 0) * 100.0 / s.total_expressed, 2) else 0 end   as pct_against_expressed,
  case when coalesce(s.total_expressed, 0) > 0
    then round(coalesce(s.tantiemes_abstention, 0) * 100.0 / s.total_expressed, 2) else 0 end as pct_abstention_expressed,
  case when coalesce(t.total_tantiemes, 0) > 0
    then round(coalesce(s.tantiemes_for, 0) * 100.0 / t.total_tantiemes, 2) else 0 end       as pct_for_total,
  case when coalesce(t.total_tantiemes, 0) > 0
    then round(coalesce(s.tantiemes_against, 0) * 100.0 / t.total_tantiemes, 2) else 0 end   as pct_against_total,
  case when coalesce(t.total_tantiemes, 0) > 0
    then round(coalesce(s.tantiemes_abstention, 0) * 100.0 / t.total_tantiemes, 2) else 0 end as pct_abstention_total
from public.ag_resolutions r
left join public.v_ag_resolution_vote_summary s on s.resolution_id = r.id
left join lateral (
  select coalesce(sum(rkl.weight), 0) as total_tantiemes
  from public.repartition_key_lines rkl
  where rkl.key_id = (
    select rk.id
    from public.repartition_keys rk
    where rk.copro_id = r.copro_id
      and rk.category = 'general'
      and rk.is_active = true
    limit 1
  )
) t on true;

-- ============================================================================================
-- SECTION 3 — TRIGGERS (palier 1)
-- ============================================================================================

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- trg_ag_attendance_tantiemes — recalcule ag_attendance.tantiemes depuis lot_ids (clé générale)
-- ────────────────────────────────────────────────────────────────────────────────────────────
-- BEFORE INSERT OR UPDATE OF lot_ids. tantiemes = Σ weight (clé générale active de la copro) des
-- lots présents (lot_ids). On prend le POIDS DU LOT présent (pas par personne) : Σ weight des lots.
-- ASYMÉTRIE VOLONTAIRE (acté par le plan) : la présence compte le poids PLEIN du lot, alors que le
-- vote (cast_vote) ne porte que la quote-part (weight × share_percent/100) en indivision. Ces
-- tantièmes de présence ne servent qu'à des INDICATEURS (pas de quorum légal, pas à la décision de
-- majorité). Ne JAMAIS fonder un quorum « légal » sur present_tantiemes. La clé générale active est
-- résolue en UNE ligne (limit 1) puis sommée sur CE key_id (évite le double-comptage multi-clés).
create or replace function public.tr_ag_attendance_tantiemes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key uuid;
  v_t   numeric;
begin
  select rk.id
    into v_key
  from public.repartition_keys rk
  where rk.copro_id = new.copro_id
    and rk.category = 'general'
    and rk.is_active = true
  limit 1;

  if v_key is null then
    raise exception 'tr_ag_attendance_tantiemes: clé de répartition générale active introuvable (copro %)', new.copro_id
      using errcode = '23503';
  end if;

  select coalesce(sum(rkl.weight), 0)
    into v_t
  from public.repartition_key_lines rkl
  where rkl.key_id = v_key
    and rkl.lot_id = any(new.lot_ids);

  new.tantiemes := v_t;
  return new;
end;
$$;
revoke execute on function public.tr_ag_attendance_tantiemes() from public, anon, authenticated;

create trigger trg_ag_attendance_tantiemes
  before insert or update of lot_ids on public.ag_attendance
  for each row execute function public.tr_ag_attendance_tantiemes();

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- trg_ag_vote_requires_attendance — un vote 'live' exige une présence present/proxy  (ex-check_duplicate)
-- ────────────────────────────────────────────────────────────────────────────────────────────
-- BEFORE INSERT ON ag_votes. Si vote_source='live' et qu'il n'existe pas de ag_attendance du votant
-- pour l'AG de la résolution avec presence_type in ('present','proxy') → rejet 23514. Les votes
-- 'correspondence' ne sont pas soumis à cette garde.
create or replace function public.tr_ag_vote_requires_attendance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ag_id uuid;
begin
  if new.vote_source = 'live' then
    select r.ag_id into v_ag_id
    from public.ag_resolutions r
    where r.id = new.resolution_id;

    if not exists (
      select 1
      from public.ag_attendance a
      where a.ag_id = v_ag_id
        and a.coproprietaire_id = new.coproprietaire_id
        and a.presence_type in ('present', 'proxy')
    ) then
      raise exception 'vote live refusé : le copropriétaire % n''est ni présent ni représenté à l''AG %',
        new.coproprietaire_id, v_ag_id
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.tr_ag_vote_requires_attendance() from public, anon, authenticated;

create trigger trg_ag_vote_requires_attendance
  before insert on public.ag_votes
  for each row execute function public.tr_ag_vote_requires_attendance();

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- trg_ag_close_clear_drafts — purge les brouillons de séance à la clôture
-- ────────────────────────────────────────────────────────────────────────────────────────────
-- AFTER UPDATE OF status ON ag_meetings. Si le nouveau statut est un état clos → supprime les
-- ag_session_drafts de l'AG. Ne se déclenche que sur transition vers un état clos.
create or replace function public.tr_ag_close_clear_drafts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('closed', 'pv_generated', 'pv_signed', 'pv_sent', 'finalized', 'archived')
     and new.status is distinct from old.status then
    delete from public.ag_session_drafts where ag_id = new.id;
  end if;
  return new;
end;
$$;
revoke execute on function public.tr_ag_close_clear_drafts() from public, anon, authenticated;

create trigger trg_ag_close_clear_drafts
  after update of status on public.ag_meetings
  for each row execute function public.tr_ag_close_clear_drafts();

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- enforce_copro_consistency — cohérence intra-copro (copro_id ligne = copro_id du parent)
-- ────────────────────────────────────────────────────────────────────────────────────────────
-- BEFORE INSERT OR UPDATE sur les tables AG/conseil qui portent un copro_id ET un PARENT au-dessus
-- de la copro : ag_resolutions, ag_votes, ag_attendance, ag_correspondence_votes,
-- ag_correspondence_vote_details, council_votes. Re-quête le copro_id du parent (jamais d'image
-- figée) selon la table (TG_TABLE_NAME) et lève 23514 si divergence.
-- NB : council_decisions est VOLONTAIREMENT exclue — sa copro_id EST la racine (pas de parent à
-- recouper), et son existence est déjà garantie par la FK council_decisions.copro_id -> copros.
-- Une branche council_decisions serait une tautologie (new.copro_id <> new.copro_id, toujours faux).
create or replace function public.enforce_copro_consistency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_copro uuid;
begin
  case tg_table_name
    when 'ag_resolutions' then
      select m.copro_id into v_parent_copro
      from public.ag_meetings m where m.id = new.ag_id;
    when 'ag_votes' then
      select r.copro_id into v_parent_copro
      from public.ag_resolutions r where r.id = new.resolution_id;
    when 'ag_attendance' then
      select m.copro_id into v_parent_copro
      from public.ag_meetings m where m.id = new.ag_id;
    when 'ag_correspondence_votes' then
      select m.copro_id into v_parent_copro
      from public.ag_meetings m where m.id = new.ag_id;
    when 'ag_correspondence_vote_details' then
      select f.copro_id into v_parent_copro
      from public.ag_correspondence_votes f where f.id = new.correspondence_form_id;
    when 'council_votes' then
      select d.copro_id into v_parent_copro
      from public.council_decisions d where d.id = new.decision_id;
    else
      v_parent_copro := new.copro_id;
  end case;

  if v_parent_copro is null then
    raise exception 'enforce_copro_consistency: parent introuvable pour % (id=%)', tg_table_name, new.id
      using errcode = '23503';
  end if;

  if new.copro_id is distinct from v_parent_copro then
    raise exception 'enforce_copro_consistency: % copro_id=% incohérent avec le parent (copro_id=%)',
      tg_table_name, new.copro_id, v_parent_copro
      using errcode = '23514';
  end if;

  return new;
end;
$$;
revoke execute on function public.enforce_copro_consistency() from public, anon, authenticated;

create trigger trg_enforce_copro_consistency_ag_resolutions
  before insert or update on public.ag_resolutions
  for each row execute function public.enforce_copro_consistency();
create trigger trg_enforce_copro_consistency_ag_votes
  before insert or update on public.ag_votes
  for each row execute function public.enforce_copro_consistency();
create trigger trg_enforce_copro_consistency_ag_attendance
  before insert or update on public.ag_attendance
  for each row execute function public.enforce_copro_consistency();
create trigger trg_enforce_copro_consistency_ag_corr_votes
  before insert or update on public.ag_correspondence_votes
  for each row execute function public.enforce_copro_consistency();
create trigger trg_enforce_copro_consistency_ag_corr_details
  before insert or update on public.ag_correspondence_vote_details
  for each row execute function public.enforce_copro_consistency();
create trigger trg_enforce_copro_consistency_council_votes
  before insert or update on public.council_votes
  for each row execute function public.enforce_copro_consistency();


-- SECTION 4 — CHAÎNE AUTO-POPULATION AG → GL (palier 2, tout-ou-rien)
-- ============================================================================================
-- Pivot (prepare_ag_decisions) → générateur d'appels (generate_calls_from_ag_payload) →
-- dispatch tout-ou-rien (activate_ag_decisions) → orchestrateur 1-transaction (finalize_and_activate_ag).
-- AUCUN exception when others dans le dispatch (sinon le tout-ou-rien casse). Appels canoniques 0026/0027.

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 4a. prepare_ag_decisions — PIVOT : matérialise les résolutions approuvées en ag_pending_actions  [G-MGR]
-- ────────────────────────────────────────────────────────────────────────────────────────────
-- Pour chaque résolution approved + action_type mappé (hors DESIGNATE_BUREAU) : une pending_action
-- (target_table liste blanche 0017, payload = variables). APPROVE_ACCOUNTS résout target_id = période N
-- couvrant date_debut..date_fin. Idempotent (on conflict ag_id,resolution_id do nothing).
create or replace function public.prepare_ag_decisions(p_ag_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_copro_id  uuid;
  v_res       record;
  v_target    text;
  v_target_id uuid;
  v_payload   jsonb;
  v_prepared  integer := 0;
begin
  select m.copro_id into v_copro_id
  from public.ag_meetings m
  where m.id = p_ag_id;

  if v_copro_id is null then
    raise exception 'prepare_ag_decisions: AG % introuvable', p_ag_id using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_copro_id) then
    raise exception 'forbidden: gestionnaire requis pour préparer les décisions de l''AG %', p_ag_id
      using errcode = '42501';
  end if;

  for v_res in
    select r.id, r.resolution_number, r.action_type,
           coalesce(r.variables, '{}'::jsonb) as variables
    from public.ag_resolutions r
    where r.ag_id = p_ag_id
      and r.status = 'approved'
      and r.action_type is not null
      and r.action_type <> 'DESIGNATE_BUREAU'
    order by r.resolution_number
  loop
    v_target_id := null;
    v_payload   := v_res.variables;

    v_target := case v_res.action_type
      when 'CREATE_BUDGET'            then 'budgets'
      when 'CREATE_WORK_BUDGET'       then 'budgets'
      when 'CREATE_ALUR_FUND'         then 'budgets'
      when 'GRANT_QUITUS'             then 'budgets'
      when 'APPROVE_ACCOUNTS'         then 'accounting_periods'
      when 'SCHEDULE_BUDGET_PAYMENTS' then 'call_for_funds'
      when 'CREATE_EXCEPTIONAL_CALL'  then 'call_for_funds'
      when 'SCHEDULE_ALUR_PAYMENTS'   then 'call_for_funds'
      when 'ELECT_COUNCIL'            then 'council_members'
      when 'APPOINT_SYNDIC'           then 'copros'
      when 'MANAGE_CONTRACT'          then 'contracts'
      else null
    end;

    if v_target is null then
      raise exception 'prepare_ag_decisions: action_type % non cartographié (résolution %)',
        v_res.action_type, v_res.resolution_number using errcode = '23514';
    end if;

    -- APPROVE_ACCOUNTS : résoudre la période N couvrant date_debut..date_fin (pas d'approve_period(NULL)).
    if v_res.action_type = 'APPROVE_ACCOUNTS' then
      if not (v_payload ? 'date_debut') or not (v_payload ? 'date_fin') then
        raise exception 'prepare_ag_decisions: APPROVE_ACCOUNTS sans date_debut/date_fin (résolution %)',
          v_res.resolution_number using errcode = '23514';
      end if;
      select p.id into v_target_id
      from public.accounting_periods p
      where p.copro_id = v_copro_id
        and p.start_date <= (v_payload ->> 'date_debut')::date
        and p.end_date   >= (v_payload ->> 'date_fin')::date
      order by p.start_date desc
      limit 1;
      if v_target_id is null then
        raise exception 'prepare_ag_decisions: aucune période ne couvre % .. % (copro %)',
          (v_payload ->> 'date_debut'), (v_payload ->> 'date_fin'), v_copro_id
          using errcode = '23503';
      end if;
    end if;

    insert into public.ag_pending_actions
      (ag_id, resolution_id, action_type, target_table, target_id, payload, status)
    values
      (p_ag_id, v_res.id, v_res.action_type, v_target, v_target_id, v_payload, 'pending')
    on conflict (ag_id, resolution_id) do nothing;

    if found then
      v_prepared := v_prepared + 1;
    end if;
  end loop;

  return jsonb_build_object('success', true, 'ag_id', p_ag_id, 'prepared', v_prepared);
end;
$$;
revoke execute on function public.prepare_ag_decisions(uuid) from public, anon;
grant execute on function public.prepare_ag_decisions(uuid) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 4b. generate_calls_from_ag_payload — émet les appels de fonds d'une résolution d'échéancier  [G-MGR]
-- ────────────────────────────────────────────────────────────────────────────────────────────
-- Résout le budget (payload.budget_id > linked_*_budget_id > budgets(source_ag_id, type, status='validated')),
-- lit le mode (UNIQUE/SEMESTRIEL/TRIMESTRIEL/PERSONNALISE) et boucle post_budget_call_for_funds (0026,
-- installment ou fraction). Pas temporel dérivé du mode. INVARIANT : la période du budget DOIT être 'open'
-- (create_ledger_transaction l'exige) — message métier clair sinon. Idempotence alignée sur la vraie clé
-- uq_call_idempotent (copro_id, period_id, label, issue_date) : 23505 sauté ciblé (jamais when others).
create or replace function public.generate_calls_from_ag_payload(
  p_ag_id         uuid,
  p_copro_id      uuid,
  p_resolution_id uuid,
  p_payload       jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_res          record;
  v_budget_id    uuid;
  v_budget_type  text;
  v_period_id    uuid;
  v_period_status period_status;
  v_mode         text;
  v_count        integer;
  v_issue_date   date;
  v_due_date     date;
  v_fractions    jsonb;
  v_step         interval;
  v_n            integer;
  v_label        text;
  v_trimester    integer;
  v_fraction     numeric;
  v_use_inst     boolean;
  v_iss          date;
  v_due          date;
  v_call         jsonb;
  v_calls        jsonb := '[]'::jsonb;
begin
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: gestionnaire requis pour générer les appels de l''AG %', p_ag_id
      using errcode = '42501';
  end if;

  select r.id, r.resolution_number, r.action_type, r.linked_budget_id, r.linked_work_budget_id,
         coalesce(r.variables, '{}'::jsonb) as variables
    into v_res
  from public.ag_resolutions r
  where r.id = p_resolution_id and r.copro_id = p_copro_id;

  if v_res.id is null then
    raise exception 'generate_calls_from_ag_payload: résolution % introuvable (copro %)', p_resolution_id, p_copro_id
      using errcode = '23503';
  end if;

  -- nature du budget visé selon l'action
  v_budget_type := case v_res.action_type
    when 'SCHEDULE_BUDGET_PAYMENTS' then 'current'
    when 'CREATE_EXCEPTIONAL_CALL'  then 'works'
    when 'SCHEDULE_ALUR_PAYMENTS'   then 'alur'
    when 'CREATE_ALUR_FUND'         then 'alur'
    when 'CREATE_WORK_BUDGET'       then 'works'
    when 'CREATE_BUDGET'            then 'current'
    else 'current'
  end;

  -- résolution du budget : payload.budget_id > linked_*_budget_id > budgets(source_ag_id, type) validé
  v_budget_id := nullif(p_payload ->> 'budget_id', '')::uuid;
  if v_budget_id is null then
    v_budget_id := case
      when v_budget_type = 'works' then coalesce(v_res.linked_work_budget_id, v_res.linked_budget_id)
      else v_res.linked_budget_id
    end;
  end if;
  if v_budget_id is null then
    -- privilégie un budget VALIDÉ (un appel ne se poste pas sur un budget brouillon) ; fallback dernière version
    select b.id into v_budget_id
    from public.budgets b
    where b.copro_id = p_copro_id
      and b.source_ag_id = p_ag_id
      and b.budget_type::text = v_budget_type
    order by (b.status = 'validated') desc, b.version desc
    limit 1;
  end if;
  if v_budget_id is null then
    raise exception 'generate_calls_from_ag_payload: budget % introuvable (résolution %, AG %)',
      v_budget_type, v_res.resolution_number, p_ag_id using errcode = '23503';
  end if;

  select b.period_id, b.budget_type::text
    into v_period_id, v_budget_type
  from public.budgets b
  where b.id = v_budget_id and b.copro_id = p_copro_id;
  if v_period_id is null then
    raise exception 'generate_calls_from_ag_payload: budget % introuvable pour la copro %', v_budget_id, p_copro_id
      using errcode = '23503';
  end if;

  -- INVARIANT : on n'appelle de fonds que sur un budget VALIDÉ (voté) — jamais un brouillon. Une résolution
  -- SCHEDULE_* sans CREATE_BUDGET associé (donc sans validate_budget en amont) ne doit pas poster au GL.
  if (select b.status from public.budgets b where b.id = v_budget_id) is distinct from 'validated' then
    raise exception 'generate_calls_from_ag_payload: budget % non validé — appel de fonds refusé (valider le budget avant l''appel)', v_budget_id
      using errcode = '23514';
  end if;

  -- INVARIANT : appel posté sur une période OUVERTE (create_ledger_transaction l'exige) — message métier clair
  select status into v_period_status from public.accounting_periods where id = v_period_id;
  if v_period_status is distinct from 'open' then
    raise exception 'generate_calls_from_ag_payload: période du budget % non ouverte (statut=%) — l''appel exige un exercice open', v_budget_id, v_period_status
      using errcode = '23514';
  end if;

  -- mode d'échéancier + nombre d'échéances
  v_mode := upper(coalesce(p_payload ->> 'mode', 'UNIQUE'));
  v_fractions := case when jsonb_typeof(p_payload -> 'fractions') = 'array'
                      then p_payload -> 'fractions' else null end;
  v_count := case v_mode
    when 'UNIQUE'      then 1
    when 'SEMESTRIEL'  then 2
    when 'TRIMESTRIEL' then 4
    when 'PERSONNALISE' then coalesce(
      nullif(p_payload ->> 'count', '')::integer,
      case when v_fractions is not null then jsonb_array_length(v_fractions) else null end,
      1)
    else 1
  end;
  if v_count < 1 then
    raise exception 'generate_calls_from_ag_payload: nombre d''échéances invalide (% en mode %)', v_count, v_mode
      using errcode = '23514';
  end if;

  -- pas temporel dérivé du mode (SEMESTRIEL = 6 mois, TRIMESTRIEL = 3, PERSONNALISE = 1, UNIQUE = aucun)
  v_step := case v_mode
    when 'SEMESTRIEL'   then interval '6 months'
    when 'TRIMESTRIEL'  then interval '3 months'
    when 'PERSONNALISE' then interval '1 month'
    else interval '0'
  end;

  -- dates de base (issue/due)
  v_issue_date := coalesce(nullif(p_payload ->> 'issue_date', '')::date, current_date);
  v_due_date   := coalesce(nullif(p_payload ->> 'due_date', '')::date, v_issue_date);

  -- PERSONNALISE avec fractions explicites => mode fraction (sinon répartition par installment)
  v_use_inst := not (v_mode = 'PERSONNALISE' and v_fractions is not null);

  for v_n in 1 .. v_count loop
    -- label discriminant par budget (évite la collision uq_call_idempotent entre deux natures même date/période)
    v_label := case
      when v_mode = 'PERSONNALISE' or v_n > 4
        then 'AG rés. ' || v_res.resolution_number || ' — ' || v_budget_type || ' éch. ' || v_n || '/' || v_count
      else 'AG rés. ' || v_res.resolution_number || ' — ' || v_budget_type || ' T' || v_n
    end;

    v_iss := (v_issue_date + ((v_n - 1) * v_step))::date;
    v_due := (v_due_date   + ((v_n - 1) * v_step))::date;
    v_trimester := case when v_mode = 'TRIMESTRIEL' and v_n between 1 and 4 then v_n else null end;

    -- idempotence sur la VRAIE clé uq_call_idempotent (copro_id, period_id, label, issue_date)
    if exists (
      select 1 from public.call_for_funds c
      where c.copro_id = p_copro_id and c.period_id = v_period_id
        and c.label = v_label and c.issue_date = v_iss
    ) then
      continue;
    end if;

    if v_use_inst then
      v_call := public.post_budget_call_for_funds(
        p_copro_id, v_period_id, v_budget_id, v_label, v_trimester,
        v_iss, v_due, 1.0, v_n, v_count
      );
    else
      v_fraction := (v_fractions ->> (v_n - 1))::numeric;
      if v_fraction is null or v_fraction <= 0 then
        raise exception 'generate_calls_from_ag_payload: fraction % invalide à l''échéance %', v_fraction, v_n
          using errcode = '23514';
      end if;
      v_call := public.post_budget_call_for_funds(
        p_copro_id, v_period_id, v_budget_id, v_label, v_trimester,
        v_iss, v_due, v_fraction, null, null
      );
    end if;

    v_calls := v_calls || jsonb_build_array(jsonb_build_object(
      'call_id', v_call ->> 'call_id',
      'ledger_tx_id', v_call ->> 'ledger_tx_id',
      'total_amount', v_call ->> 'total_amount',
      'label', v_label
    ));
  end loop;

  return jsonb_build_object(
    'success', true,
    'resolution_id', p_resolution_id,
    'budget_id', v_budget_id,
    'mode', v_mode,
    'count', v_count,
    'calls', v_calls
  );
end;
$$;
revoke execute on function public.generate_calls_from_ag_payload(uuid, uuid, uuid, jsonb) from public, anon;
grant execute on function public.generate_calls_from_ag_payload(uuid, uuid, uuid, jsonb) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 4c. activate_ag_decisions — dispatch TOUT-OU-RIEN AG→GL (aucun exception when others)  [G-MGR]
-- ────────────────────────────────────────────────────────────────────────────────────────────
-- Boucle ag_pending_actions status='pending'. ORDRE : CREATE_*/validate AVANT SCHEDULE_*/appels, et
-- APPROVE_ACCOUNTS EN DERNIER (il clôt N alors que les appels exigent N open — un seul exercice open).
-- Toute erreur RAISE → rollback global. Les 'activated' sont sautées (re-finalize = no-op).
create or replace function public.activate_ag_decisions(p_ag_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_copro_id    uuid;
  v_act         record;
  v_count       integer := 0;
  v_details     jsonb := '[]'::jsonb;
  v_budget_id   uuid;
  v_link_cur    uuid;
  v_link_works  uuid;
  v_budget_type budget_type;
  v_period_status period_status;
  v_member      jsonb;
  v_cop_id      uuid;
  v_role        council_role;
  v_inserted    integer;
  v_contract_id uuid;
  v_domain_id   uuid;
  v_cur_status  contract_status;
  v_start_date  date;
  v_result      jsonb;
begin
  select m.copro_id into v_copro_id
  from public.ag_meetings m
  where m.id = p_ag_id;

  if v_copro_id is null then
    raise exception 'activate_ag_decisions: AG % introuvable', p_ag_id using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_copro_id) then
    raise exception 'forbidden: gestionnaire requis pour activer les décisions de l''AG %', p_ag_id
      using errcode = '42501';
  end if;

  -- ORDRE : 0 = budgets/validation, 1 = appels (après validation), 2 = APPROVE_ACCOUNTS (clôt la période)
  for v_act in
    select a.id, a.resolution_id, a.action_type, a.target_table, a.target_id,
           coalesce(a.payload, '{}'::jsonb) as payload
    from public.ag_pending_actions a
    where a.ag_id = p_ag_id
      and a.status = 'pending'
    order by case a.action_type
               when 'APPROVE_ACCOUNTS'         then 2
               when 'SCHEDULE_BUDGET_PAYMENTS' then 1
               when 'CREATE_EXCEPTIONAL_CALL'  then 1
               when 'SCHEDULE_ALUR_PAYMENTS'   then 1
               else 0
             end,
             a.id
  loop
    v_result := jsonb_build_object('note', 'activated');

    case v_act.action_type

      -- budgets prévisionnel / travaux : validation seule (le GL des appels passe par SCHEDULE_*)
      when 'CREATE_BUDGET', 'CREATE_WORK_BUDGET' then
        v_budget_type := (case when v_act.action_type = 'CREATE_WORK_BUDGET' then 'works' else 'current' end)::budget_type;
        select r.linked_budget_id, r.linked_work_budget_id
          into v_link_cur, v_link_works
        from public.ag_resolutions r
        where r.id = v_act.resolution_id;
        v_budget_id := case when v_act.action_type = 'CREATE_WORK_BUDGET' then v_link_works else v_link_cur end;
        if v_budget_id is null then
          select b.id into v_budget_id
          from public.budgets b
          where b.source_ag_id = p_ag_id and b.budget_type = v_budget_type
          order by b.version desc
          limit 1;
        end if;
        if v_budget_id is null then
          raise exception 'activate_ag_decisions: budget % introuvable pour l''AG % (résolution %)',
            v_budget_type, p_ag_id, v_act.resolution_id using errcode = '23503';
        end if;
        v_result := public.validate_budget(v_budget_id);

      -- fonds de travaux ALUR : valider le budget alur puis poster l'appel (D450-5/C105 via post_budget_call_for_funds)
      when 'CREATE_ALUR_FUND' then
        select b.id into v_budget_id
        from public.budgets b
        where b.source_ag_id = p_ag_id and b.budget_type = 'alur'
        order by b.version desc
        limit 1;
        if v_budget_id is null then
          raise exception 'activate_ag_decisions: budget ALUR introuvable pour l''AG % (résolution %)',
            p_ag_id, v_act.resolution_id using errcode = '23503';
        end if;
        perform public.validate_budget(v_budget_id);
        v_result := public.generate_calls_from_ag_payload(p_ag_id, v_copro_id, v_act.resolution_id, v_act.payload);

      -- appels de fonds (courant / exceptionnel / ALUR) : boucle post_budget_call_for_funds via le payload
      when 'SCHEDULE_BUDGET_PAYMENTS', 'CREATE_EXCEPTIONAL_CALL', 'SCHEDULE_ALUR_PAYMENTS' then
        v_result := public.generate_calls_from_ag_payload(p_ag_id, v_copro_id, v_act.resolution_id, v_act.payload);

      -- approbation des comptes : ordre V4 sur target_id (= période N). open_next/regularize seulement s'il
      -- y a un solde reportable (sinon open_next_period RAISE "aucun solde" et casserait tout l'AG).
      when 'APPROVE_ACCOUNTS' then
        if v_act.target_id is null then
          raise exception 'activate_ag_decisions: APPROVE_ACCOUNTS sans période cible (AG %, résolution %)',
            p_ag_id, v_act.resolution_id using errcode = '23503';
        end if;
        select p.status into v_period_status
        from public.accounting_periods p
        where p.id = v_act.target_id;
        if v_period_status is null then
          raise exception 'activate_ag_decisions: période % introuvable (APPROVE_ACCOUNTS, AG %)',
            v_act.target_id, p_ag_id using errcode = '23503';
        end if;
        if v_period_status = 'approved' then
          -- déjà approuvée (AG rejouée / doublon) : no-op plutôt que casser tout l'AG (approve_period
          -- exige 'closed' et lèverait sinon, en rollback global, alors qu'il n'y a rien à refaire).
          v_result := jsonb_build_object('period_id', v_act.target_id, 'note', 'comptes déjà approuvés — no-op');
        else
          if v_period_status = 'open' then
            perform public.close_period(v_act.target_id);
          end if;
          -- reportable = MIROIR EXACT de open_next_period : un solde de BILAN (1/4/5) net par compte×lot,
          -- OU un RÉSULTAT net (AGRÉGAT des classes 6/7). Inclure les 6/7 PAR COMPTE (comme avant) ferait
          -- RAISE "aucun solde à reporter" sur un exercice au résultat net nul (charges = produits).
          if exists (
            select 1
            from public.ledger_entries e
            join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
            join public.accounts a on a.id = e.account_id
            where e.copro_id = v_copro_id and e.period_id = v_act.target_id
              and substr(a.code, 1, 1) in ('1', '4', '5')
            group by e.account_id, e.lot_id
            having round(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 2) <> 0
          ) or (
            select round(coalesce(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 0), 2) <> 0
            from public.ledger_entries e
            join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
            join public.accounts a on a.id = e.account_id
            where e.copro_id = v_copro_id and e.period_id = v_act.target_id
              and substr(a.code, 1, 1) in ('6', '7')
          ) then
            perform public.open_next_period(v_copro_id, v_act.target_id);
            perform public.regularize_period(v_copro_id, v_act.target_id);
          end if;
          perform public.approve_period(v_act.target_id);
          v_result := jsonb_build_object('period_id', v_act.target_id,
            'note', 'comptes approuvés (clôture N + à-nouveau N+1 + affectation si solde reportable)');
        end if;

      -- élection du conseil : désactiver l'ancien conseil puis upsert les élus (UNIQUE copro,copro_id,start_date)
      when 'ELECT_COUNCIL' then
        update public.council_members
        set is_active = false,
            end_date  = current_date
        where copro_id = v_copro_id and is_active;
        v_inserted := 0;
        for v_member in
          select * from jsonb_array_elements(coalesce(v_act.payload -> 'council_members', '[]'::jsonb))
        loop
          v_cop_id := (v_member ->> 'coproprietaire_id')::uuid;
          v_role   := coalesce(nullif(v_member ->> 'role', ''), 'member')::council_role;
          if v_cop_id is null then
            raise exception 'activate_ag_decisions: ELECT_COUNCIL — coproprietaire_id manquant (AG %)', p_ag_id
              using errcode = '23514';
          end if;
          -- copropriétaire ACTIF = possède au moins un lot actif (lot_owners.end_date is null) dans la copro
          if not exists (
            select 1 from public.lot_owners lo
            where lo.coproprietaire_id = v_cop_id
              and lo.copro_id = v_copro_id
              and lo.end_date is null
          ) then
            raise exception 'activate_ag_decisions: ELECT_COUNCIL — % n''est pas un copropriétaire actif de la copro %',
              v_cop_id, v_copro_id using errcode = '23514';
          end if;
          -- upsert : tolère un réélu déjà inséré au même start_date (re-run même jour, doublon payload)
          insert into public.council_members (copro_id, coproprietaire_id, role, start_date, is_active)
          values (v_copro_id, v_cop_id, v_role, current_date, true)
          on conflict (copro_id, coproprietaire_id, start_date)
            do update set role = excluded.role, is_active = true, end_date = null;
          v_inserted := v_inserted + 1;
        end loop;
        v_result := jsonb_build_object('elected', v_inserted, 'note', 'conseil syndical renouvelé');

      -- nomination du syndic : no-op informatif (copros sans colonne syndic — différé post-finance)
      when 'APPOINT_SYNDIC' then
        v_result := jsonb_build_object('note', 'informatif — mandat syndic différé post-finance');

      -- contrat : activer le contrat voté (jamais ressusciter un terminé) puis expirer l'ancien actif du domaine
      when 'MANAGE_CONTRACT' then
        v_contract_id := (v_act.payload ->> 'contract_id')::uuid;
        v_start_date  := coalesce((v_act.payload ->> 'start_date')::date, current_date);
        if v_contract_id is null then
          raise exception 'activate_ag_decisions: MANAGE_CONTRACT — contract_id manquant (AG %, résolution %)',
            p_ag_id, v_act.resolution_id using errcode = '23514';
        end if;
        select c.domain_id, c.status into v_domain_id, v_cur_status
        from public.contracts c
        where c.id = v_contract_id and c.copro_id = v_copro_id;
        if v_domain_id is null then
          raise exception 'activate_ag_decisions: MANAGE_CONTRACT — contrat % introuvable dans la copro %',
            v_contract_id, v_copro_id using errcode = '23503';
        end if;
        if v_cur_status = 'terminated' then
          raise exception 'activate_ag_decisions: MANAGE_CONTRACT — contrat % résilié, non réactivable (AG %)',
            v_contract_id, p_ag_id using errcode = '23514';
        end if;
        update public.contracts
        set status = 'active'
        where id = v_contract_id and copro_id = v_copro_id;
        -- expirer l'ancien actif du même domaine (end_date >= leur start_date garanti par le filtre)
        update public.contracts
        set status   = 'expired',
            end_date = v_start_date
        where copro_id = v_copro_id
          and domain_id = v_domain_id
          and id <> v_contract_id
          and status = 'active'
          and start_date < v_start_date;
        v_result := jsonb_build_object('contract_id', v_contract_id, 'note', 'contrat activé (renouvellement par date de début)');

      -- quitus : no-op informatif
      when 'GRANT_QUITUS' then
        v_result := jsonb_build_object('note', 'informatif — quitus accordé au syndic');

      else
        raise exception 'activate_ag_decisions: action_type % non géré (AG %, résolution %)',
          v_act.action_type, p_ag_id, v_act.resolution_id using errcode = '23514';
    end case;

    update public.ag_pending_actions
    set status       = 'activated',
        activated_at = now(),
        result_data  = v_result
    where id = v_act.id;

    v_count := v_count + 1;
    v_details := v_details || jsonb_build_object(
      'pending_action_id', v_act.id,
      'resolution_id', v_act.resolution_id,
      'action_type', v_act.action_type,
      'result', v_result
    );
  end loop;

  return jsonb_build_object(
    'success', true,
    'ag_id', p_ag_id,
    'activated', v_count,
    'details', v_details
  );
end;
$$;
revoke execute on function public.activate_ag_decisions(uuid) from public, anon;
grant execute on function public.activate_ag_decisions(uuid) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 4d. finalize_and_activate_ag — orchestrateur, point d'entrée unique (1 transaction = atomique)  [G-MGR]
-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 1) calculate_resolution_result sur les résolutions NON encore figées ; 2) prepare_ag_decisions ;
-- 3) si p_activate, activate_ag_decisions. Une seule fonction = une transaction → tout-ou-rien naturel.
create or replace function public.finalize_and_activate_ag(
  p_ag_id    uuid,
  p_activate boolean default true
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_copro_id    uuid;
  v_res         record;
  v_resolutions integer := 0;
  v_prepared    integer := 0;
  v_activated   integer := 0;
  v_prep        jsonb;
  v_act         jsonb;
begin
  select m.copro_id into v_copro_id
  from public.ag_meetings m
  where m.id = p_ag_id;

  if v_copro_id is null then
    raise exception 'finalize_and_activate_ag: AG % introuvable', p_ag_id using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_copro_id) then
    raise exception 'forbidden: gestionnaire requis pour finaliser et activer l''AG %', p_ag_id
      using errcode = '42501';
  end if;

  -- 1) figer le résultat des résolutions NON encore figées (re-finalize = no-op, aligné close_ag)
  for v_res in
    select r.id
    from public.ag_resolutions r
    where r.ag_id = p_ag_id
      and r.status in ('draft', 'pending', 'voting', 'voted')
    order by r.resolution_number
  loop
    perform public.calculate_resolution_result(v_res.id);
    v_resolutions := v_resolutions + 1;
  end loop;

  -- 2) pivot : écrire les pending_actions des résolutions approuvées
  v_prep := public.prepare_ag_decisions(p_ag_id);
  v_prepared := coalesce((v_prep ->> 'prepared')::integer, 0);

  -- 3) activer (dispatch tout-ou-rien) si demandé
  if p_activate then
    v_act := public.activate_ag_decisions(p_ag_id);
    v_activated := coalesce((v_act ->> 'activated')::integer, 0);
  end if;

  return jsonb_build_object(
    'success', true,
    'ag_id', p_ag_id,
    'resolutions', v_resolutions,
    'prepared', v_prepared,
    'activated', v_activated
  );
end;
$$;
revoke execute on function public.finalize_and_activate_ag(uuid, boolean) from public, anon;
grant execute on function public.finalize_and_activate_ag(uuid, boolean) to authenticated, service_role;


-- ============================================================================================
-- SECTION 5 — WIZARD / DRAFTS / CORRESPONDANCE / ENVOI / BUNDLES (palier 3)
-- ============================================================================================
-- Wizard (get/save/complete) · drafts session (save/get/delete/get_all/clear) · correspondance
-- (register=validateur -> ag_votes integres ; save=brouillon) · envoi tracking · bundles PDF.
-- get_ag_wizard_state NE depend PAS de ag_milestones (jalons via ag_session_drafts/step_data).
create or replace function public.get_ag_wizard_state(p_ag_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_copro_id   uuid;
  v_meeting    record;
  v_milestones jsonb;
  v_drafts     jsonb;
begin
  select m.copro_id, m.current_step, m.max_step_reached, m.wizard_mode,
         coalesce(m.step_data, '{}'::jsonb) as step_data, m.status
    into v_meeting
  from public.ag_meetings m
  where m.id = p_ag_id;

  if v_meeting.copro_id is null then
    raise exception 'get_ag_wizard_state: AG % introuvable', p_ag_id using errcode = '23503';
  end if;
  v_copro_id := v_meeting.copro_id;

  if not public.is_service_call() and not public.user_is_copro_manager(v_copro_id) then
    raise exception 'forbidden: gestionnaire requis pour l''état du wizard de l''AG %', p_ag_id
      using errcode = '42501';
  end if;

  select d.draft_data
    into v_milestones
  from public.ag_session_drafts d
  where d.ag_id = p_ag_id
    and d.draft_type = 'milestones'
  order by d.last_modified_at desc
  limit 1;

  if v_milestones is null then
    v_milestones := coalesce(v_meeting.step_data -> 'milestones', '{}'::jsonb);
  end if;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'draft_type', d.draft_type,
             'user_id', d.user_id,
             'version', d.version,
             'last_modified_at', d.last_modified_at
           ) order by d.draft_type
         ), '[]'::jsonb)
    into v_drafts
  from public.ag_session_drafts d
  where d.ag_id = p_ag_id;

  return jsonb_build_object(
    'success', true,
    'ag_id', p_ag_id,
    'status', v_meeting.status,
    'current_step', coalesce(v_meeting.current_step, 1),
    'max_step_reached', coalesce(v_meeting.max_step_reached, 1),
    'wizard_mode', coalesce(v_meeting.wizard_mode, 'guided'),
    'step_data', v_meeting.step_data,
    'milestones', v_milestones,
    'drafts', v_drafts
  );
end;
$$;
revoke execute on function public.get_ag_wizard_state(uuid) from public, anon;
grant execute on function public.get_ag_wizard_state(uuid) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 5b. save_ag_wizard_state — persiste étape courante / step_data / mode  [G-MGR]
-- ────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.save_ag_wizard_state(
  p_ag_id        uuid,
  p_current_step integer,
  p_step_data    jsonb default null,
  p_wizard_mode  text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_copro_id uuid;
  v_max      integer;
begin
  select m.copro_id, m.max_step_reached
    into v_copro_id, v_max
  from public.ag_meetings m
  where m.id = p_ag_id;

  if v_copro_id is null then
    raise exception 'save_ag_wizard_state: AG % introuvable', p_ag_id using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_copro_id) then
    raise exception 'forbidden: gestionnaire requis pour sauvegarder le wizard de l''AG %', p_ag_id
      using errcode = '42501';
  end if;

  if p_current_step < 1 or p_current_step > 9 then
    raise exception 'save_ag_wizard_state: étape % hors bornes (1..9) pour l''AG %', p_current_step, p_ag_id
      using errcode = '23514';
  end if;

  if p_wizard_mode is not null and p_wizard_mode not in ('guided', 'expert') then
    raise exception 'save_ag_wizard_state: wizard_mode % invalide (guided|expert) pour l''AG %', p_wizard_mode, p_ag_id
      using errcode = '23514';
  end if;

  update public.ag_meetings
  set current_step     = p_current_step,
      max_step_reached = greatest(coalesce(v_max, 1), p_current_step),
      step_data        = case when p_step_data is null
                              then step_data
                              else coalesce(step_data, '{}'::jsonb) || p_step_data end,
      wizard_mode      = coalesce(p_wizard_mode, wizard_mode)
  where id = p_ag_id;

  return jsonb_build_object(
    'success', true,
    'ag_id', p_ag_id,
    'current_step', p_current_step,
    'max_step_reached', greatest(coalesce(v_max, 1), p_current_step)
  );
end;
$$;
revoke execute on function public.save_ag_wizard_state(uuid, integer, jsonb, text) from public, anon;
grant execute on function public.save_ag_wizard_state(uuid, integer, jsonb, text) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 5c. complete_ag_wizard_step — marque une étape terminée et avance le wizard  [G-MGR]
-- ────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.complete_ag_wizard_step(
  p_ag_id     uuid,
  p_step      integer,
  p_next_step integer default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_copro_id uuid;
  v_max      integer;
  v_next     integer;
begin
  select m.copro_id, m.max_step_reached
    into v_copro_id, v_max
  from public.ag_meetings m
  where m.id = p_ag_id;

  if v_copro_id is null then
    raise exception 'complete_ag_wizard_step: AG % introuvable', p_ag_id using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_copro_id) then
    raise exception 'forbidden: gestionnaire requis pour avancer le wizard de l''AG %', p_ag_id
      using errcode = '42501';
  end if;

  if p_step < 1 or p_step > 9 then
    raise exception 'complete_ag_wizard_step: étape % hors bornes (1..9) pour l''AG %', p_step, p_ag_id
      using errcode = '23514';
  end if;

  v_next := least(9, coalesce(p_next_step, p_step + 1));
  if v_next < 1 then
    raise exception 'complete_ag_wizard_step: étape suivante % hors bornes (1..9) pour l''AG %', v_next, p_ag_id
      using errcode = '23514';
  end if;

  update public.ag_meetings
  set max_step_reached = greatest(coalesce(v_max, 1), p_step),
      current_step     = v_next
  where id = p_ag_id;

  return jsonb_build_object(
    'success', true,
    'ag_id', p_ag_id,
    'completed_step', p_step,
    'current_step', v_next,
    'max_step_reached', greatest(coalesce(v_max, 1), p_step)
  );
end;
$$;
revoke execute on function public.complete_ag_wizard_step(uuid, integer, integer) from public, anon;
grant execute on function public.complete_ag_wizard_step(uuid, integer, integer) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 5d. save_ag_session_draft — upsert d'un brouillon de wizard (ag_session_drafts)  [G-MGR]
-- ────────────────────────────────────────────────────────────────────────────────────────────
-- UNIQUE (ag_id, user_id, draft_type). user_id NOT NULL : auth.uid() (humain), repli ag_meetings.created_by
-- en appel machine ; 23514 si indéterminé. Upsert : draft_data remplacé, version++, last_modified_at=now().
create or replace function public.save_ag_session_draft(
  p_ag_id      uuid,
  p_draft_type ag_draft_type,
  p_draft_data jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_copro_id uuid;
  v_user_id  uuid;
  v_id       uuid;
  v_version  integer;
begin
  select m.copro_id, m.created_by
    into v_copro_id, v_user_id
  from public.ag_meetings m
  where m.id = p_ag_id;

  if v_copro_id is null then
    raise exception 'save_ag_session_draft: AG % introuvable', p_ag_id using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_copro_id) then
    raise exception 'forbidden: gestionnaire requis pour sauvegarder un brouillon de l''AG %', p_ag_id
      using errcode = '42501';
  end if;

  v_user_id := coalesce(auth.uid(), v_user_id);
  if v_user_id is null then
    raise exception 'save_ag_session_draft: user_id indéterminé (auth.uid() et created_by null) pour l''AG %', p_ag_id
      using errcode = '23514';
  end if;

  insert into public.ag_session_drafts
    (ag_id, copro_id, user_id, draft_type, draft_data, version, last_modified_at)
  values
    (p_ag_id, v_copro_id, v_user_id, p_draft_type, coalesce(p_draft_data, '{}'::jsonb), 1, now())
  on conflict (ag_id, user_id, draft_type)
    do update set draft_data       = excluded.draft_data,
                  version          = public.ag_session_drafts.version + 1,
                  last_modified_at = now()
  returning id, version into v_id, v_version;

  return jsonb_build_object(
    'success', true,
    'draft_id', v_id,
    'ag_id', p_ag_id,
    'draft_type', p_draft_type,
    'version', v_version
  );
end;
$$;
revoke execute on function public.save_ag_session_draft(uuid, ag_draft_type, jsonb) from public, anon;
grant execute on function public.save_ag_session_draft(uuid, ag_draft_type, jsonb) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 5e. get_ag_session_draft — lit un brouillon (par type) de l'appelant, repli created_by  [G-MGR]
-- ────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.get_ag_session_draft(
  p_ag_id      uuid,
  p_draft_type ag_draft_type
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_copro_id uuid;
  v_user_id  uuid;
  v_draft    record;
begin
  select m.copro_id, m.created_by
    into v_copro_id, v_user_id
  from public.ag_meetings m
  where m.id = p_ag_id;

  if v_copro_id is null then
    raise exception 'get_ag_session_draft: AG % introuvable', p_ag_id using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_copro_id) then
    raise exception 'forbidden: gestionnaire requis pour lire un brouillon de l''AG %', p_ag_id
      using errcode = '42501';
  end if;

  v_user_id := coalesce(auth.uid(), v_user_id);

  select d.id, d.draft_data, d.version, d.last_modified_at
    into v_draft
  from public.ag_session_drafts d
  where d.ag_id = p_ag_id
    and d.user_id = v_user_id
    and d.draft_type = p_draft_type;

  if v_draft.id is null then
    return jsonb_build_object(
      'success', true,
      'found', false,
      'ag_id', p_ag_id,
      'draft_type', p_draft_type
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'found', true,
    'draft_id', v_draft.id,
    'ag_id', p_ag_id,
    'draft_type', p_draft_type,
    'draft_data', v_draft.draft_data,
    'version', v_draft.version,
    'last_modified_at', v_draft.last_modified_at
  );
end;
$$;
revoke execute on function public.get_ag_session_draft(uuid, ag_draft_type) from public, anon;
grant execute on function public.get_ag_session_draft(uuid, ag_draft_type) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 5f. delete_ag_session_draft — supprime un brouillon (par type) de l'appelant  [G-MGR]
-- ────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.delete_ag_session_draft(
  p_ag_id      uuid,
  p_draft_type ag_draft_type
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_copro_id uuid;
  v_user_id  uuid;
  v_deleted  integer;
begin
  select m.copro_id, m.created_by
    into v_copro_id, v_user_id
  from public.ag_meetings m
  where m.id = p_ag_id;

  if v_copro_id is null then
    raise exception 'delete_ag_session_draft: AG % introuvable', p_ag_id using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_copro_id) then
    raise exception 'forbidden: gestionnaire requis pour supprimer un brouillon de l''AG %', p_ag_id
      using errcode = '42501';
  end if;

  v_user_id := coalesce(auth.uid(), v_user_id);

  delete from public.ag_session_drafts d
  where d.ag_id = p_ag_id
    and d.user_id = v_user_id
    and d.draft_type = p_draft_type;
  get diagnostics v_deleted = row_count;

  return jsonb_build_object(
    'success', true,
    'ag_id', p_ag_id,
    'draft_type', p_draft_type,
    'deleted', v_deleted
  );
end;
$$;
revoke execute on function public.delete_ag_session_draft(uuid, ag_draft_type) from public, anon;
grant execute on function public.delete_ag_session_draft(uuid, ag_draft_type) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 5g. get_ag_all_session_drafts — tous les brouillons d'une AG (tous types, tous utilisateurs)  [G-MGR]
-- ────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.get_ag_all_session_drafts(p_ag_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_copro_id uuid;
  v_drafts   jsonb;
begin
  select m.copro_id into v_copro_id
  from public.ag_meetings m
  where m.id = p_ag_id;

  if v_copro_id is null then
    raise exception 'get_ag_all_session_drafts: AG % introuvable', p_ag_id using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_copro_id) then
    raise exception 'forbidden: gestionnaire requis pour lire les brouillons de l''AG %', p_ag_id
      using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'draft_id', d.id,
             'draft_type', d.draft_type,
             'user_id', d.user_id,
             'draft_data', d.draft_data,
             'version', d.version,
             'last_modified_at', d.last_modified_at
           ) order by d.draft_type, d.last_modified_at desc
         ), '[]'::jsonb)
    into v_drafts
  from public.ag_session_drafts d
  where d.ag_id = p_ag_id;

  return jsonb_build_object(
    'success', true,
    'ag_id', p_ag_id,
    'drafts', v_drafts
  );
end;
$$;
revoke execute on function public.get_ag_all_session_drafts(uuid) from public, anon;
grant execute on function public.get_ag_all_session_drafts(uuid) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 5h. clear_ag_session_drafts — purge tous les brouillons d'une AG (tous types/utilisateurs)  [G-MGR]
-- ────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.clear_ag_session_drafts(p_ag_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_copro_id uuid;
  v_deleted  integer;
begin
  select m.copro_id into v_copro_id
  from public.ag_meetings m
  where m.id = p_ag_id;

  if v_copro_id is null then
    raise exception 'clear_ag_session_drafts: AG % introuvable', p_ag_id using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_copro_id) then
    raise exception 'forbidden: gestionnaire requis pour purger les brouillons de l''AG %', p_ag_id
      using errcode = '42501';
  end if;

  delete from public.ag_session_drafts d where d.ag_id = p_ag_id;
  get diagnostics v_deleted = row_count;

  return jsonb_build_object(
    'success', true,
    'ag_id', p_ag_id,
    'deleted', v_deleted
  );
end;
$$;
revoke execute on function public.clear_ag_session_drafts(uuid) from public, anon;
grant execute on function public.clear_ag_session_drafts(uuid) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 5i. register_correspondence_form_votes — enregistre ET intègre un formulaire (VALIDATEUR)  [G-MGR]
-- ────────────────────────────────────────────────────────────────────────────────────────────
-- En-tête UNIQUE (ag_id, coproprietaire_id) : upsert (status 'integrated'). Détails UNIQUE
-- (form_id, resolution_id) : upsert. p_votes=[{resolution_id, vote}]. p_mode_reception->reception_method
-- (CHECK postal|email|hand_delivery). 1 ag_votes par détail (vote_source='correspondence'). GARDE
-- D'INTÉGRITÉ : refuse d'écraser un vote 'live' figé pour cette (résolution, copropriétaire).
create or replace function public.register_correspondence_form_votes(
  p_ag_id             uuid,
  p_coproprietaire_id uuid,
  p_votes             jsonb,
  p_mode_reception    text default 'postal'
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_copro_id   uuid;
  v_ag_status  ag_status;
  v_form_id    uuid;
  v_key        uuid;
  v_tantiemes  numeric;
  v_item       jsonb;
  v_res_id     uuid;
  v_vote       vote_choice;
  v_res_copro  uuid;
  v_vote_id    uuid;
  v_integrated integer := 0;
begin
  select m.copro_id, m.status into v_copro_id, v_ag_status
  from public.ag_meetings m
  where m.id = p_ag_id;

  if v_copro_id is null then
    raise exception 'register_correspondence_form_votes: AG % introuvable', p_ag_id using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_copro_id) then
    raise exception 'forbidden: gestionnaire requis pour enregistrer un vote par correspondance sur l''AG %', p_ag_id
      using errcode = '42501';
  end if;

  if p_mode_reception not in ('postal', 'email', 'hand_delivery') then
    raise exception 'register_correspondence_form_votes: mode de réception % invalide (postal|email|hand_delivery)', p_mode_reception
      using errcode = '23514';
  end if;

  if v_ag_status not in ('convoked', 'in_progress', 'session_active') then
    raise exception 'register_correspondence_form_votes: AG non ouverte au vote (status=%) — formulaire refusé (AG %)', v_ag_status, p_ag_id
      using errcode = '23514';
  end if;

  if not exists (
    select 1 from public.coproprietaires co
    where co.id = p_coproprietaire_id and co.copro_id = v_copro_id
  ) then
    raise exception 'register_correspondence_form_votes: copropriétaire % absent de la copro %', p_coproprietaire_id, v_copro_id
      using errcode = '23503';
  end if;

  -- droit de vote lié à la détention : refuser un EX-propriétaire (cohérence avec total_owners / for_n art.26)
  if not exists (
    select 1 from public.lot_owners lo
    where lo.coproprietaire_id = p_coproprietaire_id
      and lo.copro_id = v_copro_id
      and lo.end_date is null
  ) then
    raise exception 'register_correspondence_form_votes: le copropriétaire % ne détient aucun lot actif (copro %) — formulaire refusé', p_coproprietaire_id, v_copro_id
      using errcode = '23514';
  end if;

  if jsonb_typeof(p_votes) is distinct from 'array' or jsonb_array_length(p_votes) = 0 then
    raise exception 'register_correspondence_form_votes: p_votes doit être un tableau non vide [{resolution_id, vote}] (AG %)', p_ag_id
      using errcode = '23514';
  end if;

  select rk.id into v_key
  from public.repartition_keys rk
  where rk.copro_id = v_copro_id
    and rk.category = 'general'
    and rk.is_active = true
  limit 1;

  if v_key is null then
    raise exception 'register_correspondence_form_votes: clé de répartition générale active introuvable (copro %)', v_copro_id
      using errcode = '23503';
  end if;

  select coalesce(sum(rkl.weight * lo.share_percent / 100.0), 0)
    into v_tantiemes
  from public.lot_owners lo
  join public.repartition_key_lines rkl
    on rkl.key_id = v_key and rkl.lot_id = lo.lot_id
  where lo.coproprietaire_id = p_coproprietaire_id
    and lo.copro_id = v_copro_id
    and lo.end_date is null;

  insert into public.ag_correspondence_votes
    (ag_id, copro_id, coproprietaire_id, reception_method, received_at, status, integrated_at, recorded_by)
  values
    (p_ag_id, v_copro_id, p_coproprietaire_id, p_mode_reception, now(), 'integrated', now(), auth.uid())
  on conflict (ag_id, coproprietaire_id) do update
    set reception_method = excluded.reception_method,
        received_at      = coalesce(public.ag_correspondence_votes.received_at, excluded.received_at),
        status           = 'integrated',
        integrated_at    = now(),
        recorded_by      = coalesce(excluded.recorded_by, public.ag_correspondence_votes.recorded_by)
  returning id into v_form_id;

  for v_item in select * from jsonb_array_elements(p_votes)
  loop
    v_res_id := nullif(v_item ->> 'resolution_id', '')::uuid;
    if v_res_id is null then
      raise exception 'register_correspondence_form_votes: resolution_id manquant dans p_votes (AG %)', p_ag_id
        using errcode = '23514';
    end if;

    if (v_item ->> 'vote') is null then
      raise exception 'register_correspondence_form_votes: vote manquant pour la résolution % (AG %)', v_res_id, p_ag_id
        using errcode = '23514';
    end if;
    v_vote := (v_item ->> 'vote')::vote_choice;

    select r.copro_id into v_res_copro
    from public.ag_resolutions r
    where r.id = v_res_id and r.ag_id = p_ag_id;
    if v_res_copro is null then
      raise exception 'register_correspondence_form_votes: résolution % absente de l''AG %', v_res_id, p_ag_id
        using errcode = '23503';
    end if;

    -- GARDE D'INTÉGRITÉ : ne JAMAIS écraser un vote 'live' figé en séance (loi : la correspondance
    -- devient caduque si la personne vote sur place ; symétriquement on n'écrase pas un live valide).
    if exists (
      select 1 from public.ag_votes av
      where av.resolution_id = v_res_id
        and av.coproprietaire_id = p_coproprietaire_id
        and av.vote_source = 'live'
    ) then
      raise exception 'register_correspondence_form_votes: un vote en séance (live) existe déjà pour la résolution % (copropriétaire %) — formulaire de correspondance refusé', v_res_id, p_coproprietaire_id
        using errcode = '23514';
    end if;

    insert into public.ag_votes
      (resolution_id, copro_id, coproprietaire_id, vote, tantiemes, vote_source)
    values
      (v_res_id, v_copro_id, p_coproprietaire_id, v_vote, v_tantiemes, 'correspondence')
    on conflict (resolution_id, coproprietaire_id) do update
      set vote        = excluded.vote,
          tantiemes   = excluded.tantiemes,
          vote_source = 'correspondence'
    returning id into v_vote_id;

    insert into public.ag_correspondence_vote_details
      (correspondence_form_id, resolution_id, copro_id, coproprietaire_id, vote,
       integrated_vote_id, integrated_at, recorded_by)
    values
      (v_form_id, v_res_id, v_copro_id, p_coproprietaire_id, v_vote,
       v_vote_id, now(), auth.uid())
    on conflict (correspondence_form_id, resolution_id) do update
      set vote               = excluded.vote,
          integrated_vote_id = excluded.integrated_vote_id,
          integrated_at      = excluded.integrated_at,
          recorded_by        = excluded.recorded_by;

    v_integrated := v_integrated + 1;
  end loop;

  return jsonb_build_object(
    'success', true,
    'ag_id', p_ag_id,
    'form_id', v_form_id,
    'coproprietaire_id', p_coproprietaire_id,
    'status', 'integrated',
    'tantiemes', v_tantiemes,
    'integrated', v_integrated
  );
end;
$$;
revoke execute on function public.register_correspondence_form_votes(uuid, uuid, jsonb, text) from public, anon;
grant execute on function public.register_correspondence_form_votes(uuid, uuid, jsonb, text) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 5j. save_votes_correspondance — enregistre l'INTENTION (BROUILLON, sans intégration)  [G-MGR]
-- ────────────────────────────────────────────────────────────────────────────────────────────
-- Chemin brouillon : pose/rafraîchit l'en-tête + les détails au statut demandé. NE touche PAS ag_votes.
-- p_status accepté : 'pending'|'validated' (+ alias 'draft'->'pending' car le front envoie 'draft').
-- 'integrated' INTERDIT ici (réservé au validateur). Refuse de ré-éditer un en-tête déjà 'integrated'
-- (invariant : un détail intégré ne se modifie que via register_correspondence_form_votes).
create or replace function public.save_votes_correspondance(
  p_ag_id             uuid,
  p_coproprietaire_id uuid,
  p_votes             jsonb,
  p_status            text default 'pending'
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_copro_id      uuid;
  v_form_id       uuid;
  v_norm_status   text;
  v_status        correspondence_form_status;
  v_existing      correspondence_form_status;
  v_item          jsonb;
  v_res_id        uuid;
  v_vote          vote_choice;
  v_res_copro     uuid;
  v_saved         integer := 0;
begin
  select m.copro_id into v_copro_id
  from public.ag_meetings m
  where m.id = p_ag_id;

  if v_copro_id is null then
    raise exception 'save_votes_correspondance: AG % introuvable', p_ag_id using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_copro_id) then
    raise exception 'forbidden: gestionnaire requis pour sauvegarder un vote par correspondance sur l''AG %', p_ag_id
      using errcode = '42501';
  end if;

  -- alias front 'draft' -> 'pending' ; 'integrated' interdit sur le chemin brouillon
  v_norm_status := case when p_status = 'draft' then 'pending' else p_status end;
  if v_norm_status not in ('pending', 'validated') then
    raise exception 'save_votes_correspondance: statut % invalide pour un brouillon (draft|pending|validated ; integrated réservé au validateur)', p_status
      using errcode = '23514';
  end if;
  v_status := v_norm_status::correspondence_form_status;

  if not exists (
    select 1 from public.coproprietaires co
    where co.id = p_coproprietaire_id and co.copro_id = v_copro_id
  ) then
    raise exception 'save_votes_correspondance: copropriétaire % absent de la copro %', p_coproprietaire_id, v_copro_id
      using errcode = '23503';
  end if;

  if jsonb_typeof(p_votes) is distinct from 'array' then
    raise exception 'save_votes_correspondance: p_votes doit être un tableau [{resolution_id, vote}] (AG %)', p_ag_id
      using errcode = '23514';
  end if;

  -- INVARIANT : un en-tête déjà intégré ne se ré-édite pas en brouillon (sinon détails/ag_votes divergent)
  select cv.status into v_existing
  from public.ag_correspondence_votes cv
  where cv.ag_id = p_ag_id and cv.coproprietaire_id = p_coproprietaire_id;

  if v_existing = 'integrated' then
    raise exception 'save_votes_correspondance: formulaire déjà intégré pour le copropriétaire % (AG %) — édition réservée au validateur', p_coproprietaire_id, p_ag_id
      using errcode = '23514';
  end if;

  insert into public.ag_correspondence_votes
    (ag_id, copro_id, coproprietaire_id, status, recorded_by)
  values
    (p_ag_id, v_copro_id, p_coproprietaire_id, v_status, auth.uid())
  on conflict (ag_id, coproprietaire_id) do update
    set status      = v_status,
        recorded_by = coalesce(excluded.recorded_by, public.ag_correspondence_votes.recorded_by)
  returning id into v_form_id;

  for v_item in select * from jsonb_array_elements(p_votes)
  loop
    v_res_id := nullif(v_item ->> 'resolution_id', '')::uuid;
    if v_res_id is null then
      raise exception 'save_votes_correspondance: resolution_id manquant dans p_votes (AG %)', p_ag_id
        using errcode = '23514';
    end if;

    if (v_item ->> 'vote') is null then
      raise exception 'save_votes_correspondance: vote manquant pour la résolution % (AG %)', v_res_id, p_ag_id
        using errcode = '23514';
    end if;
    v_vote := (v_item ->> 'vote')::vote_choice;

    select r.copro_id into v_res_copro
    from public.ag_resolutions r
    where r.id = v_res_id and r.ag_id = p_ag_id;
    if v_res_copro is null then
      raise exception 'save_votes_correspondance: résolution % absente de l''AG %', v_res_id, p_ag_id
        using errcode = '23503';
    end if;

    insert into public.ag_correspondence_vote_details
      (correspondence_form_id, resolution_id, copro_id, coproprietaire_id, vote, recorded_by)
    values
      (v_form_id, v_res_id, v_copro_id, p_coproprietaire_id, v_vote, auth.uid())
    on conflict (correspondence_form_id, resolution_id) do update
      set vote        = excluded.vote,
          recorded_by = excluded.recorded_by;

    v_saved := v_saved + 1;
  end loop;

  return jsonb_build_object(
    'success', true,
    'ag_id', p_ag_id,
    'form_id', v_form_id,
    'coproprietaire_id', p_coproprietaire_id,
    'status', v_status,
    'saved', v_saved
  );
end;
$$;
revoke execute on function public.save_votes_correspondance(uuid, uuid, jsonb, text) from public, anon;
grant execute on function public.save_votes_correspondance(uuid, uuid, jsonb, text) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 5k. get_votes_correspondance — formulaires de correspondance d'une AG (en-têtes + détails)  [G-DEF-RO]
-- ────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.get_votes_correspondance(p_ag_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_copro_id uuid;
  v_forms    jsonb;
begin
  select m.copro_id into v_copro_id
  from public.ag_meetings m
  where m.id = p_ag_id;

  if v_copro_id is null then
    raise exception 'get_votes_correspondance: AG % introuvable', p_ag_id using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_has_copro_access(v_copro_id) then
    raise exception 'forbidden: accès copro requis pour les votes par correspondance de l''AG %', p_ag_id
      using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(f.form order by f.coproprietaire_id), '[]'::jsonb)
    into v_forms
  from (
    select
      cv.coproprietaire_id,
      jsonb_build_object(
        'form_id', cv.id,
        'coproprietaire_id', cv.coproprietaire_id,
        'display_name', case when co.is_company then co.company_name
                             else trim(coalesce(co.first_name, '') || ' ' || coalesce(co.last_name, '')) end,
        'reception_method', cv.reception_method,
        'received_at', cv.received_at,
        'status', cv.status,
        'integrated_at', cv.integrated_at,
        'notes', cv.notes,
        'details', coalesce((
          select jsonb_agg(jsonb_build_object(
            'resolution_id', d.resolution_id,
            'resolution_number', r.resolution_number,
            'vote', d.vote,
            'integrated_vote_id', d.integrated_vote_id,
            'integrated_at', d.integrated_at
          ) order by r.resolution_number)
          from public.ag_correspondence_vote_details d
          join public.ag_resolutions r on r.id = d.resolution_id
          where d.correspondence_form_id = cv.id
        ), '[]'::jsonb)
      ) as form
    from public.ag_correspondence_votes cv
    join public.coproprietaires co on co.id = cv.coproprietaire_id
    where cv.ag_id = p_ag_id
  ) f;

  return jsonb_build_object('success', true, 'ag_id', p_ag_id, 'forms', v_forms);
end;
$$;
revoke execute on function public.get_votes_correspondance(uuid) from public, anon;
grant execute on function public.get_votes_correspondance(uuid) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 5l. get_correspondence_eligible_owners — copropriétaires éligibles au vote par correspondance  [G-DEF-RO]
-- ────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.get_correspondence_eligible_owners(p_ag_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_copro_id uuid;
  v_owners   jsonb;
begin
  select m.copro_id into v_copro_id
  from public.ag_meetings m
  where m.id = p_ag_id;

  if v_copro_id is null then
    raise exception 'get_correspondence_eligible_owners: AG % introuvable', p_ag_id using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_has_copro_access(v_copro_id) then
    raise exception 'forbidden: accès copro requis pour les éligibles de l''AG %', p_ag_id
      using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(o.owner order by o.display_name), '[]'::jsonb)
    into v_owners
  from (
    select
      jsonb_build_object(
        'coproprietaire_id', co.id,
        'display_name', case when co.is_company then co.company_name
                             else trim(coalesce(co.first_name, '') || ' ' || coalesce(co.last_name, '')) end,
        'email', co.email,
        'lots_count', count(distinct lo.lot_id),
        'has_form', exists (
          select 1 from public.ag_correspondence_votes cv
          where cv.ag_id = p_ag_id and cv.coproprietaire_id = co.id
        )
      ) as owner,
      case when co.is_company then co.company_name
           else trim(coalesce(co.first_name, '') || ' ' || coalesce(co.last_name, '')) end as display_name
    from public.coproprietaires co
    join public.lot_owners lo
      on lo.coproprietaire_id = co.id and lo.copro_id = co.copro_id and lo.end_date is null
    where co.copro_id = v_copro_id
    group by co.id, co.is_company, co.company_name, co.first_name, co.last_name, co.email
  ) o;

  return jsonb_build_object('success', true, 'ag_id', p_ag_id, 'owners', v_owners);
end;
$$;
revoke execute on function public.get_correspondence_eligible_owners(uuid) from public, anon;
grant execute on function public.get_correspondence_eligible_owners(uuid) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 5m. save_ag_envoi_tracking — enregistre des traces d'envoi (lot d'entrées)  [G-MGR]
-- ────────────────────────────────────────────────────────────────────────────────────────────
-- p_entries=[{coproprietaire_id?, method, status?, tracking_ref?, document_id?, error_message?,
-- sent_at?, delivered_at?}]. method->notification_channel (NOT NULL). status->delivery_status (déf 'queued').
-- coproprietaire_id NULLABLE (trace légale survit à la suppression du destinataire). document_id, si
-- fourni, doit appartenir à la copro de l'AG (cohérent avec le contrôle du destinataire).
create or replace function public.save_ag_envoi_tracking(
  p_ag_id   uuid,
  p_entries jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_copro_id uuid;
  v_item     jsonb;
  v_cop_id   uuid;
  v_doc_id   uuid;
  v_method   notification_channel;
  v_status   delivery_status;
  v_count    integer := 0;
  v_ids      jsonb := '[]'::jsonb;
  v_new_id   uuid;
begin
  select m.copro_id into v_copro_id
  from public.ag_meetings m
  where m.id = p_ag_id;

  if v_copro_id is null then
    raise exception 'save_ag_envoi_tracking: AG % introuvable', p_ag_id using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_copro_id) then
    raise exception 'forbidden: gestionnaire requis pour enregistrer un suivi d''envoi sur l''AG %', p_ag_id
      using errcode = '42501';
  end if;

  if jsonb_typeof(p_entries) is distinct from 'array' or jsonb_array_length(p_entries) = 0 then
    raise exception 'save_ag_envoi_tracking: p_entries doit être un tableau non vide (AG %)', p_ag_id
      using errcode = '23514';
  end if;

  for v_item in select * from jsonb_array_elements(p_entries)
  loop
    v_cop_id := nullif(v_item ->> 'coproprietaire_id', '')::uuid;

    if v_cop_id is not null and not exists (
      select 1 from public.coproprietaires co
      where co.id = v_cop_id and co.copro_id = v_copro_id
    ) then
      raise exception 'save_ag_envoi_tracking: copropriétaire % absent de la copro % (AG %)', v_cop_id, v_copro_id, p_ag_id
        using errcode = '23503';
    end if;

    if (v_item ->> 'method') is null then
      raise exception 'save_ag_envoi_tracking: method (notification_channel) requis pour chaque entrée (AG %)', p_ag_id
        using errcode = '23514';
    end if;
    v_method := (v_item ->> 'method')::notification_channel;
    v_status := coalesce(nullif(v_item ->> 'status', ''), 'queued')::delivery_status;

    v_doc_id := nullif(v_item ->> 'document_id', '')::uuid;
    if v_doc_id is not null and not exists (
      select 1 from public.documents dc
      where dc.id = v_doc_id and dc.copro_id = v_copro_id
    ) then
      raise exception 'save_ag_envoi_tracking: document % absent de la copro % (AG %)', v_doc_id, v_copro_id, p_ag_id
        using errcode = '23503';
    end if;

    insert into public.ag_envoi_tracking
      (ag_id, coproprietaire_id, method, status, tracking_ref, document_id,
       error_message, sent_at, delivered_at)
    values
      (p_ag_id, v_cop_id, v_method, v_status,
       nullif(v_item ->> 'tracking_ref', ''),
       v_doc_id,
       nullif(v_item ->> 'error_message', ''),
       nullif(v_item ->> 'sent_at', '')::timestamptz,
       nullif(v_item ->> 'delivered_at', '')::timestamptz)
    returning id into v_new_id;

    v_count := v_count + 1;
    v_ids := v_ids || jsonb_build_array(v_new_id);
  end loop;

  return jsonb_build_object('success', true, 'ag_id', p_ag_id, 'saved', v_count, 'ids', v_ids);
end;
$$;
revoke execute on function public.save_ag_envoi_tracking(uuid, jsonb) from public, anon;
grant execute on function public.save_ag_envoi_tracking(uuid, jsonb) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 5n. get_ag_envoi_tracking — traces d'envoi d'une AG  [G-DEF-RO]
-- ────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.get_ag_envoi_tracking(p_ag_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_copro_id uuid;
  v_entries  jsonb;
begin
  select m.copro_id into v_copro_id
  from public.ag_meetings m
  where m.id = p_ag_id;

  if v_copro_id is null then
    raise exception 'get_ag_envoi_tracking: AG % introuvable', p_ag_id using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_has_copro_access(v_copro_id) then
    raise exception 'forbidden: accès copro requis pour le suivi d''envoi de l''AG %', p_ag_id
      using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'coproprietaire_id', t.coproprietaire_id,
      'display_name', case when co.is_company then co.company_name
                           else trim(coalesce(co.first_name, '') || ' ' || coalesce(co.last_name, '')) end,
      'method', t.method,
      'status', t.status,
      'tracking_ref', t.tracking_ref,
      'document_id', t.document_id,
      'error_message', t.error_message,
      'sent_at', t.sent_at,
      'delivered_at', t.delivered_at,
      'created_at', t.created_at
    ) order by t.created_at
  ), '[]'::jsonb)
    into v_entries
  from public.ag_envoi_tracking t
  left join public.coproprietaires co on co.id = t.coproprietaire_id
  where t.ag_id = p_ag_id;

  return jsonb_build_object('success', true, 'ag_id', p_ag_id, 'entries', v_entries);
end;
$$;
revoke execute on function public.get_ag_envoi_tracking(uuid) from public, anon;
grant execute on function public.get_ag_envoi_tracking(uuid) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 5o. rpc_get_ag_coproprietaires — annuaire des copropriétaires de la copro de l'AG  [G-DEF-RO]
-- ────────────────────────────────────────────────────────────────────────────────────────────
-- Signature SET (table) exacte du contrat front. total_tantiemes = Σ (weight × share_percent/100) sur
-- les lots actifs (lot_owners.end_date is null) de la clé générale active (limit 1, NULL toléré -> 0).
create or replace function public.rpc_get_ag_coproprietaires(p_ag_id uuid)
returns table(
  id              uuid,
  display_name    text,
  email           text,
  phone           text,
  mobile          text,
  address_line1   text,
  city            text,
  postal_code     text,
  total_tantiemes numeric,
  lots_count      integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_copro_id uuid;
  v_key      uuid;
begin
  select m.copro_id into v_copro_id
  from public.ag_meetings m
  where m.id = p_ag_id;

  if v_copro_id is null then
    raise exception 'rpc_get_ag_coproprietaires: AG % introuvable', p_ag_id using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_has_copro_access(v_copro_id) then
    raise exception 'forbidden: accès copro requis pour l''annuaire de l''AG %', p_ag_id
      using errcode = '42501';
  end if;

  select rk.id into v_key
  from public.repartition_keys rk
  where rk.copro_id = v_copro_id
    and rk.category = 'general'
    and rk.is_active = true
  limit 1;

  return query
  select
    co.id,
    (case when co.is_company then co.company_name
          else trim(coalesce(co.first_name, '') || ' ' || coalesce(co.last_name, '')) end)::text as display_name,
    co.email,
    co.phone,
    co.mobile,
    co.address_line1,
    co.city,
    co.postal_code,
    coalesce(sum(rkl.weight * lo.share_percent / 100.0), 0)::numeric as total_tantiemes,
    count(distinct lo.lot_id)::integer                              as lots_count
  from public.coproprietaires co
  left join public.lot_owners lo
    on lo.coproprietaire_id = co.id
   and lo.copro_id = co.copro_id
   and lo.end_date is null
  left join public.repartition_key_lines rkl
    on rkl.key_id = v_key and rkl.lot_id = lo.lot_id
  where co.copro_id = v_copro_id
  group by co.id, co.is_company, co.company_name, co.first_name, co.last_name,
           co.email, co.phone, co.mobile, co.address_line1, co.city, co.postal_code
  order by display_name;
end;
$$;
revoke execute on function public.rpc_get_ag_coproprietaires(uuid) from public, anon;
grant execute on function public.rpc_get_ag_coproprietaires(uuid) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 5p. rpc_get_ag_convocation_bundle — paquet convocation (AG + copro + délai + ODJ)  [G-DEF-RO]
-- ────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.rpc_get_ag_convocation_bundle(p_ag_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_copro_id    uuid;
  v_ag          record;
  v_copro       record;
  v_delay       record;
  v_resolutions jsonb;
begin
  select m.copro_id into v_copro_id
  from public.ag_meetings m
  where m.id = p_ag_id;

  if v_copro_id is null then
    raise exception 'rpc_get_ag_convocation_bundle: AG % introuvable', p_ag_id using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_has_copro_access(v_copro_id) then
    raise exception 'forbidden: accès copro requis pour la convocation de l''AG %', p_ag_id
      using errcode = '42501';
  end if;

  select m.id, m.title, m.meeting_type, m.meeting_date, m.location, m.convocation_date, m.status,
         m.president_name, m.secretary_name, m.scrutineer1_name, m.scrutineer2_name,
         m.remote_meeting_url, m.remote_meeting_provider
    into v_ag
  from public.ag_meetings m
  where m.id = p_ag_id;

  select c.id, c.name, c.address, c.city, c.postal_code, c.num_immatriculation
    into v_copro
  from public.copros c
  where c.id = v_copro_id;

  select * into v_delay from public.check_convocation_delay(p_ag_id);

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'resolution_number', r.resolution_number,
      'title', r.title,
      'description', r.description,
      'resolution_type', r.resolution_type,
      'majority_type', r.majority_type,
      'action_type', r.action_type
    ) order by r.resolution_number
  ), '[]'::jsonb)
    into v_resolutions
  from public.ag_resolutions r
  where r.ag_id = p_ag_id;

  return jsonb_build_object(
    'success', true,
    'ag', jsonb_build_object(
      'id', v_ag.id,
      'title', v_ag.title,
      'meeting_type', v_ag.meeting_type,
      'meeting_date', v_ag.meeting_date,
      'location', v_ag.location,
      'convocation_date', v_ag.convocation_date,
      'status', v_ag.status,
      'president_name', v_ag.president_name,
      'secretary_name', v_ag.secretary_name,
      'scrutineer1_name', v_ag.scrutineer1_name,
      'scrutineer2_name', v_ag.scrutineer2_name,
      'remote_meeting_url', v_ag.remote_meeting_url,
      'remote_meeting_provider', v_ag.remote_meeting_provider
    ),
    'copro', jsonb_build_object(
      'id', v_copro.id,
      'name', v_copro.name,
      'address', v_copro.address,
      'city', v_copro.city,
      'postal_code', v_copro.postal_code,
      'num_immatriculation', v_copro.num_immatriculation
    ),
    'convocation_delay', jsonb_build_object(
      'is_valid', v_delay.is_valid,
      'days_remaining', v_delay.days_remaining,
      'minimum_delay', v_delay.minimum_delay,
      'warning_message', v_delay.warning_message
    ),
    'resolutions', v_resolutions
  );
end;
$$;
revoke execute on function public.rpc_get_ag_convocation_bundle(uuid) from public, anon;
grant execute on function public.rpc_get_ag_convocation_bundle(uuid) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────────────────────
-- 5q. rpc_get_ag_pv_bundle — paquet procès-verbal (AG + copro + quorum + présence + résultats)  [G-DEF-RO]
-- ────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.rpc_get_ag_pv_bundle(p_ag_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_copro_id    uuid;
  v_ag          record;
  v_copro       record;
  v_quorum      record;
  v_attendance  jsonb;
  v_resolutions jsonb;
begin
  select m.copro_id into v_copro_id
  from public.ag_meetings m
  where m.id = p_ag_id;

  if v_copro_id is null then
    raise exception 'rpc_get_ag_pv_bundle: AG % introuvable', p_ag_id using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_has_copro_access(v_copro_id) then
    raise exception 'forbidden: accès copro requis pour le PV de l''AG %', p_ag_id
      using errcode = '42501';
  end if;

  select m.id, m.title, m.meeting_type, m.meeting_date, m.location, m.status,
         m.president_name, m.secretary_name, m.scrutineer1_name, m.scrutineer2_name,
         m.session_started_at, m.session_ended_at, m.opening_notes, m.closing_notes,
         m.incidents, m.closed_at, m.pv_generated_at
    into v_ag
  from public.ag_meetings m
  where m.id = p_ag_id;

  select c.id, c.name, c.address, c.city, c.postal_code, c.num_immatriculation
    into v_copro
  from public.copros c
  where c.id = v_copro_id;

  select * into v_quorum from public.compute_ag_quorum(p_ag_id);

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'coproprietaire_id', a.coproprietaire_id,
      'display_name', case when co.is_company then co.company_name
                           else trim(coalesce(co.first_name, '') || ' ' || coalesce(co.last_name, '')) end,
      'presence_type', a.presence_type,
      'represented_by_id', a.represented_by_id,
      'represented_by_name', a.represented_by_name,
      'tantiemes', a.tantiemes,
      'signed', a.signed
    ) order by co.last_name, co.first_name
  ), '[]'::jsonb)
    into v_attendance
  from public.ag_attendance a
  join public.coproprietaires co on co.id = a.coproprietaire_id
  where a.ag_id = p_ag_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', vr.resolution_id,
      'resolution_number', vr.resolution_number,
      'title', vr.title,
      'resolution_type', vr.resolution_type,
      'majority_type', vr.majority_type,
      'action_type', vr.action_type,
      'status', vr.status,
      'threshold_tantiemes', vr.threshold_tantiemes,
      'threshold_voters', vr.threshold_voters,
      'is_bridgeable', vr.is_bridgeable,
      'voted_at', vr.voted_at,
      'votes_for', vr.votes_for,
      'votes_against', vr.votes_against,
      'votes_abstention', vr.votes_abstention,
      'tantiemes_for', vr.tantiemes_for,
      'tantiemes_against', vr.tantiemes_against,
      'tantiemes_abstention', vr.tantiemes_abstention,
      'total_expressed', vr.total_expressed
    ) order by vr.resolution_number
  ), '[]'::jsonb)
    into v_resolutions
  from public.v_ag_resolutions_results vr
  where vr.ag_id = p_ag_id;

  return jsonb_build_object(
    'success', true,
    'ag', jsonb_build_object(
      'id', v_ag.id,
      'title', v_ag.title,
      'meeting_type', v_ag.meeting_type,
      'meeting_date', v_ag.meeting_date,
      'location', v_ag.location,
      'status', v_ag.status,
      'president_name', v_ag.president_name,
      'secretary_name', v_ag.secretary_name,
      'scrutineer1_name', v_ag.scrutineer1_name,
      'scrutineer2_name', v_ag.scrutineer2_name,
      'session_started_at', v_ag.session_started_at,
      'session_ended_at', v_ag.session_ended_at,
      'opening_notes', v_ag.opening_notes,
      'closing_notes', v_ag.closing_notes,
      'incidents', v_ag.incidents,
      'closed_at', v_ag.closed_at,
      'pv_generated_at', v_ag.pv_generated_at
    ),
    'copro', jsonb_build_object(
      'id', v_copro.id,
      'name', v_copro.name,
      'address', v_copro.address,
      'city', v_copro.city,
      'postal_code', v_copro.postal_code,
      'num_immatriculation', v_copro.num_immatriculation
    ),
    'quorum', jsonb_build_object(
      'attendees_count', v_quorum.attendees_count,
      'present_count', v_quorum.present_count,
      'proxy_count', v_quorum.proxy_count,
      'correspondence_count', v_quorum.correspondence_count,
      'present_tantiemes', v_quorum.present_tantiemes,
      'total_tantiemes', v_quorum.total_tantiemes,
      'is_quorum_reached', v_quorum.is_quorum_reached,
      'quorum_ratio', v_quorum.quorum_ratio
    ),
    'attendance', v_attendance,
    'resolutions', v_resolutions
  );
end;
$$;
revoke execute on function public.rpc_get_ag_pv_bundle(uuid) from public, anon;
grant execute on function public.rpc_get_ag_pv_bundle(uuid) to authenticated, service_role;
