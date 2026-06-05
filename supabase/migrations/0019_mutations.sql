-- 0019_mutations.sql — mutations / état daté / opposition art.20 / procédures juridiques (05 §1)
-- Source : .planning/db-cible/05-mutations-etat-date.md §1.1-§1.4
-- Source : docs/superpowers/plans/2026-06-04-phase0-db-rebaseline.md Task 18 (renuméroté 0019 :
--          le plan dit 0018 mais 0018 = ag_notif déjà committé → ce fichier est 0019).
-- 5 tables : mutations, mutation_steps, etat_date_snapshots, mutation_oppositions, legal_proceedings
--
-- ENUMS : tous référencés par nom (définis en 0003_enums_domaines.sql) — aucun create type ici.
--   mutation_status, mutation_type, mutation_step_key, mutation_step_status, etat_date_type,
--   opposition_status, legal_proceeding_nature, legal_proceeding_status, repartition_category (transverse).
-- RLS : centralisée en 0026 (aucun enable/force/policy ici).
--
-- FK différée vers documents (table inexistante à 0019, créée en 0020) — ACTION ON DELETE IMPOSÉE
-- pour éviter toute contradiction NOT NULL + SET NULL :
--   etat_date_snapshots.document_id (nullable) -> documents ON DELETE SET NULL, ajoutée en 0020.
--
-- TRIGGERS + FONCTIONS DIFFÉRÉS au "lot fonctions" (option A — SCHÉMA PUR ; NON inclus ici,
-- fonctions PL/pgSQL inexistantes à ce stade) :
--   triggers différés :
--     tr_mutation_init_steps            (mutations, AFTER INSERT  — seed des 6 steps)
--     tr_mutation_copro_consistency     (mutations, BEFORE I/U    — lot.copro_id = copro_id ET period.copro_id = copro_id)
--     tr_mutation_step_copro_consistency(mutation_steps, BEFORE I/U — mutation.copro_id = copro_id)
--     tr_opposition_copro_consistency   (mutation_oppositions, BEFORE I/U — mutation.copro_id = copro_id ET lot.copro_id = copro_id)
--     tr_etat_date_immutable            (etat_date_snapshots, BEFORE U/D — RAISE : immutabilité légale art.5 décret 67-223, calquée GL)
--     tr_etat_date_copro_consistency    (etat_date_snapshots, BEFORE I/U — mutation.copro_id = copro_id ET lot.copro_id = copro_id)
--     tr_legal_copro_consistency        (legal_proceedings, BEFORE I/U — si lot_id renseigné → lot.copro_id = copro_id)
--   fonctions différées :
--     initialize_mutation_steps, upsert_mutation_step, generate_etat_date_payload,
--     create_etat_date_snapshot, validate_mutation, record_mutation_opposition,
--     settle_mutation_opposition, reconstitute_buyer_advances.
--   NOTE lot fonctions : generate_etat_date_payload DOIT émettre EXACTEMENT les clés du CHECK
--   (partie_1_sommes_dues_vendeur / partie_2_dues_par_syndicat / partie_3_charge_acquereur),
--   PAS les libellés de prose du blueprint §1.3, sinon ck_etat_date_payload_parts rejette l'INSERT.
--
-- Seul trigger inclus ici : set_updated_at (public.set_updated_at() existe depuis 0005),
-- posé uniquement sur les 4 tables porteuses d'une colonne updated_at
-- (mutations, mutation_steps, mutation_oppositions, legal_proceedings).
-- etat_date_snapshots est IMMUABLE : pas de updated_at → pas de trigger set_updated_at.

-- ============================================================
-- 1. mutations — dossier de vente/transfert d'un lot (05 §1.1)
-- ============================================================
-- Lot-centric (A2/A3) : la mutation change le PROPRIÉTAIRE du lot (lot_owners), jamais le solde 450.
-- notaire_id -> tiers(is_notary) (domaine 07) ; buyer_owner_id NULL jusqu'à validate_mutation.
-- SUPPRIMÉ vs live : buyer_name/email/is_company, notary_name/email/reference (→ rôle tiers).
create table public.mutations (
  id                uuid             not null default gen_random_uuid(),
  copro_id          uuid             not null references public.copros(id) on delete cascade,
  lot_id            uuid             not null references public.lots(id) on delete restrict,
  period_id         uuid                      references public.accounting_periods(id) on delete restrict,
  status            mutation_status  not null default 'draft',
  mutation_type     mutation_type    not null default 'sale',
  seller_owner_id   uuid             not null references public.coproprietaires(id) on delete restrict,
  buyer_owner_id    uuid                      references public.coproprietaires(id) on delete restrict,
  notaire_id        uuid                      references public.tiers(id) on delete set null,
  requested_at      timestamptz      not null default now(),
  signature_date    date,
  effective_date    date,
  cancelled_at      timestamptz,
  cancel_reason     text,
  created_by        uuid                      references public.profiles(id) on delete set null,
  notes             text,
  created_at        timestamptz      not null default now(),
  updated_at        timestamptz      not null default now(),
  constraint pk_mutations                    primary key (id),
  constraint ck_mut_dates                    check (signature_date is null or effective_date is null or effective_date >= signature_date),
  constraint ck_mut_cancelled                check ((status = 'cancelled') = (cancelled_at is not null)),
  constraint ck_mut_seller_buyer_distinct    check (buyer_owner_id is null or buyer_owner_id <> seller_owner_id)
);
-- Unique partiel : une seule mutation ACTIVE par lot (blueprint §1.1)
create unique index uq_mutations_active_lot
  on public.mutations (lot_id)
  where status in ('draft','pre_etat_generated','etat_generated','signed');
create index idx_mutations_copro_status
  on public.mutations (copro_id, status);
create index idx_mutations_seller
  on public.mutations (seller_owner_id);
create index idx_mutations_lot
  on public.mutations (lot_id);
create index idx_mutations_period
  on public.mutations (period_id);
create trigger trg_mutations_updated
  before update on public.mutations
  for each row execute function public.set_updated_at();

-- ============================================================
-- 2. mutation_steps — avancement du workflow (kanban) (05 §1.2)
-- ============================================================
-- A21 : mutations.status = vérité d'avancement ; cette table porte le détail kanban des 6 jalons.
-- copro_id dénormalisé (RLS) — cohérence imposée par tr_mutation_step_copro_consistency (différé).
create table public.mutation_steps (
  id            uuid                  not null default gen_random_uuid(),
  copro_id      uuid                  not null references public.copros(id) on delete cascade,
  mutation_id   uuid                  not null references public.mutations(id) on delete cascade,
  step_key      mutation_step_key     not null,
  status        mutation_step_status  not null default 'pending',
  completed_at  timestamptz,
  completed_by  uuid                           references public.profiles(id) on delete set null,
  payload       jsonb                          default '{}'::jsonb,
  created_at    timestamptz           not null default now(),
  updated_at    timestamptz           not null default now(),
  constraint pk_mutation_steps           primary key (id),
  constraint uq_mutation_step            unique (mutation_id, step_key),
  constraint ck_step_completed           check ((status = 'completed') = (completed_at is not null))
);
create index idx_mutation_steps_mutation
  on public.mutation_steps (mutation_id);
create index idx_mutation_steps_status
  on public.mutation_steps (mutation_id, status);
create trigger trg_mutation_steps_updated
  before update on public.mutation_steps
  for each row execute function public.set_updated_at();

-- ============================================================
-- 3. etat_date_snapshots — état daté en 3 parties légales (art.5 décret 67-223) (05 §1.3)
-- ============================================================
-- IMMUABLE comme une écriture du GL : pas de updated_at → pas de trigger set_updated_at
-- (l'immutabilité dure est posée par tr_etat_date_immutable, différé au lot fonctions).
-- payload NOT NULL SANS défaut : les 3 parties art.5 doivent être fournies à l'INSERT.
-- lot-centric : l'état daté porte sur LE LOT, figé même si le lot change de propriétaire.
create table public.etat_date_snapshots (
  id              uuid             not null default gen_random_uuid(),
  copro_id        uuid             not null references public.copros(id) on delete cascade,
  mutation_id     uuid             not null references public.mutations(id) on delete cascade,
  lot_id          uuid             not null references public.lots(id) on delete restrict,
  snapshot_type   etat_date_type   not null,
  effective_date  date             not null,
  generated_at    timestamptz      not null default now(),
  generated_by    uuid                      references public.profiles(id) on delete set null,
  payload         jsonb            not null,
  document_id     uuid,            -- FK documents ON DELETE SET NULL, ajoutée en 0020
  created_at      timestamptz      not null default now(),
  constraint pk_etat_date_snapshots          primary key (id),
  constraint ck_etat_date_payload_parts      check (
    payload ? 'partie_1_sommes_dues_vendeur'
    and payload ? 'partie_2_dues_par_syndicat'
    and payload ? 'partie_3_charge_acquereur'
  )
);
-- Non unique (historisation par design : pré-état + état daté définitif)
create index idx_etat_date_mutation
  on public.etat_date_snapshots (copro_id, mutation_id, snapshot_type);
create index idx_etat_date_lot
  on public.etat_date_snapshots (lot_id);

-- ============================================================
-- 4. mutation_oppositions — avis de mutation + opposition art.20 (loi 65-557) (05 §1.3 bis)
-- ============================================================
-- Recouvrement légal de la vente : opposition au versement entre les mains du notaire (15 j),
-- versement notaire ≤ 3 mois qui apure le 450 exigible DU LOT (lot-centric A2).
create table public.mutation_oppositions (
  id                     uuid               not null default gen_random_uuid(),
  copro_id               uuid               not null references public.copros(id) on delete cascade,
  mutation_id            uuid               not null references public.mutations(id) on delete cascade,
  lot_id                 uuid               not null references public.lots(id) on delete restrict,
  notaire_id             uuid                        references public.tiers(id) on delete set null,
  avis_mutation_date     date               not null,
  opposition_deadline    date               not null,
  opposition_date        date,
  amount_opposed         numeric(14,2)      not null default 0,
  causes                 jsonb              not null default '[]'::jsonb,
  status                 opposition_status  not null default 'pending',
  notaire_payment_date   date,
  paid_amount            numeric(14,2),
  ledger_transaction_id  uuid                        references public.ledger_transactions(id) on delete restrict,
  notes                  text,
  created_at             timestamptz        not null default now(),
  updated_at             timestamptz        not null default now(),
  constraint pk_mutation_oppositions     primary key (id),
  constraint uq_opposition_mutation      unique (mutation_id),
  constraint ck_opp_amount               check (amount_opposed >= 0),
  constraint ck_opp_deadline             check (opposition_deadline = avis_mutation_date + 15),
  constraint ck_opp_opposed_in_time      check (opposition_date is null or opposition_date <= opposition_deadline),
  constraint ck_opp_paid                 check (
    status <> 'paid'
    or (notaire_payment_date is not null and paid_amount is not null and ledger_transaction_id is not null)
  )
);
create index idx_opposition_copro
  on public.mutation_oppositions (copro_id);
create index idx_opposition_lot
  on public.mutation_oppositions (lot_id);
create index idx_opposition_status
  on public.mutation_oppositions (copro_id, status);
create trigger trg_mutation_oppositions_updated
  before update on public.mutation_oppositions
  for each row execute function public.set_updated_at();

-- ============================================================
-- 5. legal_proceedings — procédures juridiques / contentieux / recouvrement (05 §1.4)
-- ============================================================
-- lot-centric + masquage RGPD A14 (vue v_legal_proceedings_copro côté copropriétaire, créée ailleurs).
-- nature_filter = repartition_category (transverse) ; mapping code→sous-compte 450 = source unique 02 §1.1.
create table public.legal_proceedings (
  id               uuid                       not null default gen_random_uuid(),
  copro_id         uuid                       not null references public.copros(id) on delete cascade,
  title            text                       not null,
  nature           legal_proceeding_nature    not null,
  status           legal_proceeding_status    not null default 'pending',
  lot_id           uuid                                references public.lots(id) on delete set null,
  debtor_owner_id  uuid                                references public.coproprietaires(id) on delete set null,
  nature_filter    repartition_category,
  opposing_party   text,
  amount_at_stake  numeric(14,2),
  start_date       date,
  end_date         date,
  court            text,
  lawyer           text,
  notes            text,
  created_at       timestamptz                not null default now(),
  updated_at       timestamptz                not null default now(),
  constraint pk_legal_proceedings        primary key (id),
  constraint ck_legal_amount             check (amount_at_stake is null or amount_at_stake >= 0),
  constraint ck_legal_dates              check (end_date is null or start_date is null or end_date >= start_date),
  constraint ck_legal_recovery_target    check (nature <> 'recovery' or lot_id is not null)
);
create index idx_legal_copro
  on public.legal_proceedings (copro_id);
-- Index partiel : recouvrements lot-centric (blueprint §1.4)
create index idx_legal_lot
  on public.legal_proceedings (lot_id)
  where lot_id is not null;
create index idx_legal_status
  on public.legal_proceedings (copro_id, status);
create trigger trg_legal_proceedings_updated
  before update on public.legal_proceedings
  for each row execute function public.set_updated_at();