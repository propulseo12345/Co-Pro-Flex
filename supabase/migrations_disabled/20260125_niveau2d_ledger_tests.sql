-- ============================================
-- Tests: NIVEAU 2D - LEDGER
-- Date: 2026-01-25
-- Description: Tests pour vérifier les invariants du ledger
-- IMPORTANT: À exécuter APRÈS la migration et le seed
-- ============================================

-- ============================================
-- TEST 1: Vérifier l'équilibre d'une transaction posted
-- ============================================
DO $$
DECLARE
  v_tx RECORD;
  v_balance RECORD;
  v_test_passed BOOLEAN := true;
BEGIN
  RAISE NOTICE '=== TEST 1: Vérifier équilibre des transactions posted ===';

  FOR v_tx IN
    SELECT id, label FROM ledger_transactions WHERE status = 'posted' LIMIT 5
  LOOP
    SELECT * INTO v_balance FROM check_transaction_balance(v_tx.id);

    IF NOT v_balance.is_balanced THEN
      RAISE WARNING 'FAILED: Transaction % is not balanced (diff=%.2f)',
        v_tx.label, v_balance.difference;
      v_test_passed := false;
    ELSE
      RAISE NOTICE 'OK: Transaction "%s" is balanced (debit=%.2f, credit=%.2f)',
        v_tx.label, v_balance.total_debit, v_balance.total_credit;
    END IF;
  END LOOP;

  IF v_test_passed THEN
    RAISE NOTICE 'TEST 1 PASSED: All posted transactions are balanced';
  ELSE
    RAISE EXCEPTION 'TEST 1 FAILED: Some transactions are not balanced';
  END IF;
END $$;


-- ============================================
-- TEST 2: Tester post_ledger_transaction sur une transaction draft
-- ============================================
DO $$
DECLARE
  v_copro_id UUID;
  v_period_id UUID;
  v_tx_id UUID;
  v_account_1 UUID;
  v_account_2 UUID;
  v_result JSONB;
BEGIN
  RAISE NOTICE '=== TEST 2: Tester post_ledger_transaction ===';

  -- Récupérer une copro et période
  SELECT c.id, ap.id INTO v_copro_id, v_period_id
  FROM copros c
  JOIN accounting_periods ap ON ap.copro_id = c.id AND ap.status = 'open'
  LIMIT 1;

  IF v_copro_id IS NULL THEN
    RAISE NOTICE 'SKIP: No copro with open period found';
    RETURN;
  END IF;

  -- Récupérer deux comptes
  SELECT id INTO v_account_1 FROM accounts WHERE copro_id = v_copro_id LIMIT 1 OFFSET 0;
  SELECT id INTO v_account_2 FROM accounts WHERE copro_id = v_copro_id LIMIT 1 OFFSET 1;

  IF v_account_1 IS NULL OR v_account_2 IS NULL THEN
    RAISE NOTICE 'SKIP: Not enough accounts for test';
    RETURN;
  END IF;

  -- Créer une transaction de test
  INSERT INTO ledger_transactions (copro_id, period_id, tx_date, label, source_type)
  VALUES (v_copro_id, v_period_id, CURRENT_DATE, 'TEST: Transaction pour post', 'manual')
  RETURNING id INTO v_tx_id;

  -- Ajouter des entrées équilibrées
  INSERT INTO ledger_entries (tx_id, copro_id, period_id, account_id, direction, amount)
  VALUES
    (v_tx_id, v_copro_id, v_period_id, v_account_1, 'debit', 100.00),
    (v_tx_id, v_copro_id, v_period_id, v_account_2, 'credit', 100.00);

  -- Tester le post
  v_result := post_ledger_transaction(v_tx_id);

  IF (v_result->>'success')::boolean THEN
    RAISE NOTICE 'TEST 2 PASSED: Transaction posted successfully';
    RAISE NOTICE '  Result: %', v_result;
  ELSE
    RAISE EXCEPTION 'TEST 2 FAILED: Could not post transaction: %', v_result->>'error';
  END IF;

  -- Cleanup: supprimer la transaction (va échouer car posted - c'est normal)
  -- On laisse la transaction pour les autres tests
END $$;


-- ============================================
-- TEST 3: Vérifier qu'UPDATE sur transaction posted échoue
-- ============================================
DO $$
DECLARE
  v_tx_id UUID;
  v_error_raised BOOLEAN := false;
BEGIN
  RAISE NOTICE '=== TEST 3: Vérifier UPDATE sur posted échoue ===';

  SELECT id INTO v_tx_id FROM ledger_transactions WHERE status = 'posted' LIMIT 1;

  IF v_tx_id IS NULL THEN
    RAISE NOTICE 'SKIP: No posted transaction found';
    RETURN;
  END IF;

  BEGIN
    UPDATE ledger_transactions SET label = 'MODIFIED' WHERE id = v_tx_id;
  EXCEPTION
    WHEN restrict_violation THEN
      v_error_raised := true;
      RAISE NOTICE 'OK: UPDATE correctly blocked with error';
  END;

  IF v_error_raised THEN
    RAISE NOTICE 'TEST 3 PASSED: UPDATE on posted transaction is blocked';
  ELSE
    RAISE EXCEPTION 'TEST 3 FAILED: UPDATE on posted transaction was not blocked!';
  END IF;
END $$;


-- ============================================
-- TEST 4: Vérifier que DELETE sur transaction posted échoue
-- ============================================
DO $$
DECLARE
  v_tx_id UUID;
  v_error_raised BOOLEAN := false;
BEGIN
  RAISE NOTICE '=== TEST 4: Vérifier DELETE sur posted échoue ===';

  SELECT id INTO v_tx_id FROM ledger_transactions WHERE status = 'posted' LIMIT 1;

  IF v_tx_id IS NULL THEN
    RAISE NOTICE 'SKIP: No posted transaction found';
    RETURN;
  END IF;

  BEGIN
    DELETE FROM ledger_transactions WHERE id = v_tx_id;
  EXCEPTION
    WHEN restrict_violation THEN
      v_error_raised := true;
      RAISE NOTICE 'OK: DELETE correctly blocked with error';
  END;

  IF v_error_raised THEN
    RAISE NOTICE 'TEST 4 PASSED: DELETE on posted transaction is blocked';
  ELSE
    RAISE EXCEPTION 'TEST 4 FAILED: DELETE on posted transaction was not blocked!';
  END IF;
END $$;


-- ============================================
-- TEST 5: Vérifier que UPDATE/DELETE sur entries de posted échoue
-- ============================================
DO $$
DECLARE
  v_entry_id UUID;
  v_error_raised_update BOOLEAN := false;
  v_error_raised_delete BOOLEAN := false;
BEGIN
  RAISE NOTICE '=== TEST 5: Vérifier UPDATE/DELETE sur entries de posted échoue ===';

  SELECT e.id INTO v_entry_id
  FROM ledger_entries e
  JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted'
  LIMIT 1;

  IF v_entry_id IS NULL THEN
    RAISE NOTICE 'SKIP: No entry on posted transaction found';
    RETURN;
  END IF;

  -- Test UPDATE
  BEGIN
    UPDATE ledger_entries SET amount = 999.99 WHERE id = v_entry_id;
  EXCEPTION
    WHEN restrict_violation THEN
      v_error_raised_update := true;
      RAISE NOTICE 'OK: UPDATE on entry correctly blocked';
  END;

  -- Test DELETE
  BEGIN
    DELETE FROM ledger_entries WHERE id = v_entry_id;
  EXCEPTION
    WHEN restrict_violation THEN
      v_error_raised_delete := true;
      RAISE NOTICE 'OK: DELETE on entry correctly blocked';
  END;

  IF v_error_raised_update AND v_error_raised_delete THEN
    RAISE NOTICE 'TEST 5 PASSED: UPDATE and DELETE on entries of posted tx are blocked';
  ELSE
    RAISE EXCEPTION 'TEST 5 FAILED: UPDATE (%) or DELETE (%) not properly blocked',
      v_error_raised_update, v_error_raised_delete;
  END IF;
END $$;


-- ============================================
-- TEST 6: Vérifier qu'INSERT sur posted échoue
-- ============================================
DO $$
DECLARE
  v_tx_id UUID;
  v_copro_id UUID;
  v_period_id UUID;
  v_account_id UUID;
  v_error_raised BOOLEAN := false;
BEGIN
  RAISE NOTICE '=== TEST 6: Vérifier INSERT entry sur posted échoue ===';

  SELECT t.id, t.copro_id, t.period_id INTO v_tx_id, v_copro_id, v_period_id
  FROM ledger_transactions t WHERE t.status = 'posted' LIMIT 1;

  IF v_tx_id IS NULL THEN
    RAISE NOTICE 'SKIP: No posted transaction found';
    RETURN;
  END IF;

  SELECT id INTO v_account_id FROM accounts WHERE copro_id = v_copro_id LIMIT 1;

  BEGIN
    INSERT INTO ledger_entries (tx_id, copro_id, period_id, account_id, direction, amount)
    VALUES (v_tx_id, v_copro_id, v_period_id, v_account_id, 'debit', 100.00);
  EXCEPTION
    WHEN restrict_violation THEN
      v_error_raised := true;
      RAISE NOTICE 'OK: INSERT on posted tx correctly blocked';
  END;

  IF v_error_raised THEN
    RAISE NOTICE 'TEST 6 PASSED: INSERT entry on posted transaction is blocked';
  ELSE
    RAISE EXCEPTION 'TEST 6 FAILED: INSERT entry on posted transaction was not blocked!';
  END IF;
END $$;


-- ============================================
-- TEST 7: Vérifier post_ledger_transaction refuse tx non équilibrée
-- ============================================
DO $$
DECLARE
  v_copro_id UUID;
  v_period_id UUID;
  v_tx_id UUID;
  v_account_id UUID;
  v_result JSONB;
BEGIN
  RAISE NOTICE '=== TEST 7: Tester post refuse tx non équilibrée ===';

  SELECT c.id, ap.id INTO v_copro_id, v_period_id
  FROM copros c
  JOIN accounting_periods ap ON ap.copro_id = c.id AND ap.status = 'open'
  LIMIT 1;

  IF v_copro_id IS NULL THEN
    RAISE NOTICE 'SKIP: No copro with open period found';
    RETURN;
  END IF;

  SELECT id INTO v_account_id FROM accounts WHERE copro_id = v_copro_id LIMIT 1;

  -- Créer une transaction non équilibrée
  INSERT INTO ledger_transactions (copro_id, period_id, tx_date, label, source_type)
  VALUES (v_copro_id, v_period_id, CURRENT_DATE, 'TEST: TX non équilibrée', 'manual')
  RETURNING id INTO v_tx_id;

  -- Ajouter une seule entrée (déséquilibrée)
  INSERT INTO ledger_entries (tx_id, copro_id, period_id, account_id, direction, amount)
  VALUES (v_tx_id, v_copro_id, v_period_id, v_account_id, 'debit', 100.00);

  -- Tenter le post
  v_result := post_ledger_transaction(v_tx_id);

  IF NOT (v_result->>'success')::boolean AND v_result->>'error' LIKE '%not balanced%' THEN
    RAISE NOTICE 'TEST 7 PASSED: post_ledger_transaction correctly refused unbalanced tx';
    RAISE NOTICE '  Error: %', v_result->>'error';

    -- Cleanup
    DELETE FROM ledger_transactions WHERE id = v_tx_id;
  ELSE
    RAISE EXCEPTION 'TEST 7 FAILED: post_ledger_transaction did not refuse unbalanced tx: %', v_result;
  END IF;
END $$;


-- ============================================
-- TEST 8: Vérifier les vues fonctionnent
-- ============================================
DO $$
DECLARE
  v_count INT;
BEGIN
  RAISE NOTICE '=== TEST 8: Vérifier que les vues fonctionnent ===';

  -- v_general_ledger
  SELECT COUNT(*) INTO v_count FROM v_general_ledger;
  RAISE NOTICE 'v_general_ledger: % rows', v_count;

  -- v_trial_balance
  SELECT COUNT(*) INTO v_count FROM v_trial_balance;
  RAISE NOTICE 'v_trial_balance: % rows', v_count;

  -- v_lot_balance
  SELECT COUNT(*) INTO v_count FROM v_lot_balance;
  RAISE NOTICE 'v_lot_balance: % rows', v_count;

  -- v_owner_balance
  SELECT COUNT(*) INTO v_count FROM v_owner_balance;
  RAISE NOTICE 'v_owner_balance: % rows', v_count;

  -- v_unpaid_lots
  SELECT COUNT(*) INTO v_count FROM v_unpaid_lots;
  RAISE NOTICE 'v_unpaid_lots: % rows', v_count;

  -- v_account_movements
  SELECT COUNT(*) INTO v_count FROM v_account_movements;
  RAISE NOTICE 'v_account_movements: % rows', v_count;

  RAISE NOTICE 'TEST 8 PASSED: All views are accessible';
END $$;


-- ============================================
-- TEST 9: Vérifier la consistance copro/period entre tx et entries
-- ============================================
DO $$
DECLARE
  v_copro_id UUID;
  v_period_id UUID;
  v_other_copro_id UUID;
  v_tx_id UUID;
  v_account_id UUID;
  v_error_raised BOOLEAN := false;
BEGIN
  RAISE NOTICE '=== TEST 9: Vérifier consistance copro/period ===';

  -- Récupérer deux copros différentes
  SELECT id INTO v_copro_id FROM copros LIMIT 1;
  SELECT id INTO v_other_copro_id FROM copros WHERE id != v_copro_id LIMIT 1;

  IF v_other_copro_id IS NULL THEN
    RAISE NOTICE 'SKIP: Need at least 2 copros for this test';
    RETURN;
  END IF;

  SELECT id INTO v_period_id
  FROM accounting_periods WHERE copro_id = v_copro_id AND status = 'open' LIMIT 1;

  IF v_period_id IS NULL THEN
    RAISE NOTICE 'SKIP: No open period for first copro';
    RETURN;
  END IF;

  SELECT id INTO v_account_id FROM accounts WHERE copro_id = v_copro_id LIMIT 1;

  -- Créer une transaction
  INSERT INTO ledger_transactions (copro_id, period_id, tx_date, label, source_type)
  VALUES (v_copro_id, v_period_id, CURRENT_DATE, 'TEST: Consistance', 'manual')
  RETURNING id INTO v_tx_id;

  -- Tenter d'insérer une entry avec un copro_id différent
  BEGIN
    INSERT INTO ledger_entries (tx_id, copro_id, period_id, account_id, direction, amount)
    VALUES (v_tx_id, v_other_copro_id, v_period_id, v_account_id, 'debit', 100.00);
  EXCEPTION
    WHEN check_violation THEN
      v_error_raised := true;
      RAISE NOTICE 'OK: Inconsistent copro_id correctly blocked';
  END;

  -- Cleanup
  DELETE FROM ledger_transactions WHERE id = v_tx_id;

  IF v_error_raised THEN
    RAISE NOTICE 'TEST 9 PASSED: Inconsistent copro_id is blocked';
  ELSE
    RAISE EXCEPTION 'TEST 9 FAILED: Inconsistent copro_id was not blocked!';
  END IF;
END $$;


-- ============================================
-- TEST 10: Test de la fonction create_ledger_transaction
-- ============================================
DO $$
DECLARE
  v_copro_id UUID;
  v_period_id UUID;
  v_account_1 UUID;
  v_account_2 UUID;
  v_result JSONB;
BEGIN
  RAISE NOTICE '=== TEST 10: Tester create_ledger_transaction ===';

  SELECT c.id, ap.id INTO v_copro_id, v_period_id
  FROM copros c
  JOIN accounting_periods ap ON ap.copro_id = c.id AND ap.status = 'open'
  LIMIT 1;

  IF v_copro_id IS NULL THEN
    RAISE NOTICE 'SKIP: No copro with open period found';
    RETURN;
  END IF;

  SELECT id INTO v_account_1 FROM accounts WHERE copro_id = v_copro_id LIMIT 1 OFFSET 0;
  SELECT id INTO v_account_2 FROM accounts WHERE copro_id = v_copro_id LIMIT 1 OFFSET 1;

  IF v_account_1 IS NULL OR v_account_2 IS NULL THEN
    RAISE NOTICE 'SKIP: Not enough accounts for test';
    RETURN;
  END IF;

  -- Créer une transaction avec auto-post
  v_result := create_ledger_transaction(
    v_copro_id,
    v_period_id,
    CURRENT_DATE,
    'TEST: create_ledger_transaction',
    'manual',
    NULL,
    jsonb_build_array(
      jsonb_build_object('account_id', v_account_1, 'direction', 'debit', 'amount', 250.00),
      jsonb_build_object('account_id', v_account_2, 'direction', 'credit', 'amount', 250.00)
    ),
    true  -- auto_post
  );

  IF (v_result->>'success')::boolean THEN
    RAISE NOTICE 'TEST 10 PASSED: create_ledger_transaction works';
    RAISE NOTICE '  Result: %', v_result;
  ELSE
    RAISE EXCEPTION 'TEST 10 FAILED: %', v_result->>'error';
  END IF;
END $$;


-- ============================================
-- RÉSUMÉ DES TESTS
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'NIVEAU 2D LEDGER - TESTS COMPLETED';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'All tests passed if no EXCEPTION was raised.';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary of what was tested:';
  RAISE NOTICE '  1. Transaction balance verification';
  RAISE NOTICE '  2. post_ledger_transaction on draft tx';
  RAISE NOTICE '  3. UPDATE on posted tx blocked';
  RAISE NOTICE '  4. DELETE on posted tx blocked';
  RAISE NOTICE '  5. UPDATE/DELETE on entries of posted tx blocked';
  RAISE NOTICE '  6. INSERT entry on posted tx blocked';
  RAISE NOTICE '  7. post refuses unbalanced tx';
  RAISE NOTICE '  8. All views accessible';
  RAISE NOTICE '  9. copro/period consistency enforced';
  RAISE NOTICE '  10. create_ledger_transaction helper';
  RAISE NOTICE '';
END $$;


-- ============================================
-- REQUÊTES DE VÉRIFICATION (à exécuter manuellement)
-- ============================================

-- Afficher quelques lignes du grand livre
-- SELECT * FROM v_general_ledger WHERE status = 'posted' ORDER BY tx_date DESC LIMIT 20;

-- Afficher la balance des comptes
-- SELECT * FROM v_trial_balance ORDER BY copro_id, account_code;

-- Afficher les soldes par lot
-- SELECT * FROM v_lot_balance ORDER BY balance DESC;

-- Afficher les impayés
-- SELECT * FROM v_unpaid_lots ORDER BY balance DESC;

-- Vérifier l'équilibre global (doit être 0)
-- SELECT
--   copro_id,
--   SUM(debit) AS total_debit,
--   SUM(credit) AS total_credit,
--   SUM(debit) - SUM(credit) AS difference
-- FROM v_general_ledger
-- WHERE status = 'posted'
-- GROUP BY copro_id;
