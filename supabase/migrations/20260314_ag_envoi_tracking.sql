-- =============================================================
-- Table de traçabilité des envois de convocations
-- =============================================================

CREATE TABLE ag_envoi_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ag_id UUID NOT NULL REFERENCES ag_meetings(id) ON DELETE CASCADE,
  coproprietaire_id UUID NOT NULL REFERENCES coproprietaires(id) ON DELETE SET NULL,
  method TEXT NOT NULL CHECK (method IN (
    'RECOMMANDE', 'LETTRE_SIMPLE', 'AVIS_ELECTRONIQUE', 'EMAIL', 'REMISE_MAIN_PROPRE'
  )),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'sent', 'delivered', 'error'
  )),
  tracking_ref TEXT,
  document_id UUID,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_envoi_tracking_ag ON ag_envoi_tracking(ag_id);
CREATE INDEX idx_envoi_tracking_copro ON ag_envoi_tracking(ag_id, coproprietaire_id);
CREATE INDEX idx_envoi_tracking_copro_alone ON ag_envoi_tracking(coproprietaire_id);

ALTER TABLE ag_envoi_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "envoi_tracking_access" ON ag_envoi_tracking
  FOR ALL USING (
    ag_id IN (
      SELECT id FROM ag_meetings
      WHERE copro_id IN (
        SELECT copro_id FROM memberships
        WHERE user_id = COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID)
      )
    )
  );

-- =============================================================
-- RPC: Bulk insert tracking entries
-- =============================================================

CREATE OR REPLACE FUNCTION save_ag_envoi_tracking(
  p_ag_id UUID,
  p_entries JSONB
) RETURNS VOID AS $$
BEGIN
  INSERT INTO ag_envoi_tracking (
    ag_id, coproprietaire_id, method, status,
    tracking_ref, document_id, error_message, sent_at
  )
  SELECT
    p_ag_id,
    (entry->>'coproprietaireId')::UUID,
    entry->>'method',
    entry->>'status',
    entry->>'trackingRef',
    NULLIF(entry->>'documentId', '')::UUID,
    entry->>'error',
    (entry->>'sentAt')::TIMESTAMPTZ
  FROM jsonb_array_elements(p_entries) AS entry;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- RPC: Read tracking for an AG
-- =============================================================

CREATE OR REPLACE FUNCTION get_ag_envoi_tracking(p_ag_id UUID)
RETURNS JSONB AS $$
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'coproprietaireId', t.coproprietaire_id,
      'method', t.method,
      'status', t.status,
      'trackingRef', t.tracking_ref,
      'documentId', t.document_id,
      'error', t.error_message,
      'sentAt', t.sent_at,
      'deliveredAt', t.delivered_at
    )
  ), '[]'::JSONB)
  FROM ag_envoi_tracking t
  WHERE t.ag_id = p_ag_id;
$$ LANGUAGE sql STABLE;

-- =============================================================
-- RPC: Bundle convocation (toutes les données pour PDF)
-- Note: lot_owners est la table de jonction lots<->coproprietaires
-- =============================================================

CREATE OR REPLACE FUNCTION rpc_get_ag_convocation_bundle(p_ag_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_copro_id UUID;
BEGIN
  SELECT copro_id INTO v_copro_id FROM ag_meetings WHERE id = p_ag_id;

  RETURN jsonb_build_object(
    'agData', (
      SELECT row_to_json(m) FROM (
        SELECT id, meeting_type, meeting_date, location, copro_id,
               opening_notes, closing_notes
        FROM ag_meetings WHERE id = p_ag_id
      ) m
    ),
    'resolutions', (
      SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.resolution_number), '[]')
      FROM (
        SELECT id, title, description, majority_type, resolution_number, status, variables
        FROM ag_resolutions WHERE ag_id = p_ag_id
      ) r
    ),
    'coproprietaires', (
      SELECT COALESCE(jsonb_agg(row_to_json(c)), '[]')
      FROM (
        SELECT DISTINCT ON (cp.id)
          cp.id,
          cp.first_name || ' ' || cp.last_name AS nom,
          cp.email,
          cp.phone AS telephone,
          cp.address_line1,
          cp.address_line2,
          cp.city,
          cp.postal_code,
          l.id AS lot_id,
          lo.lot_id IS NOT NULL AS has_lot,
          l.tantiemes_generaux AS tantiemes
        FROM coproprietaires cp
        LEFT JOIN lot_owners lo ON lo.coproprietaire_id = cp.id AND lo.copro_id = v_copro_id
        LEFT JOIN lots l ON l.id = lo.lot_id
        WHERE cp.copro_id = v_copro_id
        ORDER BY cp.id, l.tantiemes_generaux DESC NULLS LAST
      ) c
    ),
    'totalTantiemes', (
      SELECT COALESCE(SUM(l.tantiemes_generaux), 0)
      FROM lots l
      WHERE l.copro_id = v_copro_id
    ),
    'syndic', (
      SELECT row_to_json(s) FROM (
        SELECT name AS nom, address AS adresse, city AS ville, postal_code AS code_postal
        FROM copros WHERE id = v_copro_id
      ) s
    )
  );
END;
$$ LANGUAGE plpgsql STABLE;
