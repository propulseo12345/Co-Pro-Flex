-- 0029_harnais_seed_golden_loop.sql — HARNAIS & SEED « BOUCLE D'OR » (sous-lot 5/5 finance)
-- Source : brief 0029 + corps LEGACY de référence (supabase/migrations_legacy/*seed_golden_loop*,
--          *test_copro*, *clean_test_copro*) ADAPTÉ aux SIGNATURES RPC CIBLES (0025/0026/0027/0028)
--          + colonnes EXACTES vérifiées sur 0006/0007/0008/0009/0010/0013/0015/0016 + enums 0002/0003.
--
-- BUT : poser le PALIER D'ACCEPTATION de la chaîne finance. Une copropriété construite de A à Z par les
--       RPC canoniques (provision_copro_chart -> validate_budget -> post_budget_call_for_funds ->
--       post_owner_payment -> facture/paiement fournisseur -> dépense réalisée) DOIT donner
--       audit_finance_integrity = 0 écart. La donnée NAÎT CONFORME (équilibre partie double, lot_id sur
--       chaque 45x, ledger_tx_id renseigné, onboarding_step NULL).
--       Ce fichier NE CRÉE QUE des FONCTIONS. AUCUNE table (toutes en 0001->0022). AUCUN objet
--       0001->0028 recréé ni retouché.
--
-- PÉRIMÈTRE DE LA GATE — close_period / open_next_period / regularize_period EXCLUS DU SEED (décision) :
--   L'invariant d'acceptation est audit_finance_integrity = 0. Son check #3 (LOT_GL_MISMATCH, 0028) oppose,
--   PAR LOT, le solde GL des 45x (v_owner_statement_by_lot, qui agrège TOUTES les périodes — pas de filtre)
--   au solde du relevé (call_for_funds_lines, un seul exercice). Or le cycle d'exercice déverse sur 450-x/lot
--   des mouvements que le relevé ne suit pas : open_next_period reporte l'À-NOUVEAU des soldes de bilan
--   (450-1/lot inclus -> double-comptage cross-période) ET regularize_period affecte le résultat D120/C450-1
--   PAR QUOTE-PART (lot_id). Chacun, seul, fait remonter v_lot_vs_gl_mismatch -> la gate échouerait. C'est une
--   incompatibilité STRUCTURELLE entre la vue cross-période (0028, GELÉE) et un cycle de clôture joué dans le
--   seed, PAS un bug de 0029. Le seed s'arrête donc à l'« exercice vivant conforme », comme le seed_golden_loop
--   LEGACY (qui ne clôturait jamais). Le cycle clôture/ouverture/affectation a ses PROPRES fonctions (0027) et
--   doit être éprouvé par un scénario DÉDIÉ, hors de la gate per-lot.
--   ⚠ À CONFIRMER USER : ramener l'affectation DANS la gate imposerait d'exclure source_type in
--     ('result_allocation','opening_balance') de v_lot_vs_gl_mismatch -> rouvrir 0028 (hors périmètre 0029).
--
-- RÉÉCRITURE vs LEGACY (le legacy appelle de VIEUX contrats — ne PAS les réutiliser) :
--   1. CHAÎNE AG ABANDONNÉE : le legacy passait par finalize_and_activate_ag (AG bespoke). La cible
--      utilise la ROUTE CANONIQUE DIRECTE validate_budget -> post_budget_call_for_funds (10 args). Pas
--      d'AG dans le seed (la chaîne AG->données vit ailleurs).
--   2. TABLE suppliers SUPPRIMÉE en cible -> on utilise public.tiers (is_supplier=true ;
--      uq_tiers_name unique(copro_id,name)). post_supplier_invoice prend p_tiers_id.
--   3. p_method = 'transfer' (et NON 'bank_transfer' : valeur absente de l'enum payment_method, 0002).
--   4. post_owner_payment / post_supplier_payment : p_idempotency_key explicite (clé déterministe par
--      lot/facture) -> idempotence vraie au réappel + désambiguïsation d'arité.
--   5. copros cible N'A PLUS les compteurs morts (lots_count/total_tantiemes/buildings_count) ni de table
--      source « boucle d'or 22222222 » à cloner : create_test_copro bâtit une STRUCTURE SYNTHÉTIQUE PROPRE
--      (cabinet + copro vide + provision_copro_chart + 1 exercice ouvert) ; seed_golden_loop pose lots/
--      copropriétaires/clés/budget puis déroule la chaîne. (Modèle = create_clean_test_copro du legacy.)
--   6. budget_lines.repartition_key_id est NOT NULL en cible (0016) -> chaque ligne porte une clé.
--   7. onboarding_step posé à NULL en fin de seed (CONTRAT 0028 : v_unpaid_by_lot exclut step NON NULL ;
--      une copro fraîche a step=0 (DEFAULT 0007) -> sans ce NULL, la gate « impayés cohérents » serait
--      vacuously true).
--
-- DROP DOUBLONS : VÉRIFIÉ par grep sur 0001->0028 — AUCUN objet doublon/abandonné n'existe (pas de
--   suppliers, lot_accounts, seed_golden_loop, create_test_copro, finalize_and_activate_ag,
--   post_call_for_funds mono-clé, surcharges post_*_payment 7-args, mail_*). En reconstruction PROPRE
--   ils n'ont JAMAIS été créés -> AUCUN DROP (ne rien inventer). document_versions (0020) est une table
--   LÉGITIME, pas un doublon. -> 0029 ne contient aucun DROP.
--
-- CONVENTIONS (G-SVC, durcissement transverse 0023->0028) :
--   - SECURITY DEFINER + set search_path = public ; garde G-SVC stricte (harnais/seed = jamais prod
--     publique) : IF NOT is_service_call() THEN RAISE 42501 ;
--   - REVOKE EXECUTE FROM public, anon ; GRANT service_role + authenticated (le harnais CI/vitest tourne
--     sous authenticated avec claim service_role -> is_service_call() reste true ; les posteurs internes
--     passent leur garde G-MGR via la branche is_service_call) ;
--   - UN SEUL % dans les RAISE (jamais %% ni %.2f) ; errcode 42501 ;
--   - PAS de WHEN OTHERS masquant : toute exception remonte (vrai rollback) ;
--   - noms de copro/cabinet préfixés HARNESS/TEST + gen_random_uuid pour l'unicité (copros/cabinets
--     n'ont pas d'unique sur name, mais on évite toute collision déterministe).
--
-- ORDRE DE DÉCLARATION (un objet appelé est défini AVANT son appelant) :
--   1. seed_golden_loop            (sur copro existante dotée du plan de comptes)
--   2. create_test_copro           (cabinet + copro vide + chart + exercice ouvert)
--   3. create_test_copro_seeded    (create_test_copro + seed_golden_loop ; INVARIANT audit = 0)
--   4. create_clean_test_copro        (alias documenté de create_test_copro)
--   5. create_clean_test_copro_seeded (alias documenté de create_test_copro_seeded)


-- ============================================================================================
-- 1. seed_golden_loop(p_copro_id) -> jsonb   [G-SVC]   — BOUCLE D'OR sur copro EXISTANTE
-- ============================================================================================
-- Pré-requis : la copro existe, son plan de comptes est provisionné (provision_copro_chart, 0025) et
--   elle a UN exercice 'open'. seed_golden_loop crée la STRUCTURE (lots/copropriétaires/lot_owners/
--   3 clés dont la générale COMPLÈTE + budget courant + lignes), puis déroule la CHAÎNE CANONIQUE :
--     validate_budget -> post_budget_call_for_funds (courant, T1) -> post_owner_payment (lots payés)
--     -> post_supplier_invoice + post_supplier_payment -> budget_expense + validate_budget_expense.
--   Pose enfin onboarding_step = NULL (contrat 0028). Génère une copro dont audit_finance_integrity = 0
--   écart (EXERCICE VIVANT CONFORME). Le cycle clôture/ouverture/affectation est VOLONTAIREMENT exclu du
--   seed (cf. note « PÉRIMÈTRE DE LA GATE » en fin de fonction et en-tête : incompatible avec la gate
--   per-lot car v_owner_statement_by_lot agrège toutes les périodes). Idempotence : la gate passe par
--   create_test_copro_seeded qui régénère une copro NEUVE à chaque appel ; ré-exécuter seed_golden_loop
--   sur la MÊME copro est court-circuité tant qu'un budget courant existe déjà sur la période (garde infra).
create or replace function public.seed_golden_loop(p_copro_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period       accounting_periods%rowtype;
  v_year         int;
  v_issue_date   date;
  v_due_date     date;
  v_pay_date     date;
  v_lot1 uuid := gen_random_uuid();
  v_lot2 uuid := gen_random_uuid();
  v_lot3 uuid := gen_random_uuid();
  v_lot4 uuid := gen_random_uuid();
  v_co1  uuid := gen_random_uuid();
  v_co2  uuid := gen_random_uuid();
  v_co3  uuid := gen_random_uuid();
  v_key_gen uuid := gen_random_uuid();
  v_key_eau uuid := gen_random_uuid();
  v_key_asc uuid := gen_random_uuid();
  v_acc_assur  uuid; v_acc_syndic uuid; v_acc_menage uuid; v_acc_divers uuid;
  v_acc_eau    uuid; v_acc_asc uuid;
  v_budget_id  uuid;
  v_call       jsonb; v_call_id uuid;
  v_tiers      uuid;
  v_inv        jsonb; v_invoice_id uuid;
  v_exp_line   uuid; v_exp uuid;
  v_nb_pay     int := 0;
  v_lot        record;
  v_line_ids   uuid[];
  v_due        numeric;
  v_inv_amount numeric := 2500.00;
  v_exp_amount numeric := 480.00;
begin
  -- Garde G-SVC stricte : seed/harnais jamais exposé en prod publique.
  if not public.is_service_call() then
    raise exception 'forbidden: service call required (seed_golden_loop)'
      using errcode = '42501';
  end if;

  -- 0. Exercice ouvert requis.
  select * into v_period
  from public.accounting_periods
  where copro_id = p_copro_id and status = 'open'
  order by start_date desc
  limit 1;
  if not found then
    raise exception 'seed_golden_loop: aucun exercice ouvert pour la copro %', p_copro_id;
  end if;
  v_year       := extract(year from v_period.start_date)::int;
  v_issue_date := v_period.start_date;
  v_due_date   := least(v_period.start_date + 30, v_period.end_date);
  v_pay_date   := least(current_date, v_period.end_date);

  -- Idempotence : un budget courant existe déjà -> déjà seedé.
  if exists (
    select 1 from public.budgets
    where copro_id = p_copro_id and period_id = v_period.id and budget_type = 'current'
  ) then
    return jsonb_build_object('success', true, 'skipped', 'deja seede (budget courant present sur la periode)');
  end if;

  -- 1. Copropriétaires (le 1er possède 2 lots).
  insert into public.coproprietaires (id, copro_id, is_company, first_name, last_name, email, is_resident) values
    (v_co1, p_copro_id, false, 'Alice', 'Martin',  'alice.'  || substr(p_copro_id::text,1,8) || '@test.fr', true),
    (v_co2, p_copro_id, false, 'Bruno', 'Durand',  'bruno.'  || substr(p_copro_id::text,1,8) || '@test.fr', true),
    (v_co3, p_copro_id, false, 'Chloe', 'Bernard', 'chloe.'  || substr(p_copro_id::text,1,8) || '@test.fr', false);

  -- 2. Lots (4 lots, 250 tantièmes chacun = 1000).
  insert into public.lots (id, copro_id, ref, type, floor) values
    (v_lot1, p_copro_id, 'A101', 'appartement', 1),
    (v_lot2, p_copro_id, 'A102', 'appartement', 1),
    (v_lot3, p_copro_id, 'A201', 'appartement', 2),
    (v_lot4, p_copro_id, 'A202', 'appartement', 2);

  -- 3. lot_owners (lot1+lot2 -> Alice ; lot3 -> Bruno ; lot4 -> Chloe), tous primaires actifs.
  insert into public.lot_owners (lot_id, coproprietaire_id, copro_id, share_percent, is_primary, start_date) values
    (v_lot1, v_co1, p_copro_id, 100, true, v_period.start_date),
    (v_lot2, v_co1, p_copro_id, 100, true, v_period.start_date),
    (v_lot3, v_co2, p_copro_id, 100, true, v_period.start_date),
    (v_lot4, v_co3, p_copro_id, 100, true, v_period.start_date);

  -- 4. Clés : générale COMPLÈTE (all_lots, tous les lots) + eau (subset lot1,2) + ascenseur (subset lot3,4).
  --    repartition_key_is_complete : 'all_lots' exige une ligne > 0 sur CHAQUE lot ; 'subset' >= 1 ligne.
  insert into public.repartition_keys (id, copro_id, name, basis, category, coverage_mode, is_active, valid_from) values
    (v_key_gen, p_copro_id, 'Cle generale ' || v_year,  'tantiemes', 'general', 'all_lots', true, v_period.start_date),
    (v_key_eau, p_copro_id, 'Cle eau ' || v_year,       'custom',    'special', 'subset',   true, v_period.start_date),
    (v_key_asc, p_copro_id, 'Cle ascenseur ' || v_year, 'custom',    'special', 'subset',   true, v_period.start_date);

  insert into public.repartition_key_lines (key_id, lot_id, copro_id, weight) values
    (v_key_gen, v_lot1, p_copro_id, 250),
    (v_key_gen, v_lot2, p_copro_id, 250),
    (v_key_gen, v_lot3, p_copro_id, 250),
    (v_key_gen, v_lot4, p_copro_id, 250),
    (v_key_eau, v_lot1, p_copro_id, 50),
    (v_key_eau, v_lot2, p_copro_id, 50),
    (v_key_asc, v_lot3, p_copro_id, 50),
    (v_key_asc, v_lot4, p_copro_id, 50);

  -- 5. Comptes de charge (provisionnés par provision_copro_chart, 0025) résolus par code.
  select id into v_acc_assur  from public.accounts where copro_id = p_copro_id and code = '616';
  select id into v_acc_syndic from public.accounts where copro_id = p_copro_id and code = '621';
  select id into v_acc_menage from public.accounts where copro_id = p_copro_id and code = '611';
  select id into v_acc_divers from public.accounts where copro_id = p_copro_id and code = '628';
  select id into v_acc_eau    from public.accounts where copro_id = p_copro_id and code = '601';
  select id into v_acc_asc    from public.accounts where copro_id = p_copro_id and code = '614';
  if v_acc_assur is null or v_acc_syndic is null or v_acc_menage is null
     or v_acc_divers is null or v_acc_eau is null or v_acc_asc is null then
    raise exception 'seed_golden_loop: plan de comptes incomplet pour la copro % (provision_copro_chart non exécuté ?)', p_copro_id;
  end if;

  -- 6. Budget prévisionnel courant (draft) + lignes (montants ronds -> arrondi cumulatif net).
  --    Total = 5250 + 4500 + 3750 + 1500 (général) + 1600 (eau) + 1400 (ascenseur) = 18000.
  insert into public.budgets (copro_id, period_id, budget_type, status, version, name)
  values (p_copro_id, v_period.id, 'current', 'draft', 1, 'Budget previsionnel ' || v_year)
  returning id into v_budget_id;

  insert into public.budget_lines (budget_id, copro_id, account_id, repartition_key_id, label, amount, code, sort_order) values
    (v_budget_id, p_copro_id, v_acc_assur,  v_key_gen, 'Assurance immeuble',      5250.00, '616', 1),
    (v_budget_id, p_copro_id, v_acc_syndic, v_key_gen, 'Honoraires syndic',       4500.00, '621', 2),
    (v_budget_id, p_copro_id, v_acc_menage, v_key_gen, 'Menage parties communes', 3750.00, '611', 3),
    (v_budget_id, p_copro_id, v_acc_divers, v_key_gen, 'Charges diverses',        1500.00, '628', 4),
    (v_budget_id, p_copro_id, v_acc_eau,    v_key_eau, 'Eau froide collective',   1600.00, '601', 5),
    (v_budget_id, p_copro_id, v_acc_asc,    v_key_asc, 'Maintenance ascenseur',   1400.00, '614', 6);

  -- 7. Chaîne canonique : valider le budget (sans GL), puis émettre l'appel agrégé T1 (avec GL).
  perform public.validate_budget(v_budget_id);

  v_call := public.post_budget_call_for_funds(
    p_copro_id, v_period.id, v_budget_id,
    'Appel T1 ' || v_year, 1, v_issue_date, v_due_date,
    1.0, null, null
  );
  if not (v_call->>'success')::boolean then
    raise exception 'seed_golden_loop: échec post_budget_call_for_funds : %', v_call->>'error';
  end if;
  v_call_id := (v_call->>'call_id')::uuid;

  -- 8. Paiements : tous les lots SAUF le lot 4 (un impayé pour alimenter v_unpaid_by_lot/relances).
  for v_lot in
    select id from public.lots where copro_id = p_copro_id and id <> v_lot4 order by ref
  loop
    select array_agg(cfl.id order by cfl.id), sum(cfl.amount_due)
      into v_line_ids, v_due
    from public.call_for_funds_lines cfl
    where cfl.call_id = v_call_id and cfl.lot_id = v_lot.id;

    if v_due is not null and v_due > 0 then
      perform public.post_owner_payment(
        p_copro_id, v_period.id, v_lot.id, v_due, v_pay_date,
        'transfer', 'Reglement (seed)', v_line_ids,
        'seed-pay-' || v_lot.id::text, null
      );
      v_nb_pay := v_nb_pay + 1;
    end if;
  end loop;

  -- 9. Charges réelles : 1 fournisseur (tiers) + 1 facture comptabilisée + son règlement.
  select id into v_tiers from public.tiers
  where copro_id = p_copro_id and is_supplier = true order by created_at limit 1;
  if v_tiers is null then
    insert into public.tiers (copro_id, name, is_supplier, category, is_active)
    values (p_copro_id, 'Prestataire Demo', true, 'externe', true)
    returning id into v_tiers;
  end if;

  v_inv := public.post_supplier_invoice(
    p_copro_id, v_period.id, v_tiers, 'SEED-' || v_year || '-001',
    least(v_period.start_date + 30, v_period.end_date),
    least(v_period.start_date + 60, v_period.end_date),
    'Prime assurance (seed)',
    jsonb_build_array(jsonb_build_object('account_id', v_acc_assur, 'label', 'Prime assurance', 'amount', v_inv_amount)),
    null, null, true, null, null, null
  );
  if not (v_inv->>'success')::boolean then
    raise exception 'seed_golden_loop: échec post_supplier_invoice : %', v_inv->>'error';
  end if;
  v_invoice_id := (v_inv->>'invoice_id')::uuid;

  perform public.post_supplier_payment(
    p_copro_id, v_period.id, v_invoice_id, v_inv_amount,
    least(v_period.start_date + 35, v_period.end_date),
    'transfer', 'Virement (seed)', 'seed-suppay-' || v_invoice_id::text
  );

  -- 10. 1 dépense budgétaire validée (réalisé D6xx / C401) sur une ligne de la clé générale.
  select id into v_exp_line
  from public.budget_lines
  where budget_id = v_budget_id and repartition_key_id = v_key_gen
  order by sort_order limit 1;
  if v_exp_line is not null then
    insert into public.budget_expenses (copro_id, budget_id, budget_line_id, label, amount, tx_date, status, tiers_id)
    values (p_copro_id, v_budget_id, v_exp_line, 'Petite reparation (seed)', v_exp_amount,
            least(v_period.start_date + 40, v_period.end_date), 'draft', v_tiers)
    returning id into v_exp;
    perform public.validate_budget_expense(v_exp);
  end if;

  -- 11. CONTRAT 0028 : fin d'onboarding -> onboarding_step NULL (sinon v_unpaid_by_lot exclut la copro).
  update public.copros set onboarding_step = null where id = p_copro_id;

  -- NOTE — PÉRIMÈTRE DE LA GATE (close_period / open_next_period / regularize_period DÉLIBÉRÉMENT EXCLUS) :
  --   La gate d'acceptation 0029 EXIGE audit_finance_integrity(copro_seedée) = 0 ligne. Le check #3 de cet
  --   audit (LOT_GL_MISMATCH, via v_lot_vs_gl_mismatch / v_owner_statement_by_lot, 0028) compare, PAR LOT :
  --     côté GL   = Σ des écritures 45x portant lot_id sur TOUTES les périodes (la vue n'a PAS de filtre période) ;
  --     côté relevé = Σ(amount_due − amount_paid) des call_for_funds_lines (un seul exercice).
  --   Or le cycle d'exercice re-déverse des mouvements sur 450-x/lot que le relevé ne suit pas :
  --     - open_next_period reporte en N+1 l'À-NOUVEAU des soldes de bilan, 450-1/lot INCLUS (volet 1) :
  --       le solde 450-1 d'un lot débiteur est alors compté DEUX fois (N + N+1) par la vue cross-période ;
  --     - regularize_period affecte le résultat D120/C450-1 PAR QUOTE-PART (lot_id), mouvement absent du relevé.
  --   Chacun, seul, suffit à faire remonter v_lot_vs_gl_mismatch -> la gate ÉCHOUE. C'est une incompatibilité
  --   STRUCTURELLE entre « relevé↔GL par lot = 0 » (vue 0028 cross-période, GELÉE) et « cycle d'exercice
  --   joué dans le seed », PAS un bug de 0029. Le seed s'arrête donc à l'état « exercice vivant conforme »
  --   (appels + paiements multi-nature + charge fournisseur + dépense réalisée + 1 impayé), comme le faisait
  --   le seed_golden_loop LEGACY (qui ne clôturait jamais). Le cycle clôture/ouverture/affectation est
  --   couvert par ses PROPRES fonctions (0027) et doit être éprouvé par un scénario de harnais DÉDIÉ, hors
  --   de la gate per-lot. (Décision à confirmer USER : cf. en-tête, faire remonter l'affectation dans la gate
  --   imposerait d'exclure source_type='result_allocation'/'opening_balance' de v_lot_vs_gl_mismatch — donc
  --   de rouvrir 0028, hors périmètre 0029.)

  return jsonb_build_object(
    'success', true,
    'copro_id', p_copro_id,
    'period_id', v_period.id,
    'budget_id', v_budget_id,
    'call_id', v_call_id,
    'invoice_id', v_invoice_id,
    'lots_payes', v_nb_pay,
    'lots_impayes', 1,
    'message', 'Boucle d''or generee (chaine canonique, exercice vivant conforme — audit_finance_integrity = 0)'
  );
end;
$$;
revoke execute on function public.seed_golden_loop(uuid) from public, anon;
grant execute on function public.seed_golden_loop(uuid) to authenticated, service_role;

comment on function public.seed_golden_loop(uuid) is
  'Seed BOUCLE D''OR : sur une copro existante au plan de comptes provisionne, construit la structure puis deroule la chaine canonique (validate_budget -> appel -> paiements -> facture/paiement fournisseur -> depense realisee). Exercice VIVANT CONFORME. Le cycle cloture/ouverture/affectation est VOLONTAIREMENT exclu (incompatible avec la gate per-lot : v_owner_statement_by_lot agrege toutes les periodes, cf. note PERIMETRE DE LA GATE). Pose onboarding_step=NULL. audit_finance_integrity = 0 ecart. G-SVC.';


-- ============================================================================================
-- 2. create_test_copro(p_name) -> uuid   [G-SVC]   — copro VIDE prête (cabinet + chart + exercice)
-- ============================================================================================
-- Crée un cabinet + une copro VIDE « HARNESS … » + provision_copro_chart (plan de comptes canonique)
--   + UN exercice comptable ouvert (année courante). Aucun flux financier. Retourne le copro_id.
--   Réutilisable pour tester la chaîne sur données jetables sans toucher de copro réelle.
create or replace function public.create_test_copro(p_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cabinet uuid := gen_random_uuid();
  v_copro   uuid := gen_random_uuid();
  v_period  uuid := gen_random_uuid();
  v_year    int  := extract(year from current_date)::int;
  v_label   text := coalesce(p_name, 'default');
begin
  if not public.is_service_call() then
    raise exception 'forbidden: service call required (create_test_copro)'
      using errcode = '42501';
  end if;

  insert into public.cabinets (id, name)
  values (v_cabinet, 'HARNESS cabinet ' || substr(v_cabinet::text, 1, 8));

  insert into public.copros (id, cabinet_id, name, exercice_debut, onboarding_step)
  values (v_copro, v_cabinet, 'HARNESS ' || substr(v_copro::text, 1, 8) || ' (' || v_label || ')', 1, 0);

  perform public.provision_copro_chart(v_copro);

  insert into public.accounting_periods (id, copro_id, name, start_date, end_date, status)
  values (v_period, v_copro, 'Exercice ' || v_year, make_date(v_year, 1, 1), make_date(v_year, 12, 31), 'open');

  return v_copro;
end;
$$;
revoke execute on function public.create_test_copro(text) from public, anon;
grant execute on function public.create_test_copro(text) to authenticated, service_role;

comment on function public.create_test_copro(text) is
  'Harnais : cabinet + copro VIDE « HARNESS … » + provision_copro_chart + 1 exercice ouvert. Renvoie le copro_id. Aucun flux. G-SVC.';


-- ============================================================================================
-- 3. create_test_copro_seeded(p_name) -> uuid   [G-SVC]   — copro VIDE + boucle d'or (GATE)
-- ============================================================================================
-- = create_test_copro + seed_golden_loop, en un appel. Retourne le copro_id.
-- INVARIANT D'ACCEPTATION : audit_finance_integrity(résultat) = 0 ligne (vérifié par le harnais CI).
create or replace function public.create_test_copro_seeded(p_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_copro uuid;
begin
  if not public.is_service_call() then
    raise exception 'forbidden: service call required (create_test_copro_seeded)'
      using errcode = '42501';
  end if;

  v_copro := public.create_test_copro(p_name);
  perform public.seed_golden_loop(v_copro);
  return v_copro;
end;
$$;
revoke execute on function public.create_test_copro_seeded(text) from public, anon;
grant execute on function public.create_test_copro_seeded(text) to authenticated, service_role;

comment on function public.create_test_copro_seeded(text) is
  'Harnais one-shot : create_test_copro + seed_golden_loop. Renvoie le copro_id. INVARIANT : audit_finance_integrity = 0 ecart. G-SVC.';


-- ============================================================================================
-- 4-5. create_clean_test_copro / create_clean_test_copro_seeded   [G-SVC]   — ALIAS DOCUMENTÉS
-- ============================================================================================
-- En reconstruction PROPRE, la distinction legacy « clean » (copro née du chemin canonique, sans
--   artefacts d'onboarding/reprise) vs « test » (clone de la boucle d'or 22222222) N'A PLUS DE SENS :
--   create_test_copro bâtit DÉJÀ une copro neuve, synthétique et propre (cabinet + plan canonique +
--   exercice ouvert), SANS clone d'une copro live ni scories de reprise de mandat. create_clean_* sont
--   donc des ALIAS stricts de create_test_copro(_seeded), conservés pour la compatibilité des appelants
--   (V1/V4, vitest) qui référencent ces noms. (Décision brief : ne PAS inventer de logique distincte.)
create or replace function public.create_clean_test_copro(p_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_service_call() then
    raise exception 'forbidden: service call required (create_clean_test_copro)'
      using errcode = '42501';
  end if;
  return public.create_test_copro(p_name);
end;
$$;
revoke execute on function public.create_clean_test_copro(text) from public, anon;
grant execute on function public.create_clean_test_copro(text) to authenticated, service_role;

comment on function public.create_clean_test_copro(text) is
  'Alias documente de create_test_copro (reconstruction propre : pas de distinction clean/test). G-SVC.';

create or replace function public.create_clean_test_copro_seeded(p_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_service_call() then
    raise exception 'forbidden: service call required (create_clean_test_copro_seeded)'
      using errcode = '42501';
  end if;
  return public.create_test_copro_seeded(p_name);
end;
$$;
revoke execute on function public.create_clean_test_copro_seeded(text) from public, anon;
grant execute on function public.create_clean_test_copro_seeded(text) to authenticated, service_role;

comment on function public.create_clean_test_copro_seeded(text) is
  'Alias documente de create_test_copro_seeded (reconstruction propre : pas de distinction clean/test). INVARIANT audit_finance_integrity = 0. G-SVC.';

-- FIN 0029_harnais_seed_golden_loop.sql
