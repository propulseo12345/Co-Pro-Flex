-- ============================================================================
-- WP5.2 — reopen_period : réouverture contrôlée d'un exercice clôturé
-- ============================================================================
-- Décision validée (2026-06-01) : plutôt qu'un canal d'écriture en période fermée,
-- on corrige un exercice clôturé-mais-pas-encore-approuvé par RÉOUVERTURE tracée.
-- L'intangibilité ne s'attache qu'à l'APPROBATION en AG (loi 65-557) : tant que les
-- comptes ne sont pas approuvés, ils restent révisables.
--
-- Garde-fous :
--   1) Exercice 'approved'        -> REFUS (intangibilité).
--   2) Déjà 'open'                -> no-op (succès).
--   3) Une autre période 'open'   -> REFUS (respecte check_single_open_period :
--      en pratique il faut clôturer N+1 avant de rouvrir N).
--   4) Un exercice POSTÉRIEUR 'approved' -> REFUS (sa reprise à-nouveau dépend des
--      soldes de cet exercice : le rouvrir invaliderait un report déjà figé).
--   5) Sinon (closed/locked) -> 'open', en effaçant les marqueurs de clôture/verrou.
--
-- Workflow type : reopen_period(N) -> corrections -> close_period(N) ->
-- open_next_period(N) (idempotent : régénère la reprise N+1).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reopen_period(p_period_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_p              accounting_periods%ROWTYPE;
  v_other_open     uuid;
  v_later_approved uuid;
BEGIN
  SELECT * INTO v_p FROM accounting_periods WHERE id = p_period_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Période introuvable', 'period_id', p_period_id);
  END IF;

  -- 2) Déjà ouverte : rien à faire
  IF v_p.status = 'open' THEN
    RETURN jsonb_build_object('success', true,
      'period_id', p_period_id, 'status', 'open', 'noop', true);
  END IF;

  -- 1) Intangibilité : un exercice approuvé en AG ne peut être rouvert
  IF v_p.status = 'approved' THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Exercice approuvé en AG : intangible, réouverture interdite',
      'period_id', p_period_id, 'status', v_p.status);
  END IF;

  -- 3) Une seule période ouverte à la fois pour la copropriété
  SELECT id INTO v_other_open FROM accounting_periods
   WHERE copro_id = v_p.copro_id AND status = 'open' AND id <> p_period_id
   LIMIT 1;
  IF v_other_open IS NOT NULL THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Une autre période est déjà ouverte ; clôturez-la d''abord',
      'period_id', p_period_id, 'open_period_id', v_other_open);
  END IF;

  -- 4) Intégrité de l'à-nouveau : refuser si un exercice postérieur est approuvé
  SELECT id INTO v_later_approved FROM accounting_periods
   WHERE copro_id = v_p.copro_id AND status = 'approved' AND start_date > v_p.start_date
   LIMIT 1;
  IF v_later_approved IS NOT NULL THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Un exercice postérieur est déjà approuvé : sa reprise à-nouveau dépend de cet exercice',
      'period_id', p_period_id, 'later_approved_period_id', v_later_approved);
  END IF;

  -- 5) Réouverture : closed/locked -> open (efface les marqueurs)
  UPDATE accounting_periods
     SET status = 'open',
         closed_at = NULL, closed_by = NULL,
         locked_at = NULL, locked_by = NULL
   WHERE id = p_period_id;

  RETURN jsonb_build_object('success', true,
    'period_id', p_period_id, 'status', 'open', 'reopened_from', v_p.status);
END;
$$;
