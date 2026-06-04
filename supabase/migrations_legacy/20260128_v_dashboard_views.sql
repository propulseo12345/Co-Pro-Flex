-- ============================================================================
-- DASHBOARD VIEWS - Migration pour le tableau de bord dynamique
-- CoProFlex - Date: 2026-01-28
-- Description: Vues optimisées pour les KPIs, activité récente et tâches
-- ============================================================================

-- ============================================================================
-- VUE 1: v_dashboard_kpis - Indicateurs clés
-- ============================================================================
-- Fournit les 3 KPIs principaux du dashboard:
-- - current_balance: solde global (calculé depuis le ledger)
-- - unpaid_total: total des impayés
-- - next_ag_date: date de la prochaine AG
-- ============================================================================

CREATE OR REPLACE VIEW v_dashboard_kpis
WITH (security_invoker = true) AS
SELECT
  c.id AS copro_id,

  -- Solde global: somme des comptes de trésorerie (classe 5)
  -- Calcul: total crédits - total débits sur comptes 5xx (banque, caisse)
  COALESCE((
    SELECT SUM(
      CASE WHEN le.direction = 'credit' THEN le.amount ELSE -le.amount END
    )
    FROM ledger_entries le
    JOIN ledger_transactions lt ON lt.id = le.tx_id
    JOIN accounts a ON a.id = le.account_id
    WHERE lt.copro_id = c.id
      AND lt.status = 'posted'
      AND a.code LIKE '5%'  -- Comptes de trésorerie (classe 5)
  ), 0) AS current_balance,

  -- Total impayés: agrégation depuis v_unpaid_by_lot
  COALESCE((
    SELECT SUM(total_unpaid)
    FROM v_unpaid_by_lot u
    WHERE u.copro_id = c.id
  ), 0) AS unpaid_total,

  -- Nombre d'impayés critiques (> 60 jours)
  COALESCE((
    SELECT COUNT(*)
    FROM v_unpaid_by_lot u
    WHERE u.copro_id = c.id
      AND u.days_overdue > 60
  ), 0) AS critical_unpaid_count,

  -- Prochaine AG: première AG non clôturée dans le futur
  (
    SELECT am.meeting_date::DATE
    FROM ag_meetings am
    WHERE am.copro_id = c.id
      AND am.status NOT IN ('closed', 'pv_generated')
      AND am.meeting_date > NOW()
    ORDER BY am.meeting_date ASC
    LIMIT 1
  ) AS next_ag_date,

  -- ID de la prochaine AG (pour le lien)
  (
    SELECT am.id
    FROM ag_meetings am
    WHERE am.copro_id = c.id
      AND am.status NOT IN ('closed', 'pv_generated')
      AND am.meeting_date > NOW()
    ORDER BY am.meeting_date ASC
    LIMIT 1
  ) AS next_ag_id,

  -- Titre de la prochaine AG
  (
    SELECT am.title
    FROM ag_meetings am
    WHERE am.copro_id = c.id
      AND am.status NOT IN ('closed', 'pv_generated')
      AND am.meeting_date > NOW()
    ORDER BY am.meeting_date ASC
    LIMIT 1
  ) AS next_ag_title

FROM copros c;

COMMENT ON VIEW v_dashboard_kpis IS 'KPIs principaux du tableau de bord: solde, impayés, prochaine AG';

-- ============================================================================
-- VUE 2: v_dashboard_recent_activity - Activité récente (20 derniers événements)
-- ============================================================================
-- Union de plusieurs sources d'activité avec un type et un deep_link
-- Types: AG, FINANCE, MAINT, DOC
-- ============================================================================

CREATE OR REPLACE VIEW v_dashboard_recent_activity
WITH (security_invoker = true) AS

-- AG: Réunions créées ou mises à jour
SELECT
  am.copro_id,
  'AG' AS activity_type,
  CASE
    WHEN am.status = 'draft' THEN 'AG en préparation: ' || am.title
    WHEN am.status = 'convoked' THEN 'Convocations envoyées: ' || am.title
    WHEN am.status = 'closed' THEN 'AG clôturée: ' || am.title
    ELSE 'AG mise à jour: ' || am.title
  END AS label,
  am.updated_at AS event_date,
  '/ag/dashboard' AS deep_link
FROM ag_meetings am
WHERE am.updated_at IS NOT NULL

UNION ALL

-- FINANCE: Paiements reçus
SELECT
  p.copro_id,
  'FINANCE' AS activity_type,
  'Paiement reçu: ' || p.amount::TEXT || ' € (Lot ' || l.ref || ')' AS label,
  p.created_at AS event_date,
  '/finance/calls' AS deep_link
FROM payments p
JOIN lots l ON l.id = p.lot_id

UNION ALL

-- FINANCE: Appels de fonds émis
SELECT
  cf.copro_id,
  'FINANCE' AS activity_type,
  'Appel émis: ' || cf.label AS label,
  COALESCE(cf.issued_at, cf.created_at) AS event_date,
  '/finance/calls' AS deep_link
FROM call_for_funds cf
WHERE cf.status != 'draft'

UNION ALL

-- FINANCE: Factures fournisseurs validées
SELECT
  si.copro_id,
  'FINANCE' AS activity_type,
  CASE
    WHEN si.status = 'approved' THEN 'Facture validée: ' || si.label
    WHEN si.status = 'posted' THEN 'Facture comptabilisée: ' || si.label
    WHEN si.status = 'paid' THEN 'Facture payée: ' || si.label
    ELSE 'Facture mise à jour: ' || si.label
  END AS label,
  si.created_at AS event_date,
  '/finance/invoices' AS deep_link
FROM supplier_invoices si
WHERE si.status != 'draft'

UNION ALL

-- MAINT: Ordres de service
SELECT
  so.copro_id,
  'MAINT' AS activity_type,
  CASE
    WHEN so.status = 'sent' THEN 'OS envoyé: ' || so.subject
    WHEN so.status = 'completed' THEN 'Intervention terminée: ' || so.subject
    WHEN so.status = 'closed' THEN 'OS clôturé: ' || so.subject
    ELSE 'OS mis à jour: ' || so.subject
  END AS label,
  so.updated_at AS event_date,
  '/maintenance/service-orders' AS deep_link
FROM service_orders so
WHERE so.status NOT IN ('draft', 'cancelled')

UNION ALL

-- MAINT: Entrées carnet d'entretien
SELECT
  le.copro_id,
  'MAINT' AS activity_type,
  CASE le.entry_type
    WHEN 'controle' THEN 'Contrôle effectué: ' || le.title
    WHEN 'entretien' THEN 'Entretien réalisé: ' || le.title
    WHEN 'incident' THEN 'Incident signalé: ' || le.title
    WHEN 'travaux' THEN 'Travaux réalisés: ' || le.title
    ELSE 'Intervention: ' || le.title
  END AS label,
  le.created_at AS event_date,
  '/maintenance/logbook' AS deep_link
FROM logbook_entries le

UNION ALL

-- DOC: Documents ajoutés
SELECT
  d.copro_id,
  'DOC' AS activity_type,
  'Document ajouté: ' || d.title AS label,
  d.created_at AS event_date,
  '/documents' AS deep_link
FROM documents d
WHERE d.status = 'active';

-- Note: La limitation à 20 éléments se fait côté API avec ORDER BY + LIMIT

COMMENT ON VIEW v_dashboard_recent_activity IS 'Activité récente multi-sources pour le dashboard (à limiter à 20 côté API)';

-- ============================================================================
-- VUE 3: v_dashboard_todos - Tâches à faire (priorités)
-- ============================================================================
-- Agrège les alertes/actions de plusieurs sources
-- Priority: 1 = critique, 2 = warning, 3 = info
-- ============================================================================

CREATE OR REPLACE VIEW v_dashboard_todos
WITH (security_invoker = true) AS

-- CRITIQUE (priority 1): Impayés > 60 jours - groupés
SELECT
  u.copro_id,
  (SELECT COUNT(*) FROM v_unpaid_by_lot u2 WHERE u2.copro_id = u.copro_id AND u2.days_overdue > 60)::TEXT
    || ' impayés > 60 jours' AS label,
  1 AS priority,
  '/finance/unpaid' AS deep_link,
  MIN(u.oldest_due_date)::DATE AS due_date,
  'unpaid_critical' AS todo_type
FROM v_unpaid_by_lot u
WHERE u.days_overdue > 60
GROUP BY u.copro_id

UNION ALL

-- WARNING (priority 2): AG en brouillon à finaliser
SELECT
  am.copro_id,
  CASE
    WHEN (SELECT COUNT(*) FROM ag_meetings am2 WHERE am2.copro_id = am.copro_id AND am2.status = 'draft') = 1
    THEN 'AG en brouillon à finaliser'
    ELSE (SELECT COUNT(*) FROM ag_meetings am2 WHERE am2.copro_id = am.copro_id AND am2.status = 'draft')::TEXT
      || ' AG en brouillon'
  END AS label,
  2 AS priority,
  '/ag/dashboard' AS deep_link,
  MIN(am.meeting_date::DATE) AS due_date,
  'ag_draft' AS todo_type
FROM ag_meetings am
WHERE am.status = 'draft'
GROUP BY am.copro_id

UNION ALL

-- WARNING (priority 2): Mouvements bancaires non catégorisés
SELECT
  bm.copro_id,
  (SELECT COUNT(*) FROM bank_movements bm2 WHERE bm2.copro_id = bm.copro_id AND bm2.status = 'unmatched')::TEXT
    || ' mouvements bancaires à catégoriser' AS label,
  2 AS priority,
  '/finance/bank-movements' AS deep_link,
  NULL::DATE AS due_date,
  'bank_unmatched' AS todo_type
FROM bank_movements bm
WHERE bm.status = 'unmatched'
GROUP BY bm.copro_id

UNION ALL

-- INFO (priority 3): Contrats à renouveler (dans les 30 jours)
SELECT
  ct.copro_id,
  'Contrat à renouveler: ' || ct.title AS label,
  3 AS priority,
  '/maintenance/contracts' AS deep_link,
  ct.end_date AS due_date,
  'contract_renewal' AS todo_type
FROM contracts ct
WHERE ct.status IN ('active', 'to_renew')
  AND ct.end_date <= CURRENT_DATE + INTERVAL '30 days'
  AND ct.end_date >= CURRENT_DATE

UNION ALL

-- INFO (priority 3): Contrôles/entretiens à venir (7 jours)
SELECT
  le.copro_id,
  'Contrôle à effectuer: ' || le.title AS label,
  3 AS priority,
  '/maintenance/logbook' AS deep_link,
  le.next_due_at AS due_date,
  'maintenance_due' AS todo_type
FROM logbook_entries le
WHERE le.next_due_at IS NOT NULL
  AND le.next_due_at <= CURRENT_DATE + INTERVAL '7 days'
  AND le.status != 'terminee';

-- Note: La limitation à 10 éléments et l'ordre par priority se font côté API

COMMENT ON VIEW v_dashboard_todos IS 'Tâches/alertes agrégées pour le dashboard (à limiter à 10 côté API)';

-- ============================================================================
-- INDEX POUR PERFORMANCE (si pas déjà existants)
-- ============================================================================

-- Index sur status des AG pour la vue KPIs
CREATE INDEX IF NOT EXISTS idx_ag_meetings_next
  ON ag_meetings(copro_id, meeting_date)
  WHERE status NOT IN ('closed', 'pv_generated');

-- Index sur les mouvements bancaires non rapprochés
CREATE INDEX IF NOT EXISTS idx_bank_movements_unmatched_copro
  ON bank_movements(copro_id)
  WHERE status = 'unmatched';

-- Index sur les contrats à renouveler
CREATE INDEX IF NOT EXISTS idx_contracts_renewal_soon
  ON contracts(copro_id, end_date)
  WHERE status IN ('active', 'to_renew');

-- Index sur les entrées logbook avec échéance
CREATE INDEX IF NOT EXISTS idx_logbook_next_due_copro
  ON logbook_entries(copro_id, next_due_at)
  WHERE next_due_at IS NOT NULL AND status != 'terminee';

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
