-- 0084_delete_onboarding_copro.sql — Suppression propre d'une copropriété EN ONBOARDING
-- ============================================================================================
-- PROBLÈME : 14 tables financières référencent copros en ON DELETE RESTRICT (protection volontaire
--   des données comptables d'une copro live). Du coup `delete from copros` échoue avec
--   « violates foreign key constraint "accounts_copro_id_fkey" » dès que le plan comptable est
--   provisionné (create_copro). Le bouton « Supprimer » de l'onboarding était donc cassé.
--
-- SOLUTION : RPC SECURITY DEFINER qui, pour une copro ENCORE EN ONBOARDING (onboarding_step non nul),
--   purge les enfants RESTRICT dans un ordre FK-safe (référenceur avant référencé) puis supprime la
--   copro (les ~60 autres FK étant en CASCADE). Garde : gestionnaire de la copro. Interdit sur une
--   copro finalisée (onboarding_step null) pour ne JAMAIS détruire une compta live par ce chemin.
--
-- G-DEF : DEFINER + is_service_call() OR user_is_copro_manager + onboarding_step non nul + revoke
--   public/anon.

create or replace function public.delete_onboarding_copro(p_copro_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_step smallint;
begin
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: gestionnaire requis (copro %)', p_copro_id using errcode = '42501';
  end if;

  select onboarding_step into v_step from public.copros where id = p_copro_id;
  if not found then
    raise exception 'delete_onboarding_copro: copropriété % introuvable', p_copro_id using errcode = '23503';
  end if;
  if v_step is null then
    raise exception 'delete_onboarding_copro: copropriété % finalisée — suppression interdite par ce chemin', p_copro_id using errcode = '23514';
  end if;

  -- Garde immuabilité GL : si des écritures comptables POSTÉES existent (appels émis en étape 6,
  -- reprise des soldes en étape 7), la suppression est interdite — les triggers d'immuabilité
  -- (tr_ledger_entry_immutable / tr_ledger_tx_no_delete_posted) la bloqueraient de toute façon, et
  -- on ne « jette » pas une comptabilité démarrée. Il faut d'abord annuler/contre-passer.
  if exists (
    select 1 from public.ledger_transactions
    where copro_id = p_copro_id and status = 'posted'
  ) then
    raise exception 'delete_onboarding_copro: la copropriété % a des écritures comptables postées — suppression interdite (immutabilité du grand livre). Annulez/contre-passez les écritures d''abord.', p_copro_id
      using errcode = '23514';
  end if;

  -- Enfants RESTRICT, ordre FK-safe (référenceur -> référencé). À ce stade (aucune écriture postée)
  -- ces tables financières sont normalement vides en onboarding ; deletes défensifs (no-op si vide).
  delete from public.ledger_entries                 where copro_id = p_copro_id;
  delete from public.payment_allocations            where copro_id = p_copro_id;
  delete from public.bank_matches                   where copro_id = p_copro_id;
  delete from public.period_cutoff_items            where copro_id = p_copro_id;
  delete from public.opening_balance_residual_items where copro_id = p_copro_id;
  delete from public.budget_expenses                where copro_id = p_copro_id;
  delete from public.treasury_advances              where copro_id = p_copro_id;
  delete from public.supplier_advances              where copro_id = p_copro_id;
  delete from public.collective_loans               where copro_id = p_copro_id;
  delete from public.ledger_transactions            where copro_id = p_copro_id;
  delete from public.payments                       where copro_id = p_copro_id;
  delete from public.bank_movements                 where copro_id = p_copro_id;
  delete from public.accounts                       where copro_id = p_copro_id;
  delete from public.accounting_periods             where copro_id = p_copro_id;

  -- La copro : le reste des enfants est en CASCADE (memberships, lots, coproprietaires, budgets…).
  delete from public.copros where id = p_copro_id;

  return jsonb_build_object('deleted', true, 'copro_id', p_copro_id);
end; $$;
revoke execute on function public.delete_onboarding_copro(uuid) from public, anon;
grant execute on function public.delete_onboarding_copro(uuid) to authenticated, service_role;
