-- ============================================================================
-- WP5.1 — Fonctions de période : close_period (hardening) + approve_period + stub
-- ============================================================================

-- 1) close_period : ajoute SET search_path (manquant), comportement inchangé.
CREATE OR REPLACE FUNCTION public.close_period(p_period_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  UPDATE accounting_periods
  SET status = 'closed', closed_at = now(), closed_by = auth.uid()
  WHERE id = p_period_id AND status IN ('open','locked');
  RETURN FOUND;
END;
$$;

-- 2) approve_period : N (closed) -> approved. Fige automatiquement la reprise N+1
--    (l'exemption d'immutabilité ne s'applique plus quand N = 'approved').
CREATE OR REPLACE FUNCTION public.approve_period(p_period_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_updated int;
BEGIN
  UPDATE accounting_periods
  SET status = 'approved', approved_at = now(), approved_by = auth.uid()
  WHERE id = p_period_id AND status = 'closed';
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Période introuvable ou non clôturée (statut attendu : closed)',
      'period_id', p_period_id
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'period_id', p_period_id, 'status', 'approved');
END;
$$;

-- 3) regularize_period : STUB no-op (point d'accroche WP5.3 — répartition
--    excédent/déficit 120/110 -> 450 par quote-part). Signature figée.
CREATE OR REPLACE FUNCTION public.regularize_period(p_copro_id uuid, p_period_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN jsonb_build_object(
    'success', true,
    'skipped', 'WP5.3 regularization not implemented',
    'copro_id', p_copro_id,
    'period_id', p_period_id
  );
END;
$$;
