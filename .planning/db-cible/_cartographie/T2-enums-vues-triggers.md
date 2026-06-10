# T2 — Cartographie ENUMS / VUES / TRIGGERS

Source : live CoProFlex (Supabase/Postgres `iyfesbjnkpynmwlsmxnp`), schéma `public`, lecture seule.
Comptages réels : **65 enums** (l'attendu était 67), **82 vues** (`relkind v/m`), **66 triggers** (attendu 74 — l'écart vient probablement de triggers internes/contraintes comptés à part).

---

## 1. ENUMS (65)

### 1.1 Liste complète + valeurs

| enum | valeurs |
|---|---|
| account_type | asset, liability, income, expense, equity |
| ag_draft_type | attendance, votes, roles, resolutions, session, variables, milestones, signataires, envoi, resolution_vars, resolutions_results |
| ag_meeting_type | ordinary, extraordinary, mixed |
| ag_notification_type | convocation, relance, pv, reminder |
| ag_status | draft, convoked, in_progress, session_active, closed, pv_generated, pv_signed, pv_sent, finalized |
| attendance_type | present, proxy, correspondence |
| bank_match_target_type | payment, supplier_payment, other |
| bank_movement_status | unmatched, matched, ignored |
| budget_status | draft, draft_from_ag, pending_approval, submitted, validated, rejected, closed |
| budget_type | current, works, alur |
| call_for_funds_status | draft, issued, partially_paid, paid, cancelled |
| call_line_status | unpaid, partial, paid |
| content_visibility | all_members, council_only, managers_only |
| contract_status | draft, active, to_renew, expired, terminated, archived |
| contract_type | ascenseur, chauffage, nettoyage, menage, espaces_verts, securite, assurance, syndic, eau, electricite, toiture, facade, interphone, portail, juridique, maintenance, autre |
| council_decision_status | draft, submitted, approved, rejected, archived |
| council_doc_link_type | contract, service_order, ag, invoice, budget, other |
| council_role | president, secretary, treasurer, member, observer |
| council_vote_choice | for, against, abstention |
| coverage_mode | all_lots, subset |
| delivery_status | pending, queued, sent, delivered, opened, bounced, failed, cancelled |
| document_category | pv_ag, convocation, reglement, contrat, facture, devis, diagnostic, assurance, budget, appel_fonds, releve_charges, etat_date, courrier, photo, plan, autre, ordre_service, correspondance, carnet_entretien, fiche_synthetique |
| document_confidentiality | public, council, manager, restricted |
| document_source | ag, finance, maintenance, communication, legal, manual |
| document_status | draft, active, archived, expired |
| event_type | ag, reunion_cs, travaux, intervention, fete, autre |
| expense_status | draft, pending_validation, validated, rejected |
| insurance_sub_type | mri, rc_syndicat, do, pj, rc_mandataires, pno, autre |
| intervention_category | courante, travaux_importants |
| intervention_frequency | unique, monthly, bimonthly, quarterly, biannual, annual |
| logbook_entry_type | controle, entretien, incident, visite, travaux, diagnostic |
| lot_type | appartement, studio, commerce, bureau, cave, parking, garage, local_technique, autre |
| mail_campaign_status | draft, scheduled, sending, sent, failed, cancelled |
| mail_delivery_status | pending, sent, delivered, opened, clicked, bounced, failed |
| mail_recipient_type | all, council, by_building, by_floor, custom |
| majority_type | art24, art25, art25_1, art26, art26_1, unanimity |
| membership_role | admin, gestionnaire, membre_cs, coproprietaire, prestataire |
| notification_channel | email, registered_email, postal, registered_postal, hand_delivery |
| payment_method | bank_transfer, card, check, cash, other, direct_debit |
| payment_phase_status | pending, awaiting_invoice, paid |
| payment_status | recorded, reconciled, reversed |
| period_status | open, locked, closed, approved, rejected |
| planned_work_status | identified, planned, voted, in_progress, completed, cancelled |
| planned_work_type | facade, toiture, etancheite, chauffage, ascenseur, electricite, plomberie, espaces_verts, securite_incendie, accessibilite, isolation, menuiserie, parking, autre |
| provider_category | syndic, copropriete, coproflex |
| provider_domain | plomberie, electricite, chauffage, ascenseur, menage, espaces_verts, serrurerie, peinture, assurance, juridique, architecture, toiture, facade, climatisation, interphone, portail, securite, autre |
| reminder_status | pending, sent, failed, stale, skipped |
| repartition_basis | tantiemes, surface, custom |
| repartition_category | general, special, alur |
| resolution_status | draft, pending, voting, voted, approved, rejected, adjourned, withdrawn |
| resolution_type | budget, accounts, works, appointment, contract, rules, other |
| service_order_event_type | created, sent, status_changed, note_added, document_added, invoice_linked, email_sent, reminder_sent |
| service_order_origin | ag, syndic, cs, urgence, contrat |
| service_order_status | draft, to_send, sent, accepted, refused, scheduled, in_progress, completed, invoiced, paid, closed, cancelled |
| service_order_type | classique, contractuel |
| supplier_invoice_status | draft, approved, posted, paid, cancelled |
| technical_doc_type | dta, dpe_collectif, diagnostic_plomb, diagnostic_electricite, diagnostic_gaz, carnet_entretien, controle_ascenseur, controle_chaufferie, controle_incendie, controle_jeux, garantie_decennale, garantie_biennale, plan_copropriete, reglement_copropriete, etat_descriptif, ppt, dtg, audit_energetique, autre |
| transfer_destination | compte_courant, budget_travaux |
| urgency_level | low, normal, medium, high, critical |
| vote_direction | for, against, abstention |
| vote_source | live, correspondence |
| wall_post_category | information, urgent, question, event, other |
| work_priority | urgent, high, medium, low |

### 1.2 Enums redondants / incohérents (à rationaliser dans la DB cible)

- **TRIPLON « pour/contre/abstention »** : `vote_direction`, `council_vote_choice`, et la moitié de `resolution_status` couvrent le même concept. `vote_direction` (for/against/abstention) == `council_vote_choice` (for/against/abstention) à l'identique → **fusionner en un seul `vote_choice`**.
- **`urgency_level` vs `work_priority`** : urgency = {low, normal, medium, high, critical} ; priority = {urgent, high, medium, low}. Échelles qui se chevauchent et incohérentes (urgent≠critical, normal absent de priority). À harmoniser.
- **`vote_source` (live/correspondence) vs `attendance_type` (present/proxy/correspondence)** : redondance partielle sur « correspondence ».
- **`delivery_status` vs `mail_delivery_status`** : deux enums de statut d'acheminement quasi identiques (l'un a `queued/cancelled`, l'autre `clicked`). Candidats fusion.
- **Catégories métier dupliquées** : `contract_type`, `provider_domain`, `planned_work_type`, `technical_doc_type` partagent un large socle (ascenseur, chauffage, toiture, facade, electricite…) → envisager une table de référence unique plutôt que 4 enums divergents.
- **`period_status`** déclare `locked/closed/rejected` alors que la mémoire projet (`wp5_1_periode_anouveau`) a tranché un **modèle binaire `open` + `approved`** : les valeurs `locked/closed/rejected` sont du legacy à droper.
- **`budget_status`** : `draft` + `draft_from_ag` + `submitted` + `pending_approval` = trop d'états quasi synonymes pour le workflow réel.

---

## 2. VUES (82)

`v_general_ledger` et `v_lot_balance` / `v_trial_balance` sont la **chaîne de dérivation finance** depuis la source unique `ledger_entries`/`ledger_transactions`. Toutes les vues finance ci-dessous doivent rester cohérentes avec le grand livre.

### 2.1 Vues FINANCE critiques (dérivent du grand livre — GARDER, ne pas diverger)

| vue | rôle | sources | verdict |
|---|---|---|---|
| **v_general_ledger** | Grand livre lisible : 1 ligne/écriture avec debit/credit dérivés de `direction`, libellés compte/lot/auteur | accounts, ledger_entries, ledger_transactions, lots, profiles | **GARDER (pivot finance)** |
| **v_trial_balance** | Balance par compte/période (somme débit − crédit), filtre `status='posted'` | accounting_periods, accounts, ledger_entries, ledger_transactions | **GARDER (balance légale)** |
| **v_lot_balance** | Solde par LOT (lot-centric) sur comptes `450%`/`459%`, `status='posted'` | accounts, coproprietaires, ledger_entries, ledger_transactions, lot_owners, lots | **GARDER (cœur lot-centric)** |
| v_owner_balance | Solde par copropriétaire = agrégation de v_lot_balance | v_lot_balance | GARDER (dérivée propre) |
| v_lot_avance | Avances/à-nouveau par lot depuis GL | accounts, ledger_entries, ledger_transactions, lots | GARDER |
| v_general_ledger_by_account_class | GL agrégé par classe de compte | accounts, ledger_entries, ledger_transactions | GARDER |
| v_account_movements | Mouvements par compte via v_general_ledger | v_general_ledger | GARDER |
| v_budget_consumption_by_account | Engagé/réalisé budget vs GL (classe 6) par compte | accounting_periods, accounts, budget_lines, budgets, ledger_entries, ledger_transactions | GARDER (engagé/réalisé) |
| v_dashboard_kpis | KPIs dashboard (trésorerie, impayés…) | accounting_periods, accounts, ag_meetings, budget_lines, budgets, copros, ledger_entries, ledger_transactions, v_unpaid_by_lot | GARDER (revérifier cohérence GL) |

### 2.2 Vues de RÉCONCILIATION / INTÉGRITÉ (gardes-fous — GARDER)

| vue | rôle | verdict |
|---|---|---|
| **v_finance_integrity_issues** | Méta-vue qui détecte les écarts (call total mismatch, invoice mismatch, lot vs GL…) ; UNION de plusieurs contrôles | **GARDER (red-team intégrité)** |
| **v_lot_vs_gl_mismatch** | ALERTE : compare solde « relevé » (call_for_funds_lines) au solde GL (v_lot_balance). C'est exactement le point de vigilance « finance dérivée » : relevé ≠ grand livre = bug | **GARDER** |
| v_call_total_mismatch | Écart total appel vs somme des lignes | GARDER |
| v_call_vs_budget_mismatch | Écart appel vs budget voté | GARDER |
| v_invoice_total_mismatch | Écart facture fournisseur vs lignes | GARDER |
| v_payment_allocation_issues | Allocations de paiement incohérentes | GARDER |
| v_supplier_payment_issues | Paiements fournisseurs incohérents | GARDER |

⚠️ **Point d'attention majeur** : `v_account_balances` calcule le solde des comptes `5%` (trésorerie) à partir de **`bank_movements`**, PAS du grand livre. C'est une source PARALLÈLE au GL → risque de divergence avec `v_trial_balance`. À réconcilier dans la DB cible (la trésorerie devrait se dériver des écritures 512, pas seulement des mouvements bancaires importés).

### 2.3 Autres vues finance/appels (GARDER, à valider cohérence)

v_calls_overview, v_calls_collection_stats, v_call_campaigns, v_call_lines_detailed, v_unpaid_by_lot, v_unpaid_lots, v_unpaid_with_reminders, v_owner_financial_summary, v_owner_statement_lines, v_owner_statement_lines_by_period, v_owner_statement_summary, v_payments_overview, v_supplier_invoices_overview, v_alur_fund_summary, v_alur_lot_contributions, v_alur_transfers_history, v_bank_movements_overview, v_budgets_overview, v_budgets_summary, v_budget_lines_detailed, v_budget_lines_overview, v_budget_expenses_detail, v_repartition_key_totals, v_repartition_key_lines_detailed, v_accounting_periods.

⚠️ **v_owner_statement_*** (3 vues, ~3,5-3,8k chars chacune) et **v_unpaid_*** dérivent le solde copropriétaire depuis **call_for_funds_lines** (relevé), pas depuis v_lot_balance (GL). Même risque que §2.2 : deux chemins pour le « combien doit ce copro ». La DB cible doit choisir **GL = source unique** (cf. mémoire `ledger_account_model`).

### 2.4 Vues métier non-finance (GARDER — domaines AG, doc, maintenance, comm)

AG : v_ag_attendance_summary, v_ag_correspondence_status, v_ag_drafts_progress, v_ag_overview, v_ag_resolution_vote_summary, v_ag_resolutions_results, v_ag_vote_stats_by_resolution, v_ag_votes_detailed.
Copro/lots : v_coproprietaires_overview, v_lots_with_owners, v_copro_tantiemes, v_council_members, v_council_decisions_overview.
Doc/GED : v_accessible_documents, v_documents_by_category, v_documents_expiring, v_documents_stats, v_documents_with_folder, v_folders_with_counts, v_recent_documents, v_document_versions.
Maintenance/presta : v_contracts_overview, v_contracts_alerts, v_logbook_overview, v_logbook_alerts, v_maintenance_stats, v_providers_overview, v_service_orders_overview.
Mutations : v_mutation_detail, v_mutations_overview, v_etat_date_latest.
Comm/dashboard : v_conversation_messages, v_conversations_overview, v_mail_campaigns_overview, v_mail_inbox_overview, v_wall_feed, v_events_overview, v_dashboard_recent_activity, v_dashboard_todos, v_payment_reminders_overview.

### 2.5 Candidats DROP / à surveiller

- **v_document_versions** → dépend de `document_versions`, table identifiée comme MORTE dans la mémoire projet (`v1_audit_reconciled` liste `document_versions` à droper). **DROP la vue avec la table.**
- **v_account_balances** → ne pas garder telle quelle : à reconstruire sur le GL (cf. §2.2) ou DROP si redondante avec v_trial_balance.
- Doublons « overview/alert » dérivés d'une autre vue (v_contracts_alerts←v_contracts_overview, v_logbook_alerts←v_logbook_overview, v_unpaid_lots←v_lot_balance) : OK à garder mais candidats à inliner si on simplifie.

---

## 3. TRIGGERS (66)

### 3.1 Classe « updated_at » (horodatage — GARDER, technique)

Au moins **8 fonctions différentes** font la MÊME chose (timestamp updated_at), preuve de la dette de doublons :
`handle_updated_at`, `trigger_set_updated_at`, `set_updated_at`, `update_updated_at_column`, `trg_ag_updated_at`, `update_*_updated_at` (par table), `trg_mutations_updated_at`, `update_ag_pouvoirs_updated_at`, `update_budget_expenses_updated_at`, etc.

Tables concernées : accounting_periods, ag_attendance, ag_meetings, ag_notifications, ag_pouvoirs, ag_resolutions, buildings, budget_expenses, budget_payment_schedules, contracts(updated), conversations, coproprietaires, copros, council_decisions, council_members, documents, dossiers, events, insurance_policies, lots, mail_* (5 tables), messages, mutations, mutation_steps, payment_reminder_rules, planned_works, profiles, reminder_settings, supplier_invoices, technical_documents, wall_comments, wall_posts.

→ **GARDER le comportement** mais **CONSOLIDER en UNE seule fonction `set_updated_at()`** dans la DB cible (au lieu de 8+). Migration d'hygiène, pas de perte fonctionnelle.

### 3.2 Classe VALIDATION / INTÉGRITÉ (critiques — GARDER)

| table | trigger | fonction | événement | rôle |
|---|---|---|---|---|
| **ledger_entries** | trg_enforce_lot_id_on_45x | enforce_lot_id_on_45x | BEFORE I/U | **Force lot_id sur comptes 45x (règle lot-centric)** |
| **ledger_entries** | enforce_is_postable | trg_enforce_is_postable | AFTER I/U | Compte doit être postable |
| **ledger_entries** | trg_ledger_entry_consistency | trg_ledger_entry_consistency | BEFORE I/U | Cohérence écriture (direction/montant) |
| **ledger_entries** | trg_ledger_entry_before_insert | trg_ledger_entry_no_insert_posted | BEFORE I | Interdit insert sur tx déjà posted |
| **ledger_entries** | trg_ledger_entry_before_update/delete | trg_ledger_entry_immutable | BEFORE U/D | **Immutabilité du grand livre** |
| **ledger_transactions** | trg_ledger_tx_before_update | trg_ledger_tx_immutable | BEFORE U | Immutabilité tx |
| **ledger_transactions** | trg_ledger_tx_before_delete | trg_ledger_tx_no_delete_posted | BEFORE D | Interdit delete tx posted |
| **accounting_periods** | enforce_single_open_period | check_single_open_period | BEFORE I/U | **Une seule période ouverte** (modèle binaire WP5.1) |
| call_for_funds_lines | trg_validate_call_total | validate_call_for_funds_total | AFTER I/U/D | Somme lignes = total appel |
| call_for_funds_lines | trg_call_line_status / trg_call_line_update_status | update_call_line_status / trg_update_call_status_from_lines | BEFORE+AFTER | Statut payé/partiel dérivé |
| payment_allocations | trg_validate_payment_allocation | validate_payment_allocation | BEFORE I/U | Validation imputation paiement |
| supplier_invoice_lines | trg_validate_invoice_total | validate_supplier_invoice_total | AFTER I/U/D | Somme lignes = total facture |
| supplier_payments | trg_validate_supplier_payment | validate_supplier_payment | BEFORE I/U | Validation paiement fournisseur |
| budget_lines | trg_budget_line_copro_consistency | check_budget_line_copro_consistency | BEFORE I/U | Cohérence copro_id ligne/budget |
| documents | trg_prevent_document_deletion | prevent_protected_document_deletion | BEFORE D | Protection docs légaux |
| ag_votes | trg_ag_vote_check | trg_ag_vote_check_duplicate | BEFORE I | Anti double-vote |

→ **TOUS À GARDER** : ce sont les garde-fous de la compta d'engagement et de la règle lot-centric. Ce sont le socle de la DB cible.

### 3.3 Classe DÉRIVATION / EFFET DE BORD (GARDER, vérifier)

- payment_allocations → trg_allocation_update_line (maj amount_paid de la ligne d'appel)
- supplier_payments → trg_update_invoice_status_after_payment
- ag_attendance → trg_ag_attendance_tantiemes (calcule tantièmes présents)
- ag_meetings → trg_ag_close_clear_drafts (purge brouillons à la clôture AG — lié au mécanisme ag_pending_actions)
- ag_notification_events → trg_notification_event_status
- contracts → trg_contract_status_auto (statut auto draft/active/expired)
- documents → trg_document_expiration + trg_document_search_text (calcul expiration + full-text)
- logbook_entries → trg_update_provider_stats
- mail_recipients → trg_mail_recipients_stats ; messages → trg_conversation_last_message
- mutations → tr_mutation_init_steps (initialise les étapes) ; wall_comments/wall_likes → compteurs
- copros (INSERT) → tr_create_default_reminder_rules + tr_create_reminder_settings (seed à la création)

### 3.4 Candidats DROP / vigilance triggers

- **budget_expenses** (tr_budget_expenses_updated_at) : table `budget_expenses` flaggée « à requalifier en engagement » (mémoire `compta_engage_realise`). Si la table disparaît/fusionne, le trigger et les vues v_budget_expenses_detail/v_budget_lines_overview suivent.
- **Doublons updated_at** (§3.1) : consolidation = 1 fonction unique → suppression de ~10 fonctions redondantes.
- Doublons fonctionnels potentiels : `trg_call_line_status` (BEFORE) **et** `trg_call_line_update_status` (AFTER) sur la même table call_for_funds_lines — vérifier qu'ils ne se marchent pas dessus (l'un fixe le statut de la ligne, l'autre celui de l'appel parent : OK a priori, mais à documenter).
- ag_pouvoirs porte 2 triggers updated_at (ag_pouvoirs_updated_at + trg_ag_pouvoirs_updated) → **doublon strict, en droper un.**

---

## 4. Synthèse pour la DB cible

1. **Finance = un seul chemin** : tout solde (lot, copro, trésorerie) doit dériver de `ledger_entries`/`ledger_transactions` via v_general_ledger → v_lot_balance → v_trial_balance. Réconcilier/retirer les vues qui passent par `bank_movements` (v_account_balances) ou par `call_for_funds_lines` (v_owner_statement_*, v_unpaid_*) en doublon du GL.
2. **Garder intacts** les triggers d'immutabilité GL, enforce_lot_id_on_45x, single_open_period, et toutes les validations de totaux : c'est le contrat comptable.
3. **Hygiène** : consolider les ~10 fonctions updated_at en une seule ; supprimer le doublon de trigger sur ag_pouvoirs ; droper v_document_versions (+ table morte).
4. **Enums** : fusionner les triplons de vote (vote_direction/council_vote_choice), harmoniser urgency/priority et les 2 delivery_status, et purger les valeurs legacy de period_status (locked/closed/rejected) et budget_status.
