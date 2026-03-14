-- Migration: Ajouter lot_weight et key_total_weight à v_call_lines_detailed
-- Permet d'afficher les tantièmes dans la page détail des appels de fonds

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
  cf.repartition_key_id,
  cfl.lot_id,
  l.ref as lot_ref,
  l.type as lot_type,
  cfl.amount_due,
  cfl.amount_paid,
  cfl.amount_due - cfl.amount_paid as amount_remaining,
  cfl.status,
  -- Tantièmes : poids du lot dans la clé de répartition de l'appel
  COALESCE(rkl.weight, 0) as lot_weight,
  -- Total tantièmes de la clé
  COALESCE(rk_total.total_weight, 0) as key_total_weight,
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
JOIN lots l ON l.id = cfl.lot_id
LEFT JOIN repartition_key_lines rkl
  ON rkl.key_id = cf.repartition_key_id AND rkl.lot_id = cfl.lot_id
LEFT JOIN (
  SELECT key_id, SUM(weight) as total_weight
  FROM repartition_key_lines
  GROUP BY key_id
) rk_total ON rk_total.key_id = cf.repartition_key_id;
