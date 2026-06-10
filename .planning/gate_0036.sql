-- ============================================================
-- GATE 0036 — vues-drift-finance. begin/rollback jetable.
-- Presence des 15 vues + interrogeabilite (le SQL des vues s'execute reellement)
-- + colonnes clES des 2 decisions USER (ALUR lot-centric, severite J+15/30/60/90).
-- Lancer : psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f .planning/gate_0036.sql
-- ============================================================
\set ON_ERROR_STOP on
begin;
select set_config('request.jwt.claims','{"role":"service_role"}', true);

-- (1) les 15 vues cibles presentes
do $$ declare n int; begin
  select count(*) into n from pg_views where schemaname='public' and viewname = any(array[
    'v_general_ledger','v_calls_overview','v_call_lines_detailed','v_call_campaigns',
    'v_supplier_invoices_overview','v_budgets_overview','v_budget_lines_overview',
    'v_budget_expenses_detail','v_alur_lot_contributions','v_lots_with_owners',
    'v_repartition_key_totals','v_repartition_key_lines_detailed','v_unpaid_with_reminders',
    'v_payment_reminders_overview','v_account_balances']);
  if n <> 15 then raise exception 'GATE FAIL : %/15 vues presentes', n; end if;
  raise notice '1 OK : 15/15 vues presentes';
end $$;

-- (2) seed donnees de demo (memes que gate_0035) pour exercer les vues avec des lignes
select public.provision_demo_tenant() ->> 'copro' as copro;

-- (3) interrogeabilite : chaque vue s'execute sans erreur (valide colonnes/jointures reelles)
do $$ declare v text; n int; begin
  foreach v in array array[
    'v_general_ledger','v_calls_overview','v_call_lines_detailed','v_call_campaigns',
    'v_supplier_invoices_overview','v_budgets_overview','v_budget_lines_overview',
    'v_budget_expenses_detail','v_alur_lot_contributions','v_lots_with_owners',
    'v_repartition_key_totals','v_repartition_key_lines_detailed','v_unpaid_with_reminders',
    'v_payment_reminders_overview','v_account_balances'] loop
    execute format('select count(*) from public.%I', v) into n;
  end loop;
  raise notice '3 OK : 15 vues interrogeables (SQL execute)';
end $$;

-- (4) ALUR lot-centric : colonnes appelee/versee/solde presentes (decision USER)
do $$ declare n int; begin
  select count(*) into n from information_schema.columns
   where table_schema='public' and table_name='v_alur_lot_contributions'
     and column_name in ('lot_cotisation_appelee','lot_cotisation_versee','lot_solde_alur');
  if n <> 3 then raise exception 'GATE FAIL : v_alur_lot_contributions colonnes lot-centric %/3', n; end if;
  raise notice '4 OK : v_alur_lot_contributions lot-centric (appelee/versee/solde)';
end $$;

-- (5) severite impayes : 4 paliers J+15/30/60/90 -> valeurs bornees
do $$ declare n int; bad int; begin
  select count(*) into n from information_schema.columns
   where table_schema='public' and table_name='v_unpaid_with_reminders'
     and column_name in ('severity','unpaid_amount','total_unpaid');
  if n <> 3 then raise exception 'GATE FAIL : v_unpaid_with_reminders colonnes %/3', n; end if;
  select count(*) into bad from public.v_unpaid_with_reminders
   where severity is not null and severity not in ('NONE','MINOR','MEDIUM','HIGH','CRITICAL');
  if bad <> 0 then raise exception 'GATE FAIL : % ligne(s) severity hors paliers', bad; end if;
  raise notice '5 OK : severity bornee (NONE/MINOR/MEDIUM/HIGH/CRITICAL)';
end $$;

-- (6) grand livre : colonnes attendues par GeneralLedgerEntry (account_code/direction/amount)
do $$ declare n int; begin
  select count(*) into n from information_schema.columns
   where table_schema='public' and table_name='v_general_ledger'
     and column_name in ('entry_id','account_code','direction','amount','lot_ref','source_type');
  if n <> 6 then raise exception 'GATE FAIL : v_general_ledger colonnes %/6', n; end if;
  raise notice '6 OK : v_general_ledger colonnes cle presentes';
end $$;

\echo '=========================================='
\echo 'GATE 0036 : TOUS LES PALIERS OK'
\echo '=========================================='
rollback;
