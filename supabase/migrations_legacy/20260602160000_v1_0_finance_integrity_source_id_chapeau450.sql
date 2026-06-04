-- =====================================================================
-- V1.0 — Filets d'intégrité grand livre (lecture seule, aucun changement de données)
-- Étend v_finance_integrity_issues avec 2 contrôles préalables à V1 :
--   * SOURCE_ID_MISSING   : écritures posted sans source_id (pièce art.6)
--   * CHAPEAU_450_POSTED  : écritures posted sur le chapeau 450 (agrégateur)
--                           des copros qui disposent AUSSI de sous-comptes 450-x
-- Sert d'état de référence AVANT 1.5/1.4 (le chapeau doit revenir à net=0
-- avant d'activer is_postable=false sur la copro concernée).
-- Reproduit à l'identique les 6 branches existantes + ajoute 2 branches.
-- =====================================================================

CREATE OR REPLACE VIEW public.v_finance_integrity_issues AS
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
 SELECT 'budget'::text AS entity_type,
    m.budget_id AS entity_id,
    m.copro_id,
    COALESCE(m.budget_label, 'Budget '::text || m.budget_type::text) AS description,
    m.expected_budget_total::numeric(12,2) AS expected_amount,
    m.actual_calls_total AS actual_amount,
    m.difference,
    'CALL_VS_BUDGET_MISMATCH'::text AS issue_type,
    m.created_at
   FROM v_call_vs_budget_mismatch m
UNION ALL
 SELECT 'lot'::text AS entity_type,
    g.lot_id AS entity_id,
    g.copro_id,
    'Écart relevé/GL - lot '::text || COALESCE(g.lot_ref, g.lot_id::text) AS description,
    g.gl_balance::numeric(12,2) AS expected_amount,
    g.statement_balance AS actual_amount,
    g.difference,
    'LOT_GL_MISMATCH'::text AS issue_type,
    now() AS created_at
   FROM v_lot_vs_gl_mismatch g
-- ---------- V1.0 : nouveaux contrôles ----------
UNION ALL
 SELECT 'ledger_transaction'::text AS entity_type,
    lt.id AS entity_id,
    lt.copro_id,
    ('Écriture posted sans source_id (' || lt.source_type || ')')::text AS description,
    NULL::numeric(12,2) AS expected_amount,
    NULL::numeric AS actual_amount,
    NULL::numeric AS difference,
    'SOURCE_ID_MISSING'::text AS issue_type,
    lt.created_at
   FROM ledger_transactions lt
  WHERE lt.status = 'posted' AND lt.source_id IS NULL
UNION ALL
 SELECT 'account'::text AS entity_type,
    a.id AS entity_id,
    a.copro_id,
    'Chapeau 450 (agrégateur) porte des écritures posted'::text AS description,
    0::numeric(12,2) AS expected_amount,
    sum(CASE WHEN le.direction = 'debit' THEN le.amount ELSE - le.amount END) AS actual_amount,
    sum(CASE WHEN le.direction = 'debit' THEN le.amount ELSE - le.amount END) AS difference,
    'CHAPEAU_450_POSTED'::text AS issue_type,
    now() AS created_at
   FROM accounts a
     JOIN ledger_entries le ON le.account_id = a.id
     JOIN ledger_transactions lt2 ON lt2.id = le.tx_id AND lt2.status = 'posted'
  WHERE a.code = '450'
    AND EXISTS (SELECT 1 FROM accounts a2 WHERE a2.copro_id = a.copro_id AND a2.code LIKE '450-%')
  GROUP BY a.id, a.copro_id
 HAVING count(le.id) > 0;
