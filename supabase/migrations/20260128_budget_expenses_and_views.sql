-- ============================================================================
-- Migration: Budget Expenses & Views
-- Date: 2026-01-28
-- Purpose: Add budget_expenses table and views for budget tracking
-- ============================================================================

-- 1. Add missing enum values to budget_status
-- ============================================================================
DO $$
BEGIN
  -- Add 'pending_approval' if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'budget_status' AND e.enumlabel = 'pending_approval'
  ) THEN
    ALTER TYPE budget_status ADD VALUE 'pending_approval' AFTER 'draft';
  END IF;

  -- Add 'closed' if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'budget_status' AND e.enumlabel = 'closed'
  ) THEN
    ALTER TYPE budget_status ADD VALUE 'closed' AFTER 'rejected';
  END IF;
END $$;

-- 2. Create expense_status enum if not exists
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_status') THEN
    CREATE TYPE expense_status AS ENUM (
      'draft',              -- BROUILLON
      'pending_validation', -- EN_ATTENTE_VALIDATION
      'validated',          -- VALIDEE
      'rejected'            -- REJETEE
    );
  END IF;
END $$;

-- 3. Add 'code' and 'sort_order' columns to budget_lines for categorization
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budget_lines' AND column_name = 'code'
  ) THEN
    ALTER TABLE budget_lines ADD COLUMN code TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budget_lines' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE budget_lines ADD COLUMN sort_order INT DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budget_lines' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE budget_lines ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- 4. Create budget_expenses table
-- ============================================================================
CREATE TABLE IF NOT EXISTS budget_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  budget_line_id UUID NOT NULL REFERENCES budget_lines(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  tx_date DATE NOT NULL,
  status expense_status NOT NULL DEFAULT 'draft',
  fournisseur TEXT,
  montant_ht NUMERIC(12,2),
  taux_tva NUMERIC(4,2),
  piece_jointe TEXT,
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES profiles(id),
  rejection_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE budget_expenses IS 'Dépenses imputées sur les lignes budgétaires';

-- 5. Enable RLS on budget_expenses
-- ============================================================================
ALTER TABLE budget_expenses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "budget_expenses_select" ON budget_expenses;
DROP POLICY IF EXISTS "budget_expenses_insert" ON budget_expenses;
DROP POLICY IF EXISTS "budget_expenses_update" ON budget_expenses;
DROP POLICY IF EXISTS "budget_expenses_delete" ON budget_expenses;

-- RLS Policies for budget_expenses
CREATE POLICY "budget_expenses_select" ON budget_expenses
  FOR SELECT USING (user_has_copro_access(copro_id));

CREATE POLICY "budget_expenses_insert" ON budget_expenses
  FOR INSERT WITH CHECK (user_is_copro_manager(copro_id));

CREATE POLICY "budget_expenses_update" ON budget_expenses
  FOR UPDATE USING (user_is_copro_manager(copro_id));

CREATE POLICY "budget_expenses_delete" ON budget_expenses
  FOR DELETE USING (user_is_copro_manager(copro_id) AND status = 'draft');

-- 6. Create indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_budget_expenses_budget ON budget_expenses(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_expenses_line ON budget_expenses(budget_line_id);
CREATE INDEX IF NOT EXISTS idx_budget_expenses_copro_date ON budget_expenses(copro_id, tx_date);
CREATE INDEX IF NOT EXISTS idx_budget_expenses_status ON budget_expenses(copro_id, status);
CREATE INDEX IF NOT EXISTS idx_budget_lines_budget ON budget_lines(budget_id);

-- 7. Create views
-- ============================================================================

-- View: v_budgets_overview - Budget with aggregated totals
DROP VIEW IF EXISTS v_budgets_overview;
CREATE VIEW v_budgets_overview WITH (security_invoker = true) AS
SELECT
  b.id,
  b.copro_id,
  b.period_id,
  b.budget_type,
  b.status,
  b.name,
  b.notes,
  b.created_at,
  b.validated_at,
  ap.name AS period_name,
  ap.start_date AS period_start,
  ap.end_date AS period_end,
  EXTRACT(YEAR FROM ap.start_date)::INT AS period_year,
  COALESCE(lines.lines_count, 0)::INT AS lines_count,
  COALESCE(lines.total_planned, 0) AS total_planned,
  COALESCE(exp.total_spent, 0) AS total_spent,
  COALESCE(exp.validated_spent, 0) AS validated_spent,
  COALESCE(lines.total_planned, 0) - COALESCE(exp.validated_spent, 0) AS remaining
FROM budgets b
LEFT JOIN accounting_periods ap ON ap.id = b.period_id
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::INT AS lines_count,
    SUM(amount) AS total_planned
  FROM budget_lines
  WHERE budget_id = b.id
) lines ON true
LEFT JOIN LATERAL (
  SELECT
    SUM(amount) AS total_spent,
    SUM(amount) FILTER (WHERE status = 'validated') AS validated_spent
  FROM budget_expenses
  WHERE budget_id = b.id
) exp ON true;

COMMENT ON VIEW v_budgets_overview IS 'Vue agrégée des budgets avec totaux planifiés et dépensés';

-- View: v_budget_lines_overview - Budget lines with spending
DROP VIEW IF EXISTS v_budget_lines_overview;
CREATE VIEW v_budget_lines_overview WITH (security_invoker = true) AS
SELECT
  bl.id,
  bl.copro_id,
  bl.budget_id,
  bl.account_id,
  bl.repartition_key_id,
  bl.label,
  bl.code,
  bl.amount AS planned_amount,
  bl.sort_order,
  bl.created_at,
  COALESCE(exp.expenses_count, 0)::INT AS expenses_count,
  COALESCE(exp.total_spent, 0) AS total_spent,
  COALESCE(exp.validated_spent, 0) AS validated_spent,
  COALESCE(exp.pending_count, 0)::INT AS pending_count,
  bl.amount - COALESCE(exp.validated_spent, 0) AS remaining,
  CASE
    WHEN bl.amount > 0 THEN ROUND((COALESCE(exp.validated_spent, 0) / bl.amount * 100)::NUMERIC, 1)
    ELSE 0
  END AS consumption_pct
FROM budget_lines bl
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::INT AS expenses_count,
    SUM(amount) AS total_spent,
    SUM(amount) FILTER (WHERE status = 'validated') AS validated_spent,
    COUNT(*) FILTER (WHERE status = 'pending_validation')::INT AS pending_count
  FROM budget_expenses
  WHERE budget_line_id = bl.id
) exp ON true;

COMMENT ON VIEW v_budget_lines_overview IS 'Vue des lignes budgétaires avec suivi consommation';

-- View: v_budget_expenses_detail - Expenses with context
DROP VIEW IF EXISTS v_budget_expenses_detail;
CREATE VIEW v_budget_expenses_detail WITH (security_invoker = true) AS
SELECT
  e.id,
  e.copro_id,
  e.budget_id,
  e.budget_line_id,
  e.label,
  e.amount,
  e.tx_date,
  e.status,
  e.fournisseur,
  e.montant_ht,
  e.taux_tva,
  e.piece_jointe,
  e.validated_at,
  e.validated_by,
  e.rejection_comment,
  e.created_at,
  e.updated_at,
  bl.label AS line_label,
  bl.code AS line_code,
  b.name AS budget_name,
  b.budget_type
FROM budget_expenses e
JOIN budget_lines bl ON bl.id = e.budget_line_id
JOIN budgets b ON b.id = e.budget_id;

COMMENT ON VIEW v_budget_expenses_detail IS 'Vue détaillée des dépenses avec contexte';

-- 8. Create trigger for updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_budget_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_budget_expenses_updated_at ON budget_expenses;
CREATE TRIGGER tr_budget_expenses_updated_at
  BEFORE UPDATE ON budget_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_expenses_updated_at();
