DO $$
DECLARE
  v jsonb; v_copro uuid; v_lot uuid; v_period uuid;
  v_acc450 uuid; v_acc103 uuid; v_acc472 uuid;
  v_bal_before numeric; v_bal_after numeric; v_avance numeric;
BEGIN
  v := create_clean_test_copro_seeded('pivot1', 15000, 2);
  v_copro := (v->>'copro_id')::uuid;
  SELECT id INTO v_period FROM accounting_periods WHERE copro_id = v_copro ORDER BY start_date LIMIT 1;
  SELECT id INTO v_lot FROM lots WHERE copro_id = v_copro ORDER BY ref LIMIT 1;
  SELECT id INTO v_acc450 FROM accounts WHERE copro_id = v_copro AND code = '450-1';
  SELECT id INTO v_acc103 FROM accounts WHERE copro_id = v_copro AND code = '103';
  SELECT id INTO v_acc472 FROM accounts WHERE copro_id = v_copro AND code = '472';

  -- solde lot AVANT (référence)
  SELECT COALESCE(balance,0) INTO v_bal_before FROM v_lot_balance WHERE lot_id = v_lot;

  -- poste une avance 103 PAR LOT (équilibrée par 472), via la route canonique
  PERFORM create_ledger_transaction(
    v_copro, v_period, CURRENT_DATE, 'TEST avance 103/lot', 'manual', v_period,
    jsonb_build_array(
      jsonb_build_object('account_id', v_acc103, 'lot_id', v_lot, 'direction','credit','amount',300,'entry_label','avance'),
      jsonb_build_object('account_id', v_acc472, 'direction','debit','amount',300,'entry_label','contrepartie')
    ), true);

  -- solde lot APRÈS : doit être INCHANGÉ (le 103 est exclu de v_lot_balance)
  SELECT COALESCE(balance,0) INTO v_bal_after FROM v_lot_balance WHERE lot_id = v_lot;
  -- la vue dédiée doit, elle, refléter l'avance
  SELECT COALESCE(avance_balance,0) INTO v_avance FROM v_lot_avance WHERE lot_id = v_lot;

  IF abs(v_bal_after - v_bal_before) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL : v_lot_balance pollue par 103 (avant=% apres=%)', v_bal_before, v_bal_after;
  END IF;
  IF abs(v_avance - 300) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL : v_lot_avance ne reflete pas le 103 (=%)', v_avance;
  END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
