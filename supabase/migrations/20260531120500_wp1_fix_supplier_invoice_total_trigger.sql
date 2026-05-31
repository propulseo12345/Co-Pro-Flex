-- ============================================================================
-- WP1 — Correctif trigger validate_supplier_invoice_total (double comptage)
-- ============================================================================
-- Le trigger AFTER ROW sur supplier_invoice_lines calculait
--   SUM(amount) + NEW.amount  (resp. - OLD + NEW, - OLD)
-- alors qu'en trigger AFTER la ligne est DÉJÀ reflétée dans la table : NEW/OLD
-- étaient donc comptés deux fois. Résultat : impossible d'insérer la moindre
-- ligne de facture (l'invariant somme(lignes)=total échouait toujours).
--
-- On aligne sur le jumeau correct validate_call_for_funds_total : en AFTER, on
-- somme simplement l'état courant de la table, sans ré-ajouter NEW/OLD.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_supplier_invoice_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice_id UUID;
  v_expected_total NUMERIC(12,2);
  v_lines_total NUMERIC(12,2);
  v_tolerance NUMERIC := 0.01;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  SELECT total_amount INTO v_expected_total
  FROM supplier_invoices
  WHERE id = v_invoice_id
  FOR UPDATE;

  -- Facture supprimée (cascade) : on laisse passer
  IF v_expected_total IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Trigger AFTER : la table reflète déjà l'opération -> somme de l'état courant
  SELECT COALESCE(SUM(amount), 0)
  INTO v_lines_total
  FROM supplier_invoice_lines
  WHERE invoice_id = v_invoice_id;

  IF TG_OP != 'DELETE' OR v_lines_total > v_tolerance THEN
    IF ABS(v_lines_total - v_expected_total) > v_tolerance THEN
      RAISE EXCEPTION 'Invariant violation: somme des lignes facture (%.2f) != total facture (%.2f) pour invoice_id %. Ecart: %.2f',
        v_lines_total, v_expected_total, v_invoice_id, ABS(v_lines_total - v_expected_total)
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;
