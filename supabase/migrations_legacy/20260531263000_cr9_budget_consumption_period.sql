-- Revue de code #9 [mineur] : v_budget_consumption_by_account
--
-- Problème : le "réalisé" (débits classe 6 postés) était rattaché à l'exercice
--   par la DATE de l'écriture (tx_date ∈ [start,end]), alors que l'annexe 2
--   légale (fn_annexe_2) le rattache par EXERCICE comptable (period_id). Dès
--   qu'une écriture est antidatée ou de cut-off (facture N reçue en N+1...),
--   les deux écrans affichaient deux "réalisés" différents pour le même compte.
--   Mesuré : 98 écritures concernées sur les données actuelles.
--
-- Fix : aligner la vue sur la sémantique légale = filtrer par period_id (le
--   grand livre par exercice = source unique de vérité, décret 2005-240).
--   ledger_entries.period_id est garanti = ledger_transactions.period_id par le
--   trigger trg_ledger_entry_consistency.
--
-- Idempotent (CREATE OR REPLACE VIEW). Basé sur la définition en base au 2026-05-31.

CREATE OR REPLACE VIEW public.v_budget_consumption_by_account AS
 SELECT bl.copro_id,
    bl.budget_id,
    b.period_id,
    ap.name AS period_name,
    ap.start_date AS period_start,
    ap.end_date AS period_end,
    bl.account_id,
    a.code AS account_code,
    a.name AS account_name,
    bl.label AS budget_line_label,
    bl.amount AS budgeted_amount,
    COALESCE(realized.total_spent, 0::numeric) AS realized_amount,
    bl.amount - COALESCE(realized.total_spent, 0::numeric) AS variance,
        CASE
            WHEN bl.amount > 0::numeric THEN round(COALESCE(realized.total_spent, 0::numeric) / bl.amount * 100::numeric, 2)
            ELSE 0::numeric
        END AS consumption_rate_percent,
        CASE
            WHEN bl.amount = 0::numeric THEN 'no_budget'::text
            WHEN COALESCE(realized.total_spent, 0::numeric) = 0::numeric THEN 'not_started'::text
            WHEN COALESCE(realized.total_spent, 0::numeric) < (bl.amount * 0.5) THEN 'under_50'::text
            WHEN COALESCE(realized.total_spent, 0::numeric) < (bl.amount * 0.8) THEN 'under_80'::text
            WHEN COALESCE(realized.total_spent, 0::numeric) < bl.amount THEN 'under_100'::text
            WHEN COALESCE(realized.total_spent, 0::numeric) = bl.amount THEN 'on_budget'::text
            ELSE 'over_budget'::text
        END AS consumption_status
   FROM budget_lines bl
     JOIN budgets b ON b.id = bl.budget_id
     JOIN accounting_periods ap ON ap.id = b.period_id
     LEFT JOIN accounts a ON a.id = bl.account_id
     LEFT JOIN LATERAL ( SELECT sum(
                CASE
                    WHEN le.direction = 'debit'::text THEN le.amount
                    ELSE 0::numeric
                END) AS total_spent
           FROM ledger_entries le
             JOIN ledger_transactions lt ON lt.id = le.tx_id AND lt.status = 'posted'::text
          WHERE le.account_id = bl.account_id AND le.copro_id = bl.copro_id AND le.period_id = b.period_id) realized ON true
  WHERE b.status = ANY (ARRAY['validated'::budget_status, 'closed'::budget_status]);
