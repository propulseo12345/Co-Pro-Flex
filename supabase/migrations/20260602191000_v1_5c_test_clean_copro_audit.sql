-- ============================================================
-- V1.5-C (B2) — Test d'acceptation SQL (auto-rollback)
-- ============================================================
-- But : prouver qu'une copropriété née du chemin canonique
-- (create_clean_test_copro_seeded) a un grand livre cohérent :
--   1) audit_finance_integrity renvoie 0 ligne (aucun écart d'intégrité),
--   2) le solde net des comptes d'attente 471/472 est nul (rien en suspens).
--
-- Ce fichier n'est PAS une vraie migration de schéma : c'est un test
-- reproductible. Il crée une copro de test, vérifie les invariants, puis
-- déclenche volontairement une exception 'ROLLBACK_TEST_OK' afin que TOUT
-- soit annulé (rollback) — la base reste donc inchangée après exécution.
--
-- Attendu en sortie :
--   NOTICE  ACCEPTANCE OK : ...
--   NOTICE  Test terminé (rollback).
-- En cas d'écart : exception 'ACCEPTANCE FAIL ...' (non avalée) → à investiguer.

DO $$
DECLARE
  v_res     jsonb;
  v_copro   uuid;
  v_issues  int;
  v_wait    numeric;
BEGIN
  v_res := create_clean_test_copro_seeded('acceptance', 15000, 2);
  v_copro := (v_res->>'copro_id')::uuid;

  SELECT count(*) INTO v_issues FROM audit_finance_integrity(v_copro);

  SELECT COALESCE(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0)
    INTO v_wait
  FROM ledger_entries e JOIN accounts a ON a.id = e.account_id
  WHERE a.copro_id = v_copro AND a.code IN ('471','472');

  IF v_issues <> 0 THEN
    RAISE EXCEPTION 'ACCEPTANCE FAIL : % écart(s) d''intégrité sur la copro propre %', v_issues, v_copro;
  END IF;
  IF abs(v_wait) >= 0.01 THEN
    RAISE EXCEPTION 'ACCEPTANCE FAIL : compte d''attente 471/472 = % (attendu 0)', v_wait;
  END IF;

  RAISE NOTICE 'ACCEPTANCE OK : copro propre % — 0 écart, attente=0.', v_copro;
  RAISE EXCEPTION 'ROLLBACK_TEST_OK';  -- rollback volontaire (test non destructif)
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM = 'ROLLBACK_TEST_OK' THEN
      RAISE NOTICE 'Test terminé (rollback).';
    ELSE
      RAISE;
    END IF;
END $$;
