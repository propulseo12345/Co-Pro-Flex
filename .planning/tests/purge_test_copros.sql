-- purge_test_copros.sql — Purge À LA DEMANDE des copropriétés de TEST (GL posté inclus)
-- ============================================================================================
-- ⚠️ TEST-ONLY. À lancer via une CONNEXION ADMIN (MCP Supabase / connexion postgres directe) —
--    PAS via PostgREST/clé service_role, et PAS depuis une fonction SECURITY DEFINER :
--    `session_replication_role` est un paramètre super-privilège, refusé dans ces deux contextes
--    (leçon LECONS L06). C'est pourquoi la purge est un SCRIPT admin, pas une RPC.
--
-- POURQUOI : une copro de test à grand livre POSTÉ ne peut être supprimée proprement (immutabilité
--    GL + 14 FK RESTRICT). On bascule la session en `replica` (désactive immutabilité ET FK) le
--    temps de vider les ~15 tables finance RESTRICT (ordre libre), puis on repasse en `origin` et
--    `delete copros` CASCADE le reste (~60 tables). Prouvé en BEGIN/ROLLBACK le 2026-06-22.
--
-- GARDE-FOU : ne touche QUE les copros dont le nom commence par « E2E- » (créées par les specs via
--    le wizard) ou « HARNESS » (seedées par create_test_copro). Jamais une vraie copro.
--
-- USAGE : exécuter tel quel pour purger TOUTES les copros de test. Pour n'en cibler qu'une, ajouter
--    « and c.id = '<uuid>' » dans le SELECT du curseur.

do $$
declare
  r record;
  n int := 0;
begin
  for r in
    select c.id, c.name
    from public.copros c
    where c.name like 'E2E-%' or c.name like 'HARNESS %'
  loop
    -- 1) replica : immutabilité GL + FK désactivées -> suppression order-free des tables RESTRICT
    -- NB : forme littérale `set local` obligatoire — `set_config(...)` est refusé sur cette connexion (LECONS L06).
    set local session_replication_role = replica;
    delete from public.ledger_entries                 where copro_id = r.id;
    delete from public.payment_allocations            where copro_id = r.id;
    delete from public.bank_matches                   where copro_id = r.id;
    delete from public.period_cutoff_items            where copro_id = r.id;
    delete from public.opening_balance_residual_items where copro_id = r.id;
    delete from public.budget_expenses                where copro_id = r.id;
    delete from public.treasury_advances              where copro_id = r.id;
    delete from public.supplier_advances              where copro_id = r.id;
    delete from public.collective_loan_shares         where loan_id in (select id from public.collective_loans where copro_id = r.id);
    delete from public.collective_loans               where copro_id = r.id;
    delete from public.ledger_transactions            where copro_id = r.id;
    delete from public.payments                       where copro_id = r.id;
    delete from public.bank_movements                 where copro_id = r.id;
    delete from public.accounts                       where copro_id = r.id;
    delete from public.accounting_periods             where copro_id = r.id;

    -- 2) origin : delete copros -> cascade le reste (AG, lots, GED, maintenance, comm...)
    set local session_replication_role = origin;
    delete from public.copros where id = r.id;

    n := n + 1;
    raise notice 'purgée: % (%)', r.name, r.id;
  end loop;
  raise notice 'TOTAL copros de test purgées: %', n;
end $$;
