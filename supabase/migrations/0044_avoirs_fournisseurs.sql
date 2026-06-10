-- 0044_avoirs_fournisseurs.sql — AVOIRS FOURNISSEURS (notes de crédit) · TYPE DÉDIÉ
-- ============================================================================================
-- Décision G5 (DECISIONS.md) + SPEC_AVOIRS_FOURNISSEURS.md, validée par Lyes (expert copro, 2026-06-10).
--
-- MODÈLE : un avoir = entité dédiée sur supplier_invoices (discriminant doc_kind='credit_note'),
--   total_amount POSITIF (le CHECK > 0 reste), lien NULLABLE vers la facture d'origine.
-- ÉCRITURE : miroir de la facture (D6xx/C401) → l'avoir poste C 6xx (la charge diminue) / D 401
--   (la dette fournisseur diminue), sur la MÊME nature/clé que les lignes reprises (Q1).
-- DÉPASSEMENT autorisé (Q2) : aucun plafond — un avoir > solde rend le 401 débiteur (créance).
-- PARTIELS + MULTIPLES (Q3) : 1 facture → N avoirs ; remaining_to_pay déduit les avoirs postés.
--
-- Ce fichier : 1 enum + 2 colonnes + 1 RPC + recréation de v_supplier_invoices_overview. Aucune table.
-- Conventions 0026 : SECURITY DEFINER, set search_path=public, garde G-MGR, un seul %, deny-by-default.

-- ── 1. Enums ─────────────────────────────────────────────────────────────────────────────────
-- Discriminant facture/avoir.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'supplier_doc_kind') then
    create type public.supplier_doc_kind as enum ('invoice', 'credit_note');
  end if;
end $$;

-- Nouveau type de source d'écriture pour l'avoir (l'enum ledger_source_type ne le connaît pas).
-- ADD VALUE n'est pas consommé pendant la migration (corps de fonction = texte) -> sûr.
alter type public.ledger_source_type add value if not exists 'supplier_credit_note';

-- ── 2. Colonnes sur supplier_invoices ───────────────────────────────────────────────────────
alter table public.supplier_invoices
  add column if not exists doc_kind public.supplier_doc_kind not null default 'invoice',
  add column if not exists original_invoice_id uuid references public.supplier_invoices(id);

create index if not exists ix_supplier_invoices_original
  on public.supplier_invoices(original_invoice_id)
  where original_invoice_id is not null;

comment on column public.supplier_invoices.doc_kind is 'invoice (facture) | credit_note (avoir). Un avoir poste l''écriture INVERSE (C6xx/D401).';
comment on column public.supplier_invoices.original_invoice_id is 'Avoir : facture d''origine (nullable — ristourne globale sans lien). Une facture → N avoirs.';

-- ── 3. RPC post_supplier_credit_note (G-MGR) — AVOIR FOURNISSEUR ─────────────────────────────
-- Saisit + comptabilise un avoir : montant POSITIF, écriture C 6xx (par ligne) / D 401 (total).
--   Ventilation = p_lines (avoir partiel/explicite) OU copie des lignes de p_original_invoice_id
--   (avoir total). Posté immédiatement (status='posted'). L'avoir frappe la période fournie (ouverte).
create or replace function public.post_supplier_credit_note(
  p_copro_id            uuid,
  p_period_id           uuid,
  p_tiers_id            uuid,
  p_invoice_number      text,
  p_invoice_date        date,
  p_label               text,
  p_lines               jsonb   default null,
  p_original_invoice_id uuid    default null,
  p_document_id         uuid    default null,
  p_montant_ht          numeric default null,
  p_montant_tva         numeric default null,
  p_taux_tva            numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lines   jsonb;
  v_total   numeric;
  v_acct401 uuid;
  v_cn_id   uuid;
  v_entries jsonb;
  v_ltx     jsonb;
  v_tx_id   uuid;
  v_orig    record;
begin
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: manager required for copro %', p_copro_id using errcode = '42501';
  end if;

  -- Lien facture d'origine (si fourni) : doit être une VRAIE facture (pas un avoir) de la même copro.
  if p_original_invoice_id is not null then
    select id, copro_id, doc_kind into v_orig
    from public.supplier_invoices where id = p_original_invoice_id;
    if v_orig.id is null then
      raise exception 'post_supplier_credit_note: facture d''origine % introuvable', p_original_invoice_id using errcode = '23503';
    end if;
    if v_orig.copro_id <> p_copro_id or v_orig.doc_kind <> 'invoice' then
      raise exception 'post_supplier_credit_note: la facture d''origine doit être une facture (pas un avoir) de la copro %', p_copro_id using errcode = '23514';
    end if;
  end if;

  -- Source de ventilation : lignes explicites (partiel) OU copie de la facture d'origine (total).
  if p_lines is not null and jsonb_array_length(p_lines) > 0 then
    v_lines := p_lines;
  elsif p_original_invoice_id is not null then
    select jsonb_agg(jsonb_build_object(
             'account_id', sil.account_id, 'label', sil.label, 'amount', sil.amount,
             'repartition_key_id', sil.repartition_key_id, 'budget_line_id', sil.budget_line_id,
             'amount_ht', sil.amount_ht, 'amount_tva', sil.amount_tva, 'taux_pct', sil.taux_pct))
      into v_lines
    from public.supplier_invoice_lines sil
    where sil.invoice_id = p_original_invoice_id;
  end if;

  if v_lines is null or jsonb_array_length(v_lines) = 0 then
    raise exception 'post_supplier_credit_note: aucune ligne (fournir p_lines ou p_original_invoice_id)' using errcode = '23514';
  end if;

  select coalesce(sum((l->>'amount')::numeric), 0) into v_total
  from jsonb_array_elements(v_lines) l;
  if v_total <= 0 then
    raise exception 'post_supplier_credit_note: le montant de l''avoir doit être positif (reçu %)', v_total using errcode = '23514';
  end if;

  select id into v_acct401 from public.accounts where copro_id = p_copro_id and code = '401';
  if v_acct401 is null then
    raise exception 'post_supplier_credit_note: compte 401 (Fournisseurs) introuvable pour la copro %', p_copro_id using errcode = '23503';
  end if;

  -- En-tête : avoir POSTÉ, montant POSITIF, doc_kind credit_note.
  insert into public.supplier_invoices (
    copro_id, period_id, tiers_id, invoice_number, invoice_date, due_date, label,
    total_amount, status, doc_kind, original_invoice_id, document_id, montant_ht, montant_tva, taux_tva
  ) values (
    p_copro_id, p_period_id, p_tiers_id, p_invoice_number, p_invoice_date, null, p_label,
    v_total, 'posted', 'credit_note', p_original_invoice_id, p_document_id, p_montant_ht, p_montant_tva, p_taux_tva
  )
  returning id into v_cn_id;

  insert into public.supplier_invoice_lines (
    copro_id, invoice_id, account_id, label, amount, repartition_key_id, budget_line_id, amount_ht, amount_tva, taux_pct
  )
  select
    p_copro_id, v_cn_id, (l->>'account_id')::uuid, l->>'label', (l->>'amount')::numeric,
    nullif(l->>'repartition_key_id','')::uuid, nullif(l->>'budget_line_id','')::uuid,
    nullif(l->>'amount_ht','')::numeric, nullif(l->>'amount_tva','')::numeric, nullif(l->>'taux_pct','')::numeric
  from jsonb_array_elements(v_lines) l;

  -- Écriture GL INVERSE de la facture : C 6xx (par ligne, la charge diminue) / D 401 (la dette diminue).
  select jsonb_agg(jsonb_build_object(
           'account_id', (l->>'account_id')::uuid, 'direction', 'credit',
           'amount', (l->>'amount')::numeric, 'entry_label', coalesce(l->>'label', p_label)))
    into v_entries
  from jsonb_array_elements(v_lines) l;

  v_entries := v_entries || jsonb_build_array(jsonb_build_object(
    'account_id', v_acct401, 'direction', 'debit', 'amount', v_total,
    'entry_label', 'Avoir fournisseur : ' || p_label));

  v_ltx := public.create_ledger_transaction(
    p_copro_id, p_period_id, p_invoice_date, 'Avoir fournisseur : ' || p_label,
    'supplier_credit_note', v_cn_id, v_entries, true);
  if not (v_ltx->>'success')::boolean then
    raise exception 'post_supplier_credit_note: échec écriture grand livre : %', v_ltx->>'error' using errcode = '23514';
  end if;
  v_tx_id := (v_ltx->>'tx_id')::uuid;
  update public.supplier_invoices set ledger_tx_id = v_tx_id where id = v_cn_id;

  return jsonb_build_object(
    'success', true, 'credit_note_id', v_cn_id, 'ledger_tx_id', v_tx_id, 'total_amount', v_total);
end;
$$;
revoke execute on function public.post_supplier_credit_note(uuid, uuid, uuid, text, date, text, jsonb, uuid, uuid, numeric, numeric, numeric) from public, anon;
grant  execute on function public.post_supplier_credit_note(uuid, uuid, uuid, text, date, text, jsonb, uuid, uuid, numeric, numeric, numeric) to authenticated, service_role;

-- ── 4. Vue : remaining_to_pay NET des avoirs + doc_kind / original_invoice_id / credited_amount ──
-- remaining_to_pay (facture) = total − Σ paiements − Σ avoirs postés liés. Un avoir lui-même = 0
--   (il n'est pas « à payer », il réduit). Sous-requêtes scalaires (pas de produit cartésien).
create or replace view public.v_supplier_invoices_overview
with (security_invoker = true) as
-- ORDRE DES COLONNES EXISTANTES PRÉSERVÉ (CREATE OR REPLACE n'autorise que l'AJOUT en fin) ;
-- les 3 nouvelles colonnes (doc_kind, original_invoice_id, credited_amount) sont appendées.
select
  si.id,
  si.copro_id,
  si.period_id,
  si.tiers_id,
  t.name                                          as supplier_name,
  si.invoice_number,
  si.invoice_date,
  si.due_date,
  si.label,
  si.total_amount,
  si.status,
  si.ledger_tx_id,
  si.document_id,
  si.created_at,
  coalesce((select sum(sp.amount) from public.supplier_payments sp where sp.supplier_invoice_id = si.id), 0) as total_paid,
  case when si.doc_kind = 'credit_note' then 0
       else si.total_amount
            - coalesce((select sum(sp.amount) from public.supplier_payments sp where sp.supplier_invoice_id = si.id), 0)
            - coalesce((select sum(cn.total_amount) from public.supplier_invoices cn
                        where cn.original_invoice_id = si.id and cn.doc_kind = 'credit_note' and cn.status = 'posted'), 0)
  end as remaining_to_pay,
  coalesce((select count(*)       from public.supplier_payments sp where sp.supplier_invoice_id = si.id), 0) as payments_count,
  -- nouvelles colonnes (en fin) :
  si.doc_kind,
  si.original_invoice_id,
  -- credited_amount : NULL pour un avoir (pas de sens), montant crédité pour une facture.
  case when si.doc_kind = 'credit_note' then null
       else coalesce((select sum(cn.total_amount) from public.supplier_invoices cn
                      where cn.original_invoice_id = si.id and cn.doc_kind = 'credit_note' and cn.status = 'posted'), 0)
  end as credited_amount
from public.supplier_invoices si
join public.tiers t on t.id = si.tiers_id;

comment on view public.v_supplier_invoices_overview is 'Factures + avoirs fournisseurs. remaining_to_pay nette les avoirs postes lies ; doc_kind distingue facture/avoir ; credited_amount = somme des avoirs lies (NULL pour un avoir).';

-- ── 5. Paiement fournisseur AVOIR-AWARE (corrige B1 + B3 de la revue) ────────────────────────
-- B1 : on ne paie PAS un avoir (doc_kind='credit_note'). B3 : le « net à payer » d'une facture =
--   total − Σ avoirs postés liés → le seuil 'paid' et le plafond de sur-paiement raisonnent NET,
--   sinon une facture partiellement créditée ne passe jamais 'paid'. Rétro-compatible (0 avoir → net = total).

create or replace function public.supplier_invoice_net_payable(p_invoice_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select si.total_amount
       - coalesce((select sum(cn.total_amount) from public.supplier_invoices cn
                   where cn.original_invoice_id = si.id and cn.doc_kind = 'credit_note' and cn.status = 'posted'), 0)
  from public.supplier_invoices si where si.id = p_invoice_id;
$$;
revoke execute on function public.supplier_invoice_net_payable(uuid) from public, anon;
grant  execute on function public.supplier_invoice_net_payable(uuid) to authenticated, service_role;

-- Recréation de la fonction trigger (le trigger trg_validate_supplier_payment reste lié — pas recréé) :
-- + garde « avoir non payable » + plafond de sur-paiement sur le NET.
create or replace function public.tr_validate_supplier_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice      record;
  v_already_paid numeric(14,2);
  v_new_total    numeric(14,2);
  v_net          numeric(14,2);
  v_tolerance    numeric := 0.01;
begin
  select id, copro_id, total_amount, status, doc_kind into v_invoice
  from public.supplier_invoices where id = new.supplier_invoice_id;
  if v_invoice.id is null then
    raise exception 'tr_validate_supplier_payment: facture % introuvable', new.supplier_invoice_id
      using errcode = '23503';
  end if;

  -- B1 : un avoir (note de crédit) ne se règle pas comme une facture.
  if v_invoice.doc_kind = 'credit_note' then
    raise exception 'tr_validate_supplier_payment: un avoir ne se paie pas (%)', new.supplier_invoice_id
      using errcode = '23514';
  end if;

  if new.amount <= 0 then
    raise exception 'tr_validate_supplier_payment: montant doit être positif (reçu %)', new.amount
      using errcode = '23514';
  end if;

  if v_invoice.status = 'draft' then
    raise exception 'tr_validate_supplier_payment: impossible de payer une facture en brouillon (%)', new.supplier_invoice_id
      using errcode = '23514';
  end if;
  if v_invoice.status = 'cancelled' then
    raise exception 'tr_validate_supplier_payment: impossible de payer une facture annulée (%)', new.supplier_invoice_id
      using errcode = '23514';
  end if;

  if tg_op = 'INSERT' then
    select coalesce(sum(amount), 0) into v_already_paid
    from public.supplier_payments where supplier_invoice_id = new.supplier_invoice_id;
  else
    select coalesce(sum(amount), 0) - old.amount into v_already_paid
    from public.supplier_payments where supplier_invoice_id = new.supplier_invoice_id;
  end if;

  -- B3 : sur-paiement jugé sur le NET (total − avoirs), pas sur le brut.
  v_net := public.supplier_invoice_net_payable(new.supplier_invoice_id);
  v_new_total := v_already_paid + new.amount;
  if v_new_total > v_net + v_tolerance then
    raise exception 'tr_validate_supplier_payment: sur-paiement (paie % alors que le net à payer vaut %, déjà payé %)', new.amount, v_net, v_already_paid
      using errcode = '23514';
  end if;

  if new.copro_id is null then
    new.copro_id := v_invoice.copro_id;
  elsif new.copro_id <> v_invoice.copro_id then
    raise exception 'tr_validate_supplier_payment: copro_id incohérent (% != %)', new.copro_id, v_invoice.copro_id
      using errcode = '23514';
  end if;

  return new;
end;
$$;

-- Recréation : statut 'paid' atteint quand Σ paiements >= NET (total − avoirs).
create or replace function public.tr_update_supplier_invoice_status_after_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_id uuid;
  v_invoice    record;
  v_total_paid numeric(14,2);
  v_net        numeric(14,2);
  v_tolerance  numeric := 0.01;
begin
  if tg_op = 'DELETE' then
    v_invoice_id := old.supplier_invoice_id;
  else
    v_invoice_id := new.supplier_invoice_id;
  end if;

  select * into v_invoice from public.supplier_invoices where id = v_invoice_id;
  if not found or v_invoice.status in ('draft', 'cancelled') then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  v_total_paid := public.get_supplier_invoice_paid_amount(v_invoice_id);
  v_net        := public.supplier_invoice_net_payable(v_invoice_id);

  if v_total_paid >= v_net - v_tolerance then
    update public.supplier_invoices set status = 'paid'
    where id = v_invoice_id and status <> 'paid';
  elsif v_invoice.status = 'paid' then
    update public.supplier_invoices set status = 'posted'
    where id = v_invoice_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- DETTE NOTÉE (mineure) : post_supplier_payment (0026) renvoie un champ `invoice_status` calculé sur le
--   brut ; le STATUT RÉEL en base est désormais correct (trigger ci-dessus, net). Le front lit le statut
--   via la vue → pas d'impact fonctionnel. À resynchroniser au prochain passage sur 0026.

-- FIN 0044_avoirs_fournisseurs.sql
