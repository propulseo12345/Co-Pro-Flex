# Backend Architecture (Supabase)

## Overview

| Metric | Count |
|--------|-------|
| Tables | 62 |
| Views | 20+ |
| Edge Functions | 20 |
| RPC Functions | 104+ |
| Migrations | 45 |

## Client Configuration

Location: `src/lib/supabase/`

| File | Purpose |
|------|---------|
| `client.ts` | Browser client using `@supabase/ssr` |
| `server.ts` | Server client with cookie handling |
| `middleware.ts` | SSR authentication middleware |

Environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Type definitions: `src/types/supabase.ts` (auto-generated, 378KB)

## Core Tables

### Authentication & Identity
| Table | Purpose |
|-------|---------|
| `profiles` | User profiles with roles |
| `coproprietaires` | Co-owner directory linked to users |
| `lots` | Properties with share units (tantièmes) |

### Finance
| Table | Purpose |
|-------|---------|
| `accounts` | Hierarchical chart of accounts |
| `accounting_periods` | Period management (open, closed, locked) |
| `ledger_transactions` | Transaction headers (draft/posted, **immutable** when posted) |
| `ledger_entries` | Balanced debit/credit entries |
| `call_for_funds` | Assessment calls with scheduling |
| `call_for_funds_lines` | Line-item allocation per lot |
| `payments` | Payment records with audit trail |
| `payment_allocations` | Payment-to-call allocation |
| `payment_reminders` | Automated reminder tracking |
| `reminder_settings` | Customizable reminder templates |

### Assembly General (AG)
| Table | Purpose |
|-------|---------|
| `ag_meetings` | Meeting headers (type, date, status, bureau) |
| `ag_resolutions` | Individual resolutions with voting rules |
| `ag_attendance` | Physical/proxy/correspondence presence |
| `ag_votes` | Vote records per copro per resolution |
| `ag_correspondence_votes` | Postal votes (JSONB) |
| `ag_session_drafts` | Temporary session state (JSONB) |
| `ag_documents` | Generated convocations and PVs |

### Maintenance
| Table | Purpose |
|-------|---------|
| `prestataires` | Service providers |
| `contrats_maintenances` | Contracts with renewal alerts |
| `ordres_service` | Work orders (draft→sent→completed) |
| `carnet_interventions` | Maintenance logbook entries |

### Communication & Mail
| Table | Purpose |
|-------|---------|
| `mail_templates` | Email templates (system + custom) |
| `mail_campaigns` | Campaign management |
| `mail_recipients` | Recipient tracking with delivery status |
| `communication_threads` | Discussion threads |
| `communication_messages` | Message content |

### Documents
| Table | Purpose |
|-------|---------|
| `documents` | Document registry with confidentiality levels |
| `document_versions` | Version history |
| `document_access` | Fine-grained access control |
| `document_folders` | Hierarchical organization |

### Mutations (Property Sales)
| Table | Purpose |
|-------|---------|
| `mutations` | Property transaction workflow |
| `etat_date_snapshots` | Pre/final property statements |
| `etat_date_lines` | Statement line items |

## Critical Views

| View | Usage |
|------|-------|
| `v_ledger_trial_balance` | Account balances by period |
| `v_ledger_balance_sheet` | Asset/liability/equity positions |
| `v_owner_statements` | Individual lot billing statements |
| `v_ag_drafts_progress` | AG draft aggregation with completion_ratio |
| `v_contracts_overview` | Contract summary with renewal status |
| `v_contracts_alerts` | Contracts expiring soon |
| `v_service_orders_overview` | Work order status summary |
| `v_logbook_overview` | Maintenance history dashboard |
| `v_mail_campaigns_overview` | Campaign statistics |
| `v_documents_with_folder` | Documents with folder info |

## Key RPC Functions

| Function | Purpose |
|----------|---------|
| `save_ag_session_draft(p_ag_id, p_draft_type, p_draft_data)` | Save session state → UUID |
| `get_ag_session_draft(p_ag_id, p_draft_type)` | Retrieve session state → JSONB |
| `get_ag_all_session_drafts(p_ag_id)` | All drafts for AG → RECORD[] |
| `clear_ag_session_drafts(p_ag_id)` | Clear session state |
| `generate_campaign_recipients(p_campaign_id)` | Auto-populate recipients → INTEGER |
| `get_default_copro_id()` | Get first copro by creation date → UUID |

### RLS Helper Functions
| Function | Purpose |
|----------|---------|
| `user_is_copro_manager(p_copro_id)` | Check manager role → BOOLEAN |
| `user_is_lot_owner(p_lot_id)` | Check lot ownership → BOOLEAN |
| `user_has_copro_access(p_copro_id)` | Check any access → BOOLEAN |
| `user_is_council_member(p_copro_id)` | Check council membership → BOOLEAN |
| `get_user_lot_ids(p_copro_id)` | Get user's lots → UUID[] |

## Edge Functions

| Function | Purpose |
|----------|---------|
| `ag_create` | Create AG + 14 standard resolutions |
| `ag_start_session` | Initialize session with role assignments |
| `ag_cast_vote` | Record vote with real-time tally |
| `ag_register_attendance` | Record presence (physical/proxy/correspondence) |
| `ag_add_resolution` | Add custom resolutions |
| `ag_send_convocations` | Generate and send convocation notices |
| `ag_send_relance` | Send reminders to non-respondents |
| `ag_close` | Finalize AG, calculate results, generate PV |
| `ag_generate_document` | Generate PV or convocation PDF |
| `run_payment_reminders` | CRON-triggered reminders (J+15/30/60/90) |
| `send_manual_payment_reminder` | Manual reminder trigger |
| `generate_owner_statement` | Generate billing statement |
| `get_document_url` | Generate signed download URL |

## Row Level Security (RLS)

### Pattern
Manager bypass + role-based filtering

### Access Levels
| Role | Access |
|------|--------|
| Manager | Full access to their copropriété |
| Copropriétaire | Own data only (lots, payments) |
| Conseil syndical | Extended read access (contracts, communications) |

### Document Confidentiality Levels
| Level | Access |
|-------|--------|
| `'public'` | All copro members |
| `'council'` | Council members + managers |
| `'manager'` | Managers only |
| `'restricted'` | Document owner or via document_access table |

## Database Constraints & Triggers

### Immutability
- `ledger_transactions` with `status='posted'` cannot be modified
- Enforced by trigger `trg_ledger_tx_immutable()`

### Call for Funds Invariant
```sql
call_for_funds.total_amount = SUM(call_for_funds_lines.amount_due)
-- Tolerance: 0.01€
```
Enforced by constraint trigger in `20260126_action1_invariant_appel_total.sql`

### Over-Allocation Prevention
- `payment_allocations.amount ≤ call_for_funds_lines.amount_due`
- Enforced in `20260126_action3_surallocation_paiements.sql`

### Auto Status Updates
- Call status auto-updates based on payment progress
- Trigger `update_call_status()` in `20260126_action2_auto_call_status.sql`

## Implicit Rules

1. **Tables for writes / Views for reads**: Hooks use views for SELECT, tables for mutations
2. **`security_invoker = true`**: On views to respect caller's RLS
3. **JSONB for flexibility**: `ag_session_drafts.draft_data`, `documents.metadata`, `mail_campaigns.recipient_filter`
