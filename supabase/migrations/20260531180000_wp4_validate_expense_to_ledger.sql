-- ============================================================================
-- WP4 — Valider une dépense (budget_expenses) écrit au grand livre
-- ============================================================================
-- Les dépenses du module budget vivaient dans leur table sans jamais générer
-- d'écriture comptable -> "consommé" (budget) ≠ "réalisé" (grand livre).
-- Décision (2026-05-31) : valider une dépense = la comptabiliser.
--   Débit 6xx (compte de charge de la ligne de budget) / Crédit 401 (fournisseur).
-- Idempotent (ledger_tx_id), et seulement si la période est OUVERTE.
-- ============================================================================

ALTER TABLE public.budget_expenses ADD COLUMN IF NOT EXISTS ledger_tx_id uuid;

ALTER TABLE public.ledger_transactions DROP CONSTRAINT IF EXISTS ledger_transactions_source_type_check;
ALTER TABLE public.ledger_transactions ADD CONSTRAINT ledger_transactions_source_type_check
  CHECK (
    source_type IS NULL OR source_type = ANY (ARRAY[
      'budget', 'budget_expense', 'call_for_funds', 'payment', 'supplier_invoice', 'supplier_payment',
      'bank_movement', 'transfer', 'od', 'opening', 'closing', 'manual'
    ])
  );

CREATE OR REPLACE FUNCTION public.validate_budget_expense(p_expense_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_exp RECORD;
  v_acct_charge uuid;
  v_acct_401 uuid;
  v_period RECORD;
  v_ltx jsonb;
  v_tx_id uuid := NULL;
BEGIN
  SELECT * INTO v_exp FROM budget_expenses WHERE id = p_expense_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Dépense introuvable');
  END IF;

  -- Validation (idempotent sur le statut)
  UPDATE budget_expenses SET status = 'validated', validated_at = now()
  WHERE id = p_expense_id AND status <> 'validated';

  -- Déjà comptabilisée -> ne pas reposter (idempotence)
  IF v_exp.ledger_tx_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'ledger_tx_id', v_exp.ledger_tx_id, 'note', 'déjà comptabilisée');
  END IF;

  -- Compte de charge (6xx) depuis la ligne de budget
  SELECT bl.account_id INTO v_acct_charge FROM budget_lines bl WHERE bl.id = v_exp.budget_line_id;

  -- Période du budget
  SELECT ap.* INTO v_period
  FROM budgets b JOIN accounting_periods ap ON ap.id = b.period_id
  WHERE b.id = v_exp.budget_id;

  -- On ne comptabilise que si compte connu, montant positif et période OUVERTE
  IF v_acct_charge IS NOT NULL AND COALESCE(v_exp.amount, 0) > 0 AND v_period.status = 'open' THEN
    SELECT id INTO v_acct_401 FROM accounts WHERE copro_id = v_exp.copro_id AND code = '401';
    IF v_acct_401 IS NULL THEN
      RAISE EXCEPTION 'validate_budget_expense: compte 401 introuvable pour la copro %', v_exp.copro_id;
    END IF;

    v_ltx := create_ledger_transaction(
      v_exp.copro_id, v_period.id, v_exp.tx_date,
      'Dépense : ' || v_exp.label, 'budget_expense', v_exp.id,
      jsonb_build_array(
        jsonb_build_object('account_id', v_acct_charge, 'direction', 'debit',  'amount', v_exp.amount, 'entry_label', v_exp.label),
        jsonb_build_object('account_id', v_acct_401,    'direction', 'credit', 'amount', v_exp.amount, 'entry_label', 'Dette fournisseur : ' || COALESCE(v_exp.fournisseur, v_exp.label))
      ),
      true
    );
    IF NOT (v_ltx->>'success')::boolean THEN
      RAISE EXCEPTION 'validate_budget_expense: échec écriture grand livre : %', v_ltx->>'error';
    END IF;
    v_tx_id := (v_ltx->>'tx_id')::uuid;
    UPDATE budget_expenses SET ledger_tx_id = v_tx_id WHERE id = p_expense_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'ledger_tx_id', v_tx_id,
    'posted', v_tx_id IS NOT NULL,
    'period_status', v_period.status
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.validate_budget_expense(uuid) TO authenticated, service_role;
