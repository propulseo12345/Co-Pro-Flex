-- 0012_accounts.sql — plan de comptes par copropriete (02 §1.1)
-- Source : .planning/db-cible/02-finance-grand-livre.md §1.1
-- nature (45x uniquement), is_postable, sans parent_id. CHECK ck_nature_only_on_45x.
-- Rattache R9/R10/R17 (soldes reels derives du plan comptable).

create table public.accounts (
  id              uuid                       not null default gen_random_uuid(),
  copro_id        uuid                       not null references public.copros(id) on delete restrict,
  code            text                       not null,
  name            text                       not null,
  account_type    account_type               not null,
  nature          account_receivable_nature,
  is_active       boolean                    not null default true,
  is_system       boolean                    not null default false,
  is_postable     boolean                    not null default true,
  description     text,
  iban            text,
  bic             text,
  bank_name       text,
  initial_balance numeric(14,2)              not null default 0,
  created_at      timestamptz                not null default now(),
  updated_at      timestamptz                not null default now(),
  constraint pk_accounts primary key (id),
  constraint uq_accounts_copro_code unique (copro_id, code),
  constraint ck_nature_only_on_45x check (nature is null or code like '45%')
);
create index idx_accounts_copro   on public.accounts (copro_id);
create index idx_accounts_class   on public.accounts (copro_id, left(code, 1));
create index idx_accounts_type    on public.accounts (copro_id, account_type);
create index idx_accounts_nature  on public.accounts (copro_id, nature) where nature is not null;
create trigger trg_accounts_updated before update on public.accounts
  for each row execute function public.set_updated_at();
