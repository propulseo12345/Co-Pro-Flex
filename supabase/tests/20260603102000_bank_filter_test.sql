-- TEST listComptesBancaires (filtre côté base) : l'enum account_type n'a PAS de valeur 'bank'.
-- Avant correctif : le filtre account_type='bank' renvoie 0. Après : >= 1 si la copro a un 512/502.
DO $$
DECLARE v jsonb; v_copro uuid; v_old int; v_new int;
BEGIN
  v := create_clean_test_copro_seeded('bankfilter', 15000, 0);
  v_copro := (v->>'copro_id')::uuid;
  -- créer un compte banque comme l'étape 4 (createCompteBancaire) : 512000, asset
  INSERT INTO accounts (copro_id, code, name, account_type, is_postable)
  VALUES (v_copro, '512000', 'Compte courant TEST', 'asset', true);

  -- cast text : 'bank' n'existe pas dans l'enum account_type, on évite l'erreur de cast enum.
  SELECT count(*) INTO v_old FROM accounts WHERE copro_id=v_copro AND account_type::text='bank';
  SELECT count(*) INTO v_new FROM accounts
   WHERE copro_id=v_copro AND account_type='asset' AND (code LIKE '512%' OR code LIKE '502%');

  IF v_old <> 0 THEN RAISE EXCEPTION 'ASSERT FAIL : ancien filtre bank ne devrait jamais matcher (=%)', v_old; END IF;
  IF v_new < 1 THEN RAISE EXCEPTION 'ASSERT FAIL : nouveau filtre 512/502 doit ramener >=1 (=%)', v_new; END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
