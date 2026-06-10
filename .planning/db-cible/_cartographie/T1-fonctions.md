# T1 — Inventaire exhaustif des fonctions `public` (live `iyfesbjnkpynmwlsmxnp`)

Lecture seule. Source : `pg_proc` / `pg_get_function_identity_arguments` / `prosecdef` / `proacl` / `prosrc`.

## Synthèse chiffrée

| Métrique | Valeur |
|---|---|
| Fonctions totales (`prokind='f'`) | **190** |
| SECURITY DEFINER | **117** |
| SECURITY INVOKER | **73** |
| Triggers (`returns trigger`) | **45** |
| **Exécutables par `anon`** (proacl contient `anon=X`) | **189 / 190** |
| Seule fonction NON exposée anon | `provision_copro_chart` |
| `proacl IS NULL` (= PUBLIC) | 0 (toutes ont une ACL explicite, mais elle inclut `anon=X`) |
| Fonctions DEFINER avec garde `user_is_copro_manager` | 9 |
| Fonctions DEFINER vérifiant le **rôle** (service_role / current_setting) | **0** |

**Verdict sécurité global : À REPENSER (critique).** Le modèle ACL est uniforme et permissif : 189 fonctions sur 190 sont `EXECUTE` pour `anon`. Le bicéphale session-user vs service_role n'existe PAS au niveau fonction (aucune ne lit le rôle d'appel). Les fonctions finance DEFINER qui postent le grand livre sont appelables par un client anonyme sans aucune garde in-function. Disposition transverse : **RÉÉCRIRE toutes les DEFINER d'écriture avec `REVOKE EXECUTE FROM anon` + garde in-function (`user_is_copro_manager(p_copro_id)` pour le gestionnaire, ou contrôle propriétaire/lot pour le copropriétaire), + branche service_role explicite.**

### Convention « garde proposée »
- **G-MGR** : réservé gestionnaire → `REVOKE anon`, `GRANT authenticated`, garde `IF NOT user_is_copro_manager(p_copro_id) THEN RAISE`.
- **G-OWNER** : copropriétaire sur SES lots → garde `user_is_lot_owner_in_copro` / `user_owns_any_lot_in_copro`.
- **G-MIXTE** : gestionnaire OU propriétaire concerné (`user_is_lot_owner_or_manager`).
- **G-SVC** : appel machine uniquement → `REVOKE anon, authenticated`, `GRANT service_role`, branche `current_setting('request.jwt.claims')`/role.
- **G-DEF-RO** : DEFINER lecture seule, garder DEFINER mais ajouter contrôle d'accès copro + `REVOKE anon` sauf si portail copro légitime.
- **G-TRIG** : trigger interne, pas d'appel direct → `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` (n'a pas à être exécutable hors trigger).
- **G-INTERNAL** : helper SQL pur, pas de données → garde inutile, juste `REVOKE anon`.

---

## A. Chaîne finance canonique (grand livre) — GARDER, durcir les gardes

| fonction | args | DEFINER? | exposée anon? | tables touchées | disposition | garde |
|---|---|---|---|---|---|---|
| create_ledger_transaction | p_copro_id, p_period_id, p_tx_date, p_label, p_source_type, p_source_id, p_entries, p_auto_post | Oui | Oui | ledger_entries, ledger_transactions | **GARDER** (route canonique d'écriture GL) | G-MGR + G-SVC (post-as-you-go service_role) |
| post_ledger_transaction | p_tx_id | Oui | Oui | accounting_periods, ledger_entries, ledger_transactions | **GARDER** | G-MGR + G-SVC |
| post_budget_call_for_funds | p_copro_id, p_period_id, p_budget_id, p_label, p_trimester, p_issue_date, p_due_date, p_fraction, p_installment_index, p_installment_count | Oui | Oui | accounts, budget_lines, budgets, call_for_funds, call_for_funds_lines, repartition_key_lines | **GARDER** (canonique appel agrégé) | G-MGR |
| post_budget_call_for_funds | …(7 args, sans installment) | Oui | Oui | idem | **ABANDONNER** (surcharge obsolète, doublon de la version 10 args) | — supprimer |
| post_owner_payment | p_copro_id, p_period_id, p_lot_id, p_amount, p_payment_date, p_method, p_reference, p_call_line_ids, p_idempotency_key, p_nature_filter | Oui | Oui | accounts, budgets, call_for_funds, call_for_funds_lines, payment_allocations, payments | **GARDER** (encaissement copro lot-centric) | G-MGR (saisie fiche copro / rappro) |
| post_supplier_invoice | p_copro_id, p_period_id, p_supplier_id, p_invoice_number, … p_lines, p_document_id, p_related_service_order_id, p_post_immediately, p_montant_ht, p_montant_tva, p_taux_tva | Oui | Oui | accounts, supplier_invoice_lines, supplier_invoices | **GARDER** (B en 2 temps) ; entité tiers fusionnée suppliers+providers | G-MGR |
| post_supplier_payment | p_copro_id, p_period_id, p_supplier_invoice_id, p_amount, p_payment_date, p_method, p_reference, p_idempotency_key | Oui | Oui | accounts, supplier_invoices, supplier_payments | **GARDER** (version idempotente) | G-MGR |
| post_supplier_payment | …(7 args, sans idempotency_key) | Oui | Oui | idem | **ABANDONNER** (surcharge non-idempotente) | — supprimer |
| post_call_for_funds | p_copro_id, p_period_id, p_budget_id, p_repartition_key_id, p_label, p_trimester, p_issue_date, p_due_date, p_total_amount, p_description | Oui | Oui | accounts, budgets, call_for_funds, call_for_funds_lines, lots, repartition_key_lines | **RÉÉCRIRE/ABANDONNER** (appel mono-clé pré-agrégé, supplanté par post_budget_call_for_funds) | trancher avec USER ; si gardé → G-MGR |
| allocate_payment | p_payment_id, p_call_line_ids, p_nature_filter | Non (INVOKER) | Oui | budgets, call_for_funds, call_for_funds_lines, payment_allocations, payments | **GARDER** (imputation FIFO cloisonnée par nature) ; INVOKER → s'appuie sur RLS | G-MGR (via RLS + check appelant) |
| set_opening_balance | p_copro_id, p_period_id, p_as_of_date, p_lines | Oui | Oui | accounting_periods, accounts, ledger_entries, ledger_transactions | **GARDER** (reprise de mandat A→D) | G-MGR |
| get_opening_balance | p_copro_id, p_period_id | Oui | Oui | accounts, ledger_entries, ledger_transactions | **GARDER** (lecture) | G-DEF-RO (accès copro) |
| post_period_cutoff | p_copro_id, p_period_id, p_items | Oui | Oui | accounting_periods, accounts, ledger_transactions, period_cutoff_items | **GARDER** (cut-off 408/486) | G-MGR |
| reverse_period_cutoff | p_copro_id, p_period_id | Oui | Oui | accounting_periods, ledger_transactions, period_cutoff_items | **GARDER** | G-MGR |
| cutoff_entry_pair | p_kind, p_account_id, p_counterpart_id, p_amount, p_label, p_reverse | Non | Oui | (helper, construit jsonb) | **GARDER** (helper interne cut-off) | G-INTERNAL (REVOKE anon) |
| open_next_period | p_copro_id, p_closing_period_id, p_new_name, p_new_start, p_new_end | Oui | Oui | accounting_periods, accounts, ledger_entries, ledger_transactions | **GARDER** (à-nouveau N→N+1) | G-MGR |
| close_period | p_period_id | Oui | Oui | accounting_periods | **GARDER** (gel binaire status) | G-MGR |
| approve_period | p_period_id | Oui | Oui (auth.uid) | accounting_periods | **GARDER** | G-MGR |
| reopen_period | p_period_id | Oui | Oui | accounting_periods | **GARDER** (interdit si approved) | G-MGR |
| regularize_period | p_copro_id, p_period_id | Oui | Oui | accounting_periods, accounts, ledger_entries, ledger_transactions, repartition_key_lines, repartition_keys | **GARDER** (affectation résultat 110/120) | G-MGR |
| get_period_for_date | p_copro_id, p_date | Oui | Oui | accounting_periods | **GARDER** (helper cut-off) | G-DEF-RO |
| is_ledger_regen_exempt | p_source_type, p_source_id, p_posting_period_id | Non | Oui | accounting_periods | **GARDER** (liste blanche immutabilité) | G-INTERNAL |
| resolve_lot_tiers_account | p_copro_id, p_nature | Oui | Oui | accounts | **GARDER** (sous-comptes 450-1/2/3/4/5 par nature + lot_id) | G-INTERNAL/G-MGR |
| provision_copro_chart | p_copro_id | Oui | **NON** (seule protégée) | accounts, copros | **GARDER** (provisionne plan comptable) | G-MGR (déjà sans anon — modèle de référence) |
| validate_budget_expense | p_expense_id | Oui | Oui | accounting_periods, accounts, budget_expenses, budget_lines, budgets | **GARDER** (palier engagé→réalisé, poste classe 6) | G-MGR |
| recalculate_all_call_statuses | p_copro_id | Oui | Oui | call_for_funds, call_for_funds_lines | **GARDER** (maintenance statut appels) | G-MGR |
| update_call_status | p_call_id | Oui | Oui | call_for_funds, call_for_funds_lines | **GARDER** | G-MGR / G-INTERNAL |
| get_owner_statement | p_copro_id, p_owner_id, p_period_id, p_date_from, p_date_to | Oui | Oui | accounting_periods, coproprietaires, copros, lot_owners, lots | **GARDER** (relevé, dérive solde par somme des lots) | G-MIXTE (mgr ou owner concerné) |
| fn_dashboard_kpis | p_copro_id, p_period_id | Oui | Oui | accounts, ledger_entries, ledger_transactions | **GARDER** (KPI dérivés du GL) | G-DEF-RO (accès copro) |
| calculate_budget_projection | p_copro_id, p_period_id | Oui | Oui | accounting_periods, accounts, budget_lines, budgets, ledger_entries, ledger_transactions | **GARDER** | G-DEF-RO |
| audit_finance_integrity | p_copro_id | Oui | Oui | (lecture GL, équilibre) | **GARDER** (outil d'audit) | G-MGR |

## B. Annexes comptables légales — GARDER (lecture), corriger libellés en T-tables

| fonction | args | DEFINER? | anon? | tables | disposition | garde |
|---|---|---|---|---|---|---|
| fn_annexe_1 | p_copro_id, p_period_id | Non | Oui | accounting_periods (+ GL) | **GARDER** | G-DEF-RO (passer DEFINER + accès copro) |
| fn_annexe_1_detail_copros | p_copro_id, p_period_id | Non | Oui | accounts, copros, ledger_entries, ledger_transactions, lot_owners | **GARDER** | idem |
| fn_annexe_2 | p_copro_id, p_period_id, p_next_period_id | Non | Oui | accounting_periods, accounts, budget_lines, budgets, ledger_* | **GARDER** | idem |
| fn_annexe_3 | p_copro_id, p_period_id, p_next_period_id | Non | Oui | … repartition_keys, ledger_* | **GARDER** (libellé = ventilation par clés) | idem |
| fn_annexe_4 | p_copro_id, p_period_id | Non | Oui | accounts, budget_lines, budgets, ledger_* | **GARDER** (travaux terminés) | idem |
| fn_annexe_5 | p_copro_id, p_period_id | Non | Oui | … repartition_keys, ledger_* | **GARDER** (travaux non clôturés) | idem |

## C. AG — chaîne CANONIQUE qui POSTE le GL → GARDER

| fonction | args | DEFINER? | anon? | tables | disposition | garde |
|---|---|---|---|---|---|---|
| prepare_ag_decisions | p_ag_id | Oui | Oui | accounting_periods, ag_meetings, ag_pending_actions, ag_resolutions, budgets, call_for_funds, contracts, copros, council_members | **GARDER** (étape 1 chaîne canonique) | G-MGR |
| activate_ag_decisions | p_ag_id | Oui | Oui | accounting_periods, ag_meetings, ag_pending_actions, budgets, contracts, council_members | **GARDER** (étape 2 : AG → état copro auto) | G-MGR |
| generate_calls_from_ag_payload | p_copro_id, p_ag_id, p_resolution_id, p_payload | Oui | Oui | accounting_periods, budget_lines, budgets, call_for_funds | **GARDER** (étape 3 : génère appels → enchaîne post_budget_call_for_funds) | G-MGR |
| finalize_and_activate_ag | p_ag_id, p_activate | Oui | Oui | ag_meetings, ag_pending_actions, ag_resolutions | **GARDER** (orchestrateur clôture+activation) | G-MGR |

## D. AG — couche BESPOKE qui ne POSTE PAS le GL → ABANDONNER (décision USER)

| fonction | args | DEFINER? | anon? | tables | disposition | garde |
|---|---|---|---|---|---|---|
| generate_combined_calls_from_ag | p_ag_id, p_nb_appels | Oui | Oui | accounting_periods, ag_pending_actions, budget_lines, budgets, call_for_funds, call_for_funds_lines, repartition_key_lines, repartition_keys | **ABANDONNER** (double generate_calls_from_ag_payload, ne passe pas par le GL canonique) | — |
| create_budget_from_ag | p_ag_id, p_exercice, p_postes | Oui | Oui | accounting_periods, accounts, ag_meetings, ag_pending_actions, budget_lines, budgets, repartition_keys | **ABANDONNER** (bespoke, court-circuite activate→post) | — |
| create_alur_fund_from_ag | p_ag_id, p_montant, p_modalites | Oui | Oui | accounting_periods, accounts, ag_meetings, ag_pending_actions, budget_lines, budgets, repartition_keys | **ABANDONNER** (logique ALUR à reposer via chaîne canonique D450-5/C105) | — |
| elect_council_from_ag | p_ag_id, p_membres | Oui | Oui | ag_meetings, ag_pending_actions, council_members | **ABANDONNER** (réimplanter via activate_ag_decisions) | — |
| get_ag_pending_actions | p_ag_id | Oui | Oui | ag_pending_actions, ag_resolutions | **ABANDONNER** (mécanisme ag_pending_actions bespoke) | — |
| mark_ag_action_activated | p_ag_id, p_action_type, p_result_data | Oui | Oui | ag_pending_actions | **ABANDONNER** | — |
| finish_ag_session | p_ag_id | Oui | Oui | ag_meetings, ag_pending_actions, ag_resolutions, budgets, coproprietaires | **ABANDONNER/RÉÉCRIRE** (dépend de pending_actions ; remplacer par finalize_and_activate_ag) | — |

## E. AG — gouvernance / vote / quorum / session → GARDER (durcir gardes)

| fonction | args | DEFINER? | anon? | tables | disposition | garde |
|---|---|---|---|---|---|---|
| create_ag_with_standard_resolutions | p_copro_id, p_title, p_meeting_date, p_location, p_meeting_type | Oui | Oui | accounts, ag_meetings, ag_resolutions | **GARDER** | G-MGR |
| compute_ag_quorum | p_ag_id | Non | Oui | ag_attendance, ag_meetings, lots | **GARDER** | G-DEF-RO |
| compute_majority_threshold | p_majority_type, p_total_tantiemes, p_present_tantiemes, p_total_owners, p_present_owners | Non | Oui | (pur calcul art.24/25/26) | **GARDER** | G-INTERNAL |
| calculate_resolution_result | p_resolution_id | Oui | Oui | ag_attendance, ag_meetings, ag_resolutions, ag_votes, lot_owners | **GARDER** | G-MGR |
| cast_vote | p_resolution_id, p_coproprietaire_id, p_vote, p_vote_source | Oui | Oui | ag_attendance, ag_meetings, ag_resolutions, ag_votes | **RÉÉCRIRE** (bug cast_vote connu en mémoire) | G-MGR (séance) |
| start_ag | p_ag_id, p_opening_notes | Oui | Oui (guard_mgr ✓) | ag_meetings | **GARDER** | G-MGR (déjà présent) |
| close_ag | p_ag_id, p_closing_notes | Oui | Oui | ag_meetings, ag_resolutions | **GARDER** | G-MGR |
| archive_ag | p_ag_id | Non | Oui | ag_meetings | **GARDER** | G-MGR |
| rpc_finalize_ag_session | p_ag_id, p_closing_notes | Oui | Oui (guard_mgr ✓) | ag_meetings | **GARDER** | G-MGR (présent) |
| get_ag_live_results | p_ag_id | Non | Oui | ag_meetings, ag_resolutions, ag_votes | **GARDER** | G-DEF-RO |
| check_convocation_delay | p_ag_id | Non | Oui | ag_meetings | **GARDER** | G-DEF-RO |
| validate_ag_variables | p_ag_id | Non | Oui | ag_resolutions | **GARDER** | G-DEF-RO |
| complete_ag_wizard_step | p_ag_id, p_step, p_next_step | Oui | Oui (auth.uid) | ag_meetings, memberships | **GARDER** (wizard) | G-MGR |
| get_ag_wizard_state | p_ag_id | Oui | Oui (auth.uid) | ag_attendance, ag_meetings, ag_milestones, ag_resolutions, ag_session_drafts, ag_votes, memberships | **GARDER** | G-MGR |
| save_ag_wizard_state | p_ag_id, p_current_step, p_step_data, p_wizard_mode | Oui | Oui | ag_meetings | **GARDER** | G-MGR |
| save_ag_milestone / get_ag_milestones | p_ag_id… | Oui | Oui (auth.uid) | ag_meetings, ag_session_drafts | **GARDER** | G-MGR |
| save_ag_session_draft / get_ag_session_draft / get_ag_all_session_drafts / clear_ag_session_drafts / delete_ag_draft | p_ag_id… | mix | Oui | ag_session_drafts, ag_meetings | **GARDER** (brouillons session) | G-MGR |
| save_ag_envoi_choices / get_ag_envoi_choices | p_ag_id… | Oui | Oui (auth.uid) | ag_meetings, ag_session_drafts | **GARDER** | G-MGR |
| save_ag_envoi_tracking / get_ag_envoi_tracking | p_ag_id… | Non | Oui | ag_envoi_tracking | **GARDER** | G-MGR |
| save_ag_pouvoir / get_ag_pouvoirs / delete_ag_pouvoir / update_ag_pouvoir_justificatif | p_ag_id… | Oui | Oui (guard_mgr ✓ sur 3/4) | ag_pouvoirs, ag_meetings | **GARDER** (pouvoirs/mandats) | G-MGR |
| register_correspondence_vote / register_correspondence_form_votes | p_ag_id, p_coproprietaire_id… | Oui | Oui | ag_correspondence_votes(+details), ag_attendance, ag_votes, lot_owners, lots | **GARDER** (vote par correspondance) | G-MGR (saisie) |
| save_votes_correspondance / get_votes_correspondance | p_ag_id… | Oui | Oui | ag_meetings, ag_resolutions, ag_votes, coproprietaires | **GARDER** | G-MGR |
| get_correspondence_eligible_owners | p_ag_id | Non | Oui | ag_correspondence_*, ag_attendance, ag_votes, coproprietaires, lot_owners, lots | **GARDER** | G-DEF-RO |
| create_ag_notification | p_copro_id, p_ag_id, p_coproprietaire_id, p_notification_type, p_channel, p_document_id | Oui | Oui (auth.uid) | ag_notifications, coproprietaires, documents | **GARDER** (convocation/notif AG) | G-MGR |
| get_ag_recipients / get_ag_sending_stats | p_ag_id… | Non | Oui | ag_meetings, ag_notifications, coproprietaires, lot_owners, lots | **GARDER** | G-DEF-RO/G-MGR |
| mark_notification_sent / mark_notification_failed | p_notification_id… | Oui | Oui | ag_notifications | **GARDER** (callback provider) | G-SVC |
| rpc_get_ag_convocation_bundle | p_ag_id | Non | Oui | ag_meetings, ag_resolutions, coproprietaires, copros, lot_owners, lots | **GARDER** (bundle convocation, pièces obligatoires) | G-DEF-RO |
| rpc_get_ag_pv_bundle | p_ag_id | Oui | Oui (auth.uid) | ag_attendance, ag_meetings, ag_session_drafts, coproprietaires, copros, lot_owners, lots | **GARDER** | G-MGR |
| rpc_get_ag_coproprietaires | p_ag_id | Oui | Oui | ag_meetings | **GARDER** | G-MGR |

## F. Conseil syndical — GARDER (majorité simple propre)

| fonction | args | DEFINER? | anon? | tables | disposition | garde |
|---|---|---|---|---|---|---|
| compute_decision_result | p_decision_id | Oui | Oui | council_decisions, council_members, council_votes | **GARDER/RÉÉCRIRE** (forcer majorité simple distincte des art.24/25/26) | G-OWNER (membre CS) |
| is_council_member | p_copro_id, p_user_id | Oui | Oui | council_members | **GARDER** (helper RLS) | G-INTERNAL |
| is_council_president | p_copro_id, p_user_id | Oui | Oui | council_members | **GARDER** | G-INTERNAL |
| user_is_council_member | p_copro_id | Oui | Oui (auth.uid) | memberships | **GARDER** | G-INTERNAL |

## G. Helpers d'autorisation (RLS) — GARDER (cœur du modèle 3 rôles)

| fonction | args | DEFINER? | anon? | tables | disposition | garde |
|---|---|---|---|---|---|---|
| user_has_copro_access | p_copro_id | Oui | Oui (auth.uid) | memberships | **GARDER** | G-INTERNAL (SECURITY DEFINER nécessaire pour RLS) |
| user_is_copro_manager | p_copro_id | Oui | Oui (auth.uid) | memberships | **GARDER** (pivot du rôle gestionnaire) | G-INTERNAL |
| user_is_lot_owner | p_lot_id | Oui | Oui (auth.uid) | coproprietaires, lot_owners | **GARDER** | G-INTERNAL |
| user_is_lot_owner_in_copro | p_copro_id, p_lot_id | Oui | Oui (auth.uid) | coproprietaires, lot_owners, lots | **GARDER** | G-INTERNAL |
| user_is_lot_owner_or_manager | p_copro_id, p_lot_id | Oui | Oui (guard_mgr ✓) | (helpers) | **GARDER** | G-INTERNAL |
| user_owns_any_lot_in_copro | p_copro_id | Oui | Oui (auth.uid) | coproprietaires, lot_owners | **GARDER** | G-INTERNAL |
| get_user_lot_ids | p_copro_id | Oui | Oui (auth.uid) | coproprietaires, lot_owners | **GARDER** | G-INTERNAL |
| is_conversation_member | p_conversation_id, p_user_id | Oui | Oui | conversation_members | **GARDER** (messagerie interne) | G-INTERNAL |
| can_view_content | p_copro_id, p_visibility, p_user_id | Oui | Oui (guard_mgr+access ✓) | — | **GARDER** | G-INTERNAL |
| can_access_document | p_document_id, p_user_id | Oui | Oui | coproprietaires, copros, council_members, document_access, documents | **GARDER** | G-INTERNAL |
| user_can_view_document | p_document_id | Oui | Oui (guards ✓) | coproprietaires, document_access, documents, lot_owners | **GARDER** | G-INTERNAL |
| get_default_copro_id | (—) | Oui | Oui | copros | **RÉÉCRIRE/ABANDONNER** (helper dev « copro par défaut », dangereux en prod) | G-SVC dev-only ou supprimer |
| ensure_dev_membership | p_copro_id | Oui | Oui (auth.uid) | copros, memberships | **ABANDONNER** (artefact dev, accorde un accès copro automatique) | supprimer en prod |

## H. Mutations / état daté — GARDER, GESTIONNAIRE only (décision USER)

| fonction | args | DEFINER? | anon? | tables | disposition | garde |
|---|---|---|---|---|---|---|
| validate_mutation | p_mutation_id, p_signature_date, p_buyer_* | Oui | Oui | coproprietaires, lot_owners, mutations | **GARDER** | G-MGR (jamais anon) |
| generate_etat_date_payload | p_copro_id, p_mutation_id, p_snapshot_type | Oui | Oui | accounts, call_for_funds(+lines), coproprietaires, copros, ledger_entries, lots, mutations | **GARDER** | G-MGR |
| create_etat_date_snapshot | p_copro_id, p_mutation_id, p_snapshot_type | Oui | Oui (auth.uid) | documents, etat_date_snapshots, lots, mutations | **GARDER** | G-MGR |
| upsert_mutation_step | p_mutation_id, p_step_key, p_status, p_payload | Oui | Oui | mutation_steps, mutations | **GARDER** | G-MGR |

## I. Documents / GED — GARDER

| fonction | args | DEFINER? | anon? | tables | disposition | garde |
|---|---|---|---|---|---|---|
| generate_document_path | p_copro_id, p_category, p_filename | Non | Oui | — | **ABANDONNER** (doublon, surcharge ancienne 3 args) | supprimer |
| generate_document_path | p_copro_id, p_category, p_year, p_file_name | Non | Oui | — | **GARDER** (version 4 args) | G-INTERNAL |
| create_document_system_folders | p_copro_id, p_user_id | Non | Oui | budgets, document_folders, documents, dossiers | **GARDER** | G-MGR |
| create_document_version | p_document_id, … p_user_id | Non | Oui | document_versions, documents | **RÉÉCRIRE/ABANDONNER** (document_versions = table morte signalée en audit) | trancher T-tables |
| calculate_document_expiration | (trigger) | Non | Oui | documents | **GARDER** | G-TRIG |
| update_document_search_text | (trigger) | Non | Oui | — | **GARDER** | G-TRIG |
| prevent_protected_document_deletion | (trigger) | Non | Oui | — | **GARDER** | G-TRIG |

## J. Messagerie interne + mur communautaire — GARDER ; campagnes emailing → ABANDONNER

| fonction | args | DEFINER? | anon? | tables | disposition | garde |
|---|---|---|---|---|---|---|
| mark_conversation_read | p_conversation_id | Oui | Oui (auth.uid) | conversation_members, messages | **GARDER** (messagerie) | G-OWNER (membre conv) |
| update_conversation_last_message | (trigger) | Non | Oui | conversation_members, conversations | **GARDER** | G-TRIG |
| update_wall_post_comments_count | (trigger) | Non | Oui | wall_posts | **GARDER** (mur) | G-TRIG |
| update_wall_post_likes_count | (trigger) | Non | Oui | wall_posts | **GARDER** | G-TRIG |
| create_mail_system_folders | p_copro_id, p_user_id | Oui | Oui | mail_folders | **ABANDONNER** (écrit dans `mail_folders`, table droppée par 08 §5 — bloc mail ; tombe avec le bloc, cf. AUTORISATION §5.2 + T3-A3) | supprimer avec tables |
| generate_campaign_recipients | p_campaign_id | Oui | Oui | coproprietaires, council_members, mail_campaigns, mail_recipients, profiles | **ABANDONNER** (campagnes emailing de masse) | supprimer |
| update_mail_campaign_stats | (trigger) | Non | Oui | mail_campaigns, mail_recipients | **ABANDONNER** (idem campagnes) | supprimer avec tables |

## K. Relances impayés / rappels — GARDER

| fonction | args | DEFINER? | anon? | tables | disposition | garde |
|---|---|---|---|---|---|---|
| create_payment_reminder | p_copro_id, p_lot_id, p_owner_id, … | Oui | Oui (auth.uid) | payment_reminders | **GARDER** (relance lot-centric) | G-MGR/G-SVC |
| get_pending_reminders_to_send | p_copro_id | Oui | Oui | coproprietaires, lots, payment_reminder_rules, payment_reminders | **GARDER** | G-SVC |
| cancel_stale_reminders | p_copro_id | Oui | Oui | lots, payment_reminders | **GARDER** | G-MGR/G-SVC |
| mark_reminder_sent / mark_reminder_failed | p_reminder_id… | Oui | Oui | payment_reminders | **GARDER** (callback) | G-SVC |
| is_reminders_paused | p_copro_id | Oui | Oui | reminder_settings | **GARDER** | G-DEF-RO |
| create_default_reminder_rules | (trigger) | Non | Oui | email_templates, payment_reminder_rules | **GARDER** | G-TRIG |
| create_default_reminder_settings | (trigger) | Non | Oui | reminder_settings | **GARDER** | G-TRIG |

## L. Prestataires / OS / contrats / banque — GARDER (fusion tiers)

| fonction | args | DEFINER? | anon? | tables | disposition | garde |
|---|---|---|---|---|---|---|
| update_service_order_status | p_order_id, p_new_status, p_comment, p_user_id | Oui | Oui (auth.uid) | service_order_events, service_orders | **GARDER** | G-MGR |
| delete_service_order | p_order_id | Oui | Oui | budget_payment_schedules, events, logbook_entries, service_order_events, service_orders | **GARDER** | G-MGR |
| create_logbook_from_service_order | p_order_id | Non | Oui | logbook_entries, service_orders | **GARDER** | G-MGR |
| generate_service_order_number | p_copro_id | Non | Oui | service_orders | **GARDER** | G-INTERNAL |
| is_valid_service_order_transition | p_from_status, p_to_status | Non | Oui | — | **GARDER** | G-INTERNAL |
| update_provider_stats | (trigger) | Non | Oui | logbook_entries, providers | **RÉÉCRIRE** (providers → fusionner dans entité tiers unique avec suppliers) | G-TRIG |
| get_supplier_invoice_paid_amount | p_invoice_id | Non | Oui | supplier_payments | **GARDER** | G-INTERNAL |
| refresh_bank_movement_status | p_movement_id | Non | Oui | bank_matches, bank_movements | **GARDER** (rappro bancaire) | G-MGR |
| update_contract_status_auto | (trigger) | Non | Oui | — | **GARDER** | G-TRIG |

## M. Budgets / répartition — GARDER

| fonction | args | DEFINER? | anon? | tables | disposition | garde |
|---|---|---|---|---|---|---|
| submit_budget | p_budget_id | Non | Oui | budget_lines, budgets, repartition_keys | **GARDER** | G-MGR (via RLS) |
| validate_budget | p_budget_id | Non | Oui | accounting_periods, budget_lines, budgets, repartition_keys | **GARDER** | G-MGR |
| compute_repartition_shares | p_key_id | Non | Oui | repartition_key_lines | **GARDER** | G-INTERNAL |
| repartition_key_is_complete | p_key_id | Oui | Oui | lots, repartition_key_lines, repartition_keys | **GARDER** | G-INTERNAL |

## N. Harnais de test / seed — GARDER (mais G-SVC, hors prod)

| fonction | args | DEFINER? | anon? | tables | disposition | garde |
|---|---|---|---|---|---|---|
| create_test_copro / create_test_copro_seeded | p_tag… | Oui | Oui | copros, lots, accounts, … suppliers | **GARDER** (harnais jetable) | G-SVC, REVOKE anon (jamais en prod publique) |
| create_clean_test_copro / create_clean_test_copro_seeded | p_tag… | Oui | Oui | idem | **GARDER** (clean-path) | G-SVC |
| seed_golden_loop | p_copro_id, p_period_id, p_budget_total, p_unpaid_count | Oui | Oui | (15 tables finance+AG) | **GARDER** (boucle d'or) | G-SVC |

## O. Triggers utilitaires `updated_at` / techniques — GARDER (REVOKE exécution directe)

| fonction | DEFINER? | anon? | disposition | garde |
|---|---|---|---|---|
| handle_updated_at, set_updated_at, trigger_set_updated_at, update_updated_at_column | Non | Oui | **GARDER** mais **CONSOLIDER en UNE seule** (4 doublons fonctionnels) | G-TRIG |
| trg_ag_updated_at, trg_ag_notifications_updated_at, trg_mutations_updated_at, update_ag_pouvoirs_updated_at, update_budget_expenses_updated_at, update_budget_payment_schedules_updated_at, update_mutation_steps_updated_at | mix | Oui | **GARDER** → idéalement remplacer par le trigger générique consolidé | G-TRIG |
| handle_new_user | Oui | Oui | profiles | **GARDER** (trigger auth.users → profiles) | G-TRIG (sur auth) |
| initialize_mutation_steps | Oui | Oui | mutation_steps | **GARDER** | G-TRIG |

## P. Triggers métier intégrité (finance / GL / appels) — GARDER

| fonction | DEFINER? | anon? | tables | disposition | garde |
|---|---|---|---|---|---|
| trg_ledger_tx_immutable, trg_ledger_tx_no_delete_posted, trg_ledger_entry_immutable, trg_ledger_entry_no_insert_posted, trg_ledger_entry_consistency | Non | Oui | ledger_transactions | **GARDER** (immutabilité GL = exigence légale) | G-TRIG |
| trg_enforce_is_postable | Non | Oui | accounts | **GARDER** | G-TRIG |
| enforce_lot_id_on_45x | Non | Oui | accounts | **GARDER** (impose lot_id sur 45x) | G-TRIG |
| check_single_open_period | Non | Oui | accounting_periods | **GARDER** | G-TRIG |
| check_budget_line_copro_consistency | Non | Oui | budget_lines, budgets | **GARDER** | G-TRIG |
| validate_call_for_funds_total | Non | Oui | call_for_funds(+lines) | **GARDER** | G-TRIG |
| validate_payment_allocation | Oui | Oui | call_for_funds_lines, payment_allocations, payments | **GARDER** | G-TRIG |
| trg_update_call_status_from_lines, trg_update_line_from_allocation, update_call_line_status | mix | Oui | call_for_funds(+lines), payment_allocations | **GARDER** | G-TRIG |
| validate_supplier_invoice_total, validate_supplier_payment, update_supplier_invoice_status_after_payment | Oui | Oui | supplier_invoices(+lines), supplier_payments | **GARDER** | G-TRIG |
| check_call_total_integrity, check_invoice_total_integrity, check_payment_allocation_integrity, check_transaction_balance | Non | Oui | (intégrité, lecture) | **GARDER** (assertions d'audit) | G-INTERNAL |

## Q. Triggers AG / OS / divers — GARDER

| fonction | DEFINER? | anon? | disposition | garde |
|---|---|---|---|---|
| trg_ag_attendance_calc_tantiemes, trg_ag_vote_check_duplicate, trg_clear_drafts_on_ag_close | mix | Oui | **GARDER** | G-TRIG |
| trg_notification_event_update_status | Non | Oui | **GARDER** | G-TRIG |

---

## Anomalies notables (preuves pour le redesign)

1. **189/190 exposées anon** — modèle ACL plat, aucun cloisonnement par rôle. RÉÉCRITURE transverse des ACL.
2. **0 fonction ne lit le rôle d'appel** → le bicéphale session-user/service_role décrit dans les décisions n'est PAS implémenté côté fonctions.
3. **Surcharges doublons** : `post_budget_call_for_funds` (×2), `post_supplier_payment` (×2), `generate_document_path` (×2) → garder la version riche, DROP l'ancienne.
4. **Triggers `updated_at` × ~11 variantes** quasi identiques → consolider en 1.
5. **Couche AG bespoke** (`generate_combined_calls_from_ag`, `create_budget_from_ag`, `create_alur_fund_from_ag`, `elect_council_from_ag`, `get/mark_ag_pending_actions`, `finish_ag_session`) double la chaîne canonique sans poster le GL → ABANDONNER.
6. **Artefacts dev en prod** : `ensure_dev_membership`, `get_default_copro_id` accordent un accès copro implicite — à supprimer/G-SVC dev-only.
7. **`providers` vs `suppliers`** coexistent (update_provider_stats vs supplier_*) → fusion entité tiers.
