-- ============================================================================
-- WP5.2 — reopen_period : durcissement (retours de code review + audit expert)
-- ============================================================================
-- 1) Ajoute un bloc EXCEPTION WHEN OTHERS -> {success:false} pour respecter le
--    contrat JSON (sinon une exception de trigger remonte brute à l'appelant).
-- 2) Restreint explicitement les statuts réouvrables. Réouvrables :
--      - 'closed'  : exercice clôturé techniquement mais PAS approuvé en AG.
--      - 'locked'  : état intermédiaire de verrou.
--      - 'rejected': comptes présentés mais REJETÉS par l'AG (art. 11 décret
--        67-223). NON intangibles : ils doivent justement être corrigés puis
--        re-présentés à l'AG suivante -> réouverture autorisée.
--    Refusés : 'approved' (intangible, traité en amont) et tout statut futur
--    inconnu (fail-safe). L'enum period_status compte 5 valeurs
--    (open/locked/closed/approved/rejected) ; l'ancienne version faisait un
--    UPDATE inconditionnel qui rouvrait n'importe quel statut.
-- 3) GET DIAGNOSTICS ROW_COUNT après l'UPDATE : si 0 ligne touchée (le statut a
--    changé en concurrence entre le SELECT initial et l'UPDATE), on renvoie
--    success:false au lieu de mentir avec success:true. Aligné sur le pattern
--    de close_period/approve_period.
-- Reste inchangé : les 4 garde-fous (approuvé / autre période ouverte /
-- exercice postérieur approuvé / efface marqueurs).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reopen_period(p_period_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_p              accounting_periods%ROWTYPE;
  v_other_open     uuid;
  v_later_approved uuid;
  v_rows           int;
BEGIN
  SELECT * INTO v_p FROM accounting_periods WHERE id = p_period_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Période introuvable', 'period_id', p_period_id);
  END IF;

  -- Déjà ouverte : rien à faire
  IF v_p.status = 'open' THEN
    RETURN jsonb_build_object('success', true,
      'period_id', p_period_id, 'status', 'open', 'noop', true);
  END IF;

  -- Intangibilité : un exercice approuvé en AG ne peut être rouvert
  IF v_p.status = 'approved' THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Exercice approuvé en AG : intangible, réouverture interdite',
      'period_id', p_period_id, 'status', v_p.status);
  END IF;

  -- Seuls closed / locked / rejected sont réouvrables (rejette tout statut futur)
  IF v_p.status NOT IN ('closed','locked','rejected') THEN
    RETURN jsonb_build_object('success', false,
      'error', format('Statut non réouvrable : %s (réouverture réservée à closed/locked/rejected)', v_p.status),
      'period_id', p_period_id, 'status', v_p.status);
  END IF;

  -- Une seule période ouverte à la fois pour la copropriété
  SELECT id INTO v_other_open FROM accounting_periods
   WHERE copro_id = v_p.copro_id AND status = 'open' AND id <> p_period_id
   LIMIT 1;
  IF v_other_open IS NOT NULL THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Une autre période est déjà ouverte ; clôturez-la d''abord',
      'period_id', p_period_id, 'open_period_id', v_other_open);
  END IF;

  -- Intégrité de l'à-nouveau : refuser si un exercice postérieur est approuvé
  SELECT id INTO v_later_approved FROM accounting_periods
   WHERE copro_id = v_p.copro_id AND status = 'approved' AND start_date > v_p.start_date
   LIMIT 1;
  IF v_later_approved IS NOT NULL THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Un exercice postérieur est déjà approuvé : sa reprise à-nouveau dépend de cet exercice',
      'period_id', p_period_id, 'later_approved_period_id', v_later_approved);
  END IF;

  -- Réouverture : closed/locked/rejected -> open (efface les marqueurs)
  UPDATE accounting_periods
     SET status = 'open',
         closed_at = NULL, closed_by = NULL,
         locked_at = NULL, locked_by = NULL
   WHERE id = p_period_id AND status IN ('closed','locked','rejected');

  -- Le statut a changé en concurrence entre le SELECT et l'UPDATE : pas de réouverture effective
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Réouverture annulée : le statut a changé en cours d''opération (concurrence) ; réessayez',
      'period_id', p_period_id);
  END IF;

  RETURN jsonb_build_object('success', true,
    'period_id', p_period_id, 'status', 'open', 'reopened_from', v_p.status);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'period_id', p_period_id);
END;
$$;
