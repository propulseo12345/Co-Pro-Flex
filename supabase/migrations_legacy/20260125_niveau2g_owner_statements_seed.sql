-- ============================================================================
-- SEED/TEST: NIVEAU 2G - RELEVÉS INDIVIDUELS COPROPRIÉTAIRES
-- CoProFlex
-- Date: 2026-01-25
-- Description: Données de test et requêtes de validation
-- Exécuter APRÈS: niveau2e_finance_metier.sql et avoir des données métier
-- ============================================================================

-- ============================================================================
-- PARTIE 1: SEED - Création de données de test
-- (Uniquement si les tables métier existent et ont des données)
-- ============================================================================

DO $$
DECLARE
  v_copro RECORD;
  v_period RECORD;
  v_lot RECORD;
  v_owner RECORD;
  v_call_id UUID;
  v_payment_id UUID;
  v_rk_id UUID;
  v_created INT := 0;
BEGIN
  -- Parcourir les copropriétés existantes
  FOR v_copro IN SELECT id, name FROM copros LIMIT 1 LOOP
    RAISE NOTICE 'Processing copro for owner statements seed: % (%)', v_copro.name, v_copro.id;

    -- Trouver une période ouverte
    SELECT id INTO v_period
    FROM accounting_periods
    WHERE copro_id = v_copro.id AND status = 'open'
    LIMIT 1;

    IF v_period.id IS NULL THEN
      RAISE NOTICE '  No open period found, skipping';
      CONTINUE;
    END IF;

    -- Trouver une clé de répartition
    SELECT id INTO v_rk_id
    FROM repartition_keys
    WHERE copro_id = v_copro.id
    LIMIT 1;

    IF v_rk_id IS NULL THEN
      RAISE NOTICE '  No repartition key found, creating one';
      INSERT INTO repartition_keys (copro_id, name, description)
      VALUES (v_copro.id, 'Charges générales', 'Clé de répartition test')
      RETURNING id INTO v_rk_id;
    END IF;

    -- Vérifier qu'on a des lots avec propriétaires
    SELECT
      l.id AS lot_id,
      l.ref,
      lo.coproprietaire_id
    INTO v_lot
    FROM lots l
    JOIN lot_owners lo ON lo.lot_id = l.id AND lo.is_primary = true
    WHERE l.copro_id = v_copro.id
      AND (lo.end_date IS NULL OR lo.end_date > CURRENT_DATE)
    LIMIT 1;

    IF v_lot.lot_id IS NULL THEN
      RAISE NOTICE '  No lot with owner found, skipping';
      CONTINUE;
    END IF;

    RAISE NOTICE '  Found lot % with owner %', v_lot.ref, v_lot.coproprietaire_id;

    -- Créer un appel de fonds de test si pas déjà existant
    SELECT id INTO v_call_id
    FROM call_for_funds
    WHERE copro_id = v_copro.id
      AND label LIKE 'TEST%'
    LIMIT 1;

    IF v_call_id IS NULL THEN
      -- Créer l'appel
      INSERT INTO call_for_funds (
        copro_id, period_id, repartition_key_id,
        label, issue_date, due_date, total_amount, status
      ) VALUES (
        v_copro.id, v_period.id, v_rk_id,
        'TEST - Appel Q1 2026', CURRENT_DATE - INTERVAL '60 days',
        CURRENT_DATE - INTERVAL '30 days', 500.00, 'issued'
      ) RETURNING id INTO v_call_id;

      -- Créer les lignes pour tous les lots avec propriétaires
      FOR v_owner IN
        SELECT
          l.id AS lot_id,
          l.tantiemes_generaux
        FROM lots l
        JOIN lot_owners lo ON lo.lot_id = l.id AND lo.is_primary = true
        WHERE l.copro_id = v_copro.id
          AND (lo.end_date IS NULL OR lo.end_date > CURRENT_DATE)
      LOOP
        INSERT INTO call_for_funds_lines (
          copro_id, call_id, lot_id, amount_due, amount_paid, status
        ) VALUES (
          v_copro.id, v_call_id, v_owner.lot_id,
          ROUND(500.00 * v_owner.tantiemes_generaux / 10000, 2),
          0, 'unpaid'
        );
        v_created := v_created + 1;
      END LOOP;

      RAISE NOTICE '  Created test call with % lines', v_created;
    END IF;

    -- Créer un paiement partiel de test
    SELECT id INTO v_payment_id
    FROM payments
    WHERE copro_id = v_copro.id
      AND reference LIKE 'TEST%'
    LIMIT 1;

    IF v_payment_id IS NULL THEN
      -- Créer un paiement pour le premier lot
      INSERT INTO payments (
        copro_id, period_id, lot_id, amount, payment_date, method, reference, status
      ) VALUES (
        v_copro.id, v_period.id, v_lot.lot_id,
        25.00, CURRENT_DATE - INTERVAL '15 days', 'bank_transfer', 'TEST-PAY-001', 'recorded'
      ) RETURNING id INTO v_payment_id;

      -- Allouer le paiement
      PERFORM allocate_payment(v_payment_id);

      RAISE NOTICE '  Created test payment of 25.00';
    END IF;

    RAISE NOTICE '  Owner statements seed completed for copro %', v_copro.name;
  END LOOP;
END $$;


-- ============================================================================
-- PARTIE 2: REQUÊTES DE TEST
-- ============================================================================

-- ============================================
-- TEST 1: Vérifier les lignes de relevé pour un owner avec paiement partiel
-- ============================================
SELECT '=== TEST 1: Lignes de relevé (owner avec paiement partiel) ===' AS test_name;

SELECT
  osl.owner_id,
  osl.line_date,
  osl.line_type,
  osl.label,
  osl.debit,
  osl.credit,
  osl.running_balance,
  osl.lot_ref,
  osl.line_status
FROM v_owner_statement_lines osl
WHERE osl.copro_id = (SELECT id FROM copros LIMIT 1)
  AND osl.owner_id IN (
    SELECT DISTINCT lo.coproprietaire_id
    FROM lot_owners lo
    JOIN payments p ON p.lot_id = lo.lot_id
    WHERE p.reference LIKE 'TEST%'
  )
ORDER BY osl.line_date, osl.created_at
LIMIT 20;


-- ============================================
-- TEST 2: Vérifier le résumé avec impayés
-- ============================================
SELECT '=== TEST 2: Résumé owner (avec impayés) ===' AS test_name;

SELECT
  oss.owner_id,
  oss.owner_name,
  oss.total_debit_calls,
  oss.total_credit_payments,
  oss.balance_end,
  oss.unpaid_amount,
  oss.unpaid_lines_count,
  oss.oldest_due_date,
  oss.days_overdue,
  oss.lots_count,
  oss.total_tantiemes
FROM v_owner_statement_summary oss
WHERE oss.copro_id = (SELECT id FROM copros LIMIT 1)
  AND oss.unpaid_amount > 0
ORDER BY oss.unpaid_amount DESC
LIMIT 10;


-- ============================================
-- TEST 3: Vérifier la cohérence running_balance
-- (le dernier running_balance doit = SUM(debit) - SUM(credit))
-- ============================================
SELECT '=== TEST 3: Cohérence running_balance ===' AS test_name;

WITH owner_totals AS (
  SELECT
    copro_id,
    owner_id,
    SUM(debit) AS total_debit,
    SUM(credit) AS total_credit,
    SUM(debit) - SUM(credit) AS expected_balance,
    MAX(running_balance) AS final_running_balance
  FROM v_owner_statement_lines
  GROUP BY copro_id, owner_id
)
SELECT
  owner_id,
  total_debit,
  total_credit,
  expected_balance,
  final_running_balance,
  CASE
    WHEN ABS(expected_balance - final_running_balance) < 0.01 THEN 'OK'
    ELSE 'ERREUR'
  END AS coherence_check
FROM owner_totals
ORDER BY owner_id
LIMIT 10;


-- ============================================
-- TEST 4: Appel de la fonction get_owner_statement
-- ============================================
SELECT '=== TEST 4: Fonction get_owner_statement ===' AS test_name;

SELECT get_owner_statement(
  (SELECT id FROM copros LIMIT 1),
  (SELECT DISTINCT lo.coproprietaire_id
   FROM lot_owners lo
   JOIN lots l ON l.id = lo.lot_id
   WHERE l.copro_id = (SELECT id FROM copros LIMIT 1)
   LIMIT 1),
  NULL, -- period_id
  NULL, -- date_from
  NULL  -- date_to
) AS statement_result;


-- ============================================
-- RÉSUMÉ DES TESTS
-- ============================================
SELECT '=== RÉSUMÉ DES DONNÉES DE TEST ===' AS summary;

SELECT
  'Copropriétés' AS entity,
  COUNT(*) AS count
FROM copros
UNION ALL
SELECT
  'Lots avec propriétaires' AS entity,
  COUNT(DISTINCT l.id)
FROM lots l
JOIN lot_owners lo ON lo.lot_id = l.id
UNION ALL
SELECT
  'Appels de fonds' AS entity,
  COUNT(*)
FROM call_for_funds
WHERE status NOT IN ('draft', 'cancelled')
UNION ALL
SELECT
  'Paiements' AS entity,
  COUNT(*)
FROM payments
WHERE status != 'reversed'
UNION ALL
SELECT
  'Lignes de relevé (total)' AS entity,
  COUNT(*)
FROM v_owner_statement_lines;


-- ============================================================================
-- PARTIE 3: EXEMPLE CURL POUR TESTER L'EDGE FUNCTION
-- ============================================================================

/*
-- Exemple de test avec curl (à exécuter depuis le terminal):

# Variables
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
ACCESS_TOKEN="user-jwt-token"

# Méthode POST
curl -X POST \
  "${SUPABASE_URL}/functions/v1/generate_owner_statement" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -d '{
    "copro_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "owner_id": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
    "date_from": "2026-01-01",
    "date_to": "2026-12-31"
  }'

# Méthode GET
curl -X GET \
  "${SUPABASE_URL}/functions/v1/generate_owner_statement?copro_id=xxx&owner_id=yyy" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${SUPABASE_ANON_KEY}"

*/


-- ============================================================================
-- FIN DU FICHIER SEED/TEST
-- ============================================================================
