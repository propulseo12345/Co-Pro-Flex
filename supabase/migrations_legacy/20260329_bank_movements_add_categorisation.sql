-- Migration: Ajout colonnes catégorisation comptable sur bank_movements
-- Permet de persister la catégorisation (compte comptable + catégorie) en DB

ALTER TABLE bank_movements
  ADD COLUMN account_code TEXT NULL,
  ADD COLUMN account_category TEXT NULL;

COMMENT ON COLUMN bank_movements.account_code IS 'Code du compte comptable (ex: 714, 601)';
COMMENT ON COLUMN bank_movements.account_category IS 'Type de compte: charge ou produit';

-- Mettre à jour la vue pour exposer les nouvelles colonnes
CREATE OR REPLACE VIEW v_bank_movements_overview
WITH (security_invoker = true) AS
SELECT
  bm.id,
  bm.copro_id,
  bm.period_id,
  bm.bank_date,
  bm.value_date,
  bm.amount_signed,
  CASE WHEN bm.amount_signed > 0 THEN 'credit' ELSE 'debit' END as direction,
  ABS(bm.amount_signed) as amount_abs,
  bm.label,
  bm.bank_ref,
  bm.status,
  bm.account_code,
  bm.account_category,
  bm.created_at,
  COALESCE(SUM(bmatch.amount_matched), 0) as total_matched,
  ABS(bm.amount_signed) - COALESCE(SUM(bmatch.amount_matched), 0) as remaining_to_match,
  COUNT(bmatch.id) as matches_count
FROM bank_movements bm
LEFT JOIN bank_matches bmatch ON bmatch.bank_movement_id = bm.id
GROUP BY bm.id;

COMMENT ON VIEW v_bank_movements_overview IS 'Mouvements bancaires avec état de rapprochement et catégorisation.';
