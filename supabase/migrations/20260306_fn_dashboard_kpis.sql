CREATE OR REPLACE FUNCTION fn_dashboard_kpis(
  p_copro_id uuid,
  p_period_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
  -- Get annexe 1 data (tresorerie, provisions, creances, dettes)
  v_annexe1 := fn_annexe_1(p_copro_id, p_period_id);

  -- Get annexe 2 data (budget vote vs realise)
  v_annexe2 := fn_annexe_2(p_copro_id, p_period_id);

  -- Get annexe 4 data (travaux)
  v_annexe4 := fn_annexe_4(p_copro_id, p_period_id);

  -- Extract budget totals from annexe 2
  v_budget_vote := COALESCE(
    (v_annexe2->'total_charges'->>'ex_clos_budget')::numeric, 0
  );
  v_budget_realise := COALESCE(
    (v_annexe2->'total_charges'->>'ex_clos_realise')::numeric, 0
  );

  -- Count open works from annexe 4
  SELECT
    COALESCE(SUM((op->>'solde')::numeric), 0),
    COUNT(*)
  INTO v_travaux_en_cours, v_nb_travaux_ouverts
  FROM jsonb_array_elements(v_annexe4->'operations') AS op
  WHERE (op->>'solde')::numeric > 0;

  v_result := jsonb_build_object(
    'tresorerie', COALESCE((v_annexe1->'section_i'->'tresorerie'->>'total')::numeric, 0),
    'total_impayes', COALESCE((v_annexe1->'section_ii'->'creances'->>'total')::numeric, 0),
    'provisions_travaux', COALESCE((v_annexe1->'section_i'->'provisions'->>'total')::numeric, 0),
    'dettes', COALESCE((v_annexe1->'section_ii'->'dettes'->>'total')::numeric, 0),
    'budget_vote', v_budget_vote,
    'budget_realise', v_budget_realise,
    'budget_pct', CASE WHEN v_budget_vote > 0
      THEN ROUND(v_budget_realise / v_budget_vote * 100, 1)
      ELSE 0
    END,
    'travaux_en_cours', v_travaux_en_cours,
    'nb_travaux_ouverts', v_nb_travaux_ouverts
  );

  RETURN v_result;
END;
$$;
