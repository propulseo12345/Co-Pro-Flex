-- ============================================================================
-- Migration: ALUR Transfers & Views
-- Date: 2026-01-29
-- Purpose: Add alur_transfers table and views for ALUR fund tracking
-- ============================================================================

-- 1. Create transfer_destination enum
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transfer_destination') THEN
    CREATE TYPE transfer_destination AS ENUM (
      'compte_courant',  -- Transfer to current account
      'budget_travaux'   -- Transfer to works budget
    );
  END IF;
END $$;

-- 2. Create alur_transfers table
-- ============================================================================
CREATE TABLE IF NOT EXISTS alur_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  alur_budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  destination transfer_destination NOT NULL,
  destination_budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  resolution_ag_id UUID,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE alur_transfers IS 'Historique des transferts du fonds ALUR vers compte courant ou budget travaux';

-- 3. Enable RLS on alur_transfers
-- ============================================================================
ALTER TABLE alur_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alur_transfers_select" ON alur_transfers;
DROP POLICY IF EXISTS "alur_transfers_insert" ON alur_transfers;
DROP POLICY IF EXISTS "alur_transfers_delete" ON alur_transfers;

CREATE POLICY "alur_transfers_select" ON alur_transfers
  FOR SELECT USING (user_has_copro_access(copro_id));

CREATE POLICY "alur_transfers_insert" ON alur_transfers
  FOR INSERT WITH CHECK (user_is_copro_manager(copro_id));

CREATE POLICY "alur_transfers_delete" ON alur_transfers
  FOR DELETE USING (user_is_copro_manager(copro_id));

-- 4. Create indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_alur_transfers_copro ON alur_transfers(copro_id);
CREATE INDEX IF NOT EXISTS idx_alur_transfers_budget ON alur_transfers(alur_budget_id);
CREATE INDEX IF NOT EXISTS idx_alur_transfers_date ON alur_transfers(copro_id, transfer_date DESC);

-- 5. Create view for ALUR fund summary
-- ============================================================================
DROP VIEW IF EXISTS v_alur_fund_summary;
CREATE VIEW v_alur_fund_summary WITH (security_invoker = true) AS
SELECT
  b.id AS budget_id,
  b.copro_id,
  b.period_id,
  ap.start_date AS period_start,
  ap.end_date AS period_end,
  EXTRACT(YEAR FROM ap.start_date)::INT AS period_year,
  b.name,
  COALESCE(lines.total_planned, 0) AS cotisation_annuelle,
  COALESCE(transfers.total_transferred, 0) AS total_transferred,
  COALESCE(lines.total_planned, 0) - COALESCE(transfers.total_transferred, 0) AS solde_actuel,
  -- Calculate percentage of fonctionnement budget
  COALESCE(
    ROUND(
      (lines.total_planned / NULLIF(fonct.total_planned, 0) * 100)::NUMERIC,
      1
    ),
    5.0
  ) AS pourcentage_budget,
  fonct.total_planned AS budget_fonctionnement
FROM budgets b
LEFT JOIN accounting_periods ap ON ap.id = b.period_id
LEFT JOIN LATERAL (
  SELECT SUM(amount) AS total_planned
  FROM budget_lines
  WHERE budget_id = b.id
) lines ON true
LEFT JOIN LATERAL (
  SELECT SUM(amount) AS total_transferred
  FROM alur_transfers
  WHERE alur_budget_id = b.id
) transfers ON true
LEFT JOIN LATERAL (
  SELECT SUM(bl.amount) AS total_planned
  FROM budgets fb
  JOIN budget_lines bl ON bl.budget_id = fb.id
  WHERE fb.copro_id = b.copro_id
    AND fb.budget_type = 'current'
    AND fb.period_id = b.period_id
) fonct ON true
WHERE b.budget_type = 'alur';

COMMENT ON VIEW v_alur_fund_summary IS 'Vue résumé du fonds ALUR avec solde et pourcentage';

-- 6. Create view for ALUR contributions per lot
-- ============================================================================
DROP VIEW IF EXISTS v_alur_lot_contributions;
CREATE VIEW v_alur_lot_contributions WITH (security_invoker = true) AS
SELECT
  l.id AS lot_id,
  l.copro_id,
  l.ref AS lot_ref,
  l.tantiemes_generaux,
  -- Current owner (end_date IS NULL = current owner)
  lo.coproprietaire_id AS owner_id,
  COALESCE(
    CASE
      WHEN c.is_company THEN c.company_name
      ELSE CONCAT(c.first_name, ' ', c.last_name)
    END,
    'Non assigné'
  ) AS owner_name,
  -- Calculate lot's share percentage
  ROUND(
    (l.tantiemes_generaux::NUMERIC / NULLIF(total_t.total_tantiemes, 0) * 100)::NUMERIC,
    2
  ) AS share_percent,
  -- Get ALUR fund info
  alur.budget_id AS alur_budget_id,
  alur.period_year,
  alur.solde_actuel AS fonds_total,
  -- Calculate lot's share of ALUR fund
  ROUND(
    (alur.solde_actuel * l.tantiemes_generaux / NULLIF(total_t.total_tantiemes, 0))::NUMERIC,
    2
  ) AS lot_solde_alur,
  -- Calculate lot's annual contribution
  ROUND(
    (alur.cotisation_annuelle * l.tantiemes_generaux / NULLIF(total_t.total_tantiemes, 0))::NUMERIC,
    2
  ) AS lot_cotisation_annuelle
FROM lots l
LEFT JOIN lot_owners lo ON lo.lot_id = l.id AND lo.end_date IS NULL
LEFT JOIN coproprietaires c ON c.id = lo.coproprietaire_id
LEFT JOIN LATERAL (
  SELECT SUM(tantiemes_generaux) AS total_tantiemes
  FROM lots
  WHERE copro_id = l.copro_id
) total_t ON true
LEFT JOIN LATERAL (
  SELECT *
  FROM v_alur_fund_summary
  WHERE copro_id = l.copro_id
  ORDER BY period_year DESC
  LIMIT 1
) alur ON true
WHERE l.tantiemes_generaux > 0;

COMMENT ON VIEW v_alur_lot_contributions IS 'Vue des contributions ALUR par lot avec quote-part';

-- 7. Create view for ALUR transfer history
-- ============================================================================
DROP VIEW IF EXISTS v_alur_transfers_history;
CREATE VIEW v_alur_transfers_history WITH (security_invoker = true) AS
SELECT
  t.id,
  t.copro_id,
  t.alur_budget_id,
  t.amount,
  t.transfer_date,
  t.destination,
  t.destination_budget_id,
  t.description,
  t.resolution_ag_id,
  t.created_at,
  -- Destination budget name if applicable
  dest_b.name AS destination_budget_name,
  -- Period info
  ap.name AS period_name,
  EXTRACT(YEAR FROM ap.start_date)::INT AS period_year
FROM alur_transfers t
JOIN budgets ab ON ab.id = t.alur_budget_id
LEFT JOIN accounting_periods ap ON ap.id = ab.period_id
LEFT JOIN budgets dest_b ON dest_b.id = t.destination_budget_id
ORDER BY t.transfer_date DESC, t.created_at DESC;

COMMENT ON VIEW v_alur_transfers_history IS 'Historique des transferts ALUR avec détails';
