-- 0078_f8_supplier_advance_409.sql — F8 Brique 3 : acompte fournisseur (409)
-- ============================================================================================
-- Source : .planning/PLAN_J5_2026-06-15.md T6 Brique 3 + arbitrage §5 #22 (RPC SÉPARÉE + table
--   supplier_advances ; NE PAS étendre post_supplier_payment qui casse 3 invariants : exige facture
--   posted, trigger plafond net, base de calcul paid_amount).
--
-- BUT : verser un ACOMPTE à un fournisseur AVANT toute facture (D 409 fournisseur débiteur / C 512
--   banque), puis l'APURER à la réception de la facture (D 401 / C 409, plafonné au net à payer).
--
-- VÉRIF « table similaire » (instruction Lyes) : supplier_payments exige une FK facture (NOT NULL) ->
--   inutilisable pour un acompte SANS facture ; treasury_advances = avances de trésorerie COPRO (art.35),
--   pas fournisseur. -> table supplier_advances NEUVE justifiée (porte le solde + l'idempotency_key).
--
-- source_type GL = 'supplier_payment' (mouvement de trésorerie vers un fournisseur ; pas de nouvelle
--   valeur d'enum). Idempotence portée par supplier_advances.idempotency_key.

-- ============================================================================================
-- 1. Table supplier_advances
-- ============================================================================================
create table public.supplier_advances (
  id               uuid           not null default gen_random_uuid(),
  copro_id         uuid           not null references public.copros(id) on delete restrict,
  period_id        uuid           not null references public.accounting_periods(id) on delete restrict,
  supplier_id      uuid           not null references public.tiers(id) on delete restrict,
  amount           numeric(14,2)  not null,
  remaining_amount numeric(14,2)  not null,
  ledger_tx_id     uuid           references public.ledger_transactions(id) on delete restrict,
  idempotency_key  text,
  created_at       timestamptz    not null default now(),
  constraint pk_supplier_advances     primary key (id),
  constraint ck_sadv_amount           check (amount > 0),
  constraint ck_sadv_remaining        check (remaining_amount >= 0 and remaining_amount <= amount)
);
create index idx_sadv_copro_supplier on public.supplier_advances (copro_id, supplier_id);
create unique index uq_sadv_idempotent
  on public.supplier_advances (copro_id, idempotency_key) where idempotency_key is not null;

comment on table public.supplier_advances is
  'Acompte fournisseur (409) verse AVANT facture : D409/C512 a la creation, D401/C409 a l apurement. remaining_amount = solde non encore apure. Idempotence par (copro_id, idempotency_key).';


-- ============================================================================================
-- 2. post_supplier_advance(...) -> jsonb   [G-MGR]   — D 409 / C 512
-- ============================================================================================
create or replace function public.post_supplier_advance(
  p_copro_id        uuid,
  p_period_id       uuid,
  p_supplier_id     uuid,
  p_amount          numeric,
  p_date            date,
  p_method          text default 'transfer',
  p_reference       text default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a409 uuid; v_a512 uuid; v_adv_id uuid; v_existing uuid; v_ltx jsonb; v_tx uuid;
begin
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: manager required for copro %', p_copro_id using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'post_supplier_advance: montant doit être positif (reçu %)', p_amount using errcode = '23514';
  end if;
  if not exists (select 1 from public.tiers where id = p_supplier_id and copro_id = p_copro_id) then
    raise exception 'post_supplier_advance: fournisseur % hors copro %', p_supplier_id, p_copro_id using errcode = '23503';
  end if;

  -- Idempotence : clé déjà utilisée -> on renvoie l'acompte existant sans rejouer.
  if p_idempotency_key is not null then
    select id, ledger_tx_id into v_existing, v_tx from public.supplier_advances
      where copro_id = p_copro_id and idempotency_key = p_idempotency_key;
    if v_existing is not null then
      return jsonb_build_object('success', true, 'advance_id', v_existing, 'ledger_tx_id', v_tx, 'idempotent_replay', true);
    end if;
  end if;

  select id into v_a409 from public.accounts where copro_id = p_copro_id and code = '409';
  select id into v_a512 from public.accounts where copro_id = p_copro_id and code = '512';
  if v_a409 is null or v_a512 is null then
    raise exception 'post_supplier_advance: compte 409/512 introuvable pour la copro %', p_copro_id using errcode = '23503';
  end if;

  -- ANTI-TOCTOU : on RÉSERVE d'abord la ligne (ON CONFLICT idempotent) AVANT de poster le GL. Si la clé
  -- est déjà prise (conflit), aucune écriture GL n'est créée -> pas d'écriture orpheline ; on renvoie le replay.
  insert into public.supplier_advances (copro_id, period_id, supplier_id, amount, remaining_amount, idempotency_key)
  values (p_copro_id, p_period_id, p_supplier_id, p_amount, p_amount, p_idempotency_key)
  on conflict (copro_id, idempotency_key) where idempotency_key is not null do nothing
  returning id into v_adv_id;

  if v_adv_id is null then
    select id, ledger_tx_id into v_existing, v_tx from public.supplier_advances
      where copro_id = p_copro_id and idempotency_key = p_idempotency_key;
    return jsonb_build_object('success', true, 'advance_id', v_existing, 'ledger_tx_id', v_tx, 'idempotent_replay', true);
  end if;

  -- Écriture GL D409/C512 puis liaison à la ligne réservée.
  v_ltx := public.create_ledger_transaction(
    p_copro_id, p_period_id, p_date,
    'Acompte fournisseur' || coalesce(' (' || p_reference || ')', ''),
    'supplier_payment', null,
    jsonb_build_array(
      jsonb_build_object('account_id', v_a409, 'direction', 'debit',  'amount', p_amount, 'entry_label', 'Acompte fournisseur'),
      jsonb_build_object('account_id', v_a512, 'direction', 'credit', 'amount', p_amount, 'entry_label', 'Décaissement acompte')
    ), true);
  if not (v_ltx->>'success')::boolean then
    raise exception 'post_supplier_advance: échec écriture grand livre : %', v_ltx->>'error' using errcode = '23514';
  end if;
  v_tx := (v_ltx->>'tx_id')::uuid;

  update public.supplier_advances set ledger_tx_id = v_tx where id = v_adv_id;

  return jsonb_build_object('success', true, 'advance_id', v_adv_id, 'ledger_tx_id', v_tx, 'remaining', p_amount);
end;
$$;
revoke execute on function public.post_supplier_advance(uuid, uuid, uuid, numeric, date, text, text, text) from public, anon;
grant execute on function public.post_supplier_advance(uuid, uuid, uuid, numeric, date, text, text, text) to authenticated, service_role;


-- ============================================================================================
-- 3. settle_supplier_advance_on_invoice(...) -> jsonb   [G-MGR]   — D 401 / C 409 (plafonné)
-- ============================================================================================
-- Apure tout ou partie d'un acompte contre une facture POSTÉE : montant = min(reste acompte, net à payer
-- = total facture − règlements déjà passés). Réduit remaining_amount. RPC SÉPARÉE (n'étend pas
-- post_supplier_payment). p_amount optionnel = plafond demandé.
create or replace function public.settle_supplier_advance_on_invoice(
  p_copro_id    uuid,
  p_advance_id  uuid,
  p_invoice_id  uuid,
  p_date        date,
  p_amount      numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_adv     public.supplier_advances%rowtype;
  v_inv     public.supplier_invoices%rowtype;
  v_net     numeric;
  v_settle  numeric;
  v_a401 uuid; v_a409 uuid; v_ltx jsonb; v_tx uuid;
begin
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: manager required for copro %', p_copro_id using errcode = '42501';
  end if;

  -- FOR UPDATE : verrouille l'acompte -> deux apurements concurrents se sérialisent (pas de remaining négatif).
  select * into v_adv from public.supplier_advances where id = p_advance_id and copro_id = p_copro_id for update;
  if v_adv.id is null then
    raise exception 'settle_supplier_advance_on_invoice: acompte % introuvable (copro %)', p_advance_id, p_copro_id using errcode = '23503';
  end if;
  if v_adv.remaining_amount <= 0 then
    raise exception 'settle_supplier_advance_on_invoice: acompte % déjà soldé', p_advance_id using errcode = '23514';
  end if;

  select * into v_inv from public.supplier_invoices where id = p_invoice_id and copro_id = p_copro_id;
  if v_inv.id is null then
    raise exception 'settle_supplier_advance_on_invoice: facture % introuvable (copro %)', p_invoice_id, p_copro_id using errcode = '23503';
  end if;
  -- Seules les factures POSTÉES (dette 401 ouverte) s'apurent : 'paid' = déjà soldée, 'draft'/'cancelled' = pas de dette.
  if v_inv.status <> 'posted' then
    raise exception 'settle_supplier_advance_on_invoice: facture % non apurable (statut % — attendu posted)', p_invoice_id, v_inv.status using errcode = '23514';
  end if;
  if v_inv.tiers_id is distinct from v_adv.supplier_id then
    raise exception 'settle_supplier_advance_on_invoice: l''acompte et la facture concernent des fournisseurs différents' using errcode = '23514';
  end if;

  -- Net à payer = solde 401 RESTANT de la facture (dérivé du GL) = total − règlements − apurements
  -- d'acompte DÉJÀ passés (toutes les écritures 401 de la facture partagent source_id=invoice_id).
  -- Évite le sur-apurement de plusieurs acomptes au-delà du total (les apurements ne créent pas de
  -- ligne supplier_payments, donc un net basé uniquement sur supplier_payments serait faux).
  select coalesce(round(sum(case when e.direction = 'credit' then e.amount else -e.amount end), 2), 0)
    into v_net
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a on a.id = e.account_id
  where e.copro_id = p_copro_id and a.code = '401' and t.source_id = p_invoice_id;
  if v_net <= 0 then
    raise exception 'settle_supplier_advance_on_invoice: facture % déjà entièrement réglée (net=%)', p_invoice_id, v_net using errcode = '23514';
  end if;

  v_settle := least(v_adv.remaining_amount, v_net, coalesce(p_amount, v_adv.remaining_amount));
  if v_settle <= 0 then
    raise exception 'settle_supplier_advance_on_invoice: montant d''apurement nul' using errcode = '23514';
  end if;

  select id into v_a401 from public.accounts where copro_id = p_copro_id and code = '401';
  select id into v_a409 from public.accounts where copro_id = p_copro_id and code = '409';

  v_ltx := public.create_ledger_transaction(
    p_copro_id, v_inv.period_id, p_date, 'Apurement acompte sur facture ' || v_inv.invoice_number,
    'supplier_payment', p_invoice_id,
    jsonb_build_array(
      jsonb_build_object('account_id', v_a401, 'direction', 'debit',  'amount', v_settle, 'entry_label', 'Apurement dette fournisseur par acompte'),
      jsonb_build_object('account_id', v_a409, 'direction', 'credit', 'amount', v_settle, 'entry_label', 'Acompte fournisseur consommé')
    ), true);
  if not (v_ltx->>'success')::boolean then
    raise exception 'settle_supplier_advance_on_invoice: échec écriture grand livre : %', v_ltx->>'error' using errcode = '23514';
  end if;
  v_tx := (v_ltx->>'tx_id')::uuid;

  update public.supplier_advances set remaining_amount = remaining_amount - v_settle where id = p_advance_id;

  return jsonb_build_object('success', true, 'advance_id', p_advance_id, 'settled', v_settle,
    'remaining', v_adv.remaining_amount - v_settle, 'ledger_tx_id', v_tx);
end;
$$;
revoke execute on function public.settle_supplier_advance_on_invoice(uuid, uuid, uuid, date, numeric) from public, anon;
grant execute on function public.settle_supplier_advance_on_invoice(uuid, uuid, uuid, date, numeric) to authenticated, service_role;

-- FIN 0078_f8_supplier_advance_409.sql
