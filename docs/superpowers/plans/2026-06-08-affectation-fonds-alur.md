# Affectation du fonds de travaux ALUR — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre réel le bouton « Transfert ALUR » : affecter une partie du fonds de travaux ALUR à un budget travaux voté (écriture comptable D105/C705), avec suivi du virement de trésorerie réel (D512/C502) et rappel tant qu'il n'est pas réglé.

**Architecture:** Une migration `0037` ajoute 3 colonnes de suivi à la table existante `alur_transfers`, deux RPC plpgsql (`post_alur_transfer` = la décision comptable, `settle_alur_transfer_cash` = le règlement du cash), et une vue `v_alur_transfers_pending_cash` (rappels). Les RPC réutilisent la route canonique `create_ledger_transaction`. Le front (`lib/budget/api.ts` + `useBudget.ts` + `TransferModal`) appelle ces RPC. La RPC `post_alur_transfer` est le **cœur partagé** réutilisable plus tard par une action d'AG `AFFECT_ALUR_FUND` (hors de ce plan).

**Tech Stack:** PostgreSQL/plpgsql (Supabase), Next.js/React/TypeScript, CSS Modules, harnais docker `psql` + gate SQL + vitest.

---

## Décisions verrouillées (à challenger en relecture)

- **Comptes** : affectation **D105 / C705** ; règlement cash **D512 / C502**. `source_type='transfer'`.
- **Destination** : enum `transfer_destination` = `'works'` (refus explicite de `'operating'`).
- **Solde disponible vérifié contre le SOLDE CUMULÉ du compte 105** (crédit − débit, tous exercices postés), PAS la vue par exercice `v_alur_fund_summary` — le fonds ALUR s'accumule d'année en année. ✅ **Validé USER 2026-06-08** ; exposé par la vue `v_alur_fund_balance` consommée AUSSI par le front (source unique).
- **Sérialisation** : `pg_advisory_xact_lock(copro)` dans `post_alur_transfer`, `FOR UPDATE` dans `settle_alur_transfer_cash` (anti double-clic). **Pré-gardes** : `p_transfer_date` non NULL + période du budget ouverte (refus lisible, jamais d'exception brute).
- **Période de l'affectation** = `period_id` du budget travaux (force le cut-off : si l'exercice est clos, `create_ledger_transaction` refuse avec un message explicite).
- **Période du règlement cash** = exercice **ouvert** courant de la copro (le cash bouge « maintenant », souvent plus tard que l'affectation).
- **Jamais de refus silencieux** : toute garde renvoie `{success:false, error:'…'}` lisible.

## File Structure

- **Create** `supabase/migrations/0037_alur_affectation.sql` — ALTER `alur_transfers` (+3 colonnes), `post_alur_transfer`, `settle_alur_transfer_cash`, `v_alur_transfers_pending_cash`, **`v_alur_fund_balance`**, grants.
- **Create** `.planning/gate_0037.sql` — gate jetable (begin/rollback) : harnais copro + scénario affectation → assertions (GL équilibré, 105 décrémenté, ligne `alur_transfers`, refus explicites, règlement cash 502/512).
- **Modify** `src/lib/budget/api.ts` — wrappers `postAlurTransfer` / `settleAlurTransferCash` / `listPendingAlurCash`.
- **Modify** `src/hooks/modules/useBudget.ts` — `handleTransferALUR` réel + chargement des rappels.
- **Modify** `src/components/features/finance/Budget/modals/TransferModal.tsx` — formulaire réel, destination forcée « travaux ».
- **Modify** `src/components/features/finance/Budget/ALURSummary.tsx` (ou onglet ALUR) — bandeau de rappel + action « marquer le virement effectué ».

---

## Phase A — Migration 0037 (base de données)

### Task A1 : Écrire le gate (test) AVANT la migration

**Files:**
- Create: `.planning/gate_0037.sql`

- [ ] **Step 1 : Écrire le gate qui décrit le comportement attendu**

```sql
-- ============================================================
-- GATE 0037 — affectation fonds ALUR. begin/rollback jetable.
-- ============================================================
\set ON_ERROR_STOP on
begin;
select set_config('request.jwt.claims','{"role":"service_role"}', true);

-- Copro de test VIDE (chart + 1 exercice ouvert) — évite toute collision uq_budget avec la boucle d'or
select public.create_test_copro('alur-0037-main') as copro \gset

do $$
declare
  v_copro      uuid := :'copro';
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

  -- (f) RÈGLEMENT CASH du transfert (a) : D512/C502
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
select public.create_test_copro('alur-0037-neutral') as copro2 \gset
do $$
declare
  v_copro   uuid := :'copro2';
  v_period  uuid;
  v_next    uuid;
  v_works   uuid;
  v_res     jsonb;
  v_net_110 numeric;
begin
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
```

- [ ] **Step 2 : Lancer le gate, vérifier qu'il ÉCHOUE (fonctions absentes)**

Run : `docker exec -i supabase_db_Co-Pro-Flex psql -U postgres -d postgres -f - < .planning/gate_0037.sql`
Expected : FAIL — `function public.post_alur_transfer(...) does not exist`.

- [ ] **Step 3 : Commit du gate**

```bash
git add .planning/gate_0037.sql
git commit -m "test: gate 0037 affectation fonds ALUR (rouge)"
```

### Task A2 : Migration — colonnes de suivi cash sur `alur_transfers`

**Files:**
- Create: `supabase/migrations/0037_alur_affectation.sql`

- [ ] **Step 1 : Créer la migration avec l'ALTER**

```sql
-- 0037_alur_affectation.sql — affectation du fonds de travaux ALUR (D105/C705) + règlement cash (D512/C502)
-- Réutilise create_ledger_transaction (0025). Cœur partagé : post_alur_transfer réutilisable par AFFECT_ALUR_FUND (AG, suivi).

alter table public.alur_transfers
  add column if not exists cash_settled      boolean not null default false,
  add column if not exists cash_settled_at   date,
  add column if not exists cash_ledger_tx_id uuid references public.ledger_transactions(id) on delete restrict;
```

- [ ] **Step 2 : Appliquer la migration (reset) et vérifier l'ALTER**

Run : `npx --no-install supabase db reset`
Puis : `docker exec -i supabase_db_Co-Pro-Flex psql -U postgres -d postgres -c "\d public.alur_transfers"`
Expected : colonnes `cash_settled`, `cash_settled_at`, `cash_ledger_tx_id` présentes.

### Task A3 : RPC `post_alur_transfer` (la décision D105/C705)

**Files:**
- Modify: `supabase/migrations/0037_alur_affectation.sql`

- [ ] **Step 1 : Ajouter la fonction à la migration**

```sql
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
```

- [ ] **Step 2 : Appliquer (reset) — pas encore de gate complet**

Run : `npx --no-install supabase db reset`
Expected : migration appliquée sans erreur (`post_alur_transfer` créée).

### Task A4 : RPC `settle_alur_transfer_cash` (le règlement D512/C502)

**Files:**
- Modify: `supabase/migrations/0037_alur_affectation.sql`

- [ ] **Step 1 : Ajouter la fonction**

```sql
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
  v_copro_id   uuid;
  v_amount     numeric;
  v_settled    boolean;
  v_open_period uuid;
  v_acct_512   uuid;
  v_acct_502   uuid;
  v_tx         jsonb;
  v_tx_id      uuid;
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
    'Virement fonds ALUR : Livret A → compte courant', 'transfer', p_transfer_id,
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
```

- [ ] **Step 2 : Appliquer (reset)**

Run : `npx --no-install supabase db reset`
Expected : sans erreur.

### Task A5 : Vue des rappels `v_alur_transfers_pending_cash`

**Files:**
- Modify: `supabase/migrations/0037_alur_affectation.sql`

- [ ] **Step 1 : Ajouter la vue**

```sql
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

-- Source UNIQUE du solde du fonds (décision USER 2026-06-08) : solde cumulé du compte 105
-- (crédit-débit, toutes périodes postées). Le front (modale/bandeau) borne la saisie là-dessus,
-- exactement comme la RPC post_alur_transfer — fini la divergence avec v_alur_fund_summary (par exercice).
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
```

- [ ] **Step 2 : Reset + lancer le GATE complet (doit PASSER)**

Run : `npx --no-install supabase db reset`
Puis : `docker exec -i supabase_db_Co-Pro-Flex psql -U postgres -d postgres -f - < .planning/gate_0037.sql`
Expected : `GATE 0037 : TOUS LES PALIERS OK`.

- [ ] **Step 3 : Commit de la migration**

```bash
git add supabase/migrations/0037_alur_affectation.sql
git commit -m "feat: affectation fonds ALUR (post_alur_transfer + settle cash + rappels)"
```

---

## Phase B — Front (branchement)

### Task B1 : Wrappers TypeScript dans `lib/budget/api.ts`

**Files:**
- Modify: `src/lib/budget/api.ts` (ajouter en fin de fichier, section MUTATIONS)

- [ ] **Step 1 : Ajouter les wrappers**

```typescript
// ============================================================================
// MUTATIONS - Affectation fonds ALUR
// ============================================================================

export interface PendingAlurCash {
  transfer_id: string;
  copro_id: string;
  budget_id: string | null;
  budget_name: string | null;
  amount: number;
  transfer_date: string | null;
  notes: string | null;
}

/** Affecte une partie du fonds ALUR à un budget travaux voté (écriture D105/C705). */
export async function postAlurTransfer(
  coproId: string,
  budgetId: string,
  amount: number,
  transferDate: string,
  notes?: string
): Promise<{ transfer_id: string; ledger_tx_id: string }> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase.rpc('post_alur_transfer', {
    p_copro_id: coproId,
    p_budget_id: budgetId,
    p_amount: amount,
    p_transfer_date: transferDate,
    p_notes: notes ?? null,
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error ?? "Échec de l'affectation du fonds ALUR");
  return { transfer_id: data.transfer_id, ledger_tx_id: data.ledger_tx_id };
}

/** Marque le virement de trésorerie réel (Livret A → courant) comme effectué (écriture D512/C502). */
export async function settleAlurTransferCash(
  transferId: string,
  settledDate: string
): Promise<{ cash_ledger_tx_id: string }> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase.rpc('settle_alur_transfer_cash', {
    p_transfer_id: transferId,
    p_settled_date: settledDate,
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error ?? 'Échec du règlement du virement');
  return { cash_ledger_tx_id: data.cash_ledger_tx_id };
}

/** Liste les affectations en attente de virement de trésorerie (rappels). */
export async function listPendingAlurCash(coproId: string): Promise<PendingAlurCash[]> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('v_alur_transfers_pending_cash')
    .select('*')
    .eq('copro_id', coproId)
    .order('transfer_date', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PendingAlurCash[];
}

/** Solde cumulé du fonds ALUR (compte 105) — SOURCE UNIQUE du disponible (= la borne de la RPC). */
export async function getAlurFundBalance(coproId: string): Promise<number> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('v_alur_fund_balance')
    .select('balance')
    .eq('copro_id', coproId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Number(data?.balance ?? 0);
}
```

- [ ] **Step 2 : Type check**

Run : `npx tsc --noEmit`
Expected : pas d'erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/lib/budget/api.ts
git commit -m "feat: wrappers API affectation fonds ALUR"
```

### Task B2 : `handleTransferALUR` réel + rappels dans `useBudget.ts`

**Files:**
- Modify: `src/hooks/modules/useBudget.ts` (handler ligne ~447 + état rappels + retour du hook)

- [ ] **Step 1 : Remplacer le handler factice**

Remplacer le bloc `handleTransferALUR` (l'`alert()`) par :

```typescript
  const [pendingAlurCash, setPendingAlurCash] = useState<import('@/lib/budget/api').PendingAlurCash[]>([]);

  const loadPendingAlurCash = useCallback(async () => {
    if (!currentCoproId) { setPendingAlurCash([]); return; }
    try {
      const { listPendingAlurCash } = await import('@/lib/budget/api');
      setPendingAlurCash(await listPendingAlurCash(currentCoproId));
    } catch { setPendingAlurCash([]); }
  }, [currentCoproId]);

  useEffect(() => { loadPendingAlurCash(); }, [loadPendingAlurCash]);

  const handleTransferALUR = useCallback(async (
    montant: number,
    _destination: 'COMPTE_COURANT' | 'BUDGET_TRAVAUX',
    budgetId?: string
  ) => {
    if (!currentCoproId || !budgetId) {
      alert('Veuillez sélectionner un budget travaux voté comme destination.');
      return;
    }
    try {
      const { postAlurTransfer } = await import('@/lib/budget/api');
      await postAlurTransfer(currentCoproId, budgetId, montant, new Date().toISOString().split('T')[0]);
      setShowTransferModal(false);
      await refresh();
      await loadAllWorks();
      await loadPendingAlurCash();
    } catch (err) {
      alert(`Affectation impossible : ${err instanceof Error ? err.message : 'erreur inconnue'}`);
    }
  }, [currentCoproId, refresh, loadAllWorks, loadPendingAlurCash]);

  const handleSettleAlurCash = useCallback(async (transferId: string) => {
    try {
      const { settleAlurTransferCash } = await import('@/lib/budget/api');
      await settleAlurTransferCash(transferId, new Date().toISOString().split('T')[0]);
      await loadPendingAlurCash();
      await refresh();
    } catch (err) {
      alert(`Règlement impossible : ${err instanceof Error ? err.message : 'erreur inconnue'}`);
    }
  }, [loadPendingAlurCash, refresh]);
```

- [ ] **Step 2 : Exposer dans le `return` du hook**

Ajouter au `return { ... }` (près de `handleTransferALUR`) :

```typescript
    handleSettleAlurCash,
    pendingAlurCash,
```

- [ ] **Step 2bis : Source UNIQUE du solde — `fondsALUR.soldeActuel` = solde 105 cumulé**

Dans `useBudget.ts`, le `fondsALUR` actuel calcule `soldeActuel` par exercice
(`cotisation − validated_spent`, ~ligne 350-359) — c'est la source divergente pointée par
la revue. La remplacer par le **solde cumulé du 105** lu via la nouvelle vue :

```typescript
  const [alurFundBalance, setAlurFundBalance] = useState<number>(0);

  const loadAlurFundBalance = useCallback(async () => {
    if (!currentCoproId) { setAlurFundBalance(0); return; }
    try {
      const { getAlurFundBalance } = await import('@/lib/budget/api');
      setAlurFundBalance(await getAlurFundBalance(currentCoproId));
    } catch { setAlurFundBalance(0); }
  }, [currentCoproId]);

  useEffect(() => { loadAlurFundBalance(); }, [loadAlurFundBalance]);
```

puis, dans le `useMemo` qui construit `fondsALUR`, utiliser `soldeActuel: alurFundBalance`
(garder `cotisationAnnuelle`/`pourcentageBudget` indicatifs depuis le budget ALUR), et
ajouter `alurFundBalance` aux dépendances. Recharger `loadAlurFundBalance()` après une
affectation/un règlement (à côté de `loadPendingAlurCash()`).

- [ ] **Step 3 : `historiqueTransferts` réel (sous-tâche #1)**

`fondsALUR.historiqueTransferts` est aujourd'hui toujours `[]`. Le peupler depuis
`v_alur_transfers_history` (ajouter un wrapper `listAlurTransfersHistory(coproId)` dans
`lib/budget/api.ts` sur le modèle de `listPendingAlurCash`, puis mapper vers le type
attendu par `ALURTransfertHistory`). Sinon l'historique affichera toujours « Aucun transfert ».

- [ ] **Step 4 : Type check + commit**

Run : `npx tsc --noEmit`
Expected : pas d'erreur.

```bash
git add src/hooks/modules/useBudget.ts src/lib/budget/api.ts
git commit -m "feat: brancher handleTransferALUR + solde 105 + historiqueTransferts"
```

### Task B3 : `TransferModal` — formulaire réel, destination « travaux » forcée

**Files:**
- Modify: `src/components/features/finance/Budget/modals/TransferModal.tsx`

- [ ] **Step 1 : Réécrire la modale avec un état contrôlé**

```tsx
'use client';

import { useState } from 'react';
import { BudgetTravaux, FondsALUR } from '../types';
import styles from '../Budget.module.css';

interface TransferModalProps {
  fondsALUR: FondsALUR;
  budgetsTravaux: BudgetTravaux[];
  onClose: () => void;
  onTransfer: (
    montant: number,
    destination: 'COMPTE_COURANT' | 'BUDGET_TRAVAUX',
    budgetId?: string
  ) => void;
}

export function TransferModal({ fondsALUR, budgetsTravaux, onClose, onTransfer }: TransferModalProps) {
  const [montant, setMontant] = useState<number>(0);
  const [budgetId, setBudgetId] = useState<string>('');

  // EN_COURS = DB status 'validated' (travaux votés, non clôturés). Exclut A_VENIR (brouillon) ET TERMINE (clos),
  // que post_alur_transfer refuserait. fondsALUR.soldeActuel DOIT être le solde 105 cumulé (cf. Task B2 Step 2bis).
  const votedWorks = budgetsTravaux.filter((bt) => bt.statut === 'EN_COURS');
  const canSubmit = montant > 0 && montant <= fondsALUR.soldeActuel && budgetId !== '';

  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2 className={styles.modalTitle}>Affectation du fonds de travaux ALUR</h2>
        <p className={styles.modalSubtitle}>
          Le fonds ALUR ne peut financer que des travaux votés. Solde disponible : {fondsALUR.soldeActuel.toLocaleString('fr-FR')} €
        </p>

        <div className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Montant à affecter</label>
            <input
              type="number" className={styles.input} placeholder="0" min={0} max={fondsALUR.soldeActuel}
              value={montant || ''} onChange={(e) => setMontant(Number(e.target.value))} aria-label="Montant à affecter"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Budget travaux voté</label>
            <select className={styles.input} value={budgetId} onChange={(e) => setBudgetId(e.target.value)} aria-label="Budget travaux voté">
              <option value="">Sélectionner un budget travaux voté…</option>
              {votedWorks.map((bt) => (
                <option key={bt.id} value={bt.id}>{bt.titre}</option>
              ))}
            </select>
            {votedWorks.length === 0 && (
              <p className={styles.modalSubtitle}>Aucun budget travaux voté disponible pour une affectation.</p>
            )}
          </div>
        </div>

        <div className={styles.modalActions}>
          <button onClick={onClose} className="btn btn-secondary">Annuler</button>
          <button
            onClick={() => onTransfer(montant, 'BUDGET_TRAVAUX', budgetId)}
            className="btn btn-primary" disabled={!canSubmit}
          >
            Affecter au budget travaux
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Type check + commit**

Run : `npx tsc --noEmit`
Expected : pas d'erreur.

```bash
git add src/components/features/finance/Budget/modals/TransferModal.tsx
git commit -m "feat: modale affectation ALUR (formulaire réel, destination travaux)"
```

### Task B4 : Bandeau de rappel dans l'onglet ALUR

**Files:**
- Modify: `src/components/features/finance/Budget/ALURSummary.tsx`

- [ ] **Step 1 : Lire le composant pour repérer où insérer le bandeau**

Run : ouvrir `src/components/features/finance/Budget/ALURSummary.tsx` et identifier les props reçues du hook `useBudget` (notamment si `pendingAlurCash` / `handleSettleAlurCash` y sont déjà passés ; sinon les ajouter via le parent qui rend `ALURSummary`).

- [ ] **Step 2 : Ajouter le bandeau (au-dessus du contenu existant)**

```tsx
{pendingAlurCash.length > 0 && (
  <div className={styles.alertBanner} role="status">
    <span>
      {pendingAlurCash.reduce((s, p) => s + p.amount, 0).toLocaleString('fr-FR')} €
      affectés en attente de virement de trésorerie (Livret A → compte courant).
    </span>
    <ul>
      {pendingAlurCash.map((p) => (
        <li key={p.transfer_id}>
          {p.budget_name ?? 'Budget travaux'} — {p.amount.toLocaleString('fr-FR')} €
          <button className="btn btn-secondary" onClick={() => handleSettleAlurCash(p.transfer_id)}>
            Marquer le virement effectué
          </button>
        </li>
      ))}
    </ul>
  </div>
)}
```

(Props à ajouter à `ALURSummary` : `pendingAlurCash: PendingAlurCash[]` et `handleSettleAlurCash: (id: string) => void`, fournis par le composant parent depuis `useBudget`.)

- [ ] **Step 3 : Type check**

Run : `npx tsc --noEmit`
Expected : pas d'erreur.

- [ ] **Step 4 : Vérif comportement réel (USER)**

L'utilisateur lance l'app, va dans Finance → Budget → onglet ALUR, affecte un montant à un budget travaux voté, vérifie : la modale n'autorise que les travaux, l'affectation réussit, le bandeau de rappel apparaît, « marquer le virement effectué » le fait disparaître.

- [ ] **Step 5 : Commit**

```bash
git add src/components/features/finance/Budget/ALURSummary.tsx
git commit -m "feat: bandeau rappel virement fonds ALUR (onglet ALUR)"
```

---

## Vérification finale

- [ ] `npx tsc --noEmit` (zéro erreur)
- [ ] `npx vitest run` (suite verte)
- [ ] Gate 0037 vert : `docker exec -i supabase_db_Co-Pro-Flex psql -U postgres -d postgres -f - < .planning/gate_0037.sql`
- [ ] Boucle d'or intacte : `npm run db:test` (4/4)
- [ ] Vérif runtime USER (Task B4 Step 4).

## Hors de ce plan (suivis — voir `.planning/PROGRESS_budget-trous.md`)

- **#6 AFFECT_ALUR_FUND** : déclencher `post_alur_transfer` depuis une résolution d'AG.
- **#4** affichage du lien AG (front-only), **#2/#3** appels de fonds, **#5** suppression mock.
