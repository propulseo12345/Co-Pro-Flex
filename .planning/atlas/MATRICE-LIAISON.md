# MATRICE DE LIAISON — base cible → consommateurs

> **But** : répondre instantanément à « si je touche cette table / cette RPC, qu'est-ce qui casse ? »
> Matrice **inverse** : objet base → écrans / hooks / edges / routes API qui le consomment.
> Sources : `.planning/atlas/front-01..09`, `edge-functions.md`, `api-routes.md`, `data-layer.md` + `db-cible/INVENTAIRE-FONCTIONS.md` (+ `OBJETS-ABANDONNES.md`).
> Lecture seule (2026-06-04). Convention : **F** = front (écran/hook), **E** = edge, **A** = route API.

---

## 0. Mode d'emploi

- Colonne **Consommateurs** = tout ce qui lit/écrit l'objet. Si tu modifies la **signature** ou la **sémantique** de l'objet, ces consommateurs sont les points d'impact à régressser.
- Colonne **Disposition cible** reprise de `INVENTAIRE-FONCTIONS.md` (GARDER / RÉÉCRIRE / ABANDONNER) ou OBJETS-ABANDONNES pour les tables/vues.
- ⚠️ = casse probable lors de la refonte (objet RÉÉCRIRE/ABANDONNÉ touché, ou consommateur branché sur du mort).
- Le **site marketing (zone 09)** ne touche AUCUN objet base → absent de toutes les lignes.

---

## 1. RPC FINANCE — grand livre & appels (domaine 02/03)

| RPC | Dispo cible | Consommateurs (F/E/A) | Impact si touché |
|---|---|---|---|
| `create_ledger_transaction` | RÉÉCRIRE | F `onboarding/[id]` (`useOnboarding`/`onboarding/api`) | ⚠️ retrait du `WHEN OTHERS` change le contrat d'erreur du wizard onboarding |
| `post_budget_call_for_funds` (10 args) | GARDER | F `onboarding/[id]` ; **chaîne AG** via `generate_calls_from_ag_payload` | pivot appels agrégés ; toute génération d'appel passe (ou doit passer) ici |
| `post_call_for_funds` (mono-clé) | **ABANDONNER** (Q.1) | F `appels-fonds` (wizard `createCall`), `lib/finance/api` l.342 ; E `generate_call_for_funds` | ⚠️ **seul chemin de création d'appel réellement posté aujourd'hui** — rebrancher edge sur la 10-args AVANT drop |
| `post_owner_payment` | GARDER | E `record_payment` (← F `appels-fonds/[callId]` `useRecordPayment`) | encaissement lot-centric |
| `allocate_payment` | GARDER | (indirect via `post_owner_payment`) | FIFO par nature |
| `post_supplier_invoice` | GARDER | E `create_supplier_invoice` (**edge CONTOURNÉE** par `factures` → UPDATE direct) | ⚠️ écran factures n'appelle PAS la RPC → pas de GL |
| `post_supplier_payment` (8 args) | GARDER | E `pay_supplier_invoice` (**contournée** idem) | ⚠️ idem factures |
| `set_opening_balance` / `get_opening_balance` | GARDER | F `onboarding/[id]` (reprise de mandat A→D) | cœur reprise de mandat |
| `resolve_lot_tiers_account` | GARDER | F `onboarding/[id]` ; (interne `post_*`) | sous-comptes 450-1..5 |
| `provision_copro_chart` | GARDER | F `onboarding/create` (`createCopropriete`) | seed plan comptable |
| `validate_budget_expense` | RÉÉCRIRE | F `budgets` (dépenses, via `lib/budget/api`) | ⚠️ dépend de migration `budget_expenses.fournisseur`→`tiers_id` |
| `close_period` / `open_next_period` / `approve_period` / `reopen_period` | GARDER | F `comptabilite` (clôture) ; `useAccountingPeriods`/`useActivePeriod` | clôture d'exercice |
| `regularize_period` | RÉÉCRIRE | (clôture comptable — `comptabilite`) | ⚠️ doit ventiler 110/120 (bug actuel : tout en 120) |
| `audit_finance_integrity` | GARDER | F `onboarding/[id]` | audit reprise |
| `fn_dashboard_kpis` | GARDER | F `dashboard` (`useDashboardData`) | complément KPI travaux |
| `recalculate_all_call_statuses` / `update_call_status` | GARDER | (triggers + interne appels) | statut appels |
| `get_owner_statement` | GARDER | E `generate_owner_statement` (relevés) | relevé copropriétaire |
| `refresh_bank_movement_status` | GARDER | (interne rappro) + futur geste `bank_matches` | rappro bancaire |
| `fn_annexe_1..5` (+ `fn_annexe_1_detail_copros`) | GARDER (libellés à corriger) | F `ag/[id]/convocation` (`useConvocationAccountingData`), F `comptabilite` (5 annexes via `AnnexeContext`) | ⚠️ libellés annexes 3/4/5 faux dans le code |

---

## 2. RPC AG — chaîne décisions, gouvernance, session (domaine 04)

| RPC | Dispo cible | Consommateurs (F/E/A) | Impact |
|---|---|---|---|
| `prepare_ag_decisions` | RÉÉCRIRE | (chaîne canonique cible — **pas encore câblée au front**) | cible de rebranchement de `finalisation/` |
| `activate_ag_decisions` | GARDER | F `ag/[id]/pv` (`activate_ag_decisions`) | active décisions votées |
| `generate_calls_from_ag_payload` | RÉÉCRIRE | (chaîne canonique — délègue à `post_budget_call_for_funds`) | ⚠️ ajout maillon ALUR |
| `finalize_and_activate_ag` | GARDER | (orchestrateur cible ; remplace `finish_ag_session`) | point d'entrée unique AG |
| `cast_vote` | RÉÉCRIRE | E `ag_cast_vote` ; F `ag/[id]/session` (votes.api), saisie correspondance | ⚠️ **bug connu** (garde attendance + UNIQUE) |
| `compute_ag_quorum` | GARDER | F `ag/[id]/feuille-presence` ; E `ag_close`, `ag_generate_document` | quorum temps réel |
| `calculate_resolution_result` | RÉÉCRIRE | (post-vote ; via `ag_close`) | ⚠️ ne plus écrire 8 compteurs supprimés |
| `create_ag_with_standard_resolutions` | GARDER | E `ag_create` (← F `ag/new` `createAg`) | création AG |
| `start_ag` / `close_ag` / `rpc_finalize_ag_session` | GARDER | E `ag_start_session` / `ag_close` | cycle de séance |
| `get_ag_live_results` | GARDER | E `ag-get-live-results` (⚠️ **FUITE** service_role) ; F `projector` | résultats live |
| `rpc_get_ag_coproprietaires` | GARDER | F `convocation`, `envoi`, `feuille-presence` | liste convoqués |
| `rpc_get_ag_convocation_bundle` / `rpc_get_ag_pv_bundle` | GARDER | F `envoi` / `pv` | bundles |
| drafts `save/get/clear_ag_session_drafts` | GARDER | F `session`, `pv`, `designation-roles`(mort), `finalisation` | brouillons séance |
| `save_ag_wizard_state` / `get_ag_wizard_state` | GARDER / RÉÉCRIRE | F `envoi` (`save_ag_wizard_state`) | ⚠️ `get_` lit jalons avant DROP `ag_milestones` |
| `save/get_ag_envoi_choices` / `_tracking` | GARDER | F `ag/[id]/envoi` (`useAgEnvoiPage`) | canal légal d'envoi |
| correspondance `register_correspondence_*`, `save/get_votes_correspondance`, `get_correspondence_eligible_owners` | GARDER | F `votes-correspondance(/[coproId]` mort) ; E `ag-register-correspondence-vote` (⚠️ **FUITE CRITIQUE**), `ag-correspondence-eligible` (⚠️ FUITE) | votes papier |
| `register_ag_document` | GARDER | E `ag_generate_document` | enregistre PDF généré |

---

## 3. RPC AUTORISATION / RLS (domaine 01) — transverses

| RPC | Dispo cible | Consommateurs | Impact |
|---|---|---|---|
| `user_is_copro_manager` | RÉÉCRIRE (+cabinet) | E `ag_start_session`, `maintenance-workflow`, `communication-workflow` ; **toutes les policies RLS cibles** | ⚠️ **pivot multi-cabinet** — toucher = impacte tout le cloisonnement |
| `user_has_copro_access` | RÉÉCRIRE (+cabinet) | E `communication-workflow` ; policies RLS | ⚠️ idem |
| `is_council_member` / `is_council_president` | GARDER | E `council-workflow`, `communication-workflow` ; cible `user_can_view_document` | source unique rôle CS |
| `user_can_view_document` | RÉÉCRIRE (A4, colonne `visibility`) | E `get_document_url` ; `lib/documents/api` (l.580/598) | ⚠️ ne dépend plus de `document_access` |
| `user_is_platform_admin()` | **AJOUTER** | (appelé par les 2 helpers ci-dessus) | nouveau, transverse |
| `ensure_dev_membership` | **ABANDONNER** (Q.5) | ⚠️ F `portefeuille` (`usePortefeuille` l.125), `activeCopro.ts` l.94 | ⚠️ **écran en prod-path branché sur artefact DEV** — à retirer |

---

## 4. RPC autres domaines (relances, maintenance, mutations, GED, comm)

| RPC | Dispo cible | Consommateurs | Impact |
|---|---|---|---|
| `get_pending_reminders_to_send` | RÉÉCRIRE | E `run_payment_reminders` | ⚠️ dérive `lots.owner_id` INEXISTANTE en cible |
| `create_payment_reminder` / `mark_reminder_sent/failed` / `cancel_stale_reminders` | GARDER | E `run_payment_reminders`, `send_manual_payment_reminder` (← F `unpaid/reminders`) | relances |
| `is_reminders_paused` | GARDER | F `settings/reminders` (`useFinanceData`) ; E reminders | pause relances |
| `generate_service_order_number` | RÉÉCRIRE | F `service-orders/new` (`createOrder`) ; E `maintenance-workflow` | ⚠️ race COUNT(*)+1 |
| `update_service_order_status` | GARDER | F `service-orders`/`[id]` ; E `maintenance-workflow` | machine à états OS |
| `delete_service_order` | RÉÉCRIRE | F `service-orders` (suppression) | ⚠️ retirer bloc `budget_payment_schedules` avant DROP |
| `create_logbook_from_service_order` | RÉÉCRIRE | E `maintenance-workflow` | ⚠️ renommages `provider_id`→`tiers_id`, `subject`→`title` |
| `upsert_mutation_step` | GARDER | F `ventes/[id]` (`lib/sales/api`) | étapes mutation |
| `generate_etat_date_payload` / `create_etat_date_snapshot` | GARDER | E `generate_etat_date` (← F `ventes/[id]`) | état daté |
| `validate_mutation` | RÉÉCRIRE (loi A3) | E `validate_mutation` (← F `ventes/[id]`) | ⚠️ ne solde pas le 450 ; nouveau `settle_mutation_opposition` |
| `increment_template_usage` | GARDER | F `settings/templates` (`pvTemplateService`) | compteur templates PV |
| `create_document_version` | RÉÉCRIRE (pointeur) | `lib/documents/api` l.408 (`getDocumentVersions` via `v_document_versions`) | versioning GED |
| `assignOwnerToLot` / `upsertRepartitionKeyLine` / `compute_repartition_shares` / `repartition_key_is_complete` | GARDER | F `coproprietaires/lots`, `cles-repartition/*` ; F `onboarding/[id]` | répartition lot-centric |
| `mark_conversation_read` | GARDER | E `communication-workflow` (← F `communication/messagerie`) | lu messagerie |
| `getRepriseResidual` (résidu reprise) | GARDER | F `portefeuille` | alerte reprise mandat |

---

## 5. TABLES & VUES — par domaine, qui les touche

### Finance / GL / appels / paiements
| Objet | Dispo | Consommateurs | Note |
|---|---|---|---|
| `ledger_transactions` / `ledger_entries` | GARDER | F `onboarding/[id]`, `comptabilite` (via `v_general_ledger`) ; RPC `create/post_*` | source légale |
| `v_general_ledger` / `v_trial_balance` | GARDER | F `comptabilite` | GL dérivé |
| `accounting_periods` | GARDER | F `comptabilite`, `onboarding/[id]`, `budgets/validation`, `finalisation` | périodes |
| `accounts` | GARDER | F `comptabilite`, `budgets`, `bank-movements` | plan comptable |
| `budgets` / `budget_lines` | GARDER | F `budgets`(+`[id]`,`/validation`), `budget-works`, `budget-current`, `finalisation`, `onboarding/[id]` ; vues `v_budgets_overview`/`v_budget_lines_overview` | pivot budgets |
| `budget_expenses` | RÉÉCRIRE (reprise `ledger_tx_id`/`tiers_id`) | F `budgets` (`v_budget_expenses_detail`) | ⚠️ objet abandonné en partie |
| `budget_payment_schedules` | **DROP** | (échéanciers — non persistés par `budgets/validation`) ; bloqué par `delete_service_order`/`get_pending_reminders` | ⚠️ DROP séquencé |
| `call_for_funds` (+`_lines`) | GARDER | F `appels-fonds`(+`[callId]`), `budgets` ; vues `v_calls_overview`/`v_call_lines_detailed` | appels |
| `payments` / `payment_allocations` | GARDER | E `record_payment` ; vue `v_payments_overview` | encaissements |
| `bank_movements` | GARDER | F `mouvements-bancaires`, `bank-movements`, `transactions` ; vue `v_bank_movements_overview` ; E `reconcile_bank_movement` | trésorerie |
| `bank_matches` | GARDER (faux mort) | vues `v_bank_movements_overview`/`v_payments_overview` | rappro |
| `supplier_invoices` (+suppliers) | GARDER | F `factures`(+`new`,`[id]`), `invoices/*`(MORT) ; vue `v_supplier_invoices_overview` | ⚠️ UPDATE direct statut (pas de GL) |
| `payment_reminders` (+`_rules`) | GARDER | F `unpaid/reminders`, `settings/reminders` ; E reminders ; vues `v_unpaid_with_reminders`/`v_payment_reminders_overview` | relances |
| `reminder_settings` / `email_templates` | GARDER | F `settings/reminders` ; E reminders, `ag_send_*` | config |
| `alur_transfers` | GARDER (faux mort) | F `fonds-alur` ; vues `v_alur_*` | ALUR |
| `repartition_keys` (+`_lines`) | GARDER | F `cles-repartition/*`, `coproprietaires/lots`, `tantiemes`, `onboarding/[id]` ; vues `v_repartition_key_*` | clés |
| `lots` / `lot_owners` | GARDER | F `coproprietaires`(+`/lots`,`/[id]`), `tantiemes` ; vue `v_lots_with_owners` | unité de gestion |
| `v_unpaid_by_lot` | GARDER | F `unpaid`, `releves-individuels`, `appels-fonds` | impayés |

### AG / gouvernance
| Objet | Dispo | Consommateurs | Note |
|---|---|---|---|
| `ag_meetings` | GARDER | F quasi tous les écrans `ag/**` ; E `ag_*` ; vue `v_ag_overview` | pivot AG |
| `ag_resolutions` | GARDER | F `agenda`, `resolutions/new`, `session` ; E `ag_*` ; vue `v_ag_resolutions_results` | OJ |
| `ag_votes` | GARDER | F `session`, `votes-correspondance` ; E `ag_cast_vote` | votes |
| `ag_attendance` | GARDER | F `feuille-presence`, `designation-roles`(mort) ; E `ag_register_attendance`, `ag_close` | émargement |
| `ag_session_drafts` | GARDER | F `session`, `pv`, `finalisation` | brouillons |
| `ag_envoi_tracking` | GARDER (canal légal cible) | F `envoi` | remplace notifications |
| `ag_pending_actions` | GARDER (CHECK cible) | F `finalisation`(via RPC abandonnées), `onboarding/[id]` | pivot décisions |
| `council_members` | GARDER | F `conseil-syndical` ; E `council-workflow` ; RPC `is_council_member` | CS |
| `rapports_activite_cs` (+sections/annexes) | GARDER | F `conseil-syndical/rapport/[id]` (`rapport-cs.service`) | rapport CS |
| `pv_templates` | GARDER | F `settings/templates`(+`[id]`) (`pvTemplateService`) | modèles PV |

### Maintenance / tiers
| Objet | Dispo | Consommateurs | Note |
|---|---|---|---|
| `providers` → cible **`tiers`** | GARDER (renommage) | F `providers/*`, `directory`, `contracts/new`, `service-orders/new`, `logbook` ; vue `v_providers_overview` | ⚠️ renommage `providers`→`tiers` impacte 6+ écrans |
| `contracts` | GARDER | F `contracts/*`, `logbook`, `service-orders/new` ; vue `v_contracts_overview` ; **store mémoire** `contracts.service` | ⚠️ double source (store mémoire ↔ DB) |
| `service_orders` (+`_events`) | GARDER | F `service-orders/*` ; E `maintenance-workflow` ; vue `v_service_orders_overview` | OS |
| `logbook_entries` | GARDER | F `logbook`, `providers/[id]` ; vue `v_logbook_overview` ; RPC `create_logbook_*` | carnet |

### Mutations / ventes
| Objet | Dispo | Consommateurs | Note |
|---|---|---|---|
| `mutations` (+`mutation_steps`) | GARDER (faux mort câblé) | F `ventes`(+`/nouvelle`,`/[id]`), `/sales`(DOUBLON) ; vues `v_mutations_overview`/`v_mutation_detail` | 2 couches (feature `ventes` vs `lib/sales`) |
| `etat_date_snapshots` | GARDER | F `ventes/[id]` ; E `generate_etat_date` ; vue `v_etat_date_latest` | état daté |

### GED / communication
| Objet | Dispo | Consommateurs | Note |
|---|---|---|---|
| `documents` / `document_folders` / `document_links` | GARDER | F `documents/ged`, `convocation` ; vues `v_documents_with_folder`/`v_folders_with_counts`/`v_documents_stats` ; `lib/documents/api` | GED |
| `mails` | GARDER (faux mort) | F `communication/mail`, hub ; A `/api/mail/send`+`/inbound` ; `useMailbox` | ⚠️ IDs copro/owner en dur |
| `conversations`/`conversation_members`/`messages` | GARDER (faux mort) | F `communication/messagerie` ; E `communication-workflow` | chat |
| `wall_posts`/`wall_likes`/`wall_comments` | GARDER (faux mort) | F `communication/mur`, hub ; E `communication-workflow` | mur |

### Copros / settings / auth
| Objet | Dispo | Consommateurs | Note |
|---|---|---|---|
| `copros` | GARDER (+`cabinet_id` cible) | F `portefeuille`, `dashboard`, `onboarding/*`, `logbook` ; E `ag_*` | ⚠️ FK cabinet NOT NULL ajoutée |
| `coproprietaires` | GARDER | F `coproprietaires`, `service-orders/new`, `onboarding/[id]` ; vue `v_coproprietaires_overview` | ⚠️ vue renvoie doublons |
| `memberships` | GARDER | F `onboarding/create` ; `designation-roles`(mort) | rattachement user↔copro |
| `cabinets` (+`copros.cabinet_id`) | **AJOUTER** | (RLS, helpers §3) — écrans CRUD différés | nouveau multi-cabinet |

---

## 6. OBJETS BASE SANS CONSOMMATEUR (candidats morts)

> Aucun écran / hook / edge / route API ne les lit ou écrit (croisement des 12 atlas). À confirmer fichier par fichier avant DROP.

- **`v_account_balances`** — DROP acté (chemin parallèle au GL, dérivait le 512 des `bank_movements`). Seul résidu : `lib/finance/api` l.1471 (à débrancher).
- **Île `mail_*`** : `v_mail_campaigns_overview`, `v_mail_inbox_overview`, `v_mail_*`, tables `mail_folders` + RPC `create_mail_system_folders`, `generate_campaign_recipients`, `update_mail_campaign_stats` — campagnes emailing de masse, **aucun écran** (la messagerie interne utilise `mails`, distinct). DROP groupé.
- **Table `dossiers`** — DROP acté (A5). Seul consommateur = écran `/dossiers` lui-même MORT (à retirer avec son hook `useDossiers`).
- **RPC AG bespoke hors-GL** (`generate_combined_calls_from_ag`, `create_budget_from_ag`, `create_alur_fund_from_ag`, `elect_council_from_ag`, `finish_ag_session`, `get_ag_pending_actions`, `mark_ag_action_activated`) — consommées UNIQUEMENT par `ag/[id]/finalisation` (écran lui-même à rebrancher sur la chaîne canonique). Après rebranchement = zéro consommateur.
- **Île notifications AG** (`ag_notifications`/`_events` + 5 RPC + `get_ag_recipients`/`get_ag_sending_stats`) — consommées par `useAgNotifications`(`envoi/`) + edges `ag_send_convocations`/`ag_send_relance`/`email_webhook`. **GARDÉ TRANSITOIRE** jusqu'à refacto `email_webhook`→`ag_envoi_tracking` (étape 3), ensuite zéro consommateur légitime.
- **`save_ag_milestone`/`get_ag_milestones` + `ag_milestones`** — île droppée ; lecture à migrer vers `step_data`.
- **`can_access_document`** — DROP sec (référence table `copro_members` inexistante). Aucun consommateur vivant.
- **`ensure_dev_membership` / `get_default_copro_id`** — artefacts DEV ; `ensure_dev_membership` ENCORE branché en prod-path (`portefeuille`, `activeCopro.ts`) → à débrancher AVANT drop.
- **Tables 0-ligne GARDÉES (faux morts, NE PAS droper)** : `insurance_policies`, `technical_documents`, `planned_works`, `collective_loans`/`collective_loan_shares`, `treasury_advances`, `alur_transfers`, `bank_matches`, `mails`/`conversations`/`messages`/`wall_*` — câblées mais vides ; conservées.
- **Tables mortes à droper (cf. v1_audit / cleanup)** : `lot_accounts`, `mail_labels_v2`, `document_versions`(? — `v_document_versions` encore lue l.408, DROP en bloc seulement), `document_access` (DROP A4 après réécriture `user_can_view_document`).

---

## 7. ÉCRANS BRANCHÉS SUR DU MORT (à rebrancher)

> Écrans/hooks qui consomment un objet ABANDONNÉ, une RPC contournée, ou du 100 % mock/local — à rebrancher avant la cible.

| Écran / hook | Objet mort / problème | Action cible |
|---|---|---|
| `ag/[id]/finalisation` | 7 RPC AG bespoke hors-GL (Q.2) | rebrancher sur `prepare→activate_ag_decisions→generate_calls_from_ag_payload→post_budget_call_for_funds` |
| `ag/[id]/envoi` (`useAgNotifications`) | île `ag_notifications` + `get_ag_recipients` | rebrancher sur `ag_envoi_tracking` (étape 3) |
| `conseil-syndical` (`useConseilSyndicalPage`) | table `council_documents` abandonnée | rebrancher sur modèle documentaire GED canonique |
| `factures` (`useFacturesPage`) | UPDATE direct `supplier_invoices.status`, edges `create/pay_supplier_invoice` contournées | passer par les edges → écriture GL D6xx/C401, D401/C512 |
| `appels-fonds` (wizard) | `post_call_for_funds` mono-clé (abandonnée) | repointer sur `post_budget_call_for_funds` (10 args) |
| `portefeuille` + `activeCopro.ts` | `ensure_dev_membership` (artefact DEV) | retirer du prod-path |
| `documents/ged` (`AccessRightsManager`, `useDocumentPermissions`) | `document_access` (DROP A4) + store mémoire mock | refonte confidentialité 3 niveaux (`visibility`) ; persister ACL |
| `maintenance/contracts/*` + `logbook` | store mémoire `contracts.service` (double source) | unifier sur table `contracts` |
| `maintenance/contracts/new`, `logbook/assurances/[id]` | écritures store mémoire (jamais en base) | brancher sur `contracts` / `insurance_policies` |
| `coproprietaires/lots/[id]` | `collective_loans`/`treasury_advances` (faux morts non branchés GL) | brancher emprunt/avances ou masquer sections |
| `etats-dates`, `transfer`, `settings/info`, `conformite/{facturx,ppt,dpe}`, `contentieux/litiges`, `/sales`, `ventes/nouvelle` | **100 % mock / state local / boutons sans handler** | brancher sur lots/owners/GL réels (ou supprimer si hors-scope) |
| `/api/mail/inbound`, `/api/mail/send`, hub comm | `DEFAULT_COPRO_ID`/`DEFAULT_OWNER_ID` en dur (copro gelée 11111111) | résoudre copro/owner via `auth.uid()` |
| `ventes-impayes/impayes`, `contentieux/impayes` | relances simulées (`setTimeout`+`setState`), fallback `MOCK_IMPAYES` | persister via `payment_reminders` (`createPaymentReminder` existe) |

### Écrans MORTS (non routés, à supprimer — pas à rebrancher)
`ag/page.tsx`, `ag/[id]/{minutes,designation-roles,checklist,votes-correspondance/[coproId]}`, `ag/resolutions-preview`, `transactions`, `bank-movements`, `transfer`, `budget-works`, `budget-current`, `budgets/validation`, `invoices/**` (5 pages), `factures/new`(?), `coproprietaires/repartition`, `/dossiers`, `/sales`, `providers/{copro,syndic}` (doublons), `directory`, `onboarding/new`, `maintenance/ppt` (redirects), `conformite/dpe/[coproprieteId]` (404).
