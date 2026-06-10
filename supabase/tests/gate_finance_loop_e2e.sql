-- GATE E2E — BOUCLE FINANCE CANONIQUE (de bout en bout, chiffrée)
-- ============================================================================================
-- Prouve, sur une copro jetable seedée par la chaîne canonique
-- (create_clean_test_copro_seeded -> validate_budget -> post_budget_call_for_funds ->
-- post_owner_payment x3 + 1 impayé -> post_supplier_invoice + post_supplier_payment ->
-- budget_expense réalisée), que le grand livre est COHÉRENT DE BOUT EN BOUT — pas seulement
-- « audit = 0 », mais que les soldes du GL se réconcilient entre eux et avec les vues métier.
--
-- Toutes les valeurs attendues sont DÉRIVÉES des données (relations), jamais codées en dur :
-- le gate reste vrai même si le seed change ses montants. Auto-rollback (ROLLBACK_TEST_OK).
--
-- Invariants prouvés :
--   1. audit_finance_integrity = 0 ligne (intégrité globale).
--   2. Grand livre équilibré : Σdébit = Σcrédit sur toutes les écritures postées.
--   3. Produit d'appel (701) = total de l'appel émis (income = call).
--   4. Σ lignes d'appel (amount_due) = total_amount de l'en-tête (ventilation exacte).
--   5. Solde 450-1 (créance courante restante) = total des impayés de la vue métier
--      (réconciliation GL ↔ v_unpaid_by_lot, par construction lot-centric).
--   6. Exactement 1 lot impayé (le seed laisse le lot 4 ouvert), montant > 0.
--   7. Banque (512) = Σ encaissements copro − Σ décaissements fournisseurs (réconciliation cash).
--   8. La facture fournisseur est intégralement réglée (status = 'paid').
DO $$
DECLARE
  v_copro        uuid;
  v_audit        int;
  v_call_id      uuid;
  v_call_total   numeric;
  v_lines_sum    numeric;
  v_701          numeric;
  v_gl_balance   numeric;
  v_acc450       uuid;
  v_450net       numeric;
  v_relive_unpaid numeric;
  v_unpaid_lots  int;
  v_future_due   int;
  v_unpaid_total numeric;
  v_512          numeric;
  v_owner_pay    numeric;
  v_supp_pay     numeric;
  v_inv_unpaid   int;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);

  -- Copro jetable : déroule toute la chaîne canonique (invariant seed : audit = 0).
  v_copro := create_clean_test_copro_seeded('e2e-finance-loop');

  -- 1) Intégrité globale : aucune anomalie.
  SELECT count(*) INTO v_audit FROM audit_finance_integrity(v_copro);
  IF v_audit <> 0 THEN
    RAISE EXCEPTION 'ASSERT FAIL (1) : audit_finance_integrity attendu 0, trouvé % anomalie(s)', v_audit;
  END IF;

  -- 2) Grand livre équilibré (partie double) sur toutes les écritures postées.
  SELECT coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END), 0)
    INTO v_gl_balance
  FROM ledger_entries e
  JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted'
  JOIN accounts a ON a.id = e.account_id
  WHERE a.copro_id = v_copro;
  IF abs(v_gl_balance) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL (2) : grand livre déséquilibré, Σ(débit−crédit) = % (attendu 0)', v_gl_balance;
  END IF;

  -- Appel agrégé émis (unique appel courant du seed).
  SELECT id, total_amount INTO v_call_id, v_call_total
  FROM call_for_funds
  WHERE copro_id = v_copro AND status <> 'cancelled'
  ORDER BY created_at LIMIT 1;
  IF v_call_id IS NULL THEN
    RAISE EXCEPTION 'ASSERT FAIL : aucun appel de fonds émis par le seed';
  END IF;

  -- 4) Ventilation exacte : Σ lignes = total en-tête (au centime).
  SELECT coalesce(sum(amount_due), 0) INTO v_lines_sum
  FROM call_for_funds_lines WHERE call_id = v_call_id;
  IF abs(v_lines_sum - v_call_total) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL (4) : Σ lignes (%) ≠ total appel (%)', v_lines_sum, v_call_total;
  END IF;

  -- 3) Produit d'appel 701 (crédit) = total appelé.
  SELECT coalesce(sum(CASE WHEN e.direction='credit' THEN e.amount ELSE -e.amount END), 0)
    INTO v_701
  FROM ledger_entries e
  JOIN accounts a ON a.id = e.account_id
  JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted'
  WHERE a.copro_id = v_copro AND a.code = '701'
    AND t.source_type = 'call_for_funds' AND t.source_id = v_call_id;
  IF abs(v_701 - v_call_total) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL (3) : produit 701 (%) ≠ total appel (%)', v_701, v_call_total;
  END IF;

  -- 5) Réconciliation GL ↔ RELEVÉ (date-indépendante) : solde 450-1 restant = Σ (dû − payé) des
  --    lignes d'appel courantes. On compare le grand livre au relevé LUI-MÊME, et NON à la vue
  --    impayés (qui filtre due_date < today → l'assertion deviendrait fragile selon la date du run).
  v_acc450 := resolve_lot_tiers_account(v_copro, 'current');
  SELECT coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END), 0)
    INTO v_450net
  FROM ledger_entries e
  JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted'
  WHERE e.account_id = v_acc450;

  SELECT coalesce(sum(cfl.amount_due - cfl.amount_paid), 0)
    INTO v_relive_unpaid
  FROM call_for_funds_lines cfl
  JOIN call_for_funds cf ON cf.id = cfl.call_id
  WHERE cfl.copro_id = v_copro AND cf.status <> 'cancelled';

  IF abs(v_450net - v_relive_unpaid) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL (5) : solde 450-1 GL (%) ≠ relevé restant (%)', v_450net, v_relive_unpaid;
  END IF;

  -- 6) Exactement 1 lot avec un reste dû (le seed laisse le lot 4 impayé). Date-indépendant.
  SELECT count(*) INTO v_unpaid_lots FROM (
    SELECT cfl.lot_id
    FROM call_for_funds_lines cfl
    JOIN call_for_funds cf ON cf.id = cfl.call_id
    WHERE cfl.copro_id = v_copro AND cf.status <> 'cancelled'
    GROUP BY cfl.lot_id
    HAVING sum(cfl.amount_due - cfl.amount_paid) > 0.01
  ) q;
  IF v_unpaid_lots <> 1 THEN
    RAISE EXCEPTION 'ASSERT FAIL (6) : attendu 1 lot avec reste dû, trouvé %', v_unpaid_lots;
  END IF;
  IF v_relive_unpaid <= 0 THEN
    RAISE EXCEPTION 'ASSERT FAIL (6) : reste dû total devrait être > 0, trouvé %', v_relive_unpaid;
  END IF;

  -- 5b) Cohérence de la vue impayés (date-indépendante) : elle ne doit JAMAIS exposer une échéance
  --     future — son filtre due_date < today doit tenir (attrape un drift du filtre).
  SELECT count(*) INTO v_future_due
  FROM v_unpaid_by_lot WHERE copro_id = v_copro AND oldest_due_date >= current_date;
  IF v_future_due <> 0 THEN
    RAISE EXCEPTION 'ASSERT FAIL (5b) : v_unpaid_by_lot expose % échéance(s) future(s) (filtre due_date cassé)', v_future_due;
  END IF;

  -- 5c) Quand la vue remonte des impayés ÉCHUS, leur total doit égaler le relevé restant
  --     (prouve la cohérence vue ↔ relevé là où elle s'applique ; non vacant car l'appel est échu).
  SELECT coalesce(sum(total_unpaid), 0) INTO v_unpaid_total
  FROM v_unpaid_by_lot WHERE copro_id = v_copro;
  IF v_unpaid_total > 0.01 AND abs(v_unpaid_total - v_relive_unpaid) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL (5c) : vue impayés échus (%) ≠ relevé restant (%)', v_unpaid_total, v_relive_unpaid;
  END IF;

  -- 7) Réconciliation cash : 512 = Σ encaissements copro − Σ décaissements fournisseurs.
  SELECT coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END), 0)
    INTO v_512
  FROM ledger_entries e
  JOIN accounts a ON a.id = e.account_id
  JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted'
  WHERE a.copro_id = v_copro AND a.code = '512';

  SELECT coalesce(sum(amount), 0) INTO v_owner_pay FROM payments WHERE copro_id = v_copro;
  SELECT coalesce(sum(amount), 0) INTO v_supp_pay  FROM supplier_payments WHERE copro_id = v_copro;

  IF abs(v_512 - (v_owner_pay - v_supp_pay)) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL (7) : banque 512 (%) ≠ encaissements (%) − décaissements (%)',
      v_512, v_owner_pay, v_supp_pay;
  END IF;

  -- 8) Facture fournisseur intégralement réglée.
  SELECT count(*) INTO v_inv_unpaid
  FROM supplier_invoices
  WHERE copro_id = v_copro AND status <> 'paid';
  IF v_inv_unpaid <> 0 THEN
    RAISE EXCEPTION 'ASSERT FAIL (8) : % facture(s) fournisseur non réglée(s) (attendu 0)', v_inv_unpaid;
  END IF;

  RAISE NOTICE 'GATE E2E OK : audit=0, GL équilibré, 701=appel=%, 450-1=relevé restant=%, 512=%, facture réglée',
    v_call_total, v_relive_unpaid, v_512;
  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
