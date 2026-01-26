-- ============================================================================
-- NIVEAU 6A : MAINTENANCE - Tables, RLS, Fonctions, Vues
-- CoProFlex - Migration principale Maintenance
-- Date: 2026-01-26
-- Référentiel: Loi 65-557 Art.18, Décret 67-223, Doc "4 - Maintenance.pdf"
-- ============================================================================

-- ============================================================================
-- PARTIE 1: ENUMS MAINTENANCE
-- ============================================================================

-- Catégories de prestataires (3 niveaux)
CREATE TYPE provider_category AS ENUM (
  'syndic',       -- Prestataires de confiance du syndic
  'copropriete',  -- Prestataires référencés par la copropriété
  'coproflex'     -- Marketplace CoproFlex (national)
);

-- Domaines d'activité (conforme doc métier)
CREATE TYPE provider_domain AS ENUM (
  'plomberie',
  'electricite',
  'chauffage',
  'ascenseur',
  'menage',
  'espaces_verts',
  'serrurerie',
  'peinture',
  'assurance',
  'juridique',
  'architecture',
  'toiture',
  'facade',
  'climatisation',
  'interphone',
  'portail',
  'securite',
  'autre'
);

-- Types de contrats maintenance
CREATE TYPE contract_type AS ENUM (
  'ascenseur',
  'chauffage',
  'nettoyage',
  'menage',
  'espaces_verts',
  'securite',
  'assurance',
  'syndic',
  'eau',
  'electricite',
  'toiture',
  'facade',
  'interphone',
  'portail',
  'juridique',
  'maintenance',
  'autre'
);

-- Statuts de contrat (conforme doc)
CREATE TYPE contract_status AS ENUM (
  'draft',         -- Brouillon
  'active',        -- Actif
  'to_renew',      -- À renouveler (J-60)
  'expired',       -- Expiré
  'terminated',    -- Résilié
  'archived'       -- Archivé
);

-- Fréquence d'intervention pour contrats
CREATE TYPE intervention_frequency AS ENUM (
  'unique',        -- Intervention unique
  'monthly',       -- Mensuelle
  'bimonthly',     -- Bimestrielle
  'quarterly',     -- Trimestrielle
  'biannual',      -- Semestrielle
  'annual'         -- Annuelle
);

-- Types d'entrée carnet d'entretien (Art. 18 loi 65-557)
CREATE TYPE logbook_entry_type AS ENUM (
  'controle',      -- Contrôle réglementaire
  'entretien',     -- Entretien courant
  'incident',      -- Incident signalé
  'visite',        -- Visite technique
  'travaux',       -- Travaux réalisés
  'diagnostic'     -- Diagnostic technique
);

-- Catégorie d'intervention (importance)
CREATE TYPE intervention_category AS ENUM (
  'courante',           -- Intervention courante
  'travaux_importants'  -- Travaux importants
);

-- Niveaux d'urgence
CREATE TYPE urgency_level AS ENUM (
  'low',       -- Basse
  'normal',    -- Normale
  'medium',    -- Moyenne
  'high',      -- Haute
  'critical'   -- Critique (urgence Art. 18)
);

-- Statuts des ordres de service (workflow complet conforme doc)
CREATE TYPE service_order_status AS ENUM (
  'draft',          -- Brouillon
  'to_send',        -- À envoyer
  'sent',           -- Envoyé au prestataire
  'accepted',       -- Accepté par prestataire
  'refused',        -- Refusé par prestataire
  'scheduled',      -- Intervention programmée
  'in_progress',    -- En cours d'intervention
  'completed',      -- Intervention réalisée
  'invoiced',       -- Facturé
  'paid',           -- Payé
  'closed',         -- Clôturé
  'cancelled'       -- Annulé
);

-- Origine de l'ordre de service
CREATE TYPE service_order_origin AS ENUM (
  'ag',           -- Suite à résolution AG
  'syndic',       -- Initiative syndic
  'cs',           -- Demande conseil syndical
  'urgence',      -- Urgence (Art. 18)
  'contrat'       -- Déclenché par contrat
);

-- Type d'ordre de service
CREATE TYPE service_order_type AS ENUM (
  'classique',    -- Ordre classique
  'contractuel'   -- Lié à un contrat
);

-- Types d'événements audit OS
CREATE TYPE service_order_event_type AS ENUM (
  'created',
  'sent',
  'status_changed',
  'note_added',
  'document_added',
  'invoice_linked',
  'email_sent',
  'reminder_sent'
);

-- ============================================================================
-- PARTIE 2: TABLE PROVIDERS (PRESTATAIRES)
-- ============================================================================

CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,

  -- Identification
  name TEXT NOT NULL,
  category provider_category NOT NULL DEFAULT 'copropriete',
  domains provider_domain[] NOT NULL DEFAULT '{}',

  -- Contact principal
  contact_name TEXT NULL,
  contact_role TEXT NULL,
  email TEXT NULL,
  phone TEXT NULL,
  phone_emergency TEXT NULL,

  -- Adresse
  address TEXT NULL,
  postal_code TEXT NULL,
  city TEXT NULL,

  -- Informations légales
  siret TEXT NULL,
  iban TEXT NULL,
  bic TEXT NULL,

  -- Évaluation
  rating_avg NUMERIC(2,1) NULL CHECK (rating_avg >= 0 AND rating_avg <= 5),
  rating_count INT NOT NULL DEFAULT 0,

  -- Statistiques
  interventions_count INT NOT NULL DEFAULT 0,
  last_intervention_at TIMESTAMPTZ NULL,

  -- CoproFlex marketplace (pour category = 'coproflex')
  intervention_radius_km INT NULL,
  indicative_rate TEXT NULL,
  description TEXT NULL,
  availability TEXT NULL,
  coproflex_label BOOLEAN NOT NULL DEFAULT false,
  avg_response_time TEXT NULL,
  year_founded INT NULL,
  employees_count INT NULL,
  website TEXT NULL,
  certifications TEXT[] NULL,

  -- Notes internes
  internal_notes TEXT NULL,

  -- Statut
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Documents de conformité (Kbis, assurance RC)
  conformity_docs JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unicité nom par copro et catégorie
  CONSTRAINT uq_provider_name UNIQUE (copro_id, name, category)
);

COMMENT ON TABLE providers IS
  'Prestataires maintenance - 3 catégories (syndic, copropriété, CoproFlex marketplace).';

-- Index
CREATE INDEX idx_providers_copro ON providers(copro_id);
CREATE INDEX idx_providers_category ON providers(copro_id, category);
CREATE INDEX idx_providers_domains ON providers USING gin(domains);
CREATE INDEX idx_providers_active ON providers(copro_id, is_active);
CREATE INDEX idx_providers_rating ON providers(copro_id, rating_avg DESC NULLS LAST);

-- ============================================================================
-- PARTIE 3: TABLE CONTRACTS (CONTRATS MAINTENANCE)
-- ============================================================================

CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES providers(id),

  -- Identification
  contract_number TEXT NULL,
  contract_type contract_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT NULL,

  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  renewal_date DATE NULL,

  -- Reconduction
  tacit_renewal BOOLEAN NOT NULL DEFAULT false,
  notice_months INT NULL,

  -- Montants
  annual_amount NUMERIC(12,2) NULL,
  billing_frequency intervention_frequency NULL,

  -- Planification interventions
  planned_frequency intervention_frequency NULL,
  planned_day_of_month INT NULL CHECK (planned_day_of_month IS NULL OR planned_day_of_month BETWEEN 1 AND 31),
  planned_time TEXT NULL,
  auto_generate_orders BOOLEAN NOT NULL DEFAULT false,
  order_generation_days_before INT NULL,
  planned_intervention_desc TEXT NULL,
  planned_intervention_amount NUMERIC(12,2) NULL,
  last_order_generated_at TIMESTAMPTZ NULL,
  next_planned_intervention DATE NULL,

  -- Liaison budget
  budget_line_id UUID NULL REFERENCES budget_lines(id),

  -- Liaison AG (si voté)
  ag_id UUID NULL,
  resolution_id UUID NULL,

  -- Document contrat
  document_id UUID NULL REFERENCES documents(id),

  -- Règlementaire
  is_regulatory BOOLEAN NOT NULL DEFAULT false,

  -- Statut
  status contract_status NOT NULL DEFAULT 'draft',

  -- Notes
  notes TEXT NULL,

  -- Audit
  created_by UUID NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  terminated_at TIMESTAMPTZ NULL,
  termination_reason TEXT NULL,

  -- Contraintes
  CONSTRAINT chk_contract_dates CHECK (end_date >= start_date),
  CONSTRAINT chk_contract_notice CHECK (notice_months IS NULL OR notice_months >= 0)
);

COMMENT ON TABLE contracts IS
  'Contrats maintenance - Art. 18 loi 65-557. Gestion des échéances et reconduction.';

-- Index
CREATE INDEX idx_contracts_copro ON contracts(copro_id);
CREATE INDEX idx_contracts_provider ON contracts(provider_id);
CREATE INDEX idx_contracts_status ON contracts(copro_id, status);
CREATE INDEX idx_contracts_type ON contracts(copro_id, contract_type);
CREATE INDEX idx_contracts_end_date ON contracts(copro_id, end_date);
CREATE INDEX idx_contracts_renewal ON contracts(copro_id, renewal_date) WHERE renewal_date IS NOT NULL;

-- ============================================================================
-- PARTIE 4: TABLE CONTRACT_DOCUMENTS (DOCUMENTS CONTRAT)
-- ============================================================================

CREATE TABLE contract_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id),

  -- Type de document
  doc_type TEXT NOT NULL CHECK (doc_type IN ('contrat_pdf', 'avenant', 'facture', 'attestation', 'autre')),
  label TEXT NULL,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_contract_document UNIQUE (contract_id, document_id)
);

COMMENT ON TABLE contract_documents IS 'Documents associés aux contrats (PDF, avenants, attestations).';

CREATE INDEX idx_contract_documents_contract ON contract_documents(contract_id);

-- ============================================================================
-- PARTIE 5: TABLE LOGBOOK_ENTRIES (CARNET D'ENTRETIEN - ART. 18)
-- ============================================================================

CREATE TABLE logbook_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  building_id UUID NULL REFERENCES buildings(id),

  -- Type et catégorie
  entry_type logbook_entry_type NOT NULL,
  category intervention_category NOT NULL DEFAULT 'courante',

  -- Description
  title TEXT NOT NULL,
  description TEXT NULL,
  equipment_concerned TEXT NULL,

  -- Prestataire
  provider_id UUID NULL REFERENCES providers(id),
  provider_name_snapshot TEXT NULL,

  -- Lien contrat
  contract_id UUID NULL REFERENCES contracts(id),

  -- Lien ordre de service
  service_order_id UUID NULL,

  -- Lien facture
  invoice_id UUID NULL REFERENCES supplier_invoices(id),

  -- Domaine et budget
  domain provider_domain NULL,
  budget_category TEXT NULL,

  -- Dates
  happened_at DATE NOT NULL,
  completed_at DATE NULL,
  next_due_at DATE NULL,

  -- Coût
  cost NUMERIC(12,2) NULL,

  -- Statut intervention
  status TEXT NOT NULL DEFAULT 'planifiee' CHECK (status IN ('planifiee', 'en_cours', 'terminee')),

  -- Document principal
  document_id UUID NULL REFERENCES documents(id),

  -- Commentaires
  comments TEXT NULL,

  -- Audit
  created_by UUID NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE logbook_entries IS
  'Carnet d''entretien obligatoire - Art. 18 loi 65-557. Historique interventions et contrôles.';

-- Index
CREATE INDEX idx_logbook_copro ON logbook_entries(copro_id);
CREATE INDEX idx_logbook_building ON logbook_entries(building_id) WHERE building_id IS NOT NULL;
CREATE INDEX idx_logbook_type ON logbook_entries(copro_id, entry_type);
CREATE INDEX idx_logbook_provider ON logbook_entries(provider_id) WHERE provider_id IS NOT NULL;
CREATE INDEX idx_logbook_contract ON logbook_entries(contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX idx_logbook_date ON logbook_entries(copro_id, happened_at DESC);
CREATE INDEX idx_logbook_next_due ON logbook_entries(copro_id, next_due_at) WHERE next_due_at IS NOT NULL;
CREATE INDEX idx_logbook_status ON logbook_entries(copro_id, status);

-- ============================================================================
-- PARTIE 6: TABLE SERVICE_ORDERS (ORDRES DE SERVICE)
-- ============================================================================

CREATE TABLE service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  building_id UUID NULL REFERENCES buildings(id),
  lot_id UUID NULL REFERENCES lots(id),

  -- Identification
  order_number TEXT NOT NULL,

  -- Prestataire
  provider_id UUID NOT NULL REFERENCES providers(id),

  -- Type et origine
  order_type service_order_type NOT NULL DEFAULT 'classique',
  origin service_order_origin NOT NULL DEFAULT 'syndic',

  -- Lien contrat (si contractuel)
  contract_id UUID NULL REFERENCES contracts(id),

  -- Lien AG/résolution (si origine = 'ag')
  ag_id UUID NULL,
  resolution_id UUID NULL,

  -- Description
  subject TEXT NOT NULL,
  description TEXT NULL,

  -- Urgence (Art. 18 si critique)
  urgency urgency_level NOT NULL DEFAULT 'normal',
  is_art18_emergency BOOLEAN NOT NULL DEFAULT false,
  emergency_ceiling NUMERIC(12,2) NULL,

  -- Dates workflow
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ NULL,
  accepted_at TIMESTAMPTZ NULL,
  scheduled_at TIMESTAMPTZ NULL,
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  invoiced_at TIMESTAMPTZ NULL,
  paid_at TIMESTAMPTZ NULL,
  closed_at TIMESTAMPTZ NULL,
  cancelled_at TIMESTAMPTZ NULL,

  -- Date intervention prévue
  planned_intervention_date DATE NULL,

  -- Montants
  estimated_amount NUMERIC(12,2) NULL,
  quoted_amount NUMERIC(12,2) NULL,
  actual_amount NUMERIC(12,2) NULL,

  -- Facture liée
  supplier_invoice_id UUID NULL REFERENCES supplier_invoices(id),

  -- Entrée carnet d'entretien générée
  logbook_entry_id UUID NULL,

  -- Statut workflow
  status service_order_status NOT NULL DEFAULT 'draft',

  -- Refus (si status = refused)
  refusal_reason TEXT NULL,

  -- Notes
  notes TEXT NULL,

  -- Audit
  created_by UUID NULL REFERENCES profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contraintes
  CONSTRAINT uq_service_order_number UNIQUE (copro_id, order_number),
  CONSTRAINT chk_service_order_amounts CHECK (
    estimated_amount IS NULL OR estimated_amount >= 0 AND
    quoted_amount IS NULL OR quoted_amount >= 0 AND
    actual_amount IS NULL OR actual_amount >= 0
  )
);

-- Ajout de la FK circulaire après création logbook_entries
ALTER TABLE logbook_entries ADD CONSTRAINT fk_logbook_service_order
  FOREIGN KEY (service_order_id) REFERENCES service_orders(id);
ALTER TABLE service_orders ADD CONSTRAINT fk_service_order_logbook
  FOREIGN KEY (logbook_entry_id) REFERENCES logbook_entries(id);

COMMENT ON TABLE service_orders IS
  'Ordres de service (bons de commande) - Workflow complet avec traçabilité.';

-- Index
CREATE INDEX idx_service_orders_copro ON service_orders(copro_id);
CREATE INDEX idx_service_orders_provider ON service_orders(provider_id);
CREATE INDEX idx_service_orders_status ON service_orders(copro_id, status);
CREATE INDEX idx_service_orders_contract ON service_orders(contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX idx_service_orders_urgency ON service_orders(copro_id, urgency) WHERE urgency IN ('high', 'critical');
CREATE INDEX idx_service_orders_created ON service_orders(copro_id, created_at DESC);
CREATE INDEX idx_service_orders_invoice ON service_orders(supplier_invoice_id) WHERE supplier_invoice_id IS NOT NULL;

-- ============================================================================
-- PARTIE 7: TABLE SERVICE_ORDER_EVENTS (AUDIT WORKFLOW)
-- ============================================================================

CREATE TABLE service_order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,

  -- Type d'événement
  event_type service_order_event_type NOT NULL,

  -- Changement de statut
  from_status service_order_status NULL,
  to_status service_order_status NULL,

  -- Données additionnelles
  payload JSONB NULL,

  -- Commentaire
  comment TEXT NULL,

  -- Audit
  created_by UUID NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE service_order_events IS 'Historique des événements sur les ordres de service.';

CREATE INDEX idx_service_order_events_order ON service_order_events(service_order_id);
CREATE INDEX idx_service_order_events_created ON service_order_events(service_order_id, created_at DESC);

-- ============================================================================
-- PARTIE 8: TABLE SERVICE_ORDER_DOCUMENTS (LIAISON GED)
-- ============================================================================

CREATE TABLE service_order_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id),

  -- Type de document
  doc_type TEXT NOT NULL CHECK (doc_type IN ('devis', 'bon_commande', 'photo_avant', 'photo_apres', 'rapport', 'facture', 'autre')),
  label TEXT NULL,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_service_order_document UNIQUE (service_order_id, document_id)
);

COMMENT ON TABLE service_order_documents IS 'Documents associés aux ordres de service (devis, photos, rapports).';

CREATE INDEX idx_service_order_documents_order ON service_order_documents(service_order_id);

-- ============================================================================
-- PARTIE 9: RLS POLICIES
-- ============================================================================

-- Activer RLS sur toutes les tables
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE logbook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_documents ENABLE ROW LEVEL SECURITY;

-- === PROVIDERS ===
CREATE POLICY "providers_select" ON providers
  FOR SELECT USING (user_has_copro_access(copro_id));

CREATE POLICY "providers_insert" ON providers
  FOR INSERT WITH CHECK (user_is_copro_manager(copro_id));

CREATE POLICY "providers_update" ON providers
  FOR UPDATE USING (user_is_copro_manager(copro_id));

CREATE POLICY "providers_delete" ON providers
  FOR DELETE USING (user_is_copro_manager(copro_id) AND interventions_count = 0);

-- === CONTRACTS ===
CREATE POLICY "contracts_select" ON contracts
  FOR SELECT USING (user_has_copro_access(copro_id));

CREATE POLICY "contracts_insert" ON contracts
  FOR INSERT WITH CHECK (user_is_copro_manager(copro_id));

CREATE POLICY "contracts_update" ON contracts
  FOR UPDATE USING (user_is_copro_manager(copro_id));

CREATE POLICY "contracts_delete" ON contracts
  FOR DELETE USING (user_is_copro_manager(copro_id) AND status = 'draft');

-- === CONTRACT_DOCUMENTS ===
CREATE POLICY "contract_documents_select" ON contract_documents
  FOR SELECT USING (user_has_copro_access(copro_id));

CREATE POLICY "contract_documents_insert" ON contract_documents
  FOR INSERT WITH CHECK (user_is_copro_manager(copro_id));

CREATE POLICY "contract_documents_delete" ON contract_documents
  FOR DELETE USING (user_is_copro_manager(copro_id));

-- === LOGBOOK_ENTRIES ===
CREATE POLICY "logbook_entries_select" ON logbook_entries
  FOR SELECT USING (user_has_copro_access(copro_id));

CREATE POLICY "logbook_entries_insert" ON logbook_entries
  FOR INSERT WITH CHECK (user_is_copro_manager(copro_id));

CREATE POLICY "logbook_entries_update" ON logbook_entries
  FOR UPDATE USING (user_is_copro_manager(copro_id));

CREATE POLICY "logbook_entries_delete" ON logbook_entries
  FOR DELETE USING (user_is_copro_manager(copro_id));

-- === SERVICE_ORDERS ===
CREATE POLICY "service_orders_select" ON service_orders
  FOR SELECT USING (user_has_copro_access(copro_id));

CREATE POLICY "service_orders_insert" ON service_orders
  FOR INSERT WITH CHECK (user_is_copro_manager(copro_id));

CREATE POLICY "service_orders_update" ON service_orders
  FOR UPDATE USING (user_is_copro_manager(copro_id));

CREATE POLICY "service_orders_delete" ON service_orders
  FOR DELETE USING (user_is_copro_manager(copro_id) AND status = 'draft');

-- === SERVICE_ORDER_EVENTS ===
CREATE POLICY "service_order_events_select" ON service_order_events
  FOR SELECT USING (user_has_copro_access(copro_id));

CREATE POLICY "service_order_events_insert" ON service_order_events
  FOR INSERT WITH CHECK (user_is_copro_manager(copro_id));

-- === SERVICE_ORDER_DOCUMENTS ===
CREATE POLICY "service_order_documents_select" ON service_order_documents
  FOR SELECT USING (user_has_copro_access(copro_id));

CREATE POLICY "service_order_documents_insert" ON service_order_documents
  FOR INSERT WITH CHECK (user_is_copro_manager(copro_id));

CREATE POLICY "service_order_documents_delete" ON service_order_documents
  FOR DELETE USING (user_is_copro_manager(copro_id));

-- ============================================================================
-- PARTIE 10: FONCTIONS UTILITAIRES
-- ============================================================================

-- Fonction: Générer numéro d'ordre de service
CREATE OR REPLACE FUNCTION generate_service_order_number(p_copro_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_count INT;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YYYY');

  SELECT COUNT(*) + 1
  INTO v_count
  FROM service_orders
  WHERE copro_id = p_copro_id
    AND order_number LIKE 'OS-' || v_year || '-%';

  RETURN 'OS-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Fonction: Vérifier si une transition de statut OS est valide
CREATE OR REPLACE FUNCTION is_valid_service_order_transition(
  p_from_status service_order_status,
  p_to_status service_order_status
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Annulation possible depuis n'importe quel statut sauf closed
  IF p_to_status = 'cancelled' AND p_from_status != 'closed' THEN
    RETURN true;
  END IF;

  -- Transitions valides selon workflow
  RETURN CASE p_from_status
    WHEN 'draft' THEN p_to_status IN ('to_send', 'cancelled')
    WHEN 'to_send' THEN p_to_status IN ('sent', 'cancelled')
    WHEN 'sent' THEN p_to_status IN ('accepted', 'refused', 'cancelled')
    WHEN 'refused' THEN p_to_status IN ('to_send', 'cancelled')
    WHEN 'accepted' THEN p_to_status IN ('scheduled', 'cancelled')
    WHEN 'scheduled' THEN p_to_status IN ('in_progress', 'cancelled')
    WHEN 'in_progress' THEN p_to_status IN ('completed', 'cancelled')
    WHEN 'completed' THEN p_to_status IN ('invoiced', 'closed', 'cancelled')
    WHEN 'invoiced' THEN p_to_status IN ('paid', 'cancelled')
    WHEN 'paid' THEN p_to_status IN ('closed')
    WHEN 'closed' THEN false
    WHEN 'cancelled' THEN false
    ELSE false
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction: Changer le statut d'un ordre de service avec audit
CREATE OR REPLACE FUNCTION update_service_order_status(
  p_order_id UUID,
  p_new_status service_order_status,
  p_comment TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS service_orders AS $$
DECLARE
  v_order service_orders;
  v_old_status service_order_status;
BEGIN
  -- Récupérer l'ordre
  SELECT * INTO v_order FROM service_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service order not found: %', p_order_id;
  END IF;

  v_old_status := v_order.status;

  -- Vérifier la validité de la transition
  IF NOT is_valid_service_order_transition(v_old_status, p_new_status) THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', v_old_status, p_new_status;
  END IF;

  -- Mettre à jour le statut et les timestamps correspondants
  UPDATE service_orders
  SET
    status = p_new_status,
    updated_at = NOW(),
    sent_at = CASE WHEN p_new_status = 'sent' AND sent_at IS NULL THEN NOW() ELSE sent_at END,
    accepted_at = CASE WHEN p_new_status = 'accepted' AND accepted_at IS NULL THEN NOW() ELSE accepted_at END,
    scheduled_at = CASE WHEN p_new_status = 'scheduled' AND scheduled_at IS NULL THEN NOW() ELSE scheduled_at END,
    started_at = CASE WHEN p_new_status = 'in_progress' AND started_at IS NULL THEN NOW() ELSE started_at END,
    completed_at = CASE WHEN p_new_status = 'completed' AND completed_at IS NULL THEN NOW() ELSE completed_at END,
    invoiced_at = CASE WHEN p_new_status = 'invoiced' AND invoiced_at IS NULL THEN NOW() ELSE invoiced_at END,
    paid_at = CASE WHEN p_new_status = 'paid' AND paid_at IS NULL THEN NOW() ELSE paid_at END,
    closed_at = CASE WHEN p_new_status = 'closed' AND closed_at IS NULL THEN NOW() ELSE closed_at END,
    cancelled_at = CASE WHEN p_new_status = 'cancelled' AND cancelled_at IS NULL THEN NOW() ELSE cancelled_at END
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  -- Créer l'événement d'audit
  INSERT INTO service_order_events (
    copro_id,
    service_order_id,
    event_type,
    from_status,
    to_status,
    comment,
    created_by
  ) VALUES (
    v_order.copro_id,
    p_order_id,
    'status_changed',
    v_old_status,
    p_new_status,
    p_comment,
    COALESCE(p_user_id, auth.uid())
  );

  RETURN v_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: Mettre à jour automatiquement le statut des contrats
CREATE OR REPLACE FUNCTION update_contract_status_auto()
RETURNS TRIGGER AS $$
DECLARE
  v_days_to_end INT;
  v_notice_days INT;
BEGIN
  -- Calculer les jours restants
  v_days_to_end := NEW.end_date - CURRENT_DATE;
  v_notice_days := COALESCE(NEW.notice_months, 0) * 30;

  -- Ne pas modifier si archivé ou résilié
  IF NEW.status IN ('archived', 'terminated') THEN
    RETURN NEW;
  END IF;

  -- Logique de mise à jour automatique
  IF NEW.end_date < CURRENT_DATE THEN
    NEW.status := 'expired';
  ELSIF v_days_to_end <= v_notice_days AND NEW.status = 'active' THEN
    NEW.status := 'to_renew';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_contract_status_auto
  BEFORE INSERT OR UPDATE OF end_date, notice_months ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_contract_status_auto();

-- Fonction: Mettre à jour les stats prestataire après intervention
CREATE OR REPLACE FUNCTION update_provider_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Mise à jour des compteurs pour le prestataire
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.provider_id != NEW.provider_id) THEN
    UPDATE providers
    SET
      interventions_count = (
        SELECT COUNT(*) FROM logbook_entries WHERE provider_id = NEW.provider_id
      ),
      last_intervention_at = (
        SELECT MAX(happened_at) FROM logbook_entries WHERE provider_id = NEW.provider_id
      ),
      updated_at = NOW()
    WHERE id = NEW.provider_id;
  END IF;

  -- Ancien prestataire si changement
  IF TG_OP = 'UPDATE' AND OLD.provider_id IS DISTINCT FROM NEW.provider_id AND OLD.provider_id IS NOT NULL THEN
    UPDATE providers
    SET
      interventions_count = (
        SELECT COUNT(*) FROM logbook_entries WHERE provider_id = OLD.provider_id
      ),
      last_intervention_at = (
        SELECT MAX(happened_at) FROM logbook_entries WHERE provider_id = OLD.provider_id
      ),
      updated_at = NOW()
    WHERE id = OLD.provider_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_provider_stats
  AFTER INSERT OR UPDATE OF provider_id ON logbook_entries
  FOR EACH ROW EXECUTE FUNCTION update_provider_stats();

-- Fonction: Créer une entrée carnet d'entretien depuis un OS terminé
CREATE OR REPLACE FUNCTION create_logbook_from_service_order(p_order_id UUID)
RETURNS UUID AS $$
DECLARE
  v_order service_orders;
  v_entry_id UUID;
BEGIN
  SELECT * INTO v_order FROM service_orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service order not found: %', p_order_id;
  END IF;

  -- Créer l'entrée si pas déjà existante
  IF v_order.logbook_entry_id IS NOT NULL THEN
    RETURN v_order.logbook_entry_id;
  END IF;

  INSERT INTO logbook_entries (
    copro_id,
    building_id,
    entry_type,
    category,
    title,
    description,
    provider_id,
    contract_id,
    service_order_id,
    happened_at,
    completed_at,
    cost,
    status,
    created_by
  ) VALUES (
    v_order.copro_id,
    v_order.building_id,
    CASE WHEN v_order.is_art18_emergency THEN 'incident' ELSE 'entretien' END,
    CASE WHEN v_order.urgency IN ('high', 'critical') THEN 'travaux_importants' ELSE 'courante' END,
    v_order.subject,
    v_order.description,
    v_order.provider_id,
    v_order.contract_id,
    v_order.id,
    COALESCE(v_order.completed_at::DATE, CURRENT_DATE),
    COALESCE(v_order.completed_at::DATE, CURRENT_DATE),
    COALESCE(v_order.actual_amount, v_order.quoted_amount, v_order.estimated_amount),
    'terminee',
    v_order.created_by
  )
  RETURNING id INTO v_entry_id;

  -- Lier l'entrée à l'ordre
  UPDATE service_orders
  SET logbook_entry_id = v_entry_id, updated_at = NOW()
  WHERE id = p_order_id;

  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PARTIE 11: VUES
-- ============================================================================

-- Vue: Synthèse des prestataires
CREATE OR REPLACE VIEW v_providers_overview
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.copro_id,
  p.name,
  p.category,
  p.domains,
  p.contact_name,
  p.email,
  p.phone,
  p.phone_emergency,
  p.city,
  p.siret,
  p.rating_avg,
  p.rating_count,
  p.interventions_count,
  p.last_intervention_at,
  p.coproflex_label,
  p.is_active,
  p.created_at,
  -- Contrats actifs
  (
    SELECT COUNT(*)
    FROM contracts c
    WHERE c.provider_id = p.id AND c.status = 'active'
  ) as active_contracts_count,
  -- OS en cours
  (
    SELECT COUNT(*)
    FROM service_orders so
    WHERE so.provider_id = p.id AND so.status NOT IN ('closed', 'cancelled')
  ) as pending_orders_count,
  -- Montant total facturé
  (
    SELECT COALESCE(SUM(si.total_amount), 0)
    FROM supplier_invoices si
    WHERE si.supplier_id = (
      SELECT sup.id FROM suppliers sup WHERE sup.name = p.name AND sup.copro_id = p.copro_id LIMIT 1
    )
  ) as total_invoiced
FROM providers p;

COMMENT ON VIEW v_providers_overview IS 'Vue synthétique des prestataires avec statistiques.';

-- Vue: Synthèse des contrats
CREATE OR REPLACE VIEW v_contracts_overview
WITH (security_invoker = true) AS
SELECT
  c.id,
  c.copro_id,
  c.provider_id,
  p.name as provider_name,
  c.contract_number,
  c.contract_type,
  c.title,
  c.start_date,
  c.end_date,
  c.renewal_date,
  c.tacit_renewal,
  c.notice_months,
  c.annual_amount,
  c.status,
  c.is_regulatory,
  c.created_at,
  -- Jours restants
  c.end_date - CURRENT_DATE as days_remaining,
  -- Alerte renouvellement
  CASE
    WHEN c.status = 'active' AND c.end_date - CURRENT_DATE <= COALESCE(c.notice_months, 0) * 30 THEN true
    ELSE false
  END as renewal_alert,
  -- Nombre d'interventions liées
  (
    SELECT COUNT(*)
    FROM logbook_entries le
    WHERE le.contract_id = c.id
  ) as interventions_count,
  -- Nombre d'OS liés
  (
    SELECT COUNT(*)
    FROM service_orders so
    WHERE so.contract_id = c.id
  ) as orders_count,
  -- Documents count
  (
    SELECT COUNT(*)
    FROM contract_documents cd
    WHERE cd.contract_id = c.id
  ) as documents_count
FROM contracts c
JOIN providers p ON p.id = c.provider_id;

COMMENT ON VIEW v_contracts_overview IS 'Vue synthétique des contrats avec alertes renouvellement.';

-- Vue: Carnet d'entretien
CREATE OR REPLACE VIEW v_logbook_overview
WITH (security_invoker = true) AS
SELECT
  le.id,
  le.copro_id,
  le.building_id,
  b.name as building_name,
  le.entry_type,
  le.category,
  le.title,
  le.description,
  le.equipment_concerned,
  le.provider_id,
  COALESCE(p.name, le.provider_name_snapshot) as provider_name,
  le.contract_id,
  c.title as contract_title,
  le.service_order_id,
  so.order_number,
  le.domain,
  le.budget_category,
  le.happened_at,
  le.completed_at,
  le.next_due_at,
  le.cost,
  le.status,
  le.document_id,
  le.comments,
  le.created_at,
  -- Jours jusqu'à prochaine échéance
  CASE
    WHEN le.next_due_at IS NOT NULL THEN le.next_due_at - CURRENT_DATE
    ELSE NULL
  END as days_to_next_due,
  -- Alerte échéance
  CASE
    WHEN le.next_due_at IS NOT NULL AND le.next_due_at <= CURRENT_DATE + 7 THEN true
    ELSE false
  END as due_alert
FROM logbook_entries le
LEFT JOIN buildings b ON b.id = le.building_id
LEFT JOIN providers p ON p.id = le.provider_id
LEFT JOIN contracts c ON c.id = le.contract_id
LEFT JOIN service_orders so ON so.id = le.service_order_id;

COMMENT ON VIEW v_logbook_overview IS 'Vue du carnet d''entretien avec relations.';

-- Vue: Ordres de service
CREATE OR REPLACE VIEW v_service_orders_overview
WITH (security_invoker = true) AS
SELECT
  so.id,
  so.copro_id,
  so.building_id,
  b.name as building_name,
  so.lot_id,
  l.ref as lot_ref,
  so.order_number,
  so.provider_id,
  p.name as provider_name,
  so.order_type,
  so.origin,
  so.contract_id,
  c.title as contract_title,
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
  so.completed_at,
  so.closed_at,
  so.supplier_invoice_id,
  si.invoice_number,
  si.total_amount as invoice_amount,
  -- Durée traitement (jours depuis création)
  CURRENT_DATE - so.created_at::DATE as days_since_creation,
  -- Documents count
  (
    SELECT COUNT(*)
    FROM service_order_documents sod
    WHERE sod.service_order_id = so.id
  ) as documents_count,
  -- Events count
  (
    SELECT COUNT(*)
    FROM service_order_events soe
    WHERE soe.service_order_id = so.id
  ) as events_count
FROM service_orders so
LEFT JOIN buildings b ON b.id = so.building_id
LEFT JOIN lots l ON l.id = so.lot_id
JOIN providers p ON p.id = so.provider_id
LEFT JOIN contracts c ON c.id = so.contract_id
LEFT JOIN supplier_invoices si ON si.id = so.supplier_invoice_id;

COMMENT ON VIEW v_service_orders_overview IS 'Vue synthétique des ordres de service avec relations.';

-- Vue: Alertes contrats (renouvellement, expiration)
CREATE OR REPLACE VIEW v_contracts_alerts
WITH (security_invoker = true) AS
SELECT
  c.id,
  c.copro_id,
  c.title,
  c.provider_id,
  p.name as provider_name,
  c.contract_type,
  c.end_date,
  c.notice_months,
  c.status,
  c.end_date - CURRENT_DATE as days_remaining,
  CASE
    WHEN c.status = 'expired' THEN 'expired'
    WHEN c.status = 'to_renew' THEN 'renewal_due'
    WHEN c.end_date - CURRENT_DATE <= COALESCE(c.notice_months, 0) * 30 THEN 'renewal_soon'
    WHEN c.end_date - CURRENT_DATE <= 90 THEN 'expiring_soon'
    ELSE 'ok'
  END as alert_type,
  CASE
    WHEN c.status = 'expired' THEN 'critical'
    WHEN c.status = 'to_renew' THEN 'warning'
    WHEN c.end_date - CURRENT_DATE <= 30 THEN 'warning'
    ELSE 'info'
  END as alert_severity
FROM contracts c
JOIN providers p ON p.id = c.provider_id
WHERE c.status IN ('active', 'to_renew', 'expired')
  AND c.end_date <= CURRENT_DATE + 180
ORDER BY c.end_date ASC;

COMMENT ON VIEW v_contracts_alerts IS 'Alertes sur les contrats à renouveler ou expirés.';

-- Vue: Alertes carnet d'entretien (contrôles à faire)
CREATE OR REPLACE VIEW v_logbook_alerts
WITH (security_invoker = true) AS
SELECT
  le.id,
  le.copro_id,
  le.title,
  le.entry_type,
  le.provider_id,
  p.name as provider_name,
  le.next_due_at,
  le.next_due_at - CURRENT_DATE as days_until_due,
  CASE
    WHEN le.next_due_at < CURRENT_DATE THEN 'overdue'
    WHEN le.next_due_at <= CURRENT_DATE THEN 'due_today'
    WHEN le.next_due_at <= CURRENT_DATE + 7 THEN 'due_soon'
    ELSE 'upcoming'
  END as alert_type,
  CASE
    WHEN le.next_due_at < CURRENT_DATE THEN 'critical'
    WHEN le.next_due_at <= CURRENT_DATE + 7 THEN 'warning'
    ELSE 'info'
  END as alert_severity
FROM logbook_entries le
LEFT JOIN providers p ON p.id = le.provider_id
WHERE le.next_due_at IS NOT NULL
  AND le.next_due_at <= CURRENT_DATE + 30
  AND le.status != 'terminee'
ORDER BY le.next_due_at ASC;

COMMENT ON VIEW v_logbook_alerts IS 'Alertes sur les contrôles et entretiens à effectuer.';

-- Vue: Statistiques maintenance par copropriété
CREATE OR REPLACE VIEW v_maintenance_stats
WITH (security_invoker = true) AS
SELECT
  co.id as copro_id,
  co.name as copro_name,
  -- Prestataires
  (SELECT COUNT(*) FROM providers p WHERE p.copro_id = co.id AND p.is_active) as active_providers_count,
  -- Contrats
  (SELECT COUNT(*) FROM contracts c WHERE c.copro_id = co.id AND c.status = 'active') as active_contracts_count,
  (SELECT COUNT(*) FROM contracts c WHERE c.copro_id = co.id AND c.status = 'to_renew') as contracts_to_renew_count,
  (SELECT COALESCE(SUM(c.annual_amount), 0) FROM contracts c WHERE c.copro_id = co.id AND c.status = 'active') as contracts_annual_total,
  -- Ordres de service
  (SELECT COUNT(*) FROM service_orders so WHERE so.copro_id = co.id AND so.status NOT IN ('closed', 'cancelled')) as pending_orders_count,
  (SELECT COUNT(*) FROM service_orders so WHERE so.copro_id = co.id AND so.urgency IN ('high', 'critical') AND so.status NOT IN ('closed', 'cancelled')) as urgent_orders_count,
  (SELECT COUNT(*) FROM service_orders so WHERE so.copro_id = co.id AND so.created_at >= CURRENT_DATE - INTERVAL '30 days') as orders_last_30_days,
  -- Carnet d'entretien
  (SELECT COUNT(*) FROM logbook_entries le WHERE le.copro_id = co.id) as logbook_entries_count,
  (SELECT COUNT(*) FROM logbook_entries le WHERE le.copro_id = co.id AND le.next_due_at IS NOT NULL AND le.next_due_at <= CURRENT_DATE + 7) as upcoming_maintenance_count,
  -- Coûts
  (SELECT COALESCE(SUM(le.cost), 0) FROM logbook_entries le WHERE le.copro_id = co.id AND le.happened_at >= date_trunc('year', CURRENT_DATE)) as maintenance_cost_ytd
FROM copros co;

COMMENT ON VIEW v_maintenance_stats IS 'Statistiques de maintenance par copropriété.';

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
