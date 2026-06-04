-- V1.6 — Pivot 1 : le solde par lot ne reflète QUE la créance individualisée (450%/459%).
-- Le 103/lot (avance, capital propre) ne doit pas gonfler le solde copropriétaire
-- (annuaire/AG/votes). Il est exposé via une vue dédiée v_lot_avance.
-- Non régressif : 0 écriture 103/105 par lot aujourd'hui.

CREATE OR REPLACE VIEW public.v_lot_balance AS
 SELECT e.copro_id, e.lot_id, l.ref AS lot_ref, l.type AS lot_type, l.tantiemes_generaux,
        lo.coproprietaire_id,
        COALESCE(CASE WHEN c.is_company THEN c.company_name
                      ELSE concat(c.first_name, ' ', c.last_name) END, 'Propriétaire inconnu') AS owner_name,
        c.email AS owner_email,
        sum(CASE WHEN e.direction = 'debit'  THEN e.amount ELSE 0 END) AS total_debit,
        sum(CASE WHEN e.direction = 'credit' THEN e.amount ELSE 0 END) AS total_credit,
        sum(CASE WHEN e.direction = 'debit'  THEN e.amount ELSE 0 END)
          - sum(CASE WHEN e.direction = 'credit' THEN e.amount ELSE 0 END) AS balance,
        count(*) AS entry_count,
        max(t.tx_date) AS last_movement_date
   FROM ledger_entries e
     JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted'
     JOIN accounts a ON a.id = e.account_id
     JOIN lots l ON l.id = e.lot_id
     LEFT JOIN lot_owners lo ON lo.lot_id = e.lot_id AND lo.end_date IS NULL AND lo.is_primary = true
     LEFT JOIN coproprietaires c ON c.id = lo.coproprietaire_id
  WHERE e.lot_id IS NOT NULL
    AND (a.code LIKE '450%' OR a.code LIKE '459%')   -- Pivot 1 : créance individualisée uniquement
  GROUP BY e.copro_id, e.lot_id, l.ref, l.type, l.tantiemes_generaux,
           lo.coproprietaire_id, c.is_company, c.company_name, c.first_name, c.last_name, c.email;

-- Vue dédiée : avance (103) par lot. Convention : crédit = avance détenue pour le lot (positif).
CREATE OR REPLACE VIEW public.v_lot_avance AS
 SELECT e.copro_id, e.lot_id, l.ref AS lot_ref,
        sum(CASE WHEN e.direction = 'credit' THEN e.amount ELSE -e.amount END) AS avance_balance
   FROM ledger_entries e
     JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted'
     JOIN accounts a ON a.id = e.account_id
     JOIN lots l ON l.id = e.lot_id
  WHERE e.lot_id IS NOT NULL AND a.code LIKE '103%'
  GROUP BY e.copro_id, e.lot_id, l.ref;

COMMENT ON VIEW public.v_lot_balance IS
  'Solde par lot = créance individualisée (comptes 450%/459%) UNIQUEMENT. Les autres comptes à lot_id (ex. 103 avance) sont exclus et exposés ailleurs (v_lot_avance).';
