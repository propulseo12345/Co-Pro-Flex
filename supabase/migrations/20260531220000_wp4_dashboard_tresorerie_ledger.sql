-- ============================================================================
-- WP4 (finitions) — Trésorerie du dashboard = solde RÉEL du grand livre (cumulé)
-- ----------------------------------------------------------------------------
-- fn_dashboard_kpis lisait la trésorerie depuis fn_annexe_1, qui est scopée à
-- LA PÉRIODE (mouvements de l'exercice), pas le SOLDE de caisse. Résultat : elle
-- ignorait le report des exercices antérieurs (ex. un solde d'ouverture), donc
-- divergeait du Portefeuille (qui, lui, somme le grand livre 512 cumulé).
--
-- Une « trésorerie » = le solde réel des comptes 512 = somme cumulée des
-- écritures postées (toutes périodes). On l'aligne donc sur le grand livre, comme
-- v_dashboard_kpis → les deux écrans affichent le MÊME chiffre.
-- (dettes, provisions, budget restent inchangés.)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_dashboard_kpis(p_copro_id uuid, p_period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_annexe1 jsonb;
  v_annexe2 jsonb;
  v_annexe4 jsonb;
  v_result jsonb;
  v_tresorerie numeric := 0;
  v_budget_vote numeric := 0;
  v_budget_realise numeric := 0;
  v_total_impayes numeric := 0;
  v_travaux_en_cours numeric := 0;
  v_nb_travaux_ouverts integer := 0;
BEGIN
  v_annexe1 := fn_annexe_1(p_copro_id, p_period_id);
  v_annexe2 := fn_annexe_2(p_copro_id, p_period_id);
  v_annexe4 := fn_annexe_4(p_copro_id, p_period_id);

  v_budget_vote := COALESCE((v_annexe2->'total_i_charges'->>'ex_clos_budget_vote')::numeric, 0);
  v_budget_realise := COALESCE((v_annexe2->'total_i_charges'->>'ex_clos_realise')::numeric, 0);

  -- Trésorerie = solde RÉEL des comptes 512 (hors 5121 travaux) au grand livre posté, CUMULÉ
  SELECT COALESCE(SUM(CASE WHEN e.direction = 'debit' THEN e.amount ELSE -e.amount END), 0)
  INTO v_tresorerie
  FROM ledger_entries e
  JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted'
  JOIN accounts a ON a.id = e.account_id
  WHERE e.copro_id = p_copro_id AND a.code LIKE '512%' AND a.code NOT LIKE '5121%';

  -- Impayé ÉCHU (vue canonique)
  SELECT COALESCE(SUM(total_unpaid), 0) INTO v_total_impayes
  FROM v_unpaid_by_lot WHERE copro_id = p_copro_id;

  SELECT COALESCE(SUM((op->>'solde')::numeric), 0), COUNT(*)
  INTO v_travaux_en_cours, v_nb_travaux_ouverts
  FROM jsonb_array_elements(v_annexe4->'operations') AS op
  WHERE (op->>'solde')::numeric > 0;

  v_result := jsonb_build_object(
    'tresorerie',         v_tresorerie,
    'total_impayes',      v_total_impayes,
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
