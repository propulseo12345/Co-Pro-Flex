-- ============================================================================
-- WP5.1 — Hook AG : approbation des comptes -> approve_period + regularize_period
-- ============================================================================
-- Modifie UNIQUEMENT la branche APPROVE_ACCOUNTS de prepare_ag_decisions
-- (resout + stocke period_id dans target_id) et de activate_ag_decisions
-- (appelle approve_period(target_id) puis regularize_period). Corps repris
-- verbatim de la def live ; toutes les autres branches sont inchangees.
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
      -- Résoudre la période N visée (même logique que CREATE_BUDGET) et la stocker
      -- en target_id pour que activate_ag_decisions n'ait plus à re-matcher par dates.
      SELECT id INTO v_period_id FROM accounting_periods
      WHERE copro_id = v_copro_id
        AND start_date = (v_vars->>'date_debut')::DATE
        AND end_date   = (v_vars->>'date_fin')::DATE
      LIMIT 1;

      INSERT INTO ag_pending_actions (ag_id, resolution_id, action_type, target_table, target_id, payload, status)
      VALUES (p_ag_id, v_resolution.id, 'APPROVE_ACCOUNTS', 'accounting_periods', v_period_id, v_vars, 'pending');
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


CREATE OR REPLACE FUNCTION public.activate_ag_decisions(p_ag_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_action RECORD;
  v_activated INT := 0;
  v_copro_id UUID;
  v_enriched_payload JSONB;
  v_res JSONB;
BEGIN
  SELECT copro_id INTO v_copro_id FROM ag_meetings WHERE id = p_ag_id;

  FOR v_action IN
    SELECT * FROM ag_pending_actions
    WHERE ag_id = p_ag_id AND status = 'pending'
    ORDER BY created_at
  LOOP
    CASE v_action.action_type
      WHEN 'CREATE_BUDGET', 'CREATE_WORK_BUDGET' THEN
        UPDATE budgets SET status = 'validated', validated_at = now() WHERE id = v_action.target_id;
      WHEN 'APPROVE_ACCOUNTS' THEN
        -- Clôture des budgets de l'exercice (comportement conservé), via target_id.
        UPDATE budgets b SET status = 'closed'
        WHERE b.period_id = v_action.target_id;

        IF v_action.target_id IS NOT NULL THEN
          -- Approuver la période N (closed -> approved) : fige la reprise N+1.
          v_res := approve_period(v_action.target_id);
          IF NOT COALESCE((v_res->>'success')::boolean, false) THEN
            RAISE EXCEPTION 'Approbation de la période échouée : %', v_res->>'error';
          END IF;
          -- Point d'accroche WP5.3 (répartition excédent/déficit) — stub no-op.
          PERFORM regularize_period(v_copro_id, v_action.target_id);
        END IF;
      WHEN 'CREATE_ALUR_FUND' THEN
        IF v_action.target_id IS NOT NULL THEN
          UPDATE budgets SET status = 'validated', validated_at = now() WHERE id = v_action.target_id;
        END IF;
      WHEN 'ELECT_COUNCIL' THEN
        UPDATE council_members SET is_active = false, end_date = now()::date
        WHERE copro_id = v_copro_id AND is_active = true;
      WHEN 'MANAGE_CONTRACT' THEN
        IF v_action.target_id IS NOT NULL THEN
          UPDATE contracts SET status = 'active' WHERE id = v_action.target_id;
        END IF;
      WHEN 'SCHEDULE_BUDGET_PAYMENTS' THEN
        v_enriched_payload := v_action.payload || '{"budget_type": "current"}'::jsonb;
        PERFORM generate_calls_from_ag_payload(v_copro_id, p_ag_id, v_action.resolution_id, v_enriched_payload);
      WHEN 'SCHEDULE_ALUR_PAYMENTS' THEN
        v_enriched_payload := v_action.payload || '{"budget_type": "alur"}'::jsonb;
        PERFORM generate_calls_from_ag_payload(v_copro_id, p_ag_id, v_action.resolution_id, v_enriched_payload);
      WHEN 'CREATE_EXCEPTIONAL_CALL' THEN
        v_enriched_payload := v_action.payload || '{"budget_type": "works"}'::jsonb;
        PERFORM generate_calls_from_ag_payload(v_copro_id, p_ag_id, v_action.resolution_id, v_enriched_payload);
      WHEN 'APPOINT_SYNDIC', 'GRANT_QUITUS', 'DESIGNATE_BUREAU' THEN
        NULL;
      ELSE
        NULL;
    END CASE;

    UPDATE ag_pending_actions
    SET status = 'activated', activated_at = now(),
        result_data = jsonb_build_object('activated_at', now())
    WHERE id = v_action.id;
    v_activated := v_activated + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'activated', v_activated, 'failed', 0);
END;
$function$;
