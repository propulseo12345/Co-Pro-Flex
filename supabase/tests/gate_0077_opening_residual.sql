-- GATE E2E — 0077 / F8 Brique 1 : traçabilité résidu 471/472 (hors-GL, stale, IDOR)
-- ============================================================================================
-- Prouve : détail signé == résidu (balanced) ; détail ≠ résidu -> warning ; IDOR (période d'une autre
--   copro rejetée) ; re-saisie de la reprise -> détail marqué STALE ; NON-POLLUTION GL (count inchangé).
-- Auto-rollback (ROLLBACK_TEST_OK). Contexte service_role préfixé par db-test.mjs.
DO $$
DECLARE
  v_copro uuid; v_n uuid; v_copro2 uuid; v_n2 uuid; r jsonb;
  v_gl_before int; v_gl_after int; ok boolean;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);

  v_copro := create_clean_test_copro_seeded('0077-residual');
  SELECT id INTO v_n FROM accounting_periods WHERE copro_id=v_copro AND status='open' ORDER BY start_date DESC LIMIT 1;

  -- Crée un résidu : reprise déséquilibrée (512 débiteur 1000) -> complément 472 créditeur 1000 -> résidu GL = -1000.
  PERFORM set_opening_balance(v_copro, v_n, current_date, jsonb_build_array(jsonb_build_object('account_code','512','amount',1000)));
  r := get_opening_balance_residual_detail(v_copro, v_n);
  IF (r->>'residual_gl')::numeric <> -1000 THEN RAISE EXCEPTION 'setup : résidu GL attendu -1000, trouvé %', r->>'residual_gl'; END IF;

  -- (1) Détail équilibré (un poste crédit 1000 -> signed -1000 == résidu).
  SELECT count(*) INTO v_gl_before FROM ledger_transactions WHERE copro_id=v_copro;
  r := set_opening_balance_residual_detail(v_copro, v_n,
        jsonb_build_array(jsonb_build_object('label','Dette fournisseur reprise','amount',1000,'direction','credit')));
  IF NOT (r->>'balanced')::boolean THEN RAISE EXCEPTION '(1) détail non équilibré : %', r; END IF;
  -- NON-POLLUTION GL.
  SELECT count(*) INTO v_gl_after FROM ledger_transactions WHERE copro_id=v_copro;
  IF v_gl_after <> v_gl_before THEN RAISE EXCEPTION '(1) le détail a touché le GL (% -> %)', v_gl_before, v_gl_after; END IF;

  -- (2) Détail ≠ résidu -> warning + balanced false.
  r := set_opening_balance_residual_detail(v_copro, v_n,
        jsonb_build_array(jsonb_build_object('label','Partiel','amount',300,'direction','credit')));
  IF (r->>'warning') IS NULL OR (r->>'balanced')::boolean THEN RAISE EXCEPTION '(2) warning attendu pour un détail incomplet : %', r; END IF;

  -- (3) IDOR : période d'une AUTRE copro -> rejet.
  v_copro2 := create_clean_test_copro_seeded('0077-other');
  SELECT id INTO v_n2 FROM accounting_periods WHERE copro_id=v_copro2 AND status='open' ORDER BY start_date DESC LIMIT 1;
  ok := false;
  BEGIN
    PERFORM set_opening_balance_residual_detail(v_copro, v_n2, '[]'::jsonb);
  EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE '%appartient pas%' THEN ok := true; ELSE RAISE; END IF; END;
  IF NOT ok THEN RAISE EXCEPTION '(3) IDOR : période d''une autre copro acceptée'; END IF;

  -- (4) STALE : sauver un détail, puis re-saisir la reprise (résidu change) -> get stale=true.
  PERFORM set_opening_balance_residual_detail(v_copro, v_n,
        jsonb_build_array(jsonb_build_object('label','Dette','amount',1000,'direction','credit')));
  PERFORM set_opening_balance(v_copro, v_n, current_date, jsonb_build_array(jsonb_build_object('account_code','512','amount',1500)));
  r := get_opening_balance_residual_detail(v_copro, v_n);
  IF NOT (r->>'stale')::boolean THEN RAISE EXCEPTION '(4) le détail n''est pas marqué stale après changement du résidu (%)', r; END IF;

  RAISE NOTICE 'GATE 0077 OK : détail équilibré + warning si incomplet + IDOR période bloqué + flag stale + non-pollution GL';
  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
