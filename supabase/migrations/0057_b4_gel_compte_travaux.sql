-- 0057_b4_gel_compte_travaux.sql
-- ============================================================================================
-- B4 (DECISIONS.md, 2026-06-10) — GEL DU COMPTE 12 (solde en attente travaux/exceptionnel).
--
-- Conformité (arrêté 14 mars 2005) : le solde travaux (compte 12) se REPORTE d'exercice en
-- exercice jusqu'à la clôture DÉFINITIVE de l'opération de travaux (qui chevauche souvent
-- plusieurs exercices et plusieurs AG). L'ancienne affectation annuelle automatique du travaux
-- à chaque clôture était la non-conformité.
--
-- CE QUE FAIT B4 :
--   1. regularize_period gagne `p_affecter_travaux boolean DEFAULT false`. Par défaut (OFF), la
--      branche TRAVAUX n'est PLUS déversée -> le 12 RESTE et se reporte (gel). Seul le courant
--      (478 -> 450-1) est affecté à l'activation AG. L'appelant activate_ag_decisions (2 args)
--      reste valide via le DEFAULT -> gel automatique voulu.
--   2. v_result_allocation_split : invariant RESTREINT AU COURANT (sinon le garde-fou échouerait
--      à tort quand le 12 est gelé). La branche travaux n'est contrôlée QUE si elle a été déversée.
--   3. settle_works_balance(copro[, période]) : APUREMENT MANUEL = écriture ADDITIVE dédiée
--      (source_type 'works_settlement') sur l'exercice OUVERT courant, déversant le 12 VIVANT
--      vers 450-2 par quote-part. Décision (analyse 2026-06-14) : écriture additive sur exercice
--      ouvert (et non flag ON de regularize) -> fonctionne AVANT comme APRÈS approbation, ne
--      touche JAMAIS un exercice figé (immutabilité GL respectée), colle à la réalité multi-années.
--   4. v_works_pending_settlement : source de l'écran « opérations à apurer » (12 vivant par copro).
--
-- HORS PÉRIMÈTRE (non touché) : E4 (operation_id ligne + apurement AUTO par opération — la
--   granularité « opération » n'existe pas encore, l'apurement B4 est COARSE par copro/exercice),
--   B5 (assertion multi-clés), E3 (charge_nature). NE PAS éditer 0056 (superseded par CREATE OR REPLACE).
-- ============================================================================================

-- ── 0. ENUM : nouveau source_type pour l'apurement travaux additif ──────────────────────────
-- IF NOT EXISTS = idempotent. Seulement RÉFÉRENCÉ dans le corps de settle_works_balance (jamais
-- exécuté en migration), donc safe en transaction (PG15).
alter type public.ledger_source_type add value if not exists 'works_settlement';


-- ── 1. regularize_period : flag p_affecter_travaux (DÉFAUT false = gel) ──────────────────────
-- DROP de l'ancienne signature 2-args (0056) : ajouter un param DEFAULT crée une SURCHARGE (ne
-- remplace pas) -> un appel 2-args deviendrait ambigu. On drop puis recrée en 3-args ; les appelants
-- 2-args (activate_ag_decisions 0030, appel dynamique non dépendant) résolvent via le DEFAULT.
drop function if exists public.regularize_period(uuid, uuid);

create or replace function public.regularize_period(
  p_copro_id uuid,
  p_period_id uuid,
  p_affecter_travaux boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_src_status  period_status;
  v_src_end     date;
  v_next        uuid;
  v_next_status period_status;
  v_ag_date     date := current_date;
  v_key         uuid;
  v_total_w     numeric;
  v_solde_120   numeric;
  v_solde_110   numeric;
  v_acct_120    uuid;
  v_acct_110    uuid;
  v_acct_4501   uuid;
  v_acct_4502   uuid;
  v_entries     jsonb := '[]'::jsonb;
  v_running     numeric;
  v_alloc       numeric;
  v_cnt         integer;
  v_lines       integer := 0;
  v_tx_res      jsonb;
  r             record;
begin
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: manager required for copro %', p_copro_id
      using errcode = '42501';
  end if;

  select status, end_date into v_src_status, v_src_end
  from public.accounting_periods
  where id = p_period_id and copro_id = p_copro_id;
  if v_src_status is null then
    raise exception 'regularize_period: exercice source % introuvable pour la copro %', p_period_id, p_copro_id
      using errcode = '23503';
  end if;

  select id, status into v_next, v_next_status
  from public.accounting_periods
  where copro_id = p_copro_id
    and start_date > v_src_end
  order by start_date
  limit 1;
  if v_next is null then
    raise exception 'regularize_period: exercice N+1 introuvable pour l''affectation (ouvrir open_next_period d''abord)'
      using errcode = '23503';
  end if;

  -- Garde immutabilité (message métier AVANT le trigger 0024).
  if (v_src_status = 'approved' or v_next_status = 'approved')
     and exists (
       select 1 from public.ledger_transactions
       where copro_id = p_copro_id and source_type = 'result_allocation' and source_id = p_period_id
     ) then
    raise exception 'regularize_period: affectation figée — exercice % approuvé en AG (source ou accueil), réaffectation interdite', p_period_id
      using errcode = '23514';
  end if;

  -- Idempotence : remplace l'affectation précédente tant que NI N NI N+1 ne sont approuvés. Le DELETE
  -- est AVANT la lecture des soldes -> le 2e passage relit le 478 reporté (non soldé) et reconstruit
  -- courant+travaux atomiquement dans la même écriture (pas de perte du courant).
  if v_src_status <> 'approved' and v_next_status <> 'approved' then
    delete from public.ledger_transactions
    where copro_id = p_copro_id and source_type = 'result_allocation' and source_id = p_period_id;
  end if;

  select id into v_acct_120  from public.accounts where copro_id = p_copro_id and code = '478';
  select id into v_acct_110  from public.accounts where copro_id = p_copro_id and code = '12';
  select id into v_acct_4501 from public.accounts where copro_id = p_copro_id and code = '450-1';
  select id into v_acct_4502 from public.accounts where copro_id = p_copro_id and code = '450-2';
  if v_acct_4501 is null or v_acct_4502 is null then
    raise exception 'regularize_period: comptes 450-1/450-2 absents pour la copro %', p_copro_id
      using errcode = '23503';
  end if;

  -- Soldes 12 (travaux) / 478 (courant) de N+1 (après à-nouveau) : Σ(débit − crédit).
  select round(coalesce(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 0), 2)
    into v_solde_120
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a on a.id = e.account_id
  where e.copro_id = p_copro_id and e.period_id = v_next and a.code = '478';

  select round(coalesce(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 0), 2)
    into v_solde_110
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a on a.id = e.account_id
  where e.copro_id = p_copro_id and e.period_id = v_next and a.code = '12';

  -- B4 : skip si RIEN ne sera posté. Flag OFF -> on ne poste que si le courant bouge (le travaux est
  -- gelé même s'il est non nul). Flag ON -> skip seulement si TOUT est nul.
  if v_solde_120 = 0 and (not p_affecter_travaux or v_solde_110 = 0) then
    return jsonb_build_object('success', true,
      'skipped', case when v_solde_110 <> 0 then 'courant nul — travaux 12 gelé (reporté)' else 'soldes 12 et 478 nuls' end,
      'next_period_id', v_next,
      'pending_travaux', abs(v_solde_110));
  end if;

  select id into v_key
  from public.repartition_keys
  where copro_id = p_copro_id and category = 'general' and is_active = true
  limit 1;
  if v_key is null then
    raise exception 'regularize_period: clé de répartition générale active introuvable (copro %)', p_copro_id
      using errcode = '23503';
  end if;
  select sum(weight) into v_total_w from public.repartition_key_lines where key_id = v_key;
  if coalesce(v_total_w, 0) <= 0 then
    raise exception 'regularize_period: somme des poids de la clé générale nulle (copro %)', p_copro_id
      using errcode = '23514';
  end if;
  select count(*) into v_cnt from public.repartition_key_lines where key_id = v_key;

  -- Branche COURANT : D 478 / C 450-1 par quote-part. TOUJOURS active (jamais gelée).
  if v_solde_120 <> 0 then
    v_entries := v_entries || jsonb_build_object(
      'account_id', v_acct_120, 'lot_id', null,
      'direction', case when v_solde_120 > 0 then 'credit' else 'debit' end,
      'amount', abs(v_solde_120), 'entry_label', 'Affectation du résultat courant');

    v_running := 0;
    v_lines := 0;
    for r in select lot_id, weight from public.repartition_key_lines where key_id = v_key order by lot_id
    loop
      v_lines := v_lines + 1;
      if v_lines = v_cnt then
        v_alloc := round(abs(v_solde_120), 2) - v_running;
      else
        v_alloc := round(abs(v_solde_120) * r.weight / v_total_w, 2);
        v_running := v_running + v_alloc;
      end if;
      if v_alloc <> 0 then
        v_entries := v_entries || jsonb_build_object(
          'account_id', v_acct_4501, 'lot_id', r.lot_id,
          'direction', case when v_solde_120 > 0 then 'debit' else 'credit' end,
          'amount', v_alloc, 'entry_label', 'Affectation résultat courant au lot');
      end if;
    end loop;
  end if;

  -- Branche TRAVAUX (MIROIR) : GELÉE par défaut (B4). Ne se déverse QUE si p_affecter_travaux = true.
  -- Quand OFF, le solde 12 reste et se reporte ; l'apurement passe par settle_works_balance.
  if p_affecter_travaux and v_solde_110 <> 0 then
    v_entries := v_entries || jsonb_build_object(
      'account_id', v_acct_110, 'lot_id', null,
      'direction', case when v_solde_110 > 0 then 'credit' else 'debit' end,
      'amount', abs(v_solde_110), 'entry_label', 'Affectation du résultat travaux');

    v_running := 0;
    v_lines := 0;
    for r in select lot_id, weight from public.repartition_key_lines where key_id = v_key order by lot_id
    loop
      v_lines := v_lines + 1;
      if v_lines = v_cnt then
        v_alloc := round(abs(v_solde_110), 2) - v_running;
      else
        v_alloc := round(abs(v_solde_110) * r.weight / v_total_w, 2);
        v_running := v_running + v_alloc;
      end if;
      if v_alloc <> 0 then
        v_entries := v_entries || jsonb_build_object(
          'account_id', v_acct_4502, 'lot_id', r.lot_id,
          'direction', case when v_solde_110 > 0 then 'debit' else 'credit' end,
          'amount', v_alloc, 'entry_label', 'Affectation résultat travaux au lot');
      end if;
    end loop;
  end if;

  v_tx_res := public.create_ledger_transaction(
    p_copro_id, v_next, v_ag_date,
    'Affectation du résultat ' || p_period_id, 'result_allocation', p_period_id, v_entries, true
  );
  if not (v_tx_res->>'success')::boolean then
    raise exception 'regularize_period: échec écriture grand livre : %', v_tx_res->>'error'
      using errcode = '23514';
  end if;

  -- GARDE-FOU (invariant courant systématique + travaux si déversé) — rollback si incohérent.
  perform public.assert_result_allocation_split(p_copro_id, v_next);

  return jsonb_build_object(
    'success', true,
    'allocated_courant', abs(v_solde_120),
    'allocated_travaux', case when p_affecter_travaux then abs(v_solde_110) else 0 end,
    'pending_travaux', case when p_affecter_travaux then 0 else abs(v_solde_110) end,
    'next_period_id', v_next,
    'tx_id', v_tx_res->>'tx_id'
  );
end;
$$;
revoke execute on function public.regularize_period(uuid, uuid, boolean) from public, anon;
grant execute on function public.regularize_period(uuid, uuid, boolean) to authenticated, service_role;


-- ── 2. v_result_allocation_split : invariant RESTREINT AU COURANT ────────────────────────────
-- alloc_tx + mv repris de 0056 (inchangés). SEULES la CTE result_src et le WHERE changent.
create or replace view public.v_result_allocation_split
with (security_invoker = true) as
with alloc_tx as (
  select t.id as tx_id, t.copro_id, t.period_id, t.source_id as source_period_id
  from public.ledger_transactions t
  where t.source_type = 'result_allocation' and t.status = 'posted'
),
mv as (
  -- mv_120 suit le compte d'attente COURANT (478), mv_110 le compte TRAVAUX (12). Noms conservés (B3).
  select at.tx_id, at.copro_id, at.period_id, at.source_period_id,
    coalesce(sum(case when a.code = '478'   then (case when e.direction = 'credit' then e.amount else -e.amount end) else 0 end), 0) as mv_120,
    coalesce(sum(case when a.code = '12'    then (case when e.direction = 'credit' then e.amount else -e.amount end) else 0 end), 0) as mv_110,
    coalesce(sum(case when a.code = '450-1' then (case when e.direction = 'credit' then e.amount else -e.amount end) else 0 end), 0) as mv_450_1,
    coalesce(sum(case when a.code = '450-2' then (case when e.direction = 'credit' then e.amount else -e.amount end) else 0 end), 0) as mv_450_2
  from alloc_tx at
  join public.ledger_entries e on e.tx_id = at.tx_id
  join public.accounts a on a.id = e.account_id
  group by at.tx_id, at.copro_id, at.period_id, at.source_period_id
),
result_src as (
  -- B4 : scinde le résultat de l'exercice source en COURANT vs TRAVAUX (même liste de codes travaux
  -- que open_next_period). result_net conservé pour la compat des types générés.
  -- CONVENTION credit-debit = OPPOSÉE de open_next_period (qui calcule en debit-credit) — NE PAS aligner :
  -- mv_* (alloc) sont en credit-debit, donc result_courant doit l'être aussi pour que mv_120 = -result_courant.
  select e.copro_id, e.period_id,
    round(coalesce(sum(case
      when substr(a.code,1,1) in ('6','7')
       and a.code not in ('671','672','673','674','677','678','702','705','706')
      then (case when e.direction = 'credit' then e.amount else -e.amount end) else 0 end), 0), 2) as result_courant,
    round(coalesce(sum(case
      when a.code in ('671','672','673','674','677','678','702','705','706')
      then (case when e.direction = 'credit' then e.amount else -e.amount end) else 0 end), 0), 2) as result_travaux,
    round(coalesce(sum(case
      when substr(a.code,1,1) in ('6','7')
      then (case when e.direction = 'credit' then e.amount else -e.amount end) else 0 end), 0), 2) as result_net
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a on a.id = e.account_id
  where substr(a.code, 1, 1) in ('6', '7')
  group by e.copro_id, e.period_id
)
select
  mv.copro_id, mv.period_id, mv.tx_id, mv.source_period_id,
  mv.mv_120, mv.mv_110, mv.mv_450_1, mv.mv_450_2,
  coalesce(rs.result_net, 0)     as result_net,        -- conservé (compat types), plus dans la logique
  coalesce(rs.result_courant, 0) as result_courant,    -- AJOUT B4
  coalesce(rs.result_travaux, 0) as result_travaux     -- AJOUT B4
from mv
left join result_src rs on rs.copro_id = mv.copro_id and rs.period_id = mv.source_period_id
where
  -- (a-courant) quote-part courant : 450-1 contrepartie de 478. Toujours active.
  abs(mv.mv_450_1 + mv.mv_120) > 0.01
  -- (b-courant) somme RESTREINTE AU COURANT : déversé courant (mv_120) = −result_courant. CŒUR DU GEL.
  or abs(mv.mv_120 + coalesce(rs.result_courant, 0)) > 0.01
  -- (a-travaux) quote-part travaux : neutre quand gelé (mv_110=mv_450_2=0 → abs(0)=0), contrôle si déversé.
  or abs(mv.mv_450_2 + mv.mv_110) > 0.01
  -- (b-travaux) somme travaux CONDITIONNELLE : ne s'active QUE si la branche travaux a bougé (flag ON).
  or ( (abs(mv.mv_110) > 0.01 or abs(mv.mv_450_2) > 0.01)
       and abs(mv.mv_110 + coalesce(rs.result_travaux, 0)) > 0.01 );

comment on view public.v_result_allocation_split is
  'Garde-fou de l''affectation du résultat (B4 : restreint au COURANT 478/450-1, systématique ; le travaux 12/450-2 n''est contrôlé QUE s''il a été déversé, flag p_affecter_travaux ON). 1 ligne = écriture result_allocation incohérente, 0 ligne = conforme. mv_120=478 (courant), mv_110=12 (travaux). Assiette de assert_result_allocation_split.';


-- ── 3. assert_result_allocation_split : message (logique inchangée, portée par la vue) ────────
create or replace function public.assert_result_allocation_split(
  p_copro_id  uuid,
  p_period_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.v_result_allocation_split
    where copro_id = p_copro_id and period_id = p_period_id
  ) then
    raise exception 'assert_result_allocation_split: affectation du résultat non conforme (copro %, période %) — ventilation courante 478/450-1 incohérente (ou travaux 12/450-2 si déversé)', p_copro_id, p_period_id
      using errcode = '23514';
  end if;
end;
$$;
revoke execute on function public.assert_result_allocation_split(uuid, uuid) from public, anon;
grant execute on function public.assert_result_allocation_split(uuid, uuid) to authenticated, service_role;


-- ── 4. v_works_pending_settlement : source de l'écran « opérations à apurer » ─────────────────
-- Solde TRAVAUX (12) VIVANT, par copro, sur l'exercice OUVERT (status='open') — un seul 12 vivant
-- par copro (l'à-nouveau le recopie d'exercice en exercice ; on ne montre que celui de l'ouvert
-- courant pour éviter le double-comptage). having <> 0 -> exclut automatiquement les copros apurées.
-- works_balance > 0 = solde DÉBITEUR (déficit travaux, à appeler) ; < 0 = CRÉDITEUR (excédent, à rembourser).
create or replace view public.v_works_pending_settlement
with (security_invoker = true) as
select
  a.copro_id,
  ap.id          as period_id,
  ap.name        as period_name,
  ap.start_date  as period_start,
  ap.end_date    as period_end,
  ap.status      as period_status,
  round(coalesce(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 0), 2) as works_balance,
  (current_date - ap.end_date) as age_days
from public.accounts a
join public.ledger_entries e on e.account_id = a.id
join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
join public.accounting_periods ap on ap.id = e.period_id
where a.code = '12' and ap.status = 'open'
group by a.copro_id, ap.id, ap.name, ap.start_date, ap.end_date, ap.status
having round(coalesce(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 0), 2) <> 0;

comment on view public.v_works_pending_settlement is
  'Écran « opérations à apurer » (B4) : solde travaux (compte 12) vivant par copro sur l''exercice ouvert, en attente d''affectation aux copropriétaires (450-2). Apuré via settle_works_balance. works_balance signé (débiteur = à appeler, créditeur = à rembourser).';


-- ── 5. settle_works_balance : APUREMENT additif sur l'exercice ouvert (post-approbation OK) ───
-- Déverse le 12 vivant (porté sur l'exercice OUVERT) vers 450-2 par quote-part (clé générale), dans
-- une écriture DÉDIÉE source_type 'works_settlement'. N'utilise PAS regularize_period (qui est couplé
-- à une période source N→N+1 et bloqué post-approbation). Ne touche QUE l'exercice ouvert -> jamais
-- d'écriture sur un exercice approuvé -> immutabilité GL respectée, apurement possible APRÈS l'AG.
create or replace function public.settle_works_balance(
  p_copro_id uuid,
  p_period_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period   uuid;
  v_status   period_status;
  v_acct_12  uuid;
  v_acct_452 uuid;
  v_solde_12 numeric;
  v_key      uuid;
  v_total_w  numeric;
  v_cnt      integer;
  v_entries  jsonb := '[]'::jsonb;
  v_running  numeric;
  v_alloc    numeric;
  v_lines    integer := 0;
  v_tx_res   jsonb;
  v_residual numeric;
  r          record;
begin
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: manager required for copro %', p_copro_id
      using errcode = '42501';
  end if;

  -- Exercice cible = celui fourni, sinon l'exercice OUVERT le plus récent (où vit le 12 reporté).
  if p_period_id is not null then
    select id, status into v_period, v_status
    from public.accounting_periods where id = p_period_id and copro_id = p_copro_id;
  else
    select id, status into v_period, v_status
    from public.accounting_periods where copro_id = p_copro_id and status = 'open'
    order by start_date desc limit 1;
  end if;
  if v_period is null then
    raise exception 'settle_works_balance: aucun exercice ouvert pour la copro %', p_copro_id
      using errcode = '23503';
  end if;
  if v_status <> 'open' then
    raise exception 'settle_works_balance: l''apurement ne pose une écriture que sur un exercice OUVERT (exercice % en statut %)', v_period, v_status
      using errcode = '23514';
  end if;

  select id into v_acct_12  from public.accounts where copro_id = p_copro_id and code = '12';
  select id into v_acct_452 from public.accounts where copro_id = p_copro_id and code = '450-2';
  if v_acct_12 is null or v_acct_452 is null then
    raise exception 'settle_works_balance: comptes 12/450-2 absents pour la copro %', p_copro_id
      using errcode = '23503';
  end if;

  -- Solde 12 vivant sur l'exercice cible : Σ(débit − crédit). >0 = débiteur, <0 = créditeur.
  select round(coalesce(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 0), 2)
    into v_solde_12
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  where e.copro_id = p_copro_id and e.period_id = v_period and e.account_id = v_acct_12;

  if v_solde_12 = 0 then
    return jsonb_build_object('success', true, 'skipped', 'solde travaux 12 nul', 'period_id', v_period);
  end if;

  select id into v_key
  from public.repartition_keys
  where copro_id = p_copro_id and category = 'general' and is_active = true
  limit 1;
  if v_key is null then
    raise exception 'settle_works_balance: clé de répartition générale active introuvable (copro %)', p_copro_id
      using errcode = '23503';
  end if;
  select sum(weight) into v_total_w from public.repartition_key_lines where key_id = v_key;
  if coalesce(v_total_w, 0) <= 0 then
    raise exception 'settle_works_balance: somme des poids de la clé générale nulle (copro %)', p_copro_id
      using errcode = '23514';
  end if;
  select count(*) into v_cnt from public.repartition_key_lines where key_id = v_key;

  -- Ligne 12 (au total) : sens OPPOSÉ au solde pour le ramener à 0.
  --   solde débiteur (>0, déficit) -> CRÉDITER 12 / DÉBITER 450-2 (appel aux copropriétaires) ;
  --   solde créditeur (<0, excédent) -> DÉBITER 12 / CRÉDITER 450-2 (remboursement).
  v_entries := v_entries || jsonb_build_object(
    'account_id', v_acct_12, 'lot_id', null,
    'direction', case when v_solde_12 > 0 then 'credit' else 'debit' end,
    'amount', abs(v_solde_12), 'entry_label', 'Apurement du solde travaux (compte 12)');

  -- Lignes 450-2 par quote-part (miroir, arrondi cumulatif : la dernière ligne absorbe le reste).
  v_running := 0;
  v_lines := 0;
  for r in select lot_id, weight from public.repartition_key_lines where key_id = v_key order by lot_id
  loop
    v_lines := v_lines + 1;
    if v_lines = v_cnt then
      v_alloc := round(abs(v_solde_12), 2) - v_running;
    else
      v_alloc := round(abs(v_solde_12) * r.weight / v_total_w, 2);
      v_running := v_running + v_alloc;
    end if;
    if v_alloc <> 0 then
      v_entries := v_entries || jsonb_build_object(
        'account_id', v_acct_452, 'lot_id', r.lot_id,
        'direction', case when v_solde_12 > 0 then 'debit' else 'credit' end,
        'amount', v_alloc, 'entry_label', 'Apurement travaux au lot');
    end if;
  end loop;

  v_tx_res := public.create_ledger_transaction(
    p_copro_id, v_period, current_date,
    'Apurement du solde travaux (compte 12)', 'works_settlement', v_period, v_entries, true
  );
  if not (v_tx_res->>'success')::boolean then
    raise exception 'settle_works_balance: échec écriture grand livre : %', v_tx_res->>'error'
      using errcode = '23514';
  end if;

  -- ANTI-OUBLI : le 12 doit être à 0 après apurement (sinon le gel reste un oubli silencieux).
  select round(coalesce(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 0), 2)
    into v_residual
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  where e.copro_id = p_copro_id and e.period_id = v_period and e.account_id = v_acct_12;
  if v_residual <> 0 then
    raise exception 'settle_works_balance: solde 12 résiduel % après apurement (copro %, période %)', v_residual, p_copro_id, v_period
      using errcode = '23514';
  end if;

  return jsonb_build_object(
    'success', true,
    'settled', abs(v_solde_12),
    'direction', case when v_solde_12 > 0 then 'appel' else 'remboursement' end,
    'period_id', v_period,
    'tx_id', v_tx_res->>'tx_id'
  );
end;
$$;
revoke execute on function public.settle_works_balance(uuid, uuid) from public, anon;
grant execute on function public.settle_works_balance(uuid, uuid) to authenticated, service_role;

-- FIN 0057_b4_gel_compte_travaux.sql
