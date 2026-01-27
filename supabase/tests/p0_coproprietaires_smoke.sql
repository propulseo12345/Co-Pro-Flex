-- ============================================================================
-- P0#1: Smoke Tests - Copropriétaires
-- ============================================================================
-- Execute these queries to validate the migration
-- Each query should return expected results with proper RLS isolation

-- TEST 1: Vue v_coproprietaires_overview existe et retourne les colonnes attendues
-- Expected: Colonnes id, copro_id, display_name, solde, owner_type, council_role
SELECT
  id,
  copro_id,
  display_name,
  solde,
  owner_type,
  council_role,
  lots_count,
  total_tantiemes
FROM v_coproprietaires_overview
LIMIT 5;

-- TEST 2: Filtrage par copro_id fonctionne
-- Expected: Uniquement les copropriétaires de la copro spécifiée
-- Remplacer 'YOUR_COPRO_ID' par un UUID valide
-- SELECT * FROM v_coproprietaires_overview WHERE copro_id = 'YOUR_COPRO_ID';

-- TEST 3: Vérification isolation inter-copro (RLS)
-- Expected: 0 rows si appelé avec un copro_id auquel l'utilisateur n'a pas accès
-- Ce test doit être exécuté avec un utilisateur authentifié différent
-- SELECT * FROM v_coproprietaires_overview WHERE copro_id = 'OTHER_COPRO_ID';

-- TEST 4: Table coproprietaires accessible
SELECT
  id,
  copro_id,
  CASE WHEN is_company THEN company_name ELSE CONCAT(first_name, ' ', last_name) END AS nom,
  email
FROM coproprietaires
LIMIT 5;

-- TEST 5: lot_owners jointure correcte
SELECT
  lo.id,
  lo.copro_id,
  lo.coproprietaire_id,
  lo.lot_id,
  lo.share_percent,
  lo.start_date,
  lo.end_date
FROM lot_owners lo
WHERE lo.end_date IS NULL -- Propriétaires actuels uniquement
LIMIT 5;

-- TEST 6: v_lots_with_owners retourne les infos propriétaire
SELECT
  id,
  copro_id,
  ref,
  type,
  tantiemes_generaux,
  owner_display_name,
  coproprietaire_id
FROM v_lots_with_owners
LIMIT 5;

-- TEST 7: Vérification RLS sur coproprietaires (manager)
-- Expected: Toutes les entrées de la copro si l'utilisateur est gestionnaire
-- Exécuter en tant que gestionnaire:
-- SELECT COUNT(*) FROM coproprietaires WHERE copro_id = 'YOUR_COPRO_ID';

-- TEST 8: Vérification RLS sur coproprietaires (coproprietaire simple)
-- Expected: Uniquement son propre enregistrement
-- Exécuter en tant que copropriétaire:
-- SELECT * FROM coproprietaires WHERE user_id = auth.uid();
