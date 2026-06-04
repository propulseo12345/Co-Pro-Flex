-- ============================================================================
-- MIGRATION CONSOLIDÉE : Invariants Finance & RLS Owner-Safe
-- CoProFlex - Audit Logique Métier Bloquant Onboarding
-- Date: 2026-01-26
-- Description: Correction des gaps critiques identifiés dans l'audit
-- ============================================================================
--
-- CORRECTIONS APPORTÉES:
-- 1) Invariant factures fournisseurs: total_amount = SUM(lignes.amount)
-- 2) Index manquants pour performance RLS
-- 3) Consolidation des fonctions helper
-- 4) Vue de monitoring des incohérences
--
-- PRÉ-REQUIS: Migrations action1-10 déjà appliquées
-- ============================================================================

-- ============================================================================
-- PARTIE 1: INVARIANT FACTURES FOURNISSEURS
-- supplier_invoices.total_amount = SUM(supplier_invoice_lines.amount)
-- ============================================================================

-- 1.1) Fonction de validation du total facture
CREATE OR REPLACE FUNCTION validate_supplier_invoice_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id UUID;
  v_expected_total NUMERIC(12,2);
  v_lines_total NUMERIC(12,2);
  v_tolerance NUMERIC := 0.01;
BEGIN
  -- Déterminer l'invoice_id concerné
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  -- Récupérer le total attendu (avec verrou pour éviter race condition)
  SELECT total_amount INTO v_expected_total
  FROM supplier_invoices
  WHERE id = v_invoice_id
  FOR UPDATE;

  -- Si la facture n'existe plus, on laisse passer (cascade delete)
  IF v_expected_total IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Calculer la somme des lignes
  IF TG_OP = 'INSERT' THEN
    SELECT COALESCE(SUM(amount), 0) + NEW.amount
    INTO v_lines_total
    FROM supplier_invoice_lines
    WHERE invoice_id = v_invoice_id;

  ELSIF TG_OP = 'UPDATE' THEN
    SELECT COALESCE(SUM(amount), 0) - OLD.amount + NEW.amount
    INTO v_lines_total
    FROM supplier_invoice_lines
    WHERE invoice_id = v_invoice_id;

  ELSIF TG_OP = 'DELETE' THEN
    SELECT COALESCE(SUM(amount), 0) - OLD.amount
    INTO v_lines_total
    FROM supplier_invoice_lines
    WHERE invoice_id = v_invoice_id;
  END IF;

  -- Vérifier la cohérence avec tolérance
  -- Ne pas bloquer si suppression totale (reset)
  IF TG_OP != 'DELETE' OR v_lines_total > v_tolerance THEN
    IF ABS(v_lines_total - v_expected_total) > v_tolerance THEN
      RAISE EXCEPTION 'Invariant violation: somme des lignes facture (%.2f) != total facture (%.2f) pour invoice_id %. Ecart: %.2f',
        v_lines_total, v_expected_total, v_invoice_id, ABS(v_lines_total - v_expected_total)
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Retourner le résultat approprié
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

COMMENT ON FUNCTION validate_supplier_invoice_total IS
  'Vérifie que la somme des lignes de facture fournisseur = total de la facture (tolérance 0.01€)';

-- 1.2) Trigger CONSTRAINT pour validation
DROP TRIGGER IF EXISTS trg_validate_invoice_total ON supplier_invoice_lines;

CREATE CONSTRAINT TRIGGER trg_validate_invoice_total
  AFTER INSERT OR UPDATE OF amount OR DELETE
  ON supplier_invoice_lines
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION validate_supplier_invoice_total();

-- 1.3) Fonction de vérification manuelle
CREATE OR REPLACE FUNCTION check_invoice_total_integrity(p_invoice_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_expected_total NUMERIC(12,2);
  v_lines_total NUMERIC(12,2);
  v_tolerance NUMERIC := 0.01;
BEGIN
  SELECT total_amount INTO v_expected_total
  FROM supplier_invoices
  WHERE id = p_invoice_id;

  IF v_expected_total IS NULL THEN
    RETURN TRUE; -- Facture n'existe pas
  END IF;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_lines_total
  FROM supplier_invoice_lines
  WHERE invoice_id = p_invoice_id;

  RETURN ABS(v_lines_total - v_expected_total) <= v_tolerance;
END;
$$;

COMMENT ON FUNCTION check_invoice_total_integrity IS
  'Fonction de vérification manuelle de l''intégrité d''une facture fournisseur';

-- ============================================================================
-- PARTIE 2: VUES DE MONITORING DES INCOHÉRENCES
-- ============================================================================

-- 2.1) Vue des factures avec incohérence total vs lignes
CREATE OR REPLACE VIEW v_invoice_total_mismatch
WITH (security_invoker = true) AS
SELECT
  si.id AS invoice_id,
  si.copro_id,
  si.supplier_id,
  s.name AS supplier_name,
  si.invoice_number,
  si.total_amount AS expected_total,
  COALESCE(SUM(sil.amount), 0) AS actual_lines_total,
  si.total_amount - COALESCE(SUM(sil.amount), 0) AS difference,
  si.status,
  si.created_at
FROM supplier_invoices si
JOIN suppliers s ON s.id = si.supplier_id
LEFT JOIN supplier_invoice_lines sil ON sil.invoice_id = si.id
GROUP BY si.id, s.name
HAVING ABS(si.total_amount - COALESCE(SUM(sil.amount), 0)) > 0.01;

COMMENT ON VIEW v_invoice_total_mismatch IS
  'Vue des factures fournisseurs avec incohérence total vs lignes';

-- 2.2) Vue consolidée des anomalies finance
CREATE OR REPLACE VIEW v_finance_integrity_issues
WITH (security_invoker = true) AS
-- Appels de fonds avec mismatch
SELECT
  'call_for_funds' AS entity_type,
  cf.id AS entity_id,
  cf.copro_id,
  cf.label AS description,
  cf.total_amount AS expected_amount,
  COALESCE(SUM(cfl.amount_due), 0) AS actual_amount,
  cf.total_amount - COALESCE(SUM(cfl.amount_due), 0) AS difference,
  'TOTAL_MISMATCH' AS issue_type,
  cf.created_at
FROM call_for_funds cf
LEFT JOIN call_for_funds_lines cfl ON cfl.call_id = cf.id
GROUP BY cf.id
HAVING ABS(cf.total_amount - COALESCE(SUM(cfl.amount_due), 0)) > 0.01

UNION ALL

-- Factures fournisseurs avec mismatch
SELECT
  'supplier_invoice' AS entity_type,
  si.id AS entity_id,
  si.copro_id,
  si.label AS description,
  si.total_amount AS expected_amount,
  COALESCE(SUM(sil.amount), 0) AS actual_amount,
  si.total_amount - COALESCE(SUM(sil.amount), 0) AS difference,
  'TOTAL_MISMATCH' AS issue_type,
  si.created_at
FROM supplier_invoices si
LEFT JOIN supplier_invoice_lines sil ON sil.invoice_id = si.id
GROUP BY si.id
HAVING ABS(si.total_amount - COALESCE(SUM(sil.amount), 0)) > 0.01

UNION ALL

-- Paiements sur-alloués
SELECT
  'payment' AS entity_type,
  p.id AS entity_id,
  p.copro_id,
  CONCAT('Paiement ', p.reference) AS description,
  p.amount AS expected_amount,
  COALESCE(SUM(pa.amount_allocated), 0) AS actual_amount,
  p.amount - COALESCE(SUM(pa.amount_allocated), 0) AS difference,
  CASE
    WHEN COALESCE(SUM(pa.amount_allocated), 0) > p.amount + 0.01 THEN 'OVER_ALLOCATED'
    ELSE 'UNDER_ALLOCATED'
  END AS issue_type,
  p.created_at
FROM payments p
LEFT JOIN payment_allocations pa ON pa.payment_id = p.id
GROUP BY p.id
HAVING COALESCE(SUM(pa.amount_allocated), 0) > p.amount + 0.01

UNION ALL

-- Factures sur-payées
SELECT
  'supplier_invoice' AS entity_type,
  si.id AS entity_id,
  si.copro_id,
  si.label AS description,
  si.total_amount AS expected_amount,
  COALESCE(SUM(sp.amount), 0) AS actual_amount,
  si.total_amount - COALESCE(SUM(sp.amount), 0) AS difference,
  'OVER_PAID' AS issue_type,
  si.created_at
FROM supplier_invoices si
LEFT JOIN supplier_payments sp ON sp.supplier_invoice_id = si.id
GROUP BY si.id
HAVING COALESCE(SUM(sp.amount), 0) > si.total_amount + 0.01;

COMMENT ON VIEW v_finance_integrity_issues IS
  'Vue consolidée de toutes les anomalies d''intégrité financière';

-- ============================================================================
-- PARTIE 3: INDEX SUPPLÉMENTAIRES POUR PERFORMANCE RLS
-- ============================================================================

-- Index sur supplier_invoice_lines pour lookup par invoice
CREATE INDEX IF NOT EXISTS idx_supplier_invoice_lines_invoice_id
  ON supplier_invoice_lines(invoice_id);

-- Index sur supplier_invoice_lines pour lookup par copro
CREATE INDEX IF NOT EXISTS idx_supplier_invoice_lines_copro_id
  ON supplier_invoice_lines(copro_id);

-- Index composite pour call_for_funds_lines
CREATE INDEX IF NOT EXISTS idx_call_lines_copro_call
  ON call_for_funds_lines(copro_id, call_id);

-- Index pour payment_allocations par call_line
CREATE INDEX IF NOT EXISTS idx_payment_allocations_call_line
  ON payment_allocations(call_line_id);

-- Index pour les lookup lot_owners par user (via coproprietaires)
CREATE INDEX IF NOT EXISTS idx_lot_owners_composite
  ON lot_owners(lot_id, coproprietaire_id, end_date)
  WHERE end_date IS NULL OR end_date > CURRENT_DATE;

-- ============================================================================
-- PARTIE 4: FONCTION DE RECALCUL GLOBAL (MAINTENANCE)
-- ============================================================================

-- 4.1) Fonction pour recalculer et corriger les totaux si nécessaire
CREATE OR REPLACE FUNCTION audit_finance_integrity(
  p_copro_id UUID DEFAULT NULL,
  p_fix_issues BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  entity_type TEXT,
  entity_id UUID,
  issue_type TEXT,
  expected_amount NUMERIC,
  actual_amount NUMERIC,
  fixed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
  v_fixed BOOLEAN;
BEGIN
  -- Vérifier les appels de fonds
  FOR v_rec IN
    SELECT
      cf.id,
      cf.total_amount AS expected,
      COALESCE(SUM(cfl.amount_due), 0) AS actual
    FROM call_for_funds cf
    LEFT JOIN call_for_funds_lines cfl ON cfl.call_id = cf.id
    WHERE (p_copro_id IS NULL OR cf.copro_id = p_copro_id)
    GROUP BY cf.id
    HAVING ABS(cf.total_amount - COALESCE(SUM(cfl.amount_due), 0)) > 0.01
  LOOP
    v_fixed := FALSE;
    IF p_fix_issues THEN
      -- Option: ajuster le total de l'appel (ou lever une alerte)
      UPDATE call_for_funds
      SET total_amount = v_rec.actual
      WHERE id = v_rec.id
        AND status = 'draft'; -- Seulement si draft
      v_fixed := FOUND;
    END IF;

    entity_type := 'call_for_funds';
    entity_id := v_rec.id;
    issue_type := 'TOTAL_MISMATCH';
    expected_amount := v_rec.expected;
    actual_amount := v_rec.actual;
    fixed := v_fixed;
    RETURN NEXT;
  END LOOP;

  -- Vérifier les factures fournisseurs
  FOR v_rec IN
    SELECT
      si.id,
      si.total_amount AS expected,
      COALESCE(SUM(sil.amount), 0) AS actual
    FROM supplier_invoices si
    LEFT JOIN supplier_invoice_lines sil ON sil.invoice_id = si.id
    WHERE (p_copro_id IS NULL OR si.copro_id = p_copro_id)
    GROUP BY si.id
    HAVING ABS(si.total_amount - COALESCE(SUM(sil.amount), 0)) > 0.01
  LOOP
    v_fixed := FALSE;
    IF p_fix_issues THEN
      UPDATE supplier_invoices
      SET total_amount = v_rec.actual
      WHERE id = v_rec.id
        AND status = 'draft';
      v_fixed := FOUND;
    END IF;

    entity_type := 'supplier_invoice';
    entity_id := v_rec.id;
    issue_type := 'TOTAL_MISMATCH';
    expected_amount := v_rec.expected;
    actual_amount := v_rec.actual;
    fixed := v_fixed;
    RETURN NEXT;
  END LOOP;

  -- Vérifier les paiements sur-alloués
  FOR v_rec IN
    SELECT
      p.id,
      p.amount AS expected,
      COALESCE(SUM(pa.amount_allocated), 0) AS actual
    FROM payments p
    LEFT JOIN payment_allocations pa ON pa.payment_id = p.id
    WHERE (p_copro_id IS NULL OR p.copro_id = p_copro_id)
    GROUP BY p.id
    HAVING COALESCE(SUM(pa.amount_allocated), 0) > p.amount + 0.01
  LOOP
    entity_type := 'payment';
    entity_id := v_rec.id;
    issue_type := 'OVER_ALLOCATED';
    expected_amount := v_rec.expected;
    actual_amount := v_rec.actual;
    fixed := FALSE; -- Ne pas corriger automatiquement
    RETURN NEXT;
  END LOOP;

  -- Vérifier les factures sur-payées
  FOR v_rec IN
    SELECT
      si.id,
      si.total_amount AS expected,
      COALESCE(SUM(sp.amount), 0) AS actual
    FROM supplier_invoices si
    LEFT JOIN supplier_payments sp ON sp.supplier_invoice_id = si.id
    WHERE (p_copro_id IS NULL OR si.copro_id = p_copro_id)
    GROUP BY si.id
    HAVING COALESCE(SUM(sp.amount), 0) > si.total_amount + 0.01
  LOOP
    entity_type := 'supplier_invoice';
    entity_id := v_rec.id;
    issue_type := 'OVER_PAID';
    expected_amount := v_rec.expected;
    actual_amount := v_rec.actual;
    fixed := FALSE; -- Ne pas corriger automatiquement
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$;

COMMENT ON FUNCTION audit_finance_integrity IS
  'Audit complet de l''intégrité financière avec option de correction (draft seulement)';

-- ============================================================================
-- PARTIE 5: RENFORCEMENT RLS - Vérification finale
-- ============================================================================

-- 5.1) S'assurer que user_is_lot_owner existe et est optimisée
CREATE OR REPLACE FUNCTION user_is_lot_owner(p_lot_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM lot_owners lo
    JOIN coproprietaires cp ON cp.id = lo.coproprietaire_id
    WHERE lo.lot_id = p_lot_id
      AND cp.user_id = v_user_id
      AND (lo.end_date IS NULL OR lo.end_date > CURRENT_DATE)
  );
END;
$$;

-- 5.2) Fonction helper pour vérifier accès lot dans copro
CREATE OR REPLACE FUNCTION user_is_lot_owner_or_manager(p_copro_id UUID, p_lot_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Manager a accès à tout
  IF user_is_copro_manager(p_copro_id) THEN
    RETURN TRUE;
  END IF;

  -- Sinon, vérifier si propriétaire du lot
  RETURN user_is_lot_owner(p_lot_id);
END;
$$;

COMMENT ON FUNCTION user_is_lot_owner_or_manager IS
  'Vérifie si l''utilisateur est manager de la copro OU propriétaire du lot';

-- ============================================================================
-- PARTIE 6: VÉRIFICATION INTÉGRITÉ EXISTANTE
-- ============================================================================

-- Exécuter un audit silencieux pour logger les problèmes existants
DO $$
DECLARE
  v_issues_count INT;
BEGIN
  SELECT COUNT(*) INTO v_issues_count
  FROM audit_finance_integrity(NULL, FALSE);

  IF v_issues_count > 0 THEN
    RAISE WARNING 'ATTENTION: % problèmes d''intégrité financière détectés. Exécuter: SELECT * FROM v_finance_integrity_issues;', v_issues_count;
  ELSE
    RAISE NOTICE 'Audit intégrité: OK - Aucun problème détecté';
  END IF;
END $$;

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
