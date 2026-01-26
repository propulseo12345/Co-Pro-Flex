-- ============================================================================
-- NIVEAU 2E : FINANCE MÉTIER - Tables, RLS, Fonctions, Vues
-- CoProFlex - Migration principale
-- Date: 2026-01-25
-- Référentiel: Loi 65-557, Décret 2005-240, Loi ALUR
-- ============================================================================

-- ============================================================================
-- PARTIE 1: ENUMS
-- ============================================================================

-- Statuts appels de fonds (conforme doc "2 - Finance.pdf")
CREATE TYPE call_for_funds_status AS ENUM (
  'draft',           -- Brouillon, non émis
  'issued',          -- Émis, en attente de paiement
  'partially_paid',  -- Partiellement payé
  'paid',            -- Intégralement payé
  'cancelled'        -- Annulé
);

-- Statuts lignes d'appel
CREATE TYPE call_line_status AS ENUM (
  'unpaid',   -- Non payé (dû)
  'partial',  -- Partiellement payé
  'paid'      -- Soldé
);

-- Méthodes de paiement
CREATE TYPE payment_method AS ENUM (
  'bank_transfer',  -- Virement bancaire
  'card',           -- Carte bancaire
  'check',          -- Chèque
  'cash',           -- Espèces
  'other'           -- Autre
);

-- Statuts paiements copropriétaires
CREATE TYPE payment_status AS ENUM (
  'recorded',    -- Enregistré
  'reconciled',  -- Rapproché avec mouvement bancaire
  'reversed'     -- Annulé/Contre-passé
);

-- Statuts mouvements bancaires
CREATE TYPE bank_movement_status AS ENUM (
  'unmatched',  -- Non rapproché
  'matched',    -- Rapproché
  'ignored'     -- Ignoré (doublon, erreur, etc.)
);

-- Types de cible pour rapprochement
CREATE TYPE bank_match_target_type AS ENUM (
  'payment',           -- Paiement copropriétaire
  'supplier_payment',  -- Paiement fournisseur
  'other'              -- Autre (virement interne, etc.)
);

-- Statuts factures fournisseurs (conforme doc "4 - Maintenance.pdf")
CREATE TYPE supplier_invoice_status AS ENUM (
  'draft',      -- Brouillon / À valider
  'approved',   -- Validée, en attente de comptabilisation
  'posted',     -- Comptabilisée dans le ledger
  'paid',       -- Payée intégralement
  'cancelled'   -- Annulée
);

-- ============================================================================
-- PARTIE 2: TABLES - APPELS DE FONDS
-- ============================================================================

-- Table principale des appels de fonds
CREATE TABLE call_for_funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES accounting_periods(id),
  budget_id UUID NULL REFERENCES budgets(id),
  repartition_key_id UUID NOT NULL REFERENCES repartition_keys(id),

  -- Identification
  label TEXT NOT NULL,
  trimester INT NULL CHECK (trimester IS NULL OR trimester BETWEEN 1 AND 4),

  -- Dates
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,

  -- Montants
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),

  -- Statut
  status call_for_funds_status NOT NULL DEFAULT 'draft',

  -- Lien ledger
  ledger_tx_id UUID NULL REFERENCES ledger_transactions(id),

  -- Audit
  created_by UUID NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issued_at TIMESTAMPTZ NULL,

  -- Contrainte unicité pour idempotence
  CONSTRAINT uq_call_for_funds_idempotent
    UNIQUE (copro_id, period_id, label, issue_date)
);

COMMENT ON TABLE call_for_funds IS
  'Appels de fonds - Art. 14-1 loi 65-557. Source de vérité liée au ledger.';

-- Lignes d'appel de fonds par lot
CREATE TABLE call_for_funds_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  call_id UUID NOT NULL REFERENCES call_for_funds(id) ON DELETE CASCADE,
  lot_id UUID NOT NULL REFERENCES lots(id),

  -- Montants
  amount_due NUMERIC(12,2) NOT NULL CHECK (amount_due >= 0),
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),

  -- Statut calculé
  status call_line_status NOT NULL DEFAULT 'unpaid',

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Un lot par appel
  CONSTRAINT uq_call_line_lot UNIQUE (call_id, lot_id),

  -- Cohérence montants
  CONSTRAINT chk_call_line_amounts CHECK (amount_paid <= amount_due)
);

COMMENT ON TABLE call_for_funds_lines IS
  'Détail des appels de fonds par lot avec suivi des paiements.';

-- Index pour performances
CREATE INDEX idx_call_for_funds_copro_period ON call_for_funds(copro_id, period_id);
CREATE INDEX idx_call_for_funds_status ON call_for_funds(copro_id, status);
CREATE INDEX idx_call_lines_call ON call_for_funds_lines(call_id);
CREATE INDEX idx_call_lines_lot ON call_for_funds_lines(lot_id);
CREATE INDEX idx_call_lines_status ON call_for_funds_lines(copro_id, status);

-- ============================================================================
-- PARTIE 3: TABLES - PAIEMENTS COPROPRIÉTAIRES
-- ============================================================================

-- Paiements reçus des copropriétaires
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES accounting_periods(id),
  lot_id UUID NOT NULL REFERENCES lots(id),

  -- Montant et date
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL,

  -- Méthode et référence
  method payment_method NOT NULL DEFAULT 'bank_transfer',
  reference TEXT NULL,

  -- Statut
  status payment_status NOT NULL DEFAULT 'recorded',

  -- Lien ledger
  ledger_tx_id UUID NULL REFERENCES ledger_transactions(id),

  -- Audit
  created_by UUID NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unicité pour idempotence (même paiement = même référence)
  CONSTRAINT uq_payment_idempotent
    UNIQUE (copro_id, lot_id, amount, payment_date, COALESCE(reference, ''))
);

COMMENT ON TABLE payments IS
  'Paiements des copropriétaires avec traçabilité ledger.';

-- Allocations des paiements aux lignes d'appel
CREATE TABLE payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  call_line_id UUID NOT NULL REFERENCES call_for_funds_lines(id) ON DELETE CASCADE,

  -- Montant alloué
  amount_allocated NUMERIC(12,2) NOT NULL CHECK (amount_allocated > 0),

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Une allocation par paiement/ligne
  CONSTRAINT uq_allocation UNIQUE (payment_id, call_line_id)
);

COMMENT ON TABLE payment_allocations IS
  'Ventilation des paiements sur les lignes d appels de fonds.';

-- Index
CREATE INDEX idx_payments_copro_period ON payments(copro_id, period_id);
CREATE INDEX idx_payments_lot ON payments(lot_id);
CREATE INDEX idx_payments_status ON payments(copro_id, status);
CREATE INDEX idx_allocations_payment ON payment_allocations(payment_id);
CREATE INDEX idx_allocations_call_line ON payment_allocations(call_line_id);

-- ============================================================================
-- PARTIE 4: TABLES - BANQUE ET RAPPROCHEMENT
-- ============================================================================

-- Mouvements bancaires importés
CREATE TABLE bank_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES accounting_periods(id),

  -- Dates
  bank_date DATE NOT NULL,
  value_date DATE NULL,

  -- Montant signé: positif = entrée, négatif = sortie
  amount_signed NUMERIC(12,2) NOT NULL,

  -- Libellé et référence bancaire
  label TEXT NOT NULL,
  bank_ref TEXT NULL,

  -- Statut de rapprochement
  status bank_movement_status NOT NULL DEFAULT 'unmatched',

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unicité pour éviter doublons d'import
  CONSTRAINT uq_bank_movement
    UNIQUE (copro_id, bank_date, amount_signed, COALESCE(bank_ref, ''), label)
);

COMMENT ON TABLE bank_movements IS
  'Mouvements bancaires bruts pour rapprochement - Décret 2005-240.';

-- Rapprochements bancaires
CREATE TABLE bank_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  bank_movement_id UUID NOT NULL REFERENCES bank_movements(id) ON DELETE CASCADE,

  -- Cible du rapprochement
  target_type bank_match_target_type NOT NULL,
  target_id UUID NOT NULL,

  -- Montant rapproché (peut être partiel)
  amount_matched NUMERIC(12,2) NOT NULL CHECK (amount_matched > 0),

  -- Audit
  matched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  matched_by UUID NULL REFERENCES profiles(id)
);

COMMENT ON TABLE bank_matches IS
  'Liens de rapprochement entre mouvements bancaires et paiements.';

-- Index
CREATE INDEX idx_bank_movements_copro_period ON bank_movements(copro_id, period_id);
CREATE INDEX idx_bank_movements_status ON bank_movements(copro_id, status);
CREATE INDEX idx_bank_movements_date ON bank_movements(copro_id, bank_date);
CREATE INDEX idx_bank_matches_movement ON bank_matches(bank_movement_id);
CREATE INDEX idx_bank_matches_target ON bank_matches(target_type, target_id);

-- ============================================================================
-- PARTIE 5: TABLES - FOURNISSEURS ET FACTURES
-- ============================================================================

-- Fournisseurs
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,

  -- Identification
  name TEXT NOT NULL,
  siret TEXT NULL,

  -- Contact (structure libre)
  contact JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Statut
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unicité nom par copro
  CONSTRAINT uq_supplier_name UNIQUE (copro_id, name)
);

COMMENT ON TABLE suppliers IS
  'Fournisseurs et prestataires de la copropriété.';

-- Factures fournisseurs
CREATE TABLE supplier_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES accounting_periods(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),

  -- Identification facture
  invoice_number TEXT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NULL,

  -- Libellé et montant
  label TEXT NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),

  -- Statut
  status supplier_invoice_status NOT NULL DEFAULT 'draft',

  -- Liens optionnels
  related_service_order_id UUID NULL,
  document_id UUID NULL REFERENCES documents(id),

  -- Lien ledger
  ledger_tx_id UUID NULL REFERENCES ledger_transactions(id),

  -- Audit
  created_by UUID NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE supplier_invoices IS
  'Factures fournisseurs avec comptabilisation automatique.';

-- Lignes de factures fournisseurs (ventilation comptable)
CREATE TABLE supplier_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES supplier_invoices(id) ON DELETE CASCADE,

  -- Imputation comptable (compte de charge 6xx)
  account_id UUID NOT NULL REFERENCES accounts(id),

  -- Détail
  label TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),

  -- Ventilation optionnelle
  repartition_key_id UUID NULL REFERENCES repartition_keys(id),
  budget_line_id UUID NULL REFERENCES budget_lines(id)
);

COMMENT ON TABLE supplier_invoice_lines IS
  'Ventilation des factures par compte de charge et clé de répartition.';

-- Paiements fournisseurs
CREATE TABLE supplier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES accounting_periods(id),
  supplier_invoice_id UUID NOT NULL REFERENCES supplier_invoices(id) ON DELETE CASCADE,

  -- Paiement
  payment_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  method payment_method NOT NULL DEFAULT 'bank_transfer',
  reference TEXT NULL,

  -- Lien ledger
  ledger_tx_id UUID NULL REFERENCES ledger_transactions(id),

  -- Audit
  created_by UUID NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE supplier_payments IS
  'Paiements des factures fournisseurs avec traçabilité ledger.';

-- Index
CREATE INDEX idx_suppliers_copro ON suppliers(copro_id);
CREATE INDEX idx_supplier_invoices_copro_period ON supplier_invoices(copro_id, period_id);
CREATE INDEX idx_supplier_invoices_supplier ON supplier_invoices(supplier_id);
CREATE INDEX idx_supplier_invoices_status ON supplier_invoices(copro_id, status);
CREATE INDEX idx_supplier_invoice_lines_invoice ON supplier_invoice_lines(invoice_id);
CREATE INDEX idx_supplier_payments_invoice ON supplier_payments(supplier_invoice_id);

-- ============================================================================
-- PARTIE 6: RLS POLICIES
-- ============================================================================

-- Activer RLS sur toutes les tables
ALTER TABLE call_for_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_for_funds_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;

-- Politiques de lecture (tous les membres de la copro)
CREATE POLICY "call_for_funds_select" ON call_for_funds
  FOR SELECT USING (user_has_copro_access(copro_id));

CREATE POLICY "call_for_funds_lines_select" ON call_for_funds_lines
  FOR SELECT USING (user_has_copro_access(copro_id));

CREATE POLICY "payments_select" ON payments
  FOR SELECT USING (user_has_copro_access(copro_id));

CREATE POLICY "payment_allocations_select" ON payment_allocations
  FOR SELECT USING (user_has_copro_access(copro_id));

CREATE POLICY "bank_movements_select" ON bank_movements
  FOR SELECT USING (user_has_copro_access(copro_id));

CREATE POLICY "bank_matches_select" ON bank_matches
  FOR SELECT USING (user_has_copro_access(copro_id));

CREATE POLICY "suppliers_select" ON suppliers
  FOR SELECT USING (user_has_copro_access(copro_id));

CREATE POLICY "supplier_invoices_select" ON supplier_invoices
  FOR SELECT USING (user_has_copro_access(copro_id));

CREATE POLICY "supplier_invoice_lines_select" ON supplier_invoice_lines
  FOR SELECT USING (user_has_copro_access(copro_id));

CREATE POLICY "supplier_payments_select" ON supplier_payments
  FOR SELECT USING (user_has_copro_access(copro_id));

-- Politiques d'écriture (gestionnaires uniquement)
CREATE POLICY "call_for_funds_insert" ON call_for_funds
  FOR INSERT WITH CHECK (user_is_copro_manager(copro_id));

CREATE POLICY "call_for_funds_update" ON call_for_funds
  FOR UPDATE USING (user_is_copro_manager(copro_id));

CREATE POLICY "call_for_funds_delete" ON call_for_funds
  FOR DELETE USING (user_is_copro_manager(copro_id) AND status = 'draft');

CREATE POLICY "call_for_funds_lines_insert" ON call_for_funds_lines
  FOR INSERT WITH CHECK (user_is_copro_manager(copro_id));

CREATE POLICY "call_for_funds_lines_update" ON call_for_funds_lines
  FOR UPDATE USING (user_is_copro_manager(copro_id));

CREATE POLICY "call_for_funds_lines_delete" ON call_for_funds_lines
  FOR DELETE USING (user_is_copro_manager(copro_id));

CREATE POLICY "payments_insert" ON payments
  FOR INSERT WITH CHECK (user_is_copro_manager(copro_id));

CREATE POLICY "payments_update" ON payments
  FOR UPDATE USING (user_is_copro_manager(copro_id));

CREATE POLICY "payments_delete" ON payments
  FOR DELETE USING (user_is_copro_manager(copro_id) AND status = 'recorded');

CREATE POLICY "payment_allocations_insert" ON payment_allocations
  FOR INSERT WITH CHECK (user_is_copro_manager(copro_id));

CREATE POLICY "payment_allocations_update" ON payment_allocations
  FOR UPDATE USING (user_is_copro_manager(copro_id));

CREATE POLICY "payment_allocations_delete" ON payment_allocations
  FOR DELETE USING (user_is_copro_manager(copro_id));

CREATE POLICY "bank_movements_insert" ON bank_movements
  FOR INSERT WITH CHECK (user_is_copro_manager(copro_id));

CREATE POLICY "bank_movements_update" ON bank_movements
  FOR UPDATE USING (user_is_copro_manager(copro_id));

CREATE POLICY "bank_movements_delete" ON bank_movements
  FOR DELETE USING (user_is_copro_manager(copro_id) AND status = 'unmatched');

CREATE POLICY "bank_matches_insert" ON bank_matches
  FOR INSERT WITH CHECK (user_is_copro_manager(copro_id));

CREATE POLICY "bank_matches_update" ON bank_matches
  FOR UPDATE USING (user_is_copro_manager(copro_id));

CREATE POLICY "bank_matches_delete" ON bank_matches
  FOR DELETE USING (user_is_copro_manager(copro_id));

CREATE POLICY "suppliers_insert" ON suppliers
  FOR INSERT WITH CHECK (user_is_copro_manager(copro_id));

CREATE POLICY "suppliers_update" ON suppliers
  FOR UPDATE USING (user_is_copro_manager(copro_id));

CREATE POLICY "suppliers_delete" ON suppliers
  FOR DELETE USING (user_is_copro_manager(copro_id));

CREATE POLICY "supplier_invoices_insert" ON supplier_invoices
  FOR INSERT WITH CHECK (user_is_copro_manager(copro_id));

CREATE POLICY "supplier_invoices_update" ON supplier_invoices
  FOR UPDATE USING (user_is_copro_manager(copro_id));

CREATE POLICY "supplier_invoices_delete" ON supplier_invoices
  FOR DELETE USING (user_is_copro_manager(copro_id) AND status = 'draft');

CREATE POLICY "supplier_invoice_lines_insert" ON supplier_invoice_lines
  FOR INSERT WITH CHECK (user_is_copro_manager(copro_id));

CREATE POLICY "supplier_invoice_lines_update" ON supplier_invoice_lines
  FOR UPDATE USING (user_is_copro_manager(copro_id));

CREATE POLICY "supplier_invoice_lines_delete" ON supplier_invoice_lines
  FOR DELETE USING (user_is_copro_manager(copro_id));

CREATE POLICY "supplier_payments_insert" ON supplier_payments
  FOR INSERT WITH CHECK (user_is_copro_manager(copro_id));

CREATE POLICY "supplier_payments_update" ON supplier_payments
  FOR UPDATE USING (user_is_copro_manager(copro_id));

CREATE POLICY "supplier_payments_delete" ON supplier_payments
  FOR DELETE USING (user_is_copro_manager(copro_id));

-- ============================================================================
-- PARTIE 7: FONCTIONS UTILITAIRES
-- ============================================================================

-- Fonction: Mettre à jour le statut d'une ligne d'appel selon amount_paid
CREATE OR REPLACE FUNCTION update_call_line_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.amount_paid >= NEW.amount_due THEN
    NEW.status := 'paid';
  ELSIF NEW.amount_paid > 0 THEN
    NEW.status := 'partial';
  ELSE
    NEW.status := 'unpaid';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_call_line_status
  BEFORE INSERT OR UPDATE OF amount_paid ON call_for_funds_lines
  FOR EACH ROW EXECUTE FUNCTION update_call_line_status();

-- Fonction: Mettre à jour le statut de l'appel selon les lignes
CREATE OR REPLACE FUNCTION update_call_status(p_call_id UUID)
RETURNS void AS $$
DECLARE
  v_total_due NUMERIC;
  v_total_paid NUMERIC;
  v_unpaid_count INT;
BEGIN
  SELECT
    COALESCE(SUM(amount_due), 0),
    COALESCE(SUM(amount_paid), 0),
    COUNT(*) FILTER (WHERE status != 'paid')
  INTO v_total_due, v_total_paid, v_unpaid_count
  FROM call_for_funds_lines
  WHERE call_id = p_call_id;

  UPDATE call_for_funds
  SET status = CASE
    WHEN status = 'draft' THEN 'draft'
    WHEN status = 'cancelled' THEN 'cancelled'
    WHEN v_unpaid_count = 0 THEN 'paid'
    WHEN v_total_paid > 0 THEN 'partially_paid'
    ELSE 'issued'
  END
  WHERE id = p_call_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction: Allouer un paiement aux lignes d'appel
CREATE OR REPLACE FUNCTION allocate_payment(
  p_payment_id UUID,
  p_call_line_ids UUID[] DEFAULT NULL
)
RETURNS TABLE(
  call_line_id UUID,
  amount_allocated NUMERIC
) AS $$
DECLARE
  v_payment RECORD;
  v_remaining NUMERIC;
  v_line RECORD;
  v_alloc NUMERIC;
  v_copro_id UUID;
BEGIN
  -- Récupérer le paiement
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found: %', p_payment_id;
  END IF;

  v_copro_id := v_payment.copro_id;
  v_remaining := v_payment.amount;

  -- Supprimer les anciennes allocations de ce paiement
  DELETE FROM payment_allocations WHERE payment_id = p_payment_id;

  -- Si pas de lignes spécifiées, prendre les lignes impayées les plus anciennes du lot
  IF p_call_line_ids IS NULL THEN
    FOR v_line IN
      SELECT cfl.id, cfl.amount_due, cfl.amount_paid, cfl.amount_due - cfl.amount_paid as remaining
      FROM call_for_funds_lines cfl
      JOIN call_for_funds cf ON cf.id = cfl.call_id
      WHERE cfl.lot_id = v_payment.lot_id
        AND cfl.copro_id = v_copro_id
        AND cfl.status != 'paid'
        AND cf.status != 'cancelled'
      ORDER BY cf.issue_date ASC, cf.id ASC
    LOOP
      EXIT WHEN v_remaining <= 0;

      v_alloc := LEAST(v_remaining, v_line.remaining);

      IF v_alloc > 0 THEN
        INSERT INTO payment_allocations (copro_id, payment_id, call_line_id, amount_allocated)
        VALUES (v_copro_id, p_payment_id, v_line.id, v_alloc);

        -- MAJ amount_paid de la ligne
        UPDATE call_for_funds_lines
        SET amount_paid = amount_paid + v_alloc
        WHERE id = v_line.id;

        v_remaining := v_remaining - v_alloc;

        call_line_id := v_line.id;
        amount_allocated := v_alloc;
        RETURN NEXT;
      END IF;
    END LOOP;
  ELSE
    -- Allouer aux lignes spécifiées dans l'ordre
    FOR v_line IN
      SELECT cfl.id, cfl.amount_due, cfl.amount_paid, cfl.amount_due - cfl.amount_paid as remaining
      FROM call_for_funds_lines cfl
      WHERE cfl.id = ANY(p_call_line_ids)
        AND cfl.copro_id = v_copro_id
        AND cfl.status != 'paid'
      ORDER BY array_position(p_call_line_ids, cfl.id)
    LOOP
      EXIT WHEN v_remaining <= 0;

      v_alloc := LEAST(v_remaining, v_line.remaining);

      IF v_alloc > 0 THEN
        INSERT INTO payment_allocations (copro_id, payment_id, call_line_id, amount_allocated)
        VALUES (v_copro_id, p_payment_id, v_line.id, v_alloc);

        UPDATE call_for_funds_lines
        SET amount_paid = amount_paid + v_alloc
        WHERE id = v_line.id;

        v_remaining := v_remaining - v_alloc;

        call_line_id := v_line.id;
        amount_allocated := v_alloc;
        RETURN NEXT;
      END IF;
    END LOOP;
  END IF;

  -- Mettre à jour le statut des appels concernés
  UPDATE call_for_funds cf
  SET status = CASE
    WHEN cf.status IN ('draft', 'cancelled') THEN cf.status
    WHEN NOT EXISTS (
      SELECT 1 FROM call_for_funds_lines cfl
      WHERE cfl.call_id = cf.id AND cfl.status != 'paid'
    ) THEN 'paid'
    WHEN EXISTS (
      SELECT 1 FROM call_for_funds_lines cfl
      WHERE cfl.call_id = cf.id AND cfl.amount_paid > 0
    ) THEN 'partially_paid'
    ELSE 'issued'
  END
  WHERE cf.id IN (
    SELECT DISTINCT cfl.call_id
    FROM payment_allocations pa
    JOIN call_for_funds_lines cfl ON cfl.id = pa.call_line_id
    WHERE pa.payment_id = p_payment_id
  );

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Fonction: Rafraîchir le statut d'un mouvement bancaire
CREATE OR REPLACE FUNCTION refresh_bank_movement_status(p_movement_id UUID)
RETURNS bank_movement_status AS $$
DECLARE
  v_movement RECORD;
  v_matched_total NUMERIC;
  v_new_status bank_movement_status;
BEGIN
  SELECT * INTO v_movement FROM bank_movements WHERE id = p_movement_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bank movement not found: %', p_movement_id;
  END IF;

  -- Si déjà ignoré, ne pas changer
  IF v_movement.status = 'ignored' THEN
    RETURN 'ignored';
  END IF;

  -- Calculer le total rapproché
  SELECT COALESCE(SUM(amount_matched), 0)
  INTO v_matched_total
  FROM bank_matches
  WHERE bank_movement_id = p_movement_id;

  -- Comparer avec le montant absolu
  IF v_matched_total >= ABS(v_movement.amount_signed) THEN
    v_new_status := 'matched';
  ELSE
    v_new_status := 'unmatched';
  END IF;

  UPDATE bank_movements
  SET status = v_new_status
  WHERE id = p_movement_id;

  RETURN v_new_status;
END;
$$ LANGUAGE plpgsql;

-- Fonction: Calculer le total payé pour une facture fournisseur
CREATE OR REPLACE FUNCTION get_supplier_invoice_paid_amount(p_invoice_id UUID)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM supplier_payments
  WHERE supplier_invoice_id = p_invoice_id;
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- PARTIE 8: VUES POUR LISTINGS
-- ============================================================================

-- Vue: Synthèse des appels de fonds
CREATE OR REPLACE VIEW v_calls_overview
WITH (security_invoker = true) AS
SELECT
  cf.id,
  cf.copro_id,
  cf.period_id,
  cf.budget_id,
  cf.repartition_key_id,
  rk.name as repartition_key_name,
  cf.label,
  cf.trimester,
  cf.issue_date,
  cf.due_date,
  cf.total_amount,
  cf.status,
  cf.ledger_tx_id,
  cf.created_at,
  cf.issued_at,
  COALESCE(SUM(cfl.amount_paid), 0) as total_paid,
  cf.total_amount - COALESCE(SUM(cfl.amount_paid), 0) as total_unpaid,
  COUNT(cfl.id) as lines_count,
  COUNT(cfl.id) FILTER (WHERE cfl.status = 'paid') as lines_paid_count,
  COUNT(cfl.id) FILTER (WHERE cfl.status != 'paid') as lines_unpaid_count
FROM call_for_funds cf
LEFT JOIN call_for_funds_lines cfl ON cfl.call_id = cf.id
LEFT JOIN repartition_keys rk ON rk.id = cf.repartition_key_id
GROUP BY cf.id, rk.name;

COMMENT ON VIEW v_calls_overview IS 'Synthèse des appels de fonds avec totaux payés/impayés.';

-- Vue: Détail des lignes d'appel avec info lot et propriétaire
CREATE OR REPLACE VIEW v_call_lines_detailed
WITH (security_invoker = true) AS
SELECT
  cfl.id,
  cfl.copro_id,
  cfl.call_id,
  cf.label as call_label,
  cf.issue_date,
  cf.due_date,
  cf.status as call_status,
  cfl.lot_id,
  l.ref as lot_ref,
  l.type as lot_type,
  cfl.amount_due,
  cfl.amount_paid,
  cfl.amount_due - cfl.amount_paid as amount_remaining,
  cfl.status,
  -- Premier propriétaire actif
  (
    SELECT cp.first_name || ' ' || cp.last_name
    FROM lot_owners lo
    JOIN coproprietaires cp ON cp.id = lo.coproprietaire_id
    WHERE lo.lot_id = cfl.lot_id
      AND lo.is_primary = true
      AND (lo.end_date IS NULL OR lo.end_date > CURRENT_DATE)
    LIMIT 1
  ) as owner_name
FROM call_for_funds_lines cfl
JOIN call_for_funds cf ON cf.id = cfl.call_id
JOIN lots l ON l.id = cfl.lot_id;

COMMENT ON VIEW v_call_lines_detailed IS 'Lignes d appels avec info lot et propriétaire.';

-- Vue: Synthèse des paiements
CREATE OR REPLACE VIEW v_payments_overview
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.copro_id,
  p.period_id,
  p.lot_id,
  l.ref as lot_ref,
  p.amount,
  p.payment_date,
  p.method,
  p.reference,
  p.status,
  p.ledger_tx_id,
  p.created_at,
  COALESCE(SUM(pa.amount_allocated), 0) as total_allocated,
  p.amount - COALESCE(SUM(pa.amount_allocated), 0) as unallocated,
  COUNT(pa.id) as allocations_count,
  -- Nom propriétaire
  (
    SELECT cp.first_name || ' ' || cp.last_name
    FROM lot_owners lo
    JOIN coproprietaires cp ON cp.id = lo.coproprietaire_id
    WHERE lo.lot_id = p.lot_id
      AND lo.is_primary = true
      AND (lo.end_date IS NULL OR lo.end_date > CURRENT_DATE)
    LIMIT 1
  ) as owner_name
FROM payments p
JOIN lots l ON l.id = p.lot_id
LEFT JOIN payment_allocations pa ON pa.payment_id = p.id
GROUP BY p.id, l.ref;

COMMENT ON VIEW v_payments_overview IS 'Paiements avec ventilation et propriétaire.';

-- Vue: Synthèse des factures fournisseurs
CREATE OR REPLACE VIEW v_supplier_invoices_overview
WITH (security_invoker = true) AS
SELECT
  si.id,
  si.copro_id,
  si.period_id,
  si.supplier_id,
  s.name as supplier_name,
  si.invoice_number,
  si.invoice_date,
  si.due_date,
  si.label,
  si.total_amount,
  si.status,
  si.ledger_tx_id,
  si.document_id,
  si.created_at,
  COALESCE(SUM(sp.amount), 0) as total_paid,
  si.total_amount - COALESCE(SUM(sp.amount), 0) as remaining_to_pay,
  COUNT(sp.id) as payments_count
FROM supplier_invoices si
JOIN suppliers s ON s.id = si.supplier_id
LEFT JOIN supplier_payments sp ON sp.supplier_invoice_id = si.id
GROUP BY si.id, s.name;

COMMENT ON VIEW v_supplier_invoices_overview IS 'Factures fournisseurs avec montants payés.';

-- Vue: Synthèse des mouvements bancaires
CREATE OR REPLACE VIEW v_bank_movements_overview
WITH (security_invoker = true) AS
SELECT
  bm.id,
  bm.copro_id,
  bm.period_id,
  bm.bank_date,
  bm.value_date,
  bm.amount_signed,
  CASE WHEN bm.amount_signed > 0 THEN 'credit' ELSE 'debit' END as direction,
  ABS(bm.amount_signed) as amount_abs,
  bm.label,
  bm.bank_ref,
  bm.status,
  bm.created_at,
  COALESCE(SUM(bmatch.amount_matched), 0) as total_matched,
  ABS(bm.amount_signed) - COALESCE(SUM(bmatch.amount_matched), 0) as remaining_to_match,
  COUNT(bmatch.id) as matches_count
FROM bank_movements bm
LEFT JOIN bank_matches bmatch ON bmatch.bank_movement_id = bm.id
GROUP BY bm.id;

COMMENT ON VIEW v_bank_movements_overview IS 'Mouvements bancaires avec état de rapprochement.';

-- Vue: Impayés par lot (pour page /finance/unpaid)
CREATE OR REPLACE VIEW v_unpaid_by_lot
WITH (security_invoker = true) AS
SELECT
  cfl.copro_id,
  cfl.lot_id,
  l.ref as lot_ref,
  (
    SELECT cp.first_name || ' ' || cp.last_name
    FROM lot_owners lo
    JOIN coproprietaires cp ON cp.id = lo.coproprietaire_id
    WHERE lo.lot_id = cfl.lot_id
      AND lo.is_primary = true
      AND (lo.end_date IS NULL OR lo.end_date > CURRENT_DATE)
    LIMIT 1
  ) as owner_name,
  (
    SELECT cp.email
    FROM lot_owners lo
    JOIN coproprietaires cp ON cp.id = lo.coproprietaire_id
    WHERE lo.lot_id = cfl.lot_id
      AND lo.is_primary = true
      AND (lo.end_date IS NULL OR lo.end_date > CURRENT_DATE)
    LIMIT 1
  ) as owner_email,
  SUM(cfl.amount_due - cfl.amount_paid) as total_unpaid,
  COUNT(cfl.id) as unpaid_lines_count,
  MIN(cf.due_date) as oldest_due_date,
  CURRENT_DATE - MIN(cf.due_date) as days_overdue
FROM call_for_funds_lines cfl
JOIN call_for_funds cf ON cf.id = cfl.call_id
JOIN lots l ON l.id = cfl.lot_id
WHERE cfl.status != 'paid'
  AND cf.status NOT IN ('draft', 'cancelled')
  AND cf.due_date < CURRENT_DATE
GROUP BY cfl.copro_id, cfl.lot_id, l.ref
HAVING SUM(cfl.amount_due - cfl.amount_paid) > 0
ORDER BY total_unpaid DESC;

COMMENT ON VIEW v_unpaid_by_lot IS 'Impayés agrégés par lot pour suivi recouvrement.';

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
