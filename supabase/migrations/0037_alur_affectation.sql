-- 0037_alur_affectation.sql — affectation du fonds de travaux ALUR (D105/C705) + règlement cash (D512/C502)
-- Réutilise create_ledger_transaction (0025). Cœur partagé : post_alur_transfer réutilisable par AFFECT_ALUR_FUND (AG, suivi).
-- Revue adversariale 2026-06-08 (go-with-fixes) : pré-gardes (période ouverte, date), sérialisation
-- (advisory_lock + FOR UPDATE), solde = compte 105 cumulé (v_alur_fund_balance, source unique front+serveur).

-- ============================================================
-- 1. Colonnes de suivi du règlement de trésorerie sur alur_transfers
-- ============================================================
alter table public.alur_transfers
  add column if not exists cash_settled      boolean not null default false,
  add column if not exists cash_settled_at   date,
  add column if not exists cash_ledger_tx_id uuid references public.ledger_transactions(id) on delete restrict;

-- ============================================================
-- 2. post_alur_transfer — la décision d'affectation (D105/C705)  [G-MGR + G-SVC]
-- ============================================================
create or replace function public.post_alur_transfer(
  p_copro_id      uuid,
  p_budget_id     uuid,
  p_amount        numeric,
  p_transfer_date date,
  p_notes         text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_budget_type   budget_type;
  v_budget_status budget_status;
  v_period_id     uuid;
  v_period_status period_status;
  v_fund_balance  numeric;
  v_acct_105      uuid;
  v_acct_705      uuid;
  v_tx            jsonb;
  v_tx_id         uuid;
  v_transfer_id   uuid;
begin
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: gestionnaire requis pour la copro %', p_copro_id using errcode = '42501';
  end if;

  -- Sérialise les affectations concurrentes de la même copro (le contrôle de solde 105 reste fiable).
  perform pg_advisory_xact_lock(hashtext('alur_' || p_copro_id::text));

  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('success', false, 'error', 'Le montant à affecter doit être strictement positif.');
  end if;
  if p_transfer_date is null then
    return jsonb_build_object('success', false, 'error', 'La date d''affectation est requise.');
  end if;

  select b.budget_type, b.status, b.period_id
    into v_budget_type, v_budget_status, v_period_id
  from public.budgets b
  where b.id = p_budget_id and b.copro_id = p_copro_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Budget cible introuvable pour cette copropriété.');
  end if;
  if v_budget_type <> 'works' then
    return jsonb_build_object('success', false, 'error',
      'Le fonds de travaux ALUR est réglementé : il ne peut être affecté qu''à un budget travaux voté, pas au compte courant.');
  end if;
  if v_budget_status <> 'validated' then
    return jsonb_build_object('success', false, 'error',
      'Le budget travaux doit être voté (validé) avant de lui affecter le fonds ALUR.');
  end if;

  -- Pré-garde cut-off : la période du budget doit être ouverte. Sinon create_ledger_transaction
  -- lèverait une EXCEPTION brute (errcode 23514) — on renvoie un message lisible à la place.
  select status into v_period_status from public.accounting_periods where id = v_period_id;
  if v_period_status is distinct from 'open' then
    return jsonb_build_object('success', false, 'error',
      format('L''exercice du budget travaux n''est pas ouvert (statut %s) : impossible d''y affecter le fonds ALUR.', v_period_status));
  end if;

  -- Solde cumulé du fonds (compte 105, crédit-normal), tous exercices postés
  select coalesce(sum(case when e.direction = 'credit' then e.amount else -e.amount end), 0)
    into v_fund_balance
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a on a.id = e.account_id
  where e.copro_id = p_copro_id and a.code = '105';

  if p_amount > v_fund_balance then
    return jsonb_build_object('success', false, 'error',
      format('Montant (%s €) supérieur au solde disponible du fonds ALUR (%s €).', p_amount, v_fund_balance));
  end if;

  select id into v_acct_105 from public.accounts where copro_id = p_copro_id and code = '105';
  select id into v_acct_705 from public.accounts where copro_id = p_copro_id and code = '705';
  if v_acct_105 is null or v_acct_705 is null then
    return jsonb_build_object('success', false, 'error', 'Comptes 105/705 absents pour cette copropriété.');
  end if;

  -- Écriture d'affectation D105/C705 dans l'exercice du budget travaux (cut-off).
  v_tx := public.create_ledger_transaction(
    p_copro_id, v_period_id, p_transfer_date,
    'Affectation fonds de travaux ALUR', 'transfer', p_budget_id,
    jsonb_build_array(
      jsonb_build_object('account_id', v_acct_105, 'direction', 'debit',  'amount', p_amount, 'entry_label', 'Affectation fonds ALUR'),
      jsonb_build_object('account_id', v_acct_705, 'direction', 'credit', 'amount', p_amount, 'entry_label', 'Affectation fonds ALUR')
    ),
    true
  );
  if (v_tx->>'success') is distinct from 'true' then
    return jsonb_build_object('success', false, 'error', coalesce(v_tx->>'error', 'Échec de l''écriture d''affectation.'));
  end if;
  v_tx_id := (v_tx->>'tx_id')::uuid;

  insert into public.alur_transfers (copro_id, budget_id, destination, amount, transfer_date, ledger_tx_id, notes, cash_settled)
  values (p_copro_id, p_budget_id, 'works', p_amount, p_transfer_date, v_tx_id, p_notes, false)
  returning id into v_transfer_id;

  return jsonb_build_object('success', true, 'transfer_id', v_transfer_id, 'ledger_tx_id', v_tx_id);
end;
$$;
revoke execute on function public.post_alur_transfer(uuid, uuid, numeric, date, text) from public, anon;
grant  execute on function public.post_alur_transfer(uuid, uuid, numeric, date, text) to authenticated, service_role;

-- ============================================================
-- 3. settle_alur_transfer_cash — le règlement du cash réel (D512/C502)  [G-MGR + G-SVC]
-- ============================================================
create or replace function public.settle_alur_transfer_cash(
  p_transfer_id  uuid,
  p_settled_date date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_copro_id    uuid;
  v_amount      numeric;
  v_settled     boolean;
  v_open_period uuid;
  v_acct_512    uuid;
  v_acct_502    uuid;
  v_tx          jsonb;
  v_tx_id       uuid;
begin
  -- FOR UPDATE : sérialise les règlements concurrents (anti double virement cash).
  select copro_id, amount, cash_settled
    into v_copro_id, v_amount, v_settled
  from public.alur_transfers
  where id = p_transfer_id
  for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Affectation introuvable.');
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_copro_id) then
    raise exception 'forbidden: gestionnaire requis pour la copro %', v_copro_id using errcode = '42501';
  end if;

  if v_settled then
    return jsonb_build_object('success', false, 'error', 'Le virement de trésorerie de cette affectation est déjà marqué comme effectué.');
  end if;

  if p_settled_date is null then
    return jsonb_build_object('success', false, 'error', 'La date du virement est requise.');
  end if;

  select id into v_open_period from public.accounting_periods
  where copro_id = v_copro_id and status = 'open' order by start_date desc limit 1;
  if v_open_period is null then
    return jsonb_build_object('success', false, 'error', 'Aucun exercice ouvert pour enregistrer le virement.');
  end if;

  select id into v_acct_512 from public.accounts where copro_id = v_copro_id and code = '512';
  select id into v_acct_502 from public.accounts where copro_id = v_copro_id and code = '502';
  if v_acct_512 is null or v_acct_502 is null then
    return jsonb_build_object('success', false, 'error', 'Comptes 512/502 absents pour cette copropriété.');
  end if;

  v_tx := public.create_ledger_transaction(
    v_copro_id, v_open_period, p_settled_date,
    'Virement fonds ALUR : Livret A vers compte courant', 'transfer', p_transfer_id,
    jsonb_build_array(
      jsonb_build_object('account_id', v_acct_512, 'direction', 'debit',  'amount', v_amount, 'entry_label', 'Virement fonds ALUR'),
      jsonb_build_object('account_id', v_acct_502, 'direction', 'credit', 'amount', v_amount, 'entry_label', 'Virement fonds ALUR')
    ),
    true
  );
  if (v_tx->>'success') is distinct from 'true' then
    return jsonb_build_object('success', false, 'error', coalesce(v_tx->>'error', 'Échec de l''écriture de virement.'));
  end if;
  v_tx_id := (v_tx->>'tx_id')::uuid;

  update public.alur_transfers
  set cash_settled = true, cash_settled_at = p_settled_date, cash_ledger_tx_id = v_tx_id
  where id = p_transfer_id;

  return jsonb_build_object('success', true, 'cash_ledger_tx_id', v_tx_id);
end;
$$;
revoke execute on function public.settle_alur_transfer_cash(uuid, date) from public, anon;
grant  execute on function public.settle_alur_transfer_cash(uuid, date) to authenticated, service_role;

-- ============================================================
-- 4. v_alur_transfers_pending_cash — rappels « virement non encore effectué »
-- ============================================================
create or replace view public.v_alur_transfers_pending_cash
with (security_invoker = true) as
select
  tr.id          as transfer_id,
  tr.copro_id,
  tr.budget_id,
  b.name         as budget_name,
  tr.amount,
  tr.transfer_date,
  tr.notes
from public.alur_transfers tr
left join public.budgets b on b.id = tr.budget_id
where tr.cash_settled = false;

comment on view public.v_alur_transfers_pending_cash is
  'Affectations du fonds ALUR dont le virement de trésorerie (502->512) n''a pas encore été marqué effectué — alimente le rappel UI.';

-- ============================================================
-- 5. v_alur_fund_balance — solde cumulé du compte 105 par copro (SOURCE UNIQUE du disponible)
-- ============================================================
-- Source unique (décision USER 2026-06-08) : front (modale/bandeau) ET serveur (post_alur_transfer)
-- bornent sur ce solde cumulé. Fini la divergence avec v_alur_fund_summary (par exercice).
create or replace view public.v_alur_fund_balance
with (security_invoker = true) as
select
  a.copro_id,
  coalesce(sum(case when e.direction = 'credit' then e.amount else -e.amount end), 0) as balance
from public.accounts a
left join public.ledger_entries e on e.account_id = a.id
left join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
where a.code = '105'
group by a.copro_id;

comment on view public.v_alur_fund_balance is
  'Solde cumulé du fonds de travaux ALUR (compte 105, crédit-débit, tx postées) par copro — source unique du « disponible » côté serveur ET front.';
