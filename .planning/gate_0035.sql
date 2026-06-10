-- ============================================================
-- GATE 0035 — vues-transverses. begin/rollback jetable.
-- Presence 4 vues + absence vues mortes + R40 (0 doublon) + coherences count.
-- ============================================================
\set ON_ERROR_STOP on
begin;
select set_config('request.jwt.claims','{"role":"service_role"}', true);

-- (1) les 4 vues cibles presentes
do $$ declare n int; begin
  select count(*) into n from pg_views where schemaname='public' and viewname in
    ('v_coproprietaires_overview','v_owner_statement_by_lot_detail','v_alur_fund_summary','v_alur_transfers_history');
  if n <> 4 then raise exception 'GATE FAIL : % / 4 vues cibles presentes', n; end if;
  raise notice '1 OK : 4/4 vues cibles presentes';
end $$;

-- (2) vues mortes absentes
-- NB : v_account_balances et v_alur_lot_contributions RETIREES de cette liste —
--      ressuscitees (adaptees au schema cible) en 0036_vues_drift_finance.sql (decision USER 2026-06-07).
do $$ declare n int; begin
  select count(*) into n from pg_views where schemaname='public' and
    (viewname in ('v_lot_balance','v_owner_financial_summary')
     or viewname like 'v_mail%');
  if n <> 0 then raise exception 'GATE FAIL : % vue(s) morte(s) presente(s)', n; end if;
  raise notice '2 OK : 0 vue morte';
end $$;

-- (3) donnees de demo
select public.provision_demo_tenant() ->> 'copro' as copro;

-- (4) R40 : v_coproprietaires_overview = 0 doublon + 1 ligne par personne
do $$ declare dup int; vcount int; pcount int; begin
  select count(*) into dup from (
    select id from public.v_coproprietaires_overview group by id having count(*) > 1
  ) d;
  if dup <> 0 then raise exception 'GATE FAIL R40 : % id en doublon', dup; end if;
  select count(*) into vcount from public.v_coproprietaires_overview where copro_id='c0000000-0000-4000-a000-0000000000c0';
  select count(*) into pcount from public.coproprietaires where copro_id='c0000000-0000-4000-a000-0000000000c0';
  if vcount <> pcount then raise exception 'GATE FAIL R40 : vue=% != personnes=%', vcount, pcount; end if;
  raise notice '4 OK : R40 0 doublon, % personnes = % lignes vue', pcount, vcount;
end $$;

-- (5) v_alur_transfers_history : count = count(alur_transfers) (jointures non multiplicatives)
do $$ declare vh int; src int; begin
  select count(*) into vh from public.v_alur_transfers_history;
  select count(*) into src from public.alur_transfers;
  if vh <> src then raise exception 'GATE FAIL : v_alur_transfers_history=% != alur_transfers=%', vh, src; end if;
  raise notice '5 OK : v_alur_transfers_history = alur_transfers (% lignes)', src;
end $$;

-- (6) v_owner_statement_by_lot_detail & v_alur_fund_summary : interrogeables sans erreur
do $$ declare n int; begin
  select count(*) into n from public.v_owner_statement_by_lot_detail;
  select count(*) into n from public.v_alur_fund_summary;
  raise notice '6 OK : v_owner_statement_by_lot_detail & v_alur_fund_summary interrogeables';
end $$;

\echo '=========================================='
\echo 'GATE 0035 : TOUS LES PALIERS OK'
\echo '=========================================='
rollback;
