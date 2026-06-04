-- ============================================================================
-- Fix: v_coproprietaires_overview — solde basé sur le grand livre
-- Avant : solde venait de v_owner_financial_summary (appels de fonds uniquement)
-- Après : solde vient de v_lot_balance (grand livre = appels + reprises + paiements)
-- ============================================================================

CREATE OR REPLACE VIEW v_coproprietaires_overview AS
SELECT
  c.id,
  c.copro_id,
  c.user_id,
  c.is_company,
  c.company_name,
  c.civility,
  c.first_name,
  c.last_name,
  c.email,
  c.phone,
  c.mobile,
  c.address_line1,
  c.address_line2,
  c.city,
  c.postal_code,
  c.country,
  c.prefers_email,
  c.prefers_paper,
  c.notes,
  c.created_at,
  c.updated_at,

  CASE
    WHEN c.is_company = true THEN c.company_name
    ELSE concat_ws(' ', c.first_name, c.last_name)
  END AS display_name,

  -- Solde: somme des soldes de tous les lots actifs du copropriétaire (via grand livre)
  COALESCE(owner_balance.solde, 0) AS solde,

  CASE
    WHEN EXISTS (
      SELECT 1 FROM lot_owners lo
      WHERE lo.coproprietaire_id = c.id
        AND (lo.end_date IS NULL OR lo.end_date > CURRENT_DATE)
    ) THEN 'COPROPRIETAIRE'
    WHEN EXISTS (
      SELECT 1 FROM lot_owners lo
      WHERE lo.coproprietaire_id = c.id
        AND lo.end_date <= CURRENT_DATE
    ) THEN 'ANCIEN'
    ELSE 'COPROPRIETAIRE'
  END AS owner_type,

  (SELECT cm.role
   FROM council_members cm
   WHERE cm.coproprietaire_id = c.id
     AND cm.copro_id = c.copro_id
     AND (cm.end_date IS NULL OR cm.end_date > CURRENT_DATE)
   LIMIT 1
  ) AS council_role,

  (SELECT count(*)
   FROM lot_owners lo
   WHERE lo.coproprietaire_id = c.id
     AND (lo.end_date IS NULL OR lo.end_date > CURRENT_DATE)
  ) AS lots_count,

  (SELECT COALESCE(sum(l.tantiemes_generaux), 0)
   FROM lot_owners lo
   JOIN lots l ON l.id = lo.lot_id
   WHERE lo.coproprietaire_id = c.id
     AND (lo.end_date IS NULL OR lo.end_date > CURRENT_DATE)
  ) AS total_tantiemes

FROM coproprietaires c
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(vlb.balance), 0) AS solde
  FROM v_lot_balance vlb
  WHERE vlb.coproprietaire_id = c.id
    AND vlb.copro_id = c.copro_id
) owner_balance ON true;

COMMENT ON VIEW v_coproprietaires_overview IS 'Vue copropriétaires avec solde calculé depuis le grand livre (ledger_entries)';
