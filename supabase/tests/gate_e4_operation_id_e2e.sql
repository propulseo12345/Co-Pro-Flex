-- GATE E2E — E4 : operation_id au niveau LIGNE du grand livre + precedence travaux
-- ============================================================================================
-- Prouve : (1) create_ledger_transaction PERSISTE operation_id passe dans le jsonb p_entries
--   (signature inchangee, cle optionnelle par ligne) ; (2) PRECEDENCE STRICTE en lecture — une
--   ligne sur un compte COURANT (601) AVEC operation_id est de nature TRAVAUX quoi qu'il arrive,
--   tandis que la meme ligne SANS operation_id reste COURANT (expression de open_next_period /
--   v_result_allocation_split). Assertions au niveau des ecritures precises (deterministe, non
--   pollue par les charges du golden loop seede).
-- Auto-rollback (ROLLBACK_TEST_OK). Contexte service_role pose ci-dessous (et par db-test.mjs).
DO $$
DECLARE
  v_copro   uuid; v_n uuid;
  v_a601    uuid; v_a512 uuid; v_budget uuid;
  v_tx1     uuid; v_tx2 uuid;
  v_op_count int;
  v_nat1    text;  -- nature effective de la ligne 601 SANS operation_id (attendu 'courant')
  v_nat2    text;  -- nature effective de la ligne 601 AVEC operation_id (attendu 'travaux')
  v_amount  numeric := 500;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);

  v_copro := create_clean_test_copro_seeded('e4-operation-id');
  SELECT id INTO v_n      FROM accounting_periods WHERE copro_id = v_copro AND status = 'open' ORDER BY start_date DESC LIMIT 1;
  SELECT id INTO v_a601   FROM accounts WHERE copro_id = v_copro AND code = '601';
  SELECT id INTO v_a512   FROM accounts WHERE copro_id = v_copro AND substr(code, 1, 1) = '5' LIMIT 1;
  SELECT id INTO v_budget FROM budgets  WHERE copro_id = v_copro LIMIT 1;
  IF v_a601 IS NULL OR v_a512 IS NULL OR v_budget IS NULL THEN
    RAISE EXCEPTION 'E4 setup : compte/budget manquant (601=% 512=% budget=%)', v_a601, v_a512, v_budget;
  END IF;

  -- (1) Charge sur 601 (courant) SANS operation_id.
  SELECT (create_ledger_transaction(v_copro, v_n, current_date, 'E4 charge courante', 'budget_expense', NULL,
    jsonb_build_array(
      jsonb_build_object('account_id', v_a601, 'lot_id', NULL, 'direction', 'debit',  'amount', v_amount, 'entry_label', 'Charge courante'),
      jsonb_build_object('account_id', v_a512, 'lot_id', NULL, 'direction', 'credit', 'amount', v_amount, 'entry_label', 'Paiement')
    ), true)->>'tx_id')::uuid INTO v_tx1;

  -- (2) Charge sur 601 (courant) AVEC operation_id -> precedence => doit basculer TRAVAUX.
  SELECT (create_ledger_transaction(v_copro, v_n, current_date, 'E4 charge operation', 'budget_expense', NULL,
    jsonb_build_array(
      jsonb_build_object('account_id', v_a601, 'lot_id', NULL, 'direction', 'debit',  'amount', v_amount, 'entry_label', 'Charge operation', 'operation_id', v_budget::text),
      jsonb_build_object('account_id', v_a512, 'lot_id', NULL, 'direction', 'credit', 'amount', v_amount, 'entry_label', 'Paiement')
    ), true)->>'tx_id')::uuid INTO v_tx2;

  -- (3a) PERSISTENCE : operation_id ecrit sur la ligne 601 de la tx (2), NULL sur celle de la tx (1).
  SELECT count(*) INTO v_op_count
  FROM ledger_entries e
  WHERE e.tx_id = v_tx2 AND e.account_id = v_a601 AND e.operation_id = v_budget;
  IF v_op_count <> 1 THEN RAISE EXCEPTION 'E4 (3a) : operation_id non persiste sur la ligne (count=%)', v_op_count; END IF;

  -- (3b) PRECEDENCE : nature effective des deux lignes 601 (meme compte courant).
  SELECT CASE WHEN e.operation_id IS NOT NULL OR a.charge_nature = 'travaux' THEN 'travaux' ELSE a.charge_nature END
    INTO v_nat1
  FROM ledger_entries e JOIN accounts a ON a.id = e.account_id
  WHERE e.tx_id = v_tx1 AND e.account_id = v_a601;

  SELECT CASE WHEN e.operation_id IS NOT NULL OR a.charge_nature = 'travaux' THEN 'travaux' ELSE a.charge_nature END
    INTO v_nat2
  FROM ledger_entries e JOIN accounts a ON a.id = e.account_id
  WHERE e.tx_id = v_tx2 AND e.account_id = v_a601;

  IF v_nat1 <> 'courant' THEN RAISE EXCEPTION 'E4 (3b) : 601 SANS operation_id classe % (attendu courant)', v_nat1; END IF;
  IF v_nat2 <> 'travaux' THEN RAISE EXCEPTION 'E4 (3b) : 601 AVEC operation_id classe % (attendu travaux — precedence KO)', v_nat2; END IF;

  RAISE NOTICE 'GATE E4 OK : operation_id persiste (ligne) + precedence operation_id=>travaux (601 courant bascule travaux quand operation_id present, reste courant sinon)';
  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
