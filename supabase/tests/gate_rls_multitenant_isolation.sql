-- GATE — ÉTANCHÉITÉ MULTI-CABINET (B1 / J1 sécurité)
-- ============================================================================================
-- Prouve qu'un gestionnaire du cabinet A, sous RLS ACTIVE + FORCÉE, ne voit ET ne modifie
-- AUCUNE donnée du cabinet B, sur toute la surface critique (copros, lots, copropriétaires,
-- plan comptable, grand livre, budgets, appels, paiements, modèles de résolution).
--
-- Lancé par db-test.mjs (contexte service_role préfixé). Auto-rollback (ROLLBACK_TEST_OK).
--
-- Mécanique RLS (identique au gate 0042) : psql tourne en `postgres` (superuser → bypass RLS).
-- Pour que la RLS s'applique vraiment, on bascule `SET ROLE authenticated` (rôle NON superuser,
-- SANS bypassrls) après avoir posé le JWT du gestionnaire (request.jwt.claims.sub). La RLS est
-- ENABLE + FORCE dans un sous-bloc BEGIN…EXCEPTION (= savepoint) : à la sortie (sentinelle), le
-- ROLLBACK du savepoint défait la bascule → on ne laisse aucune table en RLS forcée.
--
-- PREUVE POSITIVE (anti faux-vert) : on vérifie d'ABORD, en service_role, que le cabinet B a
-- bien des données (lots/écritures/copros > 0). « 0 ligne vue » ne prouve l'étanchéité que si
-- la cible n'est pas vide. On vérifie AUSSI que le gestionnaire A voit bien SES propres données
-- (RLS ≠ simple deny-all).
DO $$
DECLARE
  v_copro_a uuid; v_cab_a uuid;
  v_copro_b uuid; v_cab_b uuid;
  v_mgr_a   uuid := gen_random_uuid();
  v_n int; v_b_lots int; v_b_entries int; v_b_accounts int;
  v_tpl_b   uuid;
  v_tiers_a uuid; v_tiers_b uuid; v_domain uuid;
  -- surface testée : table -> colonne copro
  r record;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);

  -- Deux cabinets indépendants, chacun une copro seedée (boucle d'or complète, audit=0).
  v_copro_a := create_clean_test_copro_seeded('iso-cabinet-A');
  v_copro_b := create_clean_test_copro_seeded('iso-cabinet-B');
  SELECT cabinet_id INTO v_cab_a FROM public.copros WHERE id = v_copro_a;
  SELECT cabinet_id INTO v_cab_b FROM public.copros WHERE id = v_copro_b;
  IF v_cab_a = v_cab_b THEN
    RAISE EXCEPTION 'SETUP FAIL : les deux copros partagent le même cabinet (%).', v_cab_a;
  END IF;

  -- Modèle de résolution PRIVÉ du cabinet B (doit rester invisible au gestionnaire A).
  INSERT INTO public.resolution_templates (cabinet_id, copro_id, titre, categorie, texte, majorite, scope)
  VALUES (v_cab_b, v_copro_b, 'Modele prive cabinet B', 'Divers', 'x', 'ART_24', 'org')
  RETURNING id INTO v_tpl_b;

  -- Gestionnaire rattaché au cabinet A uniquement.
  INSERT INTO auth.users (id, email) VALUES (v_mgr_a, 'mgr.a.' || substr(v_mgr_a::text,1,8) || '@test.fr');
  UPDATE public.profiles SET cabinet_id = v_cab_a WHERE id = v_mgr_a;
  INSERT INTO public.memberships (user_id, copro_id, role) VALUES (v_mgr_a, v_copro_a, 'gestionnaire');

  -- Surface MAINTENANCE (extension revue 2026-06-11) : données dans les DEUX cabinets,
  -- pour prouver l'étanchéité (B invisible) ET la visibilité positive À TRAVERS les vues
  -- security_invoker de 0047 (le bug d'origine = écrans vides silencieux côté gestionnaire).
  SELECT id INTO v_domain FROM public.work_domain WHERE slug = 'plomberie';
  IF v_domain IS NULL THEN
    RAISE EXCEPTION 'SETUP FAIL : référentiel work_domain non seedé';
  END IF;
  INSERT INTO public.tiers (copro_id, name, category, is_provider, domain_ids)
  VALUES (v_copro_a, 'Presta cabinet A', 'externe', true, ARRAY[v_domain]) RETURNING id INTO v_tiers_a;
  INSERT INTO public.tiers (copro_id, name, category, is_provider, domain_ids, email)
  VALUES (v_copro_b, 'Presta cabinet B', 'externe', true, ARRAY[v_domain], 'secret.b@x.fr') RETURNING id INTO v_tiers_b;
  INSERT INTO public.contracts (copro_id, tiers_id, label, domain_id, start_date, end_date, status, notice_months)
  VALUES (v_copro_a, v_tiers_a, 'Contrat A', v_domain, current_date - 10, current_date + 365, 'active', 2),
         (v_copro_b, v_tiers_b, 'Contrat B', v_domain, current_date - 10, current_date + 365, 'active', 2);
  INSERT INTO public.service_orders (copro_id, tiers_id, order_number, title, order_type, origin, status, urgency)
  VALUES (v_copro_a, v_tiers_a, 'OS-RLS-A', 'OS cabinet A', 'classique', 'syndic', 'sent', 'normal'),
         (v_copro_b, v_tiers_b, 'OS-RLS-B', 'OS cabinet B', 'classique', 'syndic', 'sent', 'normal');
  INSERT INTO public.logbook_entries (copro_id, tiers_id, title, entry_type, category, status, happened_at)
  VALUES (v_copro_b, v_tiers_b, 'Carnet cabinet B', 'intervention', 'courante', 'planifiee', current_date);

  -- PREUVE POSITIVE : le cabinet B contient bien des données (sinon « 0 vu » serait trivial).
  SELECT count(*) INTO v_b_lots     FROM public.lots           WHERE copro_id = v_copro_b;
  SELECT count(*) INTO v_b_entries  FROM public.ledger_entries WHERE copro_id = v_copro_b;
  SELECT count(*) INTO v_b_accounts FROM public.accounts       WHERE copro_id = v_copro_b;
  IF v_b_lots = 0 OR v_b_entries = 0 OR v_b_accounts = 0 THEN
    RAISE EXCEPTION 'SETUP FAIL : cabinet B vide (lots=%, entries=%, accounts=%) — test sans valeur',
      v_b_lots, v_b_entries, v_b_accounts;
  END IF;

  -- ====================== SOUS-BLOC RLS FORCÉE (savepoint) ======================
  BEGIN
    -- Le seed a posté des écritures GL → triggers de contrôle DIFFÉRÉS (équilibre vérifié au
    -- COMMIT) encore en attente. Postgres refuse ALTER TABLE tant qu'ils sont pendants : on les
    -- force à s'exécuter maintenant (le GL seedé est équilibré, audit=0 → ils passent).
    SET CONSTRAINTS ALL IMMEDIATE;

    -- Active + FORCE la RLS sur toute la surface testée (FORCE : s'applique même au propriétaire).
    FOR r IN
      SELECT unnest(ARRAY[
        'copros','lots','coproprietaires','lot_owners','accounts','accounting_periods',
        'ledger_transactions','ledger_entries','budgets','budget_lines',
        'call_for_funds','call_for_funds_lines','payments','payment_allocations',
        'resolution_templates',
        -- surface maintenance (0047)
        'tiers','contracts','service_orders','logbook_entries','supplier_invoices',
        'service_order_events','buildings','work_domain'
      ]) AS t
    LOOP
      EXECUTE format('alter table public.%I enable row level security', r.t);
      EXECUTE format('alter table public.%I force row level security', r.t);
    END LOOP;

    -- Bascule sur le gestionnaire A (rôle authenticated, NON superuser → RLS s'applique).
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_mgr_a, 'role','authenticated')::text, true);
    PERFORM set_config('role', 'authenticated', true);

    -- (1) ÉTANCHÉITÉ : 0 ligne du cabinet B sur chaque table tenant.
    SELECT count(*) INTO v_n FROM public.copros WHERE id = v_copro_b;
    IF v_n <> 0 THEN PERFORM set_config('role','service_role',true);
      RAISE EXCEPTION 'FUITE : copros cabinet B vues par gestionnaire A (% lignes)', v_n; END IF;

    SELECT count(*) INTO v_n FROM public.lots WHERE copro_id = v_copro_b;
    IF v_n <> 0 THEN PERFORM set_config('role','service_role',true);
      RAISE EXCEPTION 'FUITE : lots cabinet B vus (% / attendu 0, B a % lots)', v_n, v_b_lots; END IF;

    SELECT count(*) INTO v_n FROM public.coproprietaires WHERE copro_id = v_copro_b;
    IF v_n <> 0 THEN PERFORM set_config('role','service_role',true);
      RAISE EXCEPTION 'FUITE : coproprietaires cabinet B vus (% lignes)', v_n; END IF;

    SELECT count(*) INTO v_n FROM public.accounts WHERE copro_id = v_copro_b;
    IF v_n <> 0 THEN PERFORM set_config('role','service_role',true);
      RAISE EXCEPTION 'FUITE : plan comptable cabinet B vu (% / B a % comptes)', v_n, v_b_accounts; END IF;

    SELECT count(*) INTO v_n FROM public.ledger_entries WHERE copro_id = v_copro_b;
    IF v_n <> 0 THEN PERFORM set_config('role','service_role',true);
      RAISE EXCEPTION 'FUITE GRAND LIVRE : ledger_entries cabinet B vues (% / B a % écritures)', v_n, v_b_entries; END IF;

    SELECT count(*) INTO v_n FROM public.ledger_transactions WHERE copro_id = v_copro_b;
    IF v_n <> 0 THEN PERFORM set_config('role','service_role',true);
      RAISE EXCEPTION 'FUITE GRAND LIVRE : ledger_transactions cabinet B vues (% lignes)', v_n; END IF;

    SELECT count(*) INTO v_n FROM public.budgets WHERE copro_id = v_copro_b;
    IF v_n <> 0 THEN PERFORM set_config('role','service_role',true);
      RAISE EXCEPTION 'FUITE : budgets cabinet B vus (% lignes)', v_n; END IF;

    SELECT count(*) INTO v_n FROM public.call_for_funds WHERE copro_id = v_copro_b;
    IF v_n <> 0 THEN PERFORM set_config('role','service_role',true);
      RAISE EXCEPTION 'FUITE : appels de fonds cabinet B vus (% lignes)', v_n; END IF;

    SELECT count(*) INTO v_n FROM public.payments WHERE copro_id = v_copro_b;
    IF v_n <> 0 THEN PERFORM set_config('role','service_role',true);
      RAISE EXCEPTION 'FUITE : paiements cabinet B vus (% lignes)', v_n; END IF;

    -- (1b) Modèle de résolution PRIVÉ du cabinet B : invisible.
    SELECT count(*) INTO v_n FROM public.resolution_templates WHERE id = v_tpl_b;
    IF v_n <> 0 THEN PERFORM set_config('role','service_role',true);
      RAISE EXCEPTION 'FUITE : modèle résolution privé cabinet B vu (% lignes)', v_n; END IF;

    -- (1d) Surface MAINTENANCE : tables ET vues 0047 du cabinet B invisibles.
    SELECT count(*) INTO v_n FROM public.tiers WHERE copro_id = v_copro_b;
    IF v_n <> 0 THEN PERFORM set_config('role','service_role',true);
      RAISE EXCEPTION 'FUITE : tiers cabinet B vus (% lignes, PII prestataires)', v_n; END IF;
    SELECT count(*) INTO v_n FROM public.contracts WHERE copro_id = v_copro_b;
    IF v_n <> 0 THEN PERFORM set_config('role','service_role',true);
      RAISE EXCEPTION 'FUITE : contrats cabinet B vus (% lignes)', v_n; END IF;
    SELECT count(*) INTO v_n FROM public.service_orders WHERE copro_id = v_copro_b;
    IF v_n <> 0 THEN PERFORM set_config('role','service_role',true);
      RAISE EXCEPTION 'FUITE : ordres de service cabinet B vus (% lignes)', v_n; END IF;
    SELECT count(*) INTO v_n FROM public.logbook_entries WHERE copro_id = v_copro_b;
    IF v_n <> 0 THEN PERFORM set_config('role','service_role',true);
      RAISE EXCEPTION 'FUITE : carnet d''entretien cabinet B vu (% lignes)', v_n; END IF;
    SELECT count(*) INTO v_n FROM public.v_providers_overview WHERE copro_id = v_copro_b;
    IF v_n <> 0 THEN PERFORM set_config('role','service_role',true);
      RAISE EXCEPTION 'FUITE : v_providers_overview expose le cabinet B (% lignes)', v_n; END IF;
    SELECT count(*) INTO v_n FROM public.v_dashboard_kpis WHERE copro_id = v_copro_b;
    IF v_n <> 0 THEN PERFORM set_config('role','service_role',true);
      RAISE EXCEPTION 'FUITE : v_dashboard_kpis expose le cabinet B (% lignes)', v_n; END IF;

    -- (1c) ÉCRITURE : le gestionnaire A ne peut PAS modifier une copro du cabinet B.
    UPDATE public.copros SET name = 'hijack' WHERE id = v_copro_b;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n <> 0 THEN PERFORM set_config('role','service_role',true);
      RAISE EXCEPTION 'FUITE ÉCRITURE : gestionnaire A a modifié % copro(s) du cabinet B', v_n; END IF;

    -- (2) PREUVE POSITIVE : le gestionnaire A voit BIEN ses propres données (RLS ≠ deny-all).
    SELECT count(*) INTO v_n FROM public.copros WHERE id = v_copro_a;
    IF v_n <> 1 THEN PERFORM set_config('role','service_role',true);
      RAISE EXCEPTION 'RÉGRESSION : gestionnaire A ne voit pas SA copro (% / attendu 1)', v_n; END IF;

    SELECT count(*) INTO v_n FROM public.ledger_entries WHERE copro_id = v_copro_a;
    IF v_n = 0 THEN PERFORM set_config('role','service_role',true);
      RAISE EXCEPTION 'RÉGRESSION : gestionnaire A ne voit AUCUNE écriture de SA copro'; END IF;

    -- (2b) PREUVE POSITIVE PAR LES VUES 0047 : le gestionnaire A voit SES données
    -- maintenance À TRAVERS les vues security_invoker (anti « écran vide silencieux » :
    -- une policy trop stricte sur tiers/contracts/work_domain rendrait ces vues vides
    -- pour un gestionnaire légitime sans qu'aucune autre gate ne rougisse).
    SELECT count(*) INTO v_n FROM public.v_providers_overview WHERE copro_id = v_copro_a;
    IF v_n = 0 THEN PERFORM set_config('role','service_role',true);
      RAISE EXCEPTION 'RÉGRESSION : gestionnaire A ne voit pas SES prestataires via v_providers_overview'; END IF;
    SELECT count(*) INTO v_n FROM public.v_contracts_overview
     WHERE copro_id = v_copro_a AND provider_name = 'Presta cabinet A' AND contract_type = 'plomberie';
    IF v_n = 0 THEN PERFORM set_config('role','service_role',true);
      RAISE EXCEPTION 'RÉGRESSION : v_contracts_overview vide (ou provider_name/slug non résolus) pour le gestionnaire A'; END IF;
    SELECT count(*) INTO v_n FROM public.v_service_orders_overview WHERE copro_id = v_copro_a;
    IF v_n = 0 THEN PERFORM set_config('role','service_role',true);
      RAISE EXCEPTION 'RÉGRESSION : gestionnaire A ne voit pas SES ordres de service via la vue'; END IF;
    SELECT count(*) INTO v_n FROM public.v_dashboard_kpis WHERE copro_id = v_copro_a;
    IF v_n <> 1 THEN PERFORM set_config('role','service_role',true);
      RAISE EXCEPTION 'RÉGRESSION : v_dashboard_kpis % ligne(s) pour la copro A (attendu 1)', v_n; END IF;

    -- Restaure service_role et provoque le ROLLBACK du savepoint (défait la RLS forcée).
    PERFORM set_config('role','service_role', true);
    PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
    RAISE EXCEPTION 'RLS_SUBTEST_OK';
  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('role','service_role', true);
    PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
    IF SQLERRM <> 'RLS_SUBTEST_OK' THEN RAISE; END IF;
  END;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK : étanchéité multi-cabinet prouvée'; ELSE RAISE; END IF;
END $$;
