-- ============================================================================
-- WP5.1 — Unicité de la reprise à-nouveau par exercice source
-- ============================================================================
-- Au plus UNE transaction opening_balance par (copro, période source).
-- Index partiel : ne contraint que les reprises, n'impacte pas les autres tx.
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_tx_opening_balance
  ON public.ledger_transactions (copro_id, source_id)
  WHERE source_type = 'opening_balance';
