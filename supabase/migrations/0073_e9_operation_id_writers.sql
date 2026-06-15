-- 0073_e9_operation_id_writers.sql — E9 : rattachement operation_id à la SAISIE + filet + clôture
-- ============================================================================================
-- Source : .planning/PLAN_J5_2026-06-15.md T3 + arbitrages §5 (#8 sélecteur non bloquant + filet +
--   garde DURE à la clôture ; #9 auto-rattacher la ligne travaux des appels à leur budget_id ;
--   #10 filet exclut les écritures techniques).
--
-- CONTEXTE : E4 (0060) a posé la COLONNE ledger_entries.operation_id + la LECTURE (précédence
--   « operation_id NOT NULL => travaux »). E9 câble les ÉCRIVAINS pour POSER operation_id dès la
--   saisie, ajoute un FILET (vue v_works_entries_unlinked + assertion) et une GARDE DURE à la
--   clôture d'opération (close_works_operation). Le point de contrôle dur est la CLÔTURE, pas la
--   saisie (sélecteur front non bloquant — pas de refus silencieux).
--
-- DÉFINITION « TRAVAUX » UNIQUE (alignée 0060 open_next_period / v_result_allocation_split) :
--   operation_id IS NOT NULL OR a.charge_nature='travaux'. Le filet vise les CHARGES travaux
--   (charge_nature='travaux', comptes 6xx) ENCORE orphelines (operation_id IS NULL).
--
-- CONVENTIONS : ALTER non-GL sûr ; CREATE OR REPLACE des RPC (golden loop -> rejouer les gates) ;
--   DEFINER + garde G-MGR copro dérivée ; un seul % ; REVOKE public/anon ; GRANT authenticated+service_role.

-- ============================================================================================
-- 1. supplier_invoice_lines.operation_id — colonne non-GL (rattachement opération à la saisie)
-- ============================================================================================
alter table public.supplier_invoice_lines
  add column if not exists operation_id uuid references public.budgets(id) on delete restrict;
create index if not exists idx_supplier_invoice_lines_operation
  on public.supplier_invoice_lines (operation_id) where operation_id is not null;
comment on column public.supplier_invoice_lines.operation_id is
  'Operation (budget travaux) rattachee a la ligne des la saisie ; relue au post/validate pour porter operation_id sur la ligne 6xx du GL (E9).';


-- ============================================================================================
-- 2. post_supplier_invoice — forward operation_id (ligne persistée + ligne 6xx du GL)
-- ============================================================================================
create or replace function public.post_supplier_invoice(
  p_copro_id                 uuid,
  p_period_id                uuid,
  p_tiers_id                 uuid,
  p_invoice_number           text,
  p_invoice_date             date,
  p_due_date                 date,
  p_label                    text,
  p_lines                    jsonb,
  p_document_id              uuid    default null,
  p_service_order_id         uuid    default null,
  p_post_immediately         boolean default true,
  p_montant_ht               numeric default null,
  p_montant_tva              numeric default null,
  p_taux_tva                 numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total      numeric;
  v_acct401    uuid;
  v_invoice_id uuid;
  v_entries    jsonb;
  v_ltx        jsonb;
  v_tx_id      uuid := null;
begin
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: manager required for copro %', p_copro_id
      using errcode = '42501';
  end if;

  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'post_supplier_invoice: au moins une ligne de charge est requise'
      using errcode = '23514';
  end if;

  select sum((l->>'amount')::numeric) into v_total
  from jsonb_array_elements(p_lines) l;

  if v_total is null or v_total <= 0 then
    raise exception 'post_supplier_invoice: le total TTC doit être positif (reçu %)', v_total
      using errcode = '23514';
  end if;

  insert into public.supplier_invoices (
    copro_id, period_id, tiers_id, invoice_number, invoice_date, due_date,
    label, total_amount, status, service_order_id, document_id,
    montant_ht, montant_tva, taux_tva
  ) values (
    p_copro_id, p_period_id, p_tiers_id, p_invoice_number, p_invoice_date, p_due_date,
    p_label, v_total,
    (case when p_post_immediately then 'posted' else 'draft' end)::supplier_invoice_status,
    p_service_order_id, p_document_id,
    p_montant_ht, p_montant_tva, p_taux_tva
  )
  returning id into v_invoice_id;

  -- Lignes de ventilation (+ operation_id rattaché à la saisie).
  insert into public.supplier_invoice_lines (
    copro_id, invoice_id, account_id, label, amount,
    repartition_key_id, budget_line_id, amount_ht, amount_tva, taux_pct, operation_id
  )
  select
    p_copro_id, v_invoice_id, (l->>'account_id')::uuid, l->>'label', (l->>'amount')::numeric,
    nullif(l->>'repartition_key_id','')::uuid, nullif(l->>'budget_line_id','')::uuid,
    nullif(l->>'amount_ht','')::numeric, nullif(l->>'amount_tva','')::numeric, nullif(l->>'taux_pct','')::numeric,
    nullif(l->>'operation_id','')::uuid
  from jsonb_array_elements(p_lines) l;

  if p_post_immediately then
    select id into v_acct401 from public.accounts where copro_id = p_copro_id and code = '401';
    if v_acct401 is null then
      raise exception 'post_supplier_invoice: compte 401 (Fournisseurs) introuvable pour la copro %', p_copro_id
        using errcode = '23503';
    end if;

    -- D 6xx (par ligne, AVEC operation_id) / C 401 (total).
    select jsonb_agg(jsonb_build_object(
      'account_id', (l->>'account_id')::uuid,
      'direction', 'debit',
      'amount', (l->>'amount')::numeric,
      'entry_label', coalesce(l->>'label', p_label),
      'operation_id', nullif(l->>'operation_id','')::uuid
    ))
    into v_entries
    from jsonb_array_elements(p_lines) l;

    v_entries := v_entries || jsonb_build_array(jsonb_build_object(
      'account_id', v_acct401,
      'direction', 'credit',
      'amount', v_total,
      'entry_label', 'Dette fournisseur : ' || p_label
    ));

    v_ltx := public.create_ledger_transaction(
      p_copro_id, p_period_id, p_invoice_date,
      'Facture fournisseur : ' || p_label,
      'supplier_invoice', v_invoice_id, v_entries, true
    );
    if not (v_ltx->>'success')::boolean then
      raise exception 'post_supplier_invoice: échec écriture grand livre : %', v_ltx->>'error'
        using errcode = '23514';
    end if;
    v_tx_id := (v_ltx->>'tx_id')::uuid;
    update public.supplier_invoices set ledger_tx_id = v_tx_id where id = v_invoice_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'invoice_id', v_invoice_id,
    'ledger_tx_id', v_tx_id,
    'total_amount', v_total
  );
end;
$$;
revoke execute on function public.post_supplier_invoice(uuid, uuid, uuid, text, date, date, text, jsonb, uuid, uuid, boolean, numeric, numeric, numeric) from public, anon;
grant execute on function public.post_supplier_invoice(uuid, uuid, uuid, text, date, date, text, jsonb, uuid, uuid, boolean, numeric, numeric, numeric) to authenticated, service_role;


-- ============================================================================================
-- 3. validate_supplier_invoice — relit operation_id depuis supplier_invoice_lines (draft->validate)
-- ============================================================================================
create or replace function public.validate_supplier_invoice(p_invoice_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv     record;
  v_acct401 uuid;
  v_total   numeric;
  v_nb      integer;
  v_entries jsonb;
  v_ltx     jsonb;
  v_tx_id   uuid;
begin
  select * into v_inv from public.supplier_invoices where id = p_invoice_id;
  if not found then
    raise exception 'validate_supplier_invoice: facture % introuvable', p_invoice_id using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_inv.copro_id) then
    raise exception 'forbidden: manager required for copro %', v_inv.copro_id using errcode = '42501';
  end if;

  if v_inv.doc_kind <> 'invoice' then
    raise exception 'validate_supplier_invoice: seules les factures (doc_kind=invoice) se valident ici (reçu %)', v_inv.doc_kind using errcode = '23514';
  end if;

  if v_inv.status = 'posted' and v_inv.ledger_tx_id is not null then
    return jsonb_build_object('success', true, 'invoice_id', v_inv.id, 'ledger_tx_id', v_inv.ledger_tx_id, 'already_posted', true);
  end if;
  if v_inv.status in ('paid', 'cancelled') then
    raise exception 'validate_supplier_invoice: statut terminal % (ni re-comptabilisation ni modification)', v_inv.status using errcode = '23514';
  end if;

  select coalesce(sum(amount), 0), count(*) into v_total, v_nb
  from public.supplier_invoice_lines where invoice_id = p_invoice_id;
  if v_nb = 0 then
    raise exception 'validate_supplier_invoice: brouillon sans ligne — ajouter au moins un poste de charge avant de comptabiliser' using errcode = '23514';
  end if;
  if v_total <= 0 then
    raise exception 'validate_supplier_invoice: total des lignes nul ou négatif (%)', v_total using errcode = '23514';
  end if;

  select id into v_acct401 from public.accounts where copro_id = v_inv.copro_id and code = '401';
  if v_acct401 is null then
    raise exception 'validate_supplier_invoice: compte 401 (Fournisseurs) introuvable pour la copro %', v_inv.copro_id using errcode = '23503';
  end if;

  -- D 6xx par ligne (AVEC operation_id relu de la ligne persistée) / C 401 (total).
  select jsonb_agg(jsonb_build_object(
    'account_id', sil.account_id, 'direction', 'debit', 'amount', sil.amount,
    'entry_label', coalesce(sil.label, v_inv.label),
    'operation_id', sil.operation_id
  )) into v_entries
  from public.supplier_invoice_lines sil where sil.invoice_id = p_invoice_id;

  v_entries := v_entries || jsonb_build_array(jsonb_build_object(
    'account_id', v_acct401, 'direction', 'credit', 'amount', v_total,
    'entry_label', 'Dette fournisseur : ' || v_inv.label
  ));

  v_ltx := public.create_ledger_transaction(
    v_inv.copro_id, v_inv.period_id, v_inv.invoice_date,
    'Facture fournisseur : ' || v_inv.label,
    'supplier_invoice', v_inv.id, v_entries, true
  );
  if not (v_ltx->>'success')::boolean then
    raise exception 'validate_supplier_invoice: échec écriture grand livre : %', v_ltx->>'error' using errcode = '23514';
  end if;
  v_tx_id := (v_ltx->>'tx_id')::uuid;

  update public.supplier_invoices
  set status = 'posted', ledger_tx_id = v_tx_id, total_amount = v_total
  where id = v_inv.id;

  return jsonb_build_object('success', true, 'invoice_id', v_inv.id, 'ledger_tx_id', v_tx_id, 'total_amount', v_total);
end;
$$;
revoke execute on function public.validate_supplier_invoice(uuid) from public, anon;
grant  execute on function public.validate_supplier_invoice(uuid) to authenticated, service_role;


-- ============================================================================================
-- 4. v_works_entries_unlinked — FILET : charges travaux postées ENCORE orphelines  [G-DEF-RO]
-- ============================================================================================
-- Une charge travaux (charge_nature='travaux', 6xx) postée SANS operation_id : à rattacher avant la
-- clôture de l'opération. Écritures TECHNIQUES exclues (#10) : à-nouveau (opening_balance/onboarding),
-- clôture, affectation du résultat, apurement travaux, contre-passation (od). security_invoker -> RLS.
-- RATTACHEMENT D'UN ORPHELIN POSTÉ : le GL est immuable -> on CONTRE-PASSE l'orpheline (0071) puis on
-- re-saisit la charge AVEC operation_id. La vue exclut donc les écritures DÉJÀ CONTRE-PASSÉES (sinon
-- l'orpheline d'origine, économiquement annulée, continuerait de bloquer la clôture).
create or replace view public.v_works_entries_unlinked
with (security_invoker = true) as
select
  e.id          as entry_id,
  e.tx_id       as tx_id,
  e.copro_id    as copro_id,
  e.period_id   as period_id,
  e.account_id  as account_id,
  a.code        as account_code,
  e.amount      as amount,
  e.entry_label as entry_label,
  t.tx_date     as tx_date,
  t.label       as tx_label
from public.ledger_entries e
join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
join public.accounts a            on a.id = e.account_id
where e.operation_id is null
  and a.charge_nature = 'travaux'
  -- à-nouveau / clôture / affectation / apurement = techniques (jamais une charge réelle).
  and t.source_type not in (
    'opening_balance', 'opening_onboarding', 'closing', 'result_allocation', 'works_settlement'
  )
  -- exclut UNIQUEMENT les OD d'EXTOURNE (pas une OD-charge réelle saisie à la main, qui DOIT être flaggée).
  and not (t.source_type = 'od' and (t.metadata->>'reversal_of') is not null)
  -- exclut l'orpheline d'origine une fois CONTRE-PASSÉE (économiquement annulée).
  and not exists (
    select 1 from public.ledger_transactions r
    where r.source_type = 'od' and (r.metadata->>'reversal_of') = t.id::text
  );

comment on view public.v_works_entries_unlinked is
  'Charges travaux (charge_nature=travaux) postees SANS operation_id (a rattacher avant cloture). Exclut les ecritures techniques (a-nouveau/cloture/affectation/apurement/contre-passation). security_invoker.';


-- ============================================================================================
-- 5. assert_no_unlinked_works_entries(p_copro_id, p_period_id) -> void  [G-MGR]
-- ============================================================================================
create or replace function public.assert_no_unlinked_works_entries(
  p_copro_id  uuid,
  p_period_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cnt integer;
begin
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: manager required for copro %', p_copro_id using errcode = '42501';
  end if;
  -- Lecture DIRECTE des tables (pas la vue security_invoker) : en DEFINER, passer par la vue
  -- soumettrait le COUNT à la RLS de l'appelant -> une garde de sécurité contournable. On reproduit
  -- ici la définition « orphelin travaux » de v_works_entries_unlinked.
  select count(*) into v_cnt
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a            on a.id = e.account_id
  where e.copro_id = p_copro_id
    and (p_period_id is null or e.period_id = p_period_id)
    and e.operation_id is null
    and a.charge_nature = 'travaux'
    and t.source_type not in ('opening_balance', 'opening_onboarding', 'closing', 'result_allocation', 'works_settlement')
    and not (t.source_type = 'od' and (t.metadata->>'reversal_of') is not null)
    and not exists (
      select 1 from public.ledger_transactions r
      where r.source_type = 'od' and (r.metadata->>'reversal_of') = t.id::text
    );
  if v_cnt > 0 then
    raise exception 'assert_no_unlinked_works_entries: % charge(s) travaux non rattachée(s) à une opération (copro %)', v_cnt, p_copro_id
      using errcode = '23514';
  end if;
end;
$$;
revoke execute on function public.assert_no_unlinked_works_entries(uuid, uuid) from public, anon;
grant execute on function public.assert_no_unlinked_works_entries(uuid, uuid) to authenticated, service_role;


-- ============================================================================================
-- 6. close_works_operation(p_copro_id, p_budget_id) -> jsonb  [G-MGR]  — GARDE DURE À LA CLÔTURE
-- ============================================================================================
-- Clôture une OPÉRATION = un budget travaux (status='closed'). GARDE DURE : refuse tant qu'il reste
-- une charge travaux ORPHELINE (operation_id NULL) dans la période du budget — point de contrôle dur
-- de E9 (la saisie, elle, reste non bloquante). Idempotent si déjà clôturé. Tient compte du verrou
-- période (un budget se clôture indépendamment du statut de période, mais la garde lit le GL posté).
create or replace function public.close_works_operation(
  p_copro_id  uuid,
  p_budget_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_budget record;
  v_cnt    integer;
begin
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: manager required for copro %', p_copro_id using errcode = '42501';
  end if;

  select * into v_budget from public.budgets where id = p_budget_id and copro_id = p_copro_id;
  if not found then
    raise exception 'close_works_operation: budget % introuvable pour la copro %', p_budget_id, p_copro_id using errcode = '23503';
  end if;
  if v_budget.budget_type <> 'works' then
    raise exception 'close_works_operation: seul un budget travaux se clôture comme opération (reçu %)', v_budget.budget_type using errcode = '23514';
  end if;
  if v_budget.status = 'rejected' then
    raise exception 'close_works_operation: un budget rejeté ne se clôture pas (statut %)', v_budget.status using errcode = '23514';
  end if;
  if v_budget.status = 'closed' then
    return jsonb_build_object('success', true, 'budget_id', p_budget_id, 'already_closed', true);
  end if;

  -- Garde dure : aucune charge travaux orpheline dans TOUTE la copro (les charges d'un chantier peuvent
  -- chevaucher des exercices ; scope copro-wide = jamais de perte silencieuse). Lecture DIRECTE des
  -- tables (pas la vue security_invoker) pour que la garde ne soit pas contournée par la RLS appelant.
  select count(*) into v_cnt
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a            on a.id = e.account_id
  where e.copro_id = p_copro_id
    and e.operation_id is null
    and a.charge_nature = 'travaux'
    and t.source_type not in ('opening_balance', 'opening_onboarding', 'closing', 'result_allocation', 'works_settlement')
    and not (t.source_type = 'od' and (t.metadata->>'reversal_of') is not null)
    and not exists (
      select 1 from public.ledger_transactions r
      where r.source_type = 'od' and (r.metadata->>'reversal_of') = t.id::text
    );
  if v_cnt > 0 then
    raise exception 'close_works_operation: % charge(s) travaux non rattachée(s) à une opération — rattacher avant de clôturer', v_cnt
      using errcode = '23514';
  end if;

  update public.budgets set status = 'closed' where id = p_budget_id;

  return jsonb_build_object('success', true, 'budget_id', p_budget_id, 'status', 'closed');
end;
$$;
revoke execute on function public.close_works_operation(uuid, uuid) from public, anon;
grant execute on function public.close_works_operation(uuid, uuid) to authenticated, service_role;

-- FIN 0073_e9_operation_id_writers.sql
