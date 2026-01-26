-- ============================================================================
-- SEED/TEST: NIVEAU 3A - MUTATIONS + PRÉ-ÉTAT DATÉ / ÉTAT DATÉ
-- CoProFlex
-- Date: 2026-01-25
-- Description: Données de test et requêtes de validation
-- Exécuter APRÈS: niveau3a_mutations_etat_date_v2.sql
-- ============================================================================

-- ============================================================================
-- PARTIE 1: SEED - Création d'une mutation de test
-- ============================================================================

DO $$
DECLARE
  v_copro_id UUID;
  v_copro_name TEXT;
  v_lot_id UUID;
  v_lot_ref TEXT;
  v_seller_id UUID;
  v_seller_name TEXT;
  v_mutation_id UUID;
BEGIN
  -- Trouver une copropriété avec des lots et propriétaires
  SELECT
    c.id, c.name,
    l.id, l.ref,
    lo.coproprietaire_id
  INTO v_copro_id, v_copro_name, v_lot_id, v_lot_ref, v_seller_id
  FROM copros c
  JOIN lots l ON l.copro_id = c.id
  JOIN lot_owners lo ON lo.lot_id = l.id AND lo.is_primary = true
  WHERE lo.end_date IS NULL
  LIMIT 1;

  IF v_copro_id IS NULL THEN
    RAISE NOTICE 'No suitable copro/lot/owner found for mutation test';
    RETURN;
  END IF;

  -- Récupérer le nom du vendeur
  SELECT COALESCE(first_name || ' ' || last_name, company_name, 'Propriétaire')
  INTO v_seller_name
  FROM coproprietaires
  WHERE id = v_seller_id;

  RAISE NOTICE 'Creating test mutation:';
  RAISE NOTICE '  Copro: % (%)', v_copro_name, v_copro_id;
  RAISE NOTICE '  Lot: % (%)', v_lot_ref, v_lot_id;
  RAISE NOTICE '  Seller: % (%)', v_seller_name, v_seller_id;

  -- Vérifier qu'il n'y a pas déjà une mutation active sur ce lot
  IF EXISTS (
    SELECT 1 FROM mutations
    WHERE lot_id = v_lot_id
    AND status NOT IN ('validated', 'cancelled')
  ) THEN
    RAISE NOTICE '  A mutation already exists on this lot, skipping creation';
    SELECT id INTO v_mutation_id
    FROM mutations
    WHERE lot_id = v_lot_id
    AND status NOT IN ('validated', 'cancelled')
    LIMIT 1;
  ELSE
    -- Créer la mutation de test
    INSERT INTO mutations (
      copro_id,
      lot_id,
      seller_owner_id,
      mutation_type,
      buyer_name,
      buyer_email,
      buyer_is_company,
      notary_name,
      notary_email,
      notary_reference,
      status,
      notes
    ) VALUES (
      v_copro_id,
      v_lot_id,
      v_seller_id,
      'sale',
      'Jean-Pierre ACHETEUR',
      'jp.acheteur@example.com',
      false,
      'Maître NOTAIRE',
      'notaire@example.com',
      'DOSSIER-2026-001',
      'draft',
      'Mutation de test créée automatiquement pour validation NIVEAU 3A'
    ) RETURNING id INTO v_mutation_id;

    RAISE NOTICE '  Created mutation: %', v_mutation_id;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'MUTATION ID FOR TESTS: %', v_mutation_id;
  RAISE NOTICE '============================================';
END $$;


-- ============================================================================
-- PARTIE 2: REQUÊTES DE TEST
-- ============================================================================

-- ============================================
-- TEST 1: Vérifier la mutation créée
-- ============================================
SELECT '=== TEST 1: Mutation créée ===' AS test_name;

SELECT
  m.id AS mutation_id,
  c.name AS copro_name,
  l.ref AS lot_ref,
  cp.first_name || ' ' || cp.last_name AS seller_name,
  m.buyer_name,
  m.status,
  m.mutation_type,
  m.created_at
FROM mutations m
JOIN copros c ON c.id = m.copro_id
JOIN lots l ON l.id = m.lot_id
JOIN coproprietaires cp ON cp.id = m.seller_owner_id
WHERE m.status = 'draft'
ORDER BY m.created_at DESC
LIMIT 1;


-- ============================================
-- TEST 2: Génération du pré-état daté
-- (Exécuter manuellement avec l'ID de mutation)
-- ============================================
SELECT '=== TEST 2: Génération pré-état daté ===' AS test_name;

/*
-- Exemple avec ID réel:
SELECT create_etat_date_snapshot(
  '<copro_id>'::UUID,
  '<mutation_id>'::UUID,
  'pre'
) AS result;
*/


-- ============================================
-- TEST 3: Génération de l'état daté final
-- (Exécuter manuellement après le pré-état)
-- ============================================
SELECT '=== TEST 3: Génération état daté final ===' AS test_name;

/*
-- Exemple avec ID réel:
SELECT create_etat_date_snapshot(
  '<copro_id>'::UUID,
  '<mutation_id>'::UUID,
  'final'
) AS result;
*/


-- ============================================
-- TEST 4: Validation de la mutation
-- (Exécuter manuellement après signature)
-- ============================================
SELECT '=== TEST 4: Validation mutation ===' AS test_name;

/*
-- 1. D'abord passer en status 'signed':
UPDATE mutations
SET status = 'signed', signature_date = CURRENT_DATE
WHERE id = '<mutation_id>';

-- 2. Puis valider:
SELECT validate_mutation(
  '<mutation_id>'::UUID,
  CURRENT_DATE,
  NULL,  -- buyer_owner_id (null = créer nouveau)
  'Jean-Pierre',
  'ACHETEUR',
  'jp.acheteur@example.com',
  false
) AS result;
*/


-- ============================================
-- TEST 5: Vérifier les vues
-- ============================================
SELECT '=== TEST 5: Vue v_mutations_overview ===' AS test_name;

SELECT
  id,
  lot_ref,
  seller_name,
  buyer_name,
  mutation_type,
  status,
  signature_date,
  has_pre_etat,
  has_final_etat,
  days_until_pre_etat_deadline
FROM v_mutations_overview
ORDER BY created_at DESC
LIMIT 5;


SELECT '=== TEST 6: Vue v_etat_date_latest ===' AS test_name;

SELECT
  mutation_id,
  lot_ref,
  snapshot_type,
  generated_at,
  mutation_status,
  payload->'seller'->>'name' AS seller_name,
  payload->'financial_situation'->>'current_balance' AS current_balance,
  payload->'financial_situation'->'unpaid'->>'amount' AS unpaid_amount
FROM v_etat_date_latest
ORDER BY generated_at DESC
LIMIT 5;


-- ============================================
-- RÉSUMÉ DES DONNÉES
-- ============================================
SELECT '=== RÉSUMÉ DES DONNÉES ===' AS summary;

SELECT
  'Mutations total' AS entity,
  COUNT(*) AS count
FROM mutations
UNION ALL
SELECT
  'Mutations draft' AS entity,
  COUNT(*)
FROM mutations WHERE status = 'draft'
UNION ALL
SELECT
  'Mutations validated' AS entity,
  COUNT(*)
FROM mutations WHERE status = 'validated'
UNION ALL
SELECT
  'États datés (snapshots)' AS entity,
  COUNT(*)
FROM etat_date_snapshots
UNION ALL
SELECT
  'Pré-états datés' AS entity,
  COUNT(*)
FROM etat_date_snapshots WHERE snapshot_type = 'pre'
UNION ALL
SELECT
  'États datés finaux' AS entity,
  COUNT(*)
FROM etat_date_snapshots WHERE snapshot_type = 'final';


-- ============================================================================
-- PARTIE 3: EXEMPLES CURL POUR TESTER LES EDGE FUNCTIONS
-- ============================================================================

/*
============================================================
CONFIGURATION
============================================================

# Variables d'environnement
export SUPABASE_URL="https://iyfesbjnkpynmwlsmxnp.supabase.co"
export SUPABASE_ANON_KEY="<votre-anon-key>"
export ACCESS_TOKEN="<jwt-token-utilisateur>"

# IDs de test (remplacer par vos valeurs)
export COPRO_ID="11111111-aaaa-bbbb-cccc-111111111111"
export MUTATION_ID="<mutation-id-créé>"


============================================================
EDGE FUNCTION: generate_etat_date
============================================================

# 1. Générer un PRÉ-ÉTAT DATÉ (POST)
curl -X POST \
  "${SUPABASE_URL}/functions/v1/generate_etat_date" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -d '{
    "copro_id": "'"${COPRO_ID}"'",
    "mutation_id": "'"${MUTATION_ID}"'",
    "snapshot_type": "pre"
  }'

# 2. Générer un ÉTAT DATÉ FINAL (POST)
curl -X POST \
  "${SUPABASE_URL}/functions/v1/generate_etat_date" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -d '{
    "copro_id": "'"${COPRO_ID}"'",
    "mutation_id": "'"${MUTATION_ID}"'",
    "snapshot_type": "final"
  }'

# 3. Version GET
curl -X GET \
  "${SUPABASE_URL}/functions/v1/generate_etat_date?copro_id=${COPRO_ID}&mutation_id=${MUTATION_ID}&snapshot_type=pre" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${SUPABASE_ANON_KEY}"


============================================================
EDGE FUNCTION: validate_mutation
============================================================

# 1. Valider avec création d'un NOUVEAU copropriétaire
curl -X POST \
  "${SUPABASE_URL}/functions/v1/validate_mutation" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -d '{
    "mutation_id": "'"${MUTATION_ID}"'",
    "signature_date": "2026-01-25",
    "buyer_first_name": "Jean-Pierre",
    "buyer_last_name": "ACHETEUR",
    "buyer_email": "jp.acheteur@example.com",
    "buyer_is_company": false
  }'

# 2. Valider avec un copropriétaire EXISTANT
curl -X POST \
  "${SUPABASE_URL}/functions/v1/validate_mutation" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -d '{
    "mutation_id": "'"${MUTATION_ID}"'",
    "signature_date": "2026-01-25",
    "buyer_owner_id": "<existing-owner-uuid>"
  }'


============================================================
RÉPONSES ATTENDUES
============================================================

# generate_etat_date - Succès:
{
  "success": true,
  "snapshot_id": "uuid",
  "snapshot_type": "pre",
  "mutation_status": "pre_etat_generated",
  "payload": {
    "version": "1.0",
    "legal_reference": "Article 20 Loi 65-557 du 10 juillet 1965",
    "copro": {...},
    "lot": {...},
    "seller": {...},
    "financial_situation": {
      "current_balance": 0,
      "unpaid": {...},
      "work_fund_alur": {...},
      "pending_calls": {...}
    },
    "recent_transactions": [...],
    "mutation": {...}
  }
}

# validate_mutation - Succès:
{
  "success": true,
  "mutation_id": "uuid",
  "buyer_owner_id": "uuid",
  "signature_date": "2026-01-25",
  "new_status": "validated",
  "message": "Mutation validée - Transfert de propriété effectué"
}


============================================================
ERREURS POSSIBLES
============================================================

# 400 - Paramètre manquant
{"success": false, "error": "Missing required parameter: mutation_id"}

# 400 - Format UUID invalide
{"success": false, "error": "Invalid mutation_id format (must be UUID)"}

# 400 - Mutation non trouvée
{"success": false, "error": "Mutation not found"}

# 400 - Status invalide pour l'opération
{"success": false, "error": "La mutation doit être en status 'signed' pour être validée"}

# 401 - Non authentifié
{"success": false, "error": "Missing Authorization header"}

# 500 - Erreur serveur
{"success": false, "error": "Database error: ..."}

*/


-- ============================================================================
-- FIN DU FICHIER SEED/TEST
-- ============================================================================
