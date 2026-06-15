-- 0072_payment_cloisonnement_avance.sql — PAIEMENTS C2/C3 : cloisonnement par nature + avance 450-3
-- ============================================================================================
-- Source : .planning/PLAN_J5_2026-06-15.md T2 + arbitrages §5 (#1 FIFO défaut courant->travaux,
--   ALUR jamais auto ; #2 volet avis différé).
--
-- BUT : faire du CLOISONNEMENT PAR NATURE le comportement PAR DÉFAUT de allocate_payment. Aujourd'hui,
--   un paiement sans filtre fait un FIFO GLOBAL trié par (issue_date, id) qui FRANCHIT les cloisons de
--   nature (un encaissement courant peut éteindre un appel travaux émis plus tôt — interdit B7). Le
--   nouveau défaut balaie les natures DANS L'ORDRE current PUIS works (FIFO intra-nature), ALUR JAMAIS
--   en automatique (réservé au filtre explicite). Le reliquat reste non imputé -> post_owner_payment
--   le bascule déjà en avance 450-3 (inchangé). On ajoute la vue v_lot_advance_balance (solde d'avance
--   par lot, security_invoker pour la RLS).
--
-- INVARIANTS PRÉSERVÉS : signature INCHANGÉE (seul appelant = post_owner_payment 0026, 0 appel
--   front/edge). Réimputation idempotente (DELETE payment_allocations en tête). La mise à jour de
--   call_for_funds_lines.amount_paid + statuts reste portée par la chaîne de triggers. SECURITY INVOKER.
--
-- CONVENTIONS : un seul % ; REVOKE public/anon ; GRANT authenticated+service_role.

-- ============================================================================================
-- 1. allocate_payment(p_payment_id, p_call_line_ids, p_nature_filter) — CLOISONNEMENT PAR DÉFAUT
-- ============================================================================================
create or replace function public.allocate_payment(
  p_payment_id    uuid,
  p_call_line_ids uuid[] default null,
  p_nature_filter text   default null
)
returns table (
  call_line_id     uuid,
  amount_allocated numeric
)
language plpgsql
set search_path = public
as $$
declare
  v_payment   record;
  v_remaining numeric;
  v_line      record;
  v_alloc     numeric;
  v_copro_id  uuid;
  v_natures   text[];
  v_nat       text;
begin
  select * into v_payment from public.payments where id = p_payment_id;
  if not found then
    raise exception 'allocate_payment: paiement % introuvable', p_payment_id
      using errcode = '23503';
  end if;

  v_copro_id  := v_payment.copro_id;
  v_remaining := v_payment.amount;

  -- Réimputation idempotente : on repart d'une ardoise vierge pour ce paiement.
  delete from public.payment_allocations where payment_id = p_payment_id;

  if p_call_line_ids is not null then
    -- IMPUTATION CIBLÉE = IMPUTATION MANUELLE art. 1342-10 (le gestionnaire/débiteur DÉSIGNE les
    -- échéances et leur ordre). C'est un OVERRIDE VOLONTAIRE du cloisonnement par défaut : si la liste
    -- mélange des natures, elles sont imputées dans l'ordre fourni (le choix manuel prime sur B7, qui
    -- ne régit que l'imputation AUTOMATIQUE). Mêmes gardes nature/lot/copro.
    for v_line in
      select cfl.id, cfl.amount_due - cfl.amount_paid as remaining
      from public.call_for_funds_lines cfl
      join public.call_for_funds cf on cf.id = cfl.call_id
      left join public.budgets b on b.id = cf.budget_id
      where cfl.id = any(p_call_line_ids)
        and cfl.copro_id = v_copro_id
        and cfl.lot_id = v_payment.lot_id
        and cfl.status <> 'paid'
        and cf.status <> 'cancelled'
        and (p_nature_filter is null or coalesce(b.budget_type::text, 'current') = p_nature_filter)
      order by array_position(p_call_line_ids, cfl.id)
    loop
      exit when v_remaining <= 0;
      v_alloc := least(v_remaining, v_line.remaining);
      if v_alloc > 0 then
        insert into public.payment_allocations (copro_id, payment_id, call_line_id, amount_allocated)
        values (v_copro_id, p_payment_id, v_line.id, v_alloc);
        v_remaining := v_remaining - v_alloc;
        call_line_id := v_line.id;
        amount_allocated := v_alloc;
        return next;
      end if;
    end loop;
    return;
  end if;

  -- FIFO AUTOMATIQUE. Natures à balayer (CLOISONNEMENT) :
  --   - filtre explicite fourni -> uniquement cette nature (y compris 'alur' si demandé) ;
  --   - défaut (NULL) -> current PUIS works, dans cet ordre ; ALUR JAMAIS en automatique (#1).
  if p_nature_filter is not null then
    v_natures := array[p_nature_filter];
  else
    v_natures := array['current', 'works'];
  end if;

  foreach v_nat in array v_natures
  loop
    exit when v_remaining <= 0;
    -- FIFO INTRA-NATURE sur les lignes impayées du lot (jamais de franchissement de cloison).
    for v_line in
      select cfl.id, cfl.amount_due - cfl.amount_paid as remaining
      from public.call_for_funds_lines cfl
      join public.call_for_funds cf on cf.id = cfl.call_id
      left join public.budgets b on b.id = cf.budget_id
      where cfl.lot_id = v_payment.lot_id
        and cfl.copro_id = v_copro_id
        and cfl.status <> 'paid'
        and cf.status <> 'cancelled'
        and coalesce(b.budget_type::text, 'current') = v_nat
      order by cf.issue_date asc, cf.id asc
    loop
      exit when v_remaining <= 0;
      v_alloc := least(v_remaining, v_line.remaining);
      if v_alloc > 0 then
        insert into public.payment_allocations (copro_id, payment_id, call_line_id, amount_allocated)
        values (v_copro_id, p_payment_id, v_line.id, v_alloc);
        v_remaining := v_remaining - v_alloc;
        call_line_id := v_line.id;
        amount_allocated := v_alloc;
        return next;
      end if;
    end loop;
  end loop;

  -- Reliquat (v_remaining > 0) laissé NON imputé : post_owner_payment le bascule en avance 450-3.
  return;
end;
$$;
revoke execute on function public.allocate_payment(uuid, uuid[], text) from public, anon;
grant execute on function public.allocate_payment(uuid, uuid[], text) to authenticated, service_role;


-- ============================================================================================
-- 2. v_lot_advance_balance — solde d'AVANCE (450-3) par lot   [G-DEF-RO via security_invoker]
-- ============================================================================================
-- advance_balance = solde CRÉDITEUR du 450-3 (crédit − débit) : montant d'avance/trop-perçu
-- disponible pour le lot (positif = avance dispo). Calqué sur v_owner_statement_by_lot (0028),
-- security_invoker -> hérite la RLS collectif/back-office (jamais definer = fuite inter-lots).
create or replace view public.v_lot_advance_balance
with (security_invoker = true) as
select
  e.copro_id,
  e.lot_id,
  l.ref                                                                 as lot_ref,
  round(sum(case when e.direction = 'credit' then e.amount else -e.amount end), 2) as advance_balance
from public.ledger_entries e
join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
join public.accounts a            on a.id = e.account_id
join public.lots l                on l.id = e.lot_id
where e.lot_id is not null
  and a.code = '450-3'
group by e.copro_id, e.lot_id, l.ref;

comment on view public.v_lot_advance_balance is
  'Solde d avance (450-3) par lot : advance_balance = credit - debit (positif = avance disponible). Lot-centric, security_invoker (RLS heritee).';

-- FIN 0072_payment_cloisonnement_avance.sql
