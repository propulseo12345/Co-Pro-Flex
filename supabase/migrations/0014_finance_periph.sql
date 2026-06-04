-- 0014_finance_periph.sql — finance périphérique (02 §1.6-1.11) [plan Task 13b ; renumérotée 0014, suffixe alpha incompatible Supabase CLI]
-- Source : .planning/db-cible/02-finance-grand-livre.md §1.6-1.11
-- Source : docs/superpowers/plans/2026-06-04-phase0-db-rebaseline.md Task 13b
-- 7 tables : payments, payment_allocations, bank_movements, bank_matches,
--             treasury_advances, collective_loans, collective_loan_shares
-- Triggers trg_validate_payment_allocation / trg_allocation_update_line DIFFERÉS (Task 24).
-- FK call_line_id -> call_for_funds_lines ajoutée en 0016 (call_for_funds non encore créé).

-- ============================================================
-- 1. payments — encaissements (lot-centric)
-- ============================================================
create table public.payments (
  id               uuid                not null default gen_random_uuid(),
  copro_id         uuid                not null references public.copros(id) on delete restrict,
  period_id        uuid                not null references public.accounting_periods(id) on delete restrict,
  lot_id           uuid                not null references public.lots(id) on delete restrict,
  amount           numeric(14,2)       not null,
  payment_date     date                not null default current_date,
  method           payment_method      not null,
  reference        text,
  status           payment_status      not null default 'recorded',
  ledger_tx_id     uuid                references public.ledger_transactions(id) on delete restrict,
  created_by       uuid                references public.profiles(id),
  idempotency_key  text,
  constraint pk_payments              primary key (id),
  constraint ck_payment_amount        check (amount > 0)
);
-- Index unique partiel : unicité idempotency_key par copropriété quand renseigné
create unique index uq_payments_idempotency
  on public.payments (copro_id, idempotency_key)
  where idempotency_key is not null;
create index idx_payments_lot
  on public.payments (lot_id);
create index idx_payments_copro_period
  on public.payments (copro_id, period_id);

-- ============================================================
-- 2. payment_allocations — imputation FIFO cloisonnée
-- ============================================================
-- call_line_id : colonne présente, FK -> call_for_funds_lines ajoutée en 0016
create table public.payment_allocations (
  id               uuid                not null default gen_random_uuid(),
  copro_id         uuid                not null references public.copros(id) on delete restrict,
  payment_id       uuid                not null references public.payments(id) on delete cascade,
  call_line_id     uuid                not null, -- FK -> call_for_funds_lines ajoutée en 0016
  amount_allocated numeric(14,2)       not null,
  constraint pk_payment_allocations   primary key (id),
  constraint ck_alloc_amount          check (amount_allocated > 0),
  constraint uq_alloc_payment_line    unique (payment_id, call_line_id)
);
create index idx_alloc_payment
  on public.payment_allocations (payment_id);
create index idx_alloc_line
  on public.payment_allocations (call_line_id);

-- ============================================================
-- 3. bank_movements — relevés bancaires importés
-- ============================================================
-- account_code et account_category SUPPRIMÉS (dénormalisation, cf. blueprint §1.8)
-- period_id NULLABLE : décision A15, un mouvement peut précéder son affectation à une période
create table public.bank_movements (
  id             uuid                     not null default gen_random_uuid(),
  copro_id       uuid                     not null references public.copros(id) on delete restrict,
  period_id      uuid                              references public.accounting_periods(id) on delete restrict,
  bank_date      date                     not null,
  value_date     date,
  amount_signed  numeric(14,2)            not null,
  label          text,
  bank_ref       text,
  status         bank_movement_status     not null default 'unmatched',
  account_id     uuid                     not null references public.accounts(id) on delete restrict,
  constraint pk_bank_movements            primary key (id)
);
create index idx_bank_mov_copro
  on public.bank_movements (copro_id);

-- ============================================================
-- 4. bank_matches — rapprochement bancaire
-- ============================================================
create table public.bank_matches (
  id               uuid                       not null default gen_random_uuid(),
  copro_id         uuid                       not null references public.copros(id) on delete restrict,
  bank_movement_id uuid                       not null references public.bank_movements(id) on delete cascade,
  target_type      bank_match_target_type     not null,
  target_id        uuid,
  amount_matched   numeric(14,2)              not null,
  matched_at       timestamptz                not null default now(),
  matched_by       uuid                                references public.profiles(id),
  constraint pk_bank_matches                  primary key (id),
  constraint ck_match_amount                  check (amount_matched > 0)
);
create index idx_bank_matches_mov
  on public.bank_matches (bank_movement_id);

-- ============================================================
-- 5. treasury_advances — avances de trésorerie (art. 35)
-- ============================================================
-- owner_id SUPPRIMÉ (lot-centric, était 12/12 NULL en live — blueprint §1.10)
create table public.treasury_advances (
  id            uuid                      not null default gen_random_uuid(),
  copro_id      uuid                      not null references public.copros(id) on delete restrict,
  lot_id        uuid                      not null references public.lots(id) on delete restrict,
  advance_type  treasury_advance_type     not null,
  label         text,
  amount_due    numeric(14,2)             not null default 0,
  amount_paid   numeric(14,2)             not null default 0,
  constraint pk_treasury_advances         primary key (id)
);
create index idx_treasury_lot
  on public.treasury_advances (lot_id);

-- ============================================================
-- 6. collective_loans — emprunts collectifs
-- ============================================================
-- ledger_tx_id NOUVEAU : rattachement GL écriture D512/C164 (blueprint §1.11)
create table public.collective_loans (
  id               uuid                      not null default gen_random_uuid(),
  copro_id         uuid                      not null references public.copros(id) on delete restrict,
  label            text,
  lender           text,
  total_amount     numeric(14,2),
  remaining_amount numeric(14,2),
  annual_payment   numeric(14,2),
  interest_rate    numeric(6,3),
  start_date       date,
  end_date         date,
  status           collective_loan_status    not null default 'active',
  ledger_tx_id     uuid                               references public.ledger_transactions(id) on delete restrict,
  constraint pk_collective_loans             primary key (id)
);

-- ============================================================
-- 7. collective_loan_shares — quote-parts par lot
-- ============================================================
create table public.collective_loan_shares (
  id                uuid             not null default gen_random_uuid(),
  loan_id           uuid             not null references public.collective_loans(id) on delete cascade,
  lot_id            uuid             not null references public.lots(id) on delete restrict,
  share_amount      numeric(14,2),
  remaining_amount  numeric(14,2),
  last_payment_date date,
  constraint pk_collective_loan_shares  primary key (id),
  constraint uq_loan_lot                unique (loan_id, lot_id)
);
