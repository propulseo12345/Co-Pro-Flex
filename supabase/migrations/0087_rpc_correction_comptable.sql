-- 0087_rpc_correction_comptable.sql — RPC d'annulation métier comptable (audit fondations 2026-06-21)
-- ============================================================================================
-- APPLIQUÉ sur le live le 2026-06-21. reverse_payment PROUVÉE en BEGIN/ROLLBACK sur une copro
-- seedée (create_test_copro_seeded) — test T1 : status=reversed, allocations=0,
-- v_lot_vs_gl_mismatch 0->0 (PAS de créance fantôme), extourne 'od'=1 ; grants F-A vérifiés
-- (unallocate_payment inaccessible à authenticated).
--
-- Délègue à reverse_ledger_transaction (0071) -> immutabilité GL préservée (jamais de réécriture
-- en place, seulement une écriture 'od' inverse). Revue adversariale (workflow) : verdict
-- corrections_mineures, 3 corrections intégrées (F-A scope, F-B TOCTOU, F-C avoir).
--
-- NB / à finir (cf .planning/prepared/0087_NOTES.md) :
--   - cancel_supplier_invoice : appliquée + grants OK, NON testée fonctionnellement (0 facture
--     postée dans le seed) -> dérouler T6-T9 quand des factures existeront.
--   - Câblage front (gate canReverseSelected + routage par source_type) NON fait.
--   - Arbitrage métier (reco AUTORISER) : reverse_payment sur un appel en période APPROUVÉE
--     mute amount_paid de cet appel clos (GL préservé). À confirmer.

-- 1. unallocate_payment — INTERNE (F-A : REVOKE authenticated). DELETE des allocations -> les
--    triggers redescendent call_for_funds_lines.amount_paid + statut.
create or replace function public.unallocate_payment(p_payment_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_payment record; v_deleted integer;
begin
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then raise exception 'unallocate_payment: paiement % introuvable', p_payment_id using errcode='23503'; end if;
  if not public.is_service_call() and not public.user_is_copro_manager(v_payment.copro_id) then
    raise exception 'forbidden: manager required for copro %', v_payment.copro_id using errcode='42501'; end if;
  delete from public.payment_allocations where payment_id = p_payment_id;
  get diagnostics v_deleted = row_count;
  return jsonb_build_object('success', true, 'payment_id', p_payment_id, 'allocations_removed', v_deleted);
end; $$;
revoke execute on function public.unallocate_payment(uuid) from public, anon, authenticated;
grant  execute on function public.unallocate_payment(uuid) to service_role;

-- 2. reverse_payment — contre-passe le GL (extourne) D'ABORD (atomicité), puis désimpute, puis status='reversed'.
create or replace function public.reverse_payment(p_payment_id uuid, p_reason text, p_reversal_date date default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_payment record; v_rev jsonb;
begin
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then raise exception 'reverse_payment: paiement % introuvable', p_payment_id using errcode='23503'; end if;
  if not public.is_service_call() and not public.user_is_copro_manager(v_payment.copro_id) then
    raise exception 'forbidden: manager required for copro %', v_payment.copro_id using errcode='42501'; end if;
  if v_payment.status = 'reversed' then
    return jsonb_build_object('success', true, 'already', true, 'payment_id', p_payment_id, 'reversal_tx_id', null); end if;
  if v_payment.ledger_tx_id is null then
    raise exception 'reverse_payment: paiement % sans ecriture GL (incoherent)', p_payment_id using errcode='23514'; end if;
  v_rev := public.reverse_ledger_transaction(v_payment.ledger_tx_id, coalesce(p_reason, 'Annulation paiement copropriétaire'), p_reversal_date);
  perform public.unallocate_payment(p_payment_id);
  update public.payments set status = 'reversed' where id = p_payment_id;
  return jsonb_build_object('success', true, 'already', false, 'payment_id', p_payment_id,
    'reversal_tx_id', v_rev->>'reversal_tx_id', 'period_id', v_rev->>'period_id');
end; $$;
revoke execute on function public.reverse_payment(uuid, text, date) from public, anon;
grant  execute on function public.reverse_payment(uuid, text, date) to authenticated, service_role;

-- 3. cancel_supplier_invoice — facture postée non réglée. F-B : FOR UPDATE règlements + avoirs liés.
create or replace function public.cancel_supplier_invoice(p_invoice_id uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_inv record; v_paid numeric; v_credited numeric; v_rev jsonb;
begin
  select * into v_inv from public.supplier_invoices where id = p_invoice_id for update;
  if not found then raise exception 'cancel_supplier_invoice: facture % introuvable', p_invoice_id using errcode='23503'; end if;
  if not public.is_service_call() and not public.user_is_copro_manager(v_inv.copro_id) then
    raise exception 'forbidden: manager required for copro %', v_inv.copro_id using errcode='42501'; end if;
  if v_inv.status = 'cancelled' then
    return jsonb_build_object('success', true, 'already', true, 'invoice_id', p_invoice_id, 'reversal_tx_id', null); end if;
  if v_inv.doc_kind = 'credit_note' then
    raise exception 'cancel_supplier_invoice: % est un avoir (credit_note) — interdit par cette voie', p_invoice_id using errcode='23514'; end if;
  if v_inv.status = 'draft' then
    raise exception 'cancel_supplier_invoice: facture % en brouillon (aucune ecriture)', p_invoice_id using errcode='23514'; end if;
  perform 1 from public.supplier_payments sp where sp.supplier_invoice_id = p_invoice_id for update;
  v_paid := public.get_supplier_invoice_paid_amount(p_invoice_id);
  if v_inv.status = 'paid' or v_paid > 0 then
    raise exception 'cancel_supplier_invoice: facture % reglee (% payes) — annulez d''abord le reglement', p_invoice_id, v_paid using errcode='23514'; end if;
  perform 1 from public.supplier_invoices cn where cn.original_invoice_id = p_invoice_id and cn.doc_kind = 'credit_note' for update;
  select coalesce(sum(cn.total_amount), 0) into v_credited from public.supplier_invoices cn
    where cn.original_invoice_id = p_invoice_id and cn.doc_kind = 'credit_note' and cn.status = 'posted';
  if v_credited > 0 then
    raise exception 'cancel_supplier_invoice: facture % a des avoirs postes lies (%) — traitez-les d''abord', p_invoice_id, v_credited using errcode='23514'; end if;
  if v_inv.ledger_tx_id is null then
    raise exception 'cancel_supplier_invoice: facture % postee sans ecriture (incoherent)', p_invoice_id using errcode='23514'; end if;
  v_rev := public.reverse_ledger_transaction(v_inv.ledger_tx_id, coalesce(p_reason, 'Annulation facture fournisseur'), null);
  update public.supplier_invoices set status = 'cancelled' where id = p_invoice_id;
  return jsonb_build_object('success', true, 'already', false, 'invoice_id', p_invoice_id,
    'reversal_tx_id', v_rev->>'reversal_tx_id', 'period_id', v_rev->>'period_id');
end; $$;
revoke execute on function public.cancel_supplier_invoice(uuid, text) from public, anon;
grant  execute on function public.cancel_supplier_invoice(uuid, text) to authenticated, service_role;

-- FIN 0087_rpc_correction_comptable.sql
