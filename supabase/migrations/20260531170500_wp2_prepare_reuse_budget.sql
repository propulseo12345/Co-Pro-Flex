-- ============================================================================
-- WP2 — prepare_ag_decisions : réutiliser un budget existant + idempotence
-- ============================================================================
-- prepare_ag_decisions créait toujours un nouveau budget pour CREATE_BUDGET, ce
-- qui violait la contrainte d'unicité (copro, période, type, version) quand un
-- budget existait déjà pour la période. On réutilise désormais le budget courant
-- de la période (en le rattachant à l'AG) sinon on en crée un. + garde
-- d'idempotence : on ne recrée pas d'action si elle existe déjà pour la résolution.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.prepare_ag_decisions(p_ag_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_resolution RECORD;
  v_actions_created INT := 0;
  v_target_id UUID;
  v_copro_id UUID;
  v_vars JSONB;
  v_period_id UUID;
BEGIN
  SELECT copro_id INTO v_copro_id FROM ag_meetings WHERE id = p_ag_id;

  FOR v_resolution IN
    SELECT id, title, action_type, variables, is_approved
    FROM ag_resolutions
    WHERE ag_id = p_ag_id AND is_approved = true AND action_type IS NOT NULL
    ORDER BY resolution_number
  LOOP
    -- Idempotence : ne pas recréer une action déjà préparée pour cette résolution
    IF EXISTS (SELECT 1 FROM ag_pending_actions WHERE ag_id = p_ag_id AND resolution_id = v_resolution.id) THEN
      CONTINUE;
    END IF;

    v_vars := COALESCE(v_resolution.variables, '{}'::jsonb);
    v_target_id := NULL;

    CASE v_resolution.action_type

    WHEN 'CREATE_BUDGET' THEN
      SELECT id INTO v_period_id FROM accounting_periods
      WHERE copro_id = v_copro_id
        AND start_date = (v_vars->>'date_debut')::DATE
        AND end_date = (v_vars->>'date_fin')::DATE
      LIMIT 1;

      -- Réutiliser un budget courant existant pour cette période, sinon créer
      SELECT id INTO v_target_id FROM budgets
      WHERE copro_id = v_copro_id AND period_id = v_period_id AND budget_type = 'current'
      ORDER BY version DESC LIMIT 1;

      IF v_target_id IS NOT NULL THEN
        UPDATE budgets SET source_ag_id = p_ag_id, status = 'draft_from_ag' WHERE id = v_target_id;
      ELSE
        INSERT INTO budgets (copro_id, period_id, name, budget_type, status, source_ag_id)
        VALUES (v_copro_id, v_period_id,
          'Budget previsionnel ' || COALESCE(v_vars->>'date_debut', ''), 'current', 'draft_from_ag', p_ag_id)
        RETURNING id INTO v_target_id;
      END IF;

      INSERT INTO ag_pending_actions (ag_id, resolution_id, action_type, target_table, target_id, payload, status)
      VALUES (p_ag_id, v_resolution.id, 'CREATE_BUDGET', 'budgets', v_target_id, v_vars, 'pending');
      v_actions_created := v_actions_created + 1;

    WHEN 'APPROVE_ACCOUNTS' THEN
      INSERT INTO ag_pending_actions (ag_id, resolution_id, action_type, target_table, payload, status)
      VALUES (p_ag_id, v_resolution.id, 'APPROVE_ACCOUNTS', 'budgets', v_vars, 'pending');
      v_actions_created := v_actions_created + 1;

    WHEN 'SCHEDULE_BUDGET_PAYMENTS' THEN
      INSERT INTO ag_pending_actions (ag_id, resolution_id, action_type, target_table, payload, status)
      VALUES (p_ag_id, v_resolution.id, 'SCHEDULE_BUDGET_PAYMENTS', 'call_for_funds', v_vars, 'pending');
      v_actions_created := v_actions_created + 1;

    WHEN 'CREATE_ALUR_FUND' THEN
      INSERT INTO ag_pending_actions (ag_id, resolution_id, action_type, target_table, payload, status)
      VALUES (p_ag_id, v_resolution.id, 'CREATE_ALUR_FUND', 'budgets', v_vars, 'pending');
      v_actions_created := v_actions_created + 1;

    WHEN 'SCHEDULE_ALUR_PAYMENTS' THEN
      INSERT INTO ag_pending_actions (ag_id, resolution_id, action_type, target_table, payload, status)
      VALUES (p_ag_id, v_resolution.id, 'SCHEDULE_ALUR_PAYMENTS', 'call_for_funds', v_vars, 'pending');
      v_actions_created := v_actions_created + 1;

    WHEN 'CREATE_WORK_BUDGET' THEN
      INSERT INTO budgets (copro_id, name, budget_type, status, source_ag_id)
      VALUES (v_copro_id, 'Travaux - ' || COALESCE(v_vars->>'description_travaux', v_resolution.title),
        'works', 'draft_from_ag', p_ag_id)
      RETURNING id INTO v_target_id;

      INSERT INTO ag_pending_actions (ag_id, resolution_id, action_type, target_table, target_id, payload, status)
      VALUES (p_ag_id, v_resolution.id, 'CREATE_WORK_BUDGET', 'budgets', v_target_id, v_vars, 'pending');
      v_actions_created := v_actions_created + 1;

    WHEN 'CREATE_EXCEPTIONAL_CALL' THEN
      INSERT INTO ag_pending_actions (ag_id, resolution_id, action_type, target_table, payload, status)
      VALUES (p_ag_id, v_resolution.id, 'CREATE_EXCEPTIONAL_CALL', 'call_for_funds', v_vars, 'pending');
      v_actions_created := v_actions_created + 1;

    WHEN 'APPOINT_SYNDIC' THEN
      INSERT INTO ag_pending_actions (ag_id, resolution_id, action_type, target_table, payload, status)
      VALUES (p_ag_id, v_resolution.id, 'APPOINT_SYNDIC', 'copros', v_vars, 'pending');
      v_actions_created := v_actions_created + 1;

    WHEN 'ELECT_COUNCIL' THEN
      INSERT INTO ag_pending_actions (ag_id, resolution_id, action_type, target_table, payload, status)
      VALUES (p_ag_id, v_resolution.id, 'ELECT_COUNCIL', 'council_members', v_vars, 'pending');
      v_actions_created := v_actions_created + 1;

    WHEN 'MANAGE_CONTRACT' THEN
      INSERT INTO ag_pending_actions (ag_id, resolution_id, action_type, target_table, payload, status)
      VALUES (p_ag_id, v_resolution.id, 'MANAGE_CONTRACT', 'contracts', v_vars, 'pending');
      v_actions_created := v_actions_created + 1;

    WHEN 'DESIGNATE_BUREAU' THEN
      NULL;

    WHEN 'GRANT_QUITUS' THEN
      INSERT INTO ag_pending_actions (ag_id, resolution_id, action_type, target_table, payload, status)
      VALUES (p_ag_id, v_resolution.id, 'GRANT_QUITUS', 'budgets', v_vars, 'pending');
      v_actions_created := v_actions_created + 1;

    ELSE
      NULL;
    END CASE;

  END LOOP;

  RETURN jsonb_build_object('success', true, 'actions_created', v_actions_created);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;
