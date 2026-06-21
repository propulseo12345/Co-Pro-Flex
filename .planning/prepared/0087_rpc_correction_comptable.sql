-- ============================================================================================
-- 0087 (⚠️ PRÉPARÉ, NON APPLIQUÉ) — RPC d'annulation métier comptable
-- ============================================================================================
-- Issu du workflow design + revue adversariale du 2026-06-21 (verdict : corrections_mineures).
-- Immutabilité GL confirmée SOLIDE : ces RPC ne réécrivent JAMAIS le grand livre en place — elles
-- délèguent 100 % à reverse_ledger_transaction (0071) qui pose une écriture 'od' inverse.
--
-- ⚠️ NE PAS APPLIQUER TEL QUEL — 2 barrières à lever d'abord :
--   1) TESTS NON FAITS : dérouler le plan T0→T10 (voir 0087_NOTES.md) en BEGIN/ROLLBACK sur des
--      DONNÉES RÉELLES (paiements/factures postés). Le cloud est VIERGE (0 paiement posté au
--      2026-06-21) -> tests impossibles en l'état. À faire sur une copro seedée (boucle d'or
--      22222222) ou un scénario monté. La revue impose : "tant que T1/T4/T6/T7/T9 ne sont pas
--      verts en réel, l'enjeu GL impose de ne PAS appliquer".
--   2) ARBITRAGE MÉTIER (Lyes, expert copro) : reverse_payment d'un paiement dont l'APPEL est dans
--      une période APPROUVÉE mute amount_paid de cet appel clos (le GL reste intact via l'extourne
--      'od' dans la période ouverte ; call_for_funds_lines n'est pas le grand livre). Reco autonome
--      = AUTORISER (le relevé suit le réel encaissement). À CONFIRMER avant application.
--
-- Câblage front + plan de tests + risques résiduels : .planning/prepared/0087_NOTES.md

-- ============================================================================================
-- 1. unallocate_payment(p_payment_id) -> jsonb   [INTERNE — DEFINER, REVOKE authenticated (faille F-A)]
-- ============================================================================================
create or replace function public.unallocate_payment(
  p_payment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment record;
  v_deleted integer;
begin
  select * into v_payment
  from public.payments
  where id = p_payment_id
  for update;
  if not found then
    raise exception 'unallocate_payment: paiement % introuvable', p_payment_id
      using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_payment.copro_id) then
    raise exception 'forbidden: manager required for copro %', v_payment.copro_id
      using errcode = '42501';
  end if;

  delete from public.payment_allocations where payment_id = p_payment_id;
  get diagnostics v_deleted = row_count;

  return jsonb_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'allocations_removed', v_deleted
  );
end;
$$;
-- INTERNE : ni public, ni anon, NI authenticated (faille F-A : désimputerait sans contrôle de période).
revoke execute on function public.unallocate_payment(uuid) from public, anon, authenticated;
grant  execute on function public.unallocate_payment(uuid) to service_role;


-- ============================================================================================
-- 2. reverse_payment(p_payment_id, p_reason, p_reversal_date) -> jsonb   [G-MGR + G-SVC]
-- ============================================================================================
-- Contre-passe le GL D'ABORD (atomicité : si pas de période ouverte -> lève -> ROLLBACK, rien de
-- désimputé) PUIS désimpute (triggers redescendent amount_paid + statut) PUIS status='reversed'.
create or replace function public.reverse_payment(
  p_payment_id    uuid,
  p_reason        text,
  p_reversal_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment record;
  v_rev     jsonb;
begin
  select * into v_payment
  from public.payments
  where id = p_payment_id
  for update;
  if not found then
    raise exception 'reverse_payment: paiement % introuvable', p_payment_id
      using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_payment.copro_id) then
    raise exception 'forbidden: manager required for copro %', v_payment.copro_id
      using errcode = '42501';
  end if;

  if v_payment.status = 'reversed' then
    return jsonb_build_object('success', true, 'already', true, 'payment_id', p_payment_id, 'reversal_tx_id', null);
  end if;

  if v_payment.ledger_tx_id is null then
    raise exception 'reverse_payment: paiement % sans écriture GL (incohérent) — réversion impossible', p_payment_id
      using errcode = '23514';
  end if;

  v_rev := public.reverse_ledger_transaction(
    v_payment.ledger_tx_id,
    coalesce(p_reason, 'Annulation paiement copropriétaire'),
    p_reversal_date
  );

  perform public.unallocate_payment(p_payment_id);

  update public.payments set status = 'reversed' where id = p_payment_id;

  return jsonb_build_object(
    'success', true,
    'already', false,
    'payment_id', p_payment_id,
    'reversal_tx_id', v_rev->>'reversal_tx_id',
    'period_id', v_rev->>'period_id'
  );
end;
$$;
revoke execute on function public.reverse_payment(uuid, text, date) from public, anon;
grant  execute on function public.reverse_payment(uuid, text, date) to authenticated, service_role;


-- ============================================================================================
-- 3. cancel_supplier_invoice(p_invoice_id, p_reason) -> jsonb   [G-MGR + G-SVC]
-- ============================================================================================
-- Annule une FACTURE fournisseur POSTÉE et NON RÉGLÉE (saisie erronée/doublon). DISTINCT de l'avoir.
-- F-B : verrouille règlements + avoirs liés (FOR UPDATE) avant de recompter (anti-TOCTOU).
create or replace function public.cancel_supplier_invoice(
  p_invoice_id uuid,
  p_reason     text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv      record;
  v_paid     numeric;
  v_credited numeric;
  v_rev      jsonb;
begin
  select * into v_inv
  from public.supplier_invoices
  where id = p_invoice_id
  for update;
  if not found then
    raise exception 'cancel_supplier_invoice: facture % introuvable', p_invoice_id using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_inv.copro_id) then
    raise exception 'forbidden: manager required for copro %', v_inv.copro_id using errcode = '42501';
  end if;

  if v_inv.status = 'cancelled' then
    return jsonb_build_object('success', true, 'already', true, 'invoice_id', p_invoice_id, 'reversal_tx_id', null);
  end if;

  if v_inv.doc_kind = 'credit_note' then
    raise exception 'cancel_supplier_invoice: % est un avoir (credit_note) — annulation par cette voie interdite', p_invoice_id using errcode = '23514';
  end if;

  if v_inv.status = 'draft' then
    raise exception 'cancel_supplier_invoice: facture % en brouillon (aucune écriture) — annulation par contre-passation impossible', p_invoice_id using errcode = '23514';
  end if;

  perform 1 from public.supplier_payments sp where sp.supplier_invoice_id = p_invoice_id for update;

  v_paid := public.get_supplier_invoice_paid_amount(p_invoice_id);
  if v_inv.status = 'paid' or v_paid > 0 then
    raise exception 'cancel_supplier_invoice: facture % réglée (% € payés) — annulez d''abord le règlement', p_invoice_id, v_paid using errcode = '23514';
  end if;

  perform 1 from public.supplier_invoices cn
    where cn.original_invoice_id = p_invoice_id and cn.doc_kind = 'credit_note' for update;

  select coalesce(sum(cn.total_amount), 0) into v_credited
  from public.supplier_invoices cn
  where cn.original_invoice_id = p_invoice_id and cn.doc_kind = 'credit_note' and cn.status = 'posted';
  if v_credited > 0 then
    raise exception 'cancel_supplier_invoice: facture % a des avoirs postés liés (% €) — traitez-les d''abord', p_invoice_id, v_credited using errcode = '23514';
  end if;

  if v_inv.ledger_tx_id is null then
    raise exception 'cancel_supplier_invoice: facture % postée sans écriture (incohérent)', p_invoice_id using errcode = '23514';
  end if;

  v_rev := public.reverse_ledger_transaction(v_inv.ledger_tx_id, coalesce(p_reason, 'Annulation facture fournisseur'), null);

  update public.supplier_invoices set status = 'cancelled' where id = p_invoice_id;

  return jsonb_build_object(
    'success', true, 'already', false, 'invoice_id', p_invoice_id,
    'reversal_tx_id', v_rev->>'reversal_tx_id', 'period_id', v_rev->>'period_id'
  );
end;
$$;
revoke execute on function public.cancel_supplier_invoice(uuid, text) from public, anon;
grant  execute on function public.cancel_supplier_invoice(uuid, text) to authenticated, service_role;

-- FIN 0087 (PRÉPARÉ — NON APPLIQUÉ)
