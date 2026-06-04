-- ============================================================================
-- ACTION 2 : Auto-update call_for_funds.status selon paiements
-- CoProFlex - Plan de Correction Logique Métier
-- Date: 2026-01-26
-- Description: Trigger pour mettre à jour automatiquement le statut des appels
-- ============================================================================

-- ============================================================================
-- 1) FONCTION update_call_status (amélioration de l'existante)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_call_status(p_call_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_call RECORD;
  v_total_due NUMERIC;
  v_total_paid NUMERIC;
  v_unpaid_count INT;
  v_new_status call_for_funds_status;
BEGIN
  -- Récupérer l'appel actuel
  SELECT * INTO v_call FROM call_for_funds WHERE id = p_call_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Ne pas modifier les appels en draft ou annulés
  IF v_call.status IN ('draft', 'cancelled') THEN
    RETURN;
  END IF;

  -- Calculer les totaux
  SELECT
    COALESCE(SUM(amount_due), 0),
    COALESCE(SUM(amount_paid), 0),
    COUNT(*) FILTER (WHERE status != 'paid')
  INTO v_total_due, v_total_paid, v_unpaid_count
  FROM call_for_funds_lines
  WHERE call_id = p_call_id;

  -- Déterminer le nouveau statut
  IF v_unpaid_count = 0 AND v_total_due > 0 THEN
    v_new_status := 'paid';
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'partially_paid';
  ELSE
    v_new_status := 'issued';
  END IF;

  -- Mettre à jour seulement si le statut change
  IF v_new_status != v_call.status THEN
    UPDATE call_for_funds
    SET status = v_new_status
    WHERE id = p_call_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION update_call_status IS
  'Met à jour le statut d''un appel selon les paiements des lignes';

-- ============================================================================
-- 2) TRIGGER sur call_for_funds_lines après modification des paiements
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_update_call_status_from_lines()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_call_status(OLD.call_id);
    RETURN OLD;
  ELSE
    PERFORM update_call_status(NEW.call_id);
    RETURN NEW;
  END IF;
END;
$$;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS trg_call_line_update_status ON call_for_funds_lines;

-- Trigger sur modifications amount_paid
CREATE TRIGGER trg_call_line_update_status
  AFTER INSERT OR UPDATE OF amount_paid, status OR DELETE
  ON call_for_funds_lines
  FOR EACH ROW
  EXECUTE FUNCTION trg_update_call_status_from_lines();

-- ============================================================================
-- 3) TRIGGER sur payment_allocations pour cascade vers lignes
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_update_line_from_allocation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line_id UUID;
  v_new_paid NUMERIC;
BEGIN
  -- Déterminer la ligne concernée
  IF TG_OP = 'DELETE' THEN
    v_line_id := OLD.call_line_id;
  ELSE
    v_line_id := NEW.call_line_id;
  END IF;

  -- Recalculer le total payé pour cette ligne
  SELECT COALESCE(SUM(amount_allocated), 0)
  INTO v_new_paid
  FROM payment_allocations
  WHERE call_line_id = v_line_id;

  -- Mettre à jour la ligne (ce qui déclenchera le trigger de statut)
  UPDATE call_for_funds_lines
  SET amount_paid = v_new_paid
  WHERE id = v_line_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS trg_allocation_update_line ON payment_allocations;

-- Créer le trigger
CREATE TRIGGER trg_allocation_update_line
  AFTER INSERT OR UPDATE OF amount_allocated OR DELETE
  ON payment_allocations
  FOR EACH ROW
  EXECUTE FUNCTION trg_update_line_from_allocation();

-- ============================================================================
-- 4) FONCTION pour recalculer tous les statuts (maintenance)
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_all_call_statuses(p_copro_id UUID DEFAULT NULL)
RETURNS TABLE(call_id UUID, old_status call_for_funds_status, new_status call_for_funds_status)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_call RECORD;
  v_total_paid NUMERIC;
  v_unpaid_count INT;
  v_new_status call_for_funds_status;
BEGIN
  FOR v_call IN
    SELECT cf.id, cf.status AS current_status
    FROM call_for_funds cf
    WHERE cf.status NOT IN ('draft', 'cancelled')
      AND (p_copro_id IS NULL OR cf.copro_id = p_copro_id)
  LOOP
    SELECT
      COALESCE(SUM(cfl.amount_paid), 0),
      COUNT(*) FILTER (WHERE cfl.status != 'paid')
    INTO v_total_paid, v_unpaid_count
    FROM call_for_funds_lines cfl
    WHERE cfl.call_id = v_call.id;

    IF v_unpaid_count = 0 THEN
      v_new_status := 'paid';
    ELSIF v_total_paid > 0 THEN
      v_new_status := 'partially_paid';
    ELSE
      v_new_status := 'issued';
    END IF;

    IF v_new_status != v_call.current_status THEN
      UPDATE call_for_funds SET status = v_new_status WHERE id = v_call.id;

      call_id := v_call.id;
      old_status := v_call.current_status;
      new_status := v_new_status;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION recalculate_all_call_statuses IS
  'Recalcule les statuts de tous les appels (maintenance)';

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
