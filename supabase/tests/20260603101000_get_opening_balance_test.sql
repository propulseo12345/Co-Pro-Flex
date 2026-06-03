-- TEST get_opening_balance : relit la reprise et la remappe en lignes signées,
-- exclut 471/472 du tableau, expose residual et as_of_date.
DO $$
DECLARE
  v jsonb; v_copro uuid; v_period uuid; v_lot uuid;
  v_set jsonb; v_get jsonb; v_lines jsonb;
  v_has_450 boolean; v_has_512 boolean; v_has_wait boolean; v_amt_450 numeric;
BEGIN
  v := create_clean_test_copro_seeded('getob', 15000, 0);
  v_copro := (v->>'copro_id')::uuid;
  v_period := (v->>'period_id')::uuid;
  SELECT id INTO v_lot FROM lots WHERE copro_id=v_copro ORDER BY ref LIMIT 1;

  v_set := set_opening_balance(v_copro, v_period, DATE '2026-03-15', jsonb_build_array(
    jsonb_build_object('account_code','450','lot_id',v_lot,'amount',600,'nature','current'),
    jsonb_build_object('account_code','512','amount',-250)  -- crédit volontaire
  ));
  IF NOT (v_set->>'success')::boolean THEN RAISE EXCEPTION 'ASSERT FAIL : set KO : %', v_set; END IF;

  v_get := get_opening_balance(v_copro, v_period);
  v_lines := v_get->'lines';

  IF (v_get->>'as_of_date') <> '2026-03-15' THEN
    RAISE EXCEPTION 'ASSERT FAIL : as_of_date attendu 2026-03-15, trouve %', v_get->>'as_of_date';
  END IF;

  -- residual = -(600-250) = -350
  IF abs((v_get->>'residual')::numeric - (-350)) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL : residual attendu -350, trouve %', v_get->>'residual';
  END IF;

  -- la ligne 450-1 (résolue) doit revenir avec amount +600, nature 'current', lot rempli
  SELECT EXISTS (SELECT 1 FROM jsonb_array_elements(v_lines) l
                 WHERE l->>'account_code'='450-1' AND (l->>'lot_id')::uuid=v_lot
                   AND (l->>'amount')::numeric=600 AND l->>'nature'='current')
    INTO v_has_450;
  IF NOT v_has_450 THEN RAISE EXCEPTION 'ASSERT FAIL : ligne 450-1/lot/+600/current absente : %', v_lines; END IF;

  -- la ligne 512 doit revenir avec amount -250 (crédit -> signe négatif)
  SELECT EXISTS (SELECT 1 FROM jsonb_array_elements(v_lines) l
                 WHERE l->>'account_code'='512' AND (l->>'amount')::numeric=-250) INTO v_has_512;
  IF NOT v_has_512 THEN RAISE EXCEPTION 'ASSERT FAIL : ligne 512/-250 absente : %', v_lines; END IF;

  -- 471/472 NE doivent PAS apparaître dans lines (c'est le residual)
  SELECT EXISTS (SELECT 1 FROM jsonb_array_elements(v_lines) l
                 WHERE l->>'account_code' IN ('471','472')) INTO v_has_wait;
  IF v_has_wait THEN RAISE EXCEPTION 'ASSERT FAIL : 471/472 ne doivent pas figurer dans lines : %', v_lines; END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
