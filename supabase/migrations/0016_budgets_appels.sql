-- 0016_budgets_appels.sql — budgets / appels de fonds / impayés / relances (03 §1)
-- Source : .planning/db-cible/03-budgets-appels-impayes.md §1.1-§1.11
-- Source : docs/superpowers/plans/2026-06-04-phase0-db-rebaseline.md Task 15 (renumeroté 0016)
-- 11 tables : budgets, budget_lines, budget_expenses,
--             call_for_funds, call_for_funds_lines,
--             email_templates, payment_reminder_rules, payment_reminders,
--             reminder_settings, budget_payment_schedules, alur_transfers
-- FK rétroactive : payment_allocations.call_line_id -> call_for_funds_lines (créée ICI)
-- FK différées :
--   budgets.source_ag_id       -> ag_meetings        ajoutée en 0017
--   budget_expenses.piece_jointe -> documents         ajoutée en 0020
--   budget_payment_schedules.service_order_id -> service_orders ajoutée en 0021

-- ============================================================
-- 1. budgets — budget annuel (cœur)
-- ============================================================
create table public.budgets (
  id               uuid              not null default gen_random_uuid(),
  copro_id         uuid              not null references public.copros(id) on delete cascade,
  period_id        uuid              not null references public.accounting_periods(id) on delete restrict,
  budget_type      budget_type       not null,
  status           budget_status     not null default 'draft',
  version          int               not null default 1,
  name             text,
  notes            text,
  source_ag_id     uuid,             -- FK ag_meetings ajoutée en 0017
  created_by       uuid              references public.profiles(id) on delete set null,
  validated_by     uuid              references public.profiles(id) on delete set null,
  validated_at     timestamptz,
  created_at       timestamptz       not null default now(),
  updated_at       timestamptz       not null default now(),
  constraint pk_budgets              primary key (id),
  constraint uq_budget_version       unique (copro_id, period_id, budget_type, version)
);
-- Unique partiel : un seul budget validé par copro×période×type (blueprint A17)
create unique index uq_budget_one_validated
  on public.budgets (copro_id, period_id, budget_type)
  where status = 'validated';
create index idx_budgets_copro
  on public.budgets (copro_id);
create index idx_budgets_cpts
  on public.budgets (copro_id, period_id, budget_type, status);
-- Blueprint §1.1 : index (period_id, status)
create index idx_budgets_period_status
  on public.budgets (period_id, status);
create trigger trg_budgets_updated
  before update on public.budgets
  for each row execute function public.set_updated_at();

-- ============================================================
-- 2. budget_lines — ligne budgétaire (compte × clé)
-- ============================================================
create table public.budget_lines (
  id                   uuid              not null default gen_random_uuid(),
  budget_id            uuid              not null references public.budgets(id) on delete cascade,
  copro_id             uuid              not null references public.copros(id) on delete cascade,
  account_id           uuid              not null references public.accounts(id) on delete restrict,
  repartition_key_id   uuid              not null references public.repartition_keys(id) on delete restrict,
  label                text              not null,
  amount               numeric(14,2)     not null,
  code                 text,
  sort_order           int               default 0,
  created_at           timestamptz       not null default now(),
  updated_at           timestamptz       not null default now(),
  constraint pk_budget_lines             primary key (id),
  constraint ck_budget_line_amount       check (amount >= 0)
);
create index idx_budget_lines_budget
  on public.budget_lines (budget_id);
create index idx_budget_lines_account
  on public.budget_lines (account_id);
create index idx_budget_lines_copro
  on public.budget_lines (copro_id);
create trigger trg_budget_lines_updated
  before update on public.budget_lines
  for each row execute function public.set_updated_at();

-- ============================================================
-- 3. budget_expenses — dépense / cycle d'engagement (table maître)
-- ============================================================
-- copro_id et budget_line_id en RESTRICT (dépense reliée au GL, pas de cascade — blueprint §1.3)
create table public.budget_expenses (
  id                 uuid              not null default gen_random_uuid(),
  copro_id           uuid              not null references public.copros(id) on delete restrict,
  budget_id          uuid              not null references public.budgets(id) on delete restrict,
  budget_line_id     uuid              not null references public.budget_lines(id) on delete restrict,
  label              text              not null,
  amount             numeric(14,2)     not null,
  montant_ht         numeric(14,2),
  taux_tva           numeric(5,2),
  tx_date            date              not null default current_date,
  status             expense_status    not null default 'draft',
  tiers_id           uuid              references public.tiers(id) on delete set null,
  piece_jointe       uuid,             -- FK documents ajoutée en 0020
  ledger_tx_id       uuid              references public.ledger_transactions(id) on delete restrict,
  validated_by       uuid              references public.profiles(id),
  validated_at       timestamptz,
  rejection_comment  text,
  created_at         timestamptz       not null default now(),
  updated_at         timestamptz       not null default now(),
  constraint pk_budget_expenses         primary key (id),
  constraint ck_budget_expense_amount   check (amount > 0)
);
create index idx_budget_exp_budget
  on public.budget_expenses (budget_id);
create index idx_budget_exp_date
  on public.budget_expenses (copro_id, tx_date);
-- Blueprint §1.3 : index (budget_line_id)
create index idx_budget_exp_line
  on public.budget_expenses (budget_line_id);
create index idx_budget_exp_status
  on public.budget_expenses (status);
create trigger trg_budget_exp_updated
  before update on public.budget_expenses
  for each row execute function public.set_updated_at();

-- ============================================================
-- 4. call_for_funds — en-tête d'appel agrégé multi-clés
-- ============================================================
create table public.call_for_funds (
  id                   uuid                    not null default gen_random_uuid(),
  copro_id             uuid                    not null references public.copros(id) on delete cascade,
  period_id            uuid                    not null references public.accounting_periods(id),
  budget_id            uuid                             references public.budgets(id),
  repartition_key_id   uuid                             references public.repartition_keys(id), -- toujours NULL (multi-clés)
  label                text                    not null,
  issue_date           date                    not null,
  due_date             date                    not null,
  trimester            int,
  total_amount         numeric(14,2)           not null,
  status               call_for_funds_status   not null default 'draft',
  ledger_tx_id         uuid                             references public.ledger_transactions(id) on delete restrict,
  issued_at            timestamptz,
  description          text,
  created_by           uuid                             references public.profiles(id),
  created_at           timestamptz             not null default now(),
  updated_at           timestamptz             not null default now(),
  constraint pk_call_for_funds               primary key (id),
  constraint ck_cff_trimester                check (trimester between 1 and 4),
  constraint ck_cff_total                    check (total_amount > 0),
  constraint uq_call_idempotent              unique (copro_id, period_id, label, issue_date)
);
create index idx_cff_copro_period
  on public.call_for_funds (copro_id, period_id);
create index idx_cff_due
  on public.call_for_funds (due_date);
-- Blueprint §1.4 : index (copro_id, status)
create index idx_cff_copro_status
  on public.call_for_funds (copro_id, status);
create trigger trg_cff_updated
  before update on public.call_for_funds
  for each row execute function public.set_updated_at();

-- ============================================================
-- 5. call_for_funds_lines — quote-part lot×clé (cœur lot-centric)
-- ============================================================
create table public.call_for_funds_lines (
  id                   uuid               not null default gen_random_uuid(),
  call_id              uuid               not null references public.call_for_funds(id) on delete cascade,
  copro_id             uuid               not null references public.copros(id) on delete cascade,
  lot_id               uuid               not null references public.lots(id),
  repartition_key_id   uuid                        references public.repartition_keys(id),
  amount_due           numeric(14,2)      not null,
  amount_paid          numeric(14,2)      not null default 0,
  status               call_line_status   not null default 'unpaid',
  weight_snapshot      numeric,
  constraint pk_call_for_funds_lines     primary key (id),
  constraint ck_cff_line_due             check (amount_due >= 0),
  constraint ck_cff_line_paid            check (amount_paid >= 0),
  constraint ck_call_line_amounts        check (amount_paid <= amount_due),
  constraint uq_call_line_lot_key        unique (call_id, lot_id, repartition_key_id)
);
create index idx_cff_lines_call
  on public.call_for_funds_lines (call_id);
create index idx_cff_lines_copro
  on public.call_for_funds_lines (copro_id, call_id);
create index idx_cff_lines_lot
  on public.call_for_funds_lines (lot_id);
create index idx_cff_lines_lot_status
  on public.call_for_funds_lines (lot_id, status);
-- Blueprint §1.5 : index (status) seul
create index idx_cff_lines_status
  on public.call_for_funds_lines (status);

-- FK rétroactive : payment_allocations.call_line_id -> call_for_funds_lines (02 §1.7)
-- payment_allocations existe depuis 0014 ; call_for_funds_lines vient d'être créée
alter table public.payment_allocations
  add constraint fk_alloc_call_line
  foreign key (call_line_id)
  references public.call_for_funds_lines(id)
  on delete cascade;

-- ============================================================
-- 6. email_templates — modèles d'e-mail système (TABLE GLOBALE)
-- ============================================================
-- copro_id NULLABLE : NULL = modèle système global (cas des 6 lignes live)
create table public.email_templates (
  id                   uuid              not null default gen_random_uuid(),
  copro_id             uuid                       references public.copros(id) on delete cascade, -- NULL = système global
  code                 text              not null,
  name                 text              not null,
  description          text,
  subject              text              not null,
  body_html            text              not null,
  body_text            text,
  available_variables  jsonb             not null default '[]'::jsonb,
  is_active            boolean           not null default true,
  is_default           boolean           not null default false,
  created_at           timestamptz       not null default now(),
  updated_at           timestamptz       not null default now(),
  constraint pk_email_templates          primary key (id)
);
-- Un seul modèle par (code, portée copro)
create unique index uq_email_templates_code_scope
  on public.email_templates (code, copro_id);
-- Unicité du jeu système global (WHERE copro_id IS NULL)
create unique index uq_email_templates_code_system
  on public.email_templates (code)
  where copro_id is null;
create index idx_email_templates_copro
  on public.email_templates (copro_id);
-- Blueprint §1.11 : index (code)
create index idx_email_templates_code
  on public.email_templates (code);
create trigger trg_email_templates_updated
  before update on public.email_templates
  for each row execute function public.set_updated_at();

-- ============================================================
-- 7. payment_reminder_rules — règles de relance (paliers J+N)
-- ============================================================
create table public.payment_reminder_rules (
  id            uuid                   not null default gen_random_uuid(),
  copro_id      uuid                   not null references public.copros(id) on delete cascade,
  delay_days    int                    not null,
  channel       notification_channel   not null default 'email',
  template_id   uuid                            references public.email_templates(id) on delete set null,
  label         text,
  is_active     boolean                not null default true,
  created_by    uuid                            references public.profiles(id),
  created_at    timestamptz            not null default now(),
  updated_at    timestamptz            not null default now(),
  constraint pk_payment_reminder_rules  primary key (id),
  constraint ck_reminder_delay          check (delay_days > 0),
  constraint uq_reminder_rule_delay     unique (copro_id, delay_days)
);
create trigger trg_reminder_rules_updated
  before update on public.payment_reminder_rules
  for each row execute function public.set_updated_at();

-- ============================================================
-- 8. payment_reminders — instance de relance émise
-- ============================================================
create table public.payment_reminders (
  id                  uuid               not null default gen_random_uuid(),
  copro_id            uuid               not null references public.copros(id) on delete cascade,
  lot_id              uuid               not null references public.lots(id),
  owner_id            uuid                        references public.coproprietaires(id),
  reminder_rule_id    uuid                        references public.payment_reminder_rules(id),
  call_id             uuid                        references public.call_for_funds(id),
  call_line_id        uuid                        references public.call_for_funds_lines(id),
  unpaid_amount       numeric(14,2)      not null,
  oldest_due_date     date,
  days_overdue        int,
  delay_level         int,
  status              reminder_status    not null default 'pending',
  delivery_status     delivery_status,
  recipient_email     text,
  recipient_name      text,
  provider_message_id text,
  scheduled_at        timestamptz,
  sent_at             timestamptz,
  cancelled_at        timestamptz,
  cancelled_reason    text,
  content             text,
  created_by          uuid                        references public.profiles(id),
  created_at          timestamptz        not null default now(),
  updated_at          timestamptz        not null default now(),
  constraint pk_payment_reminders          primary key (id),
  constraint ck_reminder_unpaid            check (unpaid_amount > 0),
  constraint ck_reminder_overdue           check (days_overdue >= 0),
  constraint uq_reminder_lot_delay_active  unique (lot_id, delay_level, status)
);
-- Index partiel : relances en attente triées par date planifiée
create index idx_reminders_pending
  on public.payment_reminders (scheduled_at)
  where status = 'pending';
-- Blueprint §1.7 : index partiel (call_line_id) WHERE call_line_id IS NOT NULL
create index idx_reminders_call_line
  on public.payment_reminders (call_line_id)
  where call_line_id is not null;
create trigger trg_reminders_updated
  before update on public.payment_reminders
  for each row execute function public.set_updated_at();

-- ============================================================
-- 9. reminder_settings — pause des relances (singleton/copro)
-- ============================================================
-- PK = copro_id (singleton, pas d'id séparé — blueprint §1.8)
create table public.reminder_settings (
  copro_id      uuid        not null references public.copros(id) on delete cascade,
  is_paused     boolean     not null default false,
  paused_until  date,
  pause_reason  text,
  updated_at    timestamptz not null default now(),
  constraint pk_reminder_settings  primary key (copro_id)
);
-- Blueprint §1.8 : index partiel (copro_id) WHERE is_paused
create index idx_reminder_settings_paused
  on public.reminder_settings (copro_id)
  where is_paused;
create trigger trg_reminder_settings_updated
  before update on public.reminder_settings
  for each row execute function public.set_updated_at();

-- ============================================================
-- 10. budget_payment_schedules — échéancier paiement travaux (faux-mort câblé — CONSERVÉ)
-- ============================================================
-- Câblé front : usePaymentSchedule.ts + TravauxDetailModal.tsx + 2 pages dashboard
-- service_order_id : FK -> service_orders ajoutée en 0021
create table public.budget_payment_schedules (
  id                uuid                   not null default gen_random_uuid(),
  copro_id          uuid                   not null references public.copros(id) on delete cascade,
  budget_id         uuid                            references public.budgets(id) on delete cascade,
  service_order_id  uuid,                  -- FK service_orders ajoutée en 0021
  phase_label       text,
  due_date          date,
  amount            numeric(14,2),
  status            payment_phase_status   not null default 'pending',
  created_at        timestamptz            not null default now(),
  updated_at        timestamptz            not null default now(),
  constraint pk_budget_payment_schedules   primary key (id)
);
create trigger trg_bps_updated
  before update on public.budget_payment_schedules
  for each row execute function public.set_updated_at();

-- ============================================================
-- 11. alur_transfers — transfert/affectation du fonds ALUR (faux-mort câblé — CONSERVÉ)
-- ============================================================
-- Câblé front : useALURData.ts + vues v_alur_fund_summary + v_alur_transfers_history
create table public.alur_transfers (
  id             uuid                   not null default gen_random_uuid(),
  copro_id       uuid                   not null references public.copros(id) on delete cascade,
  budget_id      uuid                            references public.budgets(id) on delete set null,
  destination    transfer_destination   not null,
  amount         numeric(14,2)          not null,
  transfer_date  date,
  ledger_tx_id   uuid                            references public.ledger_transactions(id) on delete restrict,
  notes          text,
  created_at     timestamptz            not null default now(),
  updated_at     timestamptz            not null default now(),
  constraint pk_alur_transfers           primary key (id)
);
create trigger trg_alur_transfers_updated
  before update on public.alur_transfers
  for each row execute function public.set_updated_at();
