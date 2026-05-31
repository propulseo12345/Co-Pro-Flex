-- ============================================================================
-- NIVEAU 6A : MAINTENANCE - Tests
-- CoProFlex - Tests unitaires maintenance
-- Date: 2026-01-26
-- ============================================================================

DO $$
DECLARE
  v_copro_id UUID;
  v_provider_id UUID;
  v_contract_id UUID;
  v_order_id UUID;
  v_entry_id UUID;
  v_result RECORD;
  v_count INT;
  v_test_passed BOOLEAN := true;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MAINTENANCE MODULE TESTS - Starting...';
  RAISE NOTICE '========================================';

  -- Récupérer la copro de test
  SELECT id INTO v_copro_id FROM copros LIMIT 1;
  IF v_copro_id IS NULL THEN
    RAISE EXCEPTION 'No copro found for testing';
  END IF;

  -- ============================================================================
  -- TEST 1: Création prestataire
  -- ============================================================================
  RAISE NOTICE 'TEST 1: Provider creation...';

  INSERT INTO providers (copro_id, name, category, domains, email, phone, is_active)
  VALUES (v_copro_id, 'Test Provider ' || gen_random_uuid()::TEXT, 'copropriete', ARRAY['plomberie', 'electricite']::provider_domain[], 'test@test.fr', '0123456789', true)
  RETURNING id INTO v_provider_id;

  IF v_provider_id IS NULL THEN
    RAISE EXCEPTION 'TEST 1 FAILED: Provider not created';
  END IF;

  SELECT * INTO v_result FROM providers WHERE id = v_provider_id;
  IF v_result.interventions_count != 0 THEN
    RAISE EXCEPTION 'TEST 1 FAILED: interventions_count should be 0';
  END IF;

  RAISE NOTICE 'TEST 1 PASSED: Provider created with id %', v_provider_id;

  -- ============================================================================
  -- TEST 2: Création contrat avec auto-status
  -- ============================================================================
  RAISE NOTICE 'TEST 2: Contract creation with auto-status...';

  -- Contrat actif
  INSERT INTO contracts (copro_id, provider_id, contract_type, title, start_date, end_date, notice_months, status)
  VALUES (v_copro_id, v_provider_id, 'maintenance', 'Test Contract Active', CURRENT_DATE - 30, CURRENT_DATE + 365, 3, 'active')
  RETURNING id INTO v_contract_id;

  SELECT status INTO v_result FROM contracts WHERE id = v_contract_id;
  IF v_result.status != 'active' THEN
    RAISE EXCEPTION 'TEST 2 FAILED: Contract should be active, got %', v_result.status;
  END IF;

  -- Contrat expiré
  INSERT INTO contracts (copro_id, provider_id, contract_type, title, start_date, end_date, status)
  VALUES (v_copro_id, v_provider_id, 'maintenance', 'Test Contract Expired', CURRENT_DATE - 365, CURRENT_DATE - 30, 'active')
  RETURNING id INTO v_contract_id;

  SELECT status INTO v_result FROM contracts WHERE id = v_contract_id;
  IF v_result.status != 'expired' THEN
    RAISE EXCEPTION 'TEST 2 FAILED: Contract should be expired, got %', v_result.status;
  END IF;

  -- Contrat à renouveler (fin dans 60 jours, préavis 3 mois)
  INSERT INTO contracts (copro_id, provider_id, contract_type, title, start_date, end_date, notice_months, status)
  VALUES (v_copro_id, v_provider_id, 'maintenance', 'Test Contract ToRenew', CURRENT_DATE - 300, CURRENT_DATE + 60, 3, 'active')
  RETURNING id INTO v_contract_id;

  SELECT status INTO v_result FROM contracts WHERE id = v_contract_id;
  IF v_result.status != 'to_renew' THEN
    RAISE EXCEPTION 'TEST 2 FAILED: Contract should be to_renew, got %', v_result.status;
  END IF;

  RAISE NOTICE 'TEST 2 PASSED: Contract auto-status working correctly';

  -- ============================================================================
  -- TEST 3: Génération numéro ordre de service
  -- ============================================================================
  RAISE NOTICE 'TEST 3: Service order number generation...';

  DECLARE
    v_number1 TEXT;
    v_number2 TEXT;
  BEGIN
    v_number1 := generate_service_order_number(v_copro_id);
    v_number2 := generate_service_order_number(v_copro_id);

    IF v_number1 IS NULL OR v_number1 = '' THEN
      RAISE EXCEPTION 'TEST 3 FAILED: Number generation returned null/empty';
    END IF;

    IF v_number1 NOT LIKE 'OS-2026-%' THEN
      RAISE EXCEPTION 'TEST 3 FAILED: Number format incorrect: %', v_number1;
    END IF;

    RAISE NOTICE 'TEST 3 PASSED: Generated numbers % and %', v_number1, v_number2;
  END;

  -- ============================================================================
  -- TEST 4: Workflow ordre de service - Transitions valides
  -- ============================================================================
  RAISE NOTICE 'TEST 4: Service order workflow - Valid transitions...';

  INSERT INTO service_orders (copro_id, order_number, provider_id, subject, status)
  VALUES (v_copro_id, generate_service_order_number(v_copro_id), v_provider_id, 'Test Order Workflow', 'draft')
  RETURNING id INTO v_order_id;

  -- draft -> to_send (valide)
  SELECT * INTO v_result FROM update_service_order_status(v_order_id, 'to_send', 'Test transition');
  IF v_result.status != 'to_send' THEN
    RAISE EXCEPTION 'TEST 4 FAILED: Transition to to_send failed';
  END IF;

  -- to_send -> sent (valide)
  SELECT * INTO v_result FROM update_service_order_status(v_order_id, 'sent', 'Envoyé au prestataire');
  IF v_result.status != 'sent' OR v_result.sent_at IS NULL THEN
    RAISE EXCEPTION 'TEST 4 FAILED: Transition to sent failed or sent_at not set';
  END IF;

  -- sent -> accepted (valide)
  SELECT * INTO v_result FROM update_service_order_status(v_order_id, 'accepted', 'Accepté');
  IF v_result.status != 'accepted' OR v_result.accepted_at IS NULL THEN
    RAISE EXCEPTION 'TEST 4 FAILED: Transition to accepted failed';
  END IF;

  -- Vérifier les événements d'audit
  SELECT COUNT(*) INTO v_count FROM service_order_events WHERE service_order_id = v_order_id;
  IF v_count < 3 THEN
    RAISE EXCEPTION 'TEST 4 FAILED: Expected at least 3 events, got %', v_count;
  END IF;

  RAISE NOTICE 'TEST 4 PASSED: Valid workflow transitions working';

  -- ============================================================================
  -- TEST 5: Workflow ordre de service - Transitions invalides
  -- ============================================================================
  RAISE NOTICE 'TEST 5: Service order workflow - Invalid transitions...';

  -- Créer un nouvel ordre en draft
  INSERT INTO service_orders (copro_id, order_number, provider_id, subject, status)
  VALUES (v_copro_id, generate_service_order_number(v_copro_id), v_provider_id, 'Test Invalid Workflow', 'draft')
  RETURNING id INTO v_order_id;

  -- draft -> completed (invalide)
  BEGIN
    PERFORM update_service_order_status(v_order_id, 'completed', 'Should fail');
    RAISE EXCEPTION 'TEST 5 FAILED: Invalid transition draft->completed should have failed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%Invalid status transition%' THEN
      RAISE NOTICE 'TEST 5 PASSED: Invalid transition correctly rejected';
    ELSE
      RAISE EXCEPTION 'TEST 5 FAILED: Unexpected error: %', SQLERRM;
    END IF;
  END;

  -- ============================================================================
  -- TEST 6: Annulation depuis n'importe quel statut (sauf closed)
  -- ============================================================================
  RAISE NOTICE 'TEST 6: Cancellation from any status...';

  -- Mettre l'ordre en to_send d'abord
  SELECT * INTO v_result FROM update_service_order_status(v_order_id, 'to_send', 'Preparing');
  SELECT * INTO v_result FROM update_service_order_status(v_order_id, 'sent', 'Sent');

  -- sent -> cancelled (valide)
  SELECT * INTO v_result FROM update_service_order_status(v_order_id, 'cancelled', 'Annulé par client');
  IF v_result.status != 'cancelled' OR v_result.cancelled_at IS NULL THEN
    RAISE EXCEPTION 'TEST 6 FAILED: Cancellation failed';
  END IF;

  RAISE NOTICE 'TEST 6 PASSED: Cancellation working correctly';

  -- ============================================================================
  -- TEST 7: Création entrée carnet depuis OS terminé
  -- ============================================================================
  RAISE NOTICE 'TEST 7: Logbook entry from completed service order...';

  -- Créer un ordre et le compléter
  INSERT INTO service_orders (copro_id, order_number, provider_id, subject, urgency, estimated_amount, status)
  VALUES (v_copro_id, generate_service_order_number(v_copro_id), v_provider_id, 'Test Logbook Creation', 'normal', 500.00, 'draft')
  RETURNING id INTO v_order_id;

  -- Parcourir le workflow jusqu'à completed
  PERFORM update_service_order_status(v_order_id, 'to_send');
  PERFORM update_service_order_status(v_order_id, 'sent');
  PERFORM update_service_order_status(v_order_id, 'accepted');
  PERFORM update_service_order_status(v_order_id, 'scheduled');
  PERFORM update_service_order_status(v_order_id, 'in_progress');
  PERFORM update_service_order_status(v_order_id, 'completed');

  -- Créer l'entrée carnet
  v_entry_id := create_logbook_from_service_order(v_order_id);

  IF v_entry_id IS NULL THEN
    RAISE EXCEPTION 'TEST 7 FAILED: Logbook entry not created';
  END IF;

  SELECT * INTO v_result FROM logbook_entries WHERE id = v_entry_id;
  IF v_result.service_order_id != v_order_id THEN
    RAISE EXCEPTION 'TEST 7 FAILED: Logbook entry not linked to service order';
  END IF;

  SELECT * INTO v_result FROM service_orders WHERE id = v_order_id;
  IF v_result.logbook_entry_id != v_entry_id THEN
    RAISE EXCEPTION 'TEST 7 FAILED: Service order not linked to logbook entry';
  END IF;

  RAISE NOTICE 'TEST 7 PASSED: Logbook entry created and linked';

  -- ============================================================================
  -- TEST 8: Mise à jour stats prestataire
  -- ============================================================================
  RAISE NOTICE 'TEST 8: Provider stats update on logbook entry...';

  -- Ajouter une entrée carnet pour le prestataire
  INSERT INTO logbook_entries (copro_id, entry_type, title, provider_id, happened_at, status)
  VALUES (v_copro_id, 'entretien', 'Test Stats Update', v_provider_id, CURRENT_DATE, 'terminee');

  SELECT interventions_count, last_intervention_at INTO v_result
  FROM providers WHERE id = v_provider_id;

  IF v_result.interventions_count < 1 THEN
    RAISE EXCEPTION 'TEST 8 FAILED: interventions_count not updated';
  END IF;

  IF v_result.last_intervention_at IS NULL THEN
    RAISE EXCEPTION 'TEST 8 FAILED: last_intervention_at not updated';
  END IF;

  RAISE NOTICE 'TEST 8 PASSED: Provider stats updated (count: %)', v_result.interventions_count;

  -- ============================================================================
  -- TEST 9: Validation fonction is_valid_service_order_transition
  -- ============================================================================
  RAISE NOTICE 'TEST 9: Transition validation function...';

  IF NOT is_valid_service_order_transition('draft', 'to_send') THEN
    RAISE EXCEPTION 'TEST 9 FAILED: draft->to_send should be valid';
  END IF;

  IF NOT is_valid_service_order_transition('sent', 'cancelled') THEN
    RAISE EXCEPTION 'TEST 9 FAILED: sent->cancelled should be valid';
  END IF;

  IF is_valid_service_order_transition('draft', 'completed') THEN
    RAISE EXCEPTION 'TEST 9 FAILED: draft->completed should be invalid';
  END IF;

  IF is_valid_service_order_transition('closed', 'cancelled') THEN
    RAISE EXCEPTION 'TEST 9 FAILED: closed->cancelled should be invalid';
  END IF;

  RAISE NOTICE 'TEST 9 PASSED: Transition validation working correctly';

  -- ============================================================================
  -- TEST 10: Vues
  -- ============================================================================
  RAISE NOTICE 'TEST 10: Views accessibility...';

  SELECT COUNT(*) INTO v_count FROM v_providers_overview WHERE copro_id = v_copro_id;
  RAISE NOTICE '  v_providers_overview: % rows', v_count;

  SELECT COUNT(*) INTO v_count FROM v_contracts_overview WHERE copro_id = v_copro_id;
  RAISE NOTICE '  v_contracts_overview: % rows', v_count;

  SELECT COUNT(*) INTO v_count FROM v_logbook_overview WHERE copro_id = v_copro_id;
  RAISE NOTICE '  v_logbook_overview: % rows', v_count;

  SELECT COUNT(*) INTO v_count FROM v_service_orders_overview WHERE copro_id = v_copro_id;
  RAISE NOTICE '  v_service_orders_overview: % rows', v_count;

  SELECT COUNT(*) INTO v_count FROM v_contracts_alerts WHERE copro_id = v_copro_id;
  RAISE NOTICE '  v_contracts_alerts: % rows', v_count;

  SELECT COUNT(*) INTO v_count FROM v_logbook_alerts WHERE copro_id = v_copro_id;
  RAISE NOTICE '  v_logbook_alerts: % rows', v_count;

  SELECT COUNT(*) INTO v_count FROM v_maintenance_stats WHERE copro_id = v_copro_id;
  RAISE NOTICE '  v_maintenance_stats: % rows', v_count;

  RAISE NOTICE 'TEST 10 PASSED: All views accessible';

  -- ============================================================================
  -- CLEANUP
  -- ============================================================================
  RAISE NOTICE 'Cleaning up test data...';

  -- Supprimer les données de test (en cascade)
  DELETE FROM providers WHERE name LIKE 'Test Provider%' AND copro_id = v_copro_id;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'ALL MAINTENANCE TESTS PASSED!';
  RAISE NOTICE '========================================';

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST FAILED: %', SQLERRM;
  RAISE NOTICE '========================================';
  RAISE;
END $$;
