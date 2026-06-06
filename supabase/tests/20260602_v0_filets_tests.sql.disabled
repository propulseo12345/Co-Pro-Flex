-- ============================================================================
-- TESTS V0 — Filets de détection & preview honnête
-- CoProFlex - Vague V0 (PLAN_CORRECTION_VALIDE.md §3.1)
-- Date: 2026-06-02
-- ============================================================================
-- Assertions LECTURE SEULE sur la boucle d'or « Le Clos Saint-Michel »
-- (copro 22222222-aaaa-bbbb-cccc-222222222222, IMMUABLE).
-- Chaque test RAISE EXCEPTION en cas d'échec, RAISE NOTICE 'PASS' sinon.
-- USAGE : exécuter après les migrations 20260602_v0_*.
-- ============================================================================

DO $$
DECLARE
  v_copro   UUID := '22222222-aaaa-bbbb-cccc-222222222222';
  v_budget  UUID := '754df77c-e4c8-48af-802b-c719787c1c0e';
  v_is_unique BOOLEAN;
  v_diff    NUMERIC;
  v_n       INT;
  v_def     TEXT;
BEGIN
  RAISE NOTICE '=== TESTS V0 ===';

  -- 0.1 : index UNIQUE sur ag_pending_actions(ag_id, resolution_id)
  SELECT ix.indisunique INTO v_is_unique
  FROM pg_index ix JOIN pg_class i ON i.oid = ix.indexrelid
  WHERE i.relname = 'ux_ag_pending_actions_ag_resolution';
  IF v_is_unique IS NOT TRUE THEN
    RAISE EXCEPTION 'FAIL 0.1 : index unique ux_ag_pending_actions_ag_resolution absent ou non-unique';
  END IF;
  RAISE NOTICE 'PASS 0.1 : index unique (ag_id, resolution_id) présent';

  -- 0.2 : v_call_vs_budget_mismatch chiffre l'écart +0,16 € (budget - appels = -0,16)
  SELECT difference INTO v_diff
  FROM v_call_vs_budget_mismatch WHERE budget_id = v_budget;
  IF v_diff IS NULL OR round(v_diff, 2) <> -0.16 THEN
    RAISE EXCEPTION 'FAIL 0.2 : écart budget/appels attendu -0.16, obtenu %', v_diff;
  END IF;
  RAISE NOTICE 'PASS 0.2 : v_call_vs_budget_mismatch = -0.16 sur le budget 2026';

  -- 0.5 : v_lot_vs_gl_mismatch — 5 lots en écart, dont le lot 001 à -423,00 (GL - relevé)
  SELECT count(*) INTO v_n FROM v_lot_vs_gl_mismatch WHERE copro_id = v_copro;
  IF v_n <> 5 THEN
    RAISE EXCEPTION 'FAIL 0.5 : 5 lots en écart attendus, obtenu %', v_n;
  END IF;
  SELECT difference INTO v_diff
  FROM v_lot_vs_gl_mismatch WHERE copro_id = v_copro AND lot_ref = '001';
  IF v_diff IS NULL OR round(v_diff, 2) <> -423.00 THEN
    RAISE EXCEPTION 'FAIL 0.5 : écart lot 001 attendu -423.00, obtenu %', v_diff;
  END IF;
  RAISE NOTICE 'PASS 0.5 : v_lot_vs_gl_mismatch = 5 lots, lot 001 = -423.00';

  -- Vue consolidée : porte bien les 2 nouveaux types d'anomalie
  SELECT count(DISTINCT issue_type) INTO v_n
  FROM v_finance_integrity_issues
  WHERE issue_type IN ('CALL_VS_BUDGET_MISMATCH', 'LOT_GL_MISMATCH');
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'FAIL : v_finance_integrity_issues ne porte pas les 2 filets V0 (trouvé % types)', v_n;
  END IF;
  RAISE NOTICE 'PASS : v_finance_integrity_issues expose CALL_VS_BUDGET_MISMATCH + LOT_GL_MISMATCH';

  -- #5 : audit_finance_integrity délègue à la vue (même résultat sur la boucle d'or)
  SELECT count(*) INTO v_n
  FROM audit_finance_integrity(v_copro)
  WHERE issue_type IN ('CALL_VS_BUDGET_MISMATCH', 'LOT_GL_MISMATCH');
  IF v_n <> 6 THEN  -- 1 CALL_VS_BUDGET + 5 LOT_GL sur la boucle d'or
    RAISE EXCEPTION 'FAIL #5 : audit_finance_integrity attendait 6 anomalies V0, obtenu %', v_n;
  END IF;
  RAISE NOTICE 'PASS #5 : audit_finance_integrity délègue à la vue (6 anomalies V0)';

  -- 0.4 : create_alur_fund_from_ag ne référence plus la table inexistante fiscal_periods
  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'create_alur_fund_from_ag';
  IF v_def ILIKE '%fiscal_periods%' THEN
    RAISE EXCEPTION 'FAIL 0.4 : create_alur_fund_from_ag référence encore fiscal_periods';
  END IF;
  IF v_def NOT ILIKE '%accounting_periods%' OR v_def NOT ILIKE '%GET STACKED DIAGNOSTICS%' THEN
    RAISE EXCEPTION 'FAIL 0.4 : create_alur_fund_from_ag non corrigée (accounting_periods / RAISE typé absent)';
  END IF;
  RAISE NOTICE 'PASS 0.4 : create_alur_fund_from_ag pointe accounting_periods + RAISE typé';

  RAISE NOTICE '=== TOUS LES TESTS V0 PASSENT ===';
END $$;
