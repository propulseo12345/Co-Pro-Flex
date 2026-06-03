-- Acceptation socle reprise (Plan A) — joué via execute_sql (archive, non branché à la chaîne).
-- Step 1 : copro propre fraîchement seedée doit présenter 0 anomalie d'intégrité et 0 attente (471/472).
-- Step 2 : non-régression boucle d'or 22222222 (même nombre d'anomalies G3 qu'avant le plan).

-- Step 1 — Acceptation copro propre = 0 écart
DO $$
DECLARE v jsonb; v_copro uuid; v_issues int; v_wait numeric;
BEGIN
  v := create_clean_test_copro_seeded('socle-acc', 15000, 2);
  v_copro := (v->>'copro_id')::uuid;
  SELECT count(*) INTO v_issues FROM audit_finance_integrity(v_copro);
  SELECT COALESCE(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0) INTO v_wait
  FROM ledger_entries e JOIN accounts a ON a.id=e.account_id
  WHERE a.copro_id=v_copro AND a.code IN ('471','472');
  RAISE EXCEPTION 'PROOF issues=% wait=%', v_issues, v_wait;
END $$;

-- Step 2 — Non-régression boucle d'or 22222222 (attendu : même nombre qu'avant le plan = 12, cadre G3)
SELECT count(*) AS ecarts_attendus_g3
FROM audit_finance_integrity('22222222-aaaa-bbbb-cccc-222222222222');
