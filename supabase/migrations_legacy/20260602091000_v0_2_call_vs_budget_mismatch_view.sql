-- ============================================================
-- V0.2 — Filet de détection : Σ appels (non annulés) ≠ budget voté
-- PLAN_CORRECTION_VALIDE.md §3.1 item 0.2 ([improve], ch.3 item 3.3)
-- ============================================================
-- Détecte les budgets dont la somme des appels de fonds non annulés
-- (bornée par budget_id ET period_id) diffère de la somme des budget_lines
-- votées. Tolérance 0,01 € : on NE relève PAS le seuil (l'écart seed +0,16 €
-- de la boucle d'or DOIT rester visible).
-- Aucune vue existante ne compare budget↔appels (v_budget_consumption_by_account
-- compare au RÉALISÉ classe 6, pas aux appels) -> pas de doublon.

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
  SELECT budget_id, period_id, SUM(total_amount) AS sum_calls, COUNT(*) AS nb_calls
  FROM call_for_funds
  WHERE budget_id IS NOT NULL
    AND status <> 'cancelled'
  GROUP BY budget_id, period_id
) cf ON cf.budget_id = b.id AND cf.period_id = b.period_id
WHERE cf.budget_id IS NOT NULL  -- ne remonter que les budgets effectivement appelés
  AND ABS(COALESCE(bl.sum_budget, 0) - COALESCE(cf.sum_calls, 0)) > 0.01;

COMMENT ON VIEW public.v_call_vs_budget_mismatch IS
  'Budgets dont la somme des appels non annules (bornee budget_id + period_id) differe de la somme des budget_lines votees (tolerance 0.01 EUR). Vue de detection lecture seule.';

-- ------------------------------------------------------------
-- Exposition dans la vue consolidée : 4 blocs existants INCHANGÉS + 5e bloc.
-- (CREATE OR REPLACE remplace tout le corps -> on recolle les 4 blocs verbatim.)
-- security_invoker=true préservé (sinon régression du modèle de sécurité).
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_finance_integrity_issues
WITH (security_invoker = true) AS
 SELECT 'call_for_funds'::text AS entity_type,
    cf.id AS entity_id,
    cf.copro_id,
    cf.label AS description,
    cf.total_amount AS expected_amount,
    COALESCE(sum(cfl.amount_due), 0::numeric) AS actual_amount,
    cf.total_amount - COALESCE(sum(cfl.amount_due), 0::numeric) AS difference,
    'TOTAL_MISMATCH'::text AS issue_type,
    cf.created_at
   FROM call_for_funds cf
     LEFT JOIN call_for_funds_lines cfl ON cfl.call_id = cf.id
  GROUP BY cf.id
 HAVING abs(cf.total_amount - COALESCE(sum(cfl.amount_due), 0::numeric)) > 0.01
UNION ALL
 SELECT 'supplier_invoice'::text AS entity_type,
    si.id AS entity_id,
    si.copro_id,
    si.label AS description,
    si.total_amount AS expected_amount,
    COALESCE(sum(sil.amount), 0::numeric) AS actual_amount,
    si.total_amount - COALESCE(sum(sil.amount), 0::numeric) AS difference,
    'TOTAL_MISMATCH'::text AS issue_type,
    si.created_at
   FROM supplier_invoices si
     LEFT JOIN supplier_invoice_lines sil ON sil.invoice_id = si.id
  GROUP BY si.id
 HAVING abs(si.total_amount - COALESCE(sum(sil.amount), 0::numeric)) > 0.01
UNION ALL
 SELECT 'payment'::text AS entity_type,
    p.id AS entity_id,
    p.copro_id,
    concat('Paiement ', p.reference) AS description,
    p.amount AS expected_amount,
    COALESCE(sum(pa.amount_allocated), 0::numeric) AS actual_amount,
    p.amount - COALESCE(sum(pa.amount_allocated), 0::numeric) AS difference,
        CASE
            WHEN COALESCE(sum(pa.amount_allocated), 0::numeric) > (p.amount + 0.01) THEN 'OVER_ALLOCATED'::text
            ELSE 'UNDER_ALLOCATED'::text
        END AS issue_type,
    p.created_at
   FROM payments p
     LEFT JOIN payment_allocations pa ON pa.payment_id = p.id
  GROUP BY p.id
 HAVING COALESCE(sum(pa.amount_allocated), 0::numeric) > (p.amount + 0.01)
UNION ALL
 SELECT 'supplier_invoice'::text AS entity_type,
    si.id AS entity_id,
    si.copro_id,
    si.label AS description,
    si.total_amount AS expected_amount,
    COALESCE(sum(sp.amount), 0::numeric) AS actual_amount,
    si.total_amount - COALESCE(sum(sp.amount), 0::numeric) AS difference,
    'OVER_PAID'::text AS issue_type,
    si.created_at
   FROM supplier_invoices si
     LEFT JOIN supplier_payments sp ON sp.supplier_invoice_id = si.id
  GROUP BY si.id
 HAVING COALESCE(sum(sp.amount), 0::numeric) > (si.total_amount + 0.01)
UNION ALL
-- >>> V0.2 : NOUVEAU BLOC 5 — écart appels / budget voté <<<
 SELECT 'budget'::text AS entity_type,
    m.budget_id AS entity_id,
    m.copro_id,
    COALESCE(m.budget_label, 'Budget '::text || m.budget_type::text) AS description,
    m.expected_budget_total::numeric(12,2) AS expected_amount,
    m.actual_calls_total AS actual_amount,
    m.difference AS difference,
    'CALL_VS_BUDGET_MISMATCH'::text AS issue_type,
    m.created_at
   FROM public.v_call_vs_budget_mismatch m;
