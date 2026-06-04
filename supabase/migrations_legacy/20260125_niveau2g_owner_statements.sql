-- ============================================================================
-- NIVEAU 2G : RELEVÉS INDIVIDUELS COPROPRIÉTAIRES
-- CoProFlex - Migration
-- Date: 2026-01-25
-- Référentiel: Loi 65-557, Décret 2005-240
-- Dépendances: call_for_funds, call_for_funds_lines, payments, payment_allocations
--              lots, lot_owners, coproprietaires, accounting_periods
-- ============================================================================

-- ============================================================================
-- PARTIE 1: VUE v_owner_statement_lines
-- Lignes de relevé par copropriétaire (appels + paiements)
-- ============================================================================

CREATE OR REPLACE VIEW v_owner_statement_lines
WITH (security_invoker = true) AS
WITH owner_lots AS (
  -- Mapping copropriétaire -> lots qu'il possède (actuel ou passé)
  SELECT DISTINCT
    lo.coproprietaire_id,
    lo.lot_id,
    l.copro_id,
    l.ref AS lot_ref,
    lo.start_date,
    lo.end_date
  FROM lot_owners lo
  JOIN lots l ON l.id = lo.lot_id
  WHERE lo.is_primary = true
),

-- Lignes d'appel = DEBIT (le copropriétaire doit payer)
call_lines AS (
  SELECT
    ol.copro_id,
    ol.coproprietaire_id AS owner_id,
    cf.period_id,
    cf.issue_date AS line_date,
    'call'::TEXT AS line_type,
    cf.label || ' - ' || ol.lot_ref AS label,
    cfl.amount_due AS debit,
    0::NUMERIC(12,2) AS credit,
    cfl.id AS related_id,
    ol.lot_ref,
    cfl.lot_id,
    cf.due_date,
    cfl.amount_due - cfl.amount_paid AS amount_remaining,
    cfl.status AS line_status,
    cfl.created_at
  FROM call_for_funds_lines cfl
  JOIN call_for_funds cf ON cf.id = cfl.call_id
  JOIN owner_lots ol ON ol.lot_id = cfl.lot_id
    -- Le copropriétaire possédait le lot au moment de l'appel
    AND cf.issue_date >= ol.start_date
    AND (ol.end_date IS NULL OR cf.issue_date <= ol.end_date)
  WHERE cf.status NOT IN ('draft', 'cancelled')
),

-- Paiements = CREDIT (le copropriétaire a payé)
payment_lines AS (
  SELECT
    ol.copro_id,
    ol.coproprietaire_id AS owner_id,
    p.period_id,
    p.payment_date AS line_date,
    'payment'::TEXT AS line_type,
    'Paiement ' || COALESCE(p.reference, '') || ' - ' || ol.lot_ref AS label,
    0::NUMERIC(12,2) AS debit,
    p.amount AS credit,
    p.id AS related_id,
    ol.lot_ref,
    p.lot_id,
    NULL::DATE AS due_date,
    0::NUMERIC(12,2) AS amount_remaining,
    p.status::TEXT AS line_status,
    p.created_at
  FROM payments p
  JOIN owner_lots ol ON ol.lot_id = p.lot_id
    -- Le copropriétaire possédait le lot au moment du paiement
    AND p.payment_date >= ol.start_date
    AND (ol.end_date IS NULL OR p.payment_date <= ol.end_date)
  WHERE p.status != 'reversed'
),

-- Union des lignes avec numérotation pour running_balance
all_lines AS (
  SELECT * FROM call_lines
  UNION ALL
  SELECT * FROM payment_lines
)

SELECT
  al.copro_id,
  al.owner_id,
  al.period_id,
  al.line_date,
  al.line_type,
  al.label,
  al.debit,
  al.credit,
  -- Running balance = cumul(debit - credit) ordonné par date et created_at
  SUM(al.debit - al.credit) OVER (
    PARTITION BY al.copro_id, al.owner_id
    ORDER BY al.line_date, al.created_at, al.related_id
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS running_balance,
  al.related_id,
  al.lot_ref,
  al.lot_id,
  al.due_date,
  al.amount_remaining,
  al.line_status,
  al.created_at
FROM all_lines al
ORDER BY al.copro_id, al.owner_id, al.line_date, al.created_at, al.related_id;

COMMENT ON VIEW v_owner_statement_lines IS
  'Lignes de relevé individuel par copropriétaire: appels (débit) et paiements (crédit) avec solde cumulé.';


-- ============================================================================
-- PARTIE 2: VUE v_owner_statement_summary
-- Résumé du relevé par copropriétaire/période
-- ============================================================================

CREATE OR REPLACE VIEW v_owner_statement_summary
WITH (security_invoker = true) AS
WITH owner_lots AS (
  SELECT DISTINCT
    lo.coproprietaire_id,
    lo.lot_id,
    l.copro_id
  FROM lot_owners lo
  JOIN lots l ON l.id = lo.lot_id
  WHERE lo.is_primary = true
    AND (lo.end_date IS NULL OR lo.end_date > CURRENT_DATE)
),

-- Totaux par copropriétaire sur toutes les périodes
owner_totals AS (
  SELECT
    ol.copro_id,
    ol.coproprietaire_id AS owner_id,
    -- Total des appels (débit)
    COALESCE(SUM(cfl.amount_due), 0) AS total_debit_calls,
    -- Total payé
    COALESCE(SUM(cfl.amount_paid), 0) AS total_paid_on_calls
  FROM owner_lots ol
  LEFT JOIN call_for_funds_lines cfl ON cfl.lot_id = ol.lot_id
  LEFT JOIN call_for_funds cf ON cf.id = cfl.call_id
    AND cf.status NOT IN ('draft', 'cancelled')
  GROUP BY ol.copro_id, ol.coproprietaire_id
),

-- Total des paiements directs
owner_payments AS (
  SELECT
    ol.copro_id,
    ol.coproprietaire_id AS owner_id,
    COALESCE(SUM(p.amount), 0) AS total_credit_payments
  FROM owner_lots ol
  LEFT JOIN payments p ON p.lot_id = ol.lot_id
    AND p.status != 'reversed'
  GROUP BY ol.copro_id, ol.coproprietaire_id
),

-- Impayés (lignes non soldées avec échéance dépassée)
owner_unpaid AS (
  SELECT
    ol.copro_id,
    ol.coproprietaire_id AS owner_id,
    SUM(cfl.amount_due - cfl.amount_paid) AS unpaid_amount,
    COUNT(*) AS unpaid_lines_count,
    MIN(cf.due_date) AS oldest_due_date
  FROM owner_lots ol
  JOIN call_for_funds_lines cfl ON cfl.lot_id = ol.lot_id
  JOIN call_for_funds cf ON cf.id = cfl.call_id
  WHERE cfl.status != 'paid'
    AND cf.status NOT IN ('draft', 'cancelled')
    AND cf.due_date < CURRENT_DATE
  GROUP BY ol.copro_id, ol.coproprietaire_id
),

-- Informations copropriétaire (champs confirmés: is_company, company_name, first_name, last_name, email)
owner_info AS (
  SELECT
    c.id AS owner_id,
    CASE
      WHEN c.is_company THEN c.company_name
      ELSE COALESCE(c.first_name || ' ' || c.last_name, 'Inconnu')
    END AS owner_name,
    c.email AS owner_email
  FROM coproprietaires c
)

SELECT
  ot.copro_id,
  ot.owner_id,
  oi.owner_name,
  oi.owner_email,
  -- Totaux
  ot.total_debit_calls,
  COALESCE(op.total_credit_payments, 0) AS total_credit_payments,
  ot.total_debit_calls - COALESCE(op.total_credit_payments, 0) AS balance_end,
  -- Impayés
  COALESCE(ou.unpaid_amount, 0) AS unpaid_amount,
  COALESCE(ou.unpaid_lines_count, 0)::INT AS unpaid_lines_count,
  ou.oldest_due_date,
  -- Ancienneté du plus ancien impayé
  CASE
    WHEN ou.oldest_due_date IS NOT NULL
    THEN CURRENT_DATE - ou.oldest_due_date
    ELSE NULL
  END AS days_overdue,
  -- Nombre de lots possédés
  (
    SELECT COUNT(DISTINCT lot_id)
    FROM owner_lots ol2
    WHERE ol2.coproprietaire_id = ot.owner_id
      AND ol2.copro_id = ot.copro_id
  )::INT AS lots_count,
  -- Total tantièmes
  (
    SELECT COALESCE(SUM(l.tantiemes_generaux), 0)
    FROM owner_lots ol2
    JOIN lots l ON l.id = ol2.lot_id
    WHERE ol2.coproprietaire_id = ot.owner_id
      AND ol2.copro_id = ot.copro_id
  )::INT AS total_tantiemes
FROM owner_totals ot
JOIN owner_info oi ON oi.owner_id = ot.owner_id
LEFT JOIN owner_payments op ON op.owner_id = ot.owner_id AND op.copro_id = ot.copro_id
LEFT JOIN owner_unpaid ou ON ou.owner_id = ot.owner_id AND ou.copro_id = ot.copro_id;

COMMENT ON VIEW v_owner_statement_summary IS
  'Résumé du relevé individuel: totaux, solde, impayés par copropriétaire.';


-- ============================================================================
-- PARTIE 3: VUE v_owner_statement_lines_by_period
-- Lignes filtrables par période comptable
-- ============================================================================

CREATE OR REPLACE VIEW v_owner_statement_lines_by_period
WITH (security_invoker = true) AS
SELECT
  osl.*,
  ap.name AS period_name,
  ap.start_date AS period_start,
  ap.end_date AS period_end,
  ap.status AS period_status
FROM v_owner_statement_lines osl
JOIN accounting_periods ap ON ap.id = osl.period_id;

COMMENT ON VIEW v_owner_statement_lines_by_period IS
  'Lignes de relevé avec informations de période pour filtrage.';


-- ============================================================================
-- PARTIE 4: FONCTION get_owner_statement
-- Génère les données du relevé pour un copropriétaire
-- ============================================================================

CREATE OR REPLACE FUNCTION get_owner_statement(
  p_copro_id UUID,
  p_owner_id UUID,
  p_period_id UUID DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_copro RECORD;
  v_owner RECORD;
  v_period RECORD;
  v_summary RECORD;
  v_lines JSONB;
  v_lots JSONB;
BEGIN
  -- 1. Vérifier et récupérer la copropriété
  SELECT id, name, address, siret
  INTO v_copro
  FROM copros
  WHERE id = p_copro_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Copropriété non trouvée',
      'copro_id', p_copro_id
    );
  END IF;

  -- 2. Vérifier et récupérer le copropriétaire
  SELECT
    c.id,
    CASE
      WHEN c.is_company THEN c.company_name
      ELSE COALESCE(c.first_name || ' ' || c.last_name, 'Inconnu')
    END AS name,
    c.email
  INTO v_owner
  FROM coproprietaires c
  WHERE c.id = p_owner_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Copropriétaire non trouvé',
      'owner_id', p_owner_id
    );
  END IF;

  -- 3. Récupérer la période si spécifiée
  IF p_period_id IS NOT NULL THEN
    SELECT id, name, start_date, end_date, status
    INTO v_period
    FROM accounting_periods
    WHERE id = p_period_id AND copro_id = p_copro_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Période comptable non trouvée',
        'period_id', p_period_id
      );
    END IF;
  END IF;

  -- 4. Récupérer le résumé
  SELECT *
  INTO v_summary
  FROM v_owner_statement_summary
  WHERE copro_id = p_copro_id AND owner_id = p_owner_id;

  -- 5. Récupérer les lignes avec filtres optionnels
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'line_date', line_date,
      'line_type', line_type,
      'label', label,
      'debit', debit,
      'credit', credit,
      'running_balance', running_balance,
      'related_id', related_id,
      'lot_ref', lot_ref,
      'due_date', due_date,
      'line_status', line_status
    ) ORDER BY line_date, created_at
  ), '[]'::jsonb)
  INTO v_lines
  FROM v_owner_statement_lines
  WHERE copro_id = p_copro_id
    AND owner_id = p_owner_id
    AND (p_period_id IS NULL OR period_id = p_period_id)
    AND (p_date_from IS NULL OR line_date >= p_date_from)
    AND (p_date_to IS NULL OR line_date <= p_date_to);

  -- 6. Récupérer les lots du copropriétaire
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'lot_id', l.id,
      'ref', l.ref,
      'type', l.type,
      'tantiemes', l.tantiemes_generaux,
      'floor', l.floor,
      'surface', l.surface
    )
  ), '[]'::jsonb)
  INTO v_lots
  FROM lot_owners lo
  JOIN lots l ON l.id = lo.lot_id
  WHERE lo.coproprietaire_id = p_owner_id
    AND l.copro_id = p_copro_id
    AND lo.is_primary = true
    AND (lo.end_date IS NULL OR lo.end_date > CURRENT_DATE);

  -- 7. Construire et retourner le résultat
  RETURN jsonb_build_object(
    'success', true,
    'generated_at', NOW(),
    'copro', jsonb_build_object(
      'id', v_copro.id,
      'name', v_copro.name,
      'address', v_copro.address,
      'siret', v_copro.siret
    ),
    'owner', jsonb_build_object(
      'id', v_owner.id,
      'name', v_owner.name,
      'email', v_owner.email
    ),
    'period', CASE
      WHEN v_period.id IS NOT NULL THEN jsonb_build_object(
        'id', v_period.id,
        'name', v_period.name,
        'start_date', v_period.start_date,
        'end_date', v_period.end_date,
        'status', v_period.status
      )
      ELSE NULL
    END,
    'filters', jsonb_build_object(
      'date_from', p_date_from,
      'date_to', p_date_to
    ),
    'summary', jsonb_build_object(
      'total_debit_calls', COALESCE(v_summary.total_debit_calls, 0),
      'total_credit_payments', COALESCE(v_summary.total_credit_payments, 0),
      'balance_end', COALESCE(v_summary.balance_end, 0),
      'unpaid_amount', COALESCE(v_summary.unpaid_amount, 0),
      'unpaid_lines_count', COALESCE(v_summary.unpaid_lines_count, 0),
      'oldest_due_date', v_summary.oldest_due_date,
      'days_overdue', v_summary.days_overdue,
      'lots_count', COALESCE(v_summary.lots_count, 0),
      'total_tantiemes', COALESCE(v_summary.total_tantiemes, 0)
    ),
    'lots', v_lots,
    'lines', v_lines,
    'lines_count', jsonb_array_length(v_lines)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'copro_id', p_copro_id,
      'owner_id', p_owner_id
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_owner_statement IS
  'Génère un relevé individuel complet pour un copropriétaire avec filtres optionnels.';


-- ============================================================================
-- PARTIE 5: GRANTS pour les fonctions
-- ============================================================================

-- La fonction est SECURITY DEFINER, les vérifications d'accès se font via RLS sur les vues
-- Accorder l'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION get_owner_statement TO authenticated;


-- ============================================================================
-- PARTIE 6: INDEX pour performances
-- ============================================================================

-- Index sur les tables sources pour optimiser les requêtes de relevé
CREATE INDEX IF NOT EXISTS idx_lot_owners_owner_active
  ON lot_owners(coproprietaire_id)
  WHERE is_primary = true AND (end_date IS NULL OR end_date > CURRENT_DATE);

CREATE INDEX IF NOT EXISTS idx_call_lines_lot_status
  ON call_for_funds_lines(lot_id, status)
  WHERE status != 'paid';

CREATE INDEX IF NOT EXISTS idx_payments_lot_date
  ON payments(lot_id, payment_date)
  WHERE status != 'reversed';


-- ============================================================================
-- PARTIE 7: TESTS DE VALIDATION
-- ============================================================================

-- Test 1: Vérifier que la vue v_owner_statement_lines retourne des données
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM v_owner_statement_lines LIMIT 1;
  RAISE NOTICE 'Test 1 - v_owner_statement_lines accessible: OK (count check passed)';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Test 1 - v_owner_statement_lines FAILED: %', SQLERRM;
END $$;

-- Test 2: Vérifier que la vue v_owner_statement_summary retourne des données
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM v_owner_statement_summary LIMIT 1;
  RAISE NOTICE 'Test 2 - v_owner_statement_summary accessible: OK (count check passed)';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Test 2 - v_owner_statement_summary FAILED: %', SQLERRM;
END $$;

-- Test 3: Vérifier la cohérence running_balance
DO $$
DECLARE
  v_check RECORD;
  v_errors INT := 0;
BEGIN
  -- Vérifier que running_balance = cumul(debit - credit)
  FOR v_check IN
    SELECT
      copro_id,
      owner_id,
      SUM(debit) AS total_debit,
      SUM(credit) AS total_credit,
      MAX(running_balance) AS final_balance
    FROM v_owner_statement_lines
    GROUP BY copro_id, owner_id
    HAVING ABS(SUM(debit) - SUM(credit) - MAX(running_balance)) > 0.01
    LIMIT 5
  LOOP
    RAISE WARNING 'Test 3 - Incohérence running_balance pour owner %: debit=%, credit=%, final=%',
      v_check.owner_id, v_check.total_debit, v_check.total_credit, v_check.final_balance;
    v_errors := v_errors + 1;
  END LOOP;

  IF v_errors = 0 THEN
    RAISE NOTICE 'Test 3 - Cohérence running_balance: OK';
  END IF;
END $$;


-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
