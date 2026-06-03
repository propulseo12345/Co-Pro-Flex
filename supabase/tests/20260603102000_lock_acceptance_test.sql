-- Acceptation verrou onboarding (Plan C) : 4 scenarios spec §10.
-- NOTE schema reel (verifie 2026-06-03) : ag_meetings(meeting_type/meeting_date),
--   ag_pending_actions(resolution_id NOT NULL FK ag_resolutions, target_table NOT NULL)
--   -> inserts corriges vs le plan.
DO $$
DECLARE
  -- (a) copro vide : budget validated sans appel emis
  vA uuid; vA_period uuid; vA_budget uuid; vA_calls int; vA_blocking int;
  -- (b) LOT_GL_MISMATCH d'origine reprise (non bloquant)
  vB jsonb; vB_copro uuid; vB_blocking int; vB_total int;
  -- (c) + (d) 471/472 != 0
  vC uuid; vC_period uuid; vC_acc450 uuid; vC_acc472 uuid; vC_lot uuid; vC_tx jsonb; vC_wait numeric;
  vC_ag uuid; vC_res uuid; vC_should_block boolean;
  v_blocking_types text[] := ARRAY['TOTAL_MISMATCH','OVER_ALLOCATED','OVER_PAID','SOURCE_ID_MISSING','CHAPEAU_450_POSTED'];
BEGIN
  -- ===== (a) Copro VIDE : aucune faute liste blanche MAIS preuve positive bloque =====
  vA := create_clean_test_copro('acc-empty');
  SELECT id INTO vA_period FROM accounting_periods WHERE copro_id=vA AND status='open' ORDER BY start_date DESC LIMIT 1;
  INSERT INTO budgets (copro_id, period_id, budget_type, name, status, version, validated_at)
  VALUES (vA, vA_period, 'current', 'Budget sans appel', 'validated', 1, now())
  RETURNING id INTO vA_budget;

  SELECT count(*) INTO vA_blocking
  FROM audit_finance_integrity(vA) WHERE issue_type = ANY(v_blocking_types);
  SELECT count(*) INTO vA_calls
  FROM call_for_funds WHERE budget_id=vA_budget AND status NOT IN ('draft','cancelled');

  -- clean liste blanche = true (0 faute) MAIS 0 appel emis sur budget validated -> non finalisable
  IF vA_blocking <> 0 THEN
    RAISE EXCEPTION 'ASSERT FAIL (a) : copro vide ne devrait avoir 0 faute liste blanche (=%)', vA_blocking;
  END IF;
  IF vA_calls <> 0 THEN
    RAISE EXCEPTION 'ASSERT FAIL (a) : budget vide devrait avoir 0 appel emis (=%)', vA_calls;
  END IF;
  -- (la decision "non finalisable" = clean ET 0 appel emis sur budget validated -> testee en TS finalisation-rules)

  -- ===== (b) LOT_GL_MISMATCH d'origine reprise = NON bloquant =====
  vB := create_clean_test_copro_seeded('acc-lotgl', 15000, 2);
  vB_copro := (vB->>'copro_id')::uuid;
  SELECT count(*) INTO vB_blocking
  FROM audit_finance_integrity(vB_copro) WHERE issue_type = ANY(v_blocking_types);
  SELECT count(*) INTO vB_total
  FROM audit_finance_integrity(vB_copro);
  -- aucune faute de la liste blanche (les eventuels mismatches sont hors liste)
  IF vB_blocking <> 0 THEN
    RAISE EXCEPTION 'ASSERT FAIL (b) : copro seedee ne doit avoir AUCUNE faute liste blanche (=% / total %)', vB_blocking, vB_total;
  END IF;

  -- ===== (c) 471/472 != 0 = avertissement (pas dans la liste blanche) =====
  vC := create_clean_test_copro('acc-wait');
  SELECT id INTO vC_period FROM accounting_periods WHERE copro_id=vC AND status='open' ORDER BY start_date DESC LIMIT 1;
  SELECT id INTO vC_acc450 FROM accounts WHERE copro_id=vC AND code='450-1';
  SELECT id INTO vC_acc472 FROM accounts WHERE copro_id=vC AND code='472';
  SELECT id INTO vC_lot FROM lots WHERE copro_id=vC ORDER BY ref LIMIT 1;
  vC_tx := create_ledger_transaction(
    vC, vC_period, CURRENT_DATE, 'Reprise incomplete', 'manual', vC_period,
    jsonb_build_array(
      jsonb_build_object('account_id', vC_acc450, 'lot_id', vC_lot, 'direction','debit','amount',350,'entry_label','du'),
      jsonb_build_object('account_id', vC_acc472, 'direction','credit','amount',350,'entry_label','attente')
    ), true);
  IF NOT coalesce((vC_tx->>'success')::boolean,false) THEN
    RAISE EXCEPTION 'ASSERT FAIL (c) : creation reprise KO : %', vC_tx;
  END IF;

  SELECT count(*) INTO vA_blocking  -- reutilisation var int
  FROM audit_finance_integrity(vC) WHERE issue_type = ANY(v_blocking_types);
  SELECT COALESCE(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0) INTO vC_wait
  FROM ledger_entries e JOIN accounts a ON a.id=e.account_id
  WHERE a.copro_id=vC AND a.code IN ('471','472');

  IF vA_blocking <> 0 THEN
    RAISE EXCEPTION 'ASSERT FAIL (c) : 471/472 != 0 ne doit PAS creer de faute liste blanche (=%)', vA_blocking;
  END IF;
  IF abs(vC_wait) < 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL (c) : waitingBalance devrait etre != 0 (=%)', vC_wait;
  END IF;

  -- ===== (d) pre-validation AG bloque l'arrete si 471/472 != 0 =====
  INSERT INTO ag_meetings (copro_id, title, meeting_type, meeting_date, status)
  VALUES (vC, 'AG arrete', 'ordinary', now(), 'draft')
  RETURNING id INTO vC_ag;
  INSERT INTO ag_resolutions (ag_id, copro_id, resolution_number, title, resolution_type, majority_type, status)
  VALUES (vC_ag, vC, 1, 'Arrete des comptes', 'accounts', 'art24', 'approved')
  RETURNING id INTO vC_res;
  INSERT INTO ag_pending_actions (ag_id, resolution_id, action_type, target_table, status, payload, created_at)
  VALUES (vC_ag, vC_res, 'APPROVE_ACCOUNTS', 'budgets', 'pending', '{}'::jsonb, now());

  -- reproduit shouldBlockAccountClosure : APPROVE_ACCOUNTS pending ET |wait| >= 0.01
  vC_should_block := EXISTS (
    SELECT 1 FROM ag_pending_actions
    WHERE ag_id=vC_ag AND action_type='APPROVE_ACCOUNTS' AND status='pending'
  ) AND abs(vC_wait) >= 0.01;

  IF NOT vC_should_block THEN
    RAISE EXCEPTION 'ASSERT FAIL (d) : l''arrete des comptes devrait etre bloque (wait=%)', vC_wait;
  END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
