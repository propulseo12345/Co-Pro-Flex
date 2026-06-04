-- WP5.2 — Table des items de cut-off (source de vérité du rattachement d'un exercice)
CREATE TABLE IF NOT EXISTS public.period_cutoff_items (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id               uuid NOT NULL REFERENCES public.copros(id) ON DELETE CASCADE,
  period_id              uuid NOT NULL REFERENCES public.accounting_periods(id) ON DELETE CASCADE,
  kind                   text NOT NULL CHECK (kind IN ('CAP','CCA','PCA','PAR')),
  account_id             uuid NOT NULL REFERENCES public.accounts(id),
  counterpart_account_id uuid NOT NULL REFERENCES public.accounts(id),
  amount                 numeric(15,2) NOT NULL CHECK (amount > 0),
  label                  text NOT NULL,
  supplier_id            uuid REFERENCES public.suppliers(id),
  auto_reverse           boolean NOT NULL DEFAULT true,
  posting_tx_id          uuid REFERENCES public.ledger_transactions(id) ON DELETE SET NULL,
  reversal_tx_id         uuid REFERENCES public.ledger_transactions(id) ON DELETE SET NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cutoff_items_period
  ON public.period_cutoff_items (copro_id, period_id);

-- Désambiguïsation cut-off (period_id=N) vs extourne (period_id=N+1), tous deux source_id=N.
CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_tx_closing
  ON public.ledger_transactions (copro_id, source_id, period_id)
  WHERE source_type = 'closing';

-- Phase dev : RLS laissé désactivé (cohérent avec le reste du schéma, cf. memo dev_phase_rls).
