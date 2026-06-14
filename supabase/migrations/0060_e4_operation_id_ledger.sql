-- 0060_e4_operation_id_ledger.sql
-- ============================================================================================
-- E4 (DECISIONS.md SS E) — operation_id au niveau LIGNE du grand livre + precedence travaux.
--
-- 1. ledger_entries.operation_id uuid null REFERENCES budgets(id) : rattache une ecriture a une
--    OPERATION (budget travaux). Optionnel, retro-compatible (backfill NULL).
-- 2. create_ledger_transaction lit operation_id dans le jsonb p_entries (cle optionnelle/ligne).
--    Signature INCHANGEE -> aucun appelant casse. Les ecrivains qui renseignent operation_id
--    (facture travaux, appel travaux) = tranche dediee ULTERIEURE (cablage ecrivains).
-- 3. PRECEDENCE STRICTE en LECTURE : une ligne portant operation_id != NULL compte comme TRAVAUX
--    quoi qu'il arrive (meme si accounts.charge_nature='courant', ex. 711 subvention travaux).
--    Injectee dans open_next_period et v_result_allocation_split.
-- 4. settle_works_balance : GARDE MULTI-CLES bloquante (differee en B5).
--
-- 0025/0057/0059 NE SONT PAS EDITES : leurs fonctions/vue sont SUPERSEDED par les CREATE OR
-- REPLACE ci-dessous (qui s'executent apres dans la chaine). Editer les versions de ces fichiers
-- n'aurait aucun effet apres 0060 -> toute evolution de ces objets passe par une migration >= 0060.
-- FK volontairement RESTRICT (pas SET NULL) : un budget reference par une ecriture POSTEE ne peut
-- etre supprime (immutabilite GL, A5) -> pas de mutation silencieuse d'une classif travaux.
-- ============================================================================================

-- == 1. ledger_entries.operation_id ==
alter table public.ledger_entries
  add column if not exists operation_id uuid references public.budgets(id) on delete restrict;

create index if not exists idx_entries_operation
  on public.ledger_entries (operation_id) where operation_id is not null;

comment on column public.ledger_entries.operation_id is
  'E4 : operation (budget travaux) rattachee a la ligne. Si non NULL, la ligne est de nature TRAVAUX quoi qu''il arrive (precedence sur accounts.charge_nature). FK RESTRICT : immutabilite GL.';

-- == 2. create_ledger_transaction : lit operation_id dans p_entries (signature inchangee) ==
create or replace function public.create_ledger_transaction(
  p_copro_id    uuid,
  p_period_id   uuid,
  p_tx_date     date,
  p_label       text,
  p_source_type text    default null,
  p_source_id   uuid    default null,
  p_entries     jsonb   default '[]'::jsonb,
  p_auto_post   boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx_id        uuid;
  v_entry        jsonb;
  v_total_debit  numeric(14,2) := 0;
  v_total_credit numeric(14,2) := 0;
  v_period_copro uuid;
  v_period_status period_status;
begin
  -- Garde §5.3 : gestionnaire de la copro OU appel machine de confiance.
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: manager required for copro %', p_copro_id
      using errcode = '42501';
  end if;

  -- Vérif période : appartient à la copro ET ouverte (pas d'écriture en période close/approuvée).
  select ap.copro_id, ap.status
    into v_period_copro, v_period_status
  from public.accounting_periods ap
  where ap.id = p_period_id;

  if v_period_copro is null then
    raise exception 'create_ledger_transaction: période % introuvable', p_period_id
      using errcode = '23503';
  end if;
  if v_period_copro is distinct from p_copro_id then
    raise exception 'create_ledger_transaction: la période % n''appartient pas à la copro %', p_period_id, p_copro_id
      using errcode = '23514';
  end if;
  if v_period_status <> 'open' then
    raise exception 'create_ledger_transaction: période % non ouverte (statut=%) — écriture interdite', p_period_id, v_period_status
      using errcode = '23514';
  end if;

  -- En-tête (le cast text -> ledger_source_type valide la valeur ; NULL accepté).
  insert into public.ledger_transactions (
    copro_id, period_id, tx_date, label, source_type, source_id, created_by
  ) values (
    p_copro_id, p_period_id, p_tx_date, p_label,
    p_source_type::public.ledger_source_type, p_source_id, auth.uid()
  )
  returning id into v_tx_id;

  -- Lignes (partie double). Les triggers 0024 valident chaque ligne (postable, lot_id sur 45x,
  -- cohérence copro/période) ; l'équilibre est vérifié au COMMIT par le constraint trigger DEFERRED.
  for v_entry in select * from jsonb_array_elements(p_entries)
  loop
    insert into public.ledger_entries (
      tx_id, copro_id, period_id, account_id, lot_id, operation_id, direction, amount, entry_label
    ) values (
      v_tx_id,
      p_copro_id,
      p_period_id,
      (v_entry->>'account_id')::uuid,
      nullif(v_entry->>'lot_id', '')::uuid,
      nullif(v_entry->>'operation_id', '')::uuid,
      (v_entry->>'direction')::public.ledger_direction,
      (v_entry->>'amount')::numeric,
      v_entry->>'entry_label'
    );

    if (v_entry->>'direction') = 'debit' then
      v_total_debit := v_total_debit + (v_entry->>'amount')::numeric;
    else
      v_total_credit := v_total_credit + (v_entry->>'amount')::numeric;
    end if;
  end loop;

  -- Auto-post si demandé et équilibré (post_ledger_transaction revérifie tout : période, ≥1 ligne,
  -- équilibre, immutabilité). numeric(14,2) = arithmétique exacte au centime → égalité stricte.
  if p_auto_post and v_total_debit = v_total_credit then
    return public.post_ledger_transaction(v_tx_id);
  end if;

  return jsonb_build_object(
    'success', true,
    'tx_id', v_tx_id,
    'total_debit', v_total_debit,
    'total_credit', v_total_credit,
    'status', 'draft'
  );
end;
$$;
revoke execute on function public.create_ledger_transaction(uuid, uuid, date, text, text, uuid, jsonb, boolean) from public, anon;
grant execute on function public.create_ledger_transaction(uuid, uuid, date, text, text, uuid, jsonb, boolean) to authenticated, service_role;

-- == 3a. open_next_period : precedence operation_id => travaux ==
create or replace function public.open_next_period(
  p_copro_id          uuid,
  p_closing_period_id uuid,
  p_new_name          text default null,
  p_new_start         date default null,
  p_new_end           date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n            accounting_periods%rowtype;
  v_next_id      uuid;
  v_next_start   date;
  v_next_end     date;
  v_next_name    text;
  v_existing_tx  uuid;
  v_existing_dst period_status;
  v_acct_120     uuid;
  v_acct_110     uuid;
  v_carry        jsonb;
  v_net_courant  numeric;
  v_net_travaux  numeric;
  v_result_entry jsonb;
  v_entries      jsonb;
  v_tx_res       jsonb;
  v_rev          jsonb;
begin
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: manager required for copro %', p_copro_id
      using errcode = '42501';
  end if;

  select * into v_n from public.accounting_periods where id = p_closing_period_id and copro_id = p_copro_id;
  if not found then
    raise exception 'open_next_period: exercice de clôture % introuvable pour la copro %', p_closing_period_id, p_copro_id
      using errcode = '23503';
  end if;
  if v_n.status = 'open' then
    raise exception 'open_next_period: clôturez d''abord l''exercice N (close_period) — statut actuel %', v_n.status
      using errcode = '23514';
  end if;

  select id into v_acct_120 from public.accounts where copro_id = p_copro_id and code = '478';
  if v_acct_120 is null then
    raise exception 'open_next_period: compte d''attente courant (478) absent pour la copro %', p_copro_id
      using errcode = '23503';
  end if;
  select id into v_acct_110 from public.accounts where copro_id = p_copro_id and code = '12';
  if v_acct_110 is null then
    raise exception 'open_next_period: compte d''attente travaux (12) absent pour la copro %', p_copro_id
      using errcode = '23503';
  end if;

  -- Idempotence : reprise déjà posée ? Le remplacement n'est permis que si NI l'exercice source N NI
  -- l'exercice d'ACCUEIL (period_id de la reprise existante = N+1) ne sont approuvés (exemption
  -- is_ledger_regen_exempt, 0024). Sinon message métier clair AVANT le trigger d'immutabilité GL.
  select t.id, ap.status into v_existing_tx, v_existing_dst
  from public.ledger_transactions t
  join public.accounting_periods ap on ap.id = t.period_id
  where t.copro_id = p_copro_id and t.source_type = 'opening_balance' and t.source_id = p_closing_period_id;
  if v_existing_tx is not null and (v_n.status = 'approved' or v_existing_dst = 'approved') then
    raise exception 'open_next_period: reprise figée — exercice approuvé en AG (source % ou accueil), report à-nouveau interdit', p_closing_period_id
      using errcode = '23514';
  end if;
  if v_existing_tx is not null then
    delete from public.ledger_transactions where id = v_existing_tx;
  end if;

  -- Volet 1 : à-nouveaux des soldes de BILAN (1xx/4xx/5xx), par compte×lot, sens selon le net.
  select jsonb_agg(jsonb_build_object(
           'account_id', x.account_id, 'lot_id', x.lot_id,
           'direction', case when x.net > 0 then 'debit' else 'credit' end,
           'amount', abs(x.net), 'entry_label', 'Report à-nouveau'))
    into v_carry
  from (
    select e.account_id, e.lot_id,
           round(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 2) as net
    from public.ledger_entries e
    join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
    join public.accounts a on a.id = e.account_id
    where e.copro_id = p_copro_id and e.period_id = p_closing_period_id
      and substr(a.code, 1, 1) in ('1', '4', '5')
    group by e.account_id, e.lot_id
    having round(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 2) <> 0
  ) x;

  -- Volet 2 : résultat COURANT (classes 6/7 hors comptes travaux/exceptionnels).
  select round(coalesce(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 0), 2)
    into v_net_courant
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a on a.id = e.account_id
  where e.copro_id = p_copro_id and e.period_id = p_closing_period_id
    and e.operation_id is null and a.charge_nature = 'courant';

  -- Volet 2 (suite) : résultat TRAVAUX / exceptionnel (comptes ci-dessus).
  select round(coalesce(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 0), 2)
    into v_net_travaux
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a on a.id = e.account_id
  where e.copro_id = p_copro_id and e.period_id = p_closing_period_id
    and (e.operation_id is not null or a.charge_nature = 'travaux');

  v_result_entry := '[]'::jsonb;
  if v_net_courant <> 0 then
    v_result_entry := v_result_entry || jsonb_build_array(jsonb_build_object(
      'account_id', v_acct_120, 'lot_id', null,
      'direction', case when v_net_courant < 0 then 'credit' else 'debit' end,
      'amount', abs(v_net_courant), 'entry_label', 'Résultat courant ' || v_n.name));
  end if;
  if v_net_travaux <> 0 then
    v_result_entry := v_result_entry || jsonb_build_array(jsonb_build_object(
      'account_id', v_acct_110, 'lot_id', null,
      'direction', case when v_net_travaux < 0 then 'credit' else 'debit' end,
      'amount', abs(v_net_travaux), 'entry_label', 'Résultat travaux ' || v_n.name));
  end if;

  v_entries := coalesce(v_carry, '[]'::jsonb) || v_result_entry;
  if jsonb_array_length(v_entries) = 0 then
    raise exception 'open_next_period: aucun solde à reporter pour l''exercice %', p_closing_period_id
      using errcode = '23514';
  end if;

  -- Calcul des bornes de N+1 (décalage d'un an par défaut) et création/réouverture.
  v_next_start := coalesce(p_new_start, (v_n.start_date + interval '1 year')::date);
  v_next_end   := coalesce(p_new_end,   (v_n.end_date   + interval '1 year')::date);
  v_next_name  := coalesce(p_new_name,  'Exercice ' || extract(year from v_next_start)::int);

  select id into v_next_id
  from public.accounting_periods
  where copro_id = p_copro_id and start_date = v_next_start and end_date = v_next_end;
  if v_next_id is null then
    insert into public.accounting_periods (copro_id, name, start_date, end_date, status)
    values (p_copro_id, v_next_name, v_next_start, v_next_end, 'open')
    returning id into v_next_id;
  else
    update public.accounting_periods set status = 'open' where id = v_next_id and status <> 'open';
  end if;

  -- À-nouveau posté en N+1 OUVERTE (create_ledger_transaction l'exige ; auto-post équilibré).
  v_tx_res := public.create_ledger_transaction(
    p_copro_id, v_next_id, v_next_start,
    'À-nouveau — reprise des soldes ' || v_n.name || ' → ' || v_next_name,
    'opening_balance', p_closing_period_id, v_entries, true
  );
  if not (v_tx_res->>'success')::boolean then
    raise exception 'open_next_period: échec de la reprise à-nouveau : %', v_tx_res->>'error'
      using errcode = '23514';
  end if;

  -- Contre-passation du cut-off de N dans N+1 (les charges constatées d'avance/à payer s'extournent).
  v_rev := public.reverse_period_cutoff(p_copro_id, p_closing_period_id);
  if not (v_rev->>'success')::boolean then
    raise exception 'open_next_period: extourne cut-off échouée (période %) : %', p_closing_period_id, v_rev->>'error'
      using errcode = '23514';
  end if;

  return jsonb_build_object(
    'success', true, 'next_period_id', v_next_id, 'next_period_name', v_next_name,
    'opening_tx_id', v_tx_res->>'tx_id', 'carry_lines', coalesce(jsonb_array_length(v_carry), 0),
    'result_courant', v_net_courant, 'result_travaux', v_net_travaux,
    'result_to_478', abs(v_net_courant), 'result_to_12', abs(v_net_travaux),
    'cutoff_reversal', v_rev
  );
end;
$$;
revoke execute on function public.open_next_period(uuid, uuid, text, date, date) from public, anon;
grant execute on function public.open_next_period(uuid, uuid, text, date, date) to authenticated, service_role;

-- == 3b. v_result_allocation_split : precedence operation_id => travaux ==
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
      when e.operation_id is null and a.charge_nature = 'courant'
      then (case when e.direction = 'credit' then e.amount else -e.amount end) else 0 end), 0), 2) as result_courant,
    round(coalesce(sum(case
      when e.operation_id is not null or a.charge_nature = 'travaux'
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
  'Garde-fou de l''affectation du résultat (B4 : restreint au COURANT 478/450-1, systématique ; le travaux 12/450-2 n''est contrôlé QUE s''il a été déversé, flag p_affecter_travaux ON). 1 ligne = écriture result_allocation incohérente, 0 ligne = conforme. mv_120=478 (courant), mv_110=12 (travaux). Assiette de assert_result_allocation_split.';;

-- == 4. settle_works_balance : garde multi-cles bloquante (E4) ==
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

  -- E4 : GARDE MULTI-CLES. Le solde 12 a apurer peut provenir de travaux appeles sur PLUSIEURS
  -- cles distinctes (potentiellement multi-exercices). Le distribuer via la seule cle generale
  -- produirait des decomptes individuels SILENCIEUSEMENT FAUX -> on leve. La repartition par cle
  -- d'origine (cible) reste differee. Cles au niveau LIGNE (call_for_funds_lines), appels TRAVAUX.
  -- NB : volontairement au niveau LIGNE (et non l'en-tete cf.repartition_key_id comme B5/0058, qui
  -- est 'toujours NULL' en multi-cles -> garde inoperante). Limite connue : un mix lignes avec/sans
  -- cle n'est pas couvert (count des cles non-NULL) -> sera leve par la repartition par cle d'origine.
  if (select count(distinct cfl.repartition_key_id)
        from public.call_for_funds cf
        join public.call_for_funds_lines cfl on cfl.call_id = cf.id
        join public.budgets b on b.id = cf.budget_id
       where cf.copro_id = p_copro_id
         and b.budget_type = 'works'
         and cfl.repartition_key_id is not null) > 1 then
    raise exception 'settle_works_balance: apurement par cle d''origine non encore supporte — les travaux de la copro % portent des appels multi-cles (apurement par cle generale seule impossible)', p_copro_id
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

-- FIN 0060_e4_operation_id_ledger.sql
