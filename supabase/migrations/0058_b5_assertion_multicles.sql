-- 0058_b5_assertion_multicles.sql
-- ============================================================================================
-- B5 (DECISIONS.md, 2026-06-10) — ASSERTION BLOQUANTE MULTI-CLÉS dans regularize_period.
--
-- regularize_period distribue le résultat (courant, et travaux si flag ON) aux copropriétaires
-- par la clé GÉNÉRALE active. Ce décompte par lot n'est correct QUE si l'exercice n'a porté des
-- appels que sur une seule clé. Si l'exercice a porté des appels sur PLUSIEURS clés distinctes
-- (ex. budget courant clé générale + ascenseur clé spéciale), la répartition du résultat par la
-- seule clé générale produirait des décomptes individuels SILENCIEUSEMENT FAUX.
--
-- B5 : on LÈVE une erreur explicite plutôt que de produire un faux décompte. La répartition par
-- clé d'origine (courant clé par clé) est la cible E4 (même horizon que operation_id).
--
-- PÉRIMÈTRE : assertion sur regularize_period (scope littéral B5). Le même garde sur
-- settle_works_balance (apurement travaux par clé générale) est volontairement DIFFÉRÉ à E4
-- (répartition par clé d'origine, courant ET travaux) pour éviter un garde mal cadré sur un 12
-- multi-exercices avant E4. NE PAS éditer 0056/0057. CREATE OR REPLACE de la signature 3-args B4.
-- ============================================================================================

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

  -- B5 : ASSERTION MULTI-CLÉS. Si l'exercice a porté des appels sur PLUSIEURS clés distinctes, la
  -- répartition du résultat par la seule clé générale serait silencieusement fausse -> on lève.
  -- Cible E4 : répartition par clé d'origine. Jamais de décompte individuel faux.
  if (select count(distinct cf.repartition_key_id)
        from public.call_for_funds cf
       where cf.copro_id = p_copro_id and cf.period_id = p_period_id
         and cf.repartition_key_id is not null) > 1 then
    raise exception 'regularize_period: répartition par clé d''origine non encore supportée — l''exercice % porte des appels multi-clés (affectation du résultat par clé générale seule impossible)', p_period_id
      using errcode = '23514';
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
  -- est AVANT la lecture des soldes -> le 2e passage relit le 478 reporté et reconstruit courant+travaux
  -- atomiquement dans la même écriture.
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

  -- B4 : skip si RIEN ne sera posté (flag OFF : on ne poste que si le courant bouge ; le travaux gelé).
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

  -- Branche COURANT : D 478 / C 450-1 par quote-part. TOUJOURS active.
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

  -- Branche TRAVAUX (MIROIR) : GELÉE par défaut (B4). Ne se déverse que si p_affecter_travaux = true.
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

-- FIN 0058_b5_assertion_multicles.sql
