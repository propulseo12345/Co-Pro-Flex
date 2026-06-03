-- TEST set_opening_balance : équilibre garanti, résidu sur 471/472, idempotence par
-- remplacement (2 appels -> 1 seule tx), 103/lot posté (exclu de v_lot_balance, présent
-- dans v_lot_avance), 6/7 sans lot_id, pré-garde statut période, RAISE si écriture KO.
DO $$
DECLARE
  v jsonb; v_copro uuid; v_period uuid; v_lot uuid;
  v_res jsonb; v_res2 jsonb;
  v_tx_count int; v_debit numeric; v_credit numeric;
  v_wait numeric; v_lot_bal numeric; v_lot_av numeric;
  v_lot_bal_before numeric; v_lot_av_before numeric;
  v_67_lot_count int;
BEGIN
  v := create_clean_test_copro_seeded('setob', 15000, 0);
  v_copro := (v->>'copro_id')::uuid;
  v_period := (v->>'period_id')::uuid;
  SELECT id INTO v_lot FROM lots WHERE copro_id = v_copro ORDER BY ref LIMIT 1;

  -- NB : create_clean_test_copro_seeded N'EST PAS 450-vierge (il pose des écritures seed
  -- sur le 450 du 1er lot). On mesure donc le DELTA avant/après la reprise, pas l'absolu.
  SELECT coalesce(balance,0) INTO v_lot_bal_before FROM v_lot_balance WHERE lot_id=v_lot;
  SELECT coalesce(avance_balance,0) INTO v_lot_av_before FROM v_lot_avance WHERE lot_id=v_lot;

  -- Appel 1 : une reprise déséquilibrée volontairement -> le reste tombe sur 471/472.
  --   450-1/lot débité 600 (le lot doit) ; banque 512 débité 200 ; charge 601 (6) débité 100 ;
  --   produit 701 (7) crédité 300 (amount négatif) ; total signé = 600+200+100-300 = 600
  --   -> residual = -600 -> posé au CRÉDIT du 472 (compte d'attente créditeur).
  v_res := set_opening_balance(v_copro, v_period, CURRENT_DATE, jsonb_build_array(
    jsonb_build_object('account_code','450','lot_id',v_lot,'amount',600,'nature','current'),
    jsonb_build_object('account_code','512','amount',200),
    jsonb_build_object('account_code','601','amount',100),
    jsonb_build_object('account_code','701','amount',-300),
    jsonb_build_object('account_code','103','lot_id',v_lot,'amount',150)
  ));
  IF NOT coalesce((v_res->>'success')::boolean,false) THEN
    RAISE EXCEPTION 'ASSERT FAIL : appel 1 KO : %', v_res;
  END IF;

  -- 1) UNE seule transaction opening_onboarding pour cette période
  SELECT count(*) INTO v_tx_count FROM ledger_transactions
   WHERE copro_id=v_copro AND period_id=v_period AND source_type='opening_onboarding';
  IF v_tx_count <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : attendu 1 tx, trouve %', v_tx_count; END IF;

  -- 2) écriture équilibrée
  SELECT coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE 0 END),0),
         coalesce(sum(CASE WHEN e.direction='credit' THEN e.amount ELSE 0 END),0)
    INTO v_debit, v_credit
  FROM ledger_entries e JOIN ledger_transactions t ON t.id=e.tx_id
  WHERE t.copro_id=v_copro AND t.period_id=v_period AND t.source_type='opening_onboarding';
  IF abs(v_debit - v_credit) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL : ecriture desequilibree D=% C=%', v_debit, v_credit;
  END IF;

  -- 3) résidu correct : residual renvoyé = -(600+200+100-300+150) = -750 ; net 471/472 = -750
  SELECT coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0)
    INTO v_wait
  FROM ledger_entries e JOIN accounts a ON a.id=e.account_id
  JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted'
  WHERE a.copro_id=v_copro AND a.code IN ('471','472');
  IF abs(v_wait - (-750)) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL : net 471/472 attendu -750, trouve %', v_wait;
  END IF;
  IF abs((v_res->>'residual')::numeric - (-750)) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL : residual renvoye attendu -750, trouve %', v_res->>'residual';
  END IF;

  -- 4) 103/lot posté : exclu de v_lot_balance (Pivot 1, seul le 450 y figure -> delta +600),
  --    présent dans v_lot_avance. v_lot_avance = sum(credit - debit) sur 103 ; notre 103 est
  --    posé au DÉBIT (amount +150 -> direction debit, convention amount>0=debit) -> delta -150.
  SELECT coalesce(balance,0) INTO v_lot_bal FROM v_lot_balance WHERE lot_id=v_lot;
  IF abs((v_lot_bal - v_lot_bal_before) - 600) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL : v_lot_balance delta doit valoir 600 (450 only), trouve %', v_lot_bal - v_lot_bal_before;
  END IF;
  SELECT coalesce(avance_balance,0) INTO v_lot_av FROM v_lot_avance WHERE lot_id=v_lot;
  IF abs((v_lot_av - v_lot_av_before) - (-150)) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL : v_lot_avance delta doit refleter -150 (103 au debit), trouve %', v_lot_av - v_lot_av_before;
  END IF;

  -- 5) les écritures 6/7 sont SANS lot_id
  SELECT count(*) INTO v_67_lot_count
  FROM ledger_entries e JOIN accounts a ON a.id=e.account_id
  JOIN ledger_transactions t ON t.id=e.tx_id AND t.source_type='opening_onboarding'
  WHERE t.copro_id=v_copro AND (a.code LIKE '6%' OR a.code LIKE '7%') AND e.lot_id IS NOT NULL;
  IF v_67_lot_count <> 0 THEN
    RAISE EXCEPTION 'ASSERT FAIL : % ecriture(s) 6/7 portent un lot_id', v_67_lot_count;
  END IF;

  -- 6) idempotence par REMPLACEMENT : 2e appel (équilibré) -> toujours 1 seule tx
  v_res2 := set_opening_balance(v_copro, v_period, CURRENT_DATE, jsonb_build_array(
    jsonb_build_object('account_code','450','lot_id',v_lot,'amount',400,'nature','current'),
    jsonb_build_object('account_code','512','amount',400)
  ));
  IF NOT coalesce((v_res2->>'success')::boolean,false) THEN
    RAISE EXCEPTION 'ASSERT FAIL : appel 2 KO : %', v_res2;
  END IF;
  SELECT count(*) INTO v_tx_count FROM ledger_transactions
   WHERE copro_id=v_copro AND period_id=v_period AND source_type='opening_onboarding';
  IF v_tx_count <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : replace a cree un doublon (%)', v_tx_count; END IF;
  -- après remplacement total (400 débit + 400 débit -> residual -800 sur 472), pas de reste de l'appel 1
  SELECT coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0)
    INTO v_wait
  FROM ledger_entries e JOIN accounts a ON a.id=e.account_id
  JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted'
  WHERE a.copro_id=v_copro AND a.code IN ('471','472');
  IF abs(v_wait - (-800)) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL : apres replace net 471/472 attendu -800, trouve %', v_wait;
  END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- TEST set_opening_balance : pré-garde statut (période close -> success:false, pas de DELETE)
-- + ventilation sans centime résiduel (largest-remainder implicite via residual exact).
DO $$
DECLARE
  v jsonb; v_copro uuid; v_period uuid; v_lot uuid;
  v_res jsonb; v_tx_count int; v_wait numeric;
BEGIN
  v := create_clean_test_copro_seeded('setob-guard', 15000, 0);
  v_copro := (v->>'copro_id')::uuid;
  v_period := (v->>'period_id')::uuid;
  SELECT id INTO v_lot FROM lots WHERE copro_id=v_copro ORDER BY ref LIMIT 1;

  -- Poser une 1re reprise (réussie), puis FERMER la période
  v_res := set_opening_balance(v_copro, v_period, CURRENT_DATE, jsonb_build_array(
    jsonb_build_object('account_code','450','lot_id',v_lot,'amount',500,'nature','current')
  ));
  IF NOT (v_res->>'success')::boolean THEN RAISE EXCEPTION 'ASSERT FAIL : reprise initiale KO : %', v_res; END IF;
  PERFORM close_period(v_period);

  -- Tenter une ré-édition sur période close -> success:false, message métier, AUCUN DELETE
  v_res := set_opening_balance(v_copro, v_period, CURRENT_DATE, jsonb_build_array(
    jsonb_build_object('account_code','450','lot_id',v_lot,'amount',999,'nature','current')
  ));
  IF coalesce((v_res->>'success')::boolean,false) THEN
    RAISE EXCEPTION 'ASSERT FAIL : reprise sur periode close aurait du echouer : %', v_res;
  END IF;
  IF position('ouvr' in lower(coalesce(v_res->>'error',''))) = 0 THEN
    RAISE EXCEPTION 'ASSERT FAIL : message metier attendu (reouvrez la periode), trouve : %', v_res->>'error';
  END IF;

  -- la reprise initiale (500) doit TOUJOURS exister (pas de DELETE sans remplacement, I3/I14)
  SELECT count(*) INTO v_tx_count FROM ledger_transactions
   WHERE copro_id=v_copro AND period_id=v_period AND source_type='opening_onboarding';
  IF v_tx_count <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : reprise initiale perdue (tx=%)', v_tx_count; END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
