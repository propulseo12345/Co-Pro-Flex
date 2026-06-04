-- ============================================================================
-- WP5.1 (fix code-review) — activate_ag_decisions : échec FRANC si la période
-- à approuver ne se résout pas (au lieu d'un no-op silencieux).
-- ============================================================================
-- BUG corrigé : dans la branche APPROVE_ACCOUNTS, si la résolution de période
-- (par dates) échouait, target_id restait NULL ; approve_period n'était alors
-- jamais appelé MAIS l'action était marquée 'activated' -> l'AG « approuvait les
-- comptes » sans jamais figer la période, silencieusement. On lève désormais une
-- exception (rollback de l'activation) quand target_id est NULL. Reste du corps
-- repris verbatim de la def live ; seule la branche APPROVE_ACCOUNTS change.
-- ============================================================================
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
        -- Échec franc si la période n'a pas été résolue (dates non concordantes) :
        -- mieux qu'une approbation silencieusement sans effet.
        IF v_action.target_id IS NULL THEN
          RAISE EXCEPTION 'APPROVE_ACCOUNTS : période à approuver introuvable (dates de la résolution non résolues en accounting_periods)';
        END IF;
        -- Clôture des budgets de l'exercice (comportement conservé), via target_id.
        UPDATE budgets b SET status = 'closed'
        WHERE b.period_id = v_action.target_id;
        -- Approuver la période N (closed -> approved) : fige la reprise N+1.
        v_res := approve_period(v_action.target_id);
        IF NOT COALESCE((v_res->>'success')::boolean, false) THEN
          RAISE EXCEPTION 'Approbation de la période échouée : %', v_res->>'error';
        END IF;
        -- Point d'accroche WP5.3 (répartition excédent/déficit) — stub no-op.
        PERFORM regularize_period(v_copro_id, v_action.target_id);
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
