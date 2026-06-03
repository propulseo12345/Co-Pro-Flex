-- Garde pre-validation AG (Plan C / Task 4) : detecter APPROVE_ACCOUNTS pending + 471/472 net.
-- NOTE schema reel (verifie via list_tables, 2026-06-03) :
--   ag_meetings : colonnes meeting_type (enum ag_meeting_type: ordinary/extraordinary/mixed),
--                 meeting_date (timestamptz NOT NULL), status (enum ag_status, defaut 'draft').
--                 (le plan parlait de type/date/title/status -> corrige ici.)
--   ag_pending_actions : resolution_id NOT NULL (FK ag_resolutions) ET target_table NOT NULL
--                 -> on cree une ag_resolutions minimale et on renseigne target_table.
DO $$
DECLARE
  v_copro uuid; v_period uuid; v_ag uuid; v_res uuid;
  v_acc472 uuid; v_acc450 uuid; v_lot uuid;
  v_tx jsonb; v_wait numeric; v_has_closure int;
BEGIN
  v_copro := create_clean_test_copro('ag-guard');
  SELECT id INTO v_period FROM accounting_periods WHERE copro_id=v_copro AND status='open' ORDER BY start_date DESC LIMIT 1;
  SELECT id INTO v_acc472 FROM accounts WHERE copro_id=v_copro AND code='472';
  SELECT id INTO v_acc450 FROM accounts WHERE copro_id=v_copro AND code='450-1';
  SELECT id INTO v_lot FROM lots WHERE copro_id=v_copro ORDER BY ref LIMIT 1;

  -- Reprise incomplete : 450/lot debite, contrepartie 472 -> 471/472 net != 0
  v_tx := create_ledger_transaction(
    v_copro, v_period, CURRENT_DATE, 'Reprise incomplete TEST', 'manual', v_period,
    jsonb_build_array(
      jsonb_build_object('account_id', v_acc450, 'lot_id', v_lot, 'direction','debit','amount',200,'entry_label','du'),
      jsonb_build_object('account_id', v_acc472, 'direction','credit','amount',200,'entry_label','attente')
    ), true);
  IF NOT coalesce((v_tx->>'success')::boolean,false) THEN
    RAISE EXCEPTION 'ASSERT FAIL : creation reprise KO : %', v_tx;
  END IF;

  -- Solde net 471/472 (debit - credit) attendu = -200 (472 credite)
  SELECT COALESCE(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0)
    INTO v_wait
  FROM ledger_entries e JOIN accounts a ON a.id=e.account_id
  WHERE a.copro_id=v_copro AND a.code IN ('471','472');
  IF abs(v_wait) < 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL : 471/472 devrait etre != 0 (=%)', v_wait;
  END IF;

  -- Creer une AG avec une action APPROVE_ACCOUNTS pending (schema reel)
  INSERT INTO ag_meetings (copro_id, title, meeting_type, meeting_date, status)
  VALUES (v_copro, 'AG arrete TEST', 'ordinary', now(), 'draft')
  RETURNING id INTO v_ag;

  INSERT INTO ag_resolutions (ag_id, copro_id, resolution_number, title, resolution_type, majority_type, status)
  VALUES (v_ag, v_copro, 1, 'Arrete des comptes TEST', 'accounts', 'art24', 'approved')
  RETURNING id INTO v_res;

  INSERT INTO ag_pending_actions (ag_id, resolution_id, action_type, target_table, status, payload, created_at)
  VALUES (v_ag, v_res, 'APPROVE_ACCOUNTS', 'budgets', 'pending', '{}'::jsonb, now());

  SELECT count(*) INTO v_has_closure
  FROM ag_pending_actions
  WHERE ag_id=v_ag AND action_type='APPROVE_ACCOUNTS' AND status='pending';
  IF v_has_closure <> 1 THEN
    RAISE EXCEPTION 'ASSERT FAIL : action APPROVE_ACCOUNTS pending introuvable (=%)', v_has_closure;
  END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
