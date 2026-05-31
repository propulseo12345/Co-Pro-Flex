-- ============================================================================
-- WP3/Phase 3 — Exposer le tantième général du lot sur les lignes d'appel
-- ----------------------------------------------------------------------------
-- Le détail d'un appel regroupe désormais les lignes PAR LOT (une ligne par
-- (lot × clé) en base → un bloc par lot à l'écran, dépliable par clé). Pour
-- afficher la quote-part générale du lot sur la ligne groupée, on ajoute
-- `lot_tantiemes` (= lots.tantiemes_generaux) à la vue v_call_lines_detailed.
-- (Colonne ajoutée en fin de vue.)
-- ============================================================================

CREATE OR REPLACE VIEW public.v_call_lines_detailed AS
 SELECT cfl.id,
    cfl.copro_id,
    cfl.call_id,
    cf.label AS call_label,
    cf.issue_date,
    cf.due_date,
    cf.status AS call_status,
    cfl.repartition_key_id,
    cfl.lot_id,
    l.ref AS lot_ref,
    l.type AS lot_type,
    cfl.amount_due,
    cfl.amount_paid,
    cfl.amount_due - cfl.amount_paid AS amount_remaining,
    cfl.status,
    COALESCE(cfl.weight_snapshot, rkl.weight, 0::numeric) AS lot_weight,
    COALESCE(rk_total.total_weight, 0::numeric) AS key_total_weight,
    ( SELECT (cp.first_name || ' '::text) || cp.last_name
           FROM lot_owners lo
             JOIN coproprietaires cp ON cp.id = lo.coproprietaire_id
          WHERE lo.lot_id = cfl.lot_id AND lo.is_primary = true AND (lo.end_date IS NULL OR lo.end_date > CURRENT_DATE)
         LIMIT 1) AS owner_name,
    rk.name AS repartition_key_name,
    l.tantiemes_generaux AS lot_tantiemes
   FROM call_for_funds_lines cfl
     JOIN call_for_funds cf ON cf.id = cfl.call_id
     JOIN lots l ON l.id = cfl.lot_id
     LEFT JOIN repartition_keys rk ON rk.id = cfl.repartition_key_id
     LEFT JOIN repartition_key_lines rkl ON rkl.key_id = cfl.repartition_key_id AND rkl.lot_id = cfl.lot_id
     LEFT JOIN ( SELECT repartition_key_lines.key_id,
            sum(repartition_key_lines.weight) AS total_weight
           FROM repartition_key_lines
          GROUP BY repartition_key_lines.key_id) rk_total ON rk_total.key_id = cfl.repartition_key_id;
