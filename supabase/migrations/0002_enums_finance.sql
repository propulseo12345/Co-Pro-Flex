-- 0002_enums_finance.sql — enums du grand livre (02 §2, ENUMS §6.1)
-- Source : .planning/db-cible/ENUMS.md §6.1 + §4 + 02-finance-grand-livre.md §2
-- tiers_type : ABANDONNÉ (rôles portés par flags booléens is_supplier/is_provider/is_notary, ENUMS §6.1)

-- §4 — conservé à l'identique (porté ici car finance le consomme en premier)
create type account_type as enum ('asset','liability','income','expense','equity');

-- §6.1 — promotions CHECK → ENUM (nouveaux)
create type ledger_source_type as enum (
  'budget','call_for_funds','payment','supplier_invoice','supplier_payment',
  'bank_movement','transfer','od','opening','closing','manual','opening_balance',
  'opening_onboarding','reclassification','result_allocation','budget_expense',
  'mutation','collective_loan'
);

create type ledger_tx_status as enum ('draft','posted');

create type ledger_direction as enum ('debit','credit');

create type account_receivable_nature as enum ('current','works','alur','loan','advance','doubtful');

create type cutoff_kind as enum ('CAP','CCA','PCA','PAR');

create type treasury_advance_type as enum ('permanent','special','work_fund');

create type collective_loan_status as enum ('active','repaid','cancelled');

-- §1.3 — period_status rationalisé (5→3 : purge locked/rejected, open/closed/approved = jalons distincts)
create type period_status as enum ('open','closed','approved');

-- §4 (conservés à l'identique) — utilisés par les tables du domaine finance
create type payment_method as enum ('cash','check','transfer','card','direct_debit','other');

create type payment_status as enum ('recorded','reconciled','reversed');

create type bank_movement_status as enum ('unmatched','matched','ignored');

create type bank_match_target_type as enum ('payment','supplier_payment','other');

create type expense_status as enum ('draft','pending_validation','validated','rejected');

create type budget_type as enum ('current','works','alur');

-- §1.8 — budget_status réduit 7→5 (−draft_from_ag / −pending_approval)
create type budget_status as enum ('draft','submitted','validated','rejected','closed');

create type call_for_funds_status as enum ('draft','issued','partially_paid','paid','cancelled');

create type call_line_status as enum ('unpaid','partial','paid');

create type supplier_invoice_status as enum ('draft','posted','paid','cancelled');

-- §4 (faux-morts câblés, tables CONSERVÉES : alur_transfers + budget_payment_schedules)
create type transfer_destination as enum ('works','reserve','operating','other');

create type payment_phase_status as enum ('pending','called','paid','overdue');
