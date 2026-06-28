# Extract qqfq — VUES (classées par source)

> Source : projet **live `qqfqrcolzmcbsvfaumiq`** (gelé), extrait 2026-06-28 (boucle principale).
> Colonnes : quelles tables-source la vue lit (✅=oui). Définitions complètes à extraire à la demande (`pg_get_viewdef`).
> À confronter à `.planning/db-cible/02 §5bis` et au tri BL-06.

## 🔴 DRIFT MAJEUR — le blueprint NE correspond PAS au live (valide la réserve BL-03)
Le blueprint `db-cible/02 §5bis` liste comme « vues finance vivantes (sondage live) » des vues qui **N'EXISTENT PAS** dans qqfq aujourd'hui :
- **`v_lot_balance`, `v_owner_balance` → INEXISTANTES** comme vues. Le solde du lot = **fonction `get_lot_balance_45x(p_copro_id,p_lot_id)`** ; le solde propriétaire se somme depuis les lots. → **BL-06 doit être corrigé** : la « preuve du solde » repose sur une FONCTION, pas une vue `v_lot_balance`.
- **`v_unpaid_lots` → INEXISTANTE** ; le réel = `v_unpaid_by_lot` (+ `v_unpaid_lot_owner`, `v_unpaid_with_reminders`).
- **`v_general_ledger_by_account_class`, `v_account_movements`, `v_budget_consumption_by_account` → INEXISTANTES** comme vues.
- **`v_finance_integrity_issues`, `v_call_total_mismatch`, `v_invoice_total_mismatch`, `v_payment_allocation_issues`, `v_supplier_payment_issues` → INEXISTANTES** comme vues. Le réel = **fonction `audit_finance_integrity(p_copro_id)`** qui retourne une TABLE d'anomalies (issue_type/expected/actual/difference). → **BL-06 « garde-fous »** = surtout cette fonction + `v_lot_vs_gl_mismatch` + `v_result_allocation_split`, PAS une liste de vues `v_*_mismatch`.
- Naming : blueprint `v_lot_avance` → réel `v_lot_advance_balance` ; `v_owner_statement_summary/lines` → réel `v_owner_statement_by_lot(_detail)/by_person`.

➡️ **Conséquence pour BL-06** (à acter au point ensemble) : la baseline embarque, pour la PREUVE :
`v_general_ledger`, `v_trial_balance`, `v_lot_vs_gl_mismatch`, `v_result_allocation_split`, `v_lot_advance_balance`, `v_works_entries_unlinked`, `v_works_pending_settlement`, `v_owner_statement_by_lot(_detail)` **+ les fonctions `get_lot_balance_45x` et `audit_finance_integrity`**. Le solde propriétaire/lot n'est PAS une vue `v_lot_balance` (corriger la reco).

## Famille A+C — SOLDE/GL + GARDE-FOUS (uses_ledger) → BASELINE
| vue | ledger | cff_lines | note |
|---|---|---|---|
| `v_general_ledger` | ✅ | | grand livre (status posted) |
| `v_trial_balance` | ✅ | | balance + dérive trésorerie 512 |
| `v_lot_advance_balance` | ✅ | | avance par lot (ex-`v_lot_avance`) |
| `v_lot_vs_gl_mismatch` | ✅ | ✅ | **garde-fou central** relevé↔GL |
| `v_result_allocation_split` | ✅ | | **garde invariant 12/478** (def 4527c, complexe) |
| `v_works_entries_unlinked` | ✅ | | garde travaux non liés (operation_id) |
| `v_works_pending_settlement` | ✅ | | travaux à solder |
| `v_alur_fund_balance` | ✅ | | **ALUR dérivé du GL** (105/450-5) — la BONNE (vs `v_alur_fund_summary`) |
| `v_owner_statement_by_lot` | ✅ | | relevé propriétaire dérivé GL |
| `v_owner_statement_by_lot_detail` | ✅ | | détail |
| `v_dashboard_kpis` | ✅ | | KPIs (présentation — différable malgré ledger) |

> ⚠️ **PAS de vue de solde lot/owner** : `get_lot_balance_45x()` (fonction) fait le solde 45x. À garder dans la baseline (c'est ce que le e2e SQL lira pour prouver).

## Famille B — RELEVÉS / APPELS (uses_cff_lines, présentation) → REPORTÉ
`v_calls_overview` · `v_call_campaigns` · `v_call_lines_detailed` · `v_unpaid_by_lot` · `v_unpaid_lot_owner` · `v_unpaid_with_reminders` · `v_owner_statement_by_person` · `v_payments_overview` · `v_payment_reminders_overview` · `v_budgets_overview` *(⚠ NE lit PAS ledger → réancrer sur classe 6, BL-05)* · `v_budget_lines_overview` · `v_budget_expenses_detail`

## Famille D — BANCAIRE (uses_bank) → REPORTÉ (avec les faux-morts)
`v_account_balances` *(**DROP** — dérive 512 des bank_movements, chemin parallèle)* · `v_bank_movements_overview` · `v_dashboard_todos` *(lit bank — à réancrer ou différer)*

## Famille E — ALUR → REPORTÉ (avec alur_transfers)
`v_alur_fund_summary` *(lit alur_transfers)* · `v_alur_transfers_history` · `v_alur_transfers_pending_cash` · `v_alur_lot_contributions` *(ledger+cff_lines, hybride)*
> Note : `v_alur_fund_balance` (ledger, famille A) est la version GL-pure → c'est celle qu'on garde ; `v_alur_fund_summary` (alur_transfers) part au report.

## HORS-FINANCE — DIFFÉRÉ (BL-08) — noms seuls
AG : `v_ag_overview, v_ag_attendance_summary, v_ag_correspondence_status, v_ag_documents, v_ag_drafts_progress, v_ag_notification_stats, v_ag_resolution_vote_summary, v_ag_resolutions_results, v_ag_vote_stats_by_resolution, v_ag_votes_detailed`
Copro/lots : `v_coproprietaires_overview, v_lots_with_owners, v_repartition_key_lines_detailed, v_repartition_key_totals, tiers_directory, v_providers_overview`
Maintenance : `v_contracts_alerts, v_contracts_overview, v_service_orders_overview, v_supplier_invoices_overview, v_logbook_overview, v_logbook_alerts, v_maintenance_stats`
Ventes/conseil : `v_mutations_overview, v_mutation_detail, v_etat_date_latest, v_council_members_detail`
GED/comm : `v_documents_*, v_folders_with_counts, v_recent_documents, v_document_versions, v_conversations_overview, v_events_overview, v_wall_feed, v_dashboard_recent_activity`
