-- ============================================================================
-- Gate T1 — Onboarding : encaissement VIREMENT prouvé de bout en bout.
-- ----------------------------------------------------------------------------
-- Prouve, sur une copro « boucle d'or » jetable, que :
--   1. l'intégrité financière est saine au départ (0 anomalie bloquante) ;
--   2. un encaissement au mode VIREMENT (enum 'transfer') passe et débite le 512 ;
--   3. l'intégrité reste saine après encaissement ;
--   4. garde anti-régression : la valeur morte 'bank_transfer' est bien rejetée
--      par l'enum payment_method (le bug du blocker T1 ne peut pas revenir).
--
-- AUTO-ROLLBACK : le bloc lève ROLLBACK_TEST_OK en fin de parcours -> Postgres
--   annule toutes les écritures du test (savepoint du bloc EXCEPTION), puis le
--   handler transforme l'exception en NOTICE. Aucune donnée ne persiste.
-- Nécessite le contexte service_role (posé en tête) pour le harnais de test.
-- ============================================================================
DO $$
DECLARE
  v_copro uuid; v_period uuid; v_lot uuid;
  v_res jsonb; v_blocking int; v_512_before numeric; v_512_after numeric; v_bad boolean;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);

  -- 1) Copro boucle d'or jetable (budget validé + appel émis + impayé).
  v_copro := create_clean_test_copro_seeded('gate-t1');
  SELECT id INTO v_period FROM accounting_periods
    WHERE copro_id = v_copro AND status = 'open' ORDER BY start_date DESC LIMIT 1;

  -- Invariant de départ : aucune anomalie bloquante.
  SELECT count(*) INTO v_blocking FROM audit_finance_integrity(v_copro)
    WHERE issue_type IN ('LEDGER_UNBALANCED', 'LOT_ID_MISSING_45X', 'LOT_GL_MISMATCH', 'CALL_TOTAL_MISMATCH');
  IF v_blocking <> 0 THEN
    RAISE EXCEPTION 'GATE FAIL: % anomalie(s) bloquante(s) au depart', v_blocking;
  END IF;

  -- 2) Un lot avec créance impayée + solde banque 512 avant encaissement.
  SELECT lot_id INTO v_lot FROM v_unpaid_by_lot
    WHERE copro_id = v_copro AND total_unpaid > 0 LIMIT 1;
  IF v_lot IS NULL THEN
    RAISE EXCEPTION 'GATE FAIL: aucun lot impaye dans la boucle d or';
  END IF;

  SELECT coalesce(sum(CASE WHEN e.direction = 'debit' THEN e.amount ELSE -e.amount END), 0)
    INTO v_512_before
    FROM ledger_entries e
    JOIN accounts a ON a.id = e.account_id
    JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted'
    WHERE a.copro_id = v_copro AND a.code LIKE '512%';

  -- Encaissement VIREMENT (enum 'transfer') : doit réussir.
  v_res := post_owner_payment(
    v_copro, v_period, v_lot, 100, CURRENT_DATE,
    'transfer', 'Gate T1 virement', NULL, gen_random_uuid()::text);
  IF v_res IS NULL THEN
    RAISE EXCEPTION 'GATE FAIL: post_owner_payment a renvoye NULL';
  END IF;

  -- 3) Le 512 (banque) est débité de 100 ; l'intégrité reste saine.
  SELECT coalesce(sum(CASE WHEN e.direction = 'debit' THEN e.amount ELSE -e.amount END), 0)
    INTO v_512_after
    FROM ledger_entries e
    JOIN accounts a ON a.id = e.account_id
    JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted'
    WHERE a.copro_id = v_copro AND a.code LIKE '512%';
  IF abs((v_512_after - v_512_before) - 100) > 0.01 THEN
    RAISE EXCEPTION 'GATE FAIL: 512 attendu +100, trouve %', v_512_after - v_512_before;
  END IF;

  SELECT count(*) INTO v_blocking FROM audit_finance_integrity(v_copro)
    WHERE issue_type IN ('LEDGER_UNBALANCED', 'LOT_ID_MISSING_45X', 'LOT_GL_MISMATCH', 'CALL_TOTAL_MISMATCH');
  IF v_blocking <> 0 THEN
    RAISE EXCEPTION 'GATE FAIL: % anomalie(s) bloquante(s) apres encaissement', v_blocking;
  END IF;

  -- 4) Garde anti-régression : 'bank_transfer' (valeur morte) doit être rejetée.
  v_bad := false;
  BEGIN
    PERFORM 'bank_transfer'::payment_method;
    v_bad := true;
  EXCEPTION WHEN others THEN
    v_bad := false;
  END;
  IF v_bad THEN
    RAISE EXCEPTION 'GATE FAIL: bank_transfer ne devrait pas exister dans payment_method';
  END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN
    RAISE NOTICE 'GATE T1 OK';
  ELSE
    RAISE;
  END IF;
END $$;
