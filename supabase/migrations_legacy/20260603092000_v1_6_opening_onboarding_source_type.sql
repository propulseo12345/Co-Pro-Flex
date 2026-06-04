-- V1.6 — source_type dédié 'opening_onboarding' pour la reprise de mandat.
-- Distinct de 'opening_balance' (report inter-exercices par open_next_period), pour
-- que la clôture ne supprime jamais la reprise d'onboarding. Cf. spec §3.5.

-- 1) Autoriser la nouvelle valeur (reprendre la liste live a l'identique + opening_onboarding)
ALTER TABLE public.ledger_transactions
  DROP CONSTRAINT IF EXISTS ledger_transactions_source_type_check;
ALTER TABLE public.ledger_transactions
  ADD CONSTRAINT ledger_transactions_source_type_check
  CHECK (
    source_type IS NULL OR source_type = ANY (ARRAY[
      'budget', 'budget_expense', 'call_for_funds', 'payment',
      'supplier_invoice', 'supplier_payment', 'bank_movement',
      'transfer', 'od', 'opening', 'closing', 'manual',
      'opening_balance', 'opening_onboarding'
    ])
  );

-- 2) Index unique partiel dédié (au plus 1 reprise d'onboarding par copro/période)
CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_tx_opening_onboarding
  ON public.ledger_transactions (copro_id, source_id)
  WHERE source_type = 'opening_onboarding';

-- 3) Étendre l'exemption d'immutabilité au nouveau source_type (garde l'annule-et-repasse)
CREATE OR REPLACE FUNCTION public.is_ledger_regen_exempt(
  p_source_type text, p_source_id uuid, p_posting_period_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SET search_path TO 'public'
AS $$
  SELECT p_source_type IN ('opening_balance','closing','opening_onboarding')
     AND p_source_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM accounting_periods ap
                 WHERE ap.id = p_source_id AND ap.status <> 'approved')
     AND EXISTS (SELECT 1 FROM accounting_periods ap
                 WHERE ap.id = p_posting_period_id AND ap.status <> 'approved');
$$;

-- 4) Rétro-compat : re-typer les reprises d'onboarding EXISTANTES.
-- Discriminant : une reprise d'onboarding vit DANS sa période source (period_id = source_id),
-- alors qu'un report inter-exercices vit dans N+1 (period_id <> source_id).
-- Autorisé par l'exemption tant que la période n'est pas 'approved' (sinon ignorée : déjà figée).
UPDATE public.ledger_transactions t
   SET source_type = 'opening_onboarding'
 WHERE t.source_type = 'opening_balance'
   AND t.period_id = t.source_id
   AND EXISTS (SELECT 1 FROM accounting_periods ap
               WHERE ap.id = t.period_id AND ap.status <> 'approved');

COMMENT ON INDEX public.uq_ledger_tx_opening_onboarding IS
  'Au plus une reprise de mandat (opening_onboarding) par copro/période. Distinct du report inter-exercices (opening_balance).';
