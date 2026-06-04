-- ============================================================
-- V0.4 — create_alur_fund_from_ag : réparation + remontée d'erreur typée
-- PLAN_CORRECTION_VALIDE.md §3.1 item 0.4 (ch.6 item 6.F4, périmètre MINIMAL)
-- ============================================================
-- Diffs minimaux sur la fonction réelle (PAS de refonte du rôle = V3) :
--   1) fiscal_periods (table inexistante -> la fonction échouait TOUJOURS)
--      remplacée par accounting_periods ;
--   2) is_active = true -> status = 'open' (cohérent garde binaire WP5) ;
--   3) EXCEPTION WHEN OTHERS ... RETURN success=false (faux succès silencieux)
--      remplacé par un RAISE re-typé conservant le SQLSTATE d'origine.
-- Les RETURN jsonb(success=false, ...) métier (AG introuvable / pas de période)
-- sont conservés : ce sont des cas fonctionnels, pas des exceptions SQL.
-- Front inchangé : BlocALUR.tsx teste déjà result.success (pas de faux succès UI).

CREATE OR REPLACE FUNCTION public.create_alur_fund_from_ag(p_ag_id uuid, p_montant numeric, p_modalites text DEFAULT 'UNIQUE'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_copro_id UUID;
  v_period_id UUID;
  v_budget_id UUID;
  v_account_id UUID;
  v_key_id UUID;
  v_version INT;
  v_sqlstate TEXT;
  v_msg TEXT;
BEGIN
  SELECT copro_id INTO v_copro_id FROM ag_meetings WHERE id = p_ag_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'AG introuvable');
  END IF;

  SELECT period_id INTO v_period_id
  FROM budgets WHERE source_ag_id = p_ag_id AND budget_type = 'current'
  ORDER BY created_at DESC LIMIT 1;

  IF v_period_id IS NULL THEN
    SELECT id INTO v_period_id FROM accounting_periods
    WHERE copro_id = v_copro_id AND status = 'open'
    ORDER BY start_date DESC LIMIT 1;
  END IF;

  IF v_period_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Aucune période comptable ouverte trouvée');
  END IF;

  SELECT id INTO v_account_id FROM accounts
  WHERE copro_id = v_copro_id AND code = '105' AND is_active = true LIMIT 1;

  SELECT id INTO v_key_id FROM repartition_keys
  WHERE copro_id = v_copro_id AND (name ILIKE '%génér%' OR name ILIKE '%general%') AND is_active = true LIMIT 1;

  SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
  FROM budgets WHERE copro_id = v_copro_id AND budget_type = 'alur' AND period_id = v_period_id;

  INSERT INTO budgets (copro_id, period_id, budget_type, status, version, name, source_ag_id)
  VALUES (v_copro_id, v_period_id, 'alur', 'validated', v_version, 'Fonds travaux ALUR', p_ag_id)
  RETURNING id INTO v_budget_id;

  INSERT INTO budget_lines (budget_id, copro_id, label, amount, sort_order, account_id, repartition_key_id, code)
  VALUES (v_budget_id, v_copro_id, 'Fonds travaux ALUR (loi ALUR)', p_montant, 0, v_account_id, v_key_id, 'FONDS_ALUR');

  UPDATE ag_pending_actions
  SET status = 'activated',
      result_data = jsonb_build_object(
        'budget_id', v_budget_id, 'montant', p_montant, 'modalites', p_modalites,
        'account_id', v_account_id, 'repartition_key_id', v_key_id
      ),
      activated_at = NOW()
  WHERE ag_id = p_ag_id AND action_type = 'CREATE_ALUR_FUND';

  RETURN jsonb_build_object('success', true, 'budget_id', v_budget_id);
EXCEPTION
  WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    RAISE EXCEPTION 'create_alur_fund_from_ag a echoue (ag=%): %', p_ag_id, v_msg
      USING ERRCODE = v_sqlstate;
END;
$function$;
