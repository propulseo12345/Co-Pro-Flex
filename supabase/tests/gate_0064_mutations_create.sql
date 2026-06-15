-- Gate 0064 : création d'une mutation minimale (T7) sans colonnes fantômes.
-- Prouve que la réparation de createMutation tient AU NIVEAU BASE :
--   (1) buyer_draft jsonb existe et persiste ({name,email,is_company}) ;
--   (2) upsert_mutation_notary crée un tiers is_notary (office_name/email/ref)
--       puis le RÉUTILISE (même id) au 2e appel de même nom (find-or-create) ;
--   (3) une mutation minimale s'INSÈRE (seller + lot + period + notaire_id +
--       buyer_draft) SANS violer de FK, buyer_owner_id NULL ACCEPTÉ ;
--   (4) tests NÉGATIFS : les colonnes fantômes (buyer_name, notary_name, …)
--       N'EXISTENT PAS sur mutations (sinon le bug serait masqué) ;
--   (5) anti-vacuité : la ligne mutation est bien relue avec ses valeurs.
-- Le runner pose déjà le contexte service_role (pas de SET ROLE authenticated).
-- Auto-rollback via RAISE EXCEPTION 'ROLLBACK_TEST_OK'.
DO $$
DECLARE
  v_copro   uuid;
  v_lot     uuid;
  v_seller  uuid;
  v_period  uuid;
  v_notary  uuid;
  v_notary2 uuid;
  v_mut     uuid;
  v_n       int;
  v_draft   jsonb;
  v_arr     text[];
BEGIN
  -- (4) NÉGATIF : la table mutations ne porte AUCUNE colonne acquéreur/notaire libre.
  SELECT count(*) INTO v_n FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'mutations'
     AND column_name IN ('buyer_name','buyer_email','buyer_is_company',
                         'notary_name','notary_email','notary_reference');
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'ASSERT FAIL : colonnes fantômes encore présentes sur mutations (%)', v_n;
  END IF;

  -- buyer_draft DOIT exister (la réparation l'ajoute).
  SELECT count(*) INTO v_n FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'mutations' AND column_name = 'buyer_draft';
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : mutations.buyer_draft absent'; END IF;

  -- Harnais : copro seedée (lots + coproprietaires + exercice ouvert).
  v_copro := create_clean_test_copro_seeded('g64');

  SELECT id INTO v_period FROM public.accounting_periods
   WHERE copro_id = v_copro ORDER BY start_date DESC LIMIT 1;
  IF v_period IS NULL THEN RAISE EXCEPTION 'SETUP FAIL : aucun exercice sur la copro harnais'; END IF;

  -- Un lot avec un propriétaire actif (= le vendeur de la mutation).
  SELECT lo.lot_id, lo.coproprietaire_id INTO v_lot, v_seller
  FROM public.lot_owners lo
  WHERE lo.copro_id = v_copro AND lo.end_date IS NULL AND lo.is_primary = true
  ORDER BY lo.start_date LIMIT 1;
  IF v_lot IS NULL OR v_seller IS NULL THEN
    RAISE EXCEPTION 'SETUP FAIL : pas de lot/propriétaire actif (seed boucle d''or attendu)';
  END IF;

  -- (2) find-or-create du notaire (le notaire saisi librement → tiers is_notary).
  v_notary := public.upsert_mutation_notary(
    v_copro, 'Me Gate Notaire', 'gate.notaire@etude.fr', 'Étude Gate', 'REF-G64-001');
  IF v_notary IS NULL THEN RAISE EXCEPTION 'ASSERT FAIL : upsert_mutation_notary a renvoyé NULL'; END IF;

  SELECT count(*) INTO v_n FROM public.tiers
   WHERE id = v_notary AND copro_id = v_copro AND is_notary = true
     AND name = 'Me Gate Notaire' AND email = 'gate.notaire@etude.fr'
     AND office_name = 'Étude Gate' AND notary_reference = 'REF-G64-001' AND is_active = true;
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : tiers notaire mal créé'; END IF;

  -- 2e appel même nom = RÉUTILISATION (idempotence, pas de violation uq_tiers_name).
  v_notary2 := public.upsert_mutation_notary(v_copro, 'Me Gate Notaire');
  IF v_notary2 IS DISTINCT FROM v_notary THEN
    RAISE EXCEPTION 'ASSERT FAIL : find-or-create a créé un doublon (% <> %)', v_notary2, v_notary;
  END IF;
  SELECT count(*) INTO v_n FROM public.tiers
   WHERE copro_id = v_copro AND name = 'Me Gate Notaire';
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : % tiers notaire « Me Gate Notaire » (attendu 1)', v_n; END IF;

  -- (3) INSERT mutation minimale : seller + lot + period + notaire_id + buyer_draft,
  --     buyer_owner_id LAISSÉ NULL (l'acquéreur n'est pas encore copropriétaire).
  v_draft := jsonb_build_object('name', 'Jean ACQUEREUR',
                                'email', 'jean.acquereur@example.fr',
                                'is_company', false);
  INSERT INTO public.mutations
    (copro_id, lot_id, period_id, status, mutation_type,
     seller_owner_id, buyer_owner_id, notaire_id, buyer_draft, notes)
  VALUES
    (v_copro, v_lot, v_period, 'draft', 'sale',
     v_seller, NULL, v_notary, v_draft, 'Gate 64')
  RETURNING id INTO v_mut;
  IF v_mut IS NULL THEN RAISE EXCEPTION 'ASSERT FAIL : INSERT mutation a échoué (id NULL)'; END IF;

  -- (5) anti-vacuité : la mutation est relue avec EXACTEMENT les valeurs attendues.
  SELECT count(*) INTO v_n FROM public.mutations
   WHERE id = v_mut AND copro_id = v_copro AND lot_id = v_lot AND period_id = v_period
     AND status = 'draft' AND mutation_type = 'sale'
     AND seller_owner_id = v_seller AND buyer_owner_id IS NULL
     AND notaire_id = v_notary
     AND buyer_draft ->> 'name' = 'Jean ACQUEREUR'
     AND buyer_draft ->> 'email' = 'jean.acquereur@example.fr'
     AND (buyer_draft ->> 'is_company')::boolean = false;
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : mutation relue ne correspond pas (anti-vacuité)'; END IF;

  -- La vue d'agrégat reste cohérente (notary_name dérivé du tiers, buyer_name NULL
  -- tant que buyer_owner_id NULL) : prouve que buyer_draft ne casse pas v_mutations_overview.
  SELECT count(*) INTO v_n FROM public.v_mutations_overview
   WHERE id = v_mut AND notary_name = 'Me Gate Notaire' AND buyer_name IS NULL;
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : v_mutations_overview incohérente après INSERT'; END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
