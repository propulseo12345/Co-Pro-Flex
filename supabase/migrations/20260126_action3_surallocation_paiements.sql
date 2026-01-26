-- ============================================================================
-- ACTION 3 : Empêcher la sur-allocation des paiements
-- CoProFlex - Plan de Correction Logique Métier
-- Date: 2026-01-26
-- Description: SUM(payment_allocations.amount_allocated) <= payments.amount
-- ============================================================================

-- ============================================================================
-- 1) INDEX pour performances
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id
  ON payment_allocations(payment_id);

CREATE INDEX IF NOT EXISTS idx_payments_copro_date
  ON payments(copro_id, payment_date DESC);

-- ============================================================================
-- 2) FONCTION de validation sur-allocation
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_payment_allocation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_amount NUMERIC(12,2);
  v_payment_copro_id UUID;
  v_already_allocated NUMERIC(12,2);
  v_new_total NUMERIC(12,2);
  v_line_copro_id UUID;
  v_tolerance NUMERIC := 0.01;
BEGIN
  -- Récupérer le montant et copro_id du paiement
  SELECT amount, copro_id
  INTO v_payment_amount, v_payment_copro_id
  FROM payments
  WHERE id = NEW.payment_id;

  IF v_payment_amount IS NULL THEN
    RAISE EXCEPTION 'Payment not found: %', NEW.payment_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- Vérifier que le montant alloué est positif
  IF NEW.amount_allocated <= 0 THEN
    RAISE EXCEPTION 'Allocation amount must be positive: %', NEW.amount_allocated
      USING ERRCODE = 'check_violation';
  END IF;

  -- Vérifier la cohérence copro_id avec la ligne d'appel
  SELECT copro_id INTO v_line_copro_id
  FROM call_for_funds_lines
  WHERE id = NEW.call_line_id;

  IF v_line_copro_id IS NULL THEN
    RAISE EXCEPTION 'Call line not found: %', NEW.call_line_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF v_line_copro_id != v_payment_copro_id THEN
    RAISE EXCEPTION 'Cannot allocate payment from copro % to line from copro %',
      v_payment_copro_id, v_line_copro_id
      USING ERRCODE = 'check_violation';
  END IF;

  -- Calculer le total déjà alloué (hors allocation courante si UPDATE)
  IF TG_OP = 'INSERT' THEN
    SELECT COALESCE(SUM(amount_allocated), 0)
    INTO v_already_allocated
    FROM payment_allocations
    WHERE payment_id = NEW.payment_id;
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT COALESCE(SUM(amount_allocated), 0) - OLD.amount_allocated
    INTO v_already_allocated
    FROM payment_allocations
    WHERE payment_id = NEW.payment_id;
  END IF;

  -- Vérifier que le total alloué ne dépasse pas le paiement
  v_new_total := v_already_allocated + NEW.amount_allocated;

  IF v_new_total > v_payment_amount + v_tolerance THEN
    RAISE EXCEPTION 'Over-allocation: trying to allocate %.2f but payment is %.2f (already allocated: %.2f)',
      NEW.amount_allocated, v_payment_amount, v_already_allocated
      USING ERRCODE = 'check_violation';
  END IF;

  -- S'assurer que copro_id est renseigné
  IF NEW.copro_id IS NULL THEN
    NEW.copro_id := v_payment_copro_id;
  ELSIF NEW.copro_id != v_payment_copro_id THEN
    RAISE EXCEPTION 'Allocation copro_id mismatch: % != %', NEW.copro_id, v_payment_copro_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION validate_payment_allocation IS
  'Empêche la sur-allocation des paiements et vérifie la cohérence copro';

-- ============================================================================
-- 3) TRIGGER BEFORE INSERT/UPDATE
-- ============================================================================

DROP TRIGGER IF EXISTS trg_validate_payment_allocation ON payment_allocations;

CREATE TRIGGER trg_validate_payment_allocation
  BEFORE INSERT OR UPDATE OF amount_allocated
  ON payment_allocations
  FOR EACH ROW
  EXECUTE FUNCTION validate_payment_allocation();

-- ============================================================================
-- 4) FONCTION pour vérifier l'intégrité d'un paiement
-- ============================================================================

CREATE OR REPLACE FUNCTION check_payment_allocation_integrity(p_payment_id UUID)
RETURNS TABLE(
  payment_id UUID,
  payment_amount NUMERIC,
  total_allocated NUMERIC,
  unallocated NUMERIC,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_payment_amount NUMERIC;
  v_total_allocated NUMERIC;
BEGIN
  SELECT amount INTO v_payment_amount
  FROM payments
  WHERE id = p_payment_id;

  SELECT COALESCE(SUM(amount_allocated), 0)
  INTO v_total_allocated
  FROM payment_allocations
  WHERE payment_allocations.payment_id = p_payment_id;

  payment_id := p_payment_id;
  payment_amount := v_payment_amount;
  total_allocated := v_total_allocated;
  unallocated := v_payment_amount - v_total_allocated;
  is_valid := v_total_allocated <= v_payment_amount + 0.01;

  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION check_payment_allocation_integrity IS
  'Vérifie l''intégrité des allocations d''un paiement';

-- ============================================================================
-- 5) VUE pour monitoring des sur-allocations
-- ============================================================================

CREATE OR REPLACE VIEW v_payment_allocation_issues
WITH (security_invoker = true) AS
SELECT
  p.id AS payment_id,
  p.copro_id,
  p.lot_id,
  p.amount AS payment_amount,
  COALESCE(SUM(pa.amount_allocated), 0) AS total_allocated,
  p.amount - COALESCE(SUM(pa.amount_allocated), 0) AS unallocated,
  CASE
    WHEN COALESCE(SUM(pa.amount_allocated), 0) > p.amount + 0.01 THEN 'OVER_ALLOCATED'
    WHEN COALESCE(SUM(pa.amount_allocated), 0) < p.amount - 0.01 THEN 'UNDER_ALLOCATED'
    ELSE 'OK'
  END AS status,
  p.payment_date,
  p.created_at
FROM payments p
LEFT JOIN payment_allocations pa ON pa.payment_id = p.id
GROUP BY p.id
HAVING COALESCE(SUM(pa.amount_allocated), 0) > p.amount + 0.01
    OR (COALESCE(SUM(pa.amount_allocated), 0) < p.amount - 0.01 AND p.status = 'reconciled');

COMMENT ON VIEW v_payment_allocation_issues IS
  'Vue des paiements avec problèmes d''allocation';

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
