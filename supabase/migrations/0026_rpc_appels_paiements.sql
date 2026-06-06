-- 0026_rpc_appels_paiements.sql — CHAÎNE FINANCE : APPELS DE FONDS & PAIEMENTS (sous-lot 2/5)
-- Source : .planning/db-cible/03-budgets-appels-impayes.md (§0 flux, §2 enums, §4 triggers, §5 fonctions)
--          + .planning/db-cible/02-finance-grand-livre.md (§1.6/1.7 payments/allocations, §4/§5)
--          + .planning/db-cible/07-maintenance-tiers.md (§1.6-1.8 factures/paiements fournisseurs, §4/§5)
--          + .planning/db-cible/INVENTAIRE-FONCTIONS.md (dispositions §G/§H/§sup. 07)
--          + corps LEGACY faisant autorité (migrations_legacy, version la plus récente par surcharge)
--          + colonnes EXACTES vérifiées sur 0002/0009/0012/0013/0014/0016/0021/0023/0024/0025.
--
-- BUT : poser la chaîne de postage métier (appel de fonds agrégé, encaissement copro, facture
--       fournisseur, règlement fournisseur), le workflow budget (submit/validate sans GL), les
--       helpers de statut/dérivation, et les triggers d'intégrité couplés à ces RPC.
--       Ce fichier NE CRÉE QUE des FONCTIONS et des TRIGGERS. AUCUNE table (toutes en 0001→0022).
--       AUCUN objet 0001→0025 recréé ni retouché (sinon double create casse `supabase db reset`).
--
-- ROUTE CANONIQUE (0025, à APPELER — jamais réimplémenter) :
--   resolve_lot_tiers_account(copro, nature)  -> sous-compte 450-x (current/works/advance/loan/alur)
--   create_ledger_transaction(copro, period, date, label, source_type, source_id, entries, auto_post)
--     pose en-tête + lignes, et auto-post si équilibré ; EXIGE déjà période 'open' + garde G-MGR/G-SVC.
--   Les posteurs écrivent À TRAVERS le filet 0024 : écritures équilibrées, lot_id sur chaque 45x,
--   jamais sur le chapeau 450 (is_postable=false), immutabilité une fois 'posted'.
--
-- CONVENTIONS (durcissement transverse — leçons 0023/0024/0025) :
--   - SECURITY DEFINER + set search_path = public sur tout ce qui fait des lookups inter-tables ;
--     STABLE pour les lectures pures, VOLATILE pour les écritures.
--   - EXCEPTION : allocate_payment = SECURITY INVOKER (gouvernée par la RLS de l'appelant, art.1342-10),
--     PAS de garde in-function, mais SET search_path = public + REVOKE anon.
--   - Gardes G-MGR sur les posteurs (post_budget_call_for_funds, post_owner_payment,
--     post_supplier_invoice, post_supplier_payment, submit_budget, validate_budget,
--     recalculate_all_call_statuses) : IF NOT is_service_call() AND NOT user_is_copro_manager(copro)
--     THEN RAISE ... USING errcode='42501'. La branche is_service_call permet le chemin machine
--     (import/CI/harnais). Pour les posteurs sans copro en argument direct (submit/validate_budget),
--     la copro est DÉRIVÉE de l'objet (budget) avant la garde.
--   - Fonctions trigger : SECURITY DEFINER + set search_path = public (ne pas subir la RLS au lot 0030) ;
--     REVOKE EXECUTE FROM public, anon, authenticated (jamais appelées directement).
--   - deny-by-default : REVOKE EXECUTE FROM public, anon ; GRANT authenticated, service_role.
--   - UN SEUL % dans les RAISE/format (jamais %%, jamais %.2f — interdit en plpgsql).
--   - errcode : 42501 (forbidden), 23514 (intégrité/check), 23503 (FK).
--   - PAS de WHEN OTHERS masquant : les exceptions remontent (vrai rollback). Les pré-conditions
--     métier explicites (facture déjà payée…) peuvent retourner {success:false} comme le legacy,
--     MAIS tout posteur appelant create_ledger_transaction teste (->>'success') et RAISE si échec.
--   - idempotency_key : aligné TEXT (colonnes cible payments/supplier_payments en TEXT, 0014/0021) —
--     le paramètre p_idempotency_key est donc TEXT (cohérence colonne, pas de cast uuid->text fragile).
--
-- CORRECTIONS LIVE -> CIBLE appliquées (vrais bugs/dérives) :
--   1. p_method DEFAULT 'bank_transfer' était INVALIDE (enum payment_method n'a pas cette valeur) :
--      -> DEFAULT 'transfer' sur post_owner_payment ET post_supplier_payment.
--   2. post_supplier_invoice : colonnes cible supplier_id->tiers_id et related_service_order_id->service_order_id.
--   3. Gardes G-MGR AJOUTÉES (le legacy ne les avait pas).
--   4. p_idempotency_key TEXT (et non uuid) — aligne le type colonne cible.
--   5. allocate_payment : SUPPRESSION du bloc final « recalage statut » (UPDATE call_for_funds SET status)
--      qui DOUBLAIT la chaîne de triggers. On s'appuie sur trg_allocation_update_line ->
--      trg_call_line_status_sync. Statuts produits identiques (vérifié : même mapping unpaid/partial/paid).
--   6. RAISE legacy en %.2f -> remplacés par % (le format plpgsql n'accepte que %).
--   7. update_call_status dérive l'en-tête depuis Σ amount_paid / Σ amount_due (monétaire) et NON
--      depuis line.status : supprime la dépendance d'ordre au trigger fusionné (revue adversariale).
--      tr_call_line_status_sync traite aussi amount_due=0 comme 'paid' (aligné legacy, robustesse).
--   8. FOR UPDATE rétabli sur les 2 constraint triggers de total (call / facture) : durcissement
--      legacy contre une course concurrente total_amount/lignes en accès direct hors RPC.
--
-- HORS PÉRIMÈTRE (0027/0028/0029/0030 — NE PAS écrire ici) :
--   validate_budget_expense + cut-off 408/486 ; open/close/approve/reopen/regularize_period,
--   set_opening_balance, assert_result_allocation_split ; vues GL/relances/KPI/annexes/audit ;
--   create_test_copro(_seeded)/seed_golden_loop ; generate_calls_from_ag_payload + chaîne AG.
--
-- OBJETS ABANDONNÉS — NE JAMAIS CRÉER : post_call_for_funds (mono-clé), surcharge
--   post_budget_call_for_funds 8-args (perd des centimes), surcharge post_supplier_payment 7-args
--   (non idempotente), generate_combined_calls_from_ag / create_budget_from_ag / create_alur_fund_from_ag.
--
-- ORDRE DE DÉCLARATION (un objet appelé est défini AVANT son appelant) :
--   A.  repartition_key_is_complete            (helper -> post_budget_call_for_funds)
--   B.  compute_repartition_shares             (helper lot-centric, autonome)
--   C.  update_call_status                     (helper -> trigger statut + recalculate_all)
--   D.  recalculate_all_call_statuses          (maintenance, appelle update_call_status)
--   E.  get_supplier_invoice_paid_amount       (helper -> non bloquant)
--   F.  allocate_payment                       (INVOKER, FIFO cloisonné -> post_owner_payment)
--   G.  post_budget_call_for_funds (10 args)   (appel agrégé plus-grand-reste)
--   H.  post_owner_payment (10 args)           (encaissement copro idempotent)
--   I.  post_supplier_invoice (14 args)        (facture B en 2 temps)
--   J.  post_supplier_payment (8 args)         (règlement fournisseur idempotent)
--   K.  submit_budget / validate_budget        (machines à état budget, sans GL)
--   L.  TRIGGERS (fonctions trigger + CREATE TRIGGER) — voir SECTION TRIGGERS.


-- ============================================================================================
-- A. repartition_key_is_complete(p_key_id) -> boolean   [G-INTERNAL]
-- ============================================================================================
-- Une clé est « utilisable » pour émettre un appel si elle couvre bien son périmètre :
--   - coverage_mode='subset' (clé volontairement partielle) : complète dès ≥1 ligne de poids > 0 ;
--   - sinon (all_lots) : CHAQUE lot de la copro doit avoir une ligne de poids > 0 (aucun manquant).
-- Dépendance directe de post_budget_call_for_funds (émission bloquée si une clé du budget est incomplète).
-- STABLE (lecture pure). Corps legacy (wp3_keys_ventilation) — colonnes confirmées sur 0009.
create or replace function public.repartition_key_is_complete(p_key_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_key     record;
  v_missing integer;
begin
  select * into v_key from public.repartition_keys where id = p_key_id;
  if not found then
    return false;
  end if;

  if v_key.coverage_mode = 'subset' then
    return exists (
      select 1 from public.repartition_key_lines
      where key_id = p_key_id and weight > 0
    );
  end if;

  select count(*) into v_missing
  from public.lots l
  where l.copro_id = v_key.copro_id
    and not exists (
      select 1 from public.repartition_key_lines rkl
      where rkl.key_id = p_key_id and rkl.lot_id = l.id and rkl.weight > 0
    );

  return v_missing = 0;
end;
$$;
revoke execute on function public.repartition_key_is_complete(uuid) from public, anon;
grant execute on function public.repartition_key_is_complete(uuid) to authenticated, service_role;


-- ============================================================================================
-- B. compute_repartition_shares(p_key_id) -> table(lot_id, weight, share_pct)   [G-INTERNAL]
-- ============================================================================================
-- Cœur lot-centric : pour une clé de répartition donnée, expose la quote-part de CHAQUE lot
--   (weight = tantièmes figés de la ligne ; share_pct = weight / Σweight × 100, en pourcentage).
-- Source unique des quotes-parts = repartition_key_lines (jamais lots.tantieme). Si la clé est vide
--   (Σweight = 0), share_pct = 0 (évite la division par zéro). STABLE (lecture pure).
-- Helper de reporting/contrôle (le posteur d'appel calcule lui-même par « plus grand reste »).
create or replace function public.compute_repartition_shares(p_key_id uuid)
returns table (
  lot_id    uuid,
  weight    numeric,
  share_pct numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with k as (
    select coalesce(sum(weight), 0) as total_weight
    from public.repartition_key_lines
    where key_id = p_key_id
  )
  select
    rkl.lot_id,
    rkl.weight,
    case when k.total_weight > 0
      then round(rkl.weight * 100.0 / k.total_weight, 6)
      else 0
    end as share_pct
  from public.repartition_key_lines rkl
  cross join k
  where rkl.key_id = p_key_id;
$$;
revoke execute on function public.compute_repartition_shares(uuid) from public, anon;
grant execute on function public.compute_repartition_shares(uuid) to authenticated, service_role;


-- ============================================================================================
-- C. update_call_status(p_call_id) -> void   [G-INTERNAL]
-- ============================================================================================
-- Recalcule l'en-tête call_for_funds.status à partir de l'état agrégé de ses lignes :
--   draft/cancelled -> inchangés (états pilotés à la main) ;
--   toutes lignes 'paid' (et ≥1 ligne due) -> 'paid' ;
--   au moins une ligne avec amount_paid > 0       -> 'partially_paid' ;
--   sinon                                          -> 'issued'.
-- Mapping figé (blueprint §2) : ligne unpaid->issued, partial->partially_paid, toutes paid->paid.
-- UPDATE conditionnel (... AND status IS DISTINCT FROM v_new_status) : idempotent et — appelé
--   depuis le trigger AFTER de la ligne — n'émet un UPDATE sur l'en-tête QUE s'il y a un vrai
--   changement (pas de write inutile). VOLATILE. Corps legacy (action2) adapté.
create or replace function public.update_call_status(p_call_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status       call_for_funds_status;
  v_total_due    numeric;
  v_total_paid   numeric;
  v_line_count   integer;
  v_paid_count   integer;
  v_new_status   call_for_funds_status;
begin
  select status into v_status from public.call_for_funds where id = p_call_id;
  if not found then
    return;
  end if;

  -- Les états pilotés manuellement ne sont jamais écrasés par la dérivation.
  if v_status in ('draft', 'cancelled') then
    return;
  end if;

  -- Dérivation MONÉTAIRE (et non depuis line.status) : supprime toute dépendance d'ordre vis-à-vis
  -- du trigger fusionné qui pose line.status — l'en-tête se base sur Σ amount_paid / Σ amount_due.
  select
    coalesce(sum(amount_due), 0),
    coalesce(sum(amount_paid), 0),
    count(*),
    count(*) filter (where amount_paid > 0)
  into v_total_due, v_total_paid, v_line_count, v_paid_count
  from public.call_for_funds_lines
  where call_id = p_call_id;

  if v_line_count > 0 and v_total_paid >= v_total_due then
    v_new_status := 'paid';
  elsif v_paid_count > 0 then
    v_new_status := 'partially_paid';
  else
    v_new_status := 'issued';
  end if;

  update public.call_for_funds
  set status = v_new_status
  where id = p_call_id
    and status is distinct from v_new_status;
end;
$$;
revoke execute on function public.update_call_status(uuid) from public, anon;
grant execute on function public.update_call_status(uuid) to authenticated, service_role;


-- ============================================================================================
-- D. recalculate_all_call_statuses(p_copro_id) -> table(call_id, old_status, new_status)   [G-MGR]
-- ============================================================================================
-- Maintenance : recalcule en boucle le statut de TOUS les appels non draft/cancelled d'une copro
--   en s'appuyant sur update_call_status (source unique de la dérivation), et retourne la liste des
--   appels effectivement modifiés (ancien/nouveau statut). VOLATILE. Garde G-MGR (opération de masse).
create or replace function public.recalculate_all_call_statuses(p_copro_id uuid)
returns table (
  call_id    uuid,
  old_status call_for_funds_status,
  new_status call_for_funds_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_call record;
begin
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: manager required for copro %', p_copro_id
      using errcode = '42501';
  end if;

  for v_call in
    select cf.id, cf.status as current_status
    from public.call_for_funds cf
    where cf.copro_id = p_copro_id
      and cf.status not in ('draft', 'cancelled')
  loop
    perform public.update_call_status(v_call.id);

    -- Ne remonter que les appels dont le statut a réellement changé.
    select cf.status into new_status from public.call_for_funds cf where cf.id = v_call.id;
    if new_status is distinct from v_call.current_status then
      call_id    := v_call.id;
      old_status := v_call.current_status;
      return next;
    end if;
  end loop;
end;
$$;
revoke execute on function public.recalculate_all_call_statuses(uuid) from public, anon;
grant execute on function public.recalculate_all_call_statuses(uuid) to authenticated, service_role;


-- ============================================================================================
-- E. get_supplier_invoice_paid_amount(p_invoice_id) -> numeric   [G-INTERNAL]
-- ============================================================================================
-- Somme des règlements (supplier_payments) d'une facture fournisseur (0 si aucun). Lecture pure
--   (STABLE) — sert au calcul du « reste à payer » et au statut posted/paid. Corps legacy (niveau2e).
create or replace function public.get_supplier_invoice_paid_amount(p_invoice_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(amount), 0)
  from public.supplier_payments
  where supplier_invoice_id = p_invoice_id;
$$;
revoke execute on function public.get_supplier_invoice_paid_amount(uuid) from public, anon;
grant execute on function public.get_supplier_invoice_paid_amount(uuid) to authenticated, service_role;


-- ============================================================================================
-- F. allocate_payment(p_payment_id, p_call_line_ids, p_nature_filter) -> table(...)   [INVOKER]
-- ============================================================================================
-- Impute un paiement aux lignes d'appel impayées du MÊME lot, en FIFO (par date d'émission puis id),
--   éventuellement restreint à une nature (current/works/alur via budget_type) — NULL = multi-nature
--   (défaut légal art.1342-10). Si p_call_line_ids est fourni, impute à ces lignes dans l'ordre donné.
-- NE POSTE PAS le grand livre : elle alimente UNIQUEMENT payment_allocations. La mise à jour de
--   call_for_funds_lines.amount_paid puis des statuts est faite par la CHAÎNE DE TRIGGERS
--   (trg_allocation_update_line -> trg_call_line_status_sync). Le bloc legacy de « recalage statut »
--   (UPDATE call_for_funds SET status) est SUPPRIMÉ : il doublait ces triggers (correction §5).
-- SECURITY INVOKER (exception déclarée) : gouvernée par la RLS de l'appelant ; pas de garde
--   in-function. REVOKE anon, GRANT authenticated+service_role (ses appelants — post_owner_payment —
--   évaluent les helpers HORS contexte DEFINER, d'où le service_role explicite, cf. 0023).
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

  if p_call_line_ids is null then
    -- FIFO automatique sur les lignes impayées du lot, filtré par nature optionnelle.
    for v_line in
      select cfl.id, cfl.amount_due - cfl.amount_paid as remaining
      from public.call_for_funds_lines cfl
      join public.call_for_funds cf on cf.id = cfl.call_id
      left join public.budgets b on b.id = cf.budget_id
      where cfl.lot_id = v_payment.lot_id
        and cfl.copro_id = v_copro_id
        and cfl.status <> 'paid'
        and cf.status <> 'cancelled'
        and (p_nature_filter is null or coalesce(b.budget_type::text, 'current') = p_nature_filter)
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
  else
    -- Imputation ciblée : lignes désignées, dans l'ordre du tableau, même garde nature/lot/copro.
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
  end if;

  -- PAS de recalage manuel du statut d'appel ici : la chaîne de triggers s'en charge
  -- (trg_allocation_update_line met amount_paid à jour -> trg_call_line_status_sync fixe les statuts).
  return;
end;
$$;
revoke execute on function public.allocate_payment(uuid, uuid[], text) from public, anon;
grant execute on function public.allocate_payment(uuid, uuid[], text) to authenticated, service_role;


-- ============================================================================================
-- G. post_budget_call_for_funds(10 args) -> jsonb   [G-MGR]   — APPEL DE FONDS AGRÉGÉ
-- ============================================================================================
-- Émet UN appel agrégé multi-clés à partir d'un budget : 1 ligne par (lot × clé), écriture GL
--   D 450-x/lot (agrégé toutes clés) · C 701 (courant) / 702 (travaux) / 105 (ALUR, réserve art.14-2 II).
-- Répartition « plus grand reste » (arrondi cumulatif par télescopage) à 2 niveaux :
--   - entre échéances (si p_installment_index/count fournis) : montant_i = round(B·i/N) − round(B·(i−1)/N) ;
--   - entre lots d'une clé : part = round(T·cw/W) − round(T·(cw−w)/W) (cw = poids cumulé).
--   Garantie : Σ(toutes lignes) = total appelé, au centime près (l'invariant trg_validate_call_total passe).
-- Garde G-MGR (is_service_call OU user_is_copro_manager) — le legacy n'en avait pas (correction §3).
-- ledger_tx_id renseigné après auto-post (trg_cff_ledger_required satisfait : status='issued' ⇒ tx NOT NULL).
-- Corps legacy de référence : cr8_appel_largest_remainder (10-args, plus-grand-reste).
create or replace function public.post_budget_call_for_funds(
  p_copro_id          uuid,
  p_period_id         uuid,
  p_budget_id         uuid,
  p_label             text,
  p_trimester         integer,
  p_issue_date        date,
  p_due_date          date,
  p_fraction          numeric default 1.0,
  p_installment_index integer default null,
  p_installment_count integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nature      text;
  v_debit_acct  uuid;
  v_credit_code text;
  v_credit_acct uuid;
  v_call_id     uuid;
  v_key         record;
  v_total       numeric := 0;
  v_entries     jsonb;
  v_ltx         jsonb;
  v_tx_id       uuid;
  v_nb_lines    integer;
  v_use_inst    boolean := (p_installment_index is not null and p_installment_count is not null);
begin
  -- Garde G-MGR (defense en profondeur : create_ledger_transaction la repose aussi).
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: manager required for copro %', p_copro_id
      using errcode = '42501';
  end if;

  if v_use_inst then
    if p_installment_count <= 0 or p_installment_index < 1 or p_installment_index > p_installment_count then
      raise exception 'post_budget_call_for_funds: échéance %/% invalide', p_installment_index, p_installment_count
        using errcode = '23514';
    end if;
  elsif p_fraction is null or p_fraction <= 0 then
    raise exception 'post_budget_call_for_funds: fraction doit être > 0 (reçu %)', p_fraction
      using errcode = '23514';
  end if;
  if p_budget_id is null then
    raise exception 'post_budget_call_for_funds: budget_id requis'
      using errcode = '23514';
  end if;

  -- Nature du budget -> compte tiers débiteur (450-x) + contrepartie (701/702/105).
  select budget_type::text into v_nature
  from public.budgets where id = p_budget_id and copro_id = p_copro_id;
  if v_nature is null then
    raise exception 'post_budget_call_for_funds: budget % introuvable pour la copro %', p_budget_id, p_copro_id
      using errcode = '23503';
  end if;

  v_debit_acct := public.resolve_lot_tiers_account(p_copro_id, v_nature);

  v_credit_code := case v_nature
    when 'current' then '701'
    when 'works'   then '702'
    when 'alur'    then '105'
    else '701'
  end;
  select id into v_credit_acct
  from public.accounts where copro_id = p_copro_id and code = v_credit_code;
  if v_credit_acct is null then
    raise exception 'post_budget_call_for_funds: compte de contrepartie % introuvable pour la copro %', v_credit_code, p_copro_id
      using errcode = '23503';
  end if;

  -- Garde-fou : chaque clé utilisée par le budget doit être complète (sinon ventilation fausse).
  for v_key in
    select distinct bl.repartition_key_id as key_id
    from public.budget_lines bl
    where bl.budget_id = p_budget_id and bl.repartition_key_id is not null
  loop
    if not public.repartition_key_is_complete(v_key.key_id) then
      raise exception 'post_budget_call_for_funds: clé de répartition % incomplète — émission bloquée', v_key.key_id
        using errcode = '23514';
    end if;
  end loop;

  -- Total à appeler = Σ des montants-cible par clé (arrondi cumulatif inter-échéances).
  with budget_by_key as (
    select bl.repartition_key_id as key_id, sum(bl.amount) as amount
    from public.budget_lines bl
    where bl.budget_id = p_budget_id and bl.repartition_key_id is not null
    group by bl.repartition_key_id
  ),
  key_totals as (
    select key_id, sum(weight) as total_weight from public.repartition_key_lines group by key_id
  )
  select coalesce(sum(
    case when v_use_inst
      then round(bbk.amount * p_installment_index::numeric / p_installment_count, 2)
         - round(bbk.amount * (p_installment_index - 1)::numeric / p_installment_count, 2)
      else round(p_fraction * bbk.amount, 2)
    end
  ), 0)
  into v_total
  from budget_by_key bbk
  join key_totals kt on kt.key_id = bbk.key_id and kt.total_weight > 0;

  if v_total <= 0 then
    raise exception 'post_budget_call_for_funds: budget % sans montant à appeler (lignes/clés manquantes ?)', p_budget_id
      using errcode = '23514';
  end if;

  -- En-tête de l'appel (clé NULL = agrégé ; status 'issued' dès l'émission).
  insert into public.call_for_funds (
    copro_id, period_id, budget_id, repartition_key_id, label, trimester,
    issue_date, due_date, total_amount, status, issued_at
  ) values (
    p_copro_id, p_period_id, p_budget_id, null, p_label, p_trimester,
    p_issue_date, p_due_date, v_total, 'issued', now()
  )
  returning id into v_call_id;

  -- Lignes par (lot × clé) en arrondi cumulatif : Σ lots = cible par clé exactement.
  insert into public.call_for_funds_lines (copro_id, call_id, lot_id, amount_due, repartition_key_id, weight_snapshot)
  select p_copro_id, v_call_id, x.lot_id, x.amount, x.key_id, x.weight
  from (
    with budget_by_key as (
      select bl.repartition_key_id as key_id, sum(bl.amount) as amount
      from public.budget_lines bl
      where bl.budget_id = p_budget_id and bl.repartition_key_id is not null
      group by bl.repartition_key_id
    ),
    key_totals as (
      select key_id, sum(weight) as total_weight from public.repartition_key_lines group by key_id
    ),
    target as (
      select bbk.key_id, bbk.amount,
        case when v_use_inst
          then round(bbk.amount * p_installment_index::numeric / p_installment_count, 2)
             - round(bbk.amount * (p_installment_index - 1)::numeric / p_installment_count, 2)
          else round(p_fraction * bbk.amount, 2)
        end as target_amount
      from budget_by_key bbk
    ),
    lot_cw as (
      select rkl.key_id, rkl.lot_id, rkl.weight,
        sum(rkl.weight) over (partition by rkl.key_id order by rkl.lot_id rows unbounded preceding) as cw
      from public.repartition_key_lines rkl
    )
    select lc.lot_id, t.key_id, lc.weight,
      round(t.target_amount * lc.cw / kt.total_weight, 2)
      - round(t.target_amount * (lc.cw - lc.weight) / kt.total_weight, 2) as amount
    from target t
    join key_totals kt on kt.key_id = t.key_id and kt.total_weight > 0
    join lot_cw lc      on lc.key_id = t.key_id
  ) x
  where x.amount > 0;

  -- Écriture GL : D 450-x par LOT (agrégé toutes clés) / C 701·702·105 au total.
  select jsonb_agg(jsonb_build_object(
    'account_id', v_debit_acct, 'lot_id', s.lot_id, 'direction', 'debit',
    'amount', s.lot_amount, 'entry_label', 'Appel : ' || p_label
  )) into v_entries
  from (
    select lot_id, sum(amount_due) as lot_amount
    from public.call_for_funds_lines where call_id = v_call_id
    group by lot_id
  ) s;

  v_entries := v_entries || jsonb_build_array(jsonb_build_object(
    'account_id', v_credit_acct, 'direction', 'credit', 'amount', v_total, 'entry_label', 'Appel : ' || p_label
  ));

  v_ltx := public.create_ledger_transaction(
    p_copro_id, p_period_id, p_issue_date, 'Appel de fonds : ' || p_label,
    'call_for_funds', v_call_id, v_entries, true
  );
  if not (v_ltx->>'success')::boolean then
    raise exception 'post_budget_call_for_funds: échec écriture grand livre : %', v_ltx->>'error'
      using errcode = '23514';
  end if;
  v_tx_id := (v_ltx->>'tx_id')::uuid;
  update public.call_for_funds set ledger_tx_id = v_tx_id where id = v_call_id;

  select count(*) into v_nb_lines from public.call_for_funds_lines where call_id = v_call_id;

  return jsonb_build_object(
    'success', true, 'call_id', v_call_id, 'ledger_tx_id', v_tx_id,
    'total_amount', v_total, 'nb_lines', v_nb_lines, 'nature', v_nature
  );
end;
$$;
revoke execute on function public.post_budget_call_for_funds(uuid, uuid, uuid, text, integer, date, date, numeric, integer, integer) from public, anon;
grant execute on function public.post_budget_call_for_funds(uuid, uuid, uuid, text, integer, date, date, numeric, integer, integer) to authenticated, service_role;


-- ============================================================================================
-- H. post_owner_payment(10 args) -> jsonb   [G-MGR]   — ENCAISSEMENT COPROPRIÉTAIRE
-- ============================================================================================
-- Encaisse un règlement copropriétaire (lot-centric) : INSERT payments (idempotent via
--   p_idempotency_key + ON CONFLICT atomique), imputation FIFO cloisonnée par nature (allocate_payment),
--   puis écriture GL D 512 (banque) / C 450-x par nature des appels lettrés ; le trop-perçu va en
--   450-3 (avances). lot_id obligatoire sur chaque crédit 450-x (filet 0024).
-- Idempotence : si la clé a déjà servi, on ne rejoue rien et on renvoie {idempotent_replay:true}.
-- Garde G-MGR (branche is_service_call pour import/CI). p_method DEFAULT 'transfer' (correction §1 :
--   'bank_transfer' n'existe pas dans l'enum payment_method). p_idempotency_key TEXT (colonne cible TEXT).
-- Corps legacy de référence : lot1_v3_nature_filter_optional (10-args, filtre nature) + cr5 (idempotence).
create or replace function public.post_owner_payment(
  p_copro_id        uuid,
  p_period_id       uuid,
  p_lot_id          uuid,
  p_amount          numeric,
  p_payment_date    date,
  p_method          text    default 'transfer',
  p_reference       text    default null,
  p_call_line_ids   uuid[]  default null,
  p_idempotency_key text    default null,
  p_nature_filter   text    default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_acct512     uuid;
  v_payment_id  uuid;
  v_allocated   numeric := 0;
  v_overpay     numeric;
  v_entries     jsonb := '[]'::jsonb;
  v_ltx         jsonb;
  v_tx_id       uuid;
  v_existing_id uuid;
  v_existing_tx uuid;
  r             record;
begin
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: manager required for copro %', p_copro_id
      using errcode = '42501';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'post_owner_payment: le montant doit être positif (reçu %)', p_amount
      using errcode = '23514';
  end if;

  select id into v_acct512 from public.accounts where copro_id = p_copro_id and code = '512';
  if v_acct512 is null then
    raise exception 'post_owner_payment: compte 512 (Banque) introuvable pour la copro %', p_copro_id
      using errcode = '23503';
  end if;

  -- Idempotence atomique : clé déjà utilisée -> aucun INSERT (protège des retries/onglets concurrents).
  insert into public.payments (copro_id, period_id, lot_id, amount, payment_date, method, reference, status, idempotency_key)
  values (p_copro_id, p_period_id, p_lot_id, p_amount, p_payment_date, p_method::payment_method, p_reference, 'recorded', p_idempotency_key)
  on conflict (copro_id, idempotency_key) where idempotency_key is not null do nothing
  returning id into v_payment_id;

  if v_payment_id is null then
    select id, ledger_tx_id into v_existing_id, v_existing_tx
    from public.payments where copro_id = p_copro_id and idempotency_key = p_idempotency_key;
    return jsonb_build_object(
      'success', true, 'payment_id', v_existing_id,
      'ledger_tx_id', v_existing_tx, 'idempotent_replay', true
    );
  end if;

  -- Imputation FIFO (alimente payment_allocations ; amount_paid + statuts via la chaîne de triggers).
  perform public.allocate_payment(v_payment_id, p_call_line_ids, p_nature_filter);

  -- Crédits 450-x regroupés par nature, depuis les allocations de CE paiement.
  for r in
    select coalesce(b.budget_type::text, 'current') as nature, sum(pa.amount_allocated) as amt
    from public.payment_allocations pa
    join public.call_for_funds_lines cfl on cfl.id = pa.call_line_id
    join public.call_for_funds cf on cf.id = cfl.call_id
    left join public.budgets b on b.id = cf.budget_id
    where pa.payment_id = v_payment_id
    group by coalesce(b.budget_type::text, 'current')
  loop
    v_allocated := v_allocated + r.amt;
    v_entries := v_entries || jsonb_build_array(jsonb_build_object(
      'account_id', public.resolve_lot_tiers_account(p_copro_id, r.nature),
      'lot_id', p_lot_id, 'direction', 'credit', 'amount', r.amt,
      'entry_label', 'Règlement copropriétaire'
    ));
  end loop;

  -- Trop-perçu -> 450-3 (avances).
  v_overpay := round(p_amount - v_allocated, 2);
  if v_overpay > 0 then
    v_entries := v_entries || jsonb_build_array(jsonb_build_object(
      'account_id', public.resolve_lot_tiers_account(p_copro_id, 'advance'),
      'lot_id', p_lot_id, 'direction', 'credit', 'amount', v_overpay,
      'entry_label', 'Avance / trop-perçu'
    ));
  end if;

  -- Débit banque (total encaissé).
  v_entries := v_entries || jsonb_build_array(jsonb_build_object(
    'account_id', v_acct512, 'direction', 'debit', 'amount', p_amount,
    'entry_label', 'Encaissement copropriétaire'
  ));

  v_ltx := public.create_ledger_transaction(
    p_copro_id, p_period_id, p_payment_date, 'Paiement copropriétaire', 'payment', v_payment_id, v_entries, true
  );
  if not (v_ltx->>'success')::boolean then
    raise exception 'post_owner_payment: échec écriture grand livre : %', v_ltx->>'error'
      using errcode = '23514';
  end if;
  v_tx_id := (v_ltx->>'tx_id')::uuid;
  update public.payments set ledger_tx_id = v_tx_id where id = v_payment_id;

  return jsonb_build_object(
    'success', true, 'payment_id', v_payment_id, 'ledger_tx_id', v_tx_id,
    'allocated', v_allocated, 'overpayment', greatest(v_overpay, 0)
  );
end;
$$;
revoke execute on function public.post_owner_payment(uuid, uuid, uuid, numeric, date, text, text, uuid[], text, text) from public, anon;
grant execute on function public.post_owner_payment(uuid, uuid, uuid, numeric, date, text, text, uuid[], text, text) to authenticated, service_role;


-- ============================================================================================
-- I. post_supplier_invoice(14 args) -> jsonb   [G-MGR]   — FACTURE FOURNISSEUR (B EN 2 TEMPS)
-- ============================================================================================
-- Saisit une facture fournisseur + ses lignes de ventilation, puis (optionnellement) la comptabilise :
--   - p_post_immediately=false : facture 'draft', AUCUNE écriture GL (saisie / brouillon) ;
--   - p_post_immediately=true  : facture 'posted', écriture D 6xx (une par ligne) / C 401 (total).
--   TVA portée sur la pièce (montant_ht/tva/taux) ; montant des lignes = TTC (TVA non récupérable en copro).
-- Adaptations schéma cible (correction §2) : colonnes tiers_id (ex supplier_id) et service_order_id
--   (ex related_service_order_id). Garde G-MGR ajoutée (correction §3). Corps legacy : wp1_finance_rpcs.
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

  -- En-tête (colonnes cible : tiers_id, service_order_id).
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

  -- Lignes de ventilation (montant TTC + métadonnées TVA optionnelles).
  insert into public.supplier_invoice_lines (
    copro_id, invoice_id, account_id, label, amount,
    repartition_key_id, budget_line_id, amount_ht, amount_tva, taux_pct
  )
  select
    p_copro_id, v_invoice_id, (l->>'account_id')::uuid, l->>'label', (l->>'amount')::numeric,
    nullif(l->>'repartition_key_id','')::uuid, nullif(l->>'budget_line_id','')::uuid,
    nullif(l->>'amount_ht','')::numeric, nullif(l->>'amount_tva','')::numeric, nullif(l->>'taux_pct','')::numeric
  from jsonb_array_elements(p_lines) l;

  -- Comptabilisation immédiate : D 6xx (par ligne) / C 401 (total).
  if p_post_immediately then
    select id into v_acct401 from public.accounts where copro_id = p_copro_id and code = '401';
    if v_acct401 is null then
      raise exception 'post_supplier_invoice: compte 401 (Fournisseurs) introuvable pour la copro %', p_copro_id
        using errcode = '23503';
    end if;

    select jsonb_agg(jsonb_build_object(
      'account_id', (l->>'account_id')::uuid,
      'direction', 'debit',
      'amount', (l->>'amount')::numeric,
      'entry_label', coalesce(l->>'label', p_label)
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
-- J. post_supplier_payment(8 args) -> jsonb   [G-MGR]   — RÈGLEMENT FOURNISSEUR (IDEMPOTENT)
-- ============================================================================================
-- Règle (tout ou partie) une facture fournisseur 'posted'/'paid' : INSERT supplier_payments
--   (idempotent via p_idempotency_key + ON CONFLICT atomique), écriture GL D 401 (dette diminue) /
--   C 512 (banque diminue). La facture passe à 'paid' quand Σ paiements >= total (±0,01) — via le
--   trigger update_supplier_invoice_status_after_payment, recalage idempotent ici en complément.
-- Garde G-MGR ajoutée (correction §3). p_method DEFAULT 'transfer' (correction §1). p_idempotency_key
--   TEXT (colonne cible TEXT). Corps legacy de référence : cr5 (8-args idempotente).
create or replace function public.post_supplier_payment(
  p_copro_id            uuid,
  p_period_id           uuid,
  p_supplier_invoice_id uuid,
  p_amount              numeric,
  p_payment_date        date,
  p_method              text default 'transfer',
  p_reference           text default null,
  p_idempotency_key     text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv         record;
  v_acct401     uuid;
  v_acct512     uuid;
  v_payment_id  uuid;
  v_paid        numeric;
  v_entries     jsonb;
  v_ltx         jsonb;
  v_tx_id       uuid;
  v_existing_id uuid;
  v_existing_tx uuid;
begin
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: manager required for copro %', p_copro_id
      using errcode = '42501';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'post_supplier_payment: le montant doit être positif (reçu %)', p_amount
      using errcode = '23514';
  end if;

  select * into v_inv from public.supplier_invoices where id = p_supplier_invoice_id;
  if not found then
    raise exception 'post_supplier_payment: facture % introuvable', p_supplier_invoice_id
      using errcode = '23503';
  end if;
  if v_inv.status::text not in ('posted', 'paid') then
    raise exception 'post_supplier_payment: la facture doit être comptabilisée (posted) avant paiement (statut=%)', v_inv.status
      using errcode = '23514';
  end if;

  select id into v_acct401 from public.accounts where copro_id = p_copro_id and code = '401';
  select id into v_acct512 from public.accounts where copro_id = p_copro_id and code = '512';
  if v_acct401 is null or v_acct512 is null then
    raise exception 'post_supplier_payment: comptes 401/512 manquants pour la copro %', p_copro_id
      using errcode = '23503';
  end if;

  -- Idempotence atomique : clé déjà utilisée -> renvoie le paiement existant sans le rejouer.
  insert into public.supplier_payments (copro_id, period_id, supplier_invoice_id, payment_date, amount, method, reference, idempotency_key)
  values (p_copro_id, p_period_id, p_supplier_invoice_id, p_payment_date, p_amount, p_method::payment_method, p_reference, p_idempotency_key)
  on conflict (copro_id, idempotency_key) where idempotency_key is not null do nothing
  returning id into v_payment_id;

  if v_payment_id is null then
    select id, ledger_tx_id into v_existing_id, v_existing_tx
    from public.supplier_payments where copro_id = p_copro_id and idempotency_key = p_idempotency_key;
    return jsonb_build_object(
      'success', true, 'payment_id', v_existing_id,
      'ledger_tx_id', v_existing_tx, 'idempotent_replay', true
    );
  end if;

  v_entries := jsonb_build_array(
    jsonb_build_object('account_id', v_acct401, 'direction', 'debit',  'amount', p_amount, 'entry_label', 'Règlement fournisseur'),
    jsonb_build_object('account_id', v_acct512, 'direction', 'credit', 'amount', p_amount, 'entry_label', 'Décaissement banque')
  );

  v_ltx := public.create_ledger_transaction(
    p_copro_id, p_period_id, p_payment_date, 'Paiement fournisseur', 'supplier_payment', v_payment_id, v_entries, true
  );
  if not (v_ltx->>'success')::boolean then
    raise exception 'post_supplier_payment: échec écriture grand livre : %', v_ltx->>'error'
      using errcode = '23514';
  end if;
  v_tx_id := (v_ltx->>'tx_id')::uuid;
  update public.supplier_payments set ledger_tx_id = v_tx_id where id = v_payment_id;

  -- Statut facture (le trigger le fait déjà ; recalage idempotent en complément).
  v_paid := public.get_supplier_invoice_paid_amount(p_supplier_invoice_id);
  if v_paid >= v_inv.total_amount - 0.01 then
    update public.supplier_invoices set status = 'paid'
    where id = p_supplier_invoice_id and status <> 'paid';
  end if;

  return jsonb_build_object(
    'success', true, 'payment_id', v_payment_id, 'ledger_tx_id', v_tx_id,
    'invoice_status', case when v_paid >= v_inv.total_amount - 0.01 then 'paid' else 'posted' end
  );
end;
$$;
revoke execute on function public.post_supplier_payment(uuid, uuid, uuid, numeric, date, text, text, text) from public, anon;
grant execute on function public.post_supplier_payment(uuid, uuid, uuid, numeric, date, text, text, text) to authenticated, service_role;


-- ============================================================================================
-- K1. submit_budget(p_budget_id) -> jsonb   [G-MGR]   — draft -> submitted (SANS GL)
-- ============================================================================================
-- Machine à état budget (étape 1) : passe un budget 'draft' à 'submitted' (soumis pour validation).
--   Pré-conditions : ≥1 ligne budgétaire ET toutes les clés utilisées sont complètes
--   (repartition_key_is_complete). Aucune écriture comptable (le budget voté ne touche pas le GL).
-- Copro DÉRIVÉE du budget avant la garde G-MGR (p_budget_id seul argument). VOLATILE.
create or replace function public.submit_budget(p_budget_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_budget    record;
  v_nb_lines  integer;
  v_key       record;
begin
  select * into v_budget from public.budgets where id = p_budget_id;
  if not found then
    raise exception 'submit_budget: budget % introuvable', p_budget_id
      using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_budget.copro_id) then
    raise exception 'forbidden: manager required for copro %', v_budget.copro_id
      using errcode = '42501';
  end if;

  if v_budget.status <> 'draft' then
    raise exception 'submit_budget: transition invalide depuis le statut % (attendu draft)', v_budget.status
      using errcode = '23514';
  end if;

  select count(*) into v_nb_lines from public.budget_lines where budget_id = p_budget_id;
  if v_nb_lines = 0 then
    raise exception 'submit_budget: le budget % ne contient aucune ligne', p_budget_id
      using errcode = '23514';
  end if;

  for v_key in
    select distinct bl.repartition_key_id as key_id
    from public.budget_lines bl
    where bl.budget_id = p_budget_id and bl.repartition_key_id is not null
  loop
    if not public.repartition_key_is_complete(v_key.key_id) then
      raise exception 'submit_budget: clé de répartition % incomplète — soumission bloquée', v_key.key_id
        using errcode = '23514';
    end if;
  end loop;

  update public.budgets set status = 'submitted' where id = p_budget_id;

  return jsonb_build_object('success', true, 'budget_id', p_budget_id, 'status', 'submitted');
end;
$$;
revoke execute on function public.submit_budget(uuid) from public, anon;
grant execute on function public.submit_budget(uuid) to authenticated, service_role;


-- ============================================================================================
-- K2. validate_budget(p_budget_id) -> jsonb   [G-MGR]   — draft/submitted -> validated (SANS GL)
-- ============================================================================================
-- Machine à état budget (étape 2) : passe un budget 'draft'/'submitted' à 'validated' (budget actif).
--   Pré-conditions : période OUVERTE (on n'active pas un budget sur une période close/approuvée) ET
--   unicité « un seul validé par copro×période×type » (le UNIQUE partiel uq_budget_one_validated la
--   garantit aussi en base — contrôle applicatif explicite ici pour un message clair). Renseigne
--   validated_by / validated_at. Aucune écriture comptable. Copro dérivée du budget avant la garde.
create or replace function public.validate_budget(p_budget_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_budget        record;
  v_period_status period_status;
  v_already       uuid;
begin
  select * into v_budget from public.budgets where id = p_budget_id;
  if not found then
    raise exception 'validate_budget: budget % introuvable', p_budget_id
      using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_budget.copro_id) then
    raise exception 'forbidden: manager required for copro %', v_budget.copro_id
      using errcode = '42501';
  end if;

  if v_budget.status not in ('draft', 'submitted') then
    raise exception 'validate_budget: transition invalide depuis le statut % (attendu draft/submitted)', v_budget.status
      using errcode = '23514';
  end if;

  select status into v_period_status
  from public.accounting_periods where id = v_budget.period_id;
  if v_period_status is null then
    raise exception 'validate_budget: période % introuvable', v_budget.period_id
      using errcode = '23503';
  end if;
  if v_period_status <> 'open' then
    raise exception 'validate_budget: période % non ouverte (statut=%) — validation interdite', v_budget.period_id, v_period_status
      using errcode = '23514';
  end if;

  -- Unicité « un seul validé par copro×période×type » (le UNIQUE partiel la garantit aussi).
  select id into v_already
  from public.budgets
  where copro_id = v_budget.copro_id
    and period_id = v_budget.period_id
    and budget_type = v_budget.budget_type
    and status = 'validated'
    and id <> p_budget_id;
  if v_already is not null then
    raise exception 'validate_budget: un budget % est déjà validé pour cette période (copro %, type %)', v_already, v_budget.copro_id, v_budget.budget_type
      using errcode = '23514';
  end if;

  update public.budgets
  set status = 'validated',
      validated_by = auth.uid(),
      validated_at = now()
  where id = p_budget_id;

  return jsonb_build_object('success', true, 'budget_id', p_budget_id, 'status', 'validated');
end;
$$;
revoke execute on function public.validate_budget(uuid) from public, anon;
grant execute on function public.validate_budget(uuid) to authenticated, service_role;


-- ============================================================================================
-- ============================================================================================
-- SECTION TRIGGERS — intégrité des appels, allocations, factures et paiements fournisseurs
-- ============================================================================================
-- ============================================================================================
-- Toutes les fonctions trigger : SECURITY DEFINER + set search_path = public ;
--   REVOKE EXECUTE FROM public, anon, authenticated (jamais appelées directement).


-- ============================================================================================
-- L1. tr_validate_payment_allocation()  (BEFORE I/U sur payment_allocations) — anti SUR-imputation
-- ============================================================================================
-- Garde-fou d'imputation : (1) la ligne d'appel existe et appartient à la MÊME copro que le paiement ;
--   (2) Σ allocations du PAIEMENT (y compris la nouvelle) <= payments.amount (tolérance 0,01) ;
--   (3) auto-renseigne copro_id si absent, sinon vérifie sa cohérence. Le plafond « Σ alloc <= amount_due
--   de la ligne » est porté par le CHECK ck_call_line_amounts (amount_paid <= amount_due, 0016) une fois
--   amount_paid recalculé par trg_allocation_update_line — cette garde-ci borne le côté PAIEMENT.
-- BEFORE (peut modifier NEW.copro_id). Corps legacy (action3), RAISE %.2f -> % (correction §6).
create or replace function public.tr_validate_payment_allocation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_amount    numeric(14,2);
  v_payment_copro_id  uuid;
  v_already_allocated numeric(14,2);
  v_new_total         numeric(14,2);
  v_line_copro_id     uuid;
  v_tolerance         numeric := 0.01;
begin
  select amount, copro_id into v_payment_amount, v_payment_copro_id
  from public.payments where id = new.payment_id;
  if v_payment_amount is null then
    raise exception 'tr_validate_payment_allocation: paiement % introuvable', new.payment_id
      using errcode = '23503';
  end if;

  if new.amount_allocated <= 0 then
    raise exception 'tr_validate_payment_allocation: montant alloué doit être positif (reçu %)', new.amount_allocated
      using errcode = '23514';
  end if;

  select copro_id into v_line_copro_id
  from public.call_for_funds_lines where id = new.call_line_id;
  if v_line_copro_id is null then
    raise exception 'tr_validate_payment_allocation: ligne d''appel % introuvable', new.call_line_id
      using errcode = '23503';
  end if;
  if v_line_copro_id <> v_payment_copro_id then
    raise exception 'tr_validate_payment_allocation: imputation inter-copro interdite (paiement % vs ligne %)', v_payment_copro_id, v_line_copro_id
      using errcode = '23514';
  end if;

  -- Σ déjà alloué sur le paiement, hors l'allocation courante si UPDATE.
  if tg_op = 'INSERT' then
    select coalesce(sum(amount_allocated), 0) into v_already_allocated
    from public.payment_allocations where payment_id = new.payment_id;
  else
    select coalesce(sum(amount_allocated), 0) - old.amount_allocated into v_already_allocated
    from public.payment_allocations where payment_id = new.payment_id;
  end if;

  v_new_total := v_already_allocated + new.amount_allocated;
  if v_new_total > v_payment_amount + v_tolerance then
    raise exception 'tr_validate_payment_allocation: sur-imputation (alloue % alors que le paiement vaut %, déjà alloué %)', new.amount_allocated, v_payment_amount, v_already_allocated
      using errcode = '23514';
  end if;

  -- copro_id : auto-renseigné si absent, sinon cohérence vérifiée.
  if new.copro_id is null then
    new.copro_id := v_payment_copro_id;
  elsif new.copro_id <> v_payment_copro_id then
    raise exception 'tr_validate_payment_allocation: copro_id incohérent (% != %)', new.copro_id, v_payment_copro_id
      using errcode = '23514';
  end if;

  return new;
end;
$$;
create trigger trg_validate_payment_allocation
  before insert or update of amount_allocated on public.payment_allocations
  for each row execute function public.tr_validate_payment_allocation();
revoke execute on function public.tr_validate_payment_allocation() from public, anon, authenticated;


-- ============================================================================================
-- L2. tr_allocation_update_line()  (AFTER I/U/D sur payment_allocations) — recalcul amount_paid
-- ============================================================================================
-- Après toute mutation d'allocation, recalcule call_for_funds_lines.amount_paid = Σ amount_allocated
--   de la ligne concernée. L'UPDATE de amount_paid déclenche ENSUITE trg_call_line_status_sync (statut
--   ligne + propagation en-tête). DELETE : on retrouve la ligne via OLD. AFTER. Corps legacy (action2).
create or replace function public.tr_allocation_update_line()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_line_id  uuid;
  v_new_paid numeric;
begin
  if tg_op = 'DELETE' then
    v_line_id := old.call_line_id;
  else
    v_line_id := new.call_line_id;
  end if;

  select coalesce(sum(amount_allocated), 0) into v_new_paid
  from public.payment_allocations where call_line_id = v_line_id;

  update public.call_for_funds_lines
  set amount_paid = v_new_paid
  where id = v_line_id
    and amount_paid is distinct from v_new_paid;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
create trigger trg_allocation_update_line
  after insert or update of amount_allocated or delete on public.payment_allocations
  for each row execute function public.tr_allocation_update_line();
revoke execute on function public.tr_allocation_update_line() from public, anon, authenticated;


-- ============================================================================================
-- L3. tr_call_line_status_sync()  (AFTER I/U/D sur call_for_funds_lines) — statut ligne + en-tête
-- ============================================================================================
-- FUSION des 2 triggers concurrents (blueprint §4, verrou A6/A18) :
--   (1) fixe call_for_funds_lines.status selon amount_paid/amount_due (paid / partial / unpaid) ;
--   (2) propage à l'en-tête via update_call_status(call_id).
-- ANTI-RÉCURSION INFINIE : le trigger est AFTER et met à jour la MÊME table (status), donc il se
--   re-déclenche. On borne par « UPDATE ... WHERE id = NEW.id AND status IS DISTINCT FROM v_computed » :
--   au 1er passage le statut change (1 re-déclenchement), au 2e passage status == v_computed -> le WHERE
--   ne matche RIEN -> aucun 3e passage. update_call_status est idempotent (ne réécrit l'en-tête que si
--   changement). DELETE : NEW est NULL -> on retrouve call_id via OLD, on resynchronise juste l'en-tête.
-- AFTER (lit amount_paid déjà committé sur la ligne). SECURITY DEFINER + search_path.
create or replace function public.tr_call_line_status_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_computed call_line_status;
  v_call_id  uuid;
begin
  if tg_op = 'DELETE' then
    -- La ligne a disparu : pas de statut de ligne à fixer, on resynchronise l'en-tête.
    perform public.update_call_status(old.call_id);
    return old;
  end if;

  -- (1) Statut de la ligne dérivé de amount_paid / amount_due.
  --     amount_due = 0 (ligne sans reste à appeler) => 'paid' d'emblée : aligne le mapping sur le
  --     legacy (update_call_line_status) et supprime la dépendance au filtre x.amount>0 du posteur
  --     d'appel (une ligne à 0 insérée par un autre chemin ne fige pas l'en-tête en 'partially_paid').
  if new.amount_due = 0 or new.amount_paid >= new.amount_due then
    v_computed := 'paid';
  elsif new.amount_paid > 0 then
    v_computed := 'partial';
  else
    v_computed := 'unpaid';
  end if;

  -- Garde anti-récursion : on n'écrit (et ne re-déclenche) que si le statut change réellement.
  if new.status is distinct from v_computed then
    update public.call_for_funds_lines
    set status = v_computed
    where id = new.id
      and status is distinct from v_computed;
  end if;

  -- (2) Propagation à l'en-tête (idempotente).
  v_call_id := new.call_id;
  perform public.update_call_status(v_call_id);

  return new;
end;
$$;
create trigger trg_call_line_status_sync
  after insert or update of amount_paid, amount_due, status or delete on public.call_for_funds_lines
  for each row execute function public.tr_call_line_status_sync();
revoke execute on function public.tr_call_line_status_sync() from public, anon, authenticated;


-- ============================================================================================
-- L4. tr_validate_call_total()  (CONSTRAINT TRIGGER DEFERRED, AFTER I/U sur call_for_funds_lines)
-- ============================================================================================
-- Invariant : Σ(amount_due) des lignes d'un appel == call_for_funds.total_amount (tolérance 0,01).
--   CONSTRAINT TRIGGER DEFERRABLE INITIALLY DEFERRED : vérifié au COMMIT, quand toutes les lignes de
--   l'appel sont posées (un contrôle ligne par ligne casserait l'invariant transitoirement).
--   En AFTER, la table reflète déjà l'opération -> on somme l'état courant (pas de ré-ajout NEW/OLD).
--   Appel disparu (cascade delete) : on laisse passer. Corps legacy (action1), RAISE %.2f -> %.
create or replace function public.tr_validate_call_total()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_call_id        uuid;
  v_expected_total numeric(14,2);
  v_lines_total    numeric(14,2);
  v_tolerance      numeric := 0.01;
begin
  if tg_op = 'DELETE' then
    v_call_id := old.call_id;
  else
    v_call_id := new.call_id;
  end if;

  -- FOR UPDATE : verrou de l'en-tête (durcissement legacy) contre une course entre deux transactions
  -- modifiant simultanément total_amount et les lignes du même appel en accès direct.
  select total_amount into v_expected_total from public.call_for_funds where id = v_call_id for update;
  if v_expected_total is null then
    return null; -- appel supprimé en cascade : rien à vérifier.
  end if;

  select coalesce(sum(amount_due), 0) into v_lines_total
  from public.call_for_funds_lines where call_id = v_call_id;

  -- On tolère une suppression totale (reset) : pas de contrôle si plus aucune ligne sur un DELETE.
  if tg_op <> 'DELETE' or v_lines_total > v_tolerance then
    if abs(v_lines_total - v_expected_total) > v_tolerance then
      raise exception 'tr_validate_call_total: Σ lignes (%) != total appel (%) pour l''appel % (écart %)', v_lines_total, v_expected_total, v_call_id, abs(v_lines_total - v_expected_total)
        using errcode = '23514';
    end if;
  end if;

  return null;
end;
$$;
create constraint trigger trg_validate_call_total
  after insert or update of amount_due or delete on public.call_for_funds_lines
  deferrable initially deferred
  for each row execute function public.tr_validate_call_total();
revoke execute on function public.tr_validate_call_total() from public, anon, authenticated;


-- ============================================================================================
-- L5. tr_cff_ledger_required()  (CONSTRAINT TRIGGER DEFERRED, AFTER I/U sur call_for_funds)
-- ============================================================================================
-- NOUVEAU (blueprint §1.4/§4) : matérialise « chaque opération génère une écriture » —
--   un appel status<>'draft' EXIGE ledger_tx_id NOT NULL. CONSTRAINT DEFERRED : la chaîne
--   post_budget_call_for_funds insère l'appel ('issued') PUIS pose ledger_tx_id dans la même
--   transaction ; le contrôle au COMMIT voit donc l'état final cohérent. Un appel 'draft' (sans
--   écriture) reste permis. AFTER. errcode 23514.
create or replace function public.tr_cff_ledger_required()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'draft' and new.ledger_tx_id is null then
    raise exception 'tr_cff_ledger_required: l''appel % (statut %) doit porter une écriture (ledger_tx_id NOT NULL)', new.id, new.status
      using errcode = '23514';
  end if;
  return null;
end;
$$;
create constraint trigger trg_cff_ledger_required
  after insert or update on public.call_for_funds
  deferrable initially deferred
  for each row execute function public.tr_cff_ledger_required();
revoke execute on function public.tr_cff_ledger_required() from public, anon, authenticated;


-- ============================================================================================
-- L6. tr_check_budget_line_copro_consistency()  (BEFORE I/U sur budget_lines)
-- ============================================================================================
-- Anti-fuite inter-copro : budget_lines.copro_id == budgets.copro_id (la ligne appartient bien à la
--   copro de son budget parent). Vérifié AVANT écriture (BEFORE). N'existe PAS en 0016 -> créé ici
--   (blueprint §4 « GARDER », déjà référencé par le domaine 02). errcode 23514.
create or replace function public.tr_check_budget_line_copro_consistency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_budget_copro uuid;
begin
  select copro_id into v_budget_copro from public.budgets where id = new.budget_id;
  if v_budget_copro is null then
    raise exception 'tr_check_budget_line_copro_consistency: budget % introuvable', new.budget_id
      using errcode = '23503';
  end if;
  if v_budget_copro <> new.copro_id then
    raise exception 'tr_check_budget_line_copro_consistency: copro_id de la ligne (%) != copro_id du budget (%)', new.copro_id, v_budget_copro
      using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger trg_check_budget_line_copro_consistency
  before insert or update on public.budget_lines
  for each row execute function public.tr_check_budget_line_copro_consistency();
revoke execute on function public.tr_check_budget_line_copro_consistency() from public, anon, authenticated;


-- ============================================================================================
-- L7. tr_validate_supplier_invoice_total()  (CONSTRAINT TRIGGER DEFERRED, AFTER I/U sur supplier_invoice_lines)
-- ============================================================================================
-- Invariant : Σ(amount) des lignes d'une facture == supplier_invoices.total_amount (tolérance 0,01).
--   CONSTRAINT DEFERRED (jumeau de tr_validate_call_total). En AFTER, on somme l'état courant sans
--   ré-ajouter NEW/OLD (correction du double-comptage live, cf. wp1_fix). Facture supprimée (cascade) :
--   on laisse passer. RAISE %.2f -> % (correction §6).
create or replace function public.tr_validate_supplier_invoice_total()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_id     uuid;
  v_expected_total numeric(14,2);
  v_lines_total    numeric(14,2);
  v_tolerance      numeric := 0.01;
begin
  if tg_op = 'DELETE' then
    v_invoice_id := old.invoice_id;
  else
    v_invoice_id := new.invoice_id;
  end if;

  -- FOR UPDATE : verrou de l'en-tête (durcissement legacy) contre une course concurrente
  -- modifiant simultanément total_amount et les lignes de la même facture en accès direct.
  select total_amount into v_expected_total from public.supplier_invoices where id = v_invoice_id for update;
  if v_expected_total is null then
    return null; -- facture supprimée en cascade : rien à vérifier.
  end if;

  select coalesce(sum(amount), 0) into v_lines_total
  from public.supplier_invoice_lines where invoice_id = v_invoice_id;

  if tg_op <> 'DELETE' or v_lines_total > v_tolerance then
    if abs(v_lines_total - v_expected_total) > v_tolerance then
      raise exception 'tr_validate_supplier_invoice_total: Σ lignes (%) != total facture (%) pour la facture % (écart %)', v_lines_total, v_expected_total, v_invoice_id, abs(v_lines_total - v_expected_total)
        using errcode = '23514';
    end if;
  end if;

  return null;
end;
$$;
create constraint trigger trg_validate_supplier_invoice_total
  after insert or update of amount or delete on public.supplier_invoice_lines
  deferrable initially deferred
  for each row execute function public.tr_validate_supplier_invoice_total();
revoke execute on function public.tr_validate_supplier_invoice_total() from public, anon, authenticated;


-- ============================================================================================
-- L8. tr_check_invoice_copro_consistency()  (BEFORE I/U sur supplier_invoices)
-- ============================================================================================
-- Anti-fuite inter-copro (blueprint 07 §4 « check_invoice_copro_consistency ») : le tiers et la
--   période d'une facture appartiennent à la MÊME copro que la facture (tiers.copro_id == copro_id ET
--   accounting_periods.copro_id == copro_id). Vérifié AVANT écriture. errcode 23514.
create or replace function public.tr_check_invoice_copro_consistency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tiers_copro  uuid;
  v_period_copro uuid;
begin
  select copro_id into v_tiers_copro from public.tiers where id = new.tiers_id;
  if v_tiers_copro is null then
    raise exception 'tr_check_invoice_copro_consistency: tiers % introuvable', new.tiers_id
      using errcode = '23503';
  end if;
  if v_tiers_copro <> new.copro_id then
    raise exception 'tr_check_invoice_copro_consistency: tiers % d''une autre copro (% != %)', new.tiers_id, v_tiers_copro, new.copro_id
      using errcode = '23514';
  end if;

  select copro_id into v_period_copro from public.accounting_periods where id = new.period_id;
  if v_period_copro is null then
    raise exception 'tr_check_invoice_copro_consistency: période % introuvable', new.period_id
      using errcode = '23503';
  end if;
  if v_period_copro <> new.copro_id then
    raise exception 'tr_check_invoice_copro_consistency: période % d''une autre copro (% != %)', new.period_id, v_period_copro, new.copro_id
      using errcode = '23514';
  end if;

  return new;
end;
$$;
create trigger trg_check_invoice_copro_consistency
  before insert or update on public.supplier_invoices
  for each row execute function public.tr_check_invoice_copro_consistency();
revoke execute on function public.tr_check_invoice_copro_consistency() from public, anon, authenticated;


-- ============================================================================================
-- L9. tr_validate_supplier_payment()  (BEFORE I/U sur supplier_payments) — anti-surpaiement
-- ============================================================================================
-- Garde-fou de règlement fournisseur : (1) la facture existe et n'est PAS draft/cancelled (on ne paie
--   pas une facture non comptabilisée ou annulée) ; (2) montant positif ; (3) Σ paiements (y compris le
--   nouveau) <= supplier_invoices.total_amount (tolérance 0,01) ; (4) auto-renseigne copro_id si absent,
--   sinon cohérence. BEFORE (peut fixer NEW.copro_id). Corps legacy (action4), RAISE %.2f -> %.
create or replace function public.tr_validate_supplier_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice     record;
  v_already_paid numeric(14,2);
  v_new_total    numeric(14,2);
  v_tolerance    numeric := 0.01;
begin
  select id, copro_id, total_amount, status into v_invoice
  from public.supplier_invoices where id = new.supplier_invoice_id;
  if v_invoice.id is null then
    raise exception 'tr_validate_supplier_payment: facture % introuvable', new.supplier_invoice_id
      using errcode = '23503';
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

  v_new_total := v_already_paid + new.amount;
  if v_new_total > v_invoice.total_amount + v_tolerance then
    raise exception 'tr_validate_supplier_payment: sur-paiement (paie % alors que la facture vaut %, déjà payé %)', new.amount, v_invoice.total_amount, v_already_paid
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
create trigger trg_validate_supplier_payment
  before insert or update of amount on public.supplier_payments
  for each row execute function public.tr_validate_supplier_payment();
revoke execute on function public.tr_validate_supplier_payment() from public, anon, authenticated;


-- ============================================================================================
-- L10. tr_update_supplier_invoice_status_after_payment()  (AFTER I/U/D sur supplier_payments)
-- ============================================================================================
-- Met à jour le statut de la facture après tout règlement : facture -> 'paid' quand Σ paiements >=
--   total_amount (±0,01) ; retour à 'posted' si on retombe sous le total (suppression d'un paiement)
--   alors qu'elle était 'paid'. Ne touche jamais une facture draft/cancelled. AFTER. DELETE : facture
--   retrouvée via OLD. Corps legacy (action4).
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

  if v_total_paid >= v_invoice.total_amount - v_tolerance then
    update public.supplier_invoices set status = 'paid'
    where id = v_invoice_id and status <> 'paid';
  elsif v_invoice.status = 'paid' then
    -- On est repassé sous le total (paiement supprimé/réduit) : la facture redevient 'posted'.
    update public.supplier_invoices set status = 'posted'
    where id = v_invoice_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
create trigger trg_update_supplier_invoice_status_after_payment
  after insert or update of amount or delete on public.supplier_payments
  for each row execute function public.tr_update_supplier_invoice_status_after_payment();
revoke execute on function public.tr_update_supplier_invoice_status_after_payment() from public, anon, authenticated;

-- FIN 0026_rpc_appels_paiements.sql
