# INVENTAIRE DES FONCTIONS — db-cible (consolidé)

Source : `_cartographie/T1-fonctions.md` (190 fonctions live `iyfesbjnkpynmwlsmxnp`) + sections « FONCTIONS / TRIGGERS » des blueprints `01`→`08`.
Statut = disposition finale arbitrée par domaine. Lecture seule sur le live.

## Synthèse chiffrée (live = 190 fonctions)

| Disposition | Nb | Sens |
|---|---|---|
| **GARDER** (dont durcissement garde uniquement) | **126** | sémantique conservée, on REVOKE anon + garde in-function |
| **RÉÉCRIRE** | **20** | logique à corriger (bug, repointage colonne/FK, séquençage drop) |
| **ABANDONNER** | **27** | doublons, bespoke hors-GL, artefacts dev, îles droppées |
| **AJOUTER (nouvelles)** | **10** | n'existent pas au live, requises par la cible (dont 2 helpers multi-cabinet) |

> Total live traité = 173 (126 G + 20 R + 27 A). Les ~17 restantes du live sont des **triggers `updated_at` variantes consolidés** (4+7 fusionnés en 1 `set_updated_at`) et des helpers déjà comptés sous leur famille.

## Garde transverse (s'applique à TOUTE fonction GARDÉE/RÉÉCRITE)
- **Défaut deny-by-default** : `REVOKE EXECUTE FROM anon, public` ; `GRANT authenticated` (+ `service_role` si appel machine).
- **G-MGR** : `IF NOT user_is_copro_manager(p_copro_id) THEN RAISE` (écriture gestionnaire).
- **G-OWNER** : copropriétaire sur SES lots / sa conversation.
- **G-MIXTE** : `user_is_lot_owner_or_manager`.
- **G-SVC** : `service_role` only (callbacks providers, harnais CI).
- **G-DEF-RO** : DEFINER lecture seule + contrôle accès copro.
- **G-INTERNAL** : helper SQL pur, REVOKE anon, pas de garde métier.
- **G-TRIG** : trigger interne, `REVOKE EXECUTE FROM PUBLIC, anon, authenticated`.

**Constat critique corrigé** : 189/190 fonctions live sont exposées `anon`, 0 ne lit le rôle d'appel. Le schéma cible câble RLS ON + FORCE et le patron deny-by-default sur l'ensemble.

---

## A. Chaîne finance canonique — grand livre (domaine 02)

| Fonction | Disposition | Garde | Contrat (tables/colonnes) |
|---|---|---|---|
| `create_ledger_transaction` | **RÉÉCRIRE** (retirer `WHEN OTHERS THEN success:false` → laisser l'exception remonter) | G-MGR + G-SVC | `ledger_transactions`, `ledger_entries` ; route canonique d'écriture GL |
| `post_ledger_transaction` | **RÉÉCRIRE** (idem, retirer le `WHEN OTHERS` masquant) | G-MGR + G-SVC | `accounting_periods`, `ledger_entries`, `ledger_transactions` |
| `post_budget_call_for_funds` (10 args) | **GARDER** | G-MGR | appel agrégé `D450-x/lot` · `C701/702/105` ; répartition « plus grand reste » |
| `post_owner_payment` | **GARDER** | G-MGR | `payments`, `payment_allocations`, `call_for_funds(+lines)` ; encaissement lot-centric + FIFO cloisonné par nature |
| `allocate_payment` | **GARDER** (INVOKER, via RLS) | G-MGR | `payments`, `payment_allocations`, `call_for_funds_lines` ; FIFO par nature, ne poste PAS le GL |
| `post_supplier_invoice` | **GARDER** (adapter `supplier_id → tiers_id`) | G-MGR | `supplier_invoices(+lines)`, `accounts` ; B en 2 temps D6xx/C401 |
| `post_supplier_payment` (8 args, idempotent) | **GARDER** | G-MGR | `supplier_payments`, `supplier_invoices` ; D401/C512 |
| `set_opening_balance` / `get_opening_balance` | **GARDER** | G-MGR / G-DEF-RO | reprise de mandat (A→D) |
| `post_period_cutoff` / `reverse_period_cutoff` | **GARDER** | G-MGR | `period_cutoff_items`, `ledger_*` ; cut-off 408/486 |
| `cutoff_entry_pair` | **GARDER** | G-INTERNAL | helper jsonb cut-off |
| `open_next_period` / `close_period` / `approve_period` / `reopen_period` | **GARDER** | G-MGR | `accounting_periods` ; reopen interdit si approved ; à-nouveau AVANT affectation |
| `regularize_period` | **RÉÉCRIRE** (ventiler `result_allocation` D120/C450-1 ET D110/C450-2 par quote-part ; appeler `assert_result_allocation_split` en fin → rollback si non ventilé) | G-MGR | `ledger_*`, `repartition_keys(+lines)` ; invariant 110/120 |
| `get_period_for_date` | **GARDER** | G-DEF-RO | helper cut-off |
| `is_ledger_regen_exempt` | **GARDER** | G-INTERNAL | liste blanche immutabilité |
| `resolve_lot_tiers_account` | **GARDER** (s'appuie sur `accounts.nature`, fin du parsing `code`) | G-INTERNAL | sous-comptes `450-1..5` par nature + `lot_id` |
| `provision_copro_chart` | **GARDER** (seule déjà sans anon = modèle) | G-MGR | `accounts`, `copros` |
| `validate_budget_expense` | **RÉÉCRIRE** (son libellé C401 fait `COALESCE(v_exp.fournisseur, v_exp.label)` ; colonne `budget_expenses.fournisseur` SUPPRIMÉE en cible 03 §1.3 → résoudre le nom via `SELECT name FROM tiers WHERE id = v_exp.tiers_id`, fallback `v_exp.label` ; à séquencer avec la migration `fournisseur`→`tiers_id`) | G-MGR | `budget_expenses`, `accounts`, `tiers`, GL ; poste réalisé D6xx/C401, écrit `ledger_tx_id` immuable, FK→`tiers` |
| `recalculate_all_call_statuses` / `update_call_status` | **GARDER** | G-MGR / G-INTERNAL | `call_for_funds(+lines)` |
| `get_owner_statement` | **GARDER** | G-MIXTE | relevé, dérive solde par somme des lots |
| `fn_dashboard_kpis` / `calculate_budget_projection` / `audit_finance_integrity` | **GARDER** | G-DEF-RO / G-MGR | KPI/projection/audit dérivés du GL |
| `refresh_bank_movement_status` | **GARDER** | G-MGR | `bank_movements`, `bank_matches` ; rappro bancaire (intrant, ne poste pas le GL) |

## B. Annexes comptables légales (domaine 02) — toutes GARDER

`fn_annexe_1`, `fn_annexe_1_detail_copros`, `fn_annexe_2`, `fn_annexe_3` (ventilation par clés), `fn_annexe_4` (travaux terminés), `fn_annexe_5` (travaux non clôturés) → **GARDER**, garde **G-DEF-RO** (passer DEFINER + accès copro), **corriger les libellés** (annexes 3/4/5). Source = `ledger_entries`/`accounts`/`budgets`/`repartition_keys`.

## C. AG — chaîne canonique qui poste le GL (domaine 04)

| Fonction | Disposition | Garde | Contrat |
|---|---|---|---|
| `prepare_ag_decisions` | **RÉÉCRIRE** (corriger `target_table` legacy : `ELECT_COUNCIL→council_members`, `CREATE_*BUDGET→budgets`, `SCHEDULE_*/CREATE_EXCEPTIONAL_CALL/ALUR→call_for_funds` ; ne plus émettre de pivot pour APPROVE_ACCOUNTS/DESIGNATE_BUREAU/GRANT_QUITUS/APPOINT_SYNDIC) | G-MGR | écrit `ag_pending_actions` (CHECK §1.6 cible) |
| `activate_ag_decisions` | **GARDER** (étape 2, dispatch) | G-MGR | `budgets`, `contracts`, `council_members`, `accounting_periods` |
| `generate_calls_from_ag_payload` | **RÉÉCRIRE** (intégrer le maillon ALUR D450-5/C105) | G-MGR | délègue à `post_budget_call_for_funds` ; idempotent |
| `finalize_and_activate_ag` | **GARDER** (orchestrateur, point d'entrée unique) | G-MGR | `ag_meetings`, `ag_resolutions`, `ag_pending_actions` |

## D. AG — gouvernance / vote / session / correspondance / envoi (domaine 04) — GARDER

| Fonction | Disposition | Garde |
|---|---|---|
| `compute_ag_quorum` | **GARDER** | G-DEF-RO |
| `compute_majority_threshold` (IMMUTABLE, art.24/25/26) | **GARDER** | G-INTERNAL |
| `calculate_resolution_result` | **RÉÉCRIRE** (n'écrit plus les 8 compteurs dénormalisés supprimés ; garde status/voted_at/threshold) | G-MGR |
| `cast_vote` | **RÉÉCRIRE** (bug connu ; garde attendance + UNIQUE) | G-MGR |
| `create_ag_with_standard_resolutions` | **GARDER** | G-MGR |
| `start_ag` / `close_ag` / `rpc_finalize_ag_session` | **GARDER** | G-MGR |
| `archive_ag` | **GARDER** (fonctionne une fois `archived` dans l'enum) | G-MGR |
| `get_ag_live_results` / `check_convocation_delay` / `validate_ag_variables` | **GARDER** | G-DEF-RO |
| `complete_ag_wizard_step` / `save_ag_wizard_state` | **GARDER** | G-MGR |
| `get_ag_wizard_state` | **RÉÉCRIRE** (lire les jalons depuis `ag_session_drafts`/`step_data` AVANT le DROP de `ag_milestones`) | G-MGR |
| drafts (`save/get/clear_ag_session_drafts`, `delete_ag_draft`, `get_ag_all_session_drafts`) | **GARDER** | G-MGR |
| pouvoirs (`save/get/delete_ag_pouvoir`, `update_ag_pouvoir_justificatif`) | **RÉÉCRIRE→fusion** dans les RPC `ag_attendance` | G-MGR |
| correspondance (`register_correspondence_vote`/`_form_votes`, `save/get_votes_correspondance`, `get_correspondence_eligible_owners`) | **GARDER** | G-MGR / G-DEF-RO |
| envoi (`save/get_ag_envoi_tracking`, `save/get_ag_envoi_choices`) | **GARDER** | G-MGR |
| bundles (`rpc_get_ag_convocation_bundle`, `rpc_get_ag_pv_bundle`, `rpc_get_ag_coproprietaires`) | **GARDER** | G-DEF-RO / G-MGR |
| `save_ag_milestone` / `get_ag_milestones` | **ABANDONNER** (île `ag_milestones` droppée — migrer lecture vers `step_data`) | — |

> **Notifications AG — GARDÉ TRANSITOIRE → DROP étape 3** : `create_ag_notification`, `mark_notification_sent`, `mark_notification_failed`, `get_ag_recipients`, `get_ag_sending_stats` écrivent l'île `ag_notifications`/`_events`. **NE PAS droper** tant que l'edge `email_webhook` n'est pas refacto vers `ag_envoi_tracking` (AUTORISATION §5.2.1, étape 3). Date de péremption = étape transitoire 3. Voir section ABANDONNÉES.

## E. Conseil syndical (domaine 04)

| Fonction | Disposition | Garde |
|---|---|---|
| `compute_decision_result` | **RÉÉCRIRE** (forcer majorité simple : for>against, quorum = moitié membres actifs, distincte art.24/25/26) | G-OWNER (membre CS) |
| `is_council_member` / `is_council_president` | **GARDER** (source unique du rôle CS) | G-INTERNAL |

## F. Helpers d'autorisation RLS (domaine 01) — GARDER (multi-cabinet centralisé)

> **MULTI-CABINET (décision USER) — le cloisonnement par cabinet est CENTRALISÉ dans ces 2 helpers.** Les policies de domaine appellent ces helpers et n'ont PAS à gérer le cabinet directement. Couche schéma+RLS posée dès la cible ; écrans CRUD cabinet + invitation gestionnaires différés (finance d'abord).

| Fonction | Disposition | Garde | Contrat / changement multi-cabinet |
|---|---|---|---|
| `user_has_copro_access` | **RÉÉCRIRE** (intégrer le périmètre cabinet) | G-INTERNAL | accès = (gestionnaire du **cabinet propriétaire de la copro** : `copros.cabinet_id` ∈ cabinets du user) OU copropriétaire d'un lot OU `platform_admin` (transverse) |
| `user_is_copro_manager` | **RÉÉCRIRE** (pivot rôle gestionnaire = role ∈ {gestionnaire, platform_admin} ; **+ vérif `copros.cabinet_id` ∈ cabinets du gestionnaire**) | G-INTERNAL | un gestionnaire ne pilote QUE les copros de SON cabinet ; `platform_admin` transverse |

`user_is_lot_owner`, `user_is_lot_owner_in_copro`, `user_is_lot_owner_or_manager`, `user_owns_any_lot_in_copro`, `get_user_lot_ids`, `is_conversation_member`, `can_view_content` → **GARDER**, garde **G-INTERNAL** (DEFINER nécessaire RLS, REVOKE anon). Opérants dès câblage `coproprietaires.user_id`. `user_can_view_document` → **RÉÉCRIRE** (voir §J : confidentialité GED simple A4, sans `document_access`).

**Nouveau helper transverse (voir §P)** : `user_is_platform_admin()` — appelé par les 2 helpers ci-dessus (bypass cabinet). Le cloisonnement cabinet reste **inline** dans `user_has_copro_access`/`user_is_copro_manager` (comparaison `profiles.cabinet_id = copros.cabinet_id`), sans helper cabinet dédié (cf. AUTORISATION §4).

## G. Budgets / répartition (domaines 01 & 03)

| Fonction | Disposition | Garde |
|---|---|---|
| `compute_repartition_shares` (cœur lot-centric : lot_id, weight, share_pct) | **GARDER** | G-INTERNAL |
| `repartition_key_is_complete` (invariant migration) | **GARDER** | G-INTERNAL |
| `submit_budget` / `validate_budget` | **GARDER** | G-MGR (via RLS) |

## H. Relances impayés (domaine 03) — GARDER

`get_pending_reminders_to_send` (**RÉÉCRIRE**, G-DEF-RO — son corps dérive le propriétaire via `c.id = l.owner_id`, colonne `lots.owner_id` INEXISTANTE en cible §1.3 ; remplacer par `lot_owners lo ON lo.lot_id = ul.lot_id AND lo.is_primary AND lo.end_date IS NULL` puis `coproprietaires c ON c.id = lo.coproprietaire_id`, idéalement consommer `v_unpaid_by_lot` qui expose déjà owner_name/email — sinon aucune relance calculable), `create_payment_reminder` (G-MGR), `mark_reminder_sent`/`mark_reminder_failed` (G-MGR, callback → G-SVC), `cancel_stale_reminders` (G-MGR), `is_reminders_paused` (G-DEF-RO). Triggers seed `create_default_reminder_rules` (LIT `email_templates` par `code`) / `create_default_reminder_settings` → **GARDER** (G-TRIG).

## I. Mutations / état daté (domaine 05)

| Fonction | Disposition | Garde | Contrat |
|---|---|---|---|
| `upsert_mutation_step` | **GARDER** (+ renseigne `completed_by=auth.uid()`) | G-MGR | `mutation_steps` |
| `generate_etat_date_payload` | **GARDER** (lit `v_owner_statement_*`, `ledger_entries`+`accounts(105%)`, `call_for_funds(+lines)`) | G-MGR | contrat croisé art.20 |
| `create_etat_date_snapshot` | **GARDER** | G-MGR | `etat_date_snapshots`, `documents` |
| `validate_mutation` | **RÉÉCRIRE (loi A3)** : change `lot_owners` (clôt le vendeur à `effective_date`, ouvre l'acquéreur), NE solde PAS le 450 (reste sur le lot), NE poste aucun transfert. Le recouvrement passe par `settle_mutation_opposition` (`source_type='mutation'`, D512/C450-x art.20). ALUR inchangé. | G-MGR | `lot_owners`, `mutations` |
| `initialize_mutation_steps` (trigger) | **GARDER** | G-TRIG | seed 6 steps |

## J. Documents / GED (domaine 06)

| Fonction | Disposition | Garde | Contrat |
|---|---|---|---|
| `create_document_system_folders` | **RÉÉCRIRE** (remplacer `category_default='correspondance'` → `'courrier'`, sinon seed cassé après migration enum) | G-MGR | `document_folders` uniquement |
| `create_document_version` | **RÉÉCRIRE** (modèle pointeur : snapshot → `document_versions`, bump `current_version_no`) | G-MGR | `document_versions` = source unique de versioning |
| `generate_document_path` (4 args) | **GARDER** | G-INTERNAL | format canonique `ged/copro/category/year/file` |
| `user_can_view_document` | **RÉÉCRIRE (A4 acté)** : confidentialité GED **SIMPLE** par document via colonne `visibility` {gestionnaire seul / + conseil syndical / + tous copropriétaires}, fixée par le gestionnaire. **Logique cible** : gestionnaire du cabinet → toujours ; `+conseil` → `is_council_member` ; `+copropriétaires` → `user_owns_any_lot_in_copro`. Repointe `user_is_council_member`→`is_council_member` (source unique). **NE dépend PLUS de `document_access`** (table droppée). | G-INTERNAL | garde accès canonique ; dépend de `is_council_member` + `visibility` (AUTORISATION §4) |
| `calculate_document_expiration` / `update_document_search_text` / `prevent_protected_document_deletion` (triggers) | **GARDER** | G-TRIG | |

## K. Maintenance / prestataires / tiers (domaine 07)

| Fonction | Disposition | Garde | Contrat |
|---|---|---|---|
| `update_service_order_status` | **GARDER** (machine à états, ne poste pas le GL) | G-MGR | `service_orders`, `service_order_events` |
| `is_valid_service_order_transition` | **GARDER** (IMMUTABLE) | G-INTERNAL | |
| `create_logbook_from_service_order` | **RÉÉCRIRE** (idempotent mais cassé par les renommages 07 : INSERT `logbook_entries.provider_id` → `tiers_id` (val. `v_order.tiers_id`), 07 §1.5 ; lecture `v_order.subject` → `v_order.title`, 07 §1.3 ; aligner avec `update_provider_stats` déjà en RÉÉCRIRE même cause) | G-MGR | `logbook_entries`, `service_orders` |
| `delete_service_order` | **RÉÉCRIRE** (retirer le bloc `UPDATE budget_payment_schedules` AVANT DROP de cette table) | G-MGR | `service_order_events`, `logbook_entries` |
| `generate_service_order_number` | **RÉÉCRIRE** (`COUNT(*)+1` → séquence par copro, corrige la race) | G-INTERNAL | `service_orders` |
| `update_provider_stats` (trigger) | **RÉÉCRIRE** (cible `tiers` au lieu de `providers`) | G-TRIG | `tiers.interventions_count`, `last_intervention_at` |
| `update_contract_status_auto` (trigger) | **GARDER** | G-TRIG | `contracts` |
| `get_supplier_invoice_paid_amount` | **GARDER** | G-INTERNAL | `supplier_payments` |

## L. Communication — messagerie + mur (domaine 08)

`is_conversation_member` (**GARDER**, G-INTERNAL), `mark_conversation_read` (**GARDER/simplifier**, G-OWNER — source de vérité du lu = `last_read_at`), triggers `update_conversation_last_message` / `update_wall_post_comments_count` / `update_wall_post_likes_count` (**GARDER**, G-TRIG).

## M. Triggers métier intégrité (finance/GL/appels) — GARDER (G-TRIG)

`trg_ledger_tx_immutable`, `trg_ledger_tx_no_delete_posted`, `trg_ledger_entry_immutable`, `trg_ledger_entry_no_insert_posted`, `trg_ledger_entry_consistency`, `trg_enforce_is_postable`, `enforce_lot_id_on_45x` (élargi), `check_budget_line_copro_consistency`, `validate_call_for_funds_total`, `validate_payment_allocation`, `trg_update_call_status_from_lines`+`update_call_line_status` (**FUSIONNÉS** en `trg_call_line_status_sync` AFTER), `validate_supplier_invoice_total`, `validate_supplier_payment`, `update_supplier_invoice_status_after_payment`, `check_call_total_integrity`, `check_invoice_total_integrity`, `check_payment_allocation_integrity`, `check_transaction_balance`.
**REMPLACÉ par contrainte déclarative** : `check_single_open_period` → `UNIQUE (copro_id) WHERE status='open'`.

## N. Triggers techniques / updated_at — CONSOLIDER

`handle_updated_at`, `set_updated_at`, `trigger_set_updated_at`, `update_updated_at_column` + les ~7 variantes par table (`trg_ag_updated_at`, `update_ag_pouvoirs_updated_at`, `update_budget_expenses_updated_at`, etc.) → **CONSOLIDER en UNE seule `set_updated_at()`** (G-TRIG). `handle_new_user` (auth.users→profiles), `initialize_mutation_steps`, triggers AG/mur/conversation → **GARDER**.

## O. Harnais de test / seed (CI, hors prod) — GARDER

`create_test_copro(_seeded)`, `create_clean_test_copro(_seeded)`, `seed_golden_loop` → **GARDER**, garde **G-SVC** (`REVOKE anon`, jamais en prod publique).

## O.bis VUES câblées à conserver (cohérence avec OBJETS-ABANDONNES PARTIE 2)

> Les vues lues par le front/edge sont des dépendances réelles : elles suivent le sort de leur table source. Recensées ici pour éviter tout DROP mécanique « count(*)=0 ».

| Vue | Disposition | Source / câblage |
|---|---|---|
| `v_document_versions` | **GARDER** (DROP seulement en bloc avec `document_versions` + réécriture `getDocumentVersions`) | lue par `lib/documents/api.ts` l.408 ; table source = faux mort gardé |
| `v_mutation_detail` | **GARDER** | feature mutations gestionnaire ; source `mutation_steps` (faux mort câblé `lib/sales/api.ts`) |
| `v_alur_fund_summary` / `v_alur_transfers_history` | **GARDER** | câblées `useALURData.ts` ; source `alur_transfers` = faux mort CONSERVÉ (correction réconciliation, ne PAS droper) |
| `v_bank_movements_overview` / `v_payments_overview` | **GARDER** | feature mouvements-bancaires ; lisent `bank_matches` (faux mort) |
| `v_trial_balance` / `v_owner_statement_*` | **GARDER** | balance + relevés dérivés du GL (source unique des soldes) |
| `v_account_balances` | **DROP** | chemin parallèle au GL (dérivait le 512 des `bank_movements`) — voir OBJETS-ABANDONNES §1.3 |
| `v_mail_campaigns_overview` / `v_mail_inbox_overview` / `v_mail_*` | **DROP** | île campagnes emailing (≠ messagerie interne `mails`) |

---

## P. FONCTIONS NOUVELLES À AJOUTER (n'existent pas au live)

> **Couche de tenance MULTI-CABINET (nouvelle, dès la cible)** : table **`cabinets`** (organisation syndic) + `copros.cabinet_id` **FK NOT NULL → cabinets(id)**. RLS cloisonnée par cabinet, centralisée dans `user_has_copro_access`/`user_is_copro_manager` (§F) où le filtre cabinet est **inline** (pas de helper cabinet dédié). Rôles : `platform_admin` (transverse) / `gestionnaire` (de cabinet) / `coproprietaire` / `anon` + `service_role`. Seul helper nouveau : `user_is_platform_admin()` ci-dessous. Écrans CRUD cabinet + invitation gestionnaires différés.

| Fonction | Domaine | Garde | Rôle |
|---|---|---|---|
| `user_is_platform_admin()` | 01 | G-INTERNAL | **NOUVEAU (A13)** : rôle `platform_admin` transverse (équipe CoProFlex, hors cabinet) ; court-circuite le périmètre cabinet en lecture/admin ; appelé en bypass par `user_has_copro_access`/`user_is_copro_manager`. Le cloisonnement cabinet (multi-cabinet) est porté **inline** dans ces 2 helpers (`profiles.cabinet_id = copros.cabinet_id`), pas par un helper dédié |
| `link_coproprietaire_account(p_invite_token)` | 01 | DEFINER + garde `email JWT = email invité` | résout `copro_invitations`, câble `coproprietaires.user_id`, crée membership, passe l'invitation `accepted` |
| `assert_result_allocation_split(p_copro_id, p_period_id)` | 02 | G-INTERNAL | garde-fou invariant 110/120 ; `RAISE` si la part travaux n'est pas ventilée 110/450-2 (appelée par `regularize_period`) |
| `post_collective_loan(...)` | 02 | G-MGR | branche l'emprunt collectif au GL (D512/C164) — implémentation différée hors boucle d'or |
| **geste d'écriture de rapprochement** (INSERT `bank_matches`) | 02 | G-MGR | rattache un `bank_movement` à un paiement/règlement (polymorphe), puis appelle `refresh_bank_movement_status` |
| `trg_call_line_status_sync` | 03 | G-TRIG | fusion des 2 triggers concurrents de statut d'appel |
| `trg_cff_ledger_required` (CONSTRAINT DEFERRED) | 03 | — | `status<>'draft' ⇒ ledger_tx_id NOT NULL` |
| `enforce_copro_consistency` (+ ~15 `tr_*_copro_consistency`) | 01/04/05/06/07/08 | G-TRIG | verrous anti-fuite inter-copro (FK = même `copro_id`) ; comblent un trou d'intégrité généralisé |
| `set_updated_at()` (consolidée) | transverse | G-TRIG | remplace les ~11 variantes |

---

## Q. FONCTIONS ABANDONNÉES (verrouillées, NON reprises)

### Q.1 Surcharges doublons (garder la version riche, DROP l'ancienne)
- `post_budget_call_for_funds` **8 args** (perte de centimes → garder la 10-args)
- `post_supplier_payment` **7 args** (non idempotent, risque double paiement → garder la 8-args)
- `post_call_for_funds` (mono-clé) — supplanté par l'agrégé ; **rebrancher l'edge `generate_call_for_funds` AVANT le DROP** (T3-A3/A5)
- `generate_document_path` **3 args** (format legacy incompatible)

### Q.2 Couche AG bespoke hors-GL (décision USER verrouillée)
- `generate_combined_calls_from_ag` (DDL runtime, budget_id NULL, 0 GL — source des 6 appels orphelins)
- `create_budget_from_ag` (crée budget sans écriture)
- `create_alur_fund_from_ag` (logique ALUR à reposer en maillon canonique D450-5/C105)
- `elect_council_from_ag` (réimplanter via `activate_ag_decisions`)
- `finish_ag_session` (target_table inexistants → remplacé par `finalize_and_activate_ag`)
- `get_ag_pending_actions`, `mark_ag_action_activated` (mécanisme `ag_pending_actions` bespoke)
- `user_is_council_member` (divergence rôle CS → `is_council_member` est la source unique)
- `save_ag_milestone` / `get_ag_milestones` (île `ag_milestones` droppée)

### Q.3 Notifications AG — GARDÉ TRANSITOIRE puis DROP étape 3
- `create_ag_notification`, `mark_notification_sent`, `mark_notification_failed`, `get_ag_recipients`, `get_ag_sending_stats` — survivent tant que l'edge `email_webhook` n'est pas refacto vers `ag_envoi_tracking` (AUTORISATION §5.2.1, étape 3). **Ne PAS droper avant cette étape.**

### Q.4 Campagnes emailing de masse (DROP avec le bloc `mail_*`, domaine 08)
- `create_mail_system_folders` (écrit `mail_folders`, droppée)
- `generate_campaign_recipients`
- `update_mail_campaign_stats` (trigger)

### Q.5 Artefacts dev (accès copro implicite — supprimer en prod)
- `ensure_dev_membership`
- `get_default_copro_id`

### Q.6 Fonctions cassées / stale
- `can_access_document(doc_id, user_id)` — référence `copro_members` (table inexistante) + rôles obsolètes → DROP sec (`user_can_view_document` est la garde canonique)

### Q.7 Trigger supprimé
- `set_updated_at` sur **`messages`** — la table n'a pas de colonne `updated_at` (elle a `edited_at`) → trigger retiré (bug latent)
- `trg_notification_event_status` (île notifications droppée)
- 2ᵉ trigger `updated_at` de `ag_pouvoirs` (table abandonnée)

---

## Ordres de migration imposés (séquençage critique)
1. Migrer enum `document_category` (`+courrier`/`-correspondance`) **PUIS** réécrire `create_document_system_folders`.
2. Réécrire `get_ag_wizard_state` (lecture jalons → `ag_session_drafts`) **PUIS** `DROP ag_milestones`.
3. Réécrire `delete_service_order` (retirer bloc `budget_payment_schedules`) **PUIS** `DROP budget_payment_schedules`.
4. Rebrancher l'edge `generate_call_for_funds` sur la 10-args **PUIS** abandonner `post_call_for_funds` mono-clé.
5. Refacto edge `email_webhook` → `ag_envoi_tracking` **PUIS** droper les 5 fonctions notifications AG (Q.3) + tables `ag_notifications`/`_events`.
6. Réécrire `user_can_view_document` (repointage `user_is_council_member`→`is_council_member`) **PUIS** `DROP user_is_council_member` (Q.2).
7. **(A4)** Réécrire `user_can_view_document` sur la colonne `visibility` (confidentialité GED simple) + rebrancher `lib/documents/api.ts` (l.580/598) et l'edge `get_document_url` (l.115) **PUIS** `DROP document_access`.
