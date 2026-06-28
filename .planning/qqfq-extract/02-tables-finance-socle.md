# Extract qqfq — TABLES (scope socle + finance)

> Source : projet **live `qqfqrcolzmcbsvfaumiq`** (gelé), extrait 2026-06-28 (boucle principale).
> Matière première baseline v2 (BL-03). **0 donnée.** `NN` = NOT NULL. Type = type Postgres réel.
> À confronter à `.planning/db-cible/01-*`, `02-*`, `03-*` pendant la consolidation (BL-08).
> ⚠️ Le hors-finance (AG/docs/comm/maintenance/ventes/conseil) est **différé** (BL-02/BL-08) → listé par nom seul en fin de fichier.

## ⚠️ Découvertes structurelles (à trancher en consolidation)
- **Argent = `numeric(14,2)` PARTOUT** dans qqfq, alors que la décision v2 = **centimes `bigint`** (REGLES_CODE F1). → **divergence à acter** : la baseline convertit tous les montants en `bigint` centimes. Impact sur TOUTES les RPC (arrondi, comparaisons).
- **`accounts.initial_balance numeric(14,2) NN`** = colonne fantôme → **DROP** en v2 (solde d'ouverture = vraie écriture GL 512/502, D5).
- **Pas de table `platform_admins`** → la baseline la CRÉE (C16-4) ; `memberships.role` garde la valeur `platform_admin` (morte en v2).
- **Pas de table `commitments`** → NEUVE en v2 (BL-05, l'engagé) ; aujourd'hui l'engagé vit dans `budget_expenses` (+ posting GL à retirer).
- **Pas de table `copro_bank_accounts`** → qqfq porte la banque sur `accounts` (iban/bic/bank_name). BL-02 dit `copro_bank_accounts` prérequis (G24-T7) : **réconcilier** (table dédiée 2 poches vs colonnes sur accounts).
- **`accounts.charge_nature text`** présent (6221=travaux/711=courant, E3) ; **`accounts.nature account_receivable_nature`** = les 6 natures 45x.
- `call_for_funds_lines.weight_snapshot` + `amount_due/amount_paid` : le `amount_paid` est un compteur sur la ligne → BL-04 dit GL seul fait foi, ces colonnes = carnet d'âge (vérifié vs GL), pas autorité.
- `budget_expenses` a `ledger_tx_id` (le posting GL à RETIRER, BL-05) + `tiers_id` (fusion OK).
- `supplier_advances.supplier_id` (PAS `tiers_id`) → **repointer** vers `tiers` (incohérent avec `supplier_invoices.tiers_id` déjà migré).
- `ledger_entries.operation_id` + `supplier_invoice_lines.operation_id` présents (E4, précédence travaux). ✅

## SOCLE (copros / lots / personnes / clés)
| table | colonnes |
|---|---|
| `cabinets` | id uuid NN; name text NN; siret text; email text; phone text; address_line1 text; address_line2 text; city text; postal_code text; country text NN; is_active boolean NN; created_at; updated_at |
| `copros` | id uuid NN; cabinet_id uuid NN; name text NN; address text; city text; postal_code text; siret text; num_immatriculation text; date_reglement date; annee_construction smallint; exercice_debut smallint NN; onboarding_step smallint; onboarding_max_step smallint; created_at; updated_at; previous_syndic_name text |
| `buildings` | id uuid NN; copro_id uuid NN; name text NN; address text; floors_count smallint; construction_year smallint; created_at; updated_at |
| `lots` | id uuid NN; copro_id uuid NN; building_id uuid; ref text NN; type lot_type NN; floor smallint; surface numeric(8,2); description text; created_at; updated_at *(PAS de tantiemes_* ni owner_id → dérivés, lot-centric ✅)* |
| `coproprietaires` | id uuid NN; copro_id uuid NN; user_id uuid; is_company boolean NN; company_name text; civility text; first_name text; last_name text; email text; phone text; mobile text; address_line1 text; address_line2 text; city text; postal_code text; country text NN; prefers_email boolean NN; prefers_paper boolean NN; is_resident boolean NN; notes text; created_at; updated_at |
| `lot_owners` | id uuid NN; lot_id uuid NN; coproprietaire_id uuid NN; copro_id uuid NN; share_percent numeric(6,3) NN; is_primary boolean NN; start_date date NN; end_date date; created_at *(indivision ✅)* |
| `repartition_keys` | id uuid NN; copro_id uuid NN; name text NN; basis repartition_basis NN; category repartition_category NN; coverage_mode coverage_mode NN; description text; is_active boolean NN; valid_from date NN; valid_to date; created_at |
| `repartition_key_lines` | id uuid NN; key_id uuid NN; lot_id uuid NN; copro_id uuid NN; weight numeric(12,4) NN; created_at *(source unique du tantième ✅)* |
| `memberships` | id uuid NN; user_id uuid NN; copro_id uuid NN; role membership_role NN; created_at |
| `profiles` | id uuid NN; email text; full_name text; phone text; avatar_url text; cabinet_id uuid; created_at; updated_at *(id = FK auth.users)* |
| `work_domain` | id uuid NN; slug text NN; label text NN; is_active boolean NN; sort_order integer NN; created_at *(table de réf catégories ✅)* |
| `tiers` | id uuid NN; copro_id uuid NN; name text NN; is_supplier boolean NN; is_provider boolean NN; is_notary boolean NN; category tiers_category NN; domain_ids uuid[] NN; siret text; vat_number text; iban text; bic text; office_name text; notary_reference text; contact_name text; contact_role text; email text; phone text; phone_emergency text; address text; postal_code text; city text; rating_avg numeric(2,1); rating_count integer NN; interventions_count integer NN; last_intervention_at; intervention_radius_km integer; certifications text[] NN; description text; availability text; internal_notes text; is_active boolean NN; created_at; updated_at *(fusion tiers ✅)* |

## FINANCE — grand livre
| table | colonnes |
|---|---|
| `accounts` | id uuid NN; copro_id uuid NN; code text NN; name text NN; account_type account_type NN; nature account_receivable_nature; is_active boolean NN; is_system boolean NN; is_postable boolean NN; description text; iban text; bic text; bank_name text; **initial_balance numeric(14,2) NN (→DROP)**; created_at; updated_at; charge_nature text |
| `accounting_periods` | id uuid NN; copro_id uuid NN; name text NN; start_date date NN; end_date date NN; status period_status NN; closed_at; closed_by uuid; approved_at; approved_by uuid; approval_notes text; notes text; created_at; updated_at |
| `ledger_transactions` | id uuid NN; copro_id uuid NN; period_id uuid NN; tx_date date NN; source_type ledger_source_type NN; source_id uuid; label text NN; status ledger_tx_status NN; created_by uuid; posted_by uuid; posted_at; metadata jsonb NN |
| `ledger_entries` | id uuid NN; tx_id uuid NN; copro_id uuid NN; period_id uuid NN; account_id uuid NN; lot_id uuid; direction ledger_direction NN; amount numeric(14,2) NN; entry_label text; operation_id uuid |
| `opening_balance_residual_items` | id uuid NN; copro_id uuid NN; period_id uuid NN; label text NN; origin_date date; amount numeric(14,2) NN; direction ledger_direction NN; lot_id uuid; residual_amount_at_save numeric(14,2) NN; created_at |
| `period_cutoff_items` | id uuid NN; copro_id uuid NN; period_id uuid NN; kind cutoff_kind NN; account_id uuid NN; counterpart_account_id uuid NN; amount numeric(14,2) NN; label text; tiers_id uuid; auto_reverse boolean NN; posting_tx_id uuid; reversal_tx_id uuid |

## FINANCE — budgets / appels / paiements / impayés
| table | colonnes |
|---|---|
| `budgets` | id uuid NN; copro_id uuid NN; period_id uuid NN; budget_type budget_type NN; status budget_status NN; version integer NN; name text; notes text; source_ag_id uuid; created_by uuid; validated_by uuid; validated_at; created_at; updated_at |
| `budget_lines` | id uuid NN; budget_id uuid NN; copro_id uuid NN; account_id uuid NN; repartition_key_id uuid NN; label text NN; amount numeric(14,2) NN; code text; sort_order integer; created_at; updated_at |
| `budget_expenses` | id uuid NN; copro_id uuid NN; budget_id uuid NN; budget_line_id uuid NN; label text NN; amount numeric(14,2) NN; montant_ht numeric(14,2); taux_tva numeric(5,2); tx_date date NN; status expense_status NN; tiers_id uuid; piece_jointe uuid; **ledger_tx_id uuid (→retirer posting, BL-05)**; validated_by uuid; validated_at; rejection_comment text; created_at; updated_at |
| `budget_payment_schedules` | id uuid NN; copro_id uuid NN; budget_id uuid; service_order_id uuid; phase_label text; due_date date; amount numeric(14,2); status payment_phase_status NN; created_at; updated_at *(faux-mort câblé)* |
| `call_for_funds` | id uuid NN; copro_id uuid NN; period_id uuid NN; budget_id uuid; repartition_key_id uuid; label text NN; issue_date date NN; due_date date NN; trimester integer; total_amount numeric(14,2) NN; status call_for_funds_status NN; ledger_tx_id uuid; issued_at; description text; created_by uuid; created_at; updated_at |
| `call_for_funds_lines` | id uuid NN; call_id uuid NN; copro_id uuid NN; lot_id uuid NN; repartition_key_id uuid; amount_due numeric(14,2) NN; amount_paid numeric(14,2) NN; status call_line_status NN; weight_snapshot numeric *(→ carnet d'âge, BL-04)* |
| `payments` | id uuid NN; copro_id uuid NN; period_id uuid NN; lot_id uuid NN; amount numeric(14,2) NN; payment_date date NN; method payment_method NN; reference text; status payment_status NN; ledger_tx_id uuid; created_by uuid; idempotency_key text |
| `payment_allocations` | id uuid NN; copro_id uuid NN; payment_id uuid NN; call_line_id uuid NN; amount_allocated numeric(14,2) NN |
| `payment_reminders` | id uuid NN; copro_id uuid NN; lot_id uuid NN; owner_id uuid; reminder_rule_id uuid; call_id uuid; call_line_id uuid; unpaid_amount numeric(14,2) NN; oldest_due_date date; days_overdue integer; delay_level integer; status reminder_status NN; delivery_status delivery_status; recipient_email text; recipient_name text; provider_message_id text; scheduled_at; sent_at; cancelled_at; cancelled_reason text; content text; created_by uuid; created_at; updated_at |
| `payment_reminder_rules` | id uuid NN; copro_id uuid NN; delay_days integer NN; channel notification_channel NN; template_id uuid; label text; is_active boolean NN; created_by uuid; created_at; updated_at |
| `reminder_settings` | copro_id uuid NN; is_paused boolean NN; paused_until date; pause_reason text; updated_at |

## FINANCE — fournisseurs
| table | colonnes |
|---|---|
| `supplier_invoices` | id uuid NN; copro_id uuid NN; period_id uuid NN; tiers_id uuid NN; service_order_id uuid; invoice_number text NN; invoice_date date NN; due_date date; label text NN; total_amount numeric(14,2) NN; montant_ht numeric(14,2); montant_tva numeric(14,2); taux_tva numeric(5,2); status supplier_invoice_status NN; document_id uuid; ledger_tx_id uuid; created_by uuid; created_at; updated_at; doc_kind supplier_doc_kind NN; original_invoice_id uuid |
| `supplier_invoice_lines` | id uuid NN; copro_id uuid NN; invoice_id uuid NN; account_id uuid NN; repartition_key_id uuid; budget_line_id uuid; label text NN; amount numeric(14,2) NN; amount_ht numeric(14,2); amount_tva numeric(14,2); taux_pct numeric(5,2); created_at; operation_id uuid |
| `supplier_payments` | id uuid NN; copro_id uuid NN; period_id uuid NN; supplier_invoice_id uuid NN; payment_date date NN; amount numeric(14,2) NN; method payment_method NN; reference text; ledger_tx_id uuid; idempotency_key text; created_by uuid; created_at |
| `supplier_advances` | id uuid NN; copro_id uuid NN; period_id uuid NN; **supplier_id uuid NN (→repointer tiers)**; amount numeric(14,2) NN; remaining_amount numeric(14,2) NN; ledger_tx_id uuid; idempotency_key text; created_at |

## FINANCE — faux-morts câblés (BL-06 : partent avec leurs vues, hors baseline)
| table | colonnes |
|---|---|
| `bank_movements` | id uuid NN; copro_id uuid NN; period_id uuid; bank_date date NN; value_date date; amount_signed numeric(14,2) NN; label text; bank_ref text; status bank_movement_status NN; account_id uuid NN |
| `bank_matches` | id uuid NN; copro_id uuid NN; bank_movement_id uuid NN; target_type bank_match_target_type NN; target_id uuid; amount_matched numeric(14,2) NN; matched_at; matched_by uuid |
| `alur_transfers` | id uuid NN; copro_id uuid NN; budget_id uuid; destination transfer_destination NN; amount numeric(14,2) NN; transfer_date date; ledger_tx_id uuid; notes text; created_at; updated_at; cash_settled boolean NN; cash_settled_at date; cash_ledger_tx_id uuid |

## FINANCE — différés explicites (BL-02 : emprunt/avances)
| table | colonnes |
|---|---|
| `collective_loans` | id; copro_id; label; lender; total_amount; remaining_amount; annual_payment; interest_rate; start_date; end_date; status collective_loan_status; ledger_tx_id |
| `collective_loan_shares` | id; loan_id; lot_id; share_amount; remaining_amount; last_payment_date |
| `treasury_advances` | id; copro_id; lot_id; advance_type treasury_advance_type; label; amount_due; amount_paid |

## HORS-FINANCE — DIFFÉRÉ (BL-08, audit drift requis avant de graver) — noms seuls
AG : `ag_meetings, ag_resolutions, ag_votes, ag_attendance, ag_correspondence_votes, ag_correspondence_vote_details, ag_documents, ag_envoi_tracking, ag_milestones, ag_notifications, ag_notification_events, ag_pending_actions, ag_session_drafts, pv_templates, resolution_templates`
Conseil : `council_decisions, council_votes, council_members, council_documents, rapports_activite_cs, sections_rapport_cs, annexes_rapport_cs`
Ventes/mutations : `mutations, mutation_steps, mutation_oppositions, etat_date_snapshots`
Maintenance : `service_orders, service_order_events, contracts, insurance_policies, logbook_entries, planned_works, technical_documents`
GED : `documents, document_folders, document_versions, document_relations`
Communication : `conversations, conversation_members, messages, mails, wall_posts, wall_comments, wall_likes, events, email_templates`
Autres : `copro_invitations, legal_proceedings`
