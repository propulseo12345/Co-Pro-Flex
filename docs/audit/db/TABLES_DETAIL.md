# TABLES_DETAIL.md
## Détail des Tables Supabase CoProFlex

**Date audit**: 2026-01-28

---

## 1. CORE / MULTI-TENANT

### copros
```sql
-- Copropriétés (entité racine multi-tenant)
id              uuid PRIMARY KEY DEFAULT uuid_generate_v4()
name            text NOT NULL
address         text
postal_code     text
city            text
siret           text
rcs             text
legal_form      text
capital         numeric
manager_name    text
manager_email   text
manager_phone   text
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()

-- RLS: user_has_copro_access(id), user_is_copro_manager(id)
```

### buildings
```sql
-- Bâtiments d'une copropriété
id              uuid PRIMARY KEY
copro_id        uuid REFERENCES copros(id)
name            text NOT NULL
address         text
floors_count    integer
lots_count      integer
created_at      timestamptz

-- RLS: user_has_copro_access(copro_id)
```

### lots
```sql
-- Lots (appartements, parkings, caves, etc.)
id                      uuid PRIMARY KEY
copro_id                uuid REFERENCES copros(id)
building_id             uuid REFERENCES buildings(id)
ref                     text NOT NULL  -- ex: "A-101"
type                    lot_type       -- enum: appartement, parking, cave, commerce, bureau, autre
floor                   integer
surface                 numeric
tantiemes_generaux      integer NOT NULL
tantiemes_escalier      integer
tantiemes_ascenseur     integer
tantiemes_chauffage     integer
created_at              timestamptz

-- RLS: user_has_copro_access(copro_id)
```

### coproprietaires
```sql
-- Personnes physiques ou morales propriétaires
id              uuid PRIMARY KEY
copro_id        uuid REFERENCES copros(id)
user_id         uuid REFERENCES auth.users(id)  -- lien optionnel
is_company      boolean DEFAULT false
company_name    text
civility        text
first_name      text
last_name       text
email           text
phone           text
mobile          text
address_line1   text
address_line2   text
postal_code     text
city            text
country         text DEFAULT 'France'
created_at      timestamptz
updated_at      timestamptz

-- RLS: user_is_copro_manager(copro_id) OR user_id = auth.uid()
```

### lot_owners
```sql
-- Historique de propriété (qui possède quel lot, quand)
id                  uuid PRIMARY KEY
copro_id            uuid REFERENCES copros(id)
lot_id              uuid REFERENCES lots(id)
coproprietaire_id   uuid REFERENCES coproprietaires(id)
start_date          date NOT NULL
end_date            date  -- NULL = propriétaire actuel
ownership_type      text  -- 'pleine_propriete', 'usufruit', 'nue_propriete'
share_numerator     integer DEFAULT 1
share_denominator   integer DEFAULT 1
created_at          timestamptz

-- RLS: user_is_copro_manager(copro_id)
```

### profiles
```sql
-- Miroir de auth.users avec infos supplémentaires
id              uuid PRIMARY KEY REFERENCES auth.users(id)
email           text
full_name       text
avatar_url      text
phone           text
created_at      timestamptz
updated_at      timestamptz

-- Trigger: handle_new_user() copie depuis auth.users
-- RLS: auth.uid() = id
```

### memberships
```sql
-- Appartenance utilisateur ↔ copropriété
id              uuid PRIMARY KEY
user_id         uuid REFERENCES auth.users(id)
copro_id        uuid REFERENCES copros(id)
role            membership_role  -- 'manager', 'council', 'owner', 'tenant'
is_active       boolean DEFAULT true
created_at      timestamptz

UNIQUE(user_id, copro_id)

-- RLS: user_is_copro_manager(copro_id)
```

---

## 2. ASSEMBLÉES GÉNÉRALES (AG)

### ag_meetings
```sql
id                  uuid PRIMARY KEY
copro_id            uuid REFERENCES copros(id)
title               text NOT NULL
meeting_type        ag_type        -- 'ordinaire', 'extraordinaire', 'mixte'
meeting_date        timestamptz NOT NULL
location            text
status              ag_status      -- 'draft', 'convoked', 'in_progress', 'closed', 'cancelled'
convocation_date    timestamptz
quorum_reached      boolean
total_tantiemes     integer
present_tantiemes   integer
created_by          uuid REFERENCES auth.users(id)
created_at          timestamptz
updated_at          timestamptz

-- RLS: Managers full access, members see non-draft only
```

### ag_resolutions
```sql
id                  uuid PRIMARY KEY
ag_id               uuid REFERENCES ag_meetings(id)
copro_id            uuid REFERENCES copros(id)
resolution_number   integer NOT NULL
title               text NOT NULL
description         text
resolution_type     resolution_type  -- 'standard', 'custom', 'budget', 'works'
majority_type       majority_type    -- 'article_24', 'article_25', 'article_25_1', 'article_26', 'unanimity'
status              resolution_status -- 'pending', 'adopted', 'rejected', 'deferred'
tantieme_pour       integer DEFAULT 0
tantieme_contre     integer DEFAULT 0
tantieme_abstention integer DEFAULT 0
result_details      jsonb
sort_order          integer
created_at          timestamptz

UNIQUE(ag_id, resolution_number)
```

### ag_votes
```sql
id                  uuid PRIMARY KEY
resolution_id       uuid REFERENCES ag_resolutions(id)
copro_id            uuid REFERENCES copros(id)
lot_id              uuid REFERENCES lots(id)
coproprietaire_id   uuid REFERENCES coproprietaires(id)
vote_value          vote_value      -- 'pour', 'contre', 'abstention'
tantiemes           integer NOT NULL
vote_mode           vote_mode       -- 'present', 'proxy', 'correspondence'
proxy_holder_id     uuid
recorded_by         uuid REFERENCES auth.users(id)
recorded_at         timestamptz

UNIQUE(resolution_id, lot_id)

-- Trigger: trg_ag_vote_check_duplicate empêche double vote
```

### ag_attendance
```sql
id                  uuid PRIMARY KEY
ag_id               uuid REFERENCES ag_meetings(id)
copro_id            uuid REFERENCES copros(id)
coproprietaire_id   uuid REFERENCES coproprietaires(id)
lot_id              uuid REFERENCES lots(id)
attendance_type     attendance_type  -- 'present', 'proxy_given', 'proxy_received', 'absent', 'correspondence'
proxy_to_id         uuid
arrival_time        timestamptz
departure_time      timestamptz
signature_data      text  -- Base64 signature
tantiemes           integer  -- Auto-calculé par trigger
created_at          timestamptz

UNIQUE(ag_id, lot_id)
```

### ag_correspondence_votes
```sql
id                  uuid PRIMARY KEY
ag_id               uuid REFERENCES ag_meetings(id)
copro_id            uuid REFERENCES copros(id)
coproprietaire_id   uuid REFERENCES coproprietaires(id)
lot_id              uuid REFERENCES lots(id)
received_at         timestamptz
document_id         uuid REFERENCES documents(id)
votes_data          jsonb  -- {resolution_id: vote_value}
processed           boolean DEFAULT false
created_at          timestamptz
```

### ag_session_drafts
```sql
-- Brouillons de session AG (remplace localStorage ag-draft-*, ag-votes-*, etc.)
id                  uuid PRIMARY KEY
ag_id               uuid REFERENCES ag_meetings(id)
copro_id            uuid REFERENCES copros(id)
user_id             uuid REFERENCES auth.users(id)
draft_type          text NOT NULL  -- 'votes', 'attendance', 'resolutions', 'session'
draft_data          jsonb NOT NULL
created_at          timestamptz
updated_at          timestamptz

UNIQUE(ag_id, user_id, draft_type)

-- RLS: user_id = auth.uid() OR user_is_copro_manager(copro_id)
```

### ag_notifications
```sql
id                  uuid PRIMARY KEY
ag_id               uuid REFERENCES ag_meetings(id)
copro_id            uuid REFERENCES copros(id)
coproprietaire_id   uuid REFERENCES coproprietaires(id)
notification_type   text  -- 'convocation', 'reminder', 'pv'
channel             text  -- 'email', 'postal', 'both'
status              notification_status  -- 'pending', 'sent', 'delivered', 'failed'
sent_at             timestamptz
error_message       text
created_at          timestamptz
```

---

## 3. FINANCE / COMPTABILITÉ

### accounting_periods
```sql
id              uuid PRIMARY KEY
copro_id        uuid REFERENCES copros(id)
name            text NOT NULL  -- "Exercice 2025"
start_date      date NOT NULL
end_date        date NOT NULL
status          period_status  -- 'open', 'locked', 'closed'
locked_at       timestamptz
locked_by       uuid
closed_at       timestamptz
closed_by       uuid
notes           text
created_at      timestamptz

-- Trigger: check_single_open_period (1 seul exercice ouvert)
```

### accounts
```sql
-- Plan comptable
id              uuid PRIMARY KEY
copro_id        uuid REFERENCES copros(id)
code            text NOT NULL  -- "401", "512", etc.
name            text NOT NULL
account_type    account_type   -- 'asset', 'liability', 'equity', 'revenue', 'expense'
parent_id       uuid REFERENCES accounts(id)
is_active       boolean DEFAULT true
created_at      timestamptz

UNIQUE(copro_id, code)
```

### budgets
```sql
id              uuid PRIMARY KEY
copro_id        uuid REFERENCES copros(id)
period_id       uuid REFERENCES accounting_periods(id)
budget_type     budget_type    -- 'previsionnel', 'travaux', 'alur'
status          budget_status  -- 'draft', 'submitted', 'validated', 'closed'
name            text
version         integer DEFAULT 1
notes           text
created_by      uuid
validated_by    uuid
created_at      timestamptz
validated_at    timestamptz
```

### budget_lines
```sql
id                  uuid PRIMARY KEY
budget_id           uuid REFERENCES budgets(id)
copro_id            uuid REFERENCES copros(id)
account_id          uuid REFERENCES accounts(id)
repartition_key_id  uuid REFERENCES repartition_keys(id)
label               text NOT NULL
code                text
amount              numeric NOT NULL
sort_order          integer
created_at          timestamptz

-- Trigger: check_budget_line_copro_consistency
```

### call_for_funds
```sql
id                  uuid PRIMARY KEY
copro_id            uuid REFERENCES copros(id)
period_id           uuid REFERENCES accounting_periods(id)
budget_id           uuid REFERENCES budgets(id)
repartition_key_id  uuid REFERENCES repartition_keys(id)
label               text NOT NULL
trimester           integer  -- 1-4
issue_date          date NOT NULL
due_date            date NOT NULL
total_amount        numeric NOT NULL
status              call_for_funds_status  -- 'draft', 'issued', 'partial', 'paid', 'overdue'
ledger_tx_id        uuid
created_at          timestamptz

-- Trigger: validate_call_for_funds_total
```

### call_for_funds_lines
```sql
id              uuid PRIMARY KEY
call_id         uuid REFERENCES call_for_funds(id)
copro_id        uuid REFERENCES copros(id)
lot_id          uuid REFERENCES lots(id)
amount_due      numeric NOT NULL
amount_paid     numeric DEFAULT 0
status          call_line_status  -- 'pending', 'partial', 'paid', 'overdue'
ledger_entry_id uuid
created_at      timestamptz

UNIQUE(call_id, lot_id)

-- Trigger: trg_update_call_status_from_lines, update_call_line_status
```

### payments
```sql
id              uuid PRIMARY KEY
copro_id        uuid REFERENCES copros(id)
period_id       uuid REFERENCES accounting_periods(id)
lot_id          uuid REFERENCES lots(id)
amount          numeric NOT NULL
payment_date    date NOT NULL
method          payment_method  -- 'cheque', 'virement', 'prelevement', 'especes', 'cb'
reference       text
status          payment_status  -- 'recorded', 'allocated', 'cancelled'
ledger_tx_id    uuid
created_at      timestamptz
```

### payment_allocations
```sql
id              uuid PRIMARY KEY
payment_id      uuid REFERENCES payments(id)
call_line_id    uuid REFERENCES call_for_funds_lines(id)
copro_id        uuid REFERENCES copros(id)
amount_allocated numeric NOT NULL
created_at      timestamptz

-- Trigger: validate_payment_allocation, trg_update_line_from_allocation
```

### ledger_transactions
```sql
id              uuid PRIMARY KEY
copro_id        uuid REFERENCES copros(id)
period_id       uuid REFERENCES accounting_periods(id)
tx_date         date NOT NULL
label           text NOT NULL
source_type     text  -- 'call_for_funds', 'payment', 'supplier_invoice', 'manual'
source_id       uuid
status          tx_status  -- 'draft', 'posted', 'cancelled'
posted_at       timestamptz
posted_by       uuid
created_at      timestamptz

-- Trigger: trg_ledger_tx_immutable, trg_ledger_tx_no_delete_posted
```

### ledger_entries
```sql
id              uuid PRIMARY KEY
tx_id           uuid REFERENCES ledger_transactions(id)
copro_id        uuid REFERENCES copros(id)
account_id      uuid REFERENCES accounts(id)
lot_id          uuid  -- optionnel, pour comptabilité par lot
debit           numeric DEFAULT 0
credit          numeric DEFAULT 0
created_at      timestamptz

-- Triggers: trg_ledger_entry_consistency, trg_ledger_entry_immutable
```

---

## 4. MAINTENANCE / PRESTATAIRES

### providers
```sql
id                  uuid PRIMARY KEY
copro_id            uuid REFERENCES copros(id)
name                text NOT NULL
category            provider_category  -- 'plomberie', 'electricite', 'ascenseur', etc.
domains             text[]
contact_name        text
contact_role        text
email               text
phone               text
phone_emergency     text
address             text
postal_code         text
city                text
siret               text
rating              numeric
interventions_count integer DEFAULT 0
is_active           boolean DEFAULT true
created_at          timestamptz
```

### contracts
```sql
id                  uuid PRIMARY KEY
copro_id            uuid REFERENCES copros(id)
provider_id         uuid REFERENCES providers(id)
contract_number     text
contract_type       contract_type  -- 'maintenance', 'assurance', 'energie', etc.
title               text NOT NULL
description         text
start_date          date NOT NULL
end_date            date
renewal_date        date
tacit_renewal       boolean DEFAULT true
notice_period_days  integer DEFAULT 90
annual_amount       numeric
status              contract_status  -- 'draft', 'active', 'expired', 'terminated'
document_id         uuid
created_at          timestamptz

-- Trigger: update_contract_status_auto
```

### service_orders
```sql
id                  uuid PRIMARY KEY
copro_id            uuid REFERENCES copros(id)
building_id         uuid REFERENCES buildings(id)
lot_id              uuid
order_number        text UNIQUE  -- Auto-généré: "OS-2025-0001"
provider_id         uuid REFERENCES providers(id)
contract_id         uuid REFERENCES contracts(id)
category            text
urgency             urgency_level  -- 'low', 'medium', 'high', 'emergency'
title               text NOT NULL
description         text
status              service_order_status  -- 'draft', 'sent', 'acknowledged', 'scheduled', 'in_progress', 'completed', 'cancelled'
scheduled_date      timestamptz
completed_date      timestamptz
estimated_cost      numeric
actual_cost         numeric
created_by          uuid
created_at          timestamptz
updated_at          timestamptz

-- Trigger: generate_service_order_number
```

### logbook_entries
```sql
id                  uuid PRIMARY KEY
copro_id            uuid REFERENCES copros(id)
building_id         uuid REFERENCES buildings(id)
entry_type          logbook_entry_type  -- 'intervention', 'incident', 'control', 'work'
category            text
title               text NOT NULL
description         text
provider_id         uuid
provider_name       text  -- Dénormalisé si pas de provider
contract_id         uuid
service_order_id    uuid
intervention_date   date
cost                numeric
warranty_end        date
next_due_date       date
document_ids        uuid[]
created_by          uuid
created_at          timestamptz
```

---

## 5. DOCUMENTS (GED)

### documents
```sql
id                  uuid PRIMARY KEY
copro_id            uuid REFERENCES copros(id)
lot_id              uuid  -- Si document lié à un lot
coproprietaire_id   uuid  -- Si document personnel
folder_id           uuid REFERENCES document_folders(id)
file_name           text NOT NULL
file_path           text NOT NULL  -- Path dans Storage bucket
file_size           integer
file_hash           text
mime_type           text
category            document_category  -- 'pv_ag', 'contrat', 'facture', 'diagnostic', etc.
title               text
description         text
tags                text[]
confidentiality     confidentiality_level  -- 'public', 'owners', 'council', 'manager'
expiry_date         date
status              document_status  -- 'active', 'archived', 'deleted'
is_current_version  boolean DEFAULT true
deletion_blocked    boolean DEFAULT false
search_text         tsvector  -- Full-text search
created_by          uuid
created_at          timestamptz
updated_at          timestamptz

-- Triggers: update_document_search_text, calculate_document_expiration, prevent_protected_document_deletion
```

### document_versions
```sql
id              uuid PRIMARY KEY
document_id     uuid REFERENCES documents(id)
version_number  integer NOT NULL
file_path       text NOT NULL
file_name       text
file_size       integer
file_hash       text
change_summary  text
created_by      uuid
created_at      timestamptz
```

### document_folders
```sql
id              uuid PRIMARY KEY
copro_id        uuid REFERENCES copros(id)
parent_id       uuid REFERENCES document_folders(id)
name            text NOT NULL
description     text
icon            text
color           text
sort_order      integer
is_system       boolean DEFAULT false  -- Dossiers système non modifiables
category_default document_category
created_by      uuid
created_at      timestamptz
```

---

## 6. COMMUNICATION

### wall_posts
```sql
id              uuid PRIMARY KEY
copro_id        uuid REFERENCES copros(id)
author_id       uuid REFERENCES auth.users(id)
title           text
content         text NOT NULL
category        wall_category  -- 'info', 'question', 'event', 'alert', 'poll'
visibility      visibility_level  -- 'all', 'owners', 'council', 'manager'
is_pinned       boolean DEFAULT false
pinned_at       timestamptz
likes_count     integer DEFAULT 0
comments_count  integer DEFAULT 0
attachment_ids  uuid[]
created_at      timestamptz
updated_at      timestamptz

-- Triggers: update_wall_post_likes_count, update_wall_post_comments_count
```

### wall_comments
```sql
id              uuid PRIMARY KEY
post_id         uuid REFERENCES wall_posts(id)
copro_id        uuid REFERENCES copros(id)
author_id       uuid REFERENCES auth.users(id)
content         text NOT NULL
parent_id       uuid  -- Pour réponses imbriquées
created_at      timestamptz
edited_at       timestamptz
```

### conversations
```sql
id                  uuid PRIMARY KEY
copro_id            uuid REFERENCES copros(id)
subject             text
is_group            boolean DEFAULT false
created_by          uuid REFERENCES auth.users(id)
last_message_at     timestamptz
last_message_preview text
created_at          timestamptz
```

### messages
```sql
id              uuid PRIMARY KEY
conversation_id uuid REFERENCES conversations(id)
copro_id        uuid REFERENCES copros(id)
author_id       uuid REFERENCES auth.users(id)
content         text NOT NULL
attachment_id   uuid
read_by         uuid[]
created_at      timestamptz
edited_at       timestamptz
```

### events
```sql
id              uuid PRIMARY KEY
copro_id        uuid REFERENCES copros(id)
title           text NOT NULL
description     text
event_type      event_type  -- 'ag', 'council', 'work', 'maintenance', 'other'
location        text
starts_at       timestamptz NOT NULL
ends_at         timestamptz
all_day         boolean DEFAULT false
visibility      visibility_level
linked_ag_id    uuid
linked_service_order_id uuid
created_by      uuid
created_at      timestamptz
```

---

## 7. VENTES / MUTATIONS

### mutations
```sql
id                  uuid PRIMARY KEY
copro_id            uuid REFERENCES copros(id)
lot_id              uuid REFERENCES lots(id)
status              mutation_status  -- 'draft', 'in_progress', 'completed', 'cancelled'
mutation_type       mutation_type    -- 'sale', 'donation', 'inheritance', 'division'
seller_owner_id     uuid REFERENCES coproprietaires(id)
buyer_name          text
buyer_email         text
buyer_phone         text
notary_name         text
notary_email        text
notary_phone        text
sale_price          numeric
sale_date           date
act_date            date
created_by          uuid
created_at          timestamptz
updated_at          timestamptz

-- Trigger: initialize_mutation_steps, trg_mutations_updated_at
```

### mutation_steps
```sql
id              uuid PRIMARY KEY
mutation_id     uuid REFERENCES mutations(id)
copro_id        uuid REFERENCES copros(id)
step_code       text NOT NULL  -- 'pre_etat_date', 'questionnaire', 'etat_date', etc.
step_order      integer
status          step_status  -- 'pending', 'in_progress', 'completed', 'skipped'
completed_at    timestamptz
completed_by    uuid
notes           text
document_id     uuid
created_at      timestamptz
updated_at      timestamptz

UNIQUE(mutation_id, step_code)
```

### etat_date_snapshots
```sql
id              uuid PRIMARY KEY
copro_id        uuid REFERENCES copros(id)
mutation_id     uuid REFERENCES mutations(id)
snapshot_type   text  -- 'pre_etat_date', 'etat_date'
generated_at    timestamptz
generated_by    uuid
payload         jsonb NOT NULL  -- Snapshot complet des données
document_id     uuid
created_at      timestamptz
```

---

## NOTES

- Toutes les tables ont `RLS ENABLED`
- Les policies utilisent les helpers `user_is_copro_manager()`, `user_has_copro_access()`, etc.
- Les triggers `handle_updated_at` / `set_updated_at` gèrent automatiquement `updated_at`
- Les enums PostgreSQL sont utilisés pour les statuts (type-safe)
