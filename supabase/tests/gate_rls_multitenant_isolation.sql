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
        'resolution_templates'
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
