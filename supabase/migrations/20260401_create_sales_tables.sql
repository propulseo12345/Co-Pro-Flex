-- ============================================================================
-- NIVEAU 3A: MUTATIONS (VENTES) + ÉTATS DATÉS
-- Tables pour le module ventes/mutations de lots
-- CoProFlex - Conformité Article 20 loi 65-557
-- ============================================================================
-- NOTE: Ces tables existaient déjà en base (appliquées manuellement).
-- Cette migration formalise leur création pour le tracking.
-- Utilisation de IF NOT EXISTS pour idempotence.
-- ============================================================================

-- ============================================================================
-- TABLE: mutations
-- Chaque vente/donation/succession de lot est une "mutation"
-- ============================================================================

CREATE TABLE IF NOT EXISTS mutations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  lot_id UUID NOT NULL REFERENCES lots(id),

  -- Type de mutation
  mutation_type TEXT NOT NULL DEFAULT 'sale'
    CHECK (mutation_type IN ('sale', 'donation', 'inheritance', 'other')),

  -- Vendeur (propriétaire actuel du lot)
  seller_owner_id UUID NOT NULL REFERENCES coproprietaires(id),

  -- Acheteur (peut être NULL avant validation)
  buyer_owner_id UUID REFERENCES coproprietaires(id),
  buyer_name TEXT,
  buyer_email TEXT,
  buyer_is_company BOOLEAN DEFAULT false,

  -- Notaire
  notary_name TEXT,
  notary_email TEXT,
  notary_reference TEXT,

  -- Workflow status
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft',              -- Notifiée / brouillon
      'pre_etat_generated', -- Pré-état daté généré
      'final_etat_generated', -- État daté final généré (alias etat_generated)
      'sent_to_notary',     -- Envoyé au notaire
      'signed',             -- Acte signé
      'validated',          -- Mutation validée (transfert effectué)
      'cancelled'           -- Annulée
    )),

  -- Dates clés
  requested_at DATE DEFAULT CURRENT_DATE,
  signature_date DATE,
  effective_date DATE,

  -- Notes
  notes TEXT,

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_mutations_copro ON mutations(copro_id);
CREATE INDEX IF NOT EXISTS idx_mutations_lot ON mutations(lot_id);
CREATE INDEX IF NOT EXISTS idx_mutations_status ON mutations(copro_id, status);
CREATE INDEX IF NOT EXISTS idx_mutations_seller ON mutations(seller_owner_id);

COMMENT ON TABLE mutations IS 'Mutations de lots (ventes, donations, successions) - Art. 20 loi 65-557';

-- ============================================================================
-- TABLE: mutation_steps
-- Étapes du workflow de mutation (6 étapes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mutation_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  mutation_id UUID NOT NULL REFERENCES mutations(id) ON DELETE CASCADE,

  -- Étape
  step_key TEXT NOT NULL
    CHECK (step_key IN (
      'demande',        -- 1. Demande / notification
      'pre_etat_date',  -- 2. Pré-état daté
      'etat_date',      -- 3. État daté final
      'envoi_notaire',  -- 4. Envoi au notaire
      'signature_acte', -- 5. Signature de l'acte
      'cloture_compte'  -- 6. Clôture du compte vendeur
    )),

  -- Statut de l'étape
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),

  -- Date de complétion
  completed_at TIMESTAMPTZ,

  -- Données additionnelles (documents, snapshots, etc.)
  payload JSONB DEFAULT '{}',

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Une seule entrée par step_key par mutation
  CONSTRAINT uq_mutation_step UNIQUE (mutation_id, step_key)
);

CREATE INDEX IF NOT EXISTS idx_mutation_steps_mutation ON mutation_steps(mutation_id);

COMMENT ON TABLE mutation_steps IS 'Étapes du workflow de mutation avec payload flexible';

-- ============================================================================
-- TABLE: etat_date_snapshots
-- Snapshots des états datés (pré et final)
-- Contient le payload JSON conforme Art. 20
-- ============================================================================

CREATE TABLE IF NOT EXISTS etat_date_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  mutation_id UUID NOT NULL REFERENCES mutations(id) ON DELETE CASCADE,

  -- Type de snapshot
  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('pre', 'final')),

  -- Payload JSON avec toutes les données financières
  payload JSONB NOT NULL DEFAULT '{}',

  -- Document GED associé (si archivé)
  document_id UUID REFERENCES documents(id),

  -- Généré par
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_etat_date_snapshots_mutation ON etat_date_snapshots(mutation_id);
CREATE INDEX IF NOT EXISTS idx_etat_date_snapshots_type ON etat_date_snapshots(mutation_id, snapshot_type);

COMMENT ON TABLE etat_date_snapshots IS 'Snapshots états datés - payload JSON conforme Décret 67-223';

-- ============================================================================
-- VIEW: v_mutations_overview
-- Vue enrichie pour la liste des mutations
-- ============================================================================

CREATE OR REPLACE VIEW v_mutations_overview AS
SELECT
  m.id,
  m.copro_id,
  m.lot_id,
  l.ref AS lot_ref,
  l.type AS lot_type,
  l.tantiemes_generaux,
  l.building_id,
  l.floor,
  m.status,
  m.mutation_type,

  -- Vendeur
  m.seller_owner_id,
  COALESCE(
    CASE WHEN cs.is_company THEN cs.company_name
    ELSE CONCAT(cs.first_name, ' ', cs.last_name)
    END,
    'Inconnu'
  ) AS seller_name,
  cs.email AS seller_email,

  -- Acheteur
  m.buyer_owner_id,
  COALESCE(
    CASE WHEN cb.is_company THEN cb.company_name
    ELSE CONCAT(cb.first_name, ' ', cb.last_name)
    END,
    m.buyer_name
  ) AS buyer_name,
  COALESCE(cb.email, m.buyer_email) AS buyer_email,

  -- Notaire
  m.notary_name,
  m.notary_email,

  -- Dates
  m.requested_at,
  m.signature_date,
  m.effective_date,
  m.notes,
  m.created_at,
  m.updated_at,

  -- Calculs
  -- Jours restants pour le pré-état (15 jours après notification)
  CASE
    WHEN m.status = 'draft' AND m.requested_at IS NOT NULL
    THEN 15 - (CURRENT_DATE - m.requested_at::date)
    ELSE NULL
  END AS days_until_pre_etat_deadline,

  -- Flags documents
  EXISTS (
    SELECT 1 FROM etat_date_snapshots eds
    WHERE eds.mutation_id = m.id AND eds.snapshot_type = 'pre'
  ) AS has_pre_etat,

  EXISTS (
    SELECT 1 FROM etat_date_snapshots eds
    WHERE eds.mutation_id = m.id AND eds.snapshot_type = 'final'
  ) AS has_final_etat

FROM mutations m
JOIN lots l ON l.id = m.lot_id
LEFT JOIN coproprietaires cs ON cs.id = m.seller_owner_id
LEFT JOIN coproprietaires cb ON cb.id = m.buyer_owner_id;

-- ============================================================================
-- VIEW: v_mutation_detail
-- Vue détaillée pour une mutation spécifique
-- ============================================================================

CREATE OR REPLACE VIEW v_mutation_detail AS
SELECT
  mo.*,

  -- Buyer details
  m.buyer_is_company,
  m.notary_reference,

  -- Steps as JSON object
  COALESCE(
    (
      SELECT jsonb_object_agg(
        ms.step_key,
        jsonb_build_object(
          'status', ms.status,
          'completed_at', ms.completed_at,
          'payload', ms.payload
        )
      )
      FROM mutation_steps ms
      WHERE ms.mutation_id = mo.id
    ),
    '{}'::jsonb
  ) AS steps,

  -- Snapshots list
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', eds.id,
          'type', eds.snapshot_type,
          'generated_at', eds.generated_at,
          'document_id', eds.document_id
        )
        ORDER BY eds.generated_at DESC
      )
      FROM etat_date_snapshots eds
      WHERE eds.mutation_id = mo.id
    ),
    '[]'::jsonb
  ) AS etat_date_snapshots,

  -- Step counts
  (SELECT COUNT(*) FROM mutation_steps ms WHERE ms.mutation_id = mo.id AND ms.status = 'completed')::int AS completed_steps_count,
  (SELECT COUNT(*) FROM mutation_steps ms WHERE ms.mutation_id = mo.id)::int AS total_steps_count

FROM v_mutations_overview mo
JOIN mutations m ON m.id = mo.id;

-- ============================================================================
-- VIEW: v_etat_date_latest
-- Derniers états datés pour consultation rapide
-- ============================================================================

CREATE OR REPLACE VIEW v_etat_date_latest AS
SELECT
  eds.id,
  eds.copro_id,
  eds.mutation_id,
  eds.snapshot_type,
  eds.generated_at,
  eds.generated_by,
  eds.payload,
  eds.document_id,
  -- Enrichissement
  l.ref AS lot_ref,
  m.status AS mutation_status,
  m.seller_owner_id,
  m.buyer_name
FROM etat_date_snapshots eds
JOIN mutations m ON m.id = eds.mutation_id
JOIN lots l ON l.id = m.lot_id;

-- ============================================================================
-- FUNCTION: upsert_mutation_step
-- Crée ou met à jour une étape de mutation
-- ============================================================================

CREATE OR REPLACE FUNCTION upsert_mutation_step(
  p_mutation_id UUID,
  p_step_key TEXT,
  p_status TEXT DEFAULT NULL,
  p_payload JSONB DEFAULT NULL
)
RETURNS mutation_steps
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_copro_id UUID;
  v_result mutation_steps;
BEGIN
  -- Get copro_id from mutation
  SELECT copro_id INTO v_copro_id
  FROM mutations
  WHERE id = p_mutation_id;

  IF v_copro_id IS NULL THEN
    RAISE EXCEPTION 'Mutation not found: %', p_mutation_id;
  END IF;

  INSERT INTO mutation_steps (copro_id, mutation_id, step_key, status, payload)
  VALUES (
    v_copro_id,
    p_mutation_id,
    p_step_key,
    COALESCE(p_status, 'pending'),
    COALESCE(p_payload, '{}')
  )
  ON CONFLICT (mutation_id, step_key)
  DO UPDATE SET
    status = COALESCE(p_status, mutation_steps.status),
    payload = CASE
      WHEN p_payload IS NOT NULL THEN mutation_steps.payload || p_payload
      ELSE mutation_steps.payload
    END,
    completed_at = CASE
      WHEN COALESCE(p_status, mutation_steps.status) = 'completed'
      THEN COALESCE(mutation_steps.completed_at, now())
      ELSE mutation_steps.completed_at
    END,
    updated_at = now()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- FUNCTION: validate_mutation
-- Valide une mutation et transfère la propriété du lot
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_mutation(
  p_mutation_id UUID,
  p_signature_date DATE,
  p_buyer_owner_id UUID DEFAULT NULL,
  p_buyer_first_name TEXT DEFAULT NULL,
  p_buyer_last_name TEXT DEFAULT NULL,
  p_buyer_email TEXT DEFAULT NULL,
  p_buyer_is_company BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mutation mutations;
  v_buyer_id UUID;
  v_result JSONB;
BEGIN
  -- Récupérer la mutation
  SELECT * INTO v_mutation
  FROM mutations
  WHERE id = p_mutation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mutation not found';
  END IF;

  IF v_mutation.status NOT IN ('signed', 'sent_to_notary', 'final_etat_generated') THEN
    RAISE EXCEPTION 'La mutation doit être en status signed, sent_to_notary ou final_etat_generated pour être validée';
  END IF;

  -- Déterminer l'acheteur
  IF p_buyer_owner_id IS NOT NULL THEN
    v_buyer_id := p_buyer_owner_id;
  ELSE
    -- Créer un nouveau copropriétaire
    INSERT INTO coproprietaires (
      copro_id, first_name, last_name, email, is_company
    ) VALUES (
      v_mutation.copro_id,
      p_buyer_first_name,
      p_buyer_last_name,
      p_buyer_email,
      p_buyer_is_company
    ) RETURNING id INTO v_buyer_id;
  END IF;

  -- Mettre à jour la mutation
  UPDATE mutations SET
    status = 'validated',
    buyer_owner_id = v_buyer_id,
    signature_date = p_signature_date,
    effective_date = COALESCE(effective_date, CURRENT_DATE),
    updated_at = now()
  WHERE id = p_mutation_id;

  -- Transférer la propriété du lot
  -- 1. Clôturer l'ancien propriétaire
  UPDATE lot_owners SET
    end_date = CURRENT_DATE
  WHERE lot_id = v_mutation.lot_id
    AND end_date IS NULL
    AND is_primary = true;

  -- 2. Créer le nouveau propriétaire
  INSERT INTO lot_owners (lot_id, coproprietaire_id, is_primary, start_date)
  VALUES (v_mutation.lot_id, v_buyer_id, true, CURRENT_DATE);

  -- Marquer l'étape cloture_compte
  PERFORM upsert_mutation_step(
    p_mutation_id,
    'cloture_compte',
    'completed',
    jsonb_build_object(
      'effective_date', CURRENT_DATE,
      'buyer_owner_id', v_buyer_id
    )
  );

  v_result := jsonb_build_object(
    'success', true,
    'mutation_id', p_mutation_id,
    'buyer_owner_id', v_buyer_id,
    'signature_date', p_signature_date,
    'new_status', 'validated',
    'message', 'Mutation validée - Transfert de propriété effectué'
  );

  RETURN v_result;
END;
$$;

-- ============================================================================
-- FUNCTION: create_etat_date_snapshot
-- Génère un snapshot d'état daté (pré ou final) avec données financières
-- ============================================================================

CREATE OR REPLACE FUNCTION create_etat_date_snapshot(
  p_copro_id UUID,
  p_mutation_id UUID,
  p_snapshot_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mutation mutations;
  v_lot lots;
  v_seller coproprietaires;
  v_copro copros;
  v_payload JSONB;
  v_snapshot_id UUID;
  v_financial JSONB;
  v_transactions JSONB;
  v_new_status TEXT;
BEGIN
  -- Récupérer la mutation
  SELECT * INTO v_mutation
  FROM mutations WHERE id = p_mutation_id AND copro_id = p_copro_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mutation not found';
  END IF;

  -- Récupérer lot, vendeur, copro
  SELECT * INTO v_lot FROM lots WHERE id = v_mutation.lot_id;
  SELECT * INTO v_seller FROM coproprietaires WHERE id = v_mutation.seller_owner_id;
  SELECT * INTO v_copro FROM copros WHERE id = p_copro_id;

  -- Calculer la situation financière depuis le ledger
  SELECT jsonb_build_object(
    'snapshot_date', CURRENT_DATE,
    'current_balance', COALESCE(lb.balance, 0),
    'total_calls_issued', COALESCE(lb.total_debit, 0),
    'total_payments_received', COALESCE(lb.total_credit, 0),
    'unpaid', jsonb_build_object(
      'amount', GREATEST(COALESCE(lb.balance, 0), 0),
      'lines_count', 0,
      'oldest_due_date', lb.last_movement_date,
      'days_overdue', COALESCE(CURRENT_DATE - lb.last_movement_date, 0)
    ),
    'work_fund_alur', jsonb_build_object(
      'balance', 0,
      'note', 'Fonds ALUR - suit les tantièmes généraux'
    ),
    'pending_calls', jsonb_build_object(
      'amount', 0,
      'note', 'Appels à venir sur l''exercice en cours'
    )
  ) INTO v_financial
  FROM v_lot_balance lb
  WHERE lb.lot_id = v_mutation.lot_id AND lb.copro_id = p_copro_id;

  -- Si pas de données financières, créer un objet vide
  IF v_financial IS NULL THEN
    v_financial := jsonb_build_object(
      'snapshot_date', CURRENT_DATE,
      'current_balance', 0,
      'total_calls_issued', 0,
      'total_payments_received', 0,
      'unpaid', jsonb_build_object('amount', 0, 'lines_count', 0, 'oldest_due_date', NULL, 'days_overdue', 0),
      'work_fund_alur', jsonb_build_object('balance', 0, 'note', 'Aucun fonds ALUR'),
      'pending_calls', jsonb_build_object('amount', 0, 'note', 'Aucun appel en attente')
    );
  END IF;

  -- Récupérer les dernières transactions
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_transactions
  FROM (
    SELECT
      gl.tx_date AS line_date,
      CASE WHEN gl.debit > 0 THEN 'call' ELSE 'payment' END AS line_type,
      gl.tx_label AS label,
      gl.debit,
      gl.credit,
      SUM(gl.debit - gl.credit) OVER (ORDER BY gl.tx_date, gl.entry_id) AS running_balance,
      'posted' AS line_status
    FROM v_general_ledger gl
    WHERE gl.copro_id = p_copro_id
      AND gl.lot_id = v_mutation.lot_id
      AND gl.status = 'posted'
    ORDER BY gl.tx_date DESC, gl.entry_id DESC
    LIMIT 20
  ) t;

  -- Construire le payload
  v_payload := jsonb_build_object(
    'version', '1.0',
    'legal_reference', 'Article 20 Loi 65-557 du 10 juillet 1965',
    'snapshot_type', p_snapshot_type,
    'generated_at', now(),
    'copro', jsonb_build_object(
      'id', v_copro.id,
      'name', v_copro.name,
      'address', v_copro.address,
      'siret', v_copro.siret
    ),
    'lot', jsonb_build_object(
      'id', v_lot.id,
      'ref', v_lot.ref,
      'type', v_lot.type,
      'tantiemes_generaux', v_lot.tantiemes_generaux,
      'building_id', v_lot.building_id,
      'floor', v_lot.floor,
      'surface', v_lot.surface
    ),
    'seller', jsonb_build_object(
      'id', v_seller.id,
      'name', COALESCE(
        CASE WHEN v_seller.is_company THEN v_seller.company_name
        ELSE CONCAT(v_seller.first_name, ' ', v_seller.last_name)
        END,
        'Inconnu'
      ),
      'email', v_seller.email,
      'is_company', v_seller.is_company
    ),
    'financial_situation', v_financial,
    'recent_transactions', v_transactions,
    'recent_transactions_count', jsonb_array_length(v_transactions),
    'mutation', jsonb_build_object(
      'id', v_mutation.id,
      'type', v_mutation.mutation_type,
      'requested_at', v_mutation.requested_at,
      'signature_date', v_mutation.signature_date,
      'notary_name', v_mutation.notary_name
    )
  );

  -- Insérer le snapshot
  INSERT INTO etat_date_snapshots (copro_id, mutation_id, snapshot_type, payload)
  VALUES (p_copro_id, p_mutation_id, p_snapshot_type, v_payload)
  RETURNING id INTO v_snapshot_id;

  -- Mettre à jour le statut de la mutation
  v_new_status := CASE
    WHEN p_snapshot_type = 'pre' THEN 'pre_etat_generated'
    ELSE 'final_etat_generated'
  END;

  UPDATE mutations SET
    status = v_new_status,
    updated_at = now()
  WHERE id = p_mutation_id;

  -- Marquer l'étape correspondante
  PERFORM upsert_mutation_step(
    p_mutation_id,
    CASE WHEN p_snapshot_type = 'pre' THEN 'pre_etat_date' ELSE 'etat_date' END,
    'completed',
    jsonb_build_object('snapshot_id', v_snapshot_id, 'generated_at', now())
  );

  RETURN jsonb_build_object(
    'success', true,
    'snapshot_id', v_snapshot_id,
    'snapshot_type', p_snapshot_type,
    'mutation_status', v_new_status,
    'payload', v_payload
  );
END;
$$;

-- ============================================================================
-- VIEW: v_unpaid_by_lot
-- Vue des impayés par lot pour le module impayés/relances
-- Requise par v_unpaid_with_reminders
-- ============================================================================

CREATE OR REPLACE VIEW v_unpaid_by_lot AS
SELECT
  cfl.copro_id,
  cfl.lot_id,
  l.ref AS lot_ref,
  l.type AS lot_type,
  lo.coproprietaire_id AS owner_id,
  COALESCE(
    CASE WHEN cp.is_company THEN cp.company_name
    ELSE CONCAT(cp.first_name, ' ', cp.last_name)
    END,
    'Inconnu'
  ) AS owner_name,
  cp.email AS owner_email,
  cp.phone AS owner_phone,

  -- Montants agrégés
  SUM(cfl.amount_due) AS total_due,
  SUM(cfl.amount_paid) AS total_paid,
  SUM(cfl.amount_due - cfl.amount_paid) AS unpaid_amount,

  -- Nombre de lignes impayées
  COUNT(*) AS unpaid_lines_count,

  -- Date d'échéance la plus ancienne
  MIN(cf.due_date) AS oldest_due_date,

  -- Jours de retard
  GREATEST(CURRENT_DATE - MIN(cf.due_date), 0) AS days_overdue,

  -- Sévérité
  CASE
    WHEN SUM(cfl.amount_due - cfl.amount_paid) <= 100 THEN 'MINOR'
    WHEN SUM(cfl.amount_due - cfl.amount_paid) <= 500 THEN 'MEDIUM'
    WHEN SUM(cfl.amount_due - cfl.amount_paid) <= 2000 THEN 'HIGH'
    ELSE 'CRITICAL'
  END AS severity

FROM call_for_funds_lines cfl
JOIN call_for_funds cf ON cf.id = cfl.call_id
JOIN lots l ON l.id = cfl.lot_id
LEFT JOIN lot_owners lo ON lo.lot_id = cfl.lot_id
  AND lo.end_date IS NULL
  AND lo.is_primary = true
LEFT JOIN coproprietaires cp ON cp.id = lo.coproprietaire_id
WHERE cfl.amount_paid < cfl.amount_due
  AND cf.due_date < CURRENT_DATE
  AND cf.status IN ('issued', 'partially_paid')
GROUP BY cfl.copro_id, cfl.lot_id, l.ref, l.type,
         lo.coproprietaire_id, cp.is_company, cp.company_name,
         cp.first_name, cp.last_name, cp.email, cp.phone;

COMMENT ON VIEW v_unpaid_by_lot IS 'Impayés agrégés par lot à partir des lignes d''appels de fonds en retard';

-- ============================================================================
-- Recreate v_unpaid_with_reminders to reference v_unpaid_by_lot
-- ============================================================================

CREATE OR REPLACE VIEW v_unpaid_with_reminders AS
SELECT
  u.*,
  -- Dernière relance envoyée
  last_reminder.id AS last_reminder_id,
  last_reminder.delay_level AS last_reminder_level,
  last_reminder.status AS last_reminder_status,
  last_reminder.sent_at AS last_reminder_sent_at,
  -- Nombre total de relances
  COALESCE(reminder_count.total, 0) AS total_reminders_sent
FROM v_unpaid_by_lot u
LEFT JOIN LATERAL (
  SELECT id, delay_level, status, sent_at
  FROM payment_reminders
  WHERE lot_id = u.lot_id
    AND copro_id = u.copro_id
    AND status IN ('sent', 'pending')
  ORDER BY delay_level DESC, created_at DESC
  LIMIT 1
) last_reminder ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS total
  FROM payment_reminders
  WHERE lot_id = u.lot_id
    AND copro_id = u.copro_id
    AND status = 'sent'
) reminder_count ON true;

COMMENT ON VIEW v_unpaid_with_reminders IS 'Impayés par lot enrichis avec dernière relance';
