-- ============================================================================
-- ACTION 1 : Invariant total appel = somme des lignes
-- CoProFlex - Plan de Correction Logique Métier
-- Date: 2026-01-26
-- Description: Trigger pour vérifier que call_for_funds.total_amount = SUM(call_for_funds_lines.amount_due)
-- Tolérance: 0.01€ pour les arrondis
-- ============================================================================

-- ============================================================================
-- 1) FONCTION DE VALIDATION
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_call_for_funds_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_call_id UUID;
  v_expected_total NUMERIC(12,2);
  v_lines_total NUMERIC(12,2);
  v_tolerance NUMERIC := 0.01;
BEGIN
  -- Déterminer le call_id concerné
  IF TG_OP = 'DELETE' THEN
    v_call_id := OLD.call_id;
  ELSE
    v_call_id := NEW.call_id;
  END IF;

  -- Récupérer le total attendu (avec verrou pour éviter race condition)
  SELECT total_amount INTO v_expected_total
  FROM call_for_funds
  WHERE id = v_call_id
  FOR UPDATE;

  -- Si l'appel n'existe plus, on laisse passer (cascade delete)
  IF v_expected_total IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Calculer la somme des lignes (en excluant la ligne courante si UPDATE/DELETE)
  IF TG_OP = 'INSERT' THEN
    SELECT COALESCE(SUM(amount_due), 0) + NEW.amount_due
    INTO v_lines_total
    FROM call_for_funds_lines
    WHERE call_id = v_call_id;

  ELSIF TG_OP = 'UPDATE' THEN
    SELECT COALESCE(SUM(amount_due), 0) - OLD.amount_due + NEW.amount_due
    INTO v_lines_total
    FROM call_for_funds_lines
    WHERE call_id = v_call_id;

  ELSIF TG_OP = 'DELETE' THEN
    SELECT COALESCE(SUM(amount_due), 0) - OLD.amount_due
    INTO v_lines_total
    FROM call_for_funds_lines
    WHERE call_id = v_call_id;
  END IF;

  -- Vérifier la cohérence avec tolérance
  -- Note: On ne bloque pas les suppressions totales (cas de reset)
  IF TG_OP != 'DELETE' OR v_lines_total > v_tolerance THEN
    IF ABS(v_lines_total - v_expected_total) > v_tolerance THEN
      RAISE EXCEPTION 'Invariant violation: somme des lignes (%.2f) != total appel (%.2f) pour call_id %. Ecart: %.2f',
        v_lines_total, v_expected_total, v_call_id, ABS(v_lines_total - v_expected_total)
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Retourner le résultat approprié
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

COMMENT ON FUNCTION validate_call_for_funds_total IS
  'Vérifie que la somme des lignes d''appel = total de l''appel (tolérance 0.01€)';

-- ============================================================================
-- 2) TRIGGER CONSTRAINT
-- Note: CONSTRAINT trigger exécuté en fin de transaction pour gérer les bulk inserts
-- ============================================================================

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS trg_validate_call_total ON call_for_funds_lines;

-- Créer le trigger AFTER pour validation
CREATE CONSTRAINT TRIGGER trg_validate_call_total
  AFTER INSERT OR UPDATE OF amount_due OR DELETE
  ON call_for_funds_lines
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION validate_call_for_funds_total();

-- ============================================================================
-- 3) FONCTION ALTERNATIVE: Validation immédiate (non-deferrable)
-- Pour les cas où on veut une validation immédiate
-- ============================================================================

CREATE OR REPLACE FUNCTION check_call_total_integrity(p_call_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_expected_total NUMERIC(12,2);
  v_lines_total NUMERIC(12,2);
  v_tolerance NUMERIC := 0.01;
BEGIN
  SELECT total_amount INTO v_expected_total
  FROM call_for_funds
  WHERE id = p_call_id;

  IF v_expected_total IS NULL THEN
    RETURN TRUE; -- Appel n'existe pas
  END IF;

  SELECT COALESCE(SUM(amount_due), 0)
  INTO v_lines_total
  FROM call_for_funds_lines
  WHERE call_id = p_call_id;

  RETURN ABS(v_lines_total - v_expected_total) <= v_tolerance;
END;
$$;

COMMENT ON FUNCTION check_call_total_integrity IS
  'Fonction de vérification manuelle de l''intégrité d''un appel de fonds';

-- ============================================================================
-- 4) VUE pour monitoring des incohérences
-- ============================================================================

CREATE OR REPLACE VIEW v_call_total_mismatch
WITH (security_invoker = true) AS
SELECT
  cf.id AS call_id,
  cf.copro_id,
  cf.label,
  cf.total_amount AS expected_total,
  COALESCE(SUM(cfl.amount_due), 0) AS actual_lines_total,
  cf.total_amount - COALESCE(SUM(cfl.amount_due), 0) AS difference,
  cf.status,
  cf.created_at
FROM call_for_funds cf
LEFT JOIN call_for_funds_lines cfl ON cfl.call_id = cf.id
GROUP BY cf.id
HAVING ABS(cf.total_amount - COALESCE(SUM(cfl.amount_due), 0)) > 0.01;

COMMENT ON VIEW v_call_total_mismatch IS
  'Vue des appels de fonds avec incohérence total vs lignes';

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
