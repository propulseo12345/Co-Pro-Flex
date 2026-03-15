-- =============================================================================
-- Budget Payment Schedules — Échéancier prestataire
-- =============================================================================

-- 1. Enum status
DO $$ BEGIN
  CREATE TYPE payment_phase_status AS ENUM ('pending', 'awaiting_invoice', 'paid');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Table
CREATE TABLE IF NOT EXISTS budget_payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  phase_number INT NOT NULL,
  label TEXT NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  due_date DATE,
  status payment_phase_status NOT NULL DEFAULT 'pending',
  paid_date DATE,
  invoice_ref TEXT,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  service_order_id UUID REFERENCES service_orders(id) ON DELETE SET NULL,
  is_retention BOOLEAN NOT NULL DEFAULT false,
  retention_release_date DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_budget_phase UNIQUE (budget_id, phase_number)
);

-- 3. Indexes
CREATE INDEX idx_budget_payment_schedules_budget ON budget_payment_schedules(budget_id);
CREATE INDEX idx_budget_payment_schedules_copro ON budget_payment_schedules(copro_id);

-- 4. Trigger updated_at
CREATE OR REPLACE FUNCTION update_budget_payment_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_budget_payment_schedules_updated_at
  BEFORE UPDATE ON budget_payment_schedules
  FOR EACH ROW EXECUTE FUNCTION update_budget_payment_schedules_updated_at();

-- 5. RLS
ALTER TABLE budget_payment_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_schedules_select" ON budget_payment_schedules
  FOR SELECT USING (
    copro_id IN (
      SELECT copro_id FROM memberships
      WHERE user_id = COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID)
    )
  );

CREATE POLICY "payment_schedules_insert" ON budget_payment_schedules
  FOR INSERT WITH CHECK (
    copro_id IN (
      SELECT copro_id FROM memberships
      WHERE user_id = COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID)
        AND role IN ('gestionnaire', 'admin')
    )
  );

CREATE POLICY "payment_schedules_update" ON budget_payment_schedules
  FOR UPDATE USING (
    copro_id IN (
      SELECT copro_id FROM memberships
      WHERE user_id = COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID)
        AND role IN ('gestionnaire', 'admin')
    )
  );

CREATE POLICY "payment_schedules_delete" ON budget_payment_schedules
  FOR DELETE USING (
    copro_id IN (
      SELECT copro_id FROM memberships
      WHERE user_id = COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID)
        AND role IN ('gestionnaire', 'admin')
    )
  );

-- 6. Ajout budget_id sur documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_documents_budget ON documents(budget_id);
