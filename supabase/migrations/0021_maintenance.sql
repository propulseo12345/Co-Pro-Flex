-- 0021_maintenance.sql — maintenance / contrats / OS / carnet / factures fournisseur / assurance / PPT (07 §1.2-§1.10)
-- Source : .planning/db-cible/07-maintenance-tiers.md §1.2-§1.10
-- Source : docs/superpowers/plans/2026-06-04-phase0-db-rebaseline.md Task 20 (renuméroté 0021, décalage +1).
-- 9 tables : contracts, service_orders, service_order_events, logbook_entries,
--            supplier_invoices, supplier_invoice_lines, supplier_payments,
--            insurance_policies, planned_works.
--
-- DÉJÀ CRÉÉES AILLEURS (NON recréées ici) :
--   tiers        -> 0015 (07 §1.1)
--   work_domain  -> 0004 (table de référence 07 §1.12)
--
-- ENUMS : tous référencés par nom (définis en 0002_enums_finance.sql / 0003_enums_domaines.sql) — aucun create type ici.
--   contract_status, intervention_frequency, service_order_type, service_order_origin,
--   service_order_status, service_order_event_type, priority_level, intervention_category,
--   logbook_entry_type, logbook_status, supplier_invoice_status, payment_method,
--   insurance_sub_type, planned_work_status.
--
-- RLS : centralisée en 0026 (aucun enable/force/policy ici).
--
-- VUE DIFFÉRÉE (NON créée ici) : tiers_directory (07 §1.13) -> lot vues/RLS.
--
-- FK CIRCULAIRE (résolue par ALTER) :
--   service_orders.logbook_entry_id -> logbook_entries(id) ON DELETE SET NULL  (les deux nullable)
--   logbook_entries.service_order_id -> service_orders(id) ON DELETE SET NULL
--   service_orders est créée d'abord avec la colonne logbook_entry_id SANS sa FK inline ;
--   logbook_entries est créée ensuite (sa FK service_order_id pointe service_orders, déjà présente) ;
--   PUIS la FK fk_so_logbook est ajoutée par ALTER (cf. après logbook_entries).
--
-- FK RÉTROACTIVE (vers une table semée en 0016) :
--   budget_payment_schedules.service_order_id -> service_orders(id) ON DELETE SET NULL
--   (colonne service_order_id semée nullable en 0016 ; FK ajoutée ici après service_orders).
--
-- TRIGGERS + FONCTIONS DIFFÉRÉS au "lot fonctions" (option A — SCHÉMA PUR ; NON inclus ici,
-- fonctions PL/pgSQL inexistantes à ce stade) :
--   triggers métier différés :
--     trg_update_provider_stats               (logbook_entries AFTER I/U — maj tiers.interventions_count / last_intervention_at)
--     update_contract_status_auto             (contracts BEFORE I/U — draft->active->to_renew->expired selon end_date/notice_months)
--     validate_supplier_invoice_total         (supplier_invoices CONSTRAINT DEFERRED — Σ lignes = total_amount ±0,01)
--     validate_supplier_payment               (supplier_payments BEFORE — anti-surpaiement + statut posted/paid + auto copro_id)
--     update_supplier_invoice_status_after_payment (supplier_payments AFTER — facture -> paid si soldée)
--     check_contract_tiers_copro              (contracts BEFORE I/U — tiers.copro_id = copro_id)
--     check_so_copro_consistency              (service_orders BEFORE I/U — tiers/contract/lot même copro)
--     check_invoice_copro_consistency         (supplier_invoices BEFORE I/U — tiers/period même copro)
--     check_insurance_contract_copro          (insurance_policies BEFORE I/U — contract.copro_id = copro_id ET domaine = 'assurance')
--     check_tiers_domain_ids                  (tiers BEFORE I/U — chaque domain_ids[] existe dans work_domain)
--     generate_service_order_number           (séquence par copro pour order_number)
--   fonctions différées : voir 07 §5 (post_supplier_invoice, post_supplier_payment, update_service_order_status, etc.).
--
-- Seul trigger inclus ici : set_updated_at (public.set_updated_at() existe depuis 0005),
-- posé uniquement sur les tables porteuses d'une colonne updated_at :
--   contracts, service_orders, logbook_entries, supplier_invoices, insurance_policies, planned_works.
-- PAS de updated_at (donc PAS de trigger) sur :
--   service_order_events (append-only, created_at seul),
--   supplier_invoice_lines (terse §1.7, created_at seul),
--   supplier_payments (terse §1.8, created_at seul).

-- ============================================================
-- 1. contracts — contrat prestataire / fournisseur (07 §1.2)
-- ============================================================
-- tiers_id / domain_id en RESTRICT (un tiers sous contrat / un domaine référencé ne se supprime pas silencieusement).
-- "contrat d'assurance" = domain_id pointant work_domain.slug = 'assurance' (testé par insurance_policies, §1.9).
create table public.contracts (
  id                          uuid                   not null default gen_random_uuid(),
  copro_id                    uuid                   not null references public.copros(id) on delete cascade,
  tiers_id                    uuid                   not null references public.tiers(id) on delete restrict,
  domain_id                   uuid                   not null references public.work_domain(id) on delete restrict,
  label                       text                   not null,
  reference                   text,
  start_date                  date                   not null,
  end_date                    date,
  renewal_date                date,
  tacit_renewal               boolean                not null default true,
  notice_months               int                    not null default 3,
  annual_amount               numeric(14,2),
  billing_frequency           intervention_frequency,
  planned_frequency           intervention_frequency,
  planned_day_of_month        int,
  auto_generate_orders        boolean                not null default false,
  next_planned_intervention   date,
  is_regulatory               boolean                not null default false,
  status                      contract_status        not null default 'draft',
  terminated_at               timestamptz,
  termination_reason          text,
  observations                text,
  created_by                  uuid                   references public.profiles(id) on delete set null,
  created_at                  timestamptz            not null default now(),
  updated_at                  timestamptz            not null default now(),
  constraint pk_contracts                primary key (id),
  constraint ck_contract_dates           check (end_date is null or end_date >= start_date),
  constraint ck_contract_day             check (planned_day_of_month is null or planned_day_of_month between 1 and 31)
);
create index idx_contracts_copro
  on public.contracts (copro_id);
create index idx_contracts_copro_end
  on public.contracts (copro_id, end_date);
create index idx_contracts_tiers
  on public.contracts (tiers_id);
create index idx_contracts_copro_status
  on public.contracts (copro_id, status);
create trigger trg_contracts_updated
  before update on public.contracts
  for each row execute function public.set_updated_at();

-- ============================================================
-- 2. service_orders — ordre de service (machine à états) (07 §1.3)
-- ============================================================
-- order_number rempli par generate_service_order_number (différé) : NN, PAS de défaut.
-- logbook_entry_id : colonne SANS FK inline (FK circulaire résolue par ALTER après logbook_entries).
-- PAS de colonne supplier_invoice_id (SUPPRIMÉE : sens unique retenu = supplier_invoices.service_order_id).
-- ~10 jalons timestamptz nullable alignés sur les transitions de service_order_status (schéma cible A1).
create table public.service_orders (
  id                    uuid                  not null default gen_random_uuid(),
  copro_id              uuid                  not null references public.copros(id) on delete cascade,
  order_number          text                  not null,
  tiers_id              uuid                  not null references public.tiers(id) on delete restrict,
  contract_id           uuid                  references public.contracts(id) on delete set null,
  building_id           uuid                  references public.buildings(id) on delete set null,
  lot_id                uuid                  references public.lots(id) on delete set null,
  logbook_entry_id      uuid,                 -- FK -> logbook_entries ajoutée par ALTER (fk_so_logbook, FK circulaire)
  order_type            service_order_type    not null default 'classique',
  origin                service_order_origin  not null default 'syndic',
  urgency               priority_level        not null default 'normal',
  is_art18_emergency    boolean               not null default false,
  emergency_ceiling     numeric(14,2),
  title                 text                  not null,
  description           text,
  estimated_amount      numeric(14,2),
  quoted_amount         numeric(14,2),
  actual_amount         numeric(14,2),
  status                service_order_status  not null default 'draft',
  refusal_reason        text,
  sent_at               timestamptz,
  acknowledged_at       timestamptz,
  quoted_at             timestamptz,
  validated_at          timestamptz,
  scheduled_at          timestamptz,
  started_at            timestamptz,
  completed_at          timestamptz,
  closed_at             timestamptz,
  refused_at            timestamptz,
  cancelled_at          timestamptz,
  created_by            uuid                  references public.profiles(id) on delete set null,
  created_at            timestamptz           not null default now(),
  updated_at            timestamptz           not null default now(),
  constraint pk_service_orders          primary key (id),
  constraint uq_service_order_number    unique (copro_id, order_number)
);
create index idx_service_orders_copro
  on public.service_orders (copro_id);
create index idx_service_orders_copro_created
  on public.service_orders (copro_id, created_at);
create index idx_service_orders_tiers
  on public.service_orders (tiers_id);
create index idx_service_orders_copro_status
  on public.service_orders (copro_id, status);
create trigger trg_service_orders_updated
  before update on public.service_orders
  for each row execute function public.set_updated_at();

-- FK rétroactive : budget_payment_schedules.service_order_id -> service_orders (03 §1.10 / 07)
-- Colonne service_order_id semée nullable en 0016 ; service_orders vient d'être créée.
alter table public.budget_payment_schedules
  add constraint fk_bps_service_order
  foreign key (service_order_id)
  references public.service_orders(id)
  on delete set null;

-- ============================================================
-- 3. service_order_events — audit append-only de la machine à états (07 §1.4)
-- ============================================================
-- Immuable : created_at seul, PAS de updated_at -> PAS de trigger set_updated_at.
-- (l'interdiction UPDATE/DELETE est portée par la RLS, lot 0026.)
create table public.service_order_events (
  id                 uuid                       not null default gen_random_uuid(),
  copro_id           uuid                       not null references public.copros(id) on delete cascade,
  service_order_id   uuid                       not null references public.service_orders(id) on delete cascade,
  event_type         service_order_event_type   not null,
  from_status        service_order_status,
  to_status          service_order_status,
  payload            jsonb,
  comment            text,
  created_by         uuid                       references public.profiles(id) on delete set null,
  created_at         timestamptz                not null default now(),
  constraint pk_service_order_events     primary key (id)
);
create index idx_service_order_events_so
  on public.service_order_events (service_order_id, created_at);

-- ============================================================
-- 4. logbook_entries — carnet d'entretien (07 §1.5)
-- ============================================================
-- domain_id en RESTRICT (référentiel work_domain) ; toutes les autres FK optionnelles en SET NULL.
-- service_order_id -> service_orders : cible déjà créée (FK directe OK, pas de cycle de ce côté).
create table public.logbook_entries (
  id                       uuid                    not null default gen_random_uuid(),
  copro_id                 uuid                    not null references public.copros(id) on delete cascade,
  building_id              uuid                    references public.buildings(id) on delete set null,
  tiers_id                 uuid                    references public.tiers(id) on delete set null,
  contract_id              uuid                    references public.contracts(id) on delete set null,
  service_order_id         uuid                    references public.service_orders(id) on delete set null,
  document_id              uuid                    references public.documents(id) on delete set null,
  entry_type               logbook_entry_type      not null,
  category                 intervention_category   not null default 'courante',
  title                    text                    not null,
  description              text,
  equipment_concerned      text,
  provider_name_snapshot   text,
  domain_id                uuid                    references public.work_domain(id) on delete restrict,
  budget_category          text,
  happened_at              date                    not null,
  completed_at             date,
  next_due_at              date,
  cost                     numeric(14,2),
  status                   logbook_status          not null default 'planifiee',
  comments                 text,
  created_by               uuid                    references public.profiles(id) on delete set null,
  created_at               timestamptz             not null default now(),
  updated_at               timestamptz             not null default now(),
  constraint pk_logbook_entries          primary key (id)
);
create index idx_logbook_entries_copro
  on public.logbook_entries (copro_id);
create index idx_logbook_entries_copro_happened
  on public.logbook_entries (copro_id, happened_at);
create index idx_logbook_entries_tiers
  on public.logbook_entries (tiers_id);
create index idx_logbook_entries_so
  on public.logbook_entries (service_order_id);
create trigger trg_logbook_entries_updated
  before update on public.logbook_entries
  for each row execute function public.set_updated_at();

-- FK circulaire résolue : service_orders.logbook_entry_id -> logbook_entries (07 §1.3)
-- service_orders existe (colonne posée sans FK) ; logbook_entries vient d'être créée -> on pose la FK.
alter table public.service_orders
  add constraint fk_so_logbook
  foreign key (logbook_entry_id)
  references public.logbook_entries(id)
  on delete set null;

-- ============================================================
-- 5. supplier_invoices — facture fournisseur (chaîne canonique GL) (07 §1.6)
-- ============================================================
-- period_id / tiers_id / ledger_tx_id en RESTRICT (objets comptables, pas de cascade silencieuse).
-- service_order_id : vraie FK (sens unique OS<->facture retenu), nullable, SET NULL.
create table public.supplier_invoices (
  id                 uuid                     not null default gen_random_uuid(),
  copro_id           uuid                     not null references public.copros(id) on delete cascade,
  period_id          uuid                     not null references public.accounting_periods(id) on delete restrict,
  tiers_id           uuid                     not null references public.tiers(id) on delete restrict,
  service_order_id   uuid                     references public.service_orders(id) on delete set null,
  invoice_number     text                     not null,
  invoice_date       date                     not null,
  due_date           date,
  label              text                     not null,
  total_amount       numeric(14,2)            not null,
  montant_ht         numeric(14,2),
  montant_tva        numeric(14,2),
  taux_tva           numeric(5,2),
  status             supplier_invoice_status  not null default 'draft',
  document_id        uuid                     references public.documents(id) on delete set null,
  ledger_tx_id       uuid                     references public.ledger_transactions(id) on delete restrict,
  created_by         uuid                     references public.profiles(id) on delete set null,
  created_at         timestamptz              not null default now(),
  updated_at         timestamptz              not null default now(),
  constraint pk_supplier_invoices        primary key (id),
  constraint ck_supplier_invoice_total   check (total_amount > 0),
  constraint uq_supplier_invoice_num     unique (copro_id, tiers_id, invoice_number)
);
create index idx_supplier_invoices_copro_period
  on public.supplier_invoices (copro_id, period_id);
create index idx_supplier_invoices_copro_status
  on public.supplier_invoices (copro_id, status);
create index idx_supplier_invoices_tiers
  on public.supplier_invoices (tiers_id);
create index idx_supplier_invoices_so
  on public.supplier_invoices (service_order_id);
create trigger trg_supplier_invoices_updated
  before update on public.supplier_invoices
  for each row execute function public.set_updated_at();

-- ============================================================
-- 6. supplier_invoice_lines — ligne de ventilation par compte/clé (07 §1.7)
-- ============================================================
-- account_id en RESTRICT (compte de charge 6xx, NN) ; repartition_key_id en RESTRICT ;
-- budget_line_id optionnel en SET NULL. created_at seul (terse §1.7) -> PAS de updated_at, PAS de trigger.
create table public.supplier_invoice_lines (
  id                   uuid              not null default gen_random_uuid(),
  copro_id             uuid              not null references public.copros(id) on delete cascade,
  invoice_id           uuid              not null references public.supplier_invoices(id) on delete cascade,
  account_id           uuid              not null references public.accounts(id) on delete restrict,
  repartition_key_id   uuid              references public.repartition_keys(id) on delete restrict,
  budget_line_id       uuid              references public.budget_lines(id) on delete set null,
  label                text              not null,
  amount               numeric(14,2)     not null,
  amount_ht            numeric(14,2),
  amount_tva           numeric(14,2),
  taux_pct             numeric(5,2),
  created_at           timestamptz       not null default now(),
  constraint pk_supplier_invoice_lines   primary key (id),
  constraint ck_line_amount              check (amount > 0)
);
create index idx_supplier_invoice_lines_invoice
  on public.supplier_invoice_lines (invoice_id);

-- ============================================================
-- 7. supplier_payments — paiement fournisseur (idempotent) (07 §1.8)
-- ============================================================
-- period_id / ledger_tx_id en RESTRICT ; supplier_invoice_id en CASCADE.
-- created_at seul (terse §1.8) -> PAS de updated_at, PAS de trigger.
create table public.supplier_payments (
  id                    uuid             not null default gen_random_uuid(),
  copro_id              uuid             not null references public.copros(id) on delete cascade,
  period_id             uuid             not null references public.accounting_periods(id) on delete restrict,
  supplier_invoice_id   uuid             not null references public.supplier_invoices(id) on delete cascade,
  payment_date          date             not null,
  amount                numeric(14,2)    not null,
  method                payment_method   not null,
  reference             text,
  ledger_tx_id          uuid             references public.ledger_transactions(id) on delete restrict,
  idempotency_key       text,
  created_by            uuid             references public.profiles(id) on delete set null,
  created_at            timestamptz      not null default now(),
  constraint pk_supplier_payments        primary key (id),
  constraint ck_payment_amount           check (amount > 0)
);
-- Unique partiel : replay idempotent par copro (clé non NULL seulement)
create unique index ux_supplier_payments_idempotency
  on public.supplier_payments (copro_id, idempotency_key)
  where idempotency_key is not null;
create index idx_supplier_payments_invoice
  on public.supplier_payments (supplier_invoice_id);
create index idx_supplier_payments_copro_period
  on public.supplier_payments (copro_id, period_id);

-- ============================================================
-- 8. insurance_policies — extension 1-N d'un contrat assurance (07 §1.9)
-- ============================================================
-- contract_id NN en CASCADE (la police n'existe pas sans son contrat) ; copro_id en CASCADE.
-- Intégrité "le contrat est bien un contrat assurance" portée par check_insurance_contract_copro (différé).
create table public.insurance_policies (
  id                     uuid                 not null default gen_random_uuid(),
  copro_id               uuid                 not null references public.copros(id) on delete cascade,
  contract_id            uuid                 not null references public.contracts(id) on delete cascade,
  sub_type               insurance_sub_type   not null,
  policy_number          text,
  insurer_name           text,
  annual_premium         numeric(14,2),
  deductible             numeric(14,2),
  guarantees             text[]               not null default '{}'::text[],
  related_works          text,
  works_reception_date   date,
  observations           text,
  created_at             timestamptz          not null default now(),
  updated_at             timestamptz          not null default now(),
  constraint pk_insurance_policies       primary key (id)
);
create index idx_insurance_policies_copro
  on public.insurance_policies (copro_id);
create index idx_insurance_policies_contract
  on public.insurance_policies (contract_id);
create index idx_insurance_policies_copro_subtype
  on public.insurance_policies (copro_id, sub_type);
create trigger trg_insurance_policies_updated
  before update on public.insurance_policies
  for each row execute function public.set_updated_at();

-- ============================================================
-- 9. planned_works — travaux planifiés / PPT (07 §1.10)
-- ============================================================
-- Couche de PLANIFICATION pluriannuelle (PPT), distincte de service_orders (exécution) et budget_lines (engagement).
-- domain_id NN en RESTRICT ; liens AG (ag_id/resolution_id) en SET NULL (liaison 07 -> domaine AG).
create table public.planned_works (
  id                 uuid                  not null default gen_random_uuid(),
  copro_id           uuid                  not null references public.copros(id) on delete cascade,
  domain_id          uuid                  not null references public.work_domain(id) on delete restrict,
  budget_line_id     uuid                  references public.budget_lines(id) on delete set null,
  ag_id              uuid                  references public.ag_meetings(id) on delete set null,
  resolution_id      uuid                  references public.ag_resolutions(id) on delete set null,
  label              text                  not null,
  description        text,
  planned_date       date,
  vote_date          date,
  completion_date    date,
  estimated_amount   numeric(14,2),
  voted_amount       numeric(14,2),
  actual_amount      numeric(14,2),
  status             planned_work_status   not null default 'identified',
  priority           priority_level,
  from_ppt           boolean               not null default false,
  ppt_year           int,
  observations       text,
  created_by         uuid                  references public.profiles(id) on delete set null,
  created_at         timestamptz           not null default now(),
  updated_at         timestamptz           not null default now(),
  constraint pk_planned_works            primary key (id)
);
create index idx_planned_works_copro
  on public.planned_works (copro_id);
create index idx_planned_works_copro_status
  on public.planned_works (copro_id, status);
-- Index partiel : travaux issus du PPT (filtre annuaire pluriannuel)
create index idx_planned_works_ppt
  on public.planned_works (copro_id)
  where from_ppt;
create trigger trg_planned_works_updated
  before update on public.planned_works
  for each row execute function public.set_updated_at();