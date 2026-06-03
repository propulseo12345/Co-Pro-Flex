DO $$
DECLARE
  v jsonb; v_copro uuid; v_periodN uuid; v_lot uuid;
  v_acc450 uuid; v_acc472 uuid; v_tx jsonb; v_tx_id uuid;
  v_res jsonb; v_next uuid; v_survives int; v_carry450 numeric;
BEGIN
  v := create_clean_test_copro_seeded('lifecycle', 15000, 2);
  v_copro := (v->>'copro_id')::uuid;
  SELECT id INTO v_periodN FROM accounting_periods WHERE copro_id = v_copro ORDER BY start_date LIMIT 1;
  SELECT id INTO v_lot FROM lots WHERE copro_id = v_copro ORDER BY ref LIMIT 1;
  SELECT id INTO v_acc450 FROM accounts WHERE copro_id = v_copro AND code = '450-1';
  SELECT id INTO v_acc472 FROM accounts WHERE copro_id = v_copro AND code = '472';

  -- Reprise d'onboarding (source_type dédié), dans la période N
  v_tx := create_ledger_transaction(
    v_copro, v_periodN, CURRENT_DATE, 'Reprise onboarding TEST', 'opening_onboarding', v_periodN,
    jsonb_build_array(
      jsonb_build_object('account_id', v_acc450, 'lot_id', v_lot, 'direction','debit','amount',500,'entry_label','solde ouverture'),
      jsonb_build_object('account_id', v_acc472, 'direction','credit','amount',500,'entry_label','attente')
    ), true);
  IF NOT coalesce((v_tx->>'success')::boolean,false) THEN
    RAISE EXCEPTION 'ASSERT FAIL : creation reprise onboarding KO : %', v_tx;
  END IF;
  v_tx_id := (v_tx->>'tx_id')::uuid;

  -- Clôturer N puis ouvrir N+1
  -- NB : signature live close_period(p_period_id uuid) (1 argument).
  PERFORM close_period(v_periodN);
  v_res := open_next_period(v_copro, v_periodN);
  IF NOT coalesce((v_res->>'success')::boolean,false) THEN
    RAISE EXCEPTION 'ASSERT FAIL : open_next_period KO : %', v_res;
  END IF;
  v_next := (v_res->>'next_period_id')::uuid;

  -- 1) la reprise d'onboarding NE doit PAS avoir été supprimée
  SELECT count(*) INTO v_survives FROM ledger_transactions WHERE id = v_tx_id;
  IF v_survives <> 1 THEN
    RAISE EXCEPTION 'ASSERT FAIL : la reprise onboarding a ete supprimee par open_next_period';
  END IF;

  -- 2) son solde 450/lot doit avoir ete reporte dans N+1 (report a-nouveau)
  SELECT round(COALESCE(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0),2)
    INTO v_carry450
  FROM ledger_entries e JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted'
  WHERE e.copro_id=v_copro AND e.period_id=v_next AND e.account_id=v_acc450 AND e.lot_id=v_lot;
  IF v_carry450 < 499.99 THEN
    RAISE EXCEPTION 'ASSERT FAIL : solde ouverture 450/lot non reporte en N+1 (=%)', v_carry450;
  END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
