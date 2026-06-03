-- Lot 1 Phase 2c : câble close_period -> open_next_period -> regularize_period -> approve_period
-- dans la branche APPROVE_ACCOUNTS de activate_ag_decisions. Corps repris de la def live.
-- Ordre regularize AVANT approve : garde l'exemption d'immutabilité valide (N encore 'closed').
-- Appliquée via MCP apply_migration le 2026-06-03 (intégration boucle fermée prouvée sur copro jetable).
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
  v_open JSONB;
  v_status TEXT;
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
        IF v_action.target_id IS NULL THEN
          RAISE EXCEPTION 'APPROVE_ACCOUNTS : période à approuver introuvable (dates de la résolution non résolues en accounting_periods)';
        END IF;
        UPDATE budgets b SET status = 'closed'
        WHERE b.period_id = v_action.target_id;
        SELECT status INTO v_status FROM accounting_periods WHERE id = v_action.target_id;
        IF v_status = 'approved' THEN
          RAISE EXCEPTION 'Période déjà approuvée : %', v_action.target_id;
        ELSIF v_status = 'open' THEN
          PERFORM close_period(v_action.target_id);
        END IF;
        v_open := open_next_period(v_copro_id, v_action.target_id);
        IF NOT COALESCE((v_open->>'success')::boolean, false) THEN
          RAISE EXCEPTION 'Ouverture de l''exercice suivant échouée : %', v_open->>'error';
        END IF;
        v_res := regularize_period(v_copro_id, v_action.target_id);
        IF NOT COALESCE((v_res->>'success')::boolean, true) THEN
          RAISE EXCEPTION 'Affectation du résultat échouée : %', v_res->>'error';
        END IF;
        v_res := approve_period(v_action.target_id);
        IF NOT COALESCE((v_res->>'success')::boolean, false) THEN
          RAISE EXCEPTION 'Approbation de la période échouée : %', v_res->>'error';
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
