-- ============================================================================
-- WP1 — Ajoute 'supplier_payment' aux source_type autorisés du grand livre
-- ============================================================================
-- post_supplier_payment trace l'écriture de règlement fournisseur avec
-- source_type='supplier_payment' / source_id=supplier_payments.id. Cette valeur
-- manquait dans le CHECK, ce qui empêchait toute écriture de paiement
-- fournisseur. On l'ajoute (sans réutiliser 'payment', réservé aux règlements
-- copropriétaires, pour garder un backref source_id non ambigu).
-- ============================================================================
ALTER TABLE public.ledger_transactions
  DROP CONSTRAINT IF EXISTS ledger_transactions_source_type_check;

ALTER TABLE public.ledger_transactions
  ADD CONSTRAINT ledger_transactions_source_type_check
  CHECK (
    source_type IS NULL OR source_type = ANY (ARRAY[
      'budget', 'call_for_funds', 'payment', 'supplier_invoice', 'supplier_payment',
      'bank_movement', 'transfer', 'od', 'opening', 'closing', 'manual'
    ])
  );
