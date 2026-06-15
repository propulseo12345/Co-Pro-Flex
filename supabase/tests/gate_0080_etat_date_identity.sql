-- GATE E2E — 0080 : état daté, IDENTITÉ des parties GELÉE dans le payload (Option B)
-- ============================================================================================
-- Prouve :
--   IDENTITÉ. Le payload contient les blocs nommés copro / syndic / lot / seller / notaire,
--             remplis (noms NON vides) — pas seulement des identifiants.
--   GEL.      Le notaire (tiers) et sa référence sont figés tels quels (valeur probante).
--   RÉGRESSION. Les 3 clés racine financières + version='2.0' restent présentes (logique 0076 intacte).
-- Auto-rollback (ROLLBACK_TEST_OK). Contexte service_role préfixé par db-test.mjs.
DO $$
DECLARE
  v_copro uuid; v_n uuid; v_lot uuid; v_seller uuid; v_notaire uuid; v_mut uuid;
  v_cab uuid; r jsonb;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);

  v_copro := create_clean_test_copro_seeded('0080-identity');
  SELECT id INTO v_n FROM accounting_periods WHERE copro_id=v_copro AND status='open' ORDER BY start_date DESC LIMIT 1;
  SELECT id INTO v_lot FROM lots WHERE copro_id=v_copro ORDER BY id LIMIT 1;
  SELECT coproprietaire_id INTO v_seller FROM lot_owners WHERE lot_id=v_lot AND is_primary=true AND end_date IS NULL LIMIT 1;
  IF v_seller IS NULL THEN RAISE EXCEPTION '0080 setup : vendeur manquant'; END IF;

  -- Notaire (tiers is_notary) + rattachement à la mutation -> doit être nommé/gelé dans le payload.
  INSERT INTO tiers (copro_id, name, is_notary, office_name, notary_reference, email, address, postal_code, city)
  VALUES (v_copro, 'Maitre Dupont', true, 'Office Notarial Test', 'REF-0080', 'notaire@test.fr', '2 rue du Notaire', '75002', 'Paris')
  RETURNING id INTO v_notaire;

  INSERT INTO mutations (copro_id, lot_id, period_id, status, seller_owner_id, notaire_id)
  VALUES (v_copro, v_lot, v_n, 'draft', v_seller, v_notaire) RETURNING id INTO v_mut;

  r := generate_etat_date_payload(v_copro, v_mut, 'pre');

  -- ── Régression financière (logique 0076 intacte) ──
  IF NOT (r ? 'partie_1_sommes_dues_vendeur' AND r ? 'partie_2_dues_par_syndicat' AND r ? 'partie_3_charge_acquereur') THEN
    RAISE EXCEPTION 'RÉGRESSION : une clé racine financière manque'; END IF;
  IF r->>'version' <> '2.0' THEN RAISE EXCEPTION 'RÉGRESSION : version != 2.0'; END IF;

  -- ── Identité : blocs présents ──
  IF NOT (r ? 'copro' AND r ? 'syndic' AND r ? 'lot' AND r ? 'seller' AND r ? 'notaire') THEN
    RAISE EXCEPTION 'IDENTITÉ : un bloc d''identité manque (%)', r; END IF;

  -- ── Identité : valeurs nommées (non vides) ──
  IF coalesce(r->'copro'->>'name','') = '' THEN RAISE EXCEPTION 'IDENTITÉ : copro.name vide'; END IF;
  IF coalesce(r->'lot'->>'ref','') = '' THEN RAISE EXCEPTION 'IDENTITÉ : lot.ref vide'; END IF;
  IF coalesce(r->'seller'->>'name','') = '' THEN RAISE EXCEPTION 'IDENTITÉ : seller.name vide'; END IF;
  IF coalesce(r->'notaire'->>'name','') = '' THEN RAISE EXCEPTION 'IDENTITÉ : notaire.name vide (gel)'; END IF;
  IF coalesce(r->'notaire'->>'notary_reference','') <> 'REF-0080' THEN
    RAISE EXCEPTION 'IDENTITÉ : notaire.notary_reference non gelée (% )', r->'notaire'->>'notary_reference'; END IF;

  -- ── Syndic : si la copro est rattachée à un cabinet, son nom doit être figé ──
  SELECT cabinet_id INTO v_cab FROM copros WHERE id = v_copro;
  IF v_cab IS NOT NULL AND coalesce(r->'syndic'->>'name','') = '' THEN
    RAISE EXCEPTION 'IDENTITÉ : syndic.name vide alors que cabinet rattaché'; END IF;

  RAISE NOTICE 'GATE 0080 OK : identité gelée (copro/syndic/lot/vendeur/notaire nommés) + régression financière 2.0';
  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
