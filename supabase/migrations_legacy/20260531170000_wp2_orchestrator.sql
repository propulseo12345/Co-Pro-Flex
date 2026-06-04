-- ============================================================================
-- WP2 — Orchestrateur d'auto-propagation des AG (vote -> budget -> appels -> GL)
-- ============================================================================
-- 2.1 finalize_and_activate_ag : calcule les résolutions -> prépare -> active,
--     de façon ATOMIQUE et IDEMPOTENTE (rejouable sans doublon).
-- 2.3 activate_ag_decisions : atomique (plus de EXCEPTION WHEN OTHERS par action
--     qui laissait une activation partielle).
-- 2.6 generate_calls_from_ag_payload : génère les appels via la route canonique
--     post_call_for_funds -> écrit au GRAND LIVRE (450-x/70x|105) + clés WP3,
--     au lieu d'insérer des appels « draft » hors comptabilité.
-- ============================================================================

-- ---- 2.6 : générateur d'appels d'AG routé par le grand livre -----------------
CREATE OR REPLACE FUNCTION public.generate_calls_from_ag_payload(
  p_copro_id uuid, p_ag_id uuid, p_resolution_id uuid, p_payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_modalite TEXT;
  v_budget_type TEXT;
  v_budget_id UUID;
  v_period_id UUID;
  v_total NUMERIC;
  v_nb_appels INT;
  v_montant_appel NUMERIC;
  v_i INT;
  v_issue_date DATE;
  v_due_date DATE;
  v_year INT;
  v_key_category TEXT;
  v_repartition_key_id UUID;
  v_label_prefix TEXT;
  v_res JSONB;
BEGIN
  v_modalite := COALESCE(p_payload->>'modalites_paiement_budget', p_payload->>'modalites_paiement', 'trimestriel');
  v_budget_type := COALESCE(p_payload->>'budget_type', 'current');

  -- Budget lié à cette AG (total = somme des lignes si présentes)
  SELECT b.id, COALESCE(SUM(bl.amount), 0), b.period_id
  INTO v_budget_id, v_total, v_period_id
  FROM budgets b
  LEFT JOIN budget_lines bl ON bl.budget_id = b.id
  WHERE b.source_ag_id = p_ag_id AND b.copro_id = p_copro_id
    AND b.budget_type = v_budget_type::budget_type
    AND b.status IN ('draft_from_ag', 'validated')
  GROUP BY b.id, b.period_id
  ORDER BY b.created_at DESC
  LIMIT 1;

  -- Pas de lignes -> on retombe sur le montant du payload
  IF v_total IS NULL OR v_total <= 0 THEN
    v_total := NULLIF(REPLACE(REPLACE(COALESCE(p_payload->>'montant', '0'), ' ', ''), ',', '.'), '')::NUMERIC;
  END IF;

  IF v_budget_id IS NULL OR v_period_id IS NULL OR v_total IS NULL OR v_total <= 0 THEN
    RETURN; -- rien à générer (budget/période/montant manquants)
  END IF;

  -- Anti-doublon (idempotence) : si des appels existent déjà pour ce budget, stop
  IF EXISTS (SELECT 1 FROM call_for_funds WHERE budget_id = v_budget_id AND status <> 'cancelled') THEN
    RETURN;
  END IF;

  CASE LOWER(v_modalite)
    WHEN 'unique', 'annuel' THEN v_nb_appels := 1;
    WHEN 'semestriel' THEN v_nb_appels := 2;
    WHEN 'trimestriel' THEN v_nb_appels := 4;
    ELSE v_nb_appels := 4;
  END CASE;
  v_montant_appel := ROUND(v_total / v_nb_appels, 2);

  SELECT EXTRACT(YEAR FROM start_date)::INT INTO v_year FROM accounting_periods WHERE id = v_period_id;

  -- Clé de répartition selon la nature (general pour courant/travaux, alur pour ALUR)
  v_key_category := CASE v_budget_type WHEN 'alur' THEN 'alur' ELSE 'general' END;
  SELECT id INTO v_repartition_key_id FROM repartition_keys
  WHERE copro_id = p_copro_id AND category = v_key_category::repartition_category AND is_active = true
  ORDER BY created_at LIMIT 1;
  IF v_repartition_key_id IS NULL THEN
    SELECT id INTO v_repartition_key_id FROM repartition_keys
    WHERE copro_id = p_copro_id AND is_active = true ORDER BY created_at LIMIT 1;
  END IF;
  IF v_repartition_key_id IS NULL THEN
    RAISE EXCEPTION 'generate_calls_from_ag_payload: aucune clé de répartition active pour la copro %', p_copro_id;
  END IF;

  v_label_prefix := CASE v_budget_type WHEN 'alur' THEN 'Appel ALUR T' WHEN 'works' THEN 'Appel Travaux T' ELSE 'Appel T' END;

  FOR v_i IN 1..v_nb_appels LOOP
    CASE v_nb_appels
      WHEN 1 THEN v_issue_date := make_date(v_year, 1, 1);              v_due_date := make_date(v_year, 1, 31);
      WHEN 2 THEN v_issue_date := make_date(v_year, (v_i - 1) * 6 + 1, 1); v_due_date := (v_issue_date + INTERVAL '30 days')::date;
      WHEN 4 THEN v_issue_date := make_date(v_year, (v_i - 1) * 3 + 1, 1); v_due_date := (v_issue_date + INTERVAL '30 days')::date;
    END CASE;

    -- Route canonique : appel + lignes par lot + écriture au grand livre (auto-post)
    v_res := post_call_for_funds(
      p_copro_id, v_period_id, v_budget_id, v_repartition_key_id,
      v_label_prefix || v_i || ' ' || v_year, v_i, v_issue_date, v_due_date, v_montant_appel, NULL
    );
    IF NOT (v_res->>'success')::boolean THEN
      RAISE EXCEPTION 'generate_calls_from_ag_payload: échec appel T% : %', v_i, v_res->>'error';
    END IF;
  END LOOP;
END;
$function$;

-- ---- 2.3 : activation ATOMIQUE (toute erreur fait rollback) -------------------
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
BEGIN
  SELECT copro_id INTO v_copro_id FROM ag_meetings WHERE id = p_ag_id;

  -- Seules les actions 'pending' sont traitées (idempotence : un rejeu ne refait rien)
  FOR v_action IN
    SELECT * FROM ag_pending_actions
    WHERE ag_id = p_ag_id AND status = 'pending'
    ORDER BY created_at
  LOOP
    CASE v_action.action_type
      WHEN 'CREATE_BUDGET', 'CREATE_WORK_BUDGET' THEN
        UPDATE budgets SET status = 'validated', validated_at = now() WHERE id = v_action.target_id;
      WHEN 'APPROVE_ACCOUNTS' THEN
        UPDATE budgets b SET status = 'closed'
        FROM accounting_periods ap
        WHERE b.period_id = ap.id AND ap.copro_id = v_copro_id
          AND ap.start_date = (v_action.payload->>'date_debut')::DATE
          AND ap.end_date = (v_action.payload->>'date_fin')::DATE;
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

-- ---- 2.1 : orchestrateur (calcul -> préparation -> activation), atomique ------
CREATE OR REPLACE FUNCTION public.finalize_and_activate_ag(p_ag_id uuid, p_activate boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_r RECORD;
  v_calc JSONB;
  v_prep JSONB;
  v_act JSONB;
  v_nb_calc INT := 0;
BEGIN
  -- 1. Calcul du résultat de chaque résolution (art.24 = exprimés, cf. WP2.7)
  FOR v_r IN SELECT id FROM ag_resolutions WHERE ag_id = p_ag_id ORDER BY resolution_number LOOP
    v_calc := calculate_resolution_result(v_r.id);
    IF NOT (v_calc->>'success')::boolean THEN
      RAISE EXCEPTION 'finalize_and_activate_ag: échec calcul résolution % : %', v_r.id, v_calc->>'error';
    END IF;
    v_nb_calc := v_nb_calc + 1;
  END LOOP;

  -- 2. Préparation des décisions — idempotent : on ne prépare pas deux fois
  IF NOT EXISTS (SELECT 1 FROM ag_pending_actions WHERE ag_id = p_ag_id) THEN
    v_prep := prepare_ag_decisions(p_ag_id);
    IF NOT (v_prep->>'success')::boolean THEN
      RAISE EXCEPTION 'finalize_and_activate_ag: échec préparation : %', v_prep->>'error';
    END IF;
  ELSE
    v_prep := jsonb_build_object('success', true, 'skipped', 'déjà préparé');
  END IF;

  -- 3. AG « finalisée » (PV en préparation, fenêtre de correction avant activation)
  UPDATE ag_meetings SET status = 'finalized', updated_at = now() WHERE id = p_ag_id;

  IF NOT p_activate THEN
    RETURN jsonb_build_object('success', true, 'phase', 'finalized',
      'resolutions_calculated', v_nb_calc, 'prepared', v_prep);
  END IF;

  -- 4. Activation (à la notification du PV) — atomique + idempotente
  v_act := activate_ag_decisions(p_ag_id);
  IF NOT (v_act->>'success')::boolean THEN
    RAISE EXCEPTION 'finalize_and_activate_ag: échec activation : %', v_act->>'error';
  END IF;

  -- 5. Gel / horodatage de la notification
  UPDATE ag_meetings SET pv_sent_at = COALESCE(pv_sent_at, now()), updated_at = now() WHERE id = p_ag_id;

  RETURN jsonb_build_object('success', true, 'phase', 'activated',
    'resolutions_calculated', v_nb_calc, 'prepared', v_prep, 'activated', v_act);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.finalize_and_activate_ag(uuid, boolean) TO authenticated, service_role;
