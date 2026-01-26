-- ============================================================================
-- ACTION 5 : RLS Finance copropriétaire par lot
-- CoProFlex - Plan de Correction Logique Métier
-- Date: 2026-01-26
-- Description: Un copropriétaire ne voit que les données finance de ses lots actifs
-- ============================================================================

-- ============================================================================
-- STRATÉGIE RLS:
-- - Manager (admin/gestionnaire): accès complet à toute la copro
-- - Conseil syndical (membre_cs): accès lecture étendu (à confirmer selon règles métier)
-- - Copropriétaire: SELECT uniquement sur ses propres lots
-- - Prestataire: aucun accès finance
-- ============================================================================

-- ============================================================================
-- 1) Supprimer les anciennes policies permissives
-- ============================================================================

-- call_for_funds
DROP POLICY IF EXISTS "call_for_funds_select" ON call_for_funds;

-- call_for_funds_lines
DROP POLICY IF EXISTS "call_for_funds_lines_select" ON call_for_funds_lines;

-- payments
DROP POLICY IF EXISTS "payments_select" ON payments;

-- payment_allocations
DROP POLICY IF EXISTS "payment_allocations_select" ON payment_allocations;

-- ============================================================================
-- 2) NOUVELLES POLICIES - call_for_funds
-- Manager: tout voir | Copro: voir appels qui concernent ses lots
-- ============================================================================

CREATE POLICY "call_for_funds_select_manager"
  ON call_for_funds
  FOR SELECT
  USING (user_is_copro_manager(copro_id));

CREATE POLICY "call_for_funds_select_owner"
  ON call_for_funds
  FOR SELECT
  USING (
    -- Le copro peut voir un appel si au moins une de ses lignes concerne un de ses lots
    EXISTS (
      SELECT 1
      FROM call_for_funds_lines cfl
      WHERE cfl.call_id = call_for_funds.id
        AND user_is_lot_owner(cfl.lot_id)
    )
  );

-- ============================================================================
-- 3) NOUVELLES POLICIES - call_for_funds_lines
-- Manager: tout voir | Copro: uniquement ses lots
-- ============================================================================

CREATE POLICY "call_for_funds_lines_select_manager"
  ON call_for_funds_lines
  FOR SELECT
  USING (user_is_copro_manager(copro_id));

CREATE POLICY "call_for_funds_lines_select_owner"
  ON call_for_funds_lines
  FOR SELECT
  USING (user_is_lot_owner(lot_id));

-- ============================================================================
-- 4) NOUVELLES POLICIES - payments
-- Manager: tout voir | Copro: uniquement ses lots
-- ============================================================================

CREATE POLICY "payments_select_manager"
  ON payments
  FOR SELECT
  USING (user_is_copro_manager(copro_id));

CREATE POLICY "payments_select_owner"
  ON payments
  FOR SELECT
  USING (user_is_lot_owner(lot_id));

-- ============================================================================
-- 5) NOUVELLES POLICIES - payment_allocations
-- Manager: tout voir | Copro: uniquement ses lots (via ligne d'appel)
-- ============================================================================

CREATE POLICY "payment_allocations_select_manager"
  ON payment_allocations
  FOR SELECT
  USING (user_is_copro_manager(copro_id));

CREATE POLICY "payment_allocations_select_owner"
  ON payment_allocations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM call_for_funds_lines cfl
      WHERE cfl.id = payment_allocations.call_line_id
        AND user_is_lot_owner(cfl.lot_id)
    )
  );

-- ============================================================================
-- 6) POLICIES - bank_movements (Manager only)
-- Les mouvements bancaires restent visibles uniquement par les managers
-- ============================================================================

-- Supprimer l'ancienne policy
DROP POLICY IF EXISTS "bank_movements_select" ON bank_movements;

CREATE POLICY "bank_movements_select_manager"
  ON bank_movements
  FOR SELECT
  USING (user_is_copro_manager(copro_id));

-- ============================================================================
-- 7) POLICIES - bank_matches (Manager only)
-- ============================================================================

DROP POLICY IF EXISTS "bank_matches_select" ON bank_matches;

CREATE POLICY "bank_matches_select_manager"
  ON bank_matches
  FOR SELECT
  USING (user_is_copro_manager(copro_id));

-- ============================================================================
-- 8) POLICIES - supplier_invoices (Manager only)
-- Les factures fournisseurs restent visibles uniquement par les managers
-- ============================================================================

DROP POLICY IF EXISTS "supplier_invoices_select" ON supplier_invoices;

CREATE POLICY "supplier_invoices_select_manager"
  ON supplier_invoices
  FOR SELECT
  USING (user_is_copro_manager(copro_id));

-- ============================================================================
-- 9) POLICIES - supplier_invoice_lines (Manager only)
-- ============================================================================

DROP POLICY IF EXISTS "supplier_invoice_lines_select" ON supplier_invoice_lines;

CREATE POLICY "supplier_invoice_lines_select_manager"
  ON supplier_invoice_lines
  FOR SELECT
  USING (user_is_copro_manager(copro_id));

-- ============================================================================
-- 10) POLICIES - supplier_payments (Manager only)
-- ============================================================================

DROP POLICY IF EXISTS "supplier_payments_select" ON supplier_payments;

CREATE POLICY "supplier_payments_select_manager"
  ON supplier_payments
  FOR SELECT
  USING (user_is_copro_manager(copro_id));

-- ============================================================================
-- 11) POLICIES - suppliers (Manager only for sensitive info)
-- ============================================================================

DROP POLICY IF EXISTS "suppliers_select" ON suppliers;

CREATE POLICY "suppliers_select_manager"
  ON suppliers
  FOR SELECT
  USING (user_is_copro_manager(copro_id));

-- ============================================================================
-- 12) VUE sécurisée pour relevé individuel copropriétaire
-- ============================================================================

CREATE OR REPLACE VIEW v_owner_financial_summary
WITH (security_invoker = true) AS
SELECT
  lo.copro_id,
  lo.lot_id,
  l.ref AS lot_ref,
  cp.id AS coproprietaire_id,
  CASE WHEN cp.is_company THEN cp.company_name
       ELSE CONCAT(cp.first_name, ' ', cp.last_name)
  END AS owner_name,

  -- Totaux appels de fonds
  COALESCE(SUM(cfl.amount_due), 0) AS total_due,
  COALESCE(SUM(cfl.amount_paid), 0) AS total_paid,
  COALESCE(SUM(cfl.amount_due - cfl.amount_paid), 0) AS balance_due,

  -- Nombre d'appels impayés
  COUNT(cfl.id) FILTER (WHERE cfl.status != 'paid') AS unpaid_calls_count,

  -- Date plus ancien impayé
  MIN(cf.due_date) FILTER (WHERE cfl.status != 'paid' AND cf.due_date < CURRENT_DATE) AS oldest_unpaid_due_date

FROM lot_owners lo
JOIN lots l ON l.id = lo.lot_id
JOIN coproprietaires cp ON cp.id = lo.coproprietaire_id
LEFT JOIN call_for_funds_lines cfl ON cfl.lot_id = lo.lot_id
LEFT JOIN call_for_funds cf ON cf.id = cfl.call_id AND cf.status NOT IN ('draft', 'cancelled')
WHERE lo.end_date IS NULL OR lo.end_date > CURRENT_DATE
GROUP BY lo.copro_id, lo.lot_id, l.ref, cp.id, cp.is_company, cp.company_name, cp.first_name, cp.last_name;

COMMENT ON VIEW v_owner_financial_summary IS
  'Synthèse financière par lot pour le copropriétaire (security_invoker pour RLS)';

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
