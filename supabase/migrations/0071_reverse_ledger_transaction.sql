-- 0071_reverse_ledger_transaction.sql — CONTRE-PASSATION (F9, filet d'annulation/correction GL)
-- ============================================================================================
-- Source : .planning/PLAN_J5_2026-06-15.md T1 (§ « F9 contre-passation ») + arbitrages §5 (T1).
--
-- BUT : poser le FILET d'annulation propre du grand livre. Le GL est IMMUABLE (décret 2005-240,
--   triggers 0024) : on ne modifie ni ne supprime une écriture postée. La seule façon légale
--   d'annuler/corriger est la CONTRE-PASSATION = créer une écriture INVERSE (débits↔crédits,
--   mêmes comptes/lots/montants) dans la période OUVERTE courante, liée à l'originale par
--   metadata.reversal_of. L'écriture d'origine reste intacte (traçabilité comptable).
--
-- Ce fichier NE CRÉE QUE : 1 index unique partiel (anti double-extourne), 2 RPC
--   (reverse_ledger_transaction générique + cancel_call_for_funds métier), 1 CREATE OR REPLACE
--   du trigger tr_cff_ledger_required (resserrement — dette tracée en 0026 L1376-1379) et
--   1 CREATE OR REPLACE de la vue v_general_ledger (ajout de 2 colonnes en queue : reversal_of,
--   is_reversed). AUCUNE table. AUCUNE colonne de table. AUCUNE écriture postée touchée.
--
-- ARBITRAGES §5 appliqués :
--   #5 annulation d'appel AVEC paiements imputés = REFUS STRICT (pas de cascade désimputante) ;
--   #6 extourne d'un paiement copro isolé = DIFFÉRÉE (cancel_call_for_funds ne touche pas les paiements) ;
--   #7 V1 = reverse_ledger_transaction générique + cancel_call_for_funds.
--   Option A imposée : le lien vit UNIQUEMENT sur l'extourne (metadata.reversal_of), jamais
--   d'UPDATE de l'écriture d'origine. Option B (exemption immutabilité 0024) PROSCRITE.
--
-- CONVENTIONS (alignées 0025/0026) : SECURITY DEFINER + set search_path=public ; deny-by-default
--   (REVOKE public/anon, GRANT authenticated+service_role) ; garde G-MGR « is_service_call() OR
--   user_is_copro_manager(copro DÉRIVÉE de l'objet) » ; un seul % ; errcode 42501/23503/23514.

-- ============================================================================================
-- 1. Index unique partiel — anti double-extourne CONCURRENTE
-- ============================================================================================
-- La garde applicative (EXISTS) est contournable en concurrence (deux extournes simultanées de la
-- même tx passent toutes deux le EXISTS avant que l'autre ne commit). L'unicité en base est le seul
-- rempart dur : une seule écriture 'od' peut porter un reversal_of donné.
create unique index if not exists uq_ledger_reversal_of
  on public.ledger_transactions (((metadata->>'reversal_of')))
  where source_type = 'od' and (metadata->>'reversal_of') is not null;


-- ============================================================================================
-- 2. reverse_ledger_transaction(p_tx_id, p_reason, p_reversal_date) -> jsonb   [G-MGR + G-SVC]
-- ============================================================================================
-- Crée l'écriture inverse d'une transaction POSTÉE dans la période OUVERTE courante de sa copro.
-- Refuse si : tx introuvable / non postée / régénérable (opening/closing/onboarding/result_allocation,
--   à régénérer, pas à contre-passer) / déjà extournée / aucune période ouverte.
-- La date d'extourne est CLAMPÉE dans [start_date ; end_date] de la période ouverte (jamais hors borne).
-- source_type de l'extourne = 'od' (opérations diverses) — pas de nouvelle valeur d'enum ; 'od' n'est
--   PAS régénérable -> l'extourne est elle-même immuable une fois postée.
create or replace function public.reverse_ledger_transaction(
  p_tx_id         uuid,
  p_reason        text,
  p_reversal_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx      record;
  v_open    record;
  v_date    date;
  v_entries jsonb;
  v_ltx     jsonb;
  v_rev_tx  uuid;
begin
  -- 1. La transaction existe ? FOR UPDATE : sérialise les extournes concurrentes de la MÊME tx —
  --    la 2e session bloque jusqu'au commit de la 1re, voit le EXISTS (5.) et lève le message métier
  --    « déjà contre-passée » (au lieu d'une violation d'unicité brute remontée à l'UPDATE).
  select * into v_tx from public.ledger_transactions where id = p_tx_id for update;
  if not found then
    raise exception 'reverse_ledger_transaction: écriture % introuvable', p_tx_id
      using errcode = '23503';
  end if;

  -- 2. Garde G-MGR : copro DÉRIVÉE de la tx (jamais un p_copro_id client) — DEFINER bypasse la RLS.
  if not public.is_service_call() and not public.user_is_copro_manager(v_tx.copro_id) then
    raise exception 'forbidden: manager required for copro %', v_tx.copro_id
      using errcode = '42501';
  end if;

  -- 3. Doit être POSTÉE (une draft se supprime, elle ne se contre-passe pas).
  if v_tx.status <> 'posted' then
    raise exception 'reverse_ledger_transaction: seule une écriture postée peut être contre-passée (tx %, statut %)', p_tx_id, v_tx.status
      using errcode = '23514';
  end if;

  -- 4. Régénérable -> contre-passation INTERDITE (on régénère par close/affectation, pas par extourne).
  if public.is_ledger_regen_exempt(v_tx.source_type::text, v_tx.source_id, v_tx.period_id) then
    raise exception 'reverse_ledger_transaction: écriture régénérable (source %) — contre-passation interdite (utiliser la régénération)', v_tx.source_type
      using errcode = '23514';
  end if;

  -- 5. Déjà extournée ? (garde applicative ; l'unicité base 1. couvre la course concurrente.)
  if exists (
    select 1 from public.ledger_transactions r
    where r.source_type = 'od' and (r.metadata->>'reversal_of') = p_tx_id::text
  ) then
    raise exception 'reverse_ledger_transaction: écriture % déjà contre-passée', p_tx_id
      using errcode = '23514';
  end if;

  -- 6. Période ouverte de la copro (l'extourne y atterrit, même si l'originale est en période close/approuvée).
  select * into v_open
  from public.accounting_periods
  where copro_id = v_tx.copro_id and status = 'open'
  limit 1;
  if not found then
    raise exception 'reverse_ledger_transaction: aucune période ouverte pour la copro % — impossible de contre-passer', v_tx.copro_id
      using errcode = '23514';
  end if;

  -- 7. Date clampée dans [start_date ; end_date] de la période ouverte.
  v_date := coalesce(p_reversal_date, current_date);
  if v_date < v_open.start_date then v_date := v_open.start_date; end if;
  if v_date > v_open.end_date   then v_date := v_open.end_date;   end if;

  -- 8. Lignes inversées (debit<->credit ; mêmes account_id/lot_id/amount).
  select jsonb_agg(jsonb_build_object(
    'account_id',  e.account_id,
    'lot_id',      e.lot_id,
    'direction',   case e.direction when 'debit' then 'credit' else 'debit' end,
    'amount',      e.amount,
    'entry_label', 'Contre-passation : ' || coalesce(e.entry_label, v_tx.label),
    'operation_id', e.operation_id
  ))
  into v_entries
  from public.ledger_entries e
  where e.tx_id = p_tx_id;

  -- 9. Crée l'extourne en DRAFT (od), pose metadata.reversal_of (autorisé tant que draft), puis POSTE.
  v_ltx := public.create_ledger_transaction(
    v_tx.copro_id, v_open.id, v_date,
    'Contre-passation : ' || v_tx.label,
    'od', v_tx.source_id, v_entries, false
  );
  v_rev_tx := (v_ltx->>'tx_id')::uuid;

  update public.ledger_transactions
    set metadata = jsonb_build_object('reversal_of', p_tx_id::text, 'reason', p_reason)
  where id = v_rev_tx;

  v_ltx := public.post_ledger_transaction(v_rev_tx);
  if not (v_ltx->>'success')::boolean then
    raise exception 'reverse_ledger_transaction: échec du post de l''extourne : %', v_ltx->>'error'
      using errcode = '23514';
  end if;

  return jsonb_build_object(
    'success', true,
    'reversal_tx_id', v_rev_tx,
    'reversed_tx_id', p_tx_id,
    'period_id', v_open.id,
    'tx_date', v_date
  );
end;
$$;
revoke execute on function public.reverse_ledger_transaction(uuid, text, date) from public, anon;
grant execute on function public.reverse_ledger_transaction(uuid, text, date) to authenticated, service_role;


-- ============================================================================================
-- 3. cancel_call_for_funds(p_call_id, p_reason) -> jsonb   [G-MGR + G-SVC]
-- ============================================================================================
-- Annule un appel de fonds POSTÉ : contre-passe son écriture d'origine puis bascule status='cancelled'.
-- Refuse si : appel introuvable / status in (draft, cancelled) / Σ paiements imputés > 0 (#5 refus strict).
-- Conserve ledger_tx_id sur l'appel (l'écriture d'origine ne disparaît pas — ON DELETE RESTRICT ;
--   l'extourne est une 2e écriture). La garde resserrée tr_cff_ledger_required (4. ci-dessous) impose
--   d'ailleurs qu'un appel annulé précédemment émis garde son ledger_tx_id.
create or replace function public.cancel_call_for_funds(
  p_call_id uuid,
  p_reason  text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_call    record;
  v_imputed numeric;
  v_rev     jsonb;
begin
  select * into v_call from public.call_for_funds where id = p_call_id;
  if not found then
    raise exception 'cancel_call_for_funds: appel % introuvable', p_call_id
      using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_call.copro_id) then
    raise exception 'forbidden: manager required for copro %', v_call.copro_id
      using errcode = '42501';
  end if;

  if v_call.status in ('draft', 'cancelled') then
    raise exception 'cancel_call_for_funds: appel % en statut % — annulation impossible (seuls les appels émis se contre-passent)', p_call_id, v_call.status
      using errcode = '23514';
  end if;

  -- #5 refus strict : un appel avec paiement imputé ne s'annule pas (désimputer d'abord).
  select coalesce(sum(pa.amount_allocated), 0)
    into v_imputed
  from public.payment_allocations pa
  join public.call_for_funds_lines cfl on cfl.id = pa.call_line_id
  where cfl.call_id = p_call_id;
  if v_imputed > 0 then
    raise exception 'cancel_call_for_funds: appel % a des paiements imputés (% €) — désimputez-les d''abord (refus strict)', p_call_id, v_imputed
      using errcode = '23514';
  end if;

  if v_call.ledger_tx_id is null then
    raise exception 'cancel_call_for_funds: appel % émis sans écriture (incohérent) — annulation impossible', p_call_id
      using errcode = '23514';
  end if;

  -- Contre-passe l'écriture d'appel (réutilise toutes les gardes de reverse_ledger_transaction).
  v_rev := public.reverse_ledger_transaction(
    v_call.ledger_tx_id,
    coalesce(p_reason, 'Annulation appel de fonds'),
    null
  );

  -- Bascule le statut (ledger_tx_id conservé -> garde resserrée satisfaite).
  update public.call_for_funds set status = 'cancelled' where id = p_call_id;

  return jsonb_build_object(
    'success', true,
    'call_id', p_call_id,
    'reversal_tx_id', v_rev->>'reversal_tx_id'
  );
end;
$$;
revoke execute on function public.cancel_call_for_funds(uuid, text) from public, anon;
grant execute on function public.cancel_call_for_funds(uuid, text) to authenticated, service_role;


-- ============================================================================================
-- 4. tr_cff_ledger_required() — RESSERREMENT (dette tracée 0026 L1376-1379)
-- ============================================================================================
-- Inchangé : un appel non draft/cancelled EXIGE une écriture (ledger_tx_id NOT NULL).
-- AJOUT : un appel 'cancelled' PRÉCÉDEMMENT ÉMIS (issued_at IS NOT NULL) doit CONSERVER son
--   ledger_tx_id — sinon un 'cancelled' posté perdrait l'écriture d'origine que la contre-passation
--   s'appuie pour exister (ON DELETE RESTRICT). Un appel annulé alors qu'il était encore draft
--   (issued_at NULL) reste légitimement sans écriture (rien n'a été posté).
create or replace function public.tr_cff_ledger_required()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status    public.call_for_funds_status;
  v_tx        uuid;
  v_issued_at timestamptz;
begin
  -- Re-lire l'ÉTAT COURANT au COMMIT (contrainte différée) ; new.* serait l'image figée de l'événement.
  select status, ledger_tx_id, issued_at
    into v_status, v_tx, v_issued_at
  from public.call_for_funds where id = new.id;
  if not found then
    return null;  -- appel supprimé dans la même tx : rien à contrôler.
  end if;

  if v_status not in ('draft', 'cancelled') and v_tx is null then
    raise exception 'tr_cff_ledger_required: l''appel % (statut %) doit porter une écriture (ledger_tx_id NOT NULL)', new.id, v_status
      using errcode = '23514';
  end if;

  -- Resserrement : appel annulé MAIS précédemment émis -> doit garder son écriture (contre-passation,
  -- pas suppression). Sans cette garde, un 'cancelled' posté pourrait perdre son ledger_tx_id.
  if v_status = 'cancelled' and v_issued_at is not null and v_tx is null then
    raise exception 'tr_cff_ledger_required: l''appel annulé % a été émis — il doit conserver son écriture (contre-passation, non suppression du ledger_tx_id)', new.id
      using errcode = '23514';
  end if;

  return null;
end;
$$;
revoke execute on function public.tr_cff_ledger_required() from public, anon, authenticated;
-- NB : le trigger trg_cff_ledger_required (0026 L1405) reste attaché ; CREATE OR REPLACE FUNCTION
--   suffit à mettre à jour le corps sans recréer le trigger.


-- ============================================================================================
-- 5. v_general_ledger — exposition de l'état d'extourne (colonnes AJOUTÉES EN QUEUE)
-- ============================================================================================
-- CREATE OR REPLACE VIEW n'autorise QUE l'ajout de colonnes en fin de SELECT (ordre/noms/types des
-- colonnes existantes inchangés). On ajoute :
--   - reversal_of : tx d'origine contre-passée PAR cette ligne (NULL sauf sur les écritures 'od' d'extourne) ;
--   - is_reversed : TRUE si CETTE écriture a été contre-passée par une écriture 'od' aval.
create or replace view public.v_general_ledger
with (security_invoker = true) as
select
    e.id                                                   as entry_id,
    e.tx_id                                                as tx_id,
    t.copro_id                                             as copro_id,
    t.period_id                                            as period_id,
    t.tx_date                                              as tx_date,
    t.label                                                as tx_label,
    t.source_type                                          as source_type,
    t.source_id                                            as source_id,
    t.status                                               as status,
    t.posted_at                                            as posted_at,
    a.id                                                   as account_id,
    a.code                                                 as account_code,
    a.name                                                 as account_name,
    a.account_type                                         as account_type,
    e.lot_id                                               as lot_id,
    l.ref                                                  as lot_ref,
    e.direction                                            as direction,
    e.amount                                               as amount,
    e.entry_label                                          as entry_label,
    case when e.direction = 'debit'  then e.amount else 0 end as debit,
    case when e.direction = 'credit' then e.amount else 0 end as credit,
    -- colonnes AJOUTÉES (queue) — état de contre-passation
    (t.metadata->>'reversal_of')::uuid                     as reversal_of,
    exists (
      select 1 from public.ledger_transactions r
      where r.source_type = 'od' and (r.metadata->>'reversal_of') = t.id::text
    )                                                      as is_reversed
from public.ledger_entries e
join public.ledger_transactions t on t.id = e.tx_id
join public.accounts a            on a.id = e.account_id
left join public.lots l           on l.id = e.lot_id;

comment on view public.v_general_ledger is
'Grand livre denormalise : 1 ligne par ecriture (ledger_entries) + en-tete tx + compte + lot. Filtrer status=posted en aval. Colonnes reversal_of/is_reversed = etat de contre-passation (0071).';

-- ============================================================================================
-- 6. v_lot_vs_gl_mismatch — la réconciliation appel/paiement DOIT compter les extournes 'od'
-- ============================================================================================
-- Sans ce correctif, annuler un appel par contre-passation crée un ÉCART FANTÔME : la vue (0028)
-- ne compte côté GL que source_type in (call_for_funds, payment), donc elle voit l'appel d'origine
-- (+X) mais PAS son extourne 'od' (−X) ; côté relevé l'appel annulé est exclu (status='cancelled').
-- Résultat : gl=+X vs relevé=0 -> faux mismatch sur chaque lot.
-- FIX (principe) : la réconciliation suit les MOUVEMENTS d'appel/paiement ET LEURS EXTOURNES. On
-- inclut donc les lignes 'od' dont la tx contre-passe (metadata.reversal_of) une tx call/payment.
-- L'extourne d'un appel nette alors le GL à 0, en phase avec le relevé. Le reste de la vue (relevé,
-- full outer join, owner_name, grain lot, security_invoker) est INCHANGÉ.
create or replace view public.v_lot_vs_gl_mismatch
with (security_invoker = true) as
with gl as (
  select
    e.copro_id,
    e.lot_id,
    round(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 2) as gl_call_payment_balance
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a            on a.id = e.account_id
  where e.lot_id is not null
    and a.code like '45%'
    and (
      t.source_type in ('call_for_funds', 'payment')
      or (
        -- extourne d'un appel/paiement : mouvement d'appel à part entière (nette le solde).
        t.source_type = 'od'
        and exists (
          select 1 from public.ledger_transactions o
          where o.id = nullif(t.metadata->>'reversal_of', '')::uuid
            and o.source_type in ('call_for_funds', 'payment')
        )
      )
    )
  group by e.copro_id, e.lot_id
),
releve as (
  select
    cfl.copro_id,
    cfl.lot_id,
    sum(cfl.amount_due - coalesce(cfl.amount_paid, 0)) as statement_balance
  from public.call_for_funds_lines cfl
  join public.call_for_funds cf on cf.id = cfl.call_id
  where cf.status not in ('draft', 'cancelled')
  group by cfl.copro_id, cfl.lot_id
)
select
  coalesce(g.copro_id, r.copro_id)                                     as copro_id,
  coalesce(g.lot_id, r.lot_id)                                         as lot_id,
  l.ref                                                                 as lot_ref,
  (
    select case when cp.is_company then cp.company_name
                else coalesce(cp.first_name || ' ' || cp.last_name, 'Inconnu') end
    from public.lot_owners lo
    join public.coproprietaires cp on cp.id = lo.coproprietaire_id
    where lo.lot_id = coalesce(g.lot_id, r.lot_id)
      and lo.is_primary = true
      and lo.end_date is null
    limit 1
  )                                                                     as owner_name,
  coalesce(g.gl_call_payment_balance, 0)                               as gl_call_payment_balance,
  coalesce(r.statement_balance, 0)                                     as statement_balance,
  coalesce(g.gl_call_payment_balance, 0) - coalesce(r.statement_balance, 0) as difference
from gl g
full outer join releve r on r.lot_id = g.lot_id and r.copro_id = g.copro_id
left join public.lots l on l.id = coalesce(g.lot_id, r.lot_id)
where abs(coalesce(g.gl_call_payment_balance, 0) - coalesce(r.statement_balance, 0)) > 0.01;

comment on view public.v_lot_vs_gl_mismatch is
  'Lots dont le solde 450 RESTREINT aux mouvements d appel/paiement (call_for_funds + payment + leurs EXTOURNES od, 0071) diverge du releve (call_for_funds_lines du-paye, hors annules). Les autres mouvements legitimes (opening_balance/onboarding, result_allocation, mutation, manual, reclassification, od NON liees a un appel) restent EXCLUS et visibles dans v_owner_statement_by_lot. Detection lecture seule (Gap G3), grain lot, security_invoker.';

-- FIN 0071_reverse_ledger_transaction.sql
