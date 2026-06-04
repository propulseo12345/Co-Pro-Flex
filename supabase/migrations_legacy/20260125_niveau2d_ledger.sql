-- ============================================
-- Migration: NIVEAU 2D - LEDGER (Journal comptable double entrée)
-- Date: 2026-01-25
-- Description: Tables ledger immuable, triggers, fonction post, RLS, vues
-- Dépendances: copros, lots, lot_owners, profiles, accounting_periods, accounts
-- ============================================

-- ============================================
-- 0) PRÉREQUIS: Table accounts (si pas déjà créée par niveau 2A)
-- ============================================

-- Enum pour le type de compte (si pas déjà créé)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
    CREATE TYPE account_type AS ENUM (
      'asset',      -- Actif (classe 1-5)
      'liability',  -- Passif
      'equity',     -- Capitaux propres
      'revenue',    -- Produits (classe 7)
      'expense'     -- Charges (classe 6)
    );
  END IF;
END $$;

-- Table accounts (plan comptable)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type account_type NOT NULL,
  parent_id UUID NULL REFERENCES accounts(id) ON DELETE SET NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(copro_id, code)
);

CREATE INDEX IF NOT EXISTS idx_accounts_copro ON accounts(copro_id);
CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounts(code);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);

-- RLS sur accounts (si pas déjà fait)
DO $$
BEGIN
  ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN OTHERS THEN NULL; -- Déjà activé
END $$;

-- Policy SELECT accounts
DO $$
BEGIN
  CREATE POLICY "Users can view accounts of their copros"
    ON accounts FOR SELECT
    USING (user_has_copro_access(copro_id));
EXCEPTION
  WHEN duplicate_object THEN NULL; -- Policy exists
END $$;

-- Policy INSERT/UPDATE/DELETE accounts pour managers
DO $$
BEGIN
  CREATE POLICY "Only managers can manage accounts"
    ON accounts FOR ALL
    USING (user_is_copro_manager(copro_id))
    WITH CHECK (user_is_copro_manager(copro_id));
EXCEPTION
  WHEN duplicate_object THEN NULL; -- Policy exists
END $$;

COMMENT ON TABLE accounts IS 'Plan comptable par copropriété - niveau 2A';


-- ============================================
-- 1) TABLES PRINCIPALES
-- ============================================

-- A) ledger_transactions - En-tête des écritures comptables
CREATE TABLE IF NOT EXISTS ledger_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES accounting_periods(id),
  tx_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Source de l'écriture (pour traçabilité)
  source_type TEXT NULL CHECK (source_type IS NULL OR source_type IN (
    'budget', 'call_for_funds', 'payment', 'supplier_invoice',
    'bank_movement', 'transfer', 'od', 'opening', 'closing', 'manual'
  )),
  source_id UUID NULL,

  label TEXT NOT NULL,

  -- Statut immuable après posting
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted')),

  -- Audit
  created_by UUID NULL REFERENCES profiles(id),
  posted_by UUID NULL REFERENCES profiles(id),
  posted_at TIMESTAMPTZ NULL,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contrainte: posted_at et posted_by doivent être cohérents
  CONSTRAINT chk_posted_consistency CHECK (
    (status = 'draft' AND posted_at IS NULL AND posted_by IS NULL) OR
    (status = 'posted' AND posted_at IS NOT NULL)
  )
);

-- Index pour ledger_transactions
CREATE INDEX IF NOT EXISTS idx_ledger_tx_copro_period_date ON ledger_transactions(copro_id, period_id, tx_date);
CREATE INDEX IF NOT EXISTS idx_ledger_tx_copro_status ON ledger_transactions(copro_id, status);
CREATE INDEX IF NOT EXISTS idx_ledger_tx_source ON ledger_transactions(source_type, source_id) WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ledger_tx_created_at ON ledger_transactions(created_at DESC);

COMMENT ON TABLE ledger_transactions IS 'En-tête des écritures comptables - immuable après posting';
COMMENT ON COLUMN ledger_transactions.source_type IS 'Type de document source (facture, appel, paiement, etc.)';
COMMENT ON COLUMN ledger_transactions.status IS 'draft=modifiable, posted=immuable';


-- B) ledger_entries - Lignes d'écriture (débit/crédit)
CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_id UUID NOT NULL REFERENCES ledger_transactions(id) ON DELETE CASCADE,

  -- Dénormalisation pour performance des vues (doit correspondre à la transaction)
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES accounting_periods(id),

  -- Compte impacté
  account_id UUID NOT NULL REFERENCES accounts(id),

  -- Lot optionnel (pour comptes tiers copropriétaires)
  lot_id UUID NULL REFERENCES lots(id),

  -- Direction et montant (toujours positif)
  direction TEXT NOT NULL CHECK (direction IN ('debit', 'credit')),
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),

  -- Libellé spécifique à la ligne (optionnel)
  entry_label TEXT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour ledger_entries
CREATE INDEX IF NOT EXISTS idx_ledger_entries_tx ON ledger_entries(tx_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_copro_period_account ON ledger_entries(copro_id, period_id, account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_lot ON ledger_entries(lot_id) WHERE lot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account ON ledger_entries(account_id);

COMMENT ON TABLE ledger_entries IS 'Lignes de débit/crédit - immuables si transaction posted';
COMMENT ON COLUMN ledger_entries.direction IS 'debit ou credit';
COMMENT ON COLUMN ledger_entries.amount IS 'Toujours positif, la direction indique le sens';


-- C) ledger_locks - Verrouillage optionnel pour audit/clôture
CREATE TABLE IF NOT EXISTS ledger_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES accounting_periods(id),

  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_by UUID NOT NULL REFERENCES profiles(id),
  reason TEXT NULL,

  -- Un seul verrou actif par copro/période
  UNIQUE(copro_id, period_id)
);

CREATE INDEX IF NOT EXISTS idx_ledger_locks_copro ON ledger_locks(copro_id);

COMMENT ON TABLE ledger_locks IS 'Verrous de période pour audit/clôture - bloque les nouvelles écritures';


-- ============================================
-- 2) INVARIANTS DB - TRIGGERS D'IMMUTABILITÉ
-- ============================================

-- A) Trigger: Empêcher UPDATE sur transaction posted
CREATE OR REPLACE FUNCTION trg_ledger_tx_immutable()
RETURNS TRIGGER AS $$
BEGIN
  -- Empêcher toute modification si la transaction est posted
  IF OLD.status = 'posted' THEN
    RAISE EXCEPTION 'Cannot modify posted transaction (id=%)', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;

  -- Empêcher de revenir à draft
  IF NEW.status = 'draft' AND OLD.status = 'posted' THEN
    RAISE EXCEPTION 'Cannot revert posted transaction to draft (id=%)', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ledger_tx_before_update ON ledger_transactions;
CREATE TRIGGER trg_ledger_tx_before_update
  BEFORE UPDATE ON ledger_transactions
  FOR EACH ROW
  EXECUTE FUNCTION trg_ledger_tx_immutable();


-- B) Trigger: Empêcher DELETE sur transaction posted
CREATE OR REPLACE FUNCTION trg_ledger_tx_no_delete_posted()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'posted' THEN
    RAISE EXCEPTION 'Cannot delete posted transaction (id=%)', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ledger_tx_before_delete ON ledger_transactions;
CREATE TRIGGER trg_ledger_tx_before_delete
  BEFORE DELETE ON ledger_transactions
  FOR EACH ROW
  EXECUTE FUNCTION trg_ledger_tx_no_delete_posted();


-- C) Trigger: Empêcher UPDATE/DELETE sur entries si transaction posted
CREATE OR REPLACE FUNCTION trg_ledger_entry_immutable()
RETURNS TRIGGER AS $$
DECLARE
  v_tx_status TEXT;
BEGIN
  -- Récupérer le statut de la transaction parent
  SELECT status INTO v_tx_status
  FROM ledger_transactions
  WHERE id = OLD.tx_id;

  IF v_tx_status = 'posted' THEN
    IF TG_OP = 'UPDATE' THEN
      RAISE EXCEPTION 'Cannot modify entry on posted transaction (entry_id=%, tx_id=%)', OLD.id, OLD.tx_id
        USING ERRCODE = 'restrict_violation';
    ELSIF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Cannot delete entry from posted transaction (entry_id=%, tx_id=%)', OLD.id, OLD.tx_id
        USING ERRCODE = 'restrict_violation';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ledger_entry_before_update ON ledger_entries;
CREATE TRIGGER trg_ledger_entry_before_update
  BEFORE UPDATE ON ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION trg_ledger_entry_immutable();

DROP TRIGGER IF EXISTS trg_ledger_entry_before_delete ON ledger_entries;
CREATE TRIGGER trg_ledger_entry_before_delete
  BEFORE DELETE ON ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION trg_ledger_entry_immutable();


-- D) Trigger: Empêcher INSERT sur entries si transaction posted
CREATE OR REPLACE FUNCTION trg_ledger_entry_no_insert_posted()
RETURNS TRIGGER AS $$
DECLARE
  v_tx_status TEXT;
BEGIN
  SELECT status INTO v_tx_status
  FROM ledger_transactions
  WHERE id = NEW.tx_id;

  IF v_tx_status = 'posted' THEN
    RAISE EXCEPTION 'Cannot add entry to posted transaction (tx_id=%)', NEW.tx_id
      USING ERRCODE = 'restrict_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ledger_entry_before_insert ON ledger_entries;
CREATE TRIGGER trg_ledger_entry_before_insert
  BEFORE INSERT ON ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION trg_ledger_entry_no_insert_posted();


-- E) Trigger: Consistance copro_id/period_id entre entry et transaction
CREATE OR REPLACE FUNCTION trg_ledger_entry_consistency()
RETURNS TRIGGER AS $$
DECLARE
  v_tx_copro_id UUID;
  v_tx_period_id UUID;
BEGIN
  -- Récupérer copro_id et period_id de la transaction
  SELECT copro_id, period_id
  INTO v_tx_copro_id, v_tx_period_id
  FROM ledger_transactions
  WHERE id = NEW.tx_id;

  IF v_tx_copro_id IS NULL THEN
    RAISE EXCEPTION 'Transaction not found (tx_id=%)', NEW.tx_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF NEW.copro_id != v_tx_copro_id THEN
    RAISE EXCEPTION 'Entry copro_id (%) must match transaction copro_id (%)', NEW.copro_id, v_tx_copro_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.period_id != v_tx_period_id THEN
    RAISE EXCEPTION 'Entry period_id (%) must match transaction period_id (%)', NEW.period_id, v_tx_period_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ledger_entry_consistency ON ledger_entries;
CREATE TRIGGER trg_ledger_entry_consistency
  BEFORE INSERT OR UPDATE ON ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION trg_ledger_entry_consistency();


-- ============================================
-- 3) FONCTION post_ledger_transaction
-- ============================================

CREATE OR REPLACE FUNCTION post_ledger_transaction(p_tx_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_tx RECORD;
  v_period RECORD;
  v_total_debit NUMERIC(15,2);
  v_total_credit NUMERIC(15,2);
  v_entry_count INT;
  v_has_lock BOOLEAN;
BEGIN
  -- 1. Vérifier que la transaction existe et récupérer ses données
  SELECT * INTO v_tx
  FROM ledger_transactions
  WHERE id = p_tx_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Transaction not found',
      'tx_id', p_tx_id
    );
  END IF;

  -- 2. Vérifier que la transaction est en draft
  IF v_tx.status = 'posted' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Transaction already posted',
      'tx_id', p_tx_id,
      'posted_at', v_tx.posted_at
    );
  END IF;

  -- 3. Vérifier que la période comptable est ouverte
  SELECT * INTO v_period
  FROM accounting_periods
  WHERE id = v_tx.period_id;

  IF v_period.status != 'open' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Period is not open (status=%s)', v_period.status),
      'tx_id', p_tx_id,
      'period_id', v_tx.period_id,
      'period_status', v_period.status
    );
  END IF;

  -- 4. Vérifier qu'il n'y a pas de verrou sur la période
  SELECT EXISTS (
    SELECT 1 FROM ledger_locks
    WHERE copro_id = v_tx.copro_id AND period_id = v_tx.period_id
  ) INTO v_has_lock;

  IF v_has_lock THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Period is locked for this copro',
      'tx_id', p_tx_id,
      'period_id', v_tx.period_id
    );
  END IF;

  -- 5. Calculer les totaux et vérifier l'équilibre
  SELECT
    COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END), 0),
    COUNT(*)
  INTO v_total_debit, v_total_credit, v_entry_count
  FROM ledger_entries
  WHERE tx_id = p_tx_id;

  -- Vérifier qu'il y a des écritures
  IF v_entry_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Transaction has no entries',
      'tx_id', p_tx_id
    );
  END IF;

  -- Vérifier l'équilibre (tolérance de 0.01 pour les arrondis)
  IF ABS(v_total_debit - v_total_credit) > 0.01 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Transaction is not balanced',
      'tx_id', p_tx_id,
      'total_debit', v_total_debit,
      'total_credit', v_total_credit,
      'difference', v_total_debit - v_total_credit
    );
  END IF;

  -- 6. Passer la transaction en posted
  UPDATE ledger_transactions
  SET
    status = 'posted',
    posted_at = NOW(),
    posted_by = auth.uid()
  WHERE id = p_tx_id;

  -- 7. Retourner le succès
  RETURN jsonb_build_object(
    'success', true,
    'tx_id', p_tx_id,
    'total_debit', v_total_debit,
    'total_credit', v_total_credit,
    'entry_count', v_entry_count,
    'posted_at', NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'tx_id', p_tx_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION post_ledger_transaction IS 'Valide et poste une transaction draft - vérifie période ouverte et équilibre';


-- ============================================
-- 4) RLS POLICIES
-- ============================================

-- Activer RLS
ALTER TABLE ledger_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_locks ENABLE ROW LEVEL SECURITY;

-- ledger_transactions: SELECT pour tous les membres de la copro
CREATE POLICY "Users can view ledger_transactions of their copros"
ON ledger_transactions FOR SELECT
USING (user_has_copro_access(copro_id));

-- ledger_transactions: INSERT uniquement pour managers
CREATE POLICY "Only managers can insert ledger_transactions"
ON ledger_transactions FOR INSERT
WITH CHECK (user_is_copro_manager(copro_id));

-- ledger_transactions: UPDATE uniquement pour managers (et si draft - via trigger)
CREATE POLICY "Only managers can update ledger_transactions"
ON ledger_transactions FOR UPDATE
USING (user_is_copro_manager(copro_id))
WITH CHECK (user_is_copro_manager(copro_id));

-- ledger_transactions: DELETE uniquement pour managers (et si draft - via trigger)
CREATE POLICY "Only managers can delete ledger_transactions"
ON ledger_transactions FOR DELETE
USING (user_is_copro_manager(copro_id));


-- ledger_entries: SELECT pour tous les membres de la copro
CREATE POLICY "Users can view ledger_entries of their copros"
ON ledger_entries FOR SELECT
USING (user_has_copro_access(copro_id));

-- ledger_entries: INSERT uniquement pour managers
CREATE POLICY "Only managers can insert ledger_entries"
ON ledger_entries FOR INSERT
WITH CHECK (user_is_copro_manager(copro_id));

-- ledger_entries: UPDATE uniquement pour managers
CREATE POLICY "Only managers can update ledger_entries"
ON ledger_entries FOR UPDATE
USING (user_is_copro_manager(copro_id))
WITH CHECK (user_is_copro_manager(copro_id));

-- ledger_entries: DELETE uniquement pour managers
CREATE POLICY "Only managers can delete ledger_entries"
ON ledger_entries FOR DELETE
USING (user_is_copro_manager(copro_id));


-- ledger_locks: SELECT pour tous les membres
CREATE POLICY "Users can view ledger_locks of their copros"
ON ledger_locks FOR SELECT
USING (user_has_copro_access(copro_id));

-- ledger_locks: INSERT/UPDATE/DELETE uniquement pour managers
CREATE POLICY "Only managers can manage ledger_locks"
ON ledger_locks FOR ALL
USING (user_is_copro_manager(copro_id))
WITH CHECK (user_is_copro_manager(copro_id));


-- ============================================
-- 5) VUES COMPTABLES
-- ============================================

-- A) v_general_ledger - Grand Livre (détail des écritures)
CREATE OR REPLACE VIEW v_general_ledger AS
SELECT
  e.id AS entry_id,
  e.tx_id,
  t.copro_id,
  t.period_id,
  t.tx_date,
  t.label AS tx_label,
  t.source_type,
  t.source_id,
  t.status,
  t.posted_at,

  a.id AS account_id,
  a.code AS account_code,
  a.name AS account_name,
  a.account_type,

  e.lot_id,
  l.ref AS lot_ref,

  e.entry_label,
  e.direction,
  e.amount,

  -- Colonnes débit/crédit séparées pour faciliter les calculs
  CASE WHEN e.direction = 'debit' THEN e.amount ELSE 0 END AS debit,
  CASE WHEN e.direction = 'credit' THEN e.amount ELSE 0 END AS credit,

  t.created_at,
  t.created_by,
  p_creator.full_name AS created_by_name,
  t.posted_by,
  p_poster.full_name AS posted_by_name

FROM ledger_entries e
JOIN ledger_transactions t ON t.id = e.tx_id
JOIN accounts a ON a.id = e.account_id
LEFT JOIN lots l ON l.id = e.lot_id
LEFT JOIN profiles p_creator ON p_creator.id = t.created_by
LEFT JOIN profiles p_poster ON p_poster.id = t.posted_by;

ALTER VIEW v_general_ledger SET (security_invoker = true);

COMMENT ON VIEW v_general_ledger IS 'Grand livre - détail des écritures comptables avec comptes et lots';


-- B) v_trial_balance - Balance des comptes (par période)
CREATE OR REPLACE VIEW v_trial_balance AS
SELECT
  e.copro_id,
  e.period_id,
  ap.name AS period_name,
  e.account_id,
  a.code AS account_code,
  a.name AS account_name,
  a.account_type,
  a.parent_id AS account_parent_id,

  SUM(CASE WHEN e.direction = 'debit' THEN e.amount ELSE 0 END) AS total_debit,
  SUM(CASE WHEN e.direction = 'credit' THEN e.amount ELSE 0 END) AS total_credit,
  SUM(CASE WHEN e.direction = 'debit' THEN e.amount ELSE 0 END) -
    SUM(CASE WHEN e.direction = 'credit' THEN e.amount ELSE 0 END) AS balance,

  COUNT(*) AS entry_count

FROM ledger_entries e
JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted'
JOIN accounts a ON a.id = e.account_id
JOIN accounting_periods ap ON ap.id = e.period_id
GROUP BY e.copro_id, e.period_id, ap.name, e.account_id, a.code, a.name, a.account_type, a.parent_id;

ALTER VIEW v_trial_balance SET (security_invoker = true);

COMMENT ON VIEW v_trial_balance IS 'Balance des comptes par période (uniquement écritures posted)';


-- C) v_lot_balance - Solde par lot (pour impayés)
CREATE OR REPLACE VIEW v_lot_balance AS
SELECT
  e.copro_id,
  e.lot_id,
  l.ref AS lot_ref,
  l.type AS lot_type,
  l.tantiemes_generaux,

  -- Propriétaire actuel (le plus récent)
  lo.coproprietaire_id,
  COALESCE(
    CASE WHEN c.is_company THEN c.company_name
    ELSE CONCAT(c.first_name, ' ', c.last_name)
    END,
    'Propriétaire inconnu'
  ) AS owner_name,
  c.email AS owner_email,

  -- Totaux sur toutes les périodes
  SUM(CASE WHEN e.direction = 'debit' THEN e.amount ELSE 0 END) AS total_debit,
  SUM(CASE WHEN e.direction = 'credit' THEN e.amount ELSE 0 END) AS total_credit,
  SUM(CASE WHEN e.direction = 'debit' THEN e.amount ELSE 0 END) -
    SUM(CASE WHEN e.direction = 'credit' THEN e.amount ELSE 0 END) AS balance,

  COUNT(*) AS entry_count,
  MAX(t.tx_date) AS last_movement_date

FROM ledger_entries e
JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted'
JOIN lots l ON l.id = e.lot_id
LEFT JOIN lot_owners lo ON lo.lot_id = e.lot_id
  AND lo.end_date IS NULL  -- Propriétaire actuel
  AND lo.is_primary = true
LEFT JOIN coproprietaires c ON c.id = lo.coproprietaire_id
WHERE e.lot_id IS NOT NULL
GROUP BY e.copro_id, e.lot_id, l.ref, l.type, l.tantiemes_generaux,
         lo.coproprietaire_id, c.is_company, c.company_name, c.first_name, c.last_name, c.email;

ALTER VIEW v_lot_balance SET (security_invoker = true);

COMMENT ON VIEW v_lot_balance IS 'Solde comptable par lot avec propriétaire actuel';


-- D) v_owner_balance - Solde par copropriétaire (agrégation des lots)
CREATE OR REPLACE VIEW v_owner_balance AS
SELECT
  lb.copro_id,
  lb.coproprietaire_id,
  lb.owner_name,
  lb.owner_email,

  COUNT(DISTINCT lb.lot_id) AS lots_count,
  SUM(lb.tantiemes_generaux) AS total_tantiemes,

  SUM(lb.total_debit) AS total_debit,
  SUM(lb.total_credit) AS total_credit,
  SUM(lb.balance) AS balance,

  SUM(lb.entry_count) AS entry_count,
  MAX(lb.last_movement_date) AS last_movement_date

FROM v_lot_balance lb
WHERE lb.coproprietaire_id IS NOT NULL
GROUP BY lb.copro_id, lb.coproprietaire_id, lb.owner_name, lb.owner_email;

ALTER VIEW v_owner_balance SET (security_invoker = true);

COMMENT ON VIEW v_owner_balance IS 'Solde comptable par copropriétaire (somme des lots détenus)';


-- E) v_unpaid_lots - Lots avec impayés (balance > 0)
CREATE OR REPLACE VIEW v_unpaid_lots AS
SELECT
  lb.*,

  -- Catégorisation de l'impayé
  CASE
    WHEN lb.balance <= 0 THEN 'OK'
    WHEN lb.balance <= 100 THEN 'MINOR'
    WHEN lb.balance <= 500 THEN 'MEDIUM'
    WHEN lb.balance <= 2000 THEN 'HIGH'
    ELSE 'CRITICAL'
  END AS severity,

  -- Calcul de l'ancienneté
  CURRENT_DATE - lb.last_movement_date AS days_since_last_movement

FROM v_lot_balance lb
WHERE lb.balance > 0;

ALTER VIEW v_unpaid_lots SET (security_invoker = true);

COMMENT ON VIEW v_unpaid_lots IS 'Lots en situation d''impayé (balance débitrice)';


-- F) v_account_movements - Mouvements par compte (pour grand livre par compte)
CREATE OR REPLACE VIEW v_account_movements AS
SELECT
  gl.*,

  -- Solde cumulé (running balance) - calculé à l'affichage par le front ou via window function
  SUM(gl.debit - gl.credit) OVER (
    PARTITION BY gl.copro_id, gl.account_id
    ORDER BY gl.tx_date, gl.entry_id
  ) AS running_balance

FROM v_general_ledger gl
WHERE gl.status = 'posted'
ORDER BY gl.copro_id, gl.account_id, gl.tx_date, gl.entry_id;

ALTER VIEW v_account_movements SET (security_invoker = true);

COMMENT ON VIEW v_account_movements IS 'Mouvements par compte avec solde cumulé';


-- ============================================
-- 6) FONCTIONS UTILITAIRES
-- ============================================

-- Fonction pour vérifier l'équilibre d'une transaction
CREATE OR REPLACE FUNCTION check_transaction_balance(p_tx_id UUID)
RETURNS TABLE (
  is_balanced BOOLEAN,
  total_debit NUMERIC(15,2),
  total_credit NUMERIC(15,2),
  difference NUMERIC(15,2),
  entry_count INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ABS(SUM(CASE WHEN direction = 'debit' THEN amount ELSE 0 END) -
        SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END)) <= 0.01,
    SUM(CASE WHEN direction = 'debit' THEN amount ELSE 0 END),
    SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END),
    SUM(CASE WHEN direction = 'debit' THEN amount ELSE 0 END) -
      SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END),
    COUNT(*)::INT
  FROM ledger_entries
  WHERE tx_id = p_tx_id;
END;
$$ LANGUAGE plpgsql STABLE;


-- Fonction pour créer une transaction avec ses entrées en une seule opération
CREATE OR REPLACE FUNCTION create_ledger_transaction(
  p_copro_id UUID,
  p_period_id UUID,
  p_tx_date DATE,
  p_label TEXT,
  p_source_type TEXT DEFAULT NULL,
  p_source_id UUID DEFAULT NULL,
  p_entries JSONB DEFAULT '[]'::JSONB,
  p_auto_post BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
  v_tx_id UUID;
  v_entry JSONB;
  v_total_debit NUMERIC := 0;
  v_total_credit NUMERIC := 0;
BEGIN
  -- Créer la transaction
  INSERT INTO ledger_transactions (
    copro_id, period_id, tx_date, label, source_type, source_id, created_by
  ) VALUES (
    p_copro_id, p_period_id, p_tx_date, p_label, p_source_type, p_source_id, auth.uid()
  )
  RETURNING id INTO v_tx_id;

  -- Insérer les entrées
  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    INSERT INTO ledger_entries (
      tx_id, copro_id, period_id, account_id, lot_id, direction, amount, entry_label
    ) VALUES (
      v_tx_id,
      p_copro_id,
      p_period_id,
      (v_entry->>'account_id')::UUID,
      (v_entry->>'lot_id')::UUID,
      v_entry->>'direction',
      (v_entry->>'amount')::NUMERIC,
      v_entry->>'entry_label'
    );

    IF v_entry->>'direction' = 'debit' THEN
      v_total_debit := v_total_debit + (v_entry->>'amount')::NUMERIC;
    ELSE
      v_total_credit := v_total_credit + (v_entry->>'amount')::NUMERIC;
    END IF;
  END LOOP;

  -- Auto-post si demandé et équilibré
  IF p_auto_post AND ABS(v_total_debit - v_total_credit) <= 0.01 THEN
    RETURN post_ledger_transaction(v_tx_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'tx_id', v_tx_id,
    'total_debit', v_total_debit,
    'total_credit', v_total_credit,
    'status', 'draft'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_ledger_transaction IS 'Crée une transaction avec ses entrées en une seule opération atomique';


-- ============================================
-- 7) SEED DATA
-- ============================================

-- Le seed sera exécuté dans un fichier séparé pour permettre son utilisation conditionnelle
-- Voir: 20260125_niveau2d_ledger_seed.sql

