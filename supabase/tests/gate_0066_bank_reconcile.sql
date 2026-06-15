-- Gate 0066 : rapprochement bancaire — voie d'écriture (import + pointage pur).
-- ============================================================================================
-- Prouve, sur une copro jetable seedée (paiements RÉELS via la boucle d'or) :
--   (1) import_bank_movements INSÈRE des lignes (anti-vacuité) en status 'unmatched' + skippe
--       un doublon bank_ref sans erreur ;
--   (2) reconcile_bank_movement sur un PAIEMENT EXISTANT (target_type='payment') crée 1 match,
--       passe le mouvement en 'matched', ET — PREUVE DU POINTAGE PUR — laisse ledger_entries
--       STRICTEMENT INCHANGÉ (count AVANT == count APRÈS) ;
--   (3) idempotence : re-pointer le même triplet ne crée pas de 2e match ;
--   (4) garde copro : pointer un mouvement avec une cible (paiement) d'une AUTRE copro est rejeté.
-- Contexte service_role posé par le runner. Auto-rollback (ROLLBACK_TEST_OK).
DO $$
DECLARE
  v_copro       uuid;
  v_copro2      uuid;
  v_period      uuid;
  v_acct512     uuid;
  v_pay         uuid;
  v_pay_amt     numeric;
  v_pay2        uuid;  -- paiement d'une AUTRE copro (test garde)
  v_res         jsonb;
  v_imported    int;
  v_skipped     int;
  v_n           int;
  v_le_before   int;
  v_le_after    int;
  v_lt_before   int;
  v_lt_after    int;
  v_mov1        uuid;
  v_status      text;
  v_match1      uuid;
  v_match2      uuid;
  v_movp        uuid;  -- mouvement pour le test de pointage partiel (0070, Option A)
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', false);

  -- Harnais : 2 copros seedées (paiements copro RÉELS via la boucle d'or).
  -- La 2e sert de cible illégitime pour le test de garde anti-IDOR (étape 4).
  v_copro  := create_clean_test_copro_seeded('g66');
  v_copro2 := create_clean_test_copro_seeded('g66-other');

  SELECT id INTO v_period FROM public.accounting_periods WHERE copro_id = v_copro ORDER BY start_date LIMIT 1;
  SELECT id INTO v_acct512 FROM public.accounts WHERE copro_id = v_copro AND code = '512';
  IF v_acct512 IS NULL THEN RAISE EXCEPTION 'ASSERT FAIL : compte 512 absent du seed'; END IF;

  -- Un paiement copropriétaire RÉEL produit par le seed.
  SELECT id, amount INTO v_pay, v_pay_amt
  FROM public.payments WHERE copro_id = v_copro ORDER BY payment_date LIMIT 1;
  IF v_pay IS NULL THEN RAISE EXCEPTION 'ASSERT FAIL : aucun paiement copro dans le seed'; END IF;

  -- ========================================================================================
  -- (1) IMPORT : 2 mouvements (1 avec bank_ref) + anti-vacuité.
  -- ========================================================================================
  v_res := public.import_bank_movements(
    v_copro, v_period, v_acct512,
    jsonb_build_array(
      jsonb_build_object('bank_date', current_date::text, 'amount_signed', v_pay_amt,
                         'label', 'Vir copro', 'bank_ref', 'REF-G66-001'),
      jsonb_build_object('bank_date', current_date::text, 'amount_signed', -120.00,
                         'label', 'Prelevement assurance')
    )
  );
  v_imported := (v_res->>'imported')::int;
  v_skipped  := (v_res->>'skipped')::int;
  IF v_imported <> 2 THEN RAISE EXCEPTION 'ASSERT FAIL (1) : import attendu 2, obtenu %', v_imported; END IF;
  IF v_skipped <> 0 THEN RAISE EXCEPTION 'ASSERT FAIL (1) : skip attendu 0, obtenu %', v_skipped; END IF;

  -- Anti-vacuité : les 2 lignes existent bien, en 'unmatched'.
  SELECT count(*) INTO v_n FROM public.bank_movements
   WHERE copro_id = v_copro AND status = 'unmatched';
  IF v_n <> 2 THEN RAISE EXCEPTION 'ASSERT FAIL (1) : 2 mouvements unmatched attendus, trouvé %', v_n; END IF;

  -- Doublon bank_ref : ré-import de REF-G66-001 -> skip silencieux (pas de 3e ligne).
  v_res := public.import_bank_movements(
    v_copro, v_period, v_acct512,
    jsonb_build_array(jsonb_build_object('bank_date', current_date::text, 'amount_signed', v_pay_amt,
                      'label', 'doublon', 'bank_ref', 'REF-G66-001'))
  );
  IF (v_res->>'imported')::int <> 0 OR (v_res->>'skipped')::int <> 1 THEN
    RAISE EXCEPTION 'ASSERT FAIL (1) : doublon bank_ref non skippé (res=%)', v_res::text; END IF;

  -- Le mouvement à pointer = celui qui correspond au paiement (bank_ref REF-G66-001).
  SELECT id INTO v_mov1 FROM public.bank_movements
   WHERE copro_id = v_copro AND bank_ref = 'REF-G66-001';
  IF v_mov1 IS NULL THEN RAISE EXCEPTION 'ASSERT FAIL (1) : mouvement REF-G66-001 introuvable'; END IF;

  -- ========================================================================================
  -- (2) POINTAGE PUR : reconcile sur un PAIEMENT EXISTANT => ZÉRO écriture grand livre.
  -- ========================================================================================
  SELECT count(*) INTO v_le_before FROM public.ledger_entries e
    JOIN public.accounts a ON a.id = e.account_id WHERE a.copro_id = v_copro;
  SELECT count(*) INTO v_lt_before FROM public.ledger_transactions WHERE copro_id = v_copro;

  v_res := public.reconcile_bank_movement(v_copro, v_mov1, 'payment', v_pay, NULL);
  v_match1 := (v_res->>'match_id')::uuid;
  v_status := v_res->>'movement_status';
  IF v_match1 IS NULL THEN RAISE EXCEPTION 'ASSERT FAIL (2) : match_id NULL'; END IF;
  IF v_status <> 'matched' THEN RAISE EXCEPTION 'ASSERT FAIL (2) : movement_status attendu matched, obtenu %', v_status; END IF;

  -- bank_matches : exactement 1 ligne pour ce mouvement.
  SELECT count(*) INTO v_n FROM public.bank_matches WHERE bank_movement_id = v_mov1;
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL (2) : 1 match attendu, trouvé %', v_n; END IF;

  -- bank_movements.status persisté à 'matched'.
  SELECT status::text INTO v_status FROM public.bank_movements WHERE id = v_mov1;
  IF v_status <> 'matched' THEN RAISE EXCEPTION 'ASSERT FAIL (2) : status DB attendu matched, obtenu %', v_status; END IF;

  -- *** PREUVE DU POINTAGE PUR : le grand livre est STRICTEMENT INCHANGÉ ***
  SELECT count(*) INTO v_le_after FROM public.ledger_entries e
    JOIN public.accounts a ON a.id = e.account_id WHERE a.copro_id = v_copro;
  SELECT count(*) INTO v_lt_after FROM public.ledger_transactions WHERE copro_id = v_copro;
  IF v_le_after <> v_le_before THEN
    RAISE EXCEPTION 'ASSERT FAIL (2) : ledger_entries modifié par le pointage (% -> %) — DOUBLE ENCAISSEMENT',
      v_le_before, v_le_after; END IF;
  IF v_lt_after <> v_lt_before THEN
    RAISE EXCEPTION 'ASSERT FAIL (2) : ledger_transactions modifié par le pointage (% -> %)',
      v_lt_before, v_lt_after; END IF;

  -- ========================================================================================
  -- (3) IDEMPOTENCE : re-pointer le même triplet -> même match, pas de doublon.
  -- ========================================================================================
  v_res := public.reconcile_bank_movement(v_copro, v_mov1, 'payment', v_pay, NULL);
  v_match2 := (v_res->>'match_id')::uuid;
  IF v_match2 IS DISTINCT FROM v_match1 THEN
    RAISE EXCEPTION 'ASSERT FAIL (3) : re-pointage a créé un nouveau match (% <> %)', v_match2, v_match1; END IF;
  SELECT count(*) INTO v_n FROM public.bank_matches WHERE bank_movement_id = v_mov1;
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL (3) : doublon de match (% lignes)', v_n; END IF;

  -- ========================================================================================
  -- (4) GARDE COPRO (anti-IDOR) : cible (paiement) d'une AUTRE copro -> rejet.
  -- ========================================================================================
  -- Paiement RÉEL produit par le seed de la 2e copro = cible illégitime.
  SELECT id INTO v_pay2 FROM public.payments WHERE copro_id = v_copro2 ORDER BY payment_date LIMIT 1;
  IF v_pay2 IS NULL THEN RAISE EXCEPTION 'ASSERT FAIL (4) : aucun paiement dans copro2'; END IF;

  BEGIN
    PERFORM public.reconcile_bank_movement(v_copro, v_mov1, 'payment', v_pay2, NULL);
    RAISE EXCEPTION 'ASSERT FAIL (4) : cible d''une autre copro acceptée (IDOR)';
  EXCEPTION WHEN sqlstate '42501' THEN NULL;  -- rejet attendu
  END;

  -- ========================================================================================
  -- (5) POINTAGE PARTIEL (0070, Option A) : Σ pointé < |montant| -> 'unmatched' ; complément -> 'matched'.
  -- ========================================================================================
  -- Mouvement de 300 ; on pointe 100 (payment) puis 200 (other) -> Σ=300=|montant| -> matched.
  v_res := public.import_bank_movements(
    v_copro, v_period, v_acct512,
    jsonb_build_array(jsonb_build_object('bank_date', current_date::text, 'amount_signed', 300.00,
                      'label', 'Vir partiel', 'bank_ref', 'REF-G66-PART'))
  );
  IF (v_res->>'imported')::int <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL (5) : import mouvement partiel KO (%)', v_res::text; END IF;
  SELECT id INTO v_movp FROM public.bank_movements WHERE copro_id = v_copro AND bank_ref = 'REF-G66-PART';

  -- Partiel 1 : 100 / 300 -> le mouvement DOIT rester 'unmatched'.
  v_res := public.reconcile_bank_movement(v_copro, v_movp, 'payment', v_pay, 100.00);
  IF (v_res->>'movement_status') <> 'unmatched' THEN
    RAISE EXCEPTION 'ASSERT FAIL (5) : pointage partiel (100/300) attendu unmatched, obtenu %', v_res->>'movement_status'; END IF;

  -- Complément : 200 (cible 'other') -> Σ=300 -> 'matched'.
  v_res := public.reconcile_bank_movement(v_copro, v_movp, 'other', NULL, 200.00);
  IF (v_res->>'movement_status') <> 'matched' THEN
    RAISE EXCEPTION 'ASSERT FAIL (5) : complément (Σ=300) attendu matched, obtenu %', v_res->>'movement_status'; END IF;

  -- 2 matches distincts sur ce mouvement (payment + other).
  SELECT count(*) INTO v_n FROM public.bank_matches WHERE bank_movement_id = v_movp;
  IF v_n <> 2 THEN RAISE EXCEPTION 'ASSERT FAIL (5) : 2 matches attendus sur le mouvement partiel, trouvé %', v_n; END IF;

  RAISE NOTICE 'GATE 0066 OK : import=2/skip=1, pointage pur (ledger inchangé %=%/%=%), pointage partiel 100+200/300 -> unmatched puis matched',
    v_le_before, v_le_after, v_lt_before, v_lt_after;
  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
