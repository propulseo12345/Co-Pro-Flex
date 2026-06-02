-- ============================================================
-- V0.5 — Filet de détection (Gap G3) : relevé de compte ≠ Grand Livre
-- PLAN_CORRECTION_VALIDE.md §3.1 item 0.5 (GAP G3)
-- ============================================================
-- Le relevé légal (basé sur call_for_funds_lines + paiements) est construit
-- HORS-GL et diverge du Grand Livre (écarts connus -423 à +30 € sur la boucle
-- d'or). Vue de DÉTECTION lecture seule : on ne corrige PAS le relevé (V4/G3).
--
-- Grain = LOT (règle métier : l'unité est le lot, jamais le copropriétaire).
-- RÉUTILISATION (anti-doublon) :
--   * côté GL  -> v_lot_balance (déjà = créance par lot : lot_id n'existe en GL
--                 que sur les comptes 450/450-1/450-3/450-5, tous "450%").
--   * côté relevé -> agrégat call_for_funds_lines au grain LOT (pas
--                 v_owner_financial_summary qui est au grain propriétaire et
--                 double-compterait un lot en indivision).
-- FULL OUTER JOIN pour capter aussi un lot appelé mais jamais posté au GL
-- (relevé sans contrepartie GL) ou l'inverse.
-- difference = gl_balance - statement_balance (GL = source de référence).

CREATE OR REPLACE VIEW public.v_lot_vs_gl_mismatch
WITH (security_invoker = true) AS
WITH releve AS (
  SELECT cfl.copro_id,
         cfl.lot_id,
         SUM(cfl.amount_due - COALESCE(cfl.amount_paid, 0)) AS statement_balance
  FROM call_for_funds_lines cfl
  JOIN call_for_funds cf ON cf.id = cfl.call_id
  WHERE cf.status NOT IN ('draft'::call_for_funds_status, 'cancelled'::call_for_funds_status)
  GROUP BY cfl.copro_id, cfl.lot_id
)
SELECT
  COALESCE(lb.copro_id, r.copro_id)              AS copro_id,
  COALESCE(lb.lot_id, r.lot_id)                  AS lot_id,
  l.ref                                          AS lot_ref,
  lb.owner_name,
  COALESCE(lb.balance, 0)                        AS gl_balance,
  COALESCE(r.statement_balance, 0)               AS statement_balance,
  COALESCE(lb.balance, 0) - COALESCE(r.statement_balance, 0) AS difference
FROM v_lot_balance lb
FULL OUTER JOIN releve r ON r.lot_id = lb.lot_id AND r.copro_id = lb.copro_id
LEFT JOIN lots l ON l.id = COALESCE(lb.lot_id, r.lot_id)
WHERE ABS(COALESCE(lb.balance, 0) - COALESCE(r.statement_balance, 0)) > 0.01;

COMMENT ON VIEW public.v_lot_vs_gl_mismatch IS
  'Lots dont le solde du releve de compte (call_for_funds_lines du/paye) diverge du solde Grand Livre (v_lot_balance, comptes 450%). Vue de detection lecture seule (Gap G3). Grain lot.';

-- ------------------------------------------------------------
-- Exposition : recréation de v_finance_integrity_issues avec les 4 blocs
-- d'origine + bloc 5 (V0.2 CALL_VS_BUDGET) + bloc 6 (V0.5 LOT_GL).
-- security_invoker=true préservé.
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
-- V0.2 : bloc 5 — écart appels / budget voté
 SELECT 'budget'::text AS entity_type,
    m.budget_id AS entity_id,
    m.copro_id,
    COALESCE(m.budget_label, 'Budget '::text || m.budget_type::text) AS description,
    m.expected_budget_total::numeric(12,2) AS expected_amount,
    m.actual_calls_total AS actual_amount,
    m.difference AS difference,
    'CALL_VS_BUDGET_MISMATCH'::text AS issue_type,
    m.created_at
   FROM public.v_call_vs_budget_mismatch m
UNION ALL
-- >>> V0.5 : NOUVEAU BLOC 6 — écart relevé / Grand Livre (par lot) <<<
 SELECT 'lot'::text AS entity_type,
    g.lot_id AS entity_id,
    g.copro_id,
    ('Écart relevé/GL - lot '::text || COALESCE(g.lot_ref, g.lot_id::text)) AS description,
    g.gl_balance::numeric(12,2) AS expected_amount,
    g.statement_balance AS actual_amount,
    g.difference AS difference,
    'LOT_GL_MISMATCH'::text AS issue_type,
    now() AS created_at
   FROM public.v_lot_vs_gl_mismatch g;
