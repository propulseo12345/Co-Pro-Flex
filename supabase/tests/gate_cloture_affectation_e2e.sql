-- GATE E2E — CYCLE DE CLÔTURE / À-NOUVEAU / AFFECTATION DU RÉSULTAT (haut de la boucle)
-- ============================================================================================
-- Prouve le cycle d'exercice que le seed « boucle d'or » exclut VOLONTAIREMENT (incompatible avec
-- la gate per-lot car v_owner_statement_by_lot agrège toutes les périodes, cf. en-tête 0029) :
--   close_period(N) -> open_next_period(N→N+1) -> regularize_period (affectation 110/120 → 450 par
--   quote-part). Ce gate N'UTILISE PAS audit_finance_integrity (son check LOT_GL_MISMATCH cross-période
--   remonterait par construction après report d'à-nouveau) : il s'appuie sur le garde-fou DÉDIÉ
--   v_result_allocation_split (0 ligne = conforme) + des réconciliations ciblées et date-indépendantes.
--
-- Invariants prouvés :
--   1. close_period : l'exercice N passe à 'closed'.
--   2. open_next_period : N+1 créé et 'open' ; report du résultat courant en 120 ; report du bilan.
--   3. À-NOUVEAU : solde 120 de N+1 = −résultat courant de N (excédent → C120) ; banque 512 reportée
--      à l'identique (réconciliation du report de bilan, date-indépendante).
--   4. N+1 équilibré (Σdébit = Σcrédit) après à-nouveau ET après affectation.
--   5. regularize_period réussit : il appelle assert_result_allocation_split EN INTERNE (rollback si
--      l'invariant 110/120 est violé) — sa réussite est déjà une preuve forte.
--   6. Après affectation : solde 120 de N+1 = 0 (résultat entièrement déversé).
--   7. Garde-fou explicite : v_result_allocation_split = 0 ligne pour (copro, N+1).
--   8. Affectation par QUOTE-PART : le résultat est crédité en 450-1 sur TOUS les lots (avec lot_id),
--      Σ = résultat affecté.
--   9. approve_period : l'exercice N passe à 'approved' (le cycle se referme, immutabilité figée).
--
-- LIMITE DE COUVERTURE : ce seed ne génère QUE du résultat COURANT (classes 6/7 courantes) → la
--   branche TRAVAUX (résultat 110 / affectation 450-2) n'est PAS exercée ici. Pour la couvrir, il
--   faudra un seed avec des comptes travaux/exceptionnels (671/672/.../702/705/706). assert_result_
--   allocation_split la contrôlerait alors automatiquement.
DO $$
DECLARE
  v_copro          uuid;
  v_n              uuid;
  v_np             uuid;
  v_open           jsonb;
  v_reg            jsonb;
  v_result_courant numeric;
  v_120_apres_an   numeric;
  v_120_apres_aff  numeric;
  v_512_n          numeric;
  v_512_np         numeric;
  v_np_balance     numeric;
  v_violations     int;
  v_alloc_lots     int;
  v_alloc_450      numeric;
  v_nb_lots        int;
  v_n_status       text;
  v_alloc_tx_count int;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);

  -- Copro seedée (exercice N vivant conforme) + nombre de lots (assiette de la quote-part).
  v_copro := create_clean_test_copro_seeded('e2e-cloture-affectation');
  SELECT id INTO v_n FROM accounting_periods WHERE copro_id = v_copro AND status = 'open' ORDER BY start_date DESC LIMIT 1;
  SELECT count(*) INTO v_nb_lots FROM lots WHERE copro_id = v_copro;

  -- Banque (512) en fin de N — pour vérifier le report d'à-nouveau ensuite.
  SELECT coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END), 0) INTO v_512_n
  FROM ledger_entries e JOIN accounts a ON a.id = e.account_id
  JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted'
  WHERE a.copro_id = v_copro AND a.code = '512' AND e.period_id = v_n;

  -- 1) Clôture de N.
  PERFORM close_period(v_n);
  SELECT status::text INTO v_n_status FROM accounting_periods WHERE id = v_n;
  IF v_n_status <> 'closed' THEN
    RAISE EXCEPTION 'ASSERT FAIL (1) : N attendu closed, trouvé %', v_n_status;
  END IF;

  -- 2) Ouverture de N+1 (report à-nouveau + résultat ventilé 110/120).
  v_open := open_next_period(v_copro, v_n, NULL, NULL, NULL);
  IF NOT (v_open->>'success')::boolean THEN
    RAISE EXCEPTION 'ASSERT FAIL (2) : open_next_period KO : %', v_open;
  END IF;
  v_np := (v_open->>'next_period_id')::uuid;
  v_result_courant := (v_open->>'result_courant')::numeric;
  IF v_np IS NULL OR (SELECT status FROM accounting_periods WHERE id = v_np) <> 'open' THEN
    RAISE EXCEPTION 'ASSERT FAIL (2) : N+1 absent ou non ouvert';
  END IF;

  -- Non-vacuité : ce seed DOIT produire un résultat non nul (sinon les asserts de signe sur 120
  -- trivialiseraient à 0=0). Le seed « boucle d'or » génère un excédent courant.
  IF v_result_courant = 0 THEN
    RAISE EXCEPTION 'ASSERT FAIL (3-pre) : résultat courant nul — le seed ne produit pas d''excédent/déficit, le test ne prouverait rien';
  END IF;

  -- 3) À-NOUVEAU : 120 de N+1 = −résultat courant (excédent → C120) ; banque reportée à l'identique.
  SELECT coalesce(sum(CASE WHEN e.direction='credit' THEN e.amount ELSE -e.amount END), 0) INTO v_120_apres_an
  FROM ledger_entries e JOIN accounts a ON a.id = e.account_id
  JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted'
  WHERE a.copro_id = v_copro AND a.code = '120' AND e.period_id = v_np;
  IF abs(v_120_apres_an + v_result_courant) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL (3) : 120 N+1 (%) ≠ −résultat courant (% )', v_120_apres_an, -v_result_courant;
  END IF;

  SELECT coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END), 0) INTO v_512_np
  FROM ledger_entries e JOIN accounts a ON a.id = e.account_id
  JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted'
  WHERE a.copro_id = v_copro AND a.code = '512' AND e.period_id = v_np;
  IF abs(v_512_np - v_512_n) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL (3) : banque non reportée — 512 fin N (%) ≠ à-nouveau N+1 (%)', v_512_n, v_512_np;
  END IF;

  -- 4a) N+1 équilibré après à-nouveau.
  SELECT coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END), 0) INTO v_np_balance
  FROM ledger_entries e JOIN accounts a ON a.id = e.account_id
  JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted'
  WHERE a.copro_id = v_copro AND e.period_id = v_np;
  IF abs(v_np_balance) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL (4a) : N+1 déséquilibré après à-nouveau, Σ(débit−crédit)=%', v_np_balance;
  END IF;

  -- 5) Affectation du résultat (regularize_period appelle assert_result_allocation_split en interne).
  v_reg := regularize_period(v_copro, v_n);
  IF NOT (v_reg->>'success')::boolean THEN
    RAISE EXCEPTION 'ASSERT FAIL (5) : regularize_period KO : %', v_reg;
  END IF;

  -- 6) 120 de N+1 entièrement déversé.
  SELECT coalesce(sum(CASE WHEN e.direction='credit' THEN e.amount ELSE -e.amount END), 0) INTO v_120_apres_aff
  FROM ledger_entries e JOIN accounts a ON a.id = e.account_id
  JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted'
  WHERE a.copro_id = v_copro AND a.code = '120' AND e.period_id = v_np;
  IF abs(v_120_apres_aff) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL (6) : 120 N+1 non soldé après affectation, solde=%', v_120_apres_aff;
  END IF;

  -- 4b) N+1 toujours équilibré après affectation.
  SELECT coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END), 0) INTO v_np_balance
  FROM ledger_entries e JOIN accounts a ON a.id = e.account_id
  JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted'
  WHERE a.copro_id = v_copro AND e.period_id = v_np;
  IF abs(v_np_balance) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL (4b) : N+1 déséquilibré après affectation, Σ(débit−crédit)=%', v_np_balance;
  END IF;

  -- 7-pre) Anti-vacuité : v_result_allocation_split ne liste QUE les écritures fautives → « 0 ligne »
  --   serait vrai aussi si regularize n'avait RIEN posté. On prouve d'abord qu'une écriture
  --   result_allocation existe bien en N+1, avant de conclure « conforme ».
  SELECT count(*) INTO v_alloc_tx_count
  FROM ledger_transactions
  WHERE copro_id = v_copro AND source_type = 'result_allocation' AND period_id = v_np;
  IF v_alloc_tx_count = 0 THEN
    RAISE EXCEPTION 'ASSERT FAIL (7-pre) : aucune écriture result_allocation en N+1 — regularize n''a rien affecté';
  END IF;

  -- 7) Garde-fou dédié : aucune écriture d'affectation non conforme à l'invariant 110/120.
  SELECT count(*) INTO v_violations
  FROM v_result_allocation_split WHERE copro_id = v_copro AND period_id = v_np;
  IF v_violations <> 0 THEN
    RAISE EXCEPTION 'ASSERT FAIL (7) : v_result_allocation_split remonte % violation(s) de l''invariant 110/120', v_violations;
  END IF;

  -- 8) Affectation par QUOTE-PART : 450-1 crédité sur TOUS les lots, Σ = résultat affecté.
  --   NB : suppose que la clé générale couvre tous les lots avec un poids > 0 (vrai pour ce seed) ;
  --   un lot à poids 0 ne recevrait pas d'écriture → faux positif attendu si le seed évolue.
  SELECT count(DISTINCT e.lot_id),
         coalesce(sum(CASE WHEN e.direction='credit' THEN e.amount ELSE -e.amount END), 0)
    INTO v_alloc_lots, v_alloc_450
  FROM ledger_entries e JOIN accounts a ON a.id = e.account_id
  JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted' AND t.source_type = 'result_allocation'
  WHERE a.copro_id = v_copro AND a.code = '450-1' AND e.period_id = v_np;
  IF v_alloc_lots <> v_nb_lots THEN
    RAISE EXCEPTION 'ASSERT FAIL (8) : affectation 450-1 sur % lot(s), attendu % (tous les lots)', v_alloc_lots, v_nb_lots;
  END IF;
  IF abs(v_alloc_450 + v_result_courant) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL (8) : Σ affectation 450-1 (%) ≠ résultat à affecter (%)', v_alloc_450, -v_result_courant;
  END IF;

  -- 9) Clôture définitive : approbation de N.
  PERFORM approve_period(v_n);
  SELECT status::text INTO v_n_status FROM accounting_periods WHERE id = v_n;
  IF v_n_status <> 'approved' THEN
    RAISE EXCEPTION 'ASSERT FAIL (9) : N attendu approved, trouvé %', v_n_status;
  END IF;

  RAISE NOTICE 'GATE CLÔTURE OK : N closed→approved, à-nouveau équilibré, excédent % affecté à % lots, 120 soldé, invariant 110/120 conforme',
    -v_result_courant, v_alloc_lots;
  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
