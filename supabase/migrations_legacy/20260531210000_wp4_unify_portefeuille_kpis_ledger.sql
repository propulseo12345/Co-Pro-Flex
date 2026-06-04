-- ============================================================================
-- WP4 (finitions) — Unifier les indicateurs du Portefeuille sur le GRAND LIVRE
-- ----------------------------------------------------------------------------
-- Problème : la vue v_dashboard_kpis (consommée par la page Portefeuille)
-- calculait :
--   • la trésorerie depuis `bank_movements` (relevés bancaires importés) via
--     v_account_balances → 0 € quand aucun relevé n'est importé, alors que le
--     GRAND LIVRE (512) dit autre chose. = trésorerie BANCAIRE, pas COMPTABLE.
--   • les impayés depuis v_unpaid_lots (créances TOTALES, solde débiteur du lot)
--     au lieu de l'ÉCHU.
-- → Le Portefeuille divergeait du dashboard d'une copro (fn_dashboard_kpis).
--
-- Principe « grand livre = source unique de vérité » : on repointe la trésorerie
-- sur le grand livre (512 posté) et les impayés sur v_unpaid_by_lot (échu),
-- pour que Portefeuille et dashboard copro affichent LES MÊMES chiffres.
-- Le rapprochement bancaire (bank_movements / v_account_balances) reste un sujet
-- distinct, inchangé.
-- ============================================================================

CREATE OR REPLACE VIEW public.v_dashboard_kpis AS
 SELECT c.id AS copro_id,
    -- Trésorerie COMPTABLE = solde des comptes 512 (hors 5121 travaux) au grand livre posté
    COALESCE((SELECT sum(CASE WHEN e.direction = 'debit' THEN e.amount ELSE - e.amount END)
              FROM ledger_entries e
              JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted'
              JOIN accounts a ON a.id = e.account_id
              WHERE e.copro_id = c.id AND a.code ~~ '512%'::text AND a.code !~~ '5121%'::text), 0::numeric) AS tresorerie_courante,
    COALESCE((SELECT sum(CASE WHEN e.direction = 'debit' THEN e.amount ELSE - e.amount END)
              FROM ledger_entries e
              JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted'
              JOIN accounts a ON a.id = e.account_id
              WHERE e.copro_id = c.id AND (a.code ~~ '502%'::text OR a.code ~~ '5121%'::text)), 0::numeric) AS tresorerie_travaux,
    COALESCE((SELECT sum(CASE WHEN e.direction = 'debit' THEN e.amount ELSE - e.amount END)
              FROM ledger_entries e
              JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted'
              JOIN accounts a ON a.id = e.account_id
              WHERE e.copro_id = c.id AND a.code ~~ '5%'::text), 0::numeric) AS current_balance,
    -- Impayés = ÉCHU non réglé (vue canonique), cohérent avec le dashboard copro
    COALESCE((SELECT sum(u.total_unpaid) FROM v_unpaid_by_lot u WHERE u.copro_id = c.id), 0::numeric) AS unpaid_total,
    COALESCE((SELECT count(*) FROM v_unpaid_by_lot u WHERE u.copro_id = c.id), 0::bigint)::integer AS critical_unpaid_count,
    (SELECT ag.meeting_date FROM ag_meetings ag
       WHERE ag.copro_id = c.id AND (ag.status = ANY (ARRAY['draft'::ag_status, 'convoked'::ag_status])) AND ag.meeting_date >= CURRENT_DATE
       ORDER BY ag.meeting_date LIMIT 1) AS next_ag_date,
    (SELECT ag.id FROM ag_meetings ag
       WHERE ag.copro_id = c.id AND (ag.status = ANY (ARRAY['draft'::ag_status, 'convoked'::ag_status])) AND ag.meeting_date >= CURRENT_DATE
       ORDER BY ag.meeting_date LIMIT 1) AS next_ag_id,
    (SELECT ag.title FROM ag_meetings ag
       WHERE ag.copro_id = c.id AND (ag.status = ANY (ARRAY['draft'::ag_status, 'convoked'::ag_status])) AND ag.meeting_date >= CURRENT_DATE
       ORDER BY ag.meeting_date LIMIT 1) AS next_ag_title,
    COALESCE((SELECT sum(bl.amount)
              FROM budgets b
              JOIN accounting_periods ap ON ap.id = b.period_id
              JOIN budget_lines bl ON bl.budget_id = b.id
              WHERE b.copro_id = c.id AND b.budget_type = 'current'::budget_type
                AND ap.start_date <= CURRENT_DATE AND ap.end_date >= CURRENT_DATE), 0::numeric) AS budget_vote,
    COALESCE((SELECT sum(le.amount)
              FROM ledger_entries le
              JOIN accounts a ON a.id = le.account_id
              JOIN accounting_periods ap ON ap.id = le.period_id
              WHERE le.copro_id = c.id AND a.code ~~ '6%'::text AND le.direction = 'debit'::text
                AND ap.start_date <= CURRENT_DATE AND ap.end_date >= CURRENT_DATE), 0::numeric) AS budget_realise,
    CASE
        WHEN COALESCE((SELECT sum(bl.amount)
              FROM budgets b
              JOIN accounting_periods ap ON ap.id = b.period_id
              JOIN budget_lines bl ON bl.budget_id = b.id
              WHERE b.copro_id = c.id AND b.budget_type = 'current'::budget_type
                AND ap.start_date <= CURRENT_DATE AND ap.end_date >= CURRENT_DATE), 0::numeric) > 0::numeric
        THEN round(COALESCE((SELECT sum(le.amount)
              FROM ledger_entries le
              JOIN accounts a ON a.id = le.account_id
              JOIN accounting_periods ap ON ap.id = le.period_id
              WHERE le.copro_id = c.id AND a.code ~~ '6%'::text AND le.direction = 'debit'::text
                AND ap.start_date <= CURRENT_DATE AND ap.end_date >= CURRENT_DATE), 0::numeric) * 100.0
              / (SELECT sum(bl.amount)
              FROM budgets b
              JOIN accounting_periods ap ON ap.id = b.period_id
              JOIN budget_lines bl ON bl.budget_id = b.id
              WHERE b.copro_id = c.id AND b.budget_type = 'current'::budget_type
                AND ap.start_date <= CURRENT_DATE AND ap.end_date >= CURRENT_DATE))
        ELSE 0::numeric
    END AS budget_pct
   FROM copros c;
