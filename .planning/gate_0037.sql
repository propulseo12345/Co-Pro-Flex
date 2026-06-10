-- ============================================================
-- GATE 0037 — affectation fonds ALUR. begin/rollback jetable.
-- ============================================================
\set ON_ERROR_STOP on
begin;
select set_config('request.jwt.claims','{"role":"service_role"}', true);

-- Copro de test VIDE créée DANS le bloc (psql n'interpole pas :var à l'intérieur de $$...$$)
do $$
declare
  v_copro      uuid;
  v_period     uuid;
  v_works      uuid;
  v_fund_before numeric;
  v_fund_after  numeric;
  v_705_b      numeric;
  v_705_a      numeric;
  v_res        jsonb;
  v_transfer   uuid;
  v_bal_512_b  numeric; v_bal_502_b numeric;
  v_bal_512_a  numeric; v_bal_502_a numeric; v_bal_512_c numeric;
begin
  v_copro := public.create_test_copro('alur-0037-main');
  select id into v_period from public.accounting_periods where copro_id=v_copro and status='open' order by start_date desc limit 1;

  -- (a) Alimenter le fonds : D502 (Livret A) / C105 (réserve) de 10000 — deux comptes hors 45x (pas de lot_id requis)
  perform public.create_ledger_transaction(
    v_copro, v_period, current_date, 'Seed fonds ALUR', 'transfer', null,
    jsonb_build_array(
      jsonb_build_object('account_id',(select id from public.accounts where copro_id=v_copro and code='502'),'direction','debit','amount',10000),
      jsonb_build_object('account_id',(select id from public.accounts where copro_id=v_copro and code='105'),'direction','credit','amount',10000)
    ), true);

  -- solde 105 avant
  select coalesce(sum(case when e.direction='credit' then e.amount else -e.amount end),0) into v_fund_before
  from public.ledger_entries e join public.ledger_transactions t on t.id=e.tx_id and t.status='posted'
  join public.accounts a on a.id=e.account_id where e.copro_id=v_copro and a.code='105';
  if v_fund_before < 10000 then raise exception 'GATE FAIL setup : fonds 105 = % (attendu >=10000)', v_fund_before; end if;

  -- (b) Créer un budget travaux VOTÉ
  insert into public.budgets (copro_id, period_id, budget_type, name, status, version)
  values (v_copro, v_period, 'works', 'Toiture', 'validated', 1) returning id into v_works;

  -- solde 705 avant (compte income, crédit-normal)
  select coalesce(sum(case when e.direction='credit' then e.amount else -e.amount end),0) into v_705_b
  from public.ledger_entries e join public.ledger_transactions t on t.id=e.tx_id and t.status='posted'
  join public.accounts a on a.id=e.account_id where e.copro_id=v_copro and a.code='705';

  -- (c) AFFECTATION 8000 -> doit réussir
  v_res := public.post_alur_transfer(v_copro, v_works, 8000, current_date, 'Affectation toiture');
  if (v_res->>'success')::boolean is not true then raise exception 'GATE FAIL : affectation refusée : %', v_res->>'error'; end if;
  v_transfer := (v_res->>'transfer_id')::uuid;

  -- ligne alur_transfers créée, destination works, cash_settled=false
  perform 1 from public.alur_transfers where id=v_transfer and destination='works' and amount=8000 and cash_settled=false and budget_id=v_works;
  if not found then raise exception 'GATE FAIL : ligne alur_transfers absente/incorrecte'; end if;

  -- 105 décrémenté de 8000
  select coalesce(sum(case when e.direction='credit' then e.amount else -e.amount end),0) into v_fund_after
  from public.ledger_entries e join public.ledger_transactions t on t.id=e.tx_id and t.status='posted'
  join public.accounts a on a.id=e.account_id where e.copro_id=v_copro and a.code='105';
  if round(v_fund_before - v_fund_after,2) <> 8000 then raise exception 'GATE FAIL : 105 décrémenté de % (attendu 8000)', v_fund_before - v_fund_after; end if;

  -- 705 crédité de 8000 (sinon neutralisation à la clôture cassée — faux-vert classique)
  select coalesce(sum(case when e.direction='credit' then e.amount else -e.amount end),0) into v_705_a
  from public.ledger_entries e join public.ledger_transactions t on t.id=e.tx_id and t.status='posted'
  join public.accounts a on a.id=e.account_id where e.copro_id=v_copro and a.code='705';
  if round(v_705_a - v_705_b,2) <> 8000 then raise exception 'GATE FAIL : 705 non crédité de 8000 (delta=%)', v_705_a - v_705_b; end if;

  -- (d) Refus : montant > solde
  v_res := public.post_alur_transfer(v_copro, v_works, 999999, current_date, null);
  if (v_res->>'success')::boolean is not false then raise exception 'GATE FAIL : montant excessif aurait dû être refusé'; end if;

  -- (d2) Refus : montant nul ou négatif
  v_res := public.post_alur_transfer(v_copro, v_works, 0, current_date, null);
  if (v_res->>'success')::boolean is not false then raise exception 'GATE FAIL : montant nul aurait dû être refusé'; end if;
  v_res := public.post_alur_transfer(v_copro, v_works, -100, current_date, null);
  if (v_res->>'success')::boolean is not false then raise exception 'GATE FAIL : montant négatif aurait dû être refusé'; end if;

  -- (e) Refus : budget non travaux (budget courant en 'draft'/v2 — évite uq_budget_one_validated/uq_budget_version)
  declare v_cur uuid; begin
    insert into public.budgets (copro_id, period_id, budget_type, name, status, version)
    values (v_copro, v_period, 'current', 'Courant', 'draft', 2) returning id into v_cur;
    v_res := public.post_alur_transfer(v_copro, v_cur, 100, current_date, null);
    if (v_res->>'success')::boolean is not false then raise exception 'GATE FAIL : budget courant aurait dû être refusé'; end if;
  end;

  -- (f) RÈGLEMENT CASH du transfert (c) : D512/C502
  select coalesce(sum(case when e.direction='debit' then e.amount else -e.amount end),0) into v_bal_512_b from public.ledger_entries e join public.ledger_transactions t on t.id=e.tx_id and t.status='posted' join public.accounts a on a.id=e.account_id where e.copro_id=v_copro and a.code='512';
  select coalesce(sum(case when e.direction='debit' then e.amount else -e.amount end),0) into v_bal_502_b from public.ledger_entries e join public.ledger_transactions t on t.id=e.tx_id and t.status='posted' join public.accounts a on a.id=e.account_id where e.copro_id=v_copro and a.code='502';

  v_res := public.settle_alur_transfer_cash(v_transfer, current_date);
  if (v_res->>'success')::boolean is not true then raise exception 'GATE FAIL : règlement cash refusé : %', v_res->>'error'; end if;

  select coalesce(sum(case when e.direction='debit' then e.amount else -e.amount end),0) into v_bal_512_a from public.ledger_entries e join public.ledger_transactions t on t.id=e.tx_id and t.status='posted' join public.accounts a on a.id=e.account_id where e.copro_id=v_copro and a.code='512';
  select coalesce(sum(case when e.direction='debit' then e.amount else -e.amount end),0) into v_bal_502_a from public.ledger_entries e join public.ledger_transactions t on t.id=e.tx_id and t.status='posted' join public.accounts a on a.id=e.account_id where e.copro_id=v_copro and a.code='502';
  if round(v_bal_512_a - v_bal_512_b,2) <> 8000 then raise exception 'GATE FAIL : 512 non crédité de 8000 (delta=%)', v_bal_512_a - v_bal_512_b; end if;
  if round(v_bal_502_b - v_bal_502_a,2) <> 8000 then raise exception 'GATE FAIL : 502 non débité de 8000 (delta=%)', v_bal_502_b - v_bal_502_a; end if;

  -- cash_settled passé à true + plus aucun rappel pour ce transfert
  perform 1 from public.alur_transfers where id=v_transfer and cash_settled=true and cash_settled_at is not null and cash_ledger_tx_id is not null;
  if not found then raise exception 'GATE FAIL : cash_settled non mis à jour'; end if;
  perform 1 from public.v_alur_transfers_pending_cash where transfer_id=v_transfer;
  if found then raise exception 'GATE FAIL : transfert réglé encore présent dans les rappels'; end if;

  -- (g) Double règlement refusé
  v_res := public.settle_alur_transfer_cash(v_transfer, current_date);
  if (v_res->>'success')::boolean is not false then raise exception 'GATE FAIL : double règlement aurait dû être refusé'; end if;

  -- (g2) le double règlement n'a posté AUCUNE 2e écriture cash (512 inchangé)
  select coalesce(sum(case when e.direction='debit' then e.amount else -e.amount end),0) into v_bal_512_c from public.ledger_entries e join public.ledger_transactions t on t.id=e.tx_id and t.status='posted' join public.accounts a on a.id=e.account_id where e.copro_id=v_copro and a.code='512';
  if round(v_bal_512_c - v_bal_512_a,2) <> 0 then raise exception 'GATE FAIL : double règlement a posté une 2e écriture cash (delta 512=%)', v_bal_512_c - v_bal_512_a; end if;

  -- (sec) la garde de sécurité refuse un appelant non-manager (role authenticated, auth.uid() NULL -> 42501)
  perform set_config('request.jwt.claims','{"role":"authenticated"}', true);
  begin
    perform public.post_alur_transfer(v_copro, v_works, 100, current_date, null);
    raise exception 'GATE FAIL : appel non-manager aurait dû lever 42501';
  exception when sqlstate '42501' then null;
  end;
  perform set_config('request.jwt.claims','{"role":"service_role"}', true);

  raise notice 'GATE 0037 (a-g) : affectation + cash + refus + sécurité OK (copro %)', v_copro;
end $$;

-- (h) NEUTRALISATION 705->110 à la clôture, sur copro VIDE dédiée (preuve « pas de double-comptage »)
do $$
declare
  v_copro   uuid;
  v_period  uuid;
  v_next    uuid;
  v_works   uuid;
  v_res     jsonb;
  v_net_110 numeric;
begin
  v_copro := public.create_test_copro('alur-0037-neutral');
  select id into v_period from public.accounting_periods where copro_id=v_copro and status='open' order by start_date desc limit 1;

  -- fonds 105 (D502/C105) puis charge travaux (D671/C401), 8000 chacun
  perform public.create_ledger_transaction(v_copro, v_period, current_date, 'Seed fonds ALUR', 'transfer', null,
    jsonb_build_array(
      jsonb_build_object('account_id',(select id from public.accounts where copro_id=v_copro and code='502'),'direction','debit','amount',8000),
      jsonb_build_object('account_id',(select id from public.accounts where copro_id=v_copro and code='105'),'direction','credit','amount',8000)
    ), true);
  perform public.create_ledger_transaction(v_copro, v_period, current_date, 'Travaux toiture', 'manual', null,
    jsonb_build_array(
      jsonb_build_object('account_id',(select id from public.accounts where copro_id=v_copro and code='671'),'direction','debit','amount',8000),
      jsonb_build_object('account_id',(select id from public.accounts where copro_id=v_copro and code='401'),'direction','credit','amount',8000)
    ), true);

  -- budget travaux voté + affectation 8000 (D105/C705)
  insert into public.budgets (copro_id, period_id, budget_type, name, status, version)
  values (v_copro, v_period, 'works', 'Toiture', 'validated', 1) returning id into v_works;
  v_res := public.post_alur_transfer(v_copro, v_works, 8000, current_date, null);
  if (v_res->>'success')::boolean is not true then raise exception 'GATE FAIL (h) : affectation refusée : %', v_res->>'error'; end if;

  -- clôture N puis ouverture N+1 (reporte les à-nouveaux + ventile le résultat 6/7 vers 110/120)
  perform public.close_period(v_period);
  perform public.open_next_period(v_copro, v_period);
  select id into v_next from public.accounting_periods where copro_id=v_copro and status='open' order by start_date desc limit 1;

  -- net porté sur le 110 (résultat travaux) en N+1 = 0 : la charge 671 (8000) est neutralisée par le 705 (8000)
  select coalesce(sum(case when e.direction='credit' then e.amount else -e.amount end),0) into v_net_110
  from public.ledger_entries e join public.ledger_transactions t on t.id=e.tx_id and t.status='posted'
  join public.accounts a on a.id=e.account_id where e.copro_id=v_copro and a.code='110' and t.period_id=v_next;
  if round(v_net_110,2) <> 0 then raise exception 'GATE FAIL (h) : neutralisation 705/671 KO — net 110 en N+1 = % (attendu 0)', v_net_110; end if;

  raise notice 'GATE 0037 (h) : neutralisation 705->110 à la clôture PROUVÉE (copro %)', v_copro;
end $$;

\echo '=========================================='
\echo 'GATE 0037 : TOUS LES PALIERS OK'
\echo '=========================================='
rollback;
