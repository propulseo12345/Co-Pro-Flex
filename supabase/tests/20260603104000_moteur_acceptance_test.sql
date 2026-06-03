-- TEST acceptation moteur : une reprise incomplète laisse un résidu 471/472 (non bloquant),
-- une reprise complétée le solde à 0, et aucune anomalie d'intégrité bloquante n'apparaît.
DO $$
DECLARE
  v jsonb; v_copro uuid; v_period uuid; v_lot uuid;
  v_res jsonb; v_wait numeric; v_blocking int;
BEGIN
  v := create_clean_test_copro_seeded('moteur-acc', 15000, 0);
  v_copro := (v->>'copro_id')::uuid;
  v_period := (v->>'period_id')::uuid;
  SELECT id INTO v_lot FROM lots WHERE copro_id=v_copro ORDER BY ref LIMIT 1;

  -- 1) Reprise INCOMPLÈTE : seulement une créance 450/lot -> résidu sur 472
  v_res := set_opening_balance(v_copro, v_period, CURRENT_DATE, jsonb_build_array(
    jsonb_build_object('account_code','450','lot_id',v_lot,'amount',500,'nature','current')
  ));
  IF NOT (v_res->>'success')::boolean THEN RAISE EXCEPTION 'ASSERT FAIL : reprise incomplete KO : %', v_res; END IF;

  SELECT coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0) INTO v_wait
  FROM ledger_entries e JOIN accounts a ON a.id=e.account_id
  JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted'
  WHERE a.copro_id=v_copro AND a.code IN ('471','472');
  IF abs(v_wait - (-500)) > 0.01 THEN RAISE EXCEPTION 'ASSERT FAIL : residu attendu -500, trouve %', v_wait; END IF;

  -- aucune anomalie BLOQUANTE (TOTAL_MISMATCH / CHAPEAU_450_POSTED / SOURCE_ID_MISSING)
  SELECT count(*) INTO v_blocking FROM audit_finance_integrity(v_copro)
   WHERE issue_type IN ('TOTAL_MISMATCH','CHAPEAU_450_POSTED','SOURCE_ID_MISSING');
  IF v_blocking <> 0 THEN RAISE EXCEPTION 'ASSERT FAIL : % anomalie bloquante sur reprise incomplete', v_blocking; END IF;

  -- 2) COMPLÉTER : on saisit la contrepartie banque -> résidu 0
  v_res := set_opening_balance(v_copro, v_period, CURRENT_DATE, jsonb_build_array(
    jsonb_build_object('account_code','450','lot_id',v_lot,'amount',500,'nature','current'),
    jsonb_build_object('account_code','512','amount',-500)
  ));
  IF NOT (v_res->>'success')::boolean THEN RAISE EXCEPTION 'ASSERT FAIL : reprise complete KO : %', v_res; END IF;
  IF abs((v_res->>'residual')::numeric) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL : residual devrait etre 0, trouve %', v_res->>'residual';
  END IF;

  SELECT coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0) INTO v_wait
  FROM ledger_entries e JOIN accounts a ON a.id=e.account_id
  JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted'
  WHERE a.copro_id=v_copro AND a.code IN ('471','472');
  IF abs(v_wait) > 0.01 THEN RAISE EXCEPTION 'ASSERT FAIL : 471/472 devrait etre 0, trouve %', v_wait; END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
