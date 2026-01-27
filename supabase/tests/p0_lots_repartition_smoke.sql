-- ============================================================================
-- P0#2: Smoke Tests - Lots et Clés de Répartition
-- ============================================================================
-- Execute these queries to validate the migration
-- Each query should return expected results with proper RLS isolation

-- TEST 1: Vue v_lots_with_owners existe et retourne les colonnes attendues
-- Expected: Colonnes id, copro_id, ref, type, tantiemes_generaux, owner_display_name
SELECT
  id,
  copro_id,
  ref,
  type,
  tantiemes_generaux,
  building_name,
  coproprietaire_id,
  owner_display_name,
  owner_email
FROM v_lots_with_owners
LIMIT 5;

-- TEST 2: Filtrage par copro_id fonctionne sur lots
-- Expected: Uniquement les lots de la copro spécifiée
-- Remplacer 'YOUR_COPRO_ID' par un UUID valide
-- SELECT * FROM v_lots_with_owners WHERE copro_id = 'YOUR_COPRO_ID';

-- TEST 3: Vérification lot_owners end_date = NULL pour propriétaires actuels
-- Expected: Seuls les propriétaires actuels (end_date IS NULL) sont retournés
SELECT
  l.id AS lot_id,
  l.ref,
  lo.coproprietaire_id,
  lo.start_date,
  lo.end_date
FROM lots l
LEFT JOIN lot_owners lo ON lo.lot_id = l.id AND lo.end_date IS NULL
LIMIT 5;

-- TEST 4: Table repartition_keys accessible
-- Expected: Colonnes id, copro_id, name, basis, coverage_mode, is_active
SELECT
  id,
  copro_id,
  name,
  basis,
  coverage_mode,
  is_active
FROM repartition_keys
LIMIT 5;

-- TEST 5: Vue v_repartition_key_totals avec colonnes calculées
-- Expected: Colonnes key_id, name, total_weight, lots_count, is_complete
SELECT
  key_id,
  copro_id,
  name,
  basis,
  total_weight,
  lots_count,
  lots_with_weight_count,
  is_complete
FROM v_repartition_key_totals
LIMIT 5;

-- TEST 6: Vue v_repartition_key_lines_detailed avec jointures
-- Expected: Colonnes line_id, key_name, lot_ref, weight, share_pct
SELECT
  line_id,
  key_id,
  key_name,
  lot_id,
  lot_ref,
  lot_type,
  weight,
  share_pct
FROM v_repartition_key_lines_detailed
LIMIT 5;

-- TEST 7: Validation totaux - somme des poids par clé
-- Expected: Chaque clé devrait avoir un total cohérent
SELECT
  rk.id AS key_id,
  rk.name,
  rk.basis,
  COALESCE(SUM(rkl.weight), 0) AS calculated_total,
  (SELECT total_weight FROM v_repartition_key_totals WHERE key_id = rk.id) AS view_total
FROM repartition_keys rk
LEFT JOIN repartition_key_lines rkl ON rkl.key_id = rk.id
GROUP BY rk.id, rk.name, rk.basis
LIMIT 5;

-- TEST 8: Vérification RLS sur lots (gestionnaire)
-- Expected: Toutes les entrées de la copro si l'utilisateur est gestionnaire
-- Exécuter en tant que gestionnaire:
-- SELECT COUNT(*) FROM lots WHERE copro_id = 'YOUR_COPRO_ID';

-- TEST 9: Isolation inter-copro (0 rows si pas accès)
-- Expected: 0 rows si appelé avec un copro_id auquel l'utilisateur n'a pas accès
-- SELECT * FROM lots WHERE copro_id = 'OTHER_COPRO_ID';

-- TEST 10: Comptage global pour vérification
SELECT
  (SELECT COUNT(*) FROM lots) AS total_lots,
  (SELECT COUNT(*) FROM lot_owners WHERE end_date IS NULL) AS active_owners,
  (SELECT COUNT(*) FROM repartition_keys) AS total_keys,
  (SELECT COUNT(*) FROM repartition_key_lines) AS total_key_lines;
