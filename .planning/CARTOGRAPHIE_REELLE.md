# CARTOGRAPHIE RÉELLE — CoProFlex

> Inventaire vérifié sur la base vivante `iyfesbjnkpynmwlsmxnp` le 2026-06-02 (lecture seule).
> Généré par l'audit fan-out (cartographie DB + RLS + code). Source de vérité = la base, pas les documents.

---

J'ai tout le nécessaire. Voici le livrable.

---

## Cartographie réelle de la base — projet `iyfesbjnkpynmwlsmxnp`

Vérifié en base vivante le 2026-06-02. 87 tables de base, 80 vues `v_*`, 65 ENUMs. RLS désactivé sur l'ensemble du cœur métier vérifié (cohérent avec la phase dev). `ledger_transactions.status` et `ledger_entries.direction` sont des `text` libres (pas des ENUMs) — valeurs canoniques `posted` / `debit`,`credit`.

## 1. Tables du cœur métier (colonnes réelles)

### Finance — grand livre (partie double, source légale)

**`ledger_transactions`** — en-tête d'écriture
`id uuid` · `copro_id uuid` · `period_id uuid` · `tx_date date` · `source_type text` · `source_id uuid` · `label text NN` · `status text NN` (libre, canonique=`posted`) · `created_by uuid` · `posted_by uuid` · `posted_at timestamptz` · `metadata jsonb NN` · `created_at timestamptz`

**`ledger_entries`** — lignes débit/crédit (dimension `lot_id` portée ici)
`id uuid` · `tx_id uuid NN` · `copro_id uuid NN` · `period_id uuid NN` · `account_id uuid NN` · `lot_id uuid` (nullable) · `direction text NN` (`debit`/`credit`) · `amount numeric NN` · `entry_label text` · `created_at`

**`accounts`** — plan de comptes (par copro)
`id` · `copro_id` · `code text NN` · `name text NN` · `account_type account_type NN` · `is_active bool NN` · `parent_id uuid` · `is_system bool NN` · `description` · `banque/iban/bic text` (comptes 5xx) · `initial_balance numeric`

**`accounting_periods`** — exercices
`id` · `copro_id` · `name text NN` · `start_date date NN` · `end_date date NN` · `status period_status NN` · `locked_at/locked_by` · `closed_at/closed_by` · `approved_at/approved_by/approval_notes` · `notes` · `created_at/updated_at`

### Finance — budget & engagement

**`budgets`** : `id` · `copro_id` · `period_id NN` · `budget_type budget_type NN` · `status budget_status NN` · `version int NN` · `name` · `notes` · `created_by/validated_by` · `validated_at` · `source_ag_id uuid` (traçabilité AG→budget)
**`budget_lines`** : `id` · `budget_id NN` · `copro_id` · `account_id NN` · `repartition_key_id NN` · `label NN` · `amount NN` · `code` · `sort_order`
**`budget_expenses`** (dépense engagée/réalisée) : `id` · `budget_id NN` · `budget_line_id NN` · `label NN` · `amount NN` · `tx_date NN` · `status expense_status NN` · `fournisseur` · `montant_ht/taux_tva` · `validated_at/by` · `rejection_comment` · `ledger_tx_id uuid` (lien GL après validation)
**`budget_payment_schedules`** (échéancier travaux/retenues) : `phase_number` · `percentage` · `amount` · `status payment_phase_status` · `is_retention bool` · `retention_release_date` · `service_order_id` · `document_id`

### Finance — appels de fonds & encaissements

**`call_for_funds`** : `id` · `copro_id` · `period_id NN` · `budget_id` · `repartition_key_id` · `label NN` · `trimester int` · `issue_date NN` · `due_date NN` · `total_amount NN` · `status call_for_funds_status NN` · `ledger_tx_id uuid` · `description`
**`call_for_funds_lines`** (1 ligne par lot×clé) : `id` · `call_id NN` · `lot_id NN` · `amount_due NN` · `amount_paid NN` · `status call_line_status NN` · `repartition_key_id` · `weight_snapshot numeric` (gel de la quote-part)
**`payments`** (encaissement copro) : `id` · `copro_id` · `period_id NN` · `lot_id NN` · `amount NN` · `payment_date NN` · `method payment_method NN` · `reference` · `status payment_status NN` · `ledger_tx_id` · `idempotency_key uuid`
**`payment_allocations`** (imputation FIFO) : `id` · `payment_id NN` · `call_line_id NN` · `amount_allocated NN`

### Finance — fournisseurs, banque, cut-off, ALUR, trésorerie

**`suppliers`** : `id` · `copro_id` · `name NN` · `siret` · `contact jsonb NN` · `is_active bool NN`
**`supplier_invoices`** : `id` · `period_id NN` · `supplier_id NN` · `invoice_number` · `invoice_date NN` · `due_date` · `label NN` · `total_amount NN` · `status supplier_invoice_status NN` · `related_service_order_id` · `document_id` · `ledger_tx_id` · `montant_ht/montant_tva/taux_tva`
**`supplier_invoice_lines`** : `invoice_id NN` · `account_id NN` (poste 6xx) · `label NN` · `amount NN` · `repartition_key_id` · `budget_line_id` · `amount_ht/amount_tva/taux_pct`
**`supplier_payments`** : `supplier_invoice_id NN` · `payment_date NN` · `amount NN` · `method NN` · `ledger_tx_id` · `idempotency_key`
**`bank_movements`** : `period_id NN` · `bank_date NN` · `value_date` · `amount_signed numeric NN` · `label NN` · `bank_ref` · `status bank_movement_status NN` · `account_id NN` · `account_code/account_category`
**`bank_matches`** : `bank_movement_id NN` · `target_type bank_match_target_type NN` · `target_id NN` · `amount_matched NN` · `matched_at/by`
**`period_cutoff_items`** (droits constatés 408/486) : `period_id NN` · `kind text NN` · `account_id NN` · `counterpart_account_id NN` · `amount NN` · `label NN` · `supplier_id` · `auto_reverse bool NN` · `posting_tx_id` · `reversal_tx_id`
**`alur_transfers`** : `alur_budget_id NN` · `amount NN` · `transfer_date NN` · `destination transfer_destination NN` · `destination_budget_id` · `resolution_ag_id`
**`treasury_advances`** : `lot_id NN` · `owner_id` · `advance_type text NN` · `amount_due/amount_paid NN`

### Lots / copropriété / répartition

**`copros`** : `id` · `name NN` · `address/city/postal_code` · `siret` · `num_immatriculation` · `buildings_count/lots_count/total_tantiemes int` · `exercice_debut` · `cabinet_id` · `onboarding_step/max_step smallint`
**`buildings`** : `copro_id` · `name NN` · `address` · `floors_count` · `construction_year`
**`lots`** : `id` · `copro_id` · `building_id` · `ref text NN` · `type lot_type` · `floor` · `surface numeric` · `tantiemes_generaux int NN` · `tantiemes_escalier/ascenseur/chauffage int` · `description`
**`coproprietaires`** : `id` · `copro_id` · `user_id` · `is_company/company_name` · `civility/first_name/last_name` · `email/phone/mobile` · adresse · `prefers_email/prefers_paper/is_resident bool`
**`lot_owners`** (historisé) : `lot_id NN` · `coproprietaire_id NN` · `copro_id NN` · `share_percent` · `is_primary bool` · `start_date NN` · `end_date` (NULL=actuel)
**`lot_accounts`** : mapping `lot_id`↔`account_id` (vestige du modèle 411-par-lot)
**`repartition_keys`** : `id` · `copro_id` · `name NN` · `basis repartition_basis NN` · `is_active bool NN` · `coverage_mode coverage_mode NN` · `category repartition_category` · `valid_from/valid_to date`
**`repartition_key_lines`** : `key_id NN` · `lot_id NN` · `weight numeric NN`
**`memberships`** : `user_id NN` · `copro_id NN` · `role membership_role NN`
**`profiles`** : `id` · `email` · `full_name` · `phone` · `avatar_url`

### AG (assemblées)

**`ag_meetings`** : `id` · `copro_id` · `title NN` · `meeting_type ag_meeting_type NN` · `meeting_date NN` · `convocation_date` · `status ag_status NN` · `quorum_required bool NN` · président/secrétaire/scrutateurs (id+name) · `session_started_at/ended_at` · `pv_document_id` · `current_step/max_step_reached int` · `step_data jsonb` · `wizard_mode` · `pv_generated_at/pv_sent_at`
**`ag_resolutions`** : `id` · `ag_id NN` · `resolution_number int NN` · `title NN` · `description` · `resolution_type resolution_type NN` · `majority_type majority_type NN` · `linked_budget_id/linked_work_budget_id` · `status resolution_status NN` · `tantiemes_for/against/abstention numeric` · `voters_for/against/abstention int` · `threshold_tantiemes/threshold_voters` · `is_approved bool` · `vote_details jsonb` · `is_bridgeable/bridge_vote_id` · `variables jsonb` · `is_customized bool` · `action_type text`
**`ag_votes`** : `resolution_id NN` · `coproprietaire_id NN` · `vote vote_direction NN` · `tantiemes NN` · `vote_source vote_source NN` · `is_excluded bool` · `exclusion_reason`
**`ag_attendance`** : `ag_id NN` · `coproprietaire_id NN` · `lot_ids uuid[] NN` · `tantiemes NN` · `presence_type attendance_type NN` · `represented_by_id/name` · `proxy_document_id` · `signed bool NN` · `signature_data`
**`ag_pouvoirs`** : `ag_id NN` · `mandant_id NN` · `mandataire_id NN` · `signed_at` · justificatif (filename/path/size)
**`ag_correspondence_votes`** : `ag_id NN` · `coproprietaire_id NN` · `form_document_id` · `validated bool` · `status text` · `total_tantiemes` · `mode_reception` · `integration_status text`
**`ag_correspondence_vote_details`** : `correspondence_form_id NN` · `resolution_id NN` · `coproprietaire_id NN` · `vote vote_direction NN` · `integrated_vote_id` (lien vers `ag_votes` après intégration)
**`ag_pending_actions`** (moteur AG→données) : `ag_id NN` · `resolution_id NN` · `action_type text NN` · `target_table text NN` · `target_id` · `payload jsonb NN` · `status text NN` · `error_message` · `activated_at` · `result_data jsonb`

### Mutations / état daté / documents

**`mutations`** : `lot_id NN` · `status text NN` · `mutation_type text NN` · `seller_owner_id NN` · `buyer_owner_id` · `buyer_name/email/is_company` · notaire (name/email/reference) · `requested_at NN` · `signature_date` · `effective_date`
**`mutation_steps`** : `mutation_id NN` · `step_key text NN` · `status text NN` · `completed_at` · `payload jsonb`
**`etat_date_snapshots`** : `mutation_id NN` · `snapshot_type text NN` · `generated_at NN` · `payload jsonb NN` · `document_id`
**`documents`** : `copro_id` · `lot_id/coproprietaire_id` · `file_name/file_path NN` · `file_size/mime_type` · `category document_category` · `title/description` · `tags text[]` · `document_date/year` · `status document_status` · `confidentiality document_confidentiality` · `source_module document_source` · FK croisées (`ag_id/resolution_id/service_order_id/contract_id/invoice_id/mutation_id/dossier_id/budget_id`) · `retention_years/expiration_date/deletion_blocked` · `version/parent_document_id/is_current_version` · `search_text tsvector` · `file_hash` · `is_starred bool NN`

## 2. ENUMs réels (cœur métier)

| ENUM | Valeurs |
|---|---|
| `account_type` | asset, liability, income, expense, equity |
| `period_status` | open, locked, closed, approved, rejected |
| `budget_type` | current, works, alur |
| `budget_status` | draft, draft_from_ag, pending_approval, submitted, validated, rejected, closed |
| `expense_status` | draft, pending_validation, validated, rejected |
| `call_for_funds_status` | draft, issued, partially_paid, paid, cancelled |
| `call_line_status` | unpaid, partial, paid |
| `payment_method` | bank_transfer, card, check, cash, other, direct_debit |
| `payment_status` | recorded, reconciled, reversed |
| `payment_phase_status` | pending, awaiting_invoice, paid |
| `supplier_invoice_status` | draft, approved, posted, paid, cancelled |
| `bank_movement_status` | unmatched, matched, ignored |
| `bank_match_target_type` | payment, supplier_payment, other |
| `transfer_destination` | compte_courant, budget_travaux |
| `repartition_basis` | tantiemes, surface, custom |
| `repartition_category` | general, special, alur |
| `coverage_mode` | all_lots, subset |
| `lot_type` | appartement, studio, commerce, bureau, cave, parking, garage, local_technique, autre |
| `membership_role` | admin, gestionnaire, membre_cs, coproprietaire, prestataire |
| `ag_status` | draft, convoked, in_progress, session_active, closed, pv_generated, pv_signed, pv_sent, finalized |
| `ag_meeting_type` | ordinary, extraordinary, mixed |
| `resolution_status` | draft, pending, voting, voted, approved, rejected, adjourned, withdrawn |
| `resolution_type` | budget, accounts, works, appointment, contract, rules, other |
| `majority_type` | art24, art25, art25_1, art26, art26_1, unanimity |
| `vote_direction` | for, against, abstention |
| `vote_source` | live, correspondence |
| `attendance_type` | present, proxy, correspondence |
| `document_category` | pv_ag, convocation, reglement, contrat, facture, devis, diagnostic, assurance, budget, appel_fonds, releve_charges, etat_date, courrier, photo, plan, autre, ordre_service, correspondance, carnet_entretien, fiche_synthetique |
| `document_confidentiality` | public, council, manager, restricted |
| `document_status` | draft, active, archived, expired |
| `document_source` | ag, finance, maintenance, communication, legal, manual |

*(autres ENUMs périphériques présents : contract_*, service_order_*, council_*, mail_*, planned_work_*, technical_doc_type, insurance_sub_type, intervention_*, logbook_entry_type, urgency_level, delivery_status, reminder_status, provider_*, content_visibility, event_type, wall_post_category, work_priority, notification_channel, ag_draft_type, ag_notification_type.)*

## 3. Vues `v_*` (80 au total)

Vues financières clés (définitions ci-dessous) : `v_general_ledger`, `v_trial_balance`, `v_lot_balance`, `v_owner_statement_lines`, `v_finance_integrity_issues`.

| Vue | Rôle |
|---|---|
| `v_general_ledger` | grand livre détaillé (entries+tx+account+lot+noms) |
| `v_general_ledger_by_account_class` | GL agrégé par classe de compte |
| `v_trial_balance` | balance par compte/période (débit/crédit/solde) |
| `v_account_balances` / `v_account_movements` | soldes / mouvements par compte |
| `v_lot_balance` | solde par lot (tiers copro) — propriétaire actuel |
| `v_owner_balance` / `v_owner_financial_summary` | solde / synthèse par copropriétaire |
| `v_owner_statement_lines` / `_by_period` | relevé de compte copro (appels+paiements, running balance) |
| `v_owner_statement_summary` | totaux relevé |
| `v_calls_overview` / `v_call_lines_detailed` / `v_call_campaigns` | appels & lignes |
| `v_calls_collection_stats` / `v_call_total_mismatch` | taux de recouvrement / incohérence total appel |
| `v_payments_overview` / `v_payment_allocation_issues` | paiements / imputations anormales |
| `v_unpaid_by_lot` / `v_unpaid_lots` / `v_unpaid_with_reminders` | impayés |
| `v_budgets_overview/_summary` · `v_budget_lines_*` · `v_budget_consumption_by_account` · `v_budget_expenses_detail` | budget & consommation (engagé/réalisé) |
| `v_supplier_invoices_overview` / `v_invoice_total_mismatch` / `v_supplier_payment_issues` | factures & contrôles fournisseurs |
| `v_bank_movements_overview` | rapprochement bancaire |
| `v_alur_fund_summary` / `v_alur_lot_contributions` / `v_alur_transfers_history` | fonds travaux ALUR |
| `v_finance_integrity_issues` | **vue d'audit** : mismatches appel/facture/paiement |
| `v_accounting_periods` | périodes enrichies |
| `v_repartition_key_lines_detailed` / `v_repartition_key_totals` / `v_copro_tantiemes` | clés & tantièmes |
| `v_ag_overview` · `v_ag_resolutions_results` · `v_ag_vote_stats_by_resolution` · `v_ag_resolution_vote_summary` · `v_ag_votes_detailed` · `v_ag_attendance_summary` · `v_ag_correspondence_status` · `v_ag_drafts_progress` | AG (résultats de vote, présence, correspondance, avancement) |
| `v_mutations_overview` / `v_mutation_detail` / `v_etat_date_latest` | mutations & état daté |
| `v_dashboard_kpis` / `v_dashboard_todos` / `v_dashboard_recent_activity` | tableau de bord |
| `v_lots_with_owners` / `v_coproprietaires_overview` | lots & copros |
| `v_documents_*` / `v_accessible_documents` / `v_folders_with_counts` | GED |
| `v_council_*` · `v_contracts_*` · `v_service_orders_overview` · `v_providers_overview` · `v_logbook_*` · `v_maintenance_stats` · `v_events_overview` · `v_mail_*` · `v_conversation*` · `v_wall_feed` · `v_payment_reminders_overview` | modules périphériques (CS, contrats, OS, carnet, événements, courrier, mur) |

### Définitions des 5 vues financières clés

**`v_general_ledger`** — jointure `ledger_entries e` ⋈ `ledger_transactions t` ⋈ `accounts a`, LEFT `lots l`, LEFT `profiles` (créateur/posteur). Expose `debit`/`credit` calculés via `CASE direction`. **Ne filtre PAS sur `status='posted'`** (inclut brouillons) — contrairement aux vues de solde.

**`v_trial_balance`** — `ledger_entries e` ⋈ `ledger_transactions t ON status='posted'` ⋈ `accounts` ⋈ `accounting_periods`. GROUP BY copro/période/compte → `total_debit`, `total_credit`, `balance`.

**`v_lot_balance`** — `ledger_entries WHERE lot_id IS NOT NULL` ⋈ `tx status='posted'` ⋈ `lots`, LEFT `lot_owners (end_date IS NULL AND is_primary)` ⋈ `coproprietaires`. → solde par lot = Σdébit − Σcrédit. **Rattache au propriétaire actuel uniquement** (pas d'historique vendeur).

**`v_owner_statement_lines`** — relevé construit **hors grand livre**, directement depuis `call_for_funds_lines` (debit) UNION `payments` (credit), borné par période de détention `lot_owners`. `running_balance` en window function ordonné `line_date, created_at, related_id`. Exclut appels `draft/cancelled` et paiements `reversed`. *Point d'attention audit : source = tables métier, pas le GL → divergence possible avec `v_lot_balance`.*

**`v_finance_integrity_issues`** — vue d'audit pure (UNION ALL) : `TOTAL_MISMATCH` appel vs Σlignes ; `TOTAL_MISMATCH` facture vs Σlignes ; `OVER/UNDER_ALLOCATED` paiement vs Σimputations ; `OVER_PAID` facture vs Σrèglements. Seuil 0,01 €.

## 4. Fonctions / RPC métier (signatures réelles)

Toutes en `public`. `SD`=SECURITY DEFINER.

**Grand livre / route canonique**
- `create_ledger_transaction(p_copro_id uuid, p_period_id uuid, p_tx_date date, p_label text, p_source_type text, p_source_id uuid, p_entries jsonb, p_auto_post boolean) → jsonb` — **SD**. Route canonique partie double.

**Appels de fonds**
- `post_call_for_funds(p_copro_id, p_period_id, p_budget_id, p_repartition_key_id, p_label, p_trimester int, p_issue_date, p_due_date, p_total_amount numeric, p_description) → jsonb` — **SD** (appel mono-clé legacy).
- `post_budget_call_for_funds(...)` — **deux surcharges SD** : (8 args : `…p_fraction numeric`) et (10 args : `+ p_installment_index int, p_installment_count int`). Route agrégée multi-clés (D450-1/C701).

**Encaissements copro**
- `post_owner_payment(...)` — **deux surcharges SD** : (8 args, terminant par `p_call_line_ids uuid[]`) et (9 args : `+ p_idempotency_key uuid`).
- `allocate_payment(p_payment_id uuid, p_call_line_ids uuid[]) → TABLE(call_line_id uuid, amount_allocated numeric)` — **NON SD** (seule RPC d'imputation non-definer).

**Fournisseurs / dépenses**
- `post_supplier_invoice(p_copro_id, p_period_id, p_supplier_id, p_invoice_number, p_invoice_date, p_due_date, p_label, p_lines jsonb, p_document_id, p_related_service_order_id, p_post_immediately boolean, p_montant_ht, p_montant_tva, p_taux_tva) → jsonb` — **SD**.
- `validate_budget_expense(p_expense_id uuid) → jsonb` — **SD** (passe en classe 6, pose `ledger_tx_id`).

**Périodes / clôture**
- `post_period_cutoff(p_copro_id, p_period_id, p_items jsonb) → jsonb` — **SD** (408/486).
- `open_next_period(p_copro_id, p_closing_period_id, p_new_name text, p_new_start date, p_new_end date) → jsonb` — **SD**.
- `approve_period(p_period_id uuid) → jsonb` — **SD**.
- `reopen_period(p_period_id uuid) → jsonb` — **SD** (interdit si approved).
- `regularize_period(p_copro_id, p_period_id) → jsonb` — **SD**.

**AG → données (auto-population)**
- `prepare_ag_decisions(p_ag_id uuid) → jsonb` — **SD**.
- `calculate_resolution_result(p_resolution_id uuid) → jsonb` — **SD**.
- `finalize_and_activate_ag(p_ag_id uuid, p_activate boolean) → jsonb` — **SD**.
- `activate_ag_decisions(p_ag_id uuid) → jsonb` — **SD**.
- `generate_calls_from_ag_payload(p_copro_id, p_ag_id, p_resolution_id, p_payload jsonb) → void` — **SD**.

**Utilitaires métier**
- `repartition_key_is_complete(p_key_id uuid) → boolean` — **SD**.
- `resolve_lot_tiers_account(p_copro_id uuid, p_nature text) → uuid` — **SD** (résout le sous-compte 450-x par nature).
- `fn_annexe_2(p_copro_id, p_period_id, p_next_period_id) → jsonb` — **NON SD** (annexe comptable réglementaire).
- `fn_dashboard_kpis(p_copro_id, p_period_id) → jsonb` — **SD**.

*Note : `post_call_for_funds` (legacy mono-clé) coexiste avec `post_budget_call_for_funds` (agrégée) — deux patterns d'appel toujours présents.*

## 5. Plan de comptes réel de la boucle d'or (copro `22222222…`)

Comptes attendus tous **présents** :

- **Capitaux (1xx)** : 102 Provisions travaux décidés · 103 + 1031/1032/1033 Avances · **105 Fonds travaux ALUR** (equity) · **110** Solde en attente travaux/exceptionnel · **120** Solde en attente courant · 131/132 Subventions · 164 Emprunts collectifs.
- **Tiers (4xx)** : **401** Fournisseurs factures parvenues · **408** Factures non parvenues · 409 Fournisseurs débiteurs · 411-001/101/102/201/202/301 (anciens comptes par lot, *toujours présents en base mais abandonnés au profit du modèle 450*) · `450` **(is_system=true)** compte chapeau · **450-1** Budget prévisionnel · **450-2** Travaux art.14-2 · **450-3** Avances · **450-4** Emprunts · **450-5** Fonds ALUR · 459 Créances douteuses · 471/472 Attente d'imputation · **486** Charges constatées d'avance · 487 Produits encaissés d'avance · 491/492 Dépréciations.
- **Financiers (5xx)** : 501 Compte à terme · 502 Livret A (fonds travaux) · **512 Banque** · 514 Chèques postaux · 531 Caisse.
- **Charges (6xx)** : série 601→628 (eau, élec, chauffage, assurances, syndic 621/6211-6213, honoraires 622/625, CS 624, AG 627…), impôts 632-634, financières 661/662, **travaux 671/672/673/674/678**.
- **Produits (7xx)** : **701** Provisions courantes · **702** Provisions travaux/exceptionnel · 703 Avances · 704 Remb. annuités · **705 Affectation du fonds de travaux** · 706 Délégation CS · 711 Subventions · 713 Indemnités assurance · 714 Produits divers · 716 Produits financiers.

Observations d'audit factuelles (sans correction) :
- Doublons de libellé dans le plan de comptes : **601=605 "Eau"** et **602=606 "Électricité"** (codes distincts, même nom) — risque d'imputation ambiguë.
- `initial_balance` = 0 sur tous les comptes (à-nouveaux portés par écritures, pas par solde initial de compte).
- `accounts.account_type` classe `105/110/120` en `equity`, `450-x` en `asset`, `701/702/705` en `income` — cohérent avec les règles métier mémorisées (appel ALUR D450-5/C105, etc.).

## 6. Points transverses (RLS, types libres)

- **RLS désactivé** (`relrowsecurity=false`) sur l'intégralité du cœur métier vérifié : ledger_entries, ledger_transactions, accounts, accounting_periods, call_for_funds(_lines), payments, payment_allocations, budgets, budget_lines, budget_expenses, ag_meetings, ag_resolutions, ag_votes, lots, coproprietaires, copros, supplier_invoices, documents, mutations. Conforme à la phase dev (mémoire `dev_phase_rls`).
- `ledger_transactions.status` et `ledger_entries.direction` sont des **`text` non contraints par ENUM** (validation applicative uniquement) — valeurs canoniques `posted` et `debit`/`credit`.
- `ledger_entries.lot_id` est **nullable** : la dimension lot n'est portée que sur les écritures de tiers (450-x), absente sur banque/charges — cohérent avec le modèle « sous-compte par nature + dimension lot_id ».

---

J'ai toutes les données. Voici le livrable.

---

# CARTOGRAPHIE RÉELLE — Sécurité / RLS

Audit lecture seule. Base `iyfesbjnkpynmwlsmxnp`. Date : 2026-06-02.

## 1. État RLS par table (cœur métier)

`relrowsecurity` + nombre de policies. **15 tables seulement ont RLS activée** sur 82 tables `public`. Les policies existent souvent SANS que RLS soit activée → **elles ne s'appliquent pas** (policies « mortes »).

### Tables avec RLS ACTIVÉE (15)

| table | rls_on | nb_policies |
|---|---|---|
| ag_correspondence_vote_details | ✅ | 2 |
| ag_envoi_tracking | ✅ | 1 |
| ag_milestones | ✅ | 3 |
| ag_pending_actions | ✅ | 1 |
| ag_pouvoirs | ✅ | 2 |
| alur_transfers | ✅ | 3 |
| budget_payment_schedules | ✅ | 4 |
| collective_loan_shares | ✅ | 2 |
| collective_loans | ✅ | 2 |
| dossiers | ✅ | 4 |
| insurance_policies | ✅ | 4 |
| legal_proceedings | ✅ | 2 |
| planned_works | ✅ | 4 |
| technical_documents | ✅ | 4 |
| treasury_advances | ✅ | 2 |

### Tables FINANCE / SENSIBLES avec RLS DÉSACTIVÉE (policies présentes mais inertes)

| table | rls_on | nb_policies |
|---|---|---|
| **ledger_entries** | ❌ | 4 |
| **ledger_transactions** | ❌ | 4 |
| **accounting_periods** | ❌ | 2 |
| **accounts** | ❌ | 6 |
| **payments** | ❌ | 5 |
| **payment_allocations** | ❌ | 5 |
| **call_for_funds** | ❌ | 5 |
| **call_for_funds_lines** | ❌ | 5 |
| **budgets** / budget_lines / budget_expenses | ❌ | 4 / 4 / 4 |
| **bank_movements** / bank_matches | ❌ | 4 / 4 |
| **supplier_invoices** / _lines / supplier_payments | ❌ | 4 / 4 / 4 |
| **lot_accounts** | ❌ | 4 |
| **documents** | ❌ | 5 |
| document_access / _versions / _folders / _links | ❌ | 3 / 2 / 4 / 2 |
| **coproprietaires** | ❌ | 3 |
| **lot_owners** | ❌ | 3 |
| **lots** / copros / buildings | ❌ | 2 / 2 / 2 |
| **memberships** | ❌ | 5 |
| **profiles** | ❌ | 3 |
| **ag_votes** / ag_resolutions / ag_meetings / ag_attendance | ❌ | 5 / 3 / 5 / 3 |
| ag_correspondence_votes / ag_notifications / ag_session_drafts | ❌ | 3 / 4 / 5 |
| council_members / _decisions / _votes / _documents | ❌ | 4 / 4 / 3 / 3 |
| messages / conversations / conversation_members | ❌ | 4 / 3 / 3 |
| wall_posts / wall_comments / wall_likes | ❌ | 4 / 4 / 3 |
| mutations / mutation_steps | ❌ | 4 / 4 |
| repartition_keys / _lines | ❌ | 4 / 4 |
| providers / contracts / suppliers / service_orders | ❌ | 4 / 4 / 4 / 4 |
| events / logbook_entries / etat_date_snapshots | ❌ | 4 / 4 / 2 |
| payment_reminders / _rules / reminder_settings | ❌ | 3 / 4 / 2 |
| mail_* (campaigns/folders/inbox/recipients/templates) | ❌ | 4 / 4 / 3 / 2 / 4 |

### Tables RLS OFF ET 0 policy (aucune protection, même latente)

| table | rls_on | nb_policies |
|---|---|---|
| **mails** | ❌ | 0 |
| **mail_labels_v2** | ❌ | 0 |
| **period_cutoff_items** | ❌ | 0 |
| _rls_state_snapshot | ❌ | 0 |

> Note : `_rls_state_snapshot` suggère qu'un script a un jour désactivé RLS en masse et sauvegardé l'état précédent — cohérent avec la mémoire « RLS désactivé en phase dev volontairement ».

## 2. Policies des tables sensibles (détail cmd / role / condition)

Toutes les policies portent sur le rôle `{public}` (sauf une exception notée). **Rappel : RLS étant OFF sur toutes ces tables, ces conditions ne filtrent rien aujourd'hui.** Le modèle de droits *voulu* est néanmoins lisible et cohérent (gestionnaire = tout ; propriétaire = ses lots).

### payments (5)
- `payments_select_manager` — SELECT — `user_is_copro_manager(copro_id)`
- `payments_select_owner` — SELECT — `user_is_lot_owner(lot_id)`
- `payments_insert` — INSERT — WITH CHECK `user_is_copro_manager(copro_id)`
- `payments_update` — UPDATE — `user_is_copro_manager(copro_id)`
- `payments_delete` — DELETE — `user_is_copro_manager(copro_id) AND status='recorded'`

### payment_allocations (5)
- `payment_allocations_select_manager` — SELECT — `user_is_copro_manager(copro_id)`
- `payment_allocations_select_owner` — SELECT — `EXISTS(call_for_funds_lines cfl WHERE cfl.id=call_line_id AND user_is_lot_owner(cfl.lot_id))`
- `payment_allocations_insert` — INSERT — WITH CHECK `user_is_copro_manager(copro_id)`
- `payment_allocations_update` — UPDATE — `user_is_copro_manager(copro_id)`
- `payment_allocations_delete` — DELETE — `user_is_copro_manager(copro_id)`

### ledger_entries (4)
- `Users can view ledger_entries of their copros` — SELECT — `user_has_copro_access(copro_id)` ⚠️ **tout membre de la copro voit TOUTES les écritures, y compris celles des autres lots** (pas de filtre lot).
- INSERT / UPDATE / DELETE — `user_is_copro_manager(copro_id)`

### ledger_transactions (4)
- `Users can view ledger_transactions of their copros` — SELECT — `user_has_copro_access(copro_id)` ⚠️ même remarque (visibilité copro-large).
- INSERT / UPDATE / DELETE — `user_is_copro_manager(copro_id)`

### documents (5)
- `documents_select_access` — SELECT — logique riche : gestionnaire/admin (memberships) OU doc `public` si membre OU doc `council` si conseiller actif OU doc `restricted` via `document_access` non expiré OU doc lié à un lot/copropriétaire de l'utilisateur. **N'utilise PAS les helpers** ; sous-requêtes `memberships` inline.
- `documents_insert_managers` — INSERT — WITH CHECK memberships role ∈ (gestionnaire, admin)
- `documents_insert_members` — INSERT — **rôle `{authenticated}`** (seule policy non-`public`) — WITH CHECK : tout membre de la copro
- `documents_update_managers` — UPDATE — memberships role ∈ (gestionnaire, admin)
- `documents_delete_managers` — DELETE — `NOT deletion_blocked AND` memberships role ∈ (gestionnaire, admin)

### call_for_funds_lines (5)
- `call_for_funds_lines_select_manager` — SELECT — `user_is_copro_manager(copro_id)`
- `call_for_funds_lines_select_owner` — SELECT — `user_is_lot_owner(lot_id)`
- INSERT — WITH CHECK `user_is_copro_manager(copro_id)` ; UPDATE — `user_is_copro_manager(copro_id)` ; DELETE — `user_is_copro_manager(copro_id)`

### ag_votes (5)
- `ag_votes_select_manager` — SELECT — `user_is_copro_manager(copro_id)`
- `ag_votes_select_members` — SELECT — `user_has_copro_access(copro_id) AND EXISTS(resolution → meeting WHERE status<>'draft')` (membres voient les votes des AG non-brouillon)
- INSERT — WITH CHECK `user_is_copro_manager(copro_id)` ; UPDATE / DELETE — `user_is_copro_manager(copro_id)`

### lot_owners (3)
- `Managers can view all lot_owners` — SELECT — `user_is_copro_manager(copro_id)`
- `Users can view own lot_owners` — SELECT — `EXISTS(coproprietaires c WHERE c.id=coproprietaire_id AND c.user_id=auth.uid())`
- `Managers can manage lot_owners` — ALL — `user_is_copro_manager(copro_id)`

### coproprietaires (3)
- `Managers can view all coproprietaires` — SELECT — `user_is_copro_manager(copro_id)`
- `Users can view own coproprietaire record` — SELECT — `user_id = auth.uid()`
- `Managers can manage coproprietaires` — ALL — `user_is_copro_manager(copro_id)`

### supplier_invoices (4)
- `supplier_invoices_select_manager` — SELECT — `user_is_copro_manager(copro_id)` (**aucune visibilité propriétaire/conseil** — normal, donnée fournisseur)
- INSERT — WITH CHECK `user_is_copro_manager(copro_id)` ; UPDATE — `user_is_copro_manager(copro_id)`
- DELETE — `user_is_copro_manager(copro_id) AND status='draft'`

## 3. Fonctions helper de sécurité (définitions réelles)

Toutes `SECURITY DEFINER`, `STABLE` (sauf `can_access_document` non-stable), `SET search_path=public`. Pattern commun : `auth.uid()` null → `FALSE`.

| helper | existe ? | source de vérité | logique réelle |
|---|---|---|---|
| **user_has_copro_access(p_copro_id)** | ✅ | `memberships` | true si une ligne `memberships(copro_id, user_id=auth.uid())` existe (tout rôle) |
| **user_is_copro_manager(p_copro_id)** | ✅ | `memberships` | true si role ∈ (`admin`,`gestionnaire`) |
| **user_is_council_member(p_copro_id)** | ✅ | `memberships` | role ∈ (`admin`,`gestionnaire`,`membre_cs`) ⚠️ basé sur memberships, **PAS** sur `council_members` |
| **user_is_lot_owner(p_lot_id)** | ✅ | `lot_owners`+`coproprietaires` | true si `lot_owners → coproprietaires.user_id=auth.uid()` et `end_date` futur/null |
| **user_owns_any_lot_in_copro(p_copro_id)** | ✅ | `lot_owners`+`coproprietaires` | idem mais à l'échelle copro |
| **get_user_lot_ids(p_copro_id)** | ✅ | `lot_owners`+`coproprietaires` | renvoie `uuid[]` des lots actifs de l'utilisateur dans la copro |
| **can_access_document(p_document_id, p_user_id)** | ✅ mais ⚠️ **CASSÉE** | `copro_members` (table inexistante) | référence `copro_members` et rôles `'manager'/'admin'` qui n'existent pas dans le schéma réel (la table est `memberships`, rôles `gestionnaire/admin`). **Lèvera une erreur si appelée.** N'est référencée par aucune policy active. |

### Helpers RLS additionnels trouvés (existent)
- `user_can_view_document(p_document_id)` ✅
- `is_council_member(p_copro_id, p_user_id)` ✅ et `is_council_president(p_copro_id, p_user_id)` ✅
- `user_is_lot_owner_in_copro(p_copro_id, p_lot_id)` ✅
- `user_is_lot_owner_or_manager(p_copro_id, p_lot_id)` ✅

> Incohérence à signaler : deux familles co-existent (`user_is_council_member` côté memberships vs `is_council_member` côté `council_members`) → dette de migration / risque de diverger. Idem `can_access_document` (cassée, table fantôme) vs `user_can_view_document`.

## 4. État de peuplement du lien identité

Le lien identité = colonne `coproprietaires.user_id` qui relie une personne physique à un compte `auth.users`. **C'est le verrou du portail copropriétaire** : tous les helpers propriétaire (`user_is_lot_owner`, `get_user_lot_ids`…) en dépendent.

| mesure | global | boucle d'or (22222222…) |
|---|---|---|
| coproprietaires — total | 28 | 5 |
| coproprietaires — `user_id IS NOT NULL` | **0** | **0** |
| lot_owners — total | 30 | — |
| lot_owners — rattachés à un user (via copro) | **0** | — |
| council_members — total | 4 | — |
| auth.users — total | **5** | — |

### memberships par rôle (avec user_id rattaché)

| scope | rôle | nb | avec user_id |
|---|---|---|---|
| global | admin | 9 | 9 |
| global | gestionnaire | 1 | 1 |
| global | membre_cs | 1 | 1 |
| global | coproprietaire | 1 | 1 |
| boucle d'or | admin | 1 | 1 |
| boucle d'or | gestionnaire | 1 | 1 |

**Lecture :** seuls les rôles gestionnaires/admins sont câblés (12 memberships, tous avec user_id). Aucun copropriétaire n'a d'identité : `coproprietaires.user_id = 0/28` (et 0/5 sur la boucle d'or), `lot_owners` rattachés à un user = 0/30. La boucle d'or n'a que 2 memberships (admin + gestionnaire), aucun copropriétaire connecté. Le membership unique de rôle `coproprietaire` (global) n'a pas de ligne `coproprietaires` correspondante peuplée en `user_id`.

## 5. Verdict synthétique

- **RLS désactivée sur 67 des 82 tables** `public` (≈ 82 %), dont **100 % du cœur financier** (ledger_entries, ledger_transactions, payments, payment_allocations, call_for_funds(_lines), accounts, accounting_periods, budgets, bank_movements, supplier_invoices, lot_accounts), **toute la GED** (documents + annexes) et **toutes les identités** (coproprietaires, lot_owners, memberships, profiles). Seules 15 tables (surtout périphériques : AG annexes, prêts, sinistres, travaux, assurances) ont RLS active.
- **Les policies existent mais sont inertes** : la logique de cloisonnement (gestionnaire vs propriétaire) est déjà écrite et globalement cohérente, mais sans `relrowsecurity=true` elle n'est jamais évaluée. Activer RLS demain ferait basculer ces tables d'« ouvertes à tous » à « filtrées » d'un coup → tester avant.
- **Le lien identité est à zéro côté copropriétaire** : `coproprietaires.user_id` = 0/28, `lot_owners` rattachés = 0/30. Tant que ce lien n'est pas peuplé, **aucun helper propriétaire ne peut renvoyer true** : un portail copropriétaire activé aujourd'hui afficherait des écrans vides (au mieux) même avec RLS correcte.
- **Deux bombes à désamorcer avant ouverture** :
  1. `can_access_document` est **cassée** (référence `copro_members` + rôles `manager/admin` inexistants) — toute policy/feature qui s'y appuierait planterait.
  2. Les SELECT sur `ledger_entries`/`ledger_transactions` utilisent `user_has_copro_access` (granularité copro, pas lot) : une fois RLS activée, **un copropriétaire verrait le grand livre entier de la copro**, pas seulement son compte. À restreindre (par `lot_id` / sous-compte 450) avant d'ouvrir le portail.
- **Risque global pour un accès copropriétaire** : **ÉLEVÉ en l'état**. Le modèle de droits est conçu mais ni activé (RLS off massif), ni alimenté (identités vides), ni entièrement sain (helper cassé + visibilité ledger trop large). Cet état est cohérent avec la phase dev assumée (mémoire `dev_phase_rls`), mais constitue la liste de blocage exacte à lever avant le go-live du portail.

### Chemin critique avant portail (déduit de l'audit)
1. Peupler `coproprietaires.user_id` (+ inviter les 5→N copropriétaires sur `auth.users`).
2. Activer RLS sur le cœur financier + GED + identités (et tester avec un user copropriétaire réel).
3. Restreindre la visibilité ledger au périmètre lot du propriétaire (remplacer `user_has_copro_access` par un filtre lot/sous-compte).
4. Corriger ou retirer `can_access_document` ; unifier les familles de helpers council (`user_is_council_member` vs `is_council_member`).
5. Couvrir les 4 tables RLS-off / 0-policy (`mails`, `mail_labels_v2`, `period_cutoff_items`) si elles doivent être exposées.

---

# CARTOGRAPHIE RÉELLE — CoProFlex (où vit chaque règle métier)

> Audit LECTURE SEULE — 2026-06-02. Repo: `Co-Pro-Flex/`. Base live: `iyfesbjnkpynmwlsmxnp`.
> Chemins relatifs à `Co-Pro-Flex/`. Vérifié par Grep/Read sur le code + introspection live (`pg_proc`, `pg_views`, `information_schema`, `pg_class`, `pg_policies`).
> Boucle d'or: copro `22222222-aaaa-bbbb-cccc-222222222222` « Le Clos Saint-Michel », exo 2026 ouvert.

---

## 0. Chiffres live (autoritaires — corrigent les 2 docs)

| Métrique | Live DB (2026-06-02) | AUDIT_COPROFLEX.md dit | PLAN dit |
|---|---|---|---|
| Tables (`public`, relkind='r') | **87** | 84 | (cite 84) |
| RLS activée / désactivée | **15 / 72** | 13 / 71 | 71 off |
| Tables avec policies écrites | **83** | 68 | 68 |
| Helpers RLS présents (6 cherchés) | **6/6** | ~12 helpers | ~12 helpers |
| Edge functions | **25** | 25 ✅ | — |
| Migrations `*.sql` | **111** | 105 ❌ | 105 |

→ Les deux docs sous-estiment tables (87 pas 84), policies (83 pas 68) et migrations (111 pas 105). La RLS est encore **plus prête** que l'audit ne le dit (83/87 tables ont déjà des policies). Les 6 helpers RLS cités au PLAN §4.5 existent tous (`user_has_copro_access`, `user_owns_any_lot_in_copro`, `user_is_lot_owner`, `get_user_lot_ids`, `user_is_council_member`, `can_access_document`).

---

## 1. Inventaire des 25 edge functions (`supabase/functions/*/index.ts`)

| # | Function | Rôle (1 ligne) |
|---|---|---|
| 1 | `ag_create` | Crée une AG (niveau 4B) |
| 2 | `ag_add_resolution` | Ajoute une résolution à une AG (4B) |
| 3 | `ag_cast_vote` | Enregistre un vote sur une résolution en séance (4B) |
| 4 | `ag_register_attendance` | Enregistre la présence d'un copropriétaire à l'AG (4B) |
| 5 | `ag_start_session` | Démarre la session live de vote (pas de header commentaire) |
| 6 | `ag_close` | Clôture l'AG (4B) |
| 7 | `ag_generate_document` | Génère les PDF AG (convocation, feuille présence, PV) — rendu pdf-lib incomplet (4D) |
| 8 | `ag_send_convocations` | Envoi convocations par email + traçabilité juridique, délai légal (5A) |
| 9 | `ag_send_relance` | Relance des convoqués non-répondants (5A) |
| 10 | `ag-get-live-results` | Renvoie les résultats de vote temps réel (wrapper RPC `get_ag_live_results`) |
| 11 | `ag-correspondence-eligible` | Liste les copropriétaires éligibles au vote par correspondance |
| 12 | `ag-register-correspondence-vote` | Enregistre un vote par correspondance (wrapper RPC `register_correspondence_vote`) |
| 13 | `send-convocation-email` | Envoi bas-niveau d'un email de convocation via Resend (`FROM_EMAIL`) |
| 14 | `email_webhook` | Réception webhooks Resend (livraison/ouverture/bounce) → `ag_notification_events` (5A) |
| 15 | `generate_call_for_funds` | Émet un appel de fonds via RPC canonique `post_call_for_funds` (450-x/701) |
| 16 | `generate_owner_statement` | Génère un relevé individuel copropriétaire (2G) |
| 17 | `record_payment` | Encaisse un paiement copro via `post_owner_payment` (FIFO, 512/450-x, trop-perçu→450-3) |
| 18 | `create_supplier_invoice` | Comptabilise facture fournisseur via `post_supplier_invoice` (6xx/401, TVA sur pièce) |
| 19 | `pay_supplier_invoice` | Règle une facture fournisseur via `post_supplier_payment` (401/512, lettrage) |
| 20 | `run_payment_reminders` | CRON quotidien d'envoi auto des relances d'impayés (5B) |
| 21 | `send_manual_payment_reminder` | Relance manuelle pour un lot précis (5B) |
| 22 | `get_document_url` | URLs signées sécurisées pour la GED (6C) |
| 23 | `maintenance-workflow` | Opérations transactionnelles maintenance (ordres de service, etc.) |
| 24 | `council-workflow` | Opérations conseil syndical |
| 25 | `communication-workflow` | Opérations communication (mur, événements, messagerie) |

> Note: 15/16/19/22 + `ag-*-eligible/live/correspondence` sont des wrappers d'edge function **doublonnés par des RPC directes** appelées côté front (`supabase.rpc`). L'audit (§5 nuance) les liste comme « orphelines » côté `functions.invoke` — **faux positifs probables**, ne pas supprimer sans vérifier le chemin RPC.

---

## 2. Les 9 domaines — où vit chaque règle

> Légende: **SQL** = migration `supabase/migrations/` · **EDGE** = `supabase/functions/` · **FRONT** = `src/`. Fonctions live confirmées par `pg_proc`.

### (1) AG — majorités & calcul des votes
- **SQL (moteur, source de vérité)**:
  - `20260125_niveau4b_ag.sql` — schéma AG + `compute_majority_threshold(majority_type, total_tantiemes, present_tantiemes, total_owners, present_owners)`, `calculate_resolution_result(p_resolution_id)`, `cast_vote(...)`, `create_ag_with_standard_resolutions(...)`.
  - `20260531160000_wp2_art24_exprimes.sql` — **art. 24 sur les voix EXPRIMÉES** (exclut abstentions) — patch clé (contient `EXCEPTION WHEN OTHERS`, à auditer).
  - Vue live `v_ag_resolutions_results`, `v_ag_resolution_vote_summary`, `v_ag_vote_stats_by_resolution`.
- **EDGE**: `ag_cast_vote`, `ag-get-live-results` (→ RPC `get_ag_live_results`).
- **FRONT (miroir d'affichage — duplication de la règle)**:
  - `src/components/features/ag/Session/utils.ts` — recalcule les seuils art.24/25/26 côté client.
  - `src/components/features/ag/Session/SyntheseTantiemes.tsx`, `src/features/ag/session/services/quorum.ts`, `src/hooks/modules/useFeuillePresence.ts`.
  - Constante légale: `docs/claude/business-rules.md` (`seuilArt24 = floor(présents/2)+1`, etc.).
- ⚠️ **Double implémentation majorités** (SQL `compute_majority_threshold` + JS `Session/utils.ts`) → risque de divergence ; à vérifier en actif sur la boucle d'or.

### (2) AG — pouvoirs / correspondance / opposants / quorum
- **SQL**: `20260125_niveau4e_correspondence_votes.sql` (votes correspondance art.17-1 A) ; `20260201_ag_pouvoirs_session.sql` (table `ag_pouvoirs`, mandats) ; `register_correspondence_vote(p_ag_id, p_coproprietaire_id, p_resolution_id, p_vote, p_form_id)` ; `save_ag_pouvoir(p_ag_id, p_mandant_id, p_mandataire_id, p_signed_at)` ; `compute_ag_quorum(p_ag_id)`. Vues `v_ag_correspondence_status`, `v_ag_attendance_summary`.
- **EDGE**: `ag-correspondence-eligible`, `ag-register-correspondence-vote`, `ag_register_attendance`.
- **FRONT**: `src/features/ag/votes-correspondance/` + `votes-correspondance-copro/`, `src/features/ag/preparation/components/PreparationPouvoirsTab.tsx`, `src/features/ag/session/hooks/useSessionPresence.ts`, `src/features/ag/feuille-presence/`.
- ⚠️ Plafond légal **≤ 3 mandats (art. 22)**: à vérifier — chercher le garde-fou dans `save_ag_pouvoir`/front pouvoirs.

### (3) Charges / répartition / clés
- **SQL**: `20260531130000_wp3_keys_ventilation.sql` — `repartition_key_is_complete(p_key_id)` (garde-fou Σweight) + `post_call_for_funds` (ventile `round(total*weight/Σweight,2)`) ; `20260531230000_wp3_call_lines_lot_tantiemes.sql` ; `20260531272000_cr8_appel_largest_remainder.sql` (**largest remainder** pour absorber l'arrondi). Tables `repartition_keys` / `repartition_key_lines(key_id, lot_id, weight)`.
- **FRONT**: `src/features/finance/chargeKeys/` (`useCleDetailPage.ts`), `src/features/finance/tantiemes/` (`LotsTable.tsx`, `useTantiemesPage.ts`), `src/features/finance/cles-repartition/` (cf. route), `src/components/features/lots/LotsRepartitionGrid.tsx`.
- ⚠️ **Redondance confirmée**: la table `lots` porte **4 colonnes** `tantiemes_generaux/escalier/ascenseur/chauffage` (live) EN PLUS de `repartition_key_lines`. Les 2 docs n'en citent que 3 (`_chauffage` non documenté). 20 fichiers front lisent `tantiemes_generaux` → deux sources de vérité pour le même poids (cf. retour #16).

### (4) Grand livre — partie double
- **SQL (cœur)**:
  - `20260125_niveau2d_ledger.sql` — `create_ledger_transaction(...)` + tables `ledger_transactions`/`ledger_entries`.
  - `20260531120000_wp1_finance_rpcs.sql` — 4 RPC canoniques `post_call_for_funds`, `post_owner_payment`, `post_supplier_invoice`, `post_supplier_payment`, `allocate_payment`.
  - `20260531011212_wp1_enforce_lot_id_on_45x.sql` — `lot_id` obligatoire sur comptes 45x.
  - `20260531261000_cr3_ledger_tx_balance_guard.sql` — garde équilibre débit=crédit (contient `EXCEPTION WHEN OTHERS`).
  - `20260531250000_wp_code_review_search_path.sql` — durcissement `search_path`.
  - Vues balance/grand-livre `v_balance*`, `v_ledger*` (à confirmer), `v_lot_balance`.
- **FRONT**: `src/lib/finance/api.ts`, `src/features/finance/comptabilite/` (`useComptabilitePage.ts`), `src/features/finance/balance/`.
- Immutabilité après posting: triggers dans les migrations `wp5_1_opening_balance_immutability_exemption` + cut-off `wp5_2_cutoff_immutability_exemption`.

### (5) Appels / paiements / FIFO / cut-off / surallocation
- **SQL**:
  - FIFO + idempotence: `20260531120000_wp1_finance_rpcs.sql` (`allocate_payment`, `post_owner_payment`), `20260531262000_cr4_allocate_payment_lot_filter.sql` (filtre lot, cloisonnement nature), `20260531270000_cr5_payment_idempotency_schema.sql` + `..271000_cr5_payment_idempotency_rpcs.sql`.
  - Surallocation/trop-perçu: `20260126_action3_surallocation_paiements.sql` (→ 450-3).
  - Cut-off (WP5.2): `20260601111000_wp5_2_period_cutoff_items.sql`, `..112000_post_period_cutoff.sql`, `..113000_reverse_period_cutoff.sql`, `..110000_cutoff_immutability_exemption.sql` (contient `EXCEPTION WHEN OTHERS`).
  - Statut auto appels: `20260126_action2_auto_call_status.sql` ; invariant total: `20260126_action1_invariant_appel_total.sql` (vue `v_call_total_mismatch`).
- **EDGE**: `record_payment`, `generate_call_for_funds`.
- **FRONT**: `src/features/finance/appels-fonds/` (wizard `CreateCallWizard/`, `useCreateCallWizard.ts`, `useAppelsFondsActions.ts`), `src/lib/finance/api.ts`.

### (6) Fonds travaux ALUR (art. 14-2)
- **SQL**: `20260129_alur_transfers.sql` (table `alur_transfers`) ; `create_alur_fund_from_ag(p_ag_id, p_montant, p_modalites)` ; vues `v_alur_fund_summary`, `v_alur_lot_contributions`, `v_alur_transfers_history`. Modèle D 450-5 / C 105 (cotisation) — cf. RPC d'appel.
- **FRONT**: `src/features/finance/fonds-alur/` (`ALURStatsCards.tsx`, `TransferModal.tsx`), `src/hooks/modules/useALURData.ts`, `src/lib/ag/api/finalisation.api.ts`.
- ❌ **Gap confirmé (live)**: aucune fonction d'**affectation 105 → 705** (recherche `%105%705%`, `%affect%`, `%705%` → vide). L'appel crédite bien 105 mais l'affectation aux travaux votés n'est pas implémentée (cf. mémoire `alur_fonds_travaux_accounting` + audit §3.2).

### (7) Mutations / état daté (art. 20)
- **SQL**: `20260125_niveau3a_mutations_seed.sql` + `create_etat_date_snapshot`, `generate_etat_date_payload`, `initialize_mutation_steps`, `upsert_mutation_step`, `validate_mutation`. Tables `mutations`, `mutation_steps`, `etat_date_snapshots`, `lot_owners(start_date/end_date, share_percent, is_primary)`.
- **EDGE**: `validate_mutation` (invoqué depuis `src/features/ventes/api/mutationsApi.ts:240` via `/functions/v1/validate_mutation` — **edge HTTP, pas RPC**).
- **FRONT**: `src/features/ventes/` complet (PDF état daté `pdf/generateEtatDatePDF.ts` + `sections/`, détail `detail/`, `hooks/useMutationDetail.ts`, `api/mutationsApi.ts`). Doublon de route `ventes-impayes/ventes` vs `sales`.
- ⚠️ Gap mineur (PLAN §3.2): pas de `lot_owners.type_droit` (usufruit/nue-propriété).

### (8) Clôture / annexes / affectation résultat
- **SQL**:
  - Périodes WP5.1: `20260601094000_wp5_1_period_functions.sql` (`approve_period`), `..095000_open_next_period.sql`, `..097000_fix_carry_report_accounts.sql` (à-nouveau), `..096000_ag_approval_hook.sql`. WP5.2: `20260601101000_wp5_2_reopen_period.sql` + `..102000_..._hardening.sql` (contient `EXCEPTION WHEN OTHERS`). Fonctions live: `close_period`, `open_next_period`, `approve_period`, `reopen_period`.
  - **Annexes (live)**: `fn_annexe_1`, `fn_annexe_1_detail_copros`, `fn_annexe_2`, `fn_annexe_3`, `fn_annexe_4`, `fn_annexe_5` — **les 5 annexes décret 2005-240 existent en base** (contredit l'audit qui dit « annexe 1 seulement, 2-5 manquantes »).
- **FRONT**: `src/app/(dashboard)/documents/{annexes,closing,ledger,balance,expenses}`, `src/components/features/ag/Closure/ClosureRecap.tsx`.
- Affectation résultat (120/110 → 450): cf. mémoire `affectation_resultat_copro` (WP5.3) — vérifier présence d'une RPC dédiée (non trouvée par nom explicite → probablement dans `open_next_period`/à-nouveau).

### (9) Propagation AG → budget → appels
- **SQL (orchestrateur)**:
  - `20260531170000_wp2_orchestrator.sql` — `generate_calls_from_ag_payload(p_copro_id, p_ag_id, p_resolution_id, p_payload)` + `activate_ag_decisions(p_ag_id)` (contient `EXCEPTION WHEN OTHERS`).
  - `20260531170500_wp2_prepare_reuse_budget.sql` (prépare la réutilisation budget).
  - `20260601096000_wp5_1_ag_approval_hook.sql` + `..098000_fix_ag_approve_guard.sql` — `activate_ag_decisions` (re)définie.
  - `20260531190000_wp6_appel_budget_agrege.sql` — `post_budget_call_for_funds` (appel agrégé multi-clés) + redéfinit `generate_calls_from_ag_payload`.
  - Fonctions live: `prepare_ag_decisions`, `activate_ag_decisions`, `close_ag`, `create_budget_from_ag(p_ag_id, p_exercice, p_postes)`, `create_alur_fund_from_ag`, `elect_council_from_ag(p_ag_id, p_membres)`, `finish_ag_session(p_ag_id)`. Tables `ag_pending_actions`, `ag_milestones`.
- **FRONT**: `src/components/features/ag/Closure/ClosureRecap.tsx:134` (`prepare_ag_decisions`), `src/features/ag/pv/hooks/usePVPage.ts:674` (`activate_ag_decisions`), `src/lib/ag/api/finalisation.api.ts:169` (`generate_combined_calls_from_ag`).
- Spec/dette: `docs/plans/2026-03-07-ag-decision-engine-plan.md`, `.planning/spec/ENTITIES_MAP/06-ag-votes.md`.

---

## 3. Route group `(coproprietaire)` & `/espace/*` — CONFIRMÉ ABSENTS ✅

- `src/app/` ne contient que: `(dashboard)`, `(gestionnaire)`, `(marketing)`, `api`, `auth`. **Aucun `(coproprietaire)`**.
- `find src/app -type d -iname "*espace*"` → **vide**. `find ... -iname "*coproprietaire*"` → ne renvoie que `src/app/(dashboard)/coproprietaires` (liste copropriétaires **côté gestionnaire**, pas un portail).
- Les 2 occurrences `/espace` du Grep (`useAgSessionPage.ts`, `useVotesCorrespondanceCoproPage.ts`) sont des **faux positifs** (sous-chaîne, pas un chemin de route).
- → Conforme à l'attendu: le portail copropriétaire du PLAN_MAITRE (§4.3, routes `/espace/dashboard`, `/espace/mon-compte`…) **n'existe pas encore** ; c'est du « à construire ».

---

## 4. DIVERGENCES réalité ↔ documents

### vs `AUDIT_COPROFLEX.md`
| Sujet | Doc dit | Réalité live | Sévérité |
|---|---|---|---|
| Nb tables | 84 | **87** | mineur (chiffre) |
| Migrations | 105 | **111** | mineur |
| Tables avec policies | 68 | **83** | mineur (RLS encore plus prête) |
| RLS off | 71 | **72** | mineur |
| **Annexes comptables** | « annexe 1 seulement, 2-5 manquantes » (§3.2, §6) | **`fn_annexe_1..5` toutes présentes en base** | ⚠️ **majeur** (l'audit sous-estime) — vérifier le rendu PDF front, qui peut être le vrai manque |
| `lots.tantiemes_*` | 3 colonnes citées (#16) | **4 colonnes** (+`tantiemes_chauffage`) | mineur (doc incomplet) |
| Fonction expense→ledger | (implicite) | nom réel = **`validate_budget_expense`**, PAS `validate_expense_to_ledger` (inexistante) | nommage |

### vs `.planning/PLAN_MAITRE_VUE_COPROPRIETAIRE.md`
| Sujet | Doc dit | Réalité live | Statut |
|---|---|---|---|
| `coproprietaires.user_id` | « existe déjà » (§ mapping, §4.4) | ✅ **présent** | conforme |
| `coproprietaires.consent_demat` | « à ajouter » (§4.4) | ✅ **absent** (à créer) | conforme (gap connu) |
| `coproprietaires.is_resident`/`is_company` | cités | ✅ présents | conforme |
| Helpers RLS (6) | « déjà écrits, à réutiliser » | ✅ **6/6 présents** | conforme |
| Vues portail (`v_owner_statement_*`, `v_call_lines_detailed`, `v_ag_overview`, `v_coproprietaires_overview`, `v_lot_balance`) | « existent » | ✅ **toutes présentes** (live) | conforme |
| `lot_owners.type_droit` | « manque » | ✅ absent | conforme (gap) |

→ Le PLAN_MAITRE est **fidèle au réel** (il a été réécrit post-audit). Seul l'AUDIT a 2 écarts notables: **annexes 2-5 sous-estimées** et chiffres (tables/migrations/policies). Le PLAN reste juste sur les fondations du portail.

---

## 5. Doublons / risques connus (confirmés)

1. **Deux générateurs d'appels — CONFIRMÉ LIVE (les 2 coexistent)**:
   - `generate_calls_from_ag_payload(p_copro_id, p_ag_id, p_resolution_id, p_payload)` — incrémental, route par `post_call_for_funds` (chemin orchestrateur AG, cf. `docs/plans/2026-03-07-ag-decision-engine-plan.md:273`).
   - `generate_combined_calls_from_ag(p_ag_id, p_nb_appels)` — appelé par le **front** `src/lib/ag/api/finalisation.api.ts:169`.
   - Risque: sémantiques divergentes (incrémental vs destructif), unification **WP2.6 NON faite** (`.planning/PROMPT_REPRISE.md:79`, `PLAN_CORRECTION_FINANCE.md:113`). Arrondi non rattrapé sur le dernier appel (écart centimes — `PROMPT_REPRISE.md:103`).

2. **Redondance `lots.tantiemes_*` vs `repartition_key_lines`** — CONFIRMÉ: 4 colonnes tantièmes sur `lots` (live) + table de poids par clé. 20 fichiers front lisent les colonnes `lots`. Deux sources de vérité (retour #16).

3. **`EXCEPTION WHEN OTHERS` dans les RPC** — 7 migrations concernées (avalent les erreurs, risque de faux succès silencieux):
   - `20260531160000_wp2_art24_exprimes.sql` (calcul majorité art.24)
   - `20260531170000_wp2_orchestrator.sql` (`activate_ag_decisions`)
   - `20260531261000_cr3_ledger_tx_balance_guard.sql` (garde équilibre GL)
   - `20260601102000_wp5_2_reopen_period_hardening.sql`
   - `20260601110000_wp5_2_cutoff_immutability_exemption.sql`
   - `20260601110000_ensure_dev_membership.sql`
   - `20260126_tests_logic_metier.sql` (tests, moindre enjeu)
   - + dans `supabase/tests/` et `migrations_disabled/` (hors prod).

4. **Double calcul des majorités** (SQL `compute_majority_threshold` + JS `Session/utils.ts`) — risque de divergence front/back à recalculer sur la boucle d'or.

5. **`post_owner_payment`, `post_supplier_payment`, `post_budget_call_for_funds` existent en DOUBLE signature** (live): version sans et avec `p_idempotency_key` / `p_installment_*`. Surcharges PL/pgSQL → vérifier que le front cible la bonne (résolution d'overload Postgres).

---

## 6. Pointeurs pour les 9 agents d'audit (fichiers à lire en priorité)

- **Agent 1 (majorités)**: `migrations/20260125_niveau4b_ag.sql` (`compute_majority_threshold`, `calculate_resolution_result`), `20260531160000_wp2_art24_exprimes.sql` ; front `src/components/features/ag/Session/utils.ts`. Recalcul live: `v_ag_resolutions_results` sur AG de `22222222`.
- **Agent 2 (pouvoirs/corresp.)**: `migrations/20260201_ag_pouvoirs_session.sql`, `20260125_niveau4e_correspondence_votes.sql` (`save_ag_pouvoir`, `register_correspondence_vote`, `compute_ag_quorum`).
- **Agent 3 (clés)**: `migrations/20260531130000_wp3_keys_ventilation.sql`, `20260531272000_cr8_appel_largest_remainder.sql` ; tester redondance `lots.tantiemes_*`.
- **Agent 4 (GL)**: `migrations/20260531120000_wp1_finance_rpcs.sql`, `20260125_niveau2d_ledger.sql`, `20260531261000_cr3_ledger_tx_balance_guard.sql`.
- **Agent 5 (appels/paiements)**: `20260531262000_cr4`, `20260531271000_cr5`, `20260126_action3_surallocation`, cut-off `20260601111000..113000`.
- **Agent 6 (ALUR)**: `migrations/20260129_alur_transfers.sql` + `create_alur_fund_from_ag` ; vérifier absence 105→705.
- **Agent 7 (mutations)**: `20260125_niveau3a_mutations_seed.sql` (`validate_mutation`, `create_etat_date_snapshot`) ; front `src/features/ventes/`.
- **Agent 8 (clôture/annexes)**: `20260601094000..097000` (périodes/à-nouveau), `fn_annexe_1..5` (live) ; front `documents/annexes|closing`.
- **Agent 9 (propagation AG)**: `20260531170000_wp2_orchestrator.sql`, `20260601096000_wp5_1_ag_approval_hook.sql`, `20260531190000_wp6_appel_budget_agrege.sql` ; front `ClosureRecap.tsx`, `usePVPage.ts:674`, `finalisation.api.ts:169`. **C'est le domaine le plus risqué** (2 générateurs, `EXCEPTION WHEN OTHERS`).

---
*Fin — audit lecture seule. Aucune écriture en base, aucun fichier modifié.*
```