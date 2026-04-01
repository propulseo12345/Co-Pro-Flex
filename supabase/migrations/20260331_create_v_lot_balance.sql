-- ============================================================================
-- v_lot_balance : vue calculant le solde de chaque lot à partir du grand livre
-- Débit = le lot doit de l'argent (ex: appel de fonds émis)
-- Crédit = le lot a payé
-- Solde positif = impayé, négatif = avoir
-- ============================================================================

CREATE OR REPLACE VIEW v_lot_balance AS
SELECT
  le.lot_id,
  le.copro_id,
  SUM(CASE WHEN le.direction = 'debit' THEN le.amount ELSE 0 END) AS total_debits,
  SUM(CASE WHEN le.direction = 'credit' THEN le.amount ELSE 0 END) AS total_credits,
  SUM(CASE WHEN le.direction = 'debit' THEN le.amount ELSE -le.amount END) AS solde
FROM ledger_entries le
JOIN ledger_transactions lt ON le.tx_id = lt.id
WHERE lt.status = 'posted'
  AND le.lot_id IS NOT NULL
GROUP BY le.lot_id, le.copro_id;

COMMENT ON VIEW v_lot_balance IS 'Solde par lot calculé à partir des écritures comptables postées';
