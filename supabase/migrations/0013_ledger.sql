-- 0013_ledger.sql — coeur grand livre (02 §1.2-1.5)
-- Source : .planning/db-cible/02-finance-grand-livre.md §1.2-1.5
-- Source : docs/superpowers/plans/2026-06-04-phase0-db-rebaseline.md Task 13
-- 4 tables : accounting_periods, ledger_transactions, ledger_entries, period_cutoff_items
-- Triggers d'immutabilite (trg_ledger_tx_immutable, trg_ledger_tx_no_delete_posted,
--   enforce_is_postable, trg_enforce_lot_id_on_45x, etc.) DIFFERES en Task 24.
-- tiers_id sur period_cutoff_items : FK -> tiers ajoutee en 0015.
-- locked_at/locked_by SUPPRIMÉS (verrou WP5.2 abandonne).

-- ============================================================
-- 1. accounting_periods
-- ============================================================
create table public.accounting_periods (
  id              uuid                not null default gen_random_uuid(),
  copro_id        uuid                not null references public.copros(id) on delete restrict,
  name            text                not null,
  start_date      date                not null,
  end_date        date                not null,
  status          period_status       not null default 'open',
  closed_at       timestamptz,
  closed_by       uuid                references public.profiles(id),
  approved_at     timestamptz,
  approved_by     uuid                references public.profiles(id),
  approval_notes  text,
  notes           text,
  created_at      timestamptz         not null default now(),
  updated_at      timestamptz         not null default now(),
  constraint pk_accounting_periods    primary key (id),
  constraint uq_period_copro_name     unique (copro_id, name),
  constraint ck_period_dates          check (end_date > start_date)
);
-- UNIQUE partiel : une seule période open par copropriété (remplace trigger)
create unique index uq_period_single_open
  on public.accounting_periods (copro_id)
  where status = 'open';
create trigger trg_periods_updated
  before update on public.accounting_periods
  for each row execute function public.set_updated_at();

-- ============================================================
-- 2. ledger_transactions
-- ============================================================
create table public.ledger_transactions (
  id           uuid                   not null default gen_random_uuid(),
  copro_id     uuid                   not null references public.copros(id) on delete restrict,
  period_id    uuid                   not null references public.accounting_periods(id) on delete restrict,
  tx_date      date                   not null default current_date,
  source_type  ledger_source_type     not null,
  source_id    uuid,
  label        text                   not null,
  status       ledger_tx_status       not null default 'draft',
  created_by   uuid                   references public.profiles(id),
  posted_by    uuid                   references public.profiles(id),
  posted_at    timestamptz,
  metadata     jsonb                  not null default '{}',
  constraint pk_ledger_transactions   primary key (id),
  constraint ck_posted_consistency    check (
    (status = 'draft'  and posted_at is null  and posted_by is null)
    or (status = 'posted' and posted_at is not null)
  )
);
-- Idempotence : une seule transaction par type de source par période
create unique index uq_ledger_tx_closing
  on public.ledger_transactions (copro_id, source_id, period_id)
  where source_type = 'closing';
create unique index uq_ledger_tx_opening_balance
  on public.ledger_transactions (copro_id, source_id, period_id)
  where source_type = 'opening_balance';
create unique index uq_ledger_tx_opening_onboarding
  on public.ledger_transactions (copro_id, source_id, period_id)
  where source_type = 'opening_onboarding';
create unique index uq_ledger_tx_result_allocation
  on public.ledger_transactions (copro_id, period_id)
  where source_type = 'result_allocation';
create index idx_ledger_tx_source
  on public.ledger_transactions (source_type, source_id)
  where source_id is not null;
create index idx_ledger_tx_copro_period
  on public.ledger_transactions (copro_id, period_id);

-- ============================================================
-- 3. ledger_entries — lignes debit/credit, coeur du GL
-- ============================================================
create table public.ledger_entries (
  id           uuid                   not null default gen_random_uuid(),
  tx_id        uuid                   not null references public.ledger_transactions(id) on delete cascade,
  copro_id     uuid                   not null references public.copros(id) on delete restrict,
  period_id    uuid                   not null references public.accounting_periods(id) on delete restrict,
  account_id   uuid                   not null references public.accounts(id) on delete restrict,
  lot_id       uuid                   references public.lots(id) on delete restrict,
  direction    ledger_direction       not null,
  amount       numeric(14,2)          not null,
  entry_label  text,
  constraint pk_ledger_entries        primary key (id),
  constraint ck_entry_amount          check (amount > 0)
);
create index idx_entries_tx
  on public.ledger_entries (tx_id);
create index idx_entries_account
  on public.ledger_entries (account_id);
create index idx_entries_cpa
  on public.ledger_entries (copro_id, period_id, account_id);
create index idx_entries_lot
  on public.ledger_entries (lot_id)
  where lot_id is not null;

-- ============================================================
-- 4. period_cutoff_items — cut-off droits constates (art.14-3)
-- ============================================================
create table public.period_cutoff_items (
  id                     uuid        not null default gen_random_uuid(),
  copro_id               uuid        not null references public.copros(id) on delete restrict,
  period_id              uuid        not null references public.accounting_periods(id) on delete restrict,
  kind                   cutoff_kind not null,
  account_id             uuid        not null references public.accounts(id) on delete restrict,
  counterpart_account_id uuid        not null references public.accounts(id) on delete restrict,
  amount                 numeric(14,2) not null,
  label                  text,
  tiers_id               uuid,  -- FK -> tiers ajoutee en 0015
  auto_reverse           boolean     not null default true,
  posting_tx_id          uuid        references public.ledger_transactions(id) on delete restrict,
  reversal_tx_id         uuid        references public.ledger_transactions(id) on delete restrict,
  constraint pk_period_cutoff_items   primary key (id),
  constraint ck_cutoff_amount         check (amount > 0)
);
create index idx_cutoff_copro_period
  on public.period_cutoff_items (copro_id, period_id);
