-- 0027_periodes_affectation.sql — PÉRIODES & AFFECTATION DU RÉSULTAT (sous-lot 3/5 finance)
-- Source : .planning/db-cible/02-finance-grand-livre.md §0.2 (invariant 110/120) + §5 (cycle période)
--          + .planning/db-cible/INVENTAIRE-FONCTIONS.md §5 (open/close/approve/reopen/regularize, cut-off, opening_balance)
--          + corps LEGACY faisant autorité (migrations_legacy, version la plus récente), ADAPTÉS au schéma cible
--          + colonnes EXACTES vérifiées sur 0002/0009/0012/0013/0015/0016/0024/0025/0026.
--
-- BUT : poser le cycle de vie des exercices comptables (ouverture N+1 avec report des à-nouveaux et
--       SPLIT 110/120 par nature ; clôture ; approbation ; réouverture verrouillée), le cut-off légal
--       art.14-3 (droits constatés 408/486 via period_cutoff_items + écriture GL, et sa contre-passation
--       en N+1), la reprise de mandat (soldes d'ouverture 471/472 non bloquants), la comptabilisation
--       d'une dépense budgétaire (réalisé D6xx/C401), et l'AFFECTATION DU RÉSULTAT ventilée par nature
--       (D120/C450-1 courant ET D110/C450-2 travaux par quote-part), avec son garde-fou bloquant.
--       Ce fichier NE CRÉE QUE des FONCTIONS et UNE VUE. AUCUNE table (toutes en 0001→0022).
--       AUCUN objet 0001→0026 recréé ni retouché (sinon double create casse `supabase db reset`).
--
-- IMPÉRATIFS RESPECTÉS :
--   - is_ledger_regen_exempt NON recréée (DÉJÀ en 0024 — le legacy lot1_2d la redéfinissait, bloc ignoré).
--   - À-NOUVEAU AVANT AFFECTATION : open_next_period (reporte 110/120) tourne avant regularize_period
--     (qui lit le solde 110/120 de N+1 après à-nouveau). Chemin V0→V2→V1→V4.
--   - create_ledger_transaction EXIGE période 'open' : opening_balance + result_allocation postent en
--     N+1 OUVERTE ; le cut-off poste sur la période N encore ouverte (avant clôture) ; la contre-passation
--     poste en N+1 ouverte. Chaque posteur cible donc bien une période 'open'.
--   - Tout posteur appelant create_ledger_transaction teste (->>'success') et RAISE si échec.
--
-- ADAPTATIONS schéma cible (vs LEGACY) :
--   1. period_status cible = (open, closed, approved) — purge de 'locked'/'rejected' (0002 §1.3) et des
--      colonnes locked_at/locked_by (supprimées en 0013). close_period/reopen_period nettoyés en conséquence.
--   2. Suppression des « WHEN OTHERS THEN {success:false} » masquants (anti-pattern compta, convention
--      0025/0026) : les exceptions remontent → vrai rollback. set_opening_balance reste atomique (le RAISE
--      rollback le DELETE de l'ancienne reprise — pas de perte de données, contrat I14 respecté autrement).
--   3. Gardes G-MGR AJOUTÉES sur tous les posteurs (le legacy ne les avait pas). Copro DÉRIVÉE de l'objet
--      (période/dépense) quand absente des arguments. get_opening_balance = G-DEF-RO (lecture).
--   4. Cut-off : colonne cible period_cutoff_items.tiers_id (ex supplier_id legacy) ; les comptes de
--      contrepartie (408/486/471/472/421/431/432/487) sont DÉJÀ provisionnés par provision_copro_chart
--      (0025) → résolution par code, PAS d'upsert dans accounts (évite is_postable/nature par défaut).
--   5. validate_budget_expense : budget_expenses.fournisseur N'EXISTE PAS en cible → nom du tiers résolu
--      via SELECT name FROM tiers WHERE id = v_exp.tiers_id, fallback v_exp.label.
--   6. regularize_period : ÉTENDUE — poste AUSSI la part TRAVAUX 110→450-2 par quote-part (miroir de la
--      branche courante 120→450-1), même arrondi cumulatif, MÊME écriture result_allocation ; puis
--      assert_result_allocation_split en fin (rollback si la double ventilation manque).
--
-- ROUTE CANONIQUE (0025/0024, à APPELER — jamais réimplémenter) :
--   resolve_lot_tiers_account(copro, nature) -> 450-x ; create_ledger_transaction(...) pose + auto-post
--   (EXIGE période 'open', garde G-MGR/G-SVC) ; le filet 0024 impose équilibre, lot_id sur 45x,
--   immutabilité une fois 'posted' (exemption is_ledger_regen_exempt pour les régénérables non approuvés).
--
-- CONVENTIONS (durcissement transverse — leçons 0023/0024/0025/0026) :
--   - SECURITY DEFINER + set search_path = public sur tout lookup inter-tables ; STABLE (lecture) /
--     VOLATILE (écriture). Vue : with (security_invoker = true).
--   - G-MGR : IF NOT is_service_call() AND NOT user_is_copro_manager(copro) THEN RAISE errcode '42501'.
--   - deny-by-default : REVOKE EXECUTE FROM public, anon ; GRANT authenticated (+ service_role).
--   - G-INTERNAL (cutoff_entry_pair / assert_result_allocation_split) : REVOKE public/anon, pas de garde
--     métier (appelées par les posteurs qui ont déjà gardé).
--   - UN SEUL % dans les RAISE/format (jamais %%, jamais %.2f). errcodes : 42501 / 23514 / 23503.
--
-- ORDRE DE DÉCLARATION (un objet appelé est défini AVANT son appelant) :
--   1. close_period               (open -> closed)
--   2. approve_period             (closed -> approved)
--   3. reopen_period              (closed -> open ; interdit si approved)
--   4. cutoff_entry_pair          (helper jsonb — paire d'écritures cut-off)            [G-INTERNAL]
--   5. post_period_cutoff         (droits constatés art.14-3)                            [G-MGR]
--   6. reverse_period_cutoff      (contre-passation en N+1)                              [G-MGR]
--   7. open_next_period           (à-nouveau 1/4/5xx + split résultat 110/120)          [G-MGR]
--   8. set_opening_balance        (reprise de mandat, 471/472)                           [G-MGR]
--   9. get_opening_balance        (lecture de la reprise)                                [G-DEF-RO]
--  10. validate_budget_expense    (dépense -> réalisé D6xx/C401)                         [G-MGR]
--  11. v_result_allocation_split  (assiette du garde-fou 110/120)                        (VUE)
--  12. assert_result_allocation_split (garde-fou bloquant)                               [G-INTERNAL]
--  13. regularize_period          (affectation D120/C450-1 ET D110/C450-2 par quote-part)[G-MGR]


-- ============================================================================================
-- 1. close_period(p_period_id) -> jsonb   [G-MGR]   — open -> closed
-- ============================================================================================
-- Clôture technique d'un exercice (pas l'approbation AG) : 'open' -> 'closed'. Copro DÉRIVÉE de la
-- période avant la garde G-MGR. period_status cible = (open|closed|approved) : seul 'open' est clôturable.
create or replace function public.close_period(p_period_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period accounting_periods%rowtype;
begin
  select * into v_period from public.accounting_periods where id = p_period_id;
  if not found then
    raise exception 'close_period: période % introuvable', p_period_id
      using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_period.copro_id) then
    raise exception 'forbidden: manager required for copro %', v_period.copro_id
      using errcode = '42501';
  end if;

  if v_period.status <> 'open' then
    raise exception 'close_period: transition invalide depuis le statut % (attendu open)', v_period.status
      using errcode = '23514';
  end if;

  update public.accounting_periods
  set status = 'closed', closed_at = now(), closed_by = auth.uid()
  where id = p_period_id and status = 'open';

  return jsonb_build_object('success', true, 'period_id', p_period_id, 'status', 'closed');
end;
$$;
revoke execute on function public.close_period(uuid) from public, anon;
grant execute on function public.close_period(uuid) to authenticated, service_role;


-- ============================================================================================
-- 2. approve_period(p_period_id) -> jsonb   [G-MGR]   — closed -> approved (gel définitif)
-- ============================================================================================
-- Approbation des comptes en AG : 'closed' -> 'approved'. À partir d'ici l'exercice est INTANGIBLE
-- (l'exemption d'immutabilité is_ledger_regen_exempt se ferme — toute reprise/affectation rattachée se
-- fige aussi, cf. 0024). Copro dérivée de la période avant la garde G-MGR.
create or replace function public.approve_period(p_period_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period accounting_periods%rowtype;
begin
  select * into v_period from public.accounting_periods where id = p_period_id;
  if not found then
    raise exception 'approve_period: période % introuvable', p_period_id
      using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_period.copro_id) then
    raise exception 'forbidden: manager required for copro %', v_period.copro_id
      using errcode = '42501';
  end if;

  if v_period.status <> 'closed' then
    raise exception 'approve_period: transition invalide depuis le statut % (attendu closed)', v_period.status
      using errcode = '23514';
  end if;

  update public.accounting_periods
  set status = 'approved', approved_at = now(), approved_by = auth.uid()
  where id = p_period_id and status = 'closed';

  return jsonb_build_object('success', true, 'period_id', p_period_id, 'status', 'approved');
end;
$$;
revoke execute on function public.approve_period(uuid) from public, anon;
grant execute on function public.approve_period(uuid) to authenticated, service_role;


-- ============================================================================================
-- 3. reopen_period(p_period_id) -> jsonb   [G-MGR]   — closed -> open ; INTERDIT si approved
-- ============================================================================================
-- Réouverture d'un exercice clôturé (corriger puis re-clôturer). period_status cible n'a que
-- (open|closed|approved) : 'closed' est réouvrable, 'approved' est INTANGIBLE (RAISE). Garde-fous :
-- une seule période 'open' par copro (uq_period_single_open, 0013), et refus si un exercice postérieur
-- est déjà approuvé (sa reprise à-nouveau dépend de celui-ci). Copro dérivée de la période.
create or replace function public.reopen_period(p_period_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_p              accounting_periods%rowtype;
  v_other_open     uuid;
  v_later_approved uuid;
begin
  select * into v_p from public.accounting_periods where id = p_period_id;
  if not found then
    raise exception 'reopen_period: période % introuvable', p_period_id
      using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_p.copro_id) then
    raise exception 'forbidden: manager required for copro %', v_p.copro_id
      using errcode = '42501';
  end if;

  -- Déjà ouverte : no-op idempotent.
  if v_p.status = 'open' then
    return jsonb_build_object('success', true, 'period_id', p_period_id, 'status', 'open', 'noop', true);
  end if;

  -- Intangibilité : un exercice approuvé en AG ne se rouvre jamais.
  if v_p.status = 'approved' then
    raise exception 'reopen_period: exercice % approuvé en AG, intangible — réouverture interdite', p_period_id
      using errcode = '23514';
  end if;

  -- Une seule période ouverte à la fois (la contrainte uq_period_single_open le garantit aussi en base).
  select id into v_other_open
  from public.accounting_periods
  where copro_id = v_p.copro_id and status = 'open' and id <> p_period_id
  limit 1;
  if v_other_open is not null then
    raise exception 'reopen_period: une autre période (%) est déjà ouverte ; clôturez-la d''abord', v_other_open
      using errcode = '23514';
  end if;

  -- Intégrité de l'à-nouveau : refuser si un exercice postérieur est déjà approuvé.
  select id into v_later_approved
  from public.accounting_periods
  where copro_id = v_p.copro_id and status = 'approved' and start_date > v_p.start_date
  limit 1;
  if v_later_approved is not null then
    raise exception 'reopen_period: un exercice postérieur (%) est approuvé — sa reprise à-nouveau en dépend', v_later_approved
      using errcode = '23514';
  end if;

  update public.accounting_periods
  set status = 'open', closed_at = null, closed_by = null
  where id = p_period_id and status = 'closed';

  return jsonb_build_object('success', true, 'period_id', p_period_id, 'status', 'open', 'reopened_from', v_p.status);
end;
$$;
revoke execute on function public.reopen_period(uuid) from public, anon;
grant execute on function public.reopen_period(uuid) to authenticated, service_role;


-- ============================================================================================
-- 4. cutoff_entry_pair(...) -> jsonb   [G-INTERNAL]   — paire d'écritures cut-off (DRY post/reverse)
-- ============================================================================================
-- Renvoie la paire (débit, crédit) d'un item de cut-off. p_reverse=false => écriture en N ;
-- p_reverse=true => extourne (sens inversé). Sens en N : CAP/PCA -> débit = compte de résultat (account) ;
-- CCA/PAR -> débit = contrepartie. Comptes 408/486/421/… (jamais 45x) -> pas de lot_id (NULL).
-- IMMUTABLE (pure : aucune lecture de table). Consommée par post_period_cutoff / reverse_period_cutoff.
create or replace function public.cutoff_entry_pair(
  p_kind          text,
  p_account_id    uuid,
  p_counterpart_id uuid,
  p_amount        numeric,
  p_label         text,
  p_reverse       boolean
)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_debit         uuid;
  v_credit        uuid;
  v_account_debit boolean;
begin
  v_account_debit := (p_kind in ('CAP', 'PCA'));
  if p_reverse then
    v_account_debit := not v_account_debit;
  end if;

  if v_account_debit then
    v_debit := p_account_id;  v_credit := p_counterpart_id;
  else
    v_debit := p_counterpart_id;  v_credit := p_account_id;
  end if;

  return jsonb_build_array(
    jsonb_build_object('account_id', v_debit,  'lot_id', null, 'direction', 'debit',  'amount', p_amount, 'entry_label', p_label),
    jsonb_build_object('account_id', v_credit, 'lot_id', null, 'direction', 'credit', 'amount', p_amount, 'entry_label', p_label)
  );
end;
$$;
revoke execute on function public.cutoff_entry_pair(text, uuid, uuid, numeric, text, boolean) from public, anon;
grant execute on function public.cutoff_entry_pair(text, uuid, uuid, numeric, text, boolean) to authenticated, service_role;


-- ============================================================================================
-- 5. post_period_cutoff(p_copro_id, p_period_id, p_items) -> jsonb   [G-MGR]   — DROITS CONSTATÉS art.14-3
-- ============================================================================================
-- Rattache à l'exercice N les charges/produits constatés (cut-off, décret 2005-240 art.14-3) :
--   p_items = [{ kind (CAP|CCA|PCA|PAR), account_id (compte de résultat 6x/7x), counterpart_code
--                (408|486|421|431|432|487|461…), amount, label, tiers_id?, auto_reverse? }, …].
-- Enregistre chaque item dans period_cutoff_items + une SEULE écriture GL équilibrée (source_type='closing',
--   source_id=period_id). Postée sur N ENCORE OUVERTE (create_ledger_transaction exige 'open') ; l'item est
--   contre-passé en N+1 par reverse_period_cutoff (appelée depuis open_next_period). Idempotent par
--   remplacement (DELETE de l'ancienne écriture + items de N). Garde G-MGR. Les comptes de contrepartie
--   sont DÉJÀ provisionnés (provision_copro_chart, 0025) → résolution par code, sans upsert.
create or replace function public.post_period_cutoff(
  p_copro_id  uuid,
  p_period_id uuid,
  p_items     jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period   accounting_periods%rowtype;
  v_item     jsonb;
  v_kind     text;
  v_acct_id  uuid;
  v_cp_code  text;
  v_cp_id    uuid;
  v_amount   numeric;
  v_label    text;
  v_tiers    uuid;
  v_auto     boolean;
  v_entries  jsonb := '[]'::jsonb;
  v_existing uuid;
  v_tx_res   jsonb;
  v_count    integer := 0;
begin
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: manager required for copro %', p_copro_id
      using errcode = '42501';
  end if;

  select * into v_period from public.accounting_periods where id = p_period_id and copro_id = p_copro_id;
  if not found then
    raise exception 'post_period_cutoff: période % introuvable pour la copro %', p_period_id, p_copro_id
      using errcode = '23503';
  end if;
  if v_period.status <> 'open' then
    raise exception 'post_period_cutoff: période % non ouverte (statut=%) — rouvrir avant le cut-off', p_period_id, v_period.status
      using errcode = '23514';
  end if;

  -- Idempotence par remplacement (N ouverte ⇒ exemption is_ledger_regen_exempt sur source_type='closing').
  select id into v_existing
  from public.ledger_transactions
  where copro_id = p_copro_id and source_type = 'closing' and source_id = p_period_id and period_id = p_period_id;
  if v_existing is not null then
    delete from public.ledger_transactions where id = v_existing;
  end if;
  delete from public.period_cutoff_items where copro_id = p_copro_id and period_id = p_period_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_kind    := v_item->>'kind';
    v_acct_id := (v_item->>'account_id')::uuid;
    v_cp_code := v_item->>'counterpart_code';
    v_amount  := (v_item->>'amount')::numeric;
    v_label   := v_item->>'label';
    v_tiers   := nullif(v_item->>'tiers_id', '')::uuid;
    v_auto    := coalesce((v_item->>'auto_reverse')::boolean, true);

    if v_amount is null or v_amount <= 0 then
      continue;
    end if;
    if v_kind not in ('CAP', 'CCA', 'PCA', 'PAR') then
      raise exception 'post_period_cutoff: nature de cut-off invalide % (attendu CAP|CCA|PCA|PAR)', v_kind
        using errcode = '23514';
    end if;
    -- Défense en profondeur : un cut-off ne s'appuie jamais sur un compte de copropriétaire 45x (la ligne
    -- serait sans lot_id et rejetée par trg_enforce_lot_id_on_45x, 0024) — message métier explicite ici.
    if v_cp_code like '45%' then
      raise exception 'post_period_cutoff: contrepartie 45x interdite en cut-off (compte copropriétaire %) — utiliser 408/486/471/472/421/431/432/487', v_cp_code
        using errcode = '23514';
    end if;

    select id into v_cp_id from public.accounts where copro_id = p_copro_id and code = v_cp_code;
    if v_cp_id is null then
      raise exception 'post_period_cutoff: compte de contrepartie % introuvable pour la copro % (plan non provisionné ?)', v_cp_code, p_copro_id
        using errcode = '23503';
    end if;

    insert into public.period_cutoff_items (
      copro_id, period_id, kind, account_id, counterpart_account_id, amount, label, tiers_id, auto_reverse
    ) values (
      p_copro_id, p_period_id, v_kind::cutoff_kind, v_acct_id, v_cp_id, v_amount, v_label, v_tiers, v_auto
    );

    v_entries := v_entries || public.cutoff_entry_pair(v_kind, v_acct_id, v_cp_id, v_amount, v_label, false);
    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    return jsonb_build_object('success', true, 'items', 0, 'note', 'aucun item à poster');
  end if;

  v_tx_res := public.create_ledger_transaction(
    p_copro_id, p_period_id, v_period.end_date,
    'Cut-off — rattachement ' || v_period.name, 'closing', p_period_id, v_entries, true
  );
  if not (v_tx_res->>'success')::boolean then
    raise exception 'post_period_cutoff: échec écriture grand livre : %', v_tx_res->>'error'
      using errcode = '23514';
  end if;

  update public.period_cutoff_items
  set posting_tx_id = (v_tx_res->>'tx_id')::uuid
  where copro_id = p_copro_id and period_id = p_period_id;

  return jsonb_build_object('success', true, 'items', v_count, 'tx_id', v_tx_res->>'tx_id');
end;
$$;
revoke execute on function public.post_period_cutoff(uuid, uuid, jsonb) from public, anon;
grant execute on function public.post_period_cutoff(uuid, uuid, jsonb) to authenticated, service_role;


-- ============================================================================================
-- 6. reverse_period_cutoff(p_copro_id, p_period_id) -> jsonb   [G-MGR]   — CONTRE-PASSATION en N+1
-- ============================================================================================
-- Extourne en N+1 (ouverte) les items de cut-off auto_reverse=true posés sur N (les dettes certaines se
-- soldent au paiement, pas par extourne). Appelée par open_next_period (à l'ouverture de N+1). Idempotent
-- par remplacement (DELETE de l'extourne précédente sur N+1). Garde G-MGR. Refuse si N ou N+1 approuvé.
create or replace function public.reverse_period_cutoff(
  p_copro_id  uuid,
  p_period_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n        accounting_periods%rowtype;
  v_next     accounting_periods%rowtype;
  v_item     record;
  v_entries  jsonb := '[]'::jsonb;
  v_existing uuid;
  v_tx_res   jsonb;
  v_count    integer := 0;
begin
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: manager required for copro %', p_copro_id
      using errcode = '42501';
  end if;

  select * into v_n from public.accounting_periods where id = p_period_id and copro_id = p_copro_id;
  if not found then
    raise exception 'reverse_period_cutoff: période N % introuvable pour la copro %', p_period_id, p_copro_id
      using errcode = '23503';
  end if;

  select * into v_next
  from public.accounting_periods
  where copro_id = p_copro_id and start_date > v_n.end_date
  order by start_date asc
  limit 1;
  if not found then
    raise exception 'reverse_period_cutoff: période N+1 introuvable (ouvrir l''exercice suivant d''abord)'
      using errcode = '23503';
  end if;
  if v_next.status <> 'open' then
    raise exception 'reverse_period_cutoff: période N+1 % non ouverte (statut=%)', v_next.id, v_next.status
      using errcode = '23514';
  end if;
  if v_n.status = 'approved' or v_next.status = 'approved' then
    raise exception 'reverse_period_cutoff: extourne figée — exercice approuvé'
      using errcode = '23514';
  end if;

  -- Idempotence : supprimer l'extourne précédente (écriture 'closing' portée par N+1, source_id=N).
  select id into v_existing
  from public.ledger_transactions
  where copro_id = p_copro_id and source_type = 'closing' and source_id = p_period_id and period_id = v_next.id;
  if v_existing is not null then
    delete from public.ledger_transactions where id = v_existing;
  end if;

  for v_item in
    select * from public.period_cutoff_items
    where copro_id = p_copro_id and period_id = p_period_id and auto_reverse = true
  loop
    v_entries := v_entries || public.cutoff_entry_pair(
      v_item.kind::text, v_item.account_id, v_item.counterpart_account_id, v_item.amount,
      'Extourne cut-off ' || v_n.name, true
    );
    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    return jsonb_build_object('success', true, 'reversed', 0, 'note', 'aucun item à extourner');
  end if;

  v_tx_res := public.create_ledger_transaction(
    p_copro_id, v_next.id, v_next.start_date,
    'Extourne cut-off ' || v_n.name || ' → ' || v_next.name, 'closing', p_period_id, v_entries, true
  );
  if not (v_tx_res->>'success')::boolean then
    raise exception 'reverse_period_cutoff: échec écriture grand livre : %', v_tx_res->>'error'
      using errcode = '23514';
  end if;

  update public.period_cutoff_items
  set reversal_tx_id = (v_tx_res->>'tx_id')::uuid
  where copro_id = p_copro_id and period_id = p_period_id and auto_reverse = true;

  return jsonb_build_object('success', true, 'reversed', v_count, 'tx_id', v_tx_res->>'tx_id', 'next_period_id', v_next.id);
end;
$$;
revoke execute on function public.reverse_period_cutoff(uuid, uuid) from public, anon;
grant execute on function public.reverse_period_cutoff(uuid, uuid) to authenticated, service_role;


-- ============================================================================================
-- 7. open_next_period(...) -> jsonb   [G-MGR]   — OUVERTURE N+1 : À-NOUVEAU + SPLIT RÉSULTAT 110/120
-- ============================================================================================
-- Ouvre l'exercice N+1 (créé si absent) et y reporte les À-NOUVEAUX (écriture opening_balance, N+1
--   ouverte) en DEUX volets :
--   - report des SOLDES DE BILAN (comptes 1xx/4xx/5xx) par compte×lot, sens selon le solde net ;
--   - report du RÉSULTAT de l'exercice (classes 6/7) VENTILÉ PAR NATURE : part courante -> 120, part
--     travaux/exceptionnelle -> 110 (comptes 671/672/673/674/677/678/702/705/706). Le résultat brut 6/7
--     n'est PAS reporté tel quel (il est soldé) : seul son NET alimente 110/120, qui seront affectés aux
--     copropriétaires par regularize_period (D120/C450-1 + D110/C450-2). C'est l'à-nouveau AVANT affectation.
-- Exige N déjà clôturée (close_period) — on ne reporte pas depuis un exercice 'open'. Idempotent par
--   remplacement de la reprise tant que N et N+1 ne sont pas approuvées. Contre-passe enfin le cut-off de N
--   dans N+1 (reverse_period_cutoff). Garde G-MGR.
create or replace function public.open_next_period(
  p_copro_id          uuid,
  p_closing_period_id uuid,
  p_new_name          text default null,
  p_new_start         date default null,
  p_new_end           date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n            accounting_periods%rowtype;
  v_next_id      uuid;
  v_next_start   date;
  v_next_end     date;
  v_next_name    text;
  v_existing_tx  uuid;
  v_existing_dst period_status;
  v_acct_120     uuid;
  v_acct_110     uuid;
  v_carry        jsonb;
  v_net_courant  numeric;
  v_net_travaux  numeric;
  v_result_entry jsonb;
  v_entries      jsonb;
  v_tx_res       jsonb;
  v_rev          jsonb;
begin
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: manager required for copro %', p_copro_id
      using errcode = '42501';
  end if;

  select * into v_n from public.accounting_periods where id = p_closing_period_id and copro_id = p_copro_id;
  if not found then
    raise exception 'open_next_period: exercice de clôture % introuvable pour la copro %', p_closing_period_id, p_copro_id
      using errcode = '23503';
  end if;
  if v_n.status = 'open' then
    raise exception 'open_next_period: clôturez d''abord l''exercice N (close_period) — statut actuel %', v_n.status
      using errcode = '23514';
  end if;

  select id into v_acct_120 from public.accounts where copro_id = p_copro_id and code = '120';
  if v_acct_120 is null then
    raise exception 'open_next_period: compte 120 absent pour la copro %', p_copro_id
      using errcode = '23503';
  end if;
  select id into v_acct_110 from public.accounts where copro_id = p_copro_id and code = '110';
  if v_acct_110 is null then
    raise exception 'open_next_period: compte 110 absent pour la copro %', p_copro_id
      using errcode = '23503';
  end if;

  -- Idempotence : reprise déjà posée ? Le remplacement n'est permis que si NI l'exercice source N NI
  -- l'exercice d'ACCUEIL (period_id de la reprise existante = N+1) ne sont approuvés (exemption
  -- is_ledger_regen_exempt, 0024). Sinon message métier clair AVANT le trigger d'immutabilité GL.
  select t.id, ap.status into v_existing_tx, v_existing_dst
  from public.ledger_transactions t
  join public.accounting_periods ap on ap.id = t.period_id
  where t.copro_id = p_copro_id and t.source_type = 'opening_balance' and t.source_id = p_closing_period_id;
  if v_existing_tx is not null and (v_n.status = 'approved' or v_existing_dst = 'approved') then
    raise exception 'open_next_period: reprise figée — exercice approuvé en AG (source % ou accueil), report à-nouveau interdit', p_closing_period_id
      using errcode = '23514';
  end if;
  if v_existing_tx is not null then
    delete from public.ledger_transactions where id = v_existing_tx;
  end if;

  -- Volet 1 : à-nouveaux des soldes de BILAN (1xx/4xx/5xx), par compte×lot, sens selon le net.
  select jsonb_agg(jsonb_build_object(
           'account_id', x.account_id, 'lot_id', x.lot_id,
           'direction', case when x.net > 0 then 'debit' else 'credit' end,
           'amount', abs(x.net), 'entry_label', 'Report à-nouveau'))
    into v_carry
  from (
    select e.account_id, e.lot_id,
           round(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 2) as net
    from public.ledger_entries e
    join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
    join public.accounts a on a.id = e.account_id
    where e.copro_id = p_copro_id and e.period_id = p_closing_period_id
      and substr(a.code, 1, 1) in ('1', '4', '5')
    group by e.account_id, e.lot_id
    having round(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 2) <> 0
  ) x;

  -- Volet 2 : résultat COURANT (classes 6/7 hors comptes travaux/exceptionnels).
  select round(coalesce(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 0), 2)
    into v_net_courant
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a on a.id = e.account_id
  where e.copro_id = p_copro_id and e.period_id = p_closing_period_id
    and substr(a.code, 1, 1) in ('6', '7')
    and a.code not in ('671', '672', '673', '674', '677', '678', '702', '705', '706');

  -- Volet 2 (suite) : résultat TRAVAUX / exceptionnel (comptes ci-dessus).
  select round(coalesce(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 0), 2)
    into v_net_travaux
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a on a.id = e.account_id
  where e.copro_id = p_copro_id and e.period_id = p_closing_period_id
    and a.code in ('671', '672', '673', '674', '677', '678', '702', '705', '706');

  v_result_entry := '[]'::jsonb;
  if v_net_courant <> 0 then
    v_result_entry := v_result_entry || jsonb_build_array(jsonb_build_object(
      'account_id', v_acct_120, 'lot_id', null,
      'direction', case when v_net_courant < 0 then 'credit' else 'debit' end,
      'amount', abs(v_net_courant), 'entry_label', 'Résultat courant ' || v_n.name));
  end if;
  if v_net_travaux <> 0 then
    v_result_entry := v_result_entry || jsonb_build_array(jsonb_build_object(
      'account_id', v_acct_110, 'lot_id', null,
      'direction', case when v_net_travaux < 0 then 'credit' else 'debit' end,
      'amount', abs(v_net_travaux), 'entry_label', 'Résultat travaux ' || v_n.name));
  end if;

  v_entries := coalesce(v_carry, '[]'::jsonb) || v_result_entry;
  if jsonb_array_length(v_entries) = 0 then
    raise exception 'open_next_period: aucun solde à reporter pour l''exercice %', p_closing_period_id
      using errcode = '23514';
  end if;

  -- Calcul des bornes de N+1 (décalage d'un an par défaut) et création/réouverture.
  v_next_start := coalesce(p_new_start, (v_n.start_date + interval '1 year')::date);
  v_next_end   := coalesce(p_new_end,   (v_n.end_date   + interval '1 year')::date);
  v_next_name  := coalesce(p_new_name,  'Exercice ' || extract(year from v_next_start)::int);

  select id into v_next_id
  from public.accounting_periods
  where copro_id = p_copro_id and start_date = v_next_start and end_date = v_next_end;
  if v_next_id is null then
    insert into public.accounting_periods (copro_id, name, start_date, end_date, status)
    values (p_copro_id, v_next_name, v_next_start, v_next_end, 'open')
    returning id into v_next_id;
  else
    update public.accounting_periods set status = 'open' where id = v_next_id and status <> 'open';
  end if;

  -- À-nouveau posté en N+1 OUVERTE (create_ledger_transaction l'exige ; auto-post équilibré).
  v_tx_res := public.create_ledger_transaction(
    p_copro_id, v_next_id, v_next_start,
    'À-nouveau — reprise des soldes ' || v_n.name || ' → ' || v_next_name,
    'opening_balance', p_closing_period_id, v_entries, true
  );
  if not (v_tx_res->>'success')::boolean then
    raise exception 'open_next_period: échec de la reprise à-nouveau : %', v_tx_res->>'error'
      using errcode = '23514';
  end if;

  -- Contre-passation du cut-off de N dans N+1 (les charges constatées d'avance/à payer s'extournent).
  v_rev := public.reverse_period_cutoff(p_copro_id, p_closing_period_id);
  if not (v_rev->>'success')::boolean then
    raise exception 'open_next_period: extourne cut-off échouée (période %) : %', p_closing_period_id, v_rev->>'error'
      using errcode = '23514';
  end if;

  return jsonb_build_object(
    'success', true, 'next_period_id', v_next_id, 'next_period_name', v_next_name,
    'opening_tx_id', v_tx_res->>'tx_id', 'carry_lines', coalesce(jsonb_array_length(v_carry), 0),
    'result_courant', v_net_courant, 'result_travaux', v_net_travaux,
    'result_to_120', abs(v_net_courant), 'result_to_110', abs(v_net_travaux),
    'cutoff_reversal', v_rev
  );
end;
$$;
revoke execute on function public.open_next_period(uuid, uuid, text, date, date) from public, anon;
grant execute on function public.open_next_period(uuid, uuid, text, date, date) to authenticated, service_role;


-- ============================================================================================
-- 8. set_opening_balance(p_copro_id, p_period_id, p_as_of_date, p_lines) -> jsonb   [G-MGR]
-- ============================================================================================
-- REPRISE DE MANDAT : pose les soldes d'ouverture d'une copro reprise, en UNE écriture équilibrée
--   (source_type='opening_onboarding'), idempotente PAR REMPLACEMENT. p_lines = [{ account_code, nature?,
--   lot_id?, amount (signé : débit +, crédit -) }, …]. Le RÉSIDU (déséquilibre temporaire de saisie) va
--   en 471 (débiteur) / 472 (créditeur) — NON BLOQUANT : la reprise peut être incomplète et s'affiner.
--   Résolution du compte : '450' nu + nature -> 450-x ; '450-x' -> nature dérivée ; tout autre code -> par
--   code exact (postable). Les classes 6/7 (résultat repris) sont globales -> lot_id neutralisé.
-- Postée en période 'open' (create_ledger_transaction l'exige). Garde G-MGR. Le DELETE de l'ancienne
--   reprise précède la pose ; si la pose échoue, l'exception remonte et rollback le DELETE (atomicité,
--   pas de perte de données) — d'où l'absence de WHEN OTHERS masquant (convention 0025/0026).
create or replace function public.set_opening_balance(
  p_copro_id   uuid,
  p_period_id  uuid,
  p_as_of_date date,
  p_lines      jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period    accounting_periods%rowtype;
  v_line      jsonb;
  v_code      text;
  v_nature    text;
  v_lot_id    uuid;
  v_amount    numeric;
  v_acc_id    uuid;
  v_entries   jsonb := '[]'::jsonb;
  v_signed    numeric := 0;
  v_residual  numeric;
  v_acc471    uuid;
  v_acc472    uuid;
  v_lines_cnt integer := 0;
  v_res       jsonb;
begin
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: manager required for copro %', p_copro_id
      using errcode = '42501';
  end if;

  -- Pré-garde statut (FOR UPDATE) AVANT tout DELETE.
  select * into v_period
  from public.accounting_periods
  where id = p_period_id and copro_id = p_copro_id
  for update;
  if not found then
    raise exception 'set_opening_balance: période % introuvable pour la copro %', p_period_id, p_copro_id
      using errcode = '23503';
  end if;
  if v_period.status <> 'open' then
    raise exception 'set_opening_balance: période % non ouverte (statut=%) — rouvrir avant la reprise', p_period_id, v_period.status
      using errcode = '23514';
  end if;

  select id into v_acc471 from public.accounts where copro_id = p_copro_id and code = '471';
  select id into v_acc472 from public.accounts where copro_id = p_copro_id and code = '472';
  if v_acc471 is null or v_acc472 is null then
    raise exception 'set_opening_balance: comptes d''attente 471/472 absents pour la copro % (plan non provisionné ?)', p_copro_id
      using errcode = '23503';
  end if;

  -- Annule la reprise d'onboarding existante (cascade ledger_entries) — exemption is_ledger_regen_exempt.
  delete from public.ledger_transactions
  where copro_id = p_copro_id and period_id = p_period_id and source_type = 'opening_onboarding';

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_code   := v_line->>'account_code';
    v_nature := lower(coalesce(v_line->>'nature', ''));
    v_lot_id := nullif(v_line->>'lot_id', '')::uuid;
    v_amount := coalesce((v_line->>'amount')::numeric, 0);

    if v_amount = 0 or v_code is null then
      continue;
    end if;

    if v_code = '450' then
      if v_nature not in ('current', 'works', 'advance', 'loan', 'alur') then
        raise exception 'set_opening_balance: ligne 450 sans nature valide (reçu "%")', v_line->>'nature'
          using errcode = '23514';
      end if;
      v_acc_id := public.resolve_lot_tiers_account(p_copro_id, v_nature);
    elsif v_code like '450-%' then
      v_acc_id := public.resolve_lot_tiers_account(p_copro_id,
        case v_code
          when '450-1' then 'current' when '450-2' then 'works'
          when '450-3' then 'advance' when '450-4' then 'loan'
          when '450-5' then 'alur'
        end);
    else
      select id into v_acc_id
      from public.accounts
      where copro_id = p_copro_id and code = v_code and is_postable = true;
      if v_acc_id is null then
        raise exception 'set_opening_balance: compte % introuvable ou non imputable pour la copro %', v_code, p_copro_id
          using errcode = '23503';
      end if;
    end if;

    -- Classes 6/7 (résultat repris) globales -> on neutralise le lot_id éventuel.
    if v_code like '6%' or v_code like '7%' then
      v_lot_id := null;
    end if;

    v_entries := v_entries || jsonb_build_array(jsonb_build_object(
      'account_id', v_acc_id,
      'lot_id',     v_lot_id,
      'direction',  case when v_amount > 0 then 'debit' else 'credit' end,
      'amount',     abs(v_amount),
      'entry_label', 'Reprise d''ouverture'
    ));
    v_signed    := v_signed + v_amount;
    v_lines_cnt := v_lines_cnt + 1;
  end loop;

  -- Résidu = complément EXACT -> équilibre garanti, 0 centime résiduel.
  v_residual := round(-v_signed, 2);
  if abs(v_residual) >= 0.01 then
    if v_residual > 0 then
      v_entries := v_entries || jsonb_build_array(jsonb_build_object(
        'account_id', v_acc471, 'direction', 'debit', 'amount', v_residual,
        'entry_label', 'Reprise — reste à imputer (débiteur)'));
    else
      v_entries := v_entries || jsonb_build_array(jsonb_build_object(
        'account_id', v_acc472, 'direction', 'credit', 'amount', abs(v_residual),
        'entry_label', 'Reprise — reste à imputer (créditeur)'));
    end if;
  end if;

  if jsonb_array_length(v_entries) = 0 then
    -- Aucune ligne non nulle : on a juste effacé l'ancienne reprise (remise à zéro assumée).
    return jsonb_build_object('success', true, 'residual', 0, 'lines_count', 0, 'as_of_date', p_as_of_date);
  end if;

  v_res := public.create_ledger_transaction(
    p_copro_id, p_period_id, p_as_of_date, 'Reprise des soldes d''ouverture',
    'opening_onboarding', p_period_id, v_entries, true
  );
  if not (v_res->>'success')::boolean then
    raise exception 'set_opening_balance: échec écriture grand livre : %', coalesce(v_res->>'error', 'inconnu')
      using errcode = '23514';
  end if;

  return jsonb_build_object('success', true, 'residual', v_residual, 'lines_count', v_lines_cnt, 'as_of_date', p_as_of_date);
end;
$$;
revoke execute on function public.set_opening_balance(uuid, uuid, date, jsonb) from public, anon;
grant execute on function public.set_opening_balance(uuid, uuid, date, jsonb) to authenticated, service_role;


-- ============================================================================================
-- 9. get_opening_balance(p_copro_id, p_period_id) -> jsonb   [G-DEF-RO]
-- ============================================================================================
-- Relit la reprise d'onboarding courante (grand livre, source_type='opening_onboarding') et la remappe
--   en lignes de formulaire signées { account_code, lot_id, amount, nature } + residual (net 471/472) +
--   as_of_date. Exclut 471/472 des lignes (résidu calculé à part). Source de vérité = le grand livre.
-- G-DEF-RO : DEFINER + lecture seule, garde d'accès en LECTURE (user_has_copro_access OU appel machine).
create or replace function public.get_opening_balance(
  p_copro_id  uuid,
  p_period_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tx_id    uuid;
  v_as_of    date;
  v_lines    jsonb;
  v_residual numeric := 0;
begin
  if not public.is_service_call() and not public.user_has_copro_access(p_copro_id) then
    raise exception 'forbidden: copro access required for copro %', p_copro_id
      using errcode = '42501';
  end if;

  -- L'index unique partiel uq_ledger_tx_opening_onboarding (copro_id, source_id, period_id) +
  -- set_opening_balance qui passe TOUJOURS source_id = period_id garantissent AU PLUS 1 ligne ici.
  -- (ledger_transactions n'a PAS de colonne created_at — tri sur tx_date/posted_at, colonnes réelles 0013.)
  select id, tx_date into v_tx_id, v_as_of
  from public.ledger_transactions
  where copro_id = p_copro_id and period_id = p_period_id and source_type = 'opening_onboarding'
  order by tx_date desc, posted_at desc nulls last
  limit 1;

  if v_tx_id is null then
    return jsonb_build_object('lines', '[]'::jsonb, 'residual', 0, 'as_of_date', null);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'account_code', a.code,
           'lot_id', e.lot_id,
           'amount', case when e.direction = 'debit' then e.amount else -e.amount end,
           'nature', case a.code
                       when '450-1' then 'current' when '450-2' then 'works'
                       when '450-3' then 'advance' when '450-4' then 'loan'
                       when '450-5' then 'alur' else null end
         ) order by a.code, e.lot_id), '[]'::jsonb)
    into v_lines
  from public.ledger_entries e
  join public.accounts a on a.id = e.account_id
  where e.tx_id = v_tx_id and a.code not in ('471', '472');

  select coalesce(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 0)
    into v_residual
  from public.ledger_entries e
  join public.accounts a on a.id = e.account_id
  where e.tx_id = v_tx_id and a.code in ('471', '472');

  return jsonb_build_object('lines', v_lines, 'residual', v_residual, 'as_of_date', v_as_of);
end;
$$;
revoke execute on function public.get_opening_balance(uuid, uuid) from public, anon;
grant execute on function public.get_opening_balance(uuid, uuid) to authenticated, service_role;


-- ============================================================================================
-- 10. validate_budget_expense(p_expense_id) -> jsonb   [G-MGR]   — DÉPENSE -> RÉALISÉ (D6xx / C401)
-- ============================================================================================
-- Comptabilise une dépense budgétaire (passage du « consommé » au « réalisé ») : passe la dépense à
--   status='validated' et poste D[compte de charge de la ligne budgétaire] / C 401 (dette fournisseur).
--   Idempotent : si budget_expenses.ledger_tx_id est déjà renseigné, on ne reposte rien.
-- Garde-fou #1 : la période du budget doit être 'open' — sinon la dépense ne peut être réalisée (elle
--   passerait par le cut-off de clôture 408, pas par un statut 'validé' fantôme sans écriture GL).
-- Garde G-MGR (copro dérivée de la dépense). Nom du fournisseur pour le libellé : tiers.name (la colonne
--   budget_expenses.fournisseur du legacy N'EXISTE PAS en cible), fallback v_exp.label.
create or replace function public.validate_budget_expense(p_expense_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exp          budget_expenses%rowtype;
  v_period       accounting_periods%rowtype;
  v_acct_charge  uuid;
  v_acct_401     uuid;
  v_tiers_name   text;
  v_ltx          jsonb;
  v_tx_id        uuid := null;
begin
  select * into v_exp from public.budget_expenses where id = p_expense_id;
  if not found then
    raise exception 'validate_budget_expense: dépense % introuvable', p_expense_id
      using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_exp.copro_id) then
    raise exception 'forbidden: manager required for copro %', v_exp.copro_id
      using errcode = '42501';
  end if;

  -- Charge la période AVANT toute mutation (garde-fou #1).
  select ap.* into v_period
  from public.budgets b
  join public.accounting_periods ap on ap.id = b.period_id
  where b.id = v_exp.budget_id;
  if not found then
    raise exception 'validate_budget_expense: période du budget de la dépense % introuvable', p_expense_id
      using errcode = '23503';
  end if;
  if v_period.status <> 'open' then
    raise exception 'validate_budget_expense: période comptable non ouverte (statut=%) — régulariser via le cut-off de clôture (charges à payer 408)', v_period.status
      using errcode = '23514';
  end if;

  -- Passage à 'validated' (efface un éventuel motif de rejet précédent).
  update public.budget_expenses
  set status = 'validated', validated_at = now(), validated_by = auth.uid(), rejection_comment = null
  where id = p_expense_id and status <> 'validated';

  -- Idempotence : déjà comptabilisée ?
  if v_exp.ledger_tx_id is not null then
    return jsonb_build_object('success', true, 'ledger_tx_id', v_exp.ledger_tx_id, 'note', 'déjà comptabilisée');
  end if;

  select bl.account_id into v_acct_charge from public.budget_lines bl where bl.id = v_exp.budget_line_id;

  if v_acct_charge is not null and coalesce(v_exp.amount, 0) > 0 then
    select id into v_acct_401 from public.accounts where copro_id = v_exp.copro_id and code = '401';
    if v_acct_401 is null then
      raise exception 'validate_budget_expense: compte 401 introuvable pour la copro %', v_exp.copro_id
        using errcode = '23503';
    end if;

    if v_exp.tiers_id is not null then
      select name into v_tiers_name from public.tiers where id = v_exp.tiers_id;
    end if;
    v_tiers_name := coalesce(v_tiers_name, v_exp.label);

    v_ltx := public.create_ledger_transaction(
      v_exp.copro_id, v_period.id, v_exp.tx_date,
      'Dépense : ' || v_exp.label, 'budget_expense', v_exp.id,
      jsonb_build_array(
        jsonb_build_object('account_id', v_acct_charge, 'direction', 'debit',  'amount', v_exp.amount, 'entry_label', v_exp.label),
        jsonb_build_object('account_id', v_acct_401,    'direction', 'credit', 'amount', v_exp.amount, 'entry_label', 'Dette fournisseur : ' || v_tiers_name)
      ),
      true
    );
    if not (v_ltx->>'success')::boolean then
      raise exception 'validate_budget_expense: échec écriture grand livre : %', v_ltx->>'error'
        using errcode = '23514';
    end if;
    v_tx_id := (v_ltx->>'tx_id')::uuid;
    update public.budget_expenses set ledger_tx_id = v_tx_id where id = p_expense_id;
  end if;

  return jsonb_build_object('success', true, 'ledger_tx_id', v_tx_id, 'posted', v_tx_id is not null, 'period_status', v_period.status);
end;
$$;
revoke execute on function public.validate_budget_expense(uuid) from public, anon;
grant execute on function public.validate_budget_expense(uuid) to authenticated, service_role;


-- ============================================================================================
-- 11. v_result_allocation_split  (VUE)  — ASSIETTE DU GARDE-FOU 110/120 (blueprint §0.2)
-- ============================================================================================
-- Pour chaque écriture source_type='result_allocation' POSTÉE d'une période, renvoie 0 ligne si CONFORME,
--   sinon 1 ligne par écriture fautive. Deux propriétés contrôlées (blueprint §0.2 (a)+(b)) :
--   (a) ROUTAGE PAR NATURE + QUOTE-PART : la part travaux transite par 110/450-2, la part courante par
--       120/450-1 (jamais tout sur 120/450-1) ; 450-x étant la CONTREPARTIE de 12x (sens opposés en
--       partie double), conforme ⇔ mv_450_1 = −mv_120 ET mv_450_2 = −mv_110 ;
--   (b) INVARIANT DE SOMME : la ventilation déversée (mvt 120 + mvt 110) = OPPOSÉ du résultat de
--       l'exercice (net des classes 6/7 du GL posté de la période source) ⇒ (mv_120 + mv_110) = −result_net.
-- Modèle = v_lot_vs_gl_mismatch (vue de détection lecture seule, 1 ligne par anomalie). security_invoker.
--
-- Convention de signe (par écriture result_allocation) — TOUS les mouvements en Σ(crédit−débit) :
--   L'affectation déverse 12x vers 45x en PARTIE DOUBLE : 120 et 450-1 sont par construction de sens
--   OPPOSÉS (excédent : D120/C450-1 ; déficit : C120/D450-1), donc mv_450_1 = −mv_120 quand c'est conforme
--   (et mv_450_2 = −mv_110). De même, l'affectation SORT le résultat des comptes de report vers les
--   copropriétaires : la part déversée (mv_120 + mv_110) est l'OPPOSÉ du résultat de l'exercice source,
--   donc conforme ⇔ (mv_120 + mv_110) = −result_net. C'est pourquoi les tests ci-dessous somment les deux
--   côtés (mv_450 + mv_12x ≈ 0 ; (mv_120+mv_110) + result_net ≈ 0) au lieu de les soustraire.
--   source_id de l'écriture = la période N (clôturée) ; result_net = Σ(crédit−débit) des 6/7 postés de N.
create or replace view public.v_result_allocation_split
with (security_invoker = true) as
with alloc_tx as (
  -- Une écriture d'affectation = (copro, période d'accueil N+1, période source N).
  select t.id as tx_id, t.copro_id, t.period_id, t.source_id as source_period_id
  from public.ledger_transactions t
  where t.source_type = 'result_allocation' and t.status = 'posted'
),
mv as (
  -- Mouvements par compte agrégés sur l'écriture d'affectation (crédit − débit).
  select at.tx_id, at.copro_id, at.period_id, at.source_period_id,
    coalesce(sum(case when a.code = '120'   then (case when e.direction = 'credit' then e.amount else -e.amount end) else 0 end), 0) as mv_120,
    coalesce(sum(case when a.code = '110'   then (case when e.direction = 'credit' then e.amount else -e.amount end) else 0 end), 0) as mv_110,
    coalesce(sum(case when a.code = '450-1' then (case when e.direction = 'credit' then e.amount else -e.amount end) else 0 end), 0) as mv_450_1,
    coalesce(sum(case when a.code = '450-2' then (case when e.direction = 'credit' then e.amount else -e.amount end) else 0 end), 0) as mv_450_2
  from alloc_tx at
  join public.ledger_entries e on e.tx_id = at.tx_id
  join public.accounts a on a.id = e.account_id
  group by at.tx_id, at.copro_id, at.period_id, at.source_period_id
),
result_src as (
  -- Résultat de l'exercice source N = net des classes 6/7 du GL posté de la période N
  -- (charges 6 en débit, produits 7 en crédit ; résultat = Σ(crédit − débit) = excédent si > 0).
  select e.copro_id, e.period_id,
    round(coalesce(sum(case when e.direction = 'credit' then e.amount else -e.amount end), 0), 2) as result_net
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a on a.id = e.account_id
  where substr(a.code, 1, 1) in ('6', '7')
  group by e.copro_id, e.period_id
)
select
  mv.copro_id,
  mv.period_id,
  mv.tx_id,
  mv.source_period_id,
  mv.mv_120,
  mv.mv_110,
  mv.mv_450_1,
  mv.mv_450_2,
  coalesce(rs.result_net, 0) as result_net
from mv
left join result_src rs on rs.copro_id = mv.copro_id and rs.period_id = mv.source_period_id
where
  -- (a) quote-part : 450-x est la CONTREPARTIE de 12x (sens opposés en partie double) ⇒ ils se somment à 0.
  --     mv_450_1 = −mv_120 et mv_450_2 = −mv_110 quand la ventilation par lot reflète exactement 120/110.
  abs(mv.mv_450_1 + mv.mv_120) > 0.01
  or abs(mv.mv_450_2 + mv.mv_110) > 0.01
  -- (b) invariant de somme : la ventilation déversée (120+110) = OPPOSÉ du résultat de l'exercice source
  --     (l'affectation sort le résultat des comptes de report) ⇒ (mv_120 + mv_110) + result_net = 0.
  or abs((mv.mv_120 + mv.mv_110) + coalesce(rs.result_net, 0)) > 0.01;

comment on view public.v_result_allocation_split is
  'Garde-fou de l''invariant 110/120 (blueprint §0.2) : 1 ligne par écriture result_allocation dont la ventilation par nature (120/450-1 courant, 110/450-2 travaux) ou la somme (120+110 = résultat de l''exercice source) est incohérente. 0 ligne = conforme. Assiette de assert_result_allocation_split.';


-- ============================================================================================
-- 12. assert_result_allocation_split(p_copro_id, p_period_id)   [G-INTERNAL]   — garde-fou bloquant
-- ============================================================================================
-- Lève (rollback) dès qu'une écriture result_allocation de la PÉRIODE D'ACCUEIL (N+1) viole l'invariant
--   110/120 (vue v_result_allocation_split). Appelée en FIN de regularize_period, sur le modèle de
--   check_transaction_balance en fin de post_ledger_transaction. p_period_id = la période d'accueil N+1
--   (ledger_transactions.period_id de l'écriture result_allocation). DEFINER, pas de garde métier
--   (appelée par regularize_period qui a déjà gardé en G-MGR).
create or replace function public.assert_result_allocation_split(
  p_copro_id  uuid,
  p_period_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.v_result_allocation_split
    where copro_id = p_copro_id and period_id = p_period_id
  ) then
    raise exception 'assert_result_allocation_split: affectation du résultat non conforme à l''invariant 110/120 (copro %, période %) — ventilation par nature (120/450-1 courant ET 110/450-2 travaux) ou somme (120+110 = résultat) incohérente', p_copro_id, p_period_id
      using errcode = '23514';
  end if;
end;
$$;
revoke execute on function public.assert_result_allocation_split(uuid, uuid) from public, anon;
grant execute on function public.assert_result_allocation_split(uuid, uuid) to authenticated, service_role;


-- ============================================================================================
-- 13. regularize_period(p_copro_id, p_period_id) -> jsonb   [G-MGR]   — AFFECTATION DU RÉSULTAT 110/120
-- ============================================================================================
-- Affecte aux copropriétaires (par quote-part de lot) le résultat de l'exercice N reporté en N+1 sur les
--   deux comptes de report, dans UNE SEULE écriture result_allocation datée CURRENT_DATE (date de l'AG),
--   postée en N+1 OUVERTE, idempotente par remplacement tant que N+1 n'est pas approuvée :
--   - branche COURANT : solde 120 de N+1 -> D 120 / C 450-1 par quote-part (clé générale active) ;
--   - branche TRAVAUX : solde 110 de N+1 -> D 110 / C 450-2 par quote-part (MIROIR du courant).
--   Sens débit/crédit selon excédent (solde créditeur > 0 -> D 12x / C 45x) ou déficit (inverse). Arrondi
--   cumulatif (la dernière ligne absorbe le reste) -> Σ lots = |solde| exact au centime, par branche.
-- CLÉ DE RÉPARTITION (choix documenté) : pour 450-1 ET 450-2, on utilise la CLÉ GÉNÉRALE active
--   (repartition_keys.category='general'). À défaut d'une clé travaux dédiée fiable au stade Phase 0,
--   la clé générale est l'assiette de répartition par défaut des charges courantes ET travaux — voir
--   openQuestions (une clé travaux distincte category='alur'/name 'travaux' serait préférable si fiable).
-- Garde G-MGR. APPELLE assert_result_allocation_split EN FIN (avant le RETURN) : rollback si la double
--   ventilation 110/120 manque (modèle check_transaction_balance). À-NOUVEAU AVANT AFFECTATION : suppose
--   open_next_period déjà passée (les soldes 110/120 de N+1 proviennent de la reprise à-nouveau).
create or replace function public.regularize_period(p_copro_id uuid, p_period_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_src_status  period_status;
  v_src_end     date;
  v_next        uuid;
  v_next_status period_status;
  v_ag_date     date := current_date;
  v_key         uuid;
  v_total_w     numeric;
  v_solde_120   numeric;
  v_solde_110   numeric;
  v_acct_120    uuid;
  v_acct_110    uuid;
  v_acct_4501   uuid;
  v_acct_4502   uuid;
  v_entries     jsonb := '[]'::jsonb;
  v_running     numeric;
  v_alloc       numeric;
  v_cnt         integer;
  v_lines       integer := 0;
  v_tx_res      jsonb;
  r             record;
begin
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: manager required for copro %', p_copro_id
      using errcode = '42501';
  end if;

  -- Exercice SOURCE N : on en dérive la date de fin (pour trouver N+1) et son statut (garde immutabilité).
  select status, end_date into v_src_status, v_src_end
  from public.accounting_periods
  where id = p_period_id and copro_id = p_copro_id;
  if v_src_status is null then
    raise exception 'regularize_period: exercice source % introuvable pour la copro %', p_period_id, p_copro_id
      using errcode = '23503';
  end if;

  -- Période d'accueil N+1 (premier exercice postérieur à N).
  select id, status into v_next, v_next_status
  from public.accounting_periods
  where copro_id = p_copro_id
    and start_date > v_src_end
  order by start_date
  limit 1;
  if v_next is null then
    raise exception 'regularize_period: exercice N+1 introuvable pour l''affectation (ouvrir open_next_period d''abord)'
      using errcode = '23503';
  end if;

  -- Garde immutabilité (message métier AVANT le trigger 0024) : l'exemption is_ledger_regen_exempt exige
  -- que NI l'exercice source N NI l'exercice d'accueil N+1 ne soient approuvés. Si l'un l'est et qu'une
  -- affectation existe déjà, on lève un message clair plutôt que de laisser le trigger remonter un message
  -- générique d'immutabilité GL.
  if (v_src_status = 'approved' or v_next_status = 'approved')
     and exists (
       select 1 from public.ledger_transactions
       where copro_id = p_copro_id and source_type = 'result_allocation' and source_id = p_period_id
     ) then
    raise exception 'regularize_period: affectation figée — exercice % approuvé en AG (source ou accueil), réaffectation interdite', p_period_id
      using errcode = '23514';
  end if;

  -- Idempotence : on remplace l'affectation précédente tant que NI N NI N+1 ne sont approuvés.
  if v_src_status <> 'approved' and v_next_status <> 'approved' then
    delete from public.ledger_transactions
    where copro_id = p_copro_id and source_type = 'result_allocation' and source_id = p_period_id;
  end if;

  select id into v_acct_120  from public.accounts where copro_id = p_copro_id and code = '120';
  select id into v_acct_110  from public.accounts where copro_id = p_copro_id and code = '110';
  select id into v_acct_4501 from public.accounts where copro_id = p_copro_id and code = '450-1';
  select id into v_acct_4502 from public.accounts where copro_id = p_copro_id and code = '450-2';
  if v_acct_4501 is null or v_acct_4502 is null then
    raise exception 'regularize_period: comptes 450-1/450-2 absents pour la copro %', p_copro_id
      using errcode = '23503';
  end if;

  -- Soldes 110/120 de N+1 (après à-nouveau) : Σ(débit − crédit) sur chaque compte de report.
  select round(coalesce(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 0), 2)
    into v_solde_120
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a on a.id = e.account_id
  where e.copro_id = p_copro_id and e.period_id = v_next and a.code = '120';

  select round(coalesce(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 0), 2)
    into v_solde_110
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a on a.id = e.account_id
  where e.copro_id = p_copro_id and e.period_id = v_next and a.code = '110';

  if v_solde_120 = 0 and v_solde_110 = 0 then
    return jsonb_build_object('success', true, 'skipped', 'soldes 110 et 120 nuls', 'next_period_id', v_next);
  end if;

  -- Clé de répartition (générale active) — assiette commune courant/travaux (choix documenté ci-dessus).
  select id into v_key
  from public.repartition_keys
  where copro_id = p_copro_id and category = 'general' and is_active = true
  limit 1;
  if v_key is null then
    raise exception 'regularize_period: clé de répartition générale active introuvable (copro %)', p_copro_id
      using errcode = '23503';
  end if;
  select sum(weight) into v_total_w from public.repartition_key_lines where key_id = v_key;
  if coalesce(v_total_w, 0) <= 0 then
    raise exception 'regularize_period: somme des poids de la clé générale nulle (copro %)', p_copro_id
      using errcode = '23514';
  end if;
  select count(*) into v_cnt from public.repartition_key_lines where key_id = v_key;

  -- Branche COURANT : D 120 (au total) / C 450-1 par quote-part (sens selon excédent/déficit).
  if v_solde_120 <> 0 then
    v_entries := v_entries || jsonb_build_object(
      'account_id', v_acct_120, 'lot_id', null,
      'direction', case when v_solde_120 > 0 then 'credit' else 'debit' end,
      'amount', abs(v_solde_120), 'entry_label', 'Affectation du résultat courant');

    v_running := 0;
    v_lines := 0;
    for r in select lot_id, weight from public.repartition_key_lines where key_id = v_key order by lot_id
    loop
      v_lines := v_lines + 1;
      if v_lines = v_cnt then
        v_alloc := round(abs(v_solde_120), 2) - v_running;
      else
        v_alloc := round(abs(v_solde_120) * r.weight / v_total_w, 2);
        v_running := v_running + v_alloc;
      end if;
      if v_alloc <> 0 then
        v_entries := v_entries || jsonb_build_object(
          'account_id', v_acct_4501, 'lot_id', r.lot_id,
          'direction', case when v_solde_120 > 0 then 'debit' else 'credit' end,
          'amount', v_alloc, 'entry_label', 'Affectation résultat courant au lot');
      end if;
    end loop;
  end if;

  -- Branche TRAVAUX (MIROIR) : D 110 (au total) / C 450-2 par quote-part (même arrondi cumulatif).
  if v_solde_110 <> 0 then
    v_entries := v_entries || jsonb_build_object(
      'account_id', v_acct_110, 'lot_id', null,
      'direction', case when v_solde_110 > 0 then 'credit' else 'debit' end,
      'amount', abs(v_solde_110), 'entry_label', 'Affectation du résultat travaux');

    v_running := 0;
    v_lines := 0;
    for r in select lot_id, weight from public.repartition_key_lines where key_id = v_key order by lot_id
    loop
      v_lines := v_lines + 1;
      if v_lines = v_cnt then
        v_alloc := round(abs(v_solde_110), 2) - v_running;
      else
        v_alloc := round(abs(v_solde_110) * r.weight / v_total_w, 2);
        v_running := v_running + v_alloc;
      end if;
      if v_alloc <> 0 then
        v_entries := v_entries || jsonb_build_object(
          'account_id', v_acct_4502, 'lot_id', r.lot_id,
          'direction', case when v_solde_110 > 0 then 'debit' else 'credit' end,
          'amount', v_alloc, 'entry_label', 'Affectation résultat travaux au lot');
      end if;
    end loop;
  end if;

  -- UNE SEULE écriture result_allocation (les deux branches réunies), datée AG, en N+1 ouverte.
  v_tx_res := public.create_ledger_transaction(
    p_copro_id, v_next, v_ag_date,
    'Affectation du résultat ' || p_period_id, 'result_allocation', p_period_id, v_entries, true
  );
  if not (v_tx_res->>'success')::boolean then
    raise exception 'regularize_period: échec écriture grand livre : %', v_tx_res->>'error'
      using errcode = '23514';
  end if;

  -- GARDE-FOU 110/120 EN FIN (rollback si la double ventilation manque) — modèle check_transaction_balance.
  perform public.assert_result_allocation_split(p_copro_id, v_next);

  return jsonb_build_object(
    'success', true,
    'allocated_courant', abs(v_solde_120),
    'allocated_travaux', abs(v_solde_110),
    'next_period_id', v_next,
    'tx_id', v_tx_res->>'tx_id'
  );
end;
$$;
revoke execute on function public.regularize_period(uuid, uuid) from public, anon;
grant execute on function public.regularize_period(uuid, uuid) to authenticated, service_role;

-- FIN 0027_periodes_affectation.sql
