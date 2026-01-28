-- ============================================================================
-- P0 SMOKE TEST: Sales/Mutations Module
-- CoProFlex
-- Date: 2026-01-28
-- ============================================================================

-- Test variables
DO $$
DECLARE
  v_copro_id UUID;
  v_lot_id UUID;
  v_seller_id UUID;
  v_mutation_id UUID;
  v_step mutation_steps%ROWTYPE;
  v_snapshot_id UUID;
  v_steps_count INT;
BEGIN
  RAISE NOTICE '=== P0 SALES/MUTATIONS SMOKE TEST ===';
  RAISE NOTICE '';

  -- ============================================
  -- SETUP: Find existing copro/lot/owner
  -- ============================================
  SELECT c.id, l.id, lo.coproprietaire_id
  INTO v_copro_id, v_lot_id, v_seller_id
  FROM copros c
  JOIN lots l ON l.copro_id = c.id
  JOIN lot_owners lo ON lo.lot_id = l.id AND lo.is_primary = true
  WHERE lo.end_date IS NULL
  LIMIT 1;

  IF v_copro_id IS NULL THEN
    RAISE NOTICE 'SKIP: No copro/lot/owner found for testing';
    RETURN;
  END IF;

  RAISE NOTICE 'Test context: copro=%, lot=%, seller=%', v_copro_id, v_lot_id, v_seller_id;

  -- ============================================
  -- TEST 1: Create mutation
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 1: Create mutation...';

  INSERT INTO mutations (
    copro_id, lot_id, seller_owner_id,
    mutation_type, buyer_name, buyer_email,
    notary_name, notary_email, notary_reference,
    status, notes
  ) VALUES (
    v_copro_id, v_lot_id, v_seller_id,
    'sale', 'Test Buyer', 'buyer@test.com',
    'Me Test Notaire', 'notaire@test.com', 'TEST-2026-001',
    'draft', 'P0 smoke test mutation'
  ) RETURNING id INTO v_mutation_id;

  IF v_mutation_id IS NOT NULL THEN
    RAISE NOTICE 'PASS: Mutation created: %', v_mutation_id;
  ELSE
    RAISE EXCEPTION 'FAIL: Mutation not created';
  END IF;

  -- ============================================
  -- TEST 2: Check auto-initialized steps
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 2: Check auto-initialized steps...';

  SELECT COUNT(*) INTO v_steps_count
  FROM mutation_steps
  WHERE mutation_id = v_mutation_id;

  IF v_steps_count = 6 THEN
    RAISE NOTICE 'PASS: 6 steps auto-created';
  ELSE
    RAISE EXCEPTION 'FAIL: Expected 6 steps, got %', v_steps_count;
  END IF;

  -- Check demande is completed
  SELECT * INTO v_step
  FROM mutation_steps
  WHERE mutation_id = v_mutation_id AND step_key = 'demande';

  IF v_step.status = 'completed' THEN
    RAISE NOTICE 'PASS: demande step is completed';
  ELSE
    RAISE EXCEPTION 'FAIL: demande step should be completed, got %', v_step.status;
  END IF;

  -- ============================================
  -- TEST 3: Upsert step with payload
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 3: Upsert step with payload...';

  SELECT * INTO v_step FROM upsert_mutation_step(
    v_mutation_id,
    'pre_etat_date',
    'in_progress',
    '{"documents": ["doc1.pdf"], "notes": "En cours de génération"}'::jsonb
  );

  IF v_step.status = 'in_progress' AND v_step.payload->>'notes' = 'En cours de génération' THEN
    RAISE NOTICE 'PASS: Step updated with payload';
  ELSE
    RAISE EXCEPTION 'FAIL: Step update failed';
  END IF;

  -- Update to completed
  SELECT * INTO v_step FROM upsert_mutation_step(
    v_mutation_id,
    'pre_etat_date',
    'completed',
    '{"generated_at": "2026-01-28"}'::jsonb
  );

  IF v_step.status = 'completed' AND v_step.completed_at IS NOT NULL THEN
    RAISE NOTICE 'PASS: Step marked completed with timestamp';
  ELSE
    RAISE EXCEPTION 'FAIL: Step completion failed';
  END IF;

  -- ============================================
  -- TEST 4: Create etat_date_snapshot
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 4: Create etat_date_snapshot...';

  INSERT INTO etat_date_snapshots (
    copro_id, mutation_id, snapshot_type, payload
  ) VALUES (
    v_copro_id, v_mutation_id, 'pre',
    jsonb_build_object(
      'version', '1.0',
      'lot', jsonb_build_object('ref', 'A101'),
      'financial_situation', jsonb_build_object('balance', 0)
    )
  ) RETURNING id INTO v_snapshot_id;

  IF v_snapshot_id IS NOT NULL THEN
    RAISE NOTICE 'PASS: Snapshot created: %', v_snapshot_id;
  ELSE
    RAISE EXCEPTION 'FAIL: Snapshot not created';
  END IF;

  -- ============================================
  -- TEST 5: Check v_mutation_detail view
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 5: Check v_mutation_detail view...';

  PERFORM 1 FROM v_mutation_detail
  WHERE id = v_mutation_id
  AND has_pre_etat = true
  AND completed_steps_count >= 2;

  IF FOUND THEN
    RAISE NOTICE 'PASS: v_mutation_detail returns correct data';
  ELSE
    RAISE EXCEPTION 'FAIL: v_mutation_detail incorrect';
  END IF;

  -- ============================================
  -- TEST 6: Check v_mutations_overview
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 6: Check v_mutations_overview...';

  PERFORM 1 FROM v_mutations_overview
  WHERE id = v_mutation_id
  AND has_pre_etat = true
  AND seller_name IS NOT NULL;

  IF FOUND THEN
    RAISE NOTICE 'PASS: v_mutations_overview returns correct data';
  ELSE
    RAISE EXCEPTION 'FAIL: v_mutations_overview incorrect';
  END IF;

  -- ============================================
  -- CLEANUP
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE 'CLEANUP: Removing test data...';

  DELETE FROM etat_date_snapshots WHERE mutation_id = v_mutation_id;
  DELETE FROM mutation_steps WHERE mutation_id = v_mutation_id;
  DELETE FROM mutations WHERE id = v_mutation_id;

  RAISE NOTICE 'CLEANUP: Done';

  -- ============================================
  -- SUMMARY
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '=== ALL P0 TESTS PASSED ===';

EXCEPTION
  WHEN OTHERS THEN
    -- Cleanup on failure
    IF v_mutation_id IS NOT NULL THEN
      DELETE FROM etat_date_snapshots WHERE mutation_id = v_mutation_id;
      DELETE FROM mutation_steps WHERE mutation_id = v_mutation_id;
      DELETE FROM mutations WHERE id = v_mutation_id;
    END IF;
    RAISE;
END $$;

-- ============================================
-- Summary query
-- ============================================
SELECT 'Mutations count' AS metric, COUNT(*)::text AS value FROM mutations
UNION ALL
SELECT 'Steps count', COUNT(*)::text FROM mutation_steps
UNION ALL
SELECT 'Snapshots count', COUNT(*)::text FROM etat_date_snapshots;
