-- ============================================================
-- REVIEW FIX (V0.2) — v_call_vs_budget_mismatch
-- ============================================================
-- Deux corrections issues de la review du V0 :
--  1) Cohérence avec V0.5 (v_lot_vs_gl_mismatch) : EXCLURE les brouillons
--     (status 'draft'), qui ne sont pas des appels effectifs. Avant, V0.2 ne
--     filtrait que 'cancelled' → un budget « couvert » par un appel brouillon
--     ne remontait aucun écart (faux négatif), incohérent avec V0.5 qui exclut
--     déjà les drafts.
--  2) Cross-période : sommer les appels par budget_id SEUL (et non
--     budget_id + period_id). Un appel du même budget émis sur une autre
--     période (régularisation N+1, échéancier à cheval) était silencieusement
--     ignoré → faux positif/négatif. Un budget est rattaché à UN budget_id ;
--     tous ses appels non annulés doivent compter, quelle que soit la période.
-- Colonnes inchangées → v_finance_integrity_issues (qui lit cette vue par nom)
-- reste valide sans recréation.

CREATE OR REPLACE VIEW public.v_call_vs_budget_mismatch
WITH (security_invoker = true) AS
SELECT
  b.id                       AS budget_id,
  b.copro_id,
  b.period_id,
  b.budget_type,
  b.status                   AS budget_status,
  b.version,
  b.name                     AS budget_label,
  COALESCE(bl.sum_budget, 0) AS expected_budget_total,
  COALESCE(cf.sum_calls, 0)  AS actual_calls_total,
  cf.nb_calls,
  COALESCE(bl.sum_budget, 0) - COALESCE(cf.sum_calls, 0) AS difference,
  b.created_at
FROM budgets b
LEFT JOIN (
  SELECT budget_id, SUM(amount) AS sum_budget
  FROM budget_lines
  GROUP BY budget_id
) bl ON bl.budget_id = b.id
LEFT JOIN (
  SELECT budget_id, SUM(total_amount) AS sum_calls, COUNT(*) AS nb_calls
  FROM call_for_funds
  WHERE budget_id IS NOT NULL
    AND status NOT IN ('draft'::call_for_funds_status, 'cancelled'::call_for_funds_status)
  GROUP BY budget_id
) cf ON cf.budget_id = b.id
WHERE cf.budget_id IS NOT NULL  -- ne remonter que les budgets effectivement appelés (≥ 1 appel émis)
  AND ABS(COALESCE(bl.sum_budget, 0) - COALESCE(cf.sum_calls, 0)) > 0.01;

COMMENT ON VIEW public.v_call_vs_budget_mismatch IS
  'Budgets dont la somme des appels EMIS (non draft/cancelled, tous period_id confondus) differe de la somme des budget_lines votees (tolerance 0.01 EUR). Vue de detection lecture seule.';
