-- 0046_validate_supplier_invoice.sql — VALIDATION D'UN BROUILLON DE FACTURE FOURNISSEUR (J2.8)
-- ============================================================================================
-- Comble le trou découvert à J0.3 (confirmé audit 2026-06-10) : la « validation » d'un brouillon
-- côté front (draft -> posted) faisait un UPDATE de statut NU, sans écriture comptable. Or la compta
-- de copropriété est en partie double : valider une facture DOIT créer l'écriture D 6xx / C 401.
--
-- `post_supplier_invoice` (0026) poste D6xx/C401 mais UNIQUEMENT à la création (p_post_immediately).
-- Cette RPC est son miroir sur un brouillon DÉJÀ enregistré + ses lignes persistées.
--
-- Règles : gardée gestionnaire (copro dérivée de la facture) · idempotente (re-valider une facture
-- déjà postée = no-op) · refuse un brouillon SANS ligne (rien à imputer en D6xx) · recalcule le total
-- depuis les lignes (le total d'en-tête d'un brouillon est une estimation ; vérité = Σ lignes →
-- garantit l'écriture équilibrée) · réservée aux factures (les avoirs passent par
-- post_supplier_credit_note).
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

  -- Idempotence : déjà comptabilisée -> no-op (pas de double écriture).
  if v_inv.status = 'posted' and v_inv.ledger_tx_id is not null then
    return jsonb_build_object('success', true, 'invoice_id', v_inv.id, 'ledger_tx_id', v_inv.ledger_tx_id, 'already_posted', true);
  end if;
  if v_inv.status in ('paid', 'cancelled') then
    raise exception 'validate_supplier_invoice: statut terminal % (ni re-comptabilisation ni modification)', v_inv.status using errcode = '23514';
  end if;

  -- Total recalculé depuis les lignes + refus brouillon sans ligne.
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

  -- D 6xx par ligne / C 401 (total).
  select jsonb_agg(jsonb_build_object(
    'account_id', sil.account_id, 'direction', 'debit', 'amount', sil.amount,
    'entry_label', coalesce(sil.label, v_inv.label)
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

comment on function public.validate_supplier_invoice(uuid) is
  'Comptabilise un brouillon de facture fournisseur (draft->posted) : D6xx par ligne / C401 total. Gardée gestionnaire, idempotente, refuse un brouillon sans ligne. J2.8.';
