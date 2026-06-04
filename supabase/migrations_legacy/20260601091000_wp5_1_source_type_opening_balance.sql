-- ============================================================================
-- WP5.1 — Ajoute 'opening_balance' aux source_type autorisés du grand livre
-- ============================================================================
-- 'opening_balance' = écriture de reprise des soldes (à-nouveau) régénérable
-- produite par open_next_period. Distinct de 'opening' (soldes d'ouverture
-- initiaux / seed, immuables). On reprend la liste live À L'IDENTIQUE (12
-- valeurs, incluant budget_expense) + opening_balance.
-- ============================================================================
ALTER TABLE public.ledger_transactions
  DROP CONSTRAINT IF EXISTS ledger_transactions_source_type_check;

ALTER TABLE public.ledger_transactions
  ADD CONSTRAINT ledger_transactions_source_type_check
  CHECK (
    source_type IS NULL OR source_type = ANY (ARRAY[
      'budget', 'budget_expense', 'call_for_funds', 'payment',
      'supplier_invoice', 'supplier_payment', 'bank_movement',
      'transfer', 'od', 'opening', 'closing', 'manual', 'opening_balance'
    ])
  );
