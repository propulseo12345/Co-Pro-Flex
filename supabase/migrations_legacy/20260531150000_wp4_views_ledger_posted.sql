-- ============================================================================
-- WP4 (suite) — Aligner les vues sur le grand livre POSTÉ + impayé canonique
-- ============================================================================
-- 4.3 v_general_ledger_by_account_class : ne comptait pas que les écritures
--     postées (brouillons inclus). 4.5 v_budget_consumption_by_account : réalisé
--     sans filtre 'posted' + n'incluait que 'validated' (ajout 'closed').
-- 4.9 v_unpaid_by_lot : impayé = appels ÉCHUS non lettrés (pas le solde net 450).
-- ============================================================================

-- ---- 4.3 -------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_general_ledger_by_account_class AS
SELECT a.copro_id,
    left(a.code, 1) AS account_class,
    CASE left(a.code, 1)
        WHEN '1' THEN 'Capitaux' WHEN '2' THEN 'Immobilisations' WHEN '3' THEN 'Stocks'
        WHEN '4' THEN 'Tiers' WHEN '5' THEN 'Financiers' WHEN '6' THEN 'Charges'
        WHEN '7' THEN 'Produits' ELSE 'Autres'
    END AS class_label,
    COALESCE(sum(CASE WHEN le.direction = 'debit'  AND lt.status = 'posted' THEN le.amount ELSE 0 END), 0) AS total_debit,
    COALESCE(sum(CASE WHEN le.direction = 'credit' AND lt.status = 'posted' THEN le.amount ELSE 0 END), 0) AS total_credit,
    COALESCE(sum(CASE WHEN le.direction = 'debit'  AND lt.status = 'posted' THEN le.amount ELSE 0 END), 0)
      - COALESCE(sum(CASE WHEN le.direction = 'credit' AND lt.status = 'posted' THEN le.amount ELSE 0 END), 0) AS balance,
    count(le.id) FILTER (WHERE lt.status = 'posted') AS entry_count,
    count(DISTINCT a.id) AS account_count
FROM accounts a
LEFT JOIN ledger_entries le ON le.account_id = a.id
LEFT JOIN ledger_transactions lt ON lt.id = le.tx_id
GROUP BY a.copro_id, left(a.code, 1);

-- ---- 4.5 -------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_budget_consumption_by_account AS
SELECT bl.copro_id, bl.budget_id, b.period_id,
    ap.name AS period_name, ap.start_date AS period_start, ap.end_date AS period_end,
    bl.account_id, a.code AS account_code, a.name AS account_name,
    bl.label AS budget_line_label, bl.amount AS budgeted_amount,
    COALESCE(realized.total_spent, 0) AS realized_amount,
    bl.amount - COALESCE(realized.total_spent, 0) AS variance,
    CASE WHEN bl.amount > 0 THEN round(COALESCE(realized.total_spent, 0) / bl.amount * 100, 2) ELSE 0 END AS consumption_rate_percent,
    CASE
        WHEN bl.amount = 0 THEN 'no_budget'
        WHEN COALESCE(realized.total_spent, 0) = 0 THEN 'not_started'
        WHEN COALESCE(realized.total_spent, 0) < (bl.amount * 0.5) THEN 'under_50'
        WHEN COALESCE(realized.total_spent, 0) < (bl.amount * 0.8) THEN 'under_80'
        WHEN COALESCE(realized.total_spent, 0) < bl.amount THEN 'under_100'
        WHEN COALESCE(realized.total_spent, 0) = bl.amount THEN 'on_budget'
        ELSE 'over_budget'
    END AS consumption_status
FROM budget_lines bl
JOIN budgets b ON b.id = bl.budget_id
JOIN accounting_periods ap ON ap.id = b.period_id
LEFT JOIN accounts a ON a.id = bl.account_id
LEFT JOIN LATERAL (
    SELECT sum(CASE WHEN le.direction = 'debit' THEN le.amount ELSE 0 END) AS total_spent
    FROM ledger_entries le
    JOIN ledger_transactions lt ON lt.id = le.tx_id AND lt.status = 'posted'
    WHERE le.account_id = bl.account_id AND lt.copro_id = bl.copro_id
      AND lt.tx_date >= ap.start_date AND lt.tx_date <= ap.end_date
) realized ON true
WHERE b.status IN ('validated', 'closed');

-- ---- 4.9 : impayé canonique = appels échus non lettrés ----------------------
-- NOTE : la vue v_unpaid_by_lot EXISTE DÉJÀ (migration 20260125_niveau2e) et est
-- déjà correcte (cf.status NOT IN draft/cancelled, cf.due_date < CURRENT_DATE,
-- HAVING sum(amount_due - amount_paid) > 0, groupée par lot avec owner_name/ref).
-- On ne la recrée donc PAS ici : un CREATE OR REPLACE avec un jeu de colonnes
-- différent échouerait ("cannot drop columns from view"). Rien à appliquer.
