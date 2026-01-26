-- ============================================================================
-- ACTION 4 : Paiement fournisseur <= restant à payer
-- CoProFlex - Plan de Correction Logique Métier
-- Date: 2026-01-26
-- Description: SUM(supplier_payments.amount) <= supplier_invoices.total_amount
-- ============================================================================

-- ============================================================================
-- 1) INDEX pour performances
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_supplier_payments_invoice
  ON supplier_payments(supplier_invoice_id);

CREATE INDEX IF NOT EXISTS idx_supplier_invoices_copro_status
  ON supplier_invoices(copro_id, status);

-- ============================================================================
-- 2) FONCTION de validation paiement fournisseur
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_supplier_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice RECORD;
  v_already_paid NUMERIC(12,2);
  v_new_total NUMERIC(12,2);
  v_tolerance NUMERIC := 0.01;
BEGIN
  -- Récupérer les infos de la facture
  SELECT id, copro_id, total_amount, status
  INTO v_invoice
  FROM supplier_invoices
  WHERE id = NEW.supplier_invoice_id;

  IF v_invoice.id IS NULL THEN
    RAISE EXCEPTION 'Supplier invoice not found: %', NEW.supplier_invoice_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- Vérifier que le montant est positif
  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be positive: %', NEW.amount
      USING ERRCODE = 'check_violation';
  END IF;

  -- Vérifier que la facture est dans un état payable
  IF v_invoice.status = 'draft' THEN
    RAISE EXCEPTION 'Cannot pay draft invoice: %', NEW.supplier_invoice_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_invoice.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot pay cancelled invoice: %', NEW.supplier_invoice_id
      USING ERRCODE = 'check_violation';
  END IF;

  -- Calculer le total déjà payé (hors paiement courant si UPDATE)
  IF TG_OP = 'INSERT' THEN
    SELECT COALESCE(SUM(amount), 0)
    INTO v_already_paid
    FROM supplier_payments
    WHERE supplier_invoice_id = NEW.supplier_invoice_id;
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT COALESCE(SUM(amount), 0) - OLD.amount
    INTO v_already_paid
    FROM supplier_payments
    WHERE supplier_invoice_id = NEW.supplier_invoice_id;
  END IF;

  -- Vérifier que le total payé ne dépasse pas la facture
  v_new_total := v_already_paid + NEW.amount;

  IF v_new_total > v_invoice.total_amount + v_tolerance THEN
    RAISE EXCEPTION 'Over-payment: trying to pay %.2f but invoice is %.2f (already paid: %.2f)',
      NEW.amount, v_invoice.total_amount, v_already_paid
      USING ERRCODE = 'check_violation';
  END IF;

  -- S'assurer que copro_id est correct
  IF NEW.copro_id IS NULL THEN
    NEW.copro_id := v_invoice.copro_id;
  ELSIF NEW.copro_id != v_invoice.copro_id THEN
    RAISE EXCEPTION 'Supplier payment copro_id mismatch: % != %', NEW.copro_id, v_invoice.copro_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION validate_supplier_payment IS
  'Empêche le sur-paiement des factures fournisseurs';

-- ============================================================================
-- 3) TRIGGER BEFORE INSERT/UPDATE
-- ============================================================================

DROP TRIGGER IF EXISTS trg_validate_supplier_payment ON supplier_payments;

CREATE TRIGGER trg_validate_supplier_payment
  BEFORE INSERT OR UPDATE OF amount
  ON supplier_payments
  FOR EACH ROW
  EXECUTE FUNCTION validate_supplier_payment();

-- ============================================================================
-- 4) FONCTION pour mettre à jour le statut facture après paiement
-- ============================================================================

CREATE OR REPLACE FUNCTION update_supplier_invoice_status_after_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id UUID;
  v_invoice RECORD;
  v_total_paid NUMERIC(12,2);
  v_tolerance NUMERIC := 0.01;
BEGIN
  -- Déterminer la facture concernée
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.supplier_invoice_id;
  ELSE
    v_invoice_id := NEW.supplier_invoice_id;
  END IF;

  -- Récupérer les infos de la facture
  SELECT * INTO v_invoice
  FROM supplier_invoices
  WHERE id = v_invoice_id;

  IF NOT FOUND OR v_invoice.status IN ('draft', 'cancelled') THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Calculer le total payé
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM supplier_payments
  WHERE supplier_invoice_id = v_invoice_id;

  -- Mettre à jour le statut
  IF v_total_paid >= v_invoice.total_amount - v_tolerance THEN
    UPDATE supplier_invoices
    SET status = 'paid'
    WHERE id = v_invoice_id
      AND status != 'paid';
  ELSIF v_total_paid > v_tolerance AND v_invoice.status = 'paid' THEN
    -- Retour à posted si on supprime un paiement
    UPDATE supplier_invoices
    SET status = 'posted'
    WHERE id = v_invoice_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- ============================================================================
-- 5) TRIGGER AFTER pour mise à jour statut facture
-- ============================================================================

DROP TRIGGER IF EXISTS trg_update_invoice_status_after_payment ON supplier_payments;

CREATE TRIGGER trg_update_invoice_status_after_payment
  AFTER INSERT OR UPDATE OF amount OR DELETE
  ON supplier_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_supplier_invoice_status_after_payment();

-- ============================================================================
-- 6) VUE pour monitoring des sur-paiements
-- ============================================================================

CREATE OR REPLACE VIEW v_supplier_payment_issues
WITH (security_invoker = true) AS
SELECT
  si.id AS invoice_id,
  si.copro_id,
  si.supplier_id,
  s.name AS supplier_name,
  si.invoice_number,
  si.total_amount,
  COALESCE(SUM(sp.amount), 0) AS total_paid,
  si.total_amount - COALESCE(SUM(sp.amount), 0) AS remaining,
  CASE
    WHEN COALESCE(SUM(sp.amount), 0) > si.total_amount + 0.01 THEN 'OVER_PAID'
    WHEN si.status = 'paid' AND COALESCE(SUM(sp.amount), 0) < si.total_amount - 0.01 THEN 'STATUS_MISMATCH'
    ELSE 'OK'
  END AS issue_status,
  si.status AS invoice_status
FROM supplier_invoices si
JOIN suppliers s ON s.id = si.supplier_id
LEFT JOIN supplier_payments sp ON sp.supplier_invoice_id = si.id
GROUP BY si.id, s.name
HAVING COALESCE(SUM(sp.amount), 0) > si.total_amount + 0.01
    OR (si.status = 'paid' AND COALESCE(SUM(sp.amount), 0) < si.total_amount - 0.01);

COMMENT ON VIEW v_supplier_payment_issues IS
  'Vue des factures fournisseurs avec problèmes de paiement';

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
