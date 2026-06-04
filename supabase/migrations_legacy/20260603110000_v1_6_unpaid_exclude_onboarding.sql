-- V1.6 — I5 : v_unpaid_by_lot exclut les copros encore en onboarding.
-- Une copro en cours d'onboarding (onboarding_step IS NOT NULL) peut avoir des appels
-- postés (post-as-you-go étape 6) sans reprise terminée -> ne doit PAS remonter dans
-- les impayés/relances. On AJOUTE un JOIN copros + un filtre ; les colonnes restent
-- identiques (sûr pour v_dashboard_kpis et v_unpaid_with_reminders qui en dépendent).
-- Reprend EXACTEMENT la def vivante (shape 20260125) + JOIN + filtre.

CREATE OR REPLACE VIEW public.v_unpaid_by_lot
WITH (security_invoker = true) AS
SELECT
  cfl.copro_id,
  cfl.lot_id,
  l.ref AS lot_ref,
  (
    SELECT cp.first_name || ' ' || cp.last_name
    FROM lot_owners lo
    JOIN coproprietaires cp ON cp.id = lo.coproprietaire_id
    WHERE lo.lot_id = cfl.lot_id
      AND lo.is_primary = true
      AND (lo.end_date IS NULL OR lo.end_date > CURRENT_DATE)
    LIMIT 1
  ) AS owner_name,
  (
    SELECT cp.email
    FROM lot_owners lo
    JOIN coproprietaires cp ON cp.id = lo.coproprietaire_id
    WHERE lo.lot_id = cfl.lot_id
      AND lo.is_primary = true
      AND (lo.end_date IS NULL OR lo.end_date > CURRENT_DATE)
    LIMIT 1
  ) AS owner_email,
  SUM(cfl.amount_due - cfl.amount_paid) AS total_unpaid,
  COUNT(cfl.id) AS unpaid_lines_count,
  MIN(cf.due_date) AS oldest_due_date,
  CURRENT_DATE - MIN(cf.due_date) AS days_overdue
FROM call_for_funds_lines cfl
JOIN call_for_funds cf ON cf.id = cfl.call_id
JOIN lots l ON l.id = cfl.lot_id
JOIN copros c ON c.id = cfl.copro_id            -- I5 : rattacher la copro
WHERE cfl.status <> 'paid'
  AND cf.status NOT IN ('draft', 'cancelled')
  AND cf.due_date < CURRENT_DATE
  AND c.onboarding_step IS NULL                  -- I5 : exclure les copros en onboarding
GROUP BY cfl.copro_id, cfl.lot_id, l.ref
HAVING SUM(cfl.amount_due - cfl.amount_paid) > 0
ORDER BY total_unpaid DESC;

COMMENT ON VIEW public.v_unpaid_by_lot IS
  'Impayés agrégés par lot (échu non réglé). Exclut les copros encore en onboarding (onboarding_step IS NOT NULL).';
