-- ============================================================================
-- Fix: v_dashboard_kpis — trésorerie compatible avec codes onboarding
-- Avant : cherchait exactement code = '512' et '502'
-- Après : cherche code LIKE '512%' (sauf 5121%) et '502%' ou '5121%'
-- Raison : l'onboarding crée des comptes 512000 / 512100, pas 512 / 502
-- ============================================================================

CREATE OR REPLACE VIEW v_dashboard_kpis AS
SELECT
  id AS copro_id,

  -- Trésorerie courante: comptes 512x sauf fonds travaux (5121x)
  COALESCE((
    SELECT SUM(vab.computed_balance)
    FROM v_account_balances vab
    WHERE vab.copro_id = c.id
      AND vab.code LIKE '512%'
      AND vab.code NOT LIKE '5121%'
  ), 0) AS tresorerie_courante,

  -- Fonds travaux: comptes 502x ou 5121x
  COALESCE((
    SELECT SUM(vab.computed_balance)
    FROM v_account_balances vab
    WHERE vab.copro_id = c.id
      AND (vab.code LIKE '502%' OR vab.code LIKE '5121%')
  ), 0) AS tresorerie_travaux,

  -- Balance totale = courant + travaux
  COALESCE((
    SELECT SUM(vab.computed_balance)
    FROM v_account_balances vab
    WHERE vab.copro_id = c.id
      AND vab.code LIKE '512%'
      AND vab.code NOT LIKE '5121%'
  ), 0)
  +
  COALESCE((
    SELECT SUM(vab.computed_balance)
    FROM v_account_balances vab
    WHERE vab.copro_id = c.id
      AND (vab.code LIKE '502%' OR vab.code LIKE '5121%')
  ), 0) AS current_balance,

  -- Impayés
  COALESCE((
    SELECT SUM(u.balance)
    FROM v_unpaid_lots u
    WHERE u.copro_id = c.id AND u.balance > 0
  ), 0) AS unpaid_total,

  COALESCE((
    SELECT count(*)
    FROM v_unpaid_lots u
    WHERE u.copro_id = c.id AND u.severity = 'critical'
  ), 0)::integer AS critical_unpaid_count,

  -- Prochaine AG
  (SELECT ag.meeting_date
   FROM ag_meetings ag
   WHERE ag.copro_id = c.id
     AND ag.status IN ('draft', 'convoked')
     AND ag.meeting_date >= CURRENT_DATE
   ORDER BY ag.meeting_date LIMIT 1
  ) AS next_ag_date,

  (SELECT ag.id
   FROM ag_meetings ag
   WHERE ag.copro_id = c.id
     AND ag.status IN ('draft', 'convoked')
     AND ag.meeting_date >= CURRENT_DATE
   ORDER BY ag.meeting_date LIMIT 1
  ) AS next_ag_id,

  (SELECT ag.title
   FROM ag_meetings ag
   WHERE ag.copro_id = c.id
     AND ag.status IN ('draft', 'convoked')
     AND ag.meeting_date >= CURRENT_DATE
   ORDER BY ag.meeting_date LIMIT 1
  ) AS next_ag_title,

  -- Budget
  COALESCE((
    SELECT SUM(bl.amount)
    FROM budgets b
    JOIN accounting_periods ap ON ap.id = b.period_id
    JOIN budget_lines bl ON bl.budget_id = b.id
    WHERE b.copro_id = c.id
      AND b.budget_type = 'current'
      AND ap.start_date <= CURRENT_DATE
      AND ap.end_date >= CURRENT_DATE
  ), 0) AS budget_vote,

  COALESCE((
    SELECT SUM(le.amount)
    FROM ledger_entries le
    JOIN accounts a ON a.id = le.account_id
    JOIN accounting_periods ap ON ap.id = le.period_id
    WHERE le.copro_id = c.id
      AND a.code LIKE '6%'
      AND le.direction = 'debit'
      AND ap.start_date <= CURRENT_DATE
      AND ap.end_date >= CURRENT_DATE
  ), 0) AS budget_realise,

  CASE
    WHEN COALESCE((
      SELECT SUM(bl.amount)
      FROM budgets b
      JOIN accounting_periods ap ON ap.id = b.period_id
      JOIN budget_lines bl ON bl.budget_id = b.id
      WHERE b.copro_id = c.id
        AND b.budget_type = 'current'
        AND ap.start_date <= CURRENT_DATE
        AND ap.end_date >= CURRENT_DATE
    ), 0) > 0
    THEN round(
      COALESCE((
        SELECT SUM(le.amount)
        FROM ledger_entries le
        JOIN accounts a ON a.id = le.account_id
        JOIN accounting_periods ap ON ap.id = le.period_id
        WHERE le.copro_id = c.id
          AND a.code LIKE '6%'
          AND le.direction = 'debit'
          AND ap.start_date <= CURRENT_DATE
          AND ap.end_date >= CURRENT_DATE
      ), 0) * 100.0 / (
        SELECT SUM(bl.amount)
        FROM budgets b
        JOIN accounting_periods ap ON ap.id = b.period_id
        JOIN budget_lines bl ON bl.budget_id = b.id
        WHERE b.copro_id = c.id
          AND b.budget_type = 'current'
          AND ap.start_date <= CURRENT_DATE
          AND ap.end_date >= CURRENT_DATE
      )
    )
    ELSE 0
  END AS budget_pct

FROM copros c;

COMMENT ON VIEW v_dashboard_kpis IS 'KPIs dashboard — trésorerie basée sur codes 512%/502%/5121% pour compatibilité onboarding';
