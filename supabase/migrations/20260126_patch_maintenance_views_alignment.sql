-- ============================================================================
-- Migration: Patch Maintenance Views Alignment
-- Date: 2026-01-26
-- Description: Aligne les vues de maintenance avec les besoins du frontend
--              en ajoutant les champs manquants sans casser les consommateurs
-- ============================================================================

-- ============================================================================
-- 1) v_contracts_overview - Ajouter description
-- ============================================================================
DROP VIEW IF EXISTS v_contracts_alerts CASCADE;
DROP VIEW IF EXISTS v_contracts_overview CASCADE;

CREATE VIEW v_contracts_overview
WITH (security_invoker = true)
AS
SELECT
    c.id,
    c.copro_id,
    c.provider_id,
    p.name AS provider_name,
    c.contract_number,
    c.contract_type,
    c.title,
    c.description,  -- NOUVEAU: champ description ajouté
    c.start_date,
    c.end_date,
    c.renewal_date,
    c.tacit_renewal,
    c.notice_months,
    c.annual_amount,
    c.status,
    c.is_regulatory,
    c.created_at,
    -- Jours restants avant échéance
    c.end_date - CURRENT_DATE AS days_remaining,
    -- Alerte renouvellement
    CASE
        WHEN c.status = 'active'
             AND (c.end_date - CURRENT_DATE) <= (COALESCE(c.notice_months, 0) * 30)
        THEN true
        ELSE false
    END AS renewal_alert,
    -- Compteurs agrégés
    (SELECT COUNT(*) FROM logbook_entries le WHERE le.contract_id = c.id) AS interventions_count,
    (SELECT COUNT(*) FROM service_orders so WHERE so.contract_id = c.id) AS orders_count
FROM contracts c
JOIN providers p ON p.id = c.provider_id;

COMMENT ON VIEW v_contracts_overview IS 'Vue enrichie des contrats avec statistiques et alertes';
COMMENT ON COLUMN v_contracts_overview.description IS 'Description détaillée du contrat';

-- Recréer la vue d'alertes contrats
CREATE VIEW v_contracts_alerts
WITH (security_invoker = true)
AS
SELECT
    co.*,
    CASE
        WHEN co.days_remaining <= 0 THEN 'expired'
        WHEN co.days_remaining <= 30 THEN 'critical'
        WHEN co.days_remaining <= 60 THEN 'warning'
        ELSE 'ok'
    END AS alert_level
FROM v_contracts_overview co
WHERE co.status = 'active'
  AND co.renewal_alert = true;

COMMENT ON VIEW v_contracts_alerts IS 'Contrats actifs nécessitant attention (renouvellement proche)';

-- ============================================================================
-- 2) v_providers_overview - Ajouter address, postal_code, contact_role
-- ============================================================================
DROP VIEW IF EXISTS v_providers_overview CASCADE;

CREATE VIEW v_providers_overview
WITH (security_invoker = true)
AS
SELECT
    p.id,
    p.copro_id,
    p.name,
    p.category,
    p.domains,
    p.contact_name,
    p.contact_role,    -- NOUVEAU: rôle du contact
    p.email,
    p.phone,
    p.phone_emergency,
    p.address,         -- NOUVEAU: adresse complète
    p.postal_code,     -- NOUVEAU: code postal
    p.city,
    p.siret,
    p.rating_avg,
    p.rating_count,
    p.interventions_count,
    p.last_intervention_at,
    p.coproflex_label,
    p.is_active,
    p.created_at,
    -- Compteurs agrégés
    (SELECT COUNT(*)
     FROM contracts c
     WHERE c.provider_id = p.id AND c.status = 'active') AS active_contracts_count,
    (SELECT COUNT(*)
     FROM service_orders so
     WHERE so.provider_id = p.id
       AND so.status NOT IN ('closed', 'cancelled')) AS pending_orders_count
FROM providers p;

COMMENT ON VIEW v_providers_overview IS 'Vue enrichie des prestataires avec coordonnées complètes et statistiques';
COMMENT ON COLUMN v_providers_overview.address IS 'Adresse postale du prestataire';
COMMENT ON COLUMN v_providers_overview.postal_code IS 'Code postal';
COMMENT ON COLUMN v_providers_overview.contact_role IS 'Fonction du contact référent';

-- ============================================================================
-- 3) v_service_orders_overview - Ajouter documents_count
-- ============================================================================
DROP VIEW IF EXISTS v_service_orders_overview CASCADE;

CREATE VIEW v_service_orders_overview
WITH (security_invoker = true)
AS
SELECT
    so.id,
    so.copro_id,
    so.building_id,
    b.name AS building_name,
    so.lot_id,
    l.ref AS lot_ref,
    so.order_number,
    so.provider_id,
    p.name AS provider_name,
    p.email AS provider_email,
    p.phone AS provider_phone,
    so.order_type,
    so.origin,
    so.contract_id,
    c.title AS contract_title,
    so.subject,
    so.description,
    so.urgency,
    so.is_art18_emergency,
    so.planned_intervention_date,
    so.estimated_amount,
    so.quoted_amount,
    so.actual_amount,
    so.status,
    so.created_at,
    so.sent_at,
    so.accepted_at,
    so.completed_at,
    so.closed_at,
    so.supplier_invoice_id,
    so.created_by,
    -- Jours depuis création
    CURRENT_DATE - so.created_at::date AS days_since_creation,
    -- Compteurs
    (SELECT COUNT(*)
     FROM service_order_events soe
     WHERE soe.service_order_id = so.id) AS events_count,
    -- NOUVEAU: nombre de documents attachés
    (SELECT COUNT(*)
     FROM documents d
     WHERE d.service_order_id = so.id) AS documents_count
FROM service_orders so
LEFT JOIN buildings b ON b.id = so.building_id
LEFT JOIN lots l ON l.id = so.lot_id
JOIN providers p ON p.id = so.provider_id
LEFT JOIN contracts c ON c.id = so.contract_id;

COMMENT ON VIEW v_service_orders_overview IS 'Vue enrichie des ordres de service avec infos prestataire et compteurs';
COMMENT ON COLUMN v_service_orders_overview.documents_count IS 'Nombre de documents attachés à cet ordre de service';

-- ============================================================================
-- 4) v_logbook_overview - Ajouter alias is_overdue pour compatibilité legacy
-- ============================================================================
DROP VIEW IF EXISTS v_logbook_alerts CASCADE;
DROP VIEW IF EXISTS v_logbook_overview CASCADE;

CREATE VIEW v_logbook_overview
WITH (security_invoker = true)
AS
SELECT
    le.id,
    le.copro_id,
    le.building_id,
    b.name AS building_name,
    le.entry_type,
    le.category,
    le.title,
    le.description,
    le.provider_id,
    COALESCE(p.name, le.provider_name_snapshot) AS provider_name,
    le.contract_id,
    c.title AS contract_title,
    le.service_order_id,
    so.order_number,
    le.domain,
    le.happened_at,
    le.completed_at,
    le.next_due_at,
    le.cost,
    le.status,
    le.created_at,
    -- Jours jusqu'à prochaine échéance
    CASE
        WHEN le.next_due_at IS NOT NULL
        THEN le.next_due_at - CURRENT_DATE
        ELSE NULL
    END AS days_to_next_due,
    -- Alerte échéance (< 7 jours)
    CASE
        WHEN le.next_due_at IS NOT NULL AND le.next_due_at <= (CURRENT_DATE + 7)
        THEN true
        ELSE false
    END AS due_alert,
    -- NOUVEAU: Alias is_overdue pour compatibilité frontend legacy
    -- is_overdue = true si next_due_at est dépassé (dans le passé)
    CASE
        WHEN le.next_due_at IS NOT NULL AND le.next_due_at < CURRENT_DATE
        THEN true
        ELSE false
    END AS is_overdue
FROM logbook_entries le
LEFT JOIN buildings b ON b.id = le.building_id
LEFT JOIN providers p ON p.id = le.provider_id
LEFT JOIN contracts c ON c.id = le.contract_id
LEFT JOIN service_orders so ON so.id = le.service_order_id;

COMMENT ON VIEW v_logbook_overview IS 'Vue enrichie du carnet d''entretien avec alertes et références';
COMMENT ON COLUMN v_logbook_overview.due_alert IS 'Alerte si échéance dans moins de 7 jours';
COMMENT ON COLUMN v_logbook_overview.is_overdue IS 'True si l''échéance est dépassée (next_due_at < aujourd''hui)';

-- Recréer la vue d'alertes logbook
CREATE VIEW v_logbook_alerts
WITH (security_invoker = true)
AS
SELECT lo.*
FROM v_logbook_overview lo
WHERE lo.due_alert = true
   OR lo.is_overdue = true;

COMMENT ON VIEW v_logbook_alerts IS 'Entrées du carnet nécessitant attention (échéance proche ou dépassée)';

-- ============================================================================
-- 5) Index de performance (vérification/création)
-- ============================================================================

-- Index sur documents.service_order_id existe déjà (idx_documents_service_order)
-- Vérifier et créer si manquant
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'documents'
          AND indexname = 'idx_documents_service_order'
    ) THEN
        CREATE INDEX idx_documents_service_order
        ON documents(service_order_id)
        WHERE service_order_id IS NOT NULL;
    END IF;
END $$;

-- Index composite pour requêtes fréquentes sur service_orders
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'service_orders'
          AND indexname = 'idx_service_orders_copro_created'
    ) THEN
        CREATE INDEX idx_service_orders_copro_created
        ON service_orders(copro_id, created_at DESC);
    END IF;
END $$;

-- Index sur logbook_entries pour next_due_at (alertes)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'logbook_entries'
          AND indexname = 'idx_logbook_next_due'
    ) THEN
        CREATE INDEX idx_logbook_next_due
        ON logbook_entries(next_due_at)
        WHERE next_due_at IS NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- 6) Vérification finale de la sécurité
-- ============================================================================

-- Confirmer que security_invoker est activé sur toutes les vues
DO $$
DECLARE
    v_name TEXT;
    v_options TEXT[];
BEGIN
    FOR v_name, v_options IN
        SELECT c.relname, c.reloptions
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind = 'v'
          AND c.relname IN (
              'v_contracts_overview',
              'v_contracts_alerts',
              'v_providers_overview',
              'v_service_orders_overview',
              'v_logbook_overview',
              'v_logbook_alerts'
          )
    LOOP
        IF v_options IS NULL OR NOT ('security_invoker=true' = ANY(v_options)) THEN
            RAISE EXCEPTION 'Vue % n''a pas security_invoker=true!', v_name;
        END IF;
    END LOOP;

    RAISE NOTICE 'Toutes les vues maintenance ont security_invoker=true';
END $$;

-- ============================================================================
-- Fin de la migration
-- ============================================================================
