-- ============================================================================
-- WP4.1 — Corriger les 6 chemins JSON faux de fn_dashboard_kpis
-- ============================================================================
-- fn_dashboard_kpis lisait des clés inexistantes dans fn_annexe_1 / fn_annexe_2
-- (ex: section_i->tresorerie->>'total' alors que 'tresorerie' est un tableau et
-- le total vit dans total_tresorerie->>'exercice_clos'). Résultat : 0 partout.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_dashboard_kpis(p_copro_id uuid, p_period_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_annexe1 jsonb;
  v_annexe2 jsonb;
  v_annexe4 jsonb;
  v_result jsonb;
  v_budget_vote numeric := 0;
  v_budget_realise numeric := 0;
  v_travaux_en_cours numeric := 0;
  v_nb_travaux_ouverts integer := 0;
BEGIN
  v_annexe1 := fn_annexe_1(p_copro_id, p_period_id);
  v_annexe2 := fn_annexe_2(p_copro_id, p_period_id);
  v_annexe4 := fn_annexe_4(p_copro_id, p_period_id);

  v_budget_vote := COALESCE((v_annexe2->'total_i_charges'->>'ex_clos_budget_vote')::numeric, 0);
  v_budget_realise := COALESCE((v_annexe2->'total_i_charges'->>'ex_clos_realise')::numeric, 0);

  SELECT COALESCE(SUM((op->>'solde')::numeric), 0), COUNT(*)
  INTO v_travaux_en_cours, v_nb_travaux_ouverts
  FROM jsonb_array_elements(v_annexe4->'operations') AS op
  WHERE (op->>'solde')::numeric > 0;

  v_result := jsonb_build_object(
    'tresorerie',         COALESCE((v_annexe1->'section_i'->'total_tresorerie'->>'exercice_clos')::numeric, 0),
    'total_impayes',      COALESCE((v_annexe1->'section_ii'->'total_creances'->>'exercice_clos')::numeric, 0),
    'provisions_travaux', COALESCE((v_annexe1->'section_i'->'total_provisions'->>'exercice_clos')::numeric, 0),
    'dettes',             COALESCE((v_annexe1->'section_ii'->'total_dettes'->>'exercice_clos')::numeric, 0),
    'budget_vote',        v_budget_vote,
    'budget_realise',     v_budget_realise,
    'budget_pct', CASE WHEN v_budget_vote > 0 THEN ROUND(v_budget_realise / v_budget_vote * 100, 1) ELSE 0 END,
    'travaux_en_cours',   v_travaux_en_cours,
    'nb_travaux_ouverts', v_nb_travaux_ouverts
  );
  RETURN v_result;
END;
$function$;

-- ============================================================================
-- WP4.6 — « voté » = validated|closed (exclure les budgets 'submitted')
-- ============================================================================
-- Dans fn_annexe_2, le CTE budgeted incluait 'submitted' -> un budget seulement
-- soumis (non voté) gonflait le budget affiché. On retire 'submitted'.
CREATE OR REPLACE FUNCTION public.fn_annexe_2(p_copro_id uuid, p_period_id uuid, p_next_period_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  v_prev_period_id uuid;
  v_next_next_period_id uuid;
  v_result jsonb;
BEGIN
  SELECT ap_prev.id INTO v_prev_period_id
  FROM accounting_periods ap_cur
  JOIN accounting_periods ap_prev
    ON ap_prev.copro_id = ap_cur.copro_id
    AND ap_prev.end_date < ap_cur.start_date
  WHERE ap_cur.id = p_period_id
  ORDER BY ap_prev.end_date DESC
  LIMIT 1;

  IF p_next_period_id IS NOT NULL THEN
    SELECT ap_nn.id INTO v_next_next_period_id
    FROM accounting_periods ap_next
    JOIN accounting_periods ap_nn
      ON ap_nn.copro_id = ap_next.copro_id
      AND ap_nn.start_date > ap_next.end_date
    WHERE ap_next.id = p_next_period_id
    ORDER BY ap_nn.start_date ASC
    LIMIT 1;
  END IF;

  WITH
  realized AS (
    SELECT a.code AS account_code, a.name AS account_name, le.period_id,
      SUM(CASE WHEN le.direction = 'debit' THEN le.amount ELSE 0 END) AS total_debit,
      SUM(CASE WHEN le.direction = 'credit' THEN le.amount ELSE 0 END) AS total_credit
    FROM ledger_entries le
    JOIN ledger_transactions lt ON lt.id = le.tx_id AND lt.status = 'posted'
    JOIN accounts a ON a.id = le.account_id
    WHERE le.copro_id = p_copro_id
      AND le.period_id IN (p_period_id, v_prev_period_id)
      AND (a.code LIKE '6%' OR a.code LIKE '7%')
    GROUP BY a.code, a.name, le.period_id
  ),
  budgeted AS (
    SELECT COALESCE(bl.code, a.code) AS account_code, COALESCE(bl.label, a.name) AS account_name,
      b.period_id, b.budget_type, SUM(bl.amount) AS budget_amount
    FROM budget_lines bl
    JOIN budgets b ON b.id = bl.budget_id
    LEFT JOIN accounts a ON a.id = bl.account_id
    WHERE bl.copro_id = p_copro_id
      AND b.status IN ('validated', 'closed')
      AND b.period_id IN (p_period_id, v_prev_period_id, p_next_period_id, v_next_next_period_id)
    GROUP BY COALESCE(bl.code, a.code), COALESCE(bl.label, a.name), b.period_id, b.budget_type
  ),
  all_charge_accounts AS (
    SELECT DISTINCT account_code, account_name FROM (
      SELECT account_code, account_name FROM realized WHERE account_code LIKE '6%'
      UNION
      SELECT account_code, account_name FROM budgeted WHERE account_code LIKE '6%'
    ) u
  ),
  all_product_accounts AS (
    SELECT DISTINCT account_code, account_name FROM (
      SELECT account_code, account_name FROM realized WHERE account_code LIKE '7%'
      UNION
      SELECT account_code, account_name FROM budgeted WHERE account_code LIKE '7%'
    ) u
  ),
  charge_lines AS (
    SELECT aca.account_code AS compte, aca.account_name AS libelle,
      COALESCE((SELECT r.total_debit - r.total_credit FROM realized r WHERE r.account_code = aca.account_code AND r.period_id = v_prev_period_id), 0) AS ex_precedent_approuve,
      COALESCE((SELECT bg.budget_amount FROM budgeted bg WHERE bg.account_code = aca.account_code AND bg.period_id = p_period_id AND bg.budget_type = 'current'), 0) AS ex_clos_budget_vote,
      COALESCE((SELECT r.total_debit - r.total_credit FROM realized r WHERE r.account_code = aca.account_code AND r.period_id = p_period_id), 0) AS ex_clos_realise,
      COALESCE((SELECT bg.budget_amount FROM budgeted bg WHERE bg.account_code = aca.account_code AND bg.period_id = p_next_period_id AND bg.budget_type = 'current'), 0) AS bp_en_cours_vote,
      COALESCE((SELECT bg.budget_amount FROM budgeted bg WHERE bg.account_code = aca.account_code AND bg.period_id = v_next_next_period_id AND bg.budget_type = 'current'), 0) AS bp_a_voter
    FROM all_charge_accounts aca ORDER BY aca.account_code
  ),
  product_lines AS (
    SELECT apa.account_code AS compte, apa.account_name AS libelle,
      COALESCE((SELECT r.total_credit - r.total_debit FROM realized r WHERE r.account_code = apa.account_code AND r.period_id = v_prev_period_id), 0) AS ex_precedent_approuve,
      COALESCE((SELECT bg.budget_amount FROM budgeted bg WHERE bg.account_code = apa.account_code AND bg.period_id = p_period_id AND bg.budget_type = 'current'), 0) AS ex_clos_budget_vote,
      COALESCE((SELECT r.total_credit - r.total_debit FROM realized r WHERE r.account_code = apa.account_code AND r.period_id = p_period_id), 0) AS ex_clos_realise,
      COALESCE((SELECT bg.budget_amount FROM budgeted bg WHERE bg.account_code = apa.account_code AND bg.period_id = p_next_period_id AND bg.budget_type = 'current'), 0) AS bp_en_cours_vote,
      COALESCE((SELECT bg.budget_amount FROM budgeted bg WHERE bg.account_code = apa.account_code AND bg.period_id = v_next_next_period_id AND bg.budget_type = 'current'), 0) AS bp_a_voter
    FROM all_product_accounts apa ORDER BY apa.account_code
  ),
  works_charge_accounts AS (
    SELECT DISTINCT account_code, account_name FROM (
      SELECT account_code, account_name FROM budgeted WHERE account_code LIKE '6%' AND budget_type = 'works'
    ) u
  ),
  works_charge_lines AS (
    SELECT wca.account_code AS compte, wca.account_name AS libelle,
      COALESCE((SELECT r.total_debit - r.total_credit FROM realized r WHERE r.account_code = wca.account_code AND r.period_id = v_prev_period_id), 0) AS ex_precedent_approuve,
      COALESCE((SELECT bg.budget_amount FROM budgeted bg WHERE bg.account_code = wca.account_code AND bg.period_id = p_period_id AND bg.budget_type = 'works'), 0) AS ex_clos_budget_vote,
      COALESCE((SELECT r.total_debit - r.total_credit FROM realized r WHERE r.account_code = wca.account_code AND r.period_id = p_period_id), 0) AS ex_clos_realise
    FROM works_charge_accounts wca ORDER BY wca.account_code
  )
  SELECT jsonb_build_object(
    'charges_courantes', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'compte', cl.compte, 'libelle', cl.libelle,
      'ex_precedent_approuve', cl.ex_precedent_approuve, 'ex_clos_budget_vote', cl.ex_clos_budget_vote,
      'ex_clos_realise', cl.ex_clos_realise, 'bp_en_cours_vote', cl.bp_en_cours_vote, 'bp_a_voter', cl.bp_a_voter
    ) ORDER BY cl.compte) FROM charge_lines cl), '[]'::jsonb),
    'sous_total_charges', jsonb_build_object(
      'ex_precedent_approuve', COALESCE((SELECT SUM(ex_precedent_approuve) FROM charge_lines), 0),
      'ex_clos_budget_vote', COALESCE((SELECT SUM(ex_clos_budget_vote) FROM charge_lines), 0),
      'ex_clos_realise', COALESCE((SELECT SUM(ex_clos_realise) FROM charge_lines), 0),
      'bp_en_cours_vote', COALESCE((SELECT SUM(bp_en_cours_vote) FROM charge_lines), 0),
      'bp_a_voter', COALESCE((SELECT SUM(bp_a_voter) FROM charge_lines), 0)
    ),
    'solde_charges', jsonb_build_object(
      'ex_precedent_approuve', COALESCE((SELECT SUM(ex_precedent_approuve) FROM product_lines), 0) - COALESCE((SELECT SUM(ex_precedent_approuve) FROM charge_lines), 0),
      'ex_clos_budget_vote', null,
      'ex_clos_realise', COALESCE((SELECT SUM(ex_clos_realise) FROM product_lines), 0) - COALESCE((SELECT SUM(ex_clos_realise) FROM charge_lines), 0),
      'bp_en_cours_vote', null, 'bp_a_voter', null
    ),
    'total_i_charges', jsonb_build_object(
      'ex_precedent_approuve', COALESCE((SELECT SUM(ex_precedent_approuve) FROM product_lines), 0),
      'ex_clos_budget_vote', COALESCE((SELECT SUM(ex_clos_budget_vote) FROM charge_lines), 0),
      'ex_clos_realise', COALESCE((SELECT SUM(ex_clos_realise) FROM product_lines), 0),
      'bp_en_cours_vote', COALESCE((SELECT SUM(bp_en_cours_vote) FROM charge_lines), 0),
      'bp_a_voter', COALESCE((SELECT SUM(bp_a_voter) FROM charge_lines), 0)
    ),
    'produits_courants', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'compte', pl.compte, 'libelle', pl.libelle,
      'ex_precedent_approuve', pl.ex_precedent_approuve, 'ex_clos_budget_vote', pl.ex_clos_budget_vote,
      'ex_clos_realise', pl.ex_clos_realise, 'bp_en_cours_vote', pl.bp_en_cours_vote, 'bp_a_voter', pl.bp_a_voter
    ) ORDER BY pl.compte) FROM product_lines pl), '[]'::jsonb),
    'sous_total_produits', jsonb_build_object(
      'ex_precedent_approuve', COALESCE((SELECT SUM(ex_precedent_approuve) FROM product_lines), 0),
      'ex_clos_budget_vote', COALESCE((SELECT SUM(ex_clos_budget_vote) FROM product_lines), 0),
      'ex_clos_realise', COALESCE((SELECT SUM(ex_clos_realise) FROM product_lines), 0),
      'bp_en_cours_vote', COALESCE((SELECT SUM(bp_en_cours_vote) FROM product_lines), 0),
      'bp_a_voter', COALESCE((SELECT SUM(bp_a_voter) FROM product_lines), 0)
    ),
    'charges_travaux', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'compte', wcl.compte, 'libelle', wcl.libelle,
      'ex_precedent_approuve', wcl.ex_precedent_approuve, 'ex_clos_budget_vote', wcl.ex_clos_budget_vote,
      'ex_clos_realise', wcl.ex_clos_realise
    ) ORDER BY wcl.compte) FROM works_charge_lines wcl), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;