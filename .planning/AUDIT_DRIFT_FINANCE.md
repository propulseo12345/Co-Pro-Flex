# AUDIT DE DRIFT — Finance (code app ↔ schéma migrations 0001→0035)

> **État des lieux, PAS de code.** Confronte ce que le code applicatif (front + hooks + lib + edges finance) **référence** au schéma **réellement gravé** par les migrations `supabase/migrations/0001→0035` (devenu autoritaire le 2026-06-07).
> Produit le 2026-06-07 par workflow multi-agents (30 agents, ~2,7 M tokens, ~11 min).

## Méthodologie

1. **Contrat de schéma** (vérité-terrain) reconstruit depuis les 35 migrations : tables+colonnes, signatures RPC, vues, enums (59 k caractères).
2. **Audit** de 13 surfaces finance en parallèle : grep `.from/.rpc/.select/.insert/.update/.invoke` → chaque référence confrontée au contrat.
3. **Vérification adversariale** par surface : chaque finding re-grepé contre les migrations **réelles** ; un finding ne survit que si les migrations *prouvent* le drift (`isReal=false` par défaut en cas de doute).

## Verdict

**118 références cassées confirmées** (≈ **96 uniques** après dédup inter-surfaces) : **71 BLOCKER** (plantent à l'exécution), **19 MAJOR** (casse partielle / dégradation silencieuse), **6 MINOR** (drift de type / fragilité).

**Cause racine** : le code a été écrit contre l'**ancien schéma** (`supabase/migrations_legacy/`). La base cible 0001→0035 a :
- **rationalisé les enums** (purge de valeurs : `pending_approval`, `bank_transfer`, `locked`, `rejected`, `validated`, `awaiting_invoice`…),
- **fusionné `suppliers` → `tiers`** (flag `is_supplier`),
- **droppé les `tantiemes_*` sur `lots`** (quote-part → `repartition_key_lines.weight`) et les compteurs morts sur `copros` (`total_tantiemes`, `buildings_count`),
- **renommé des colonnes** (`supplier_id`→`tiers_id`, `fournisseur`→`tiers_id`, `banque`→`bank_name`, `account_code/category`→`account_id`, `alur_budget_id`→`budget_id`, `description`→`notes`),
- **abandonné ~12 vues d'agrégat** que tout le front lit (`v_calls_overview`, `v_budgets_overview`, `v_general_ledger`, `v_supplier_invoices_overview`, `v_lots_with_owners`, `v_repartition_key_*`, `v_unpaid_with_reminders`, `v_payment_reminders_overview`, `v_alur_lot_contributions`…),
- **abandonné `post_call_for_funds` (mono-clé)** au profit de `post_budget_call_for_funds` (10 args, agrégé).

**Où ça fait le plus mal** : module **appels de fonds** entièrement mort, module **budgets/ALUR** plante au chargement, **onboarding copro** échoue dès le 1er INSERT, **grand livre / état daté / clés de répartition / factures** lisent des vues inexistantes.

---

## CARTE DE REBRANCHEMENT PRIORISÉE

> ⚠️ Plusieurs écrans visés sont listés **MORTS** dans `atlas/MATRICE-LIAISON.md` (transactions, bank-movements, budget-works/current, budgets/validation, invoices/**, /sales) → **SUPPRIMER, pas réparer**. Vérifier l'atlas §7 avant tout fix.

### 🔴 BLOCKER — chantiers profonds (deep)

| # | Écran / zone | Refs cassées | Action cible |
|---|---|---|---|
| 1 | **Appels de fonds** (wizard `createCall` + edge `generate_call_for_funds`) | `v_call_campaigns`, `v_calls_overview`, `v_call_lines_detailed`, `post_call_for_funds` (abandonnée) | Rebrancher `createCall` ET l'edge sur **`post_budget_call_for_funds`** (10 args, retirer `p_repartition_key_id/p_total_amount/p_description`, `p_budget_id` obligatoire). Remplacer les 3 vues fantômes par requêtes sur `call_for_funds` + `call_for_funds_lines`. **Atlas R5 : seul chemin posté au GL aujourd'hui → rebrancher l'edge AVANT tout drop.** |
| 2 | **Onboarding copro** (`createCopropriete` + lots + comptes) | `copros.buildings_count`, `copros.cabinet_id` (NOT NULL), `copros.exercice_debut` (int2 mois vs `'MM-DD'`), `memberships.role='admin'`, `accounts.banque`, `v_lots_with_owners` | Échoue dès le 1er INSERT. Retirer `buildings_count` ; ajouter `cabinet_id` ; `exercice_debut` = entier mois (1..12) + réécrire `deriveExercicePeriod`/`deriveExerciceYearForDate` ; `role`→`'gestionnaire'` ; `banque`→`bank_name` ; dériver `v_lots_with_owners` des tables. |
| 3 | **Budgets + onglet ALUR** (`listBudgets`/`getBudget`/expenses) | `v_budgets_overview`, `v_budget_lines_overview`, `v_budget_expenses_detail`, `v_alur_lot_contributions`, `budget_expenses.fournisseur`, `budgets.status='pending_approval'` | Recréer les 4 vues (migration 0036+) ou requêter les tables. `fournisseur`→`tiers_id` (⚠️ texte→uuid). Enum→`'submitted'`. |
| 4 | **État daté + clés de répartition + tantièmes** (`lib/lots`, `lib/owners`) | `v_lots_with_owners`, `v_repartition_key_totals`, `v_repartition_key_lines_detailed`, `lots.tantiemes_*` (droppées), `copros.total_tantiemes` | `lots` n'a plus de `tantiemes_*` : tout passe par `repartition_key_lines.weight` (`upsertRepartitionKeyLine` existe déjà). `total_tantiemes` = Σ weight clé générale active. Recréer/requêter les 3 vues. |
| 5 | **Grand livre + diagnostic finance** | `v_general_ledger`, `v_account_balances` (abandonnée), `v_finance_integrity_issues` | `v_general_ledger` à **créer** (jointure `ledger_entries`+`ledger_transactions` status='posted'+`accounts`+`lots`) ou requêter. `v_account_balances` → dériver de `accounts`+`bank_movements`. `v_finance_integrity_issues` = **RPC** `audit_finance_integrity(p_copro_id)`. |
| 6 | **Factures fournisseurs** (`listSupplierInvoices`/`createDirect` + edges) | `suppliers` (table), `v_supplier_invoices_overview`, `supplier_invoices.supplier_id`, edge args `p_supplier_id`/`p_related_service_order_id` | `suppliers`→`tiers` (`is_supplier=true`). `supplier_id`→`tiers_id` (INSERT+SELECT, `tiers_id` NOT NULL). Embed `suppliers(name)`→`tiers(name)`. Edge : `p_supplier_id`→`p_tiers_id`, `p_related_service_order_id`→`p_service_order_id`. **Atlas R6 : passer par les edges (écriture GL) au lieu de l'UPDATE direct.** |

### 🔴 BLOCKER — efforts moyens / rapides

| # | Écran / zone | Refs cassées | Action cible | Effort |
|---|---|---|---|---|
| 7 | **ALUR transferts** (`createTransfer`) | `alur_budget_id`, `description`, `destination_budget_id`, enum `destination` | `alur_budget_id`→`budget_id` ; `description`→`notes` ; retirer `destination_budget_id` ; `'compte_courant'`→`'operating'`, `'budget_travaux'`→`'works'` | quick |
| 8 | **Impayés + relances** | `v_unpaid_with_reminders`, `v_payment_reminders_overview` | Recréer en migration (sur `payment_reminders` + `v_unpaid_by_lot`) ou requêter. Atlas : GARDER cible. | medium |
| 9 | **Modal paiement + edges** (`record_payment`, `pay_supplier_invoice`) | `payment_method='bank_transfer'` | →`'transfer'` (PaymentModal state + `method ?? 'transfer'` dans les 2 edges). Bug documenté 0026 l.45 / 0029 l.34. | quick |
| 10 | **Échéanciers travaux** (`payment-schedules`) | `phase_number/percentage/is_retention/.../paid_date/invoice_ref/document_id` (absentes), `label`, `status='awaiting_invoice'` | `label`→`phase_label`, `order('phase_number')`→`phase_label/due_date`, retirer colonnes inexistantes, `'awaiting_invoice'`→`'called'`. **Atlas : table en DROP séquencé → vérifier si à supprimer.** | medium |
| 11 | **Annexes comptables** (`fn_annexe_2/3`) | arg `p_next_period_id` (inexistant) | Ne plus passer `p_next_period_id` (signature = `(p_copro_id, p_period_id)`). | quick |
| 12 | **Rejet période** (`rejectPeriod`) | `accounting_periods.status='rejected'` | `'rejected'` n'existe pas (enum = `open/closed/approved`) → supprimer la fonctionnalité ou modéliser autrement. | medium |
| 13 | **Relevé propriétaire** (edge `generate_owner_statement`) | args `p_date_from`/`p_date_to` | Retirer (signature = `p_copro_id, p_owner_id, p_period_id, p_lot_id`). | quick |

### 🟠 MAJOR

| Écran / zone | Ref cassée | Action |
|---|---|---|
| Stats impayés (`getImpayesStats`) | `v_unpaid_by_lot.unpaid_amount` / `.severity` | `unpaid_amount`→`total_unpaid` ; `severity` à dériver app-side depuis `days_overdue` |
| Catégorisation bancaire | `v_bank_movements_overview.account_id/created_at` non exposés | Ajouter `account_id` au SELECT de la vue ; routage compteCourant/Travaux cassé silencieux |
| Clôture période (`closePeriod`) | `close_period` renvoie jsonb, pas `true` | Tester `data?.success === true` (sinon succès lu comme échec) |
| Reprise mandat (`postOnboardingOpeningBalances`) | `source_type='opening_balance'` divergent | Router par `set_opening_balance` (`'opening_onboarding'`) sinon reprise invisible du snapshot/résidu 471/472 |
| Rattachement devis→budget (`useBudget`) | `documents.budget_id` absente | Utiliser `tags[]` (déjà en place) ; retirer l'UPDATE silencieux |
| Historique ALUR | `v_alur_transfers_history.destination_budget_id/_name`, `description` | Toujours `undefined` ; `description`→lire `notes` |
| Relance manuelle (edge) | `lots.owner_id` inexistant | Résoudre via `lot_owners` (is_primary, end_date null) ou `v_unpaid_lot_owner.owner_id` |
| Filtres factures/paiements | `supplier_invoice_status`/`payment_status` invalides | →`['draft','posted']` ; →`'recorded'` |
| Année construction copro | `copros.annee_construction` int2 vs string | Typer `number` côté TS |

### 🟡 MINOR
Types TS `period_status` autorisant `locked/rejected` (purgés) ; `v_trial_balance.account_parent_id` non exposé ; `budget_expenses.piece_jointe` uuid vs string ; `getAccountingPeriod` `.single()` fragile sur année civile.

---

## Corrections de masse (quick wins, fort ROI)

Renommages mécaniques à passer en lot (souvent un find/replace ciblé + ajustement de type) :
- **`payment_method`** : `'bank_transfer'` → `'transfer'` (PaymentModal + 2 edges)
- **`supplier_id`** → **`tiers_id`** (lib/finance INSERT+SELECT) + embed `suppliers(name)` → `tiers(name)`
- **`accounts.banque`** → **`bank_name`** (onboarding INSERT+SELECT+propriété exposée)
- **`budget_expenses.fournisseur`** → **`tiers_id`** (⚠️ texte→uuid, pas un simple rename)
- **`alur_transfers`** : `alur_budget_id`→`budget_id`, `description`→`notes`, retirer `destination_budget_id`, enum destination
- **`budgets.status`** : `'pending_approval'` → `'submitted'`
- **`fn_annexe_2/3`** : retirer `p_next_period_id`
- **`get_owner_statement`** (edge) : retirer `p_date_from/p_date_to`
- **edge `create_supplier_invoice`** : `p_supplier_id`→`p_tiers_id`, `p_related_service_order_id`→`p_service_order_id`
- **`closePeriod`** : `data?.success === true`
- **`v_unpaid_by_lot.unpaid_amount`** → `total_unpaid`
- **enums filtres** : `supplier_invoices.status`→`['draft','posted']`, `payments.status`→`'recorded'`, `payment_phase_status`→`'called'`
- **`useBudget`** : retirer UPDATE `documents.budget_id` (rattachement via `tags[]`)
- **onboarding** : retirer `buildings_count`, `role`→`'gestionnaire'`
- restreindre types TS `period_status` à `open|closed|approved`

## Chantiers profonds

1. **Recréer les vues d'agrégat manquantes** (migrations 0036+) ou les remplacer par des requêtes : `v_general_ledger`, `v_budgets_overview`/`_lines_overview`/`_expenses_detail`, `v_calls_overview`/`_call_lines_detailed`/`v_call_campaigns`, `v_supplier_invoices_overview`, `v_lots_with_owners`, `v_repartition_key_totals`/`_lines_detailed`, `v_unpaid_with_reminders`/`v_payment_reminders_overview`, `v_alur_lot_contributions`. **Chantier pivot — débloque le plus d'écrans.**
2. **Rebrancher la création d'appels** sur `post_budget_call_for_funds` (atlas R5 — rebrancher l'edge AVANT drop).
3. **Refondre la persistance des tantièmes** (`lib/lots`) : tout via `repartition_key_lines.weight`.
4. **Reconstruire l'onboarding copro** de bout en bout (cabinet_id, exercice_debut en mois, lots sans tantiemes_*).
5. **Rebrancher les factures fournisseurs** sur la compta d'engagement (atlas R6, edges `post_supplier_invoice`/`post_supplier_payment`, `suppliers`→`tiers`).
6. **Refondre la catégorisation bancaire** (`account_id` / `bank_matches`).
7. **Aligner la reprise de mandat** sur `set_opening_balance`.
8. **Repenser le rejet de période** (`'rejected'` n'existe pas).

---

## Recommandation de séquençage (tranche verticale finance-first)

1. **Décider vues vs requêtes** : créer une migration `0036_vues_drift_finance.sql` qui recrée les vues GARDER de l'atlas (le plus rapide pour débloquer en masse) — OU requêter les tables. *Décision à trancher avec USER (impacte beaucoup de fichiers).*
2. **Passer les quick wins** (renommages/enums) en commits séparés par cluster.
3. **Rebrancher la boucle financière testable** : onboarding copro → appels de fonds → paiement → grand livre/relevé, de bout en bout, sur la boucle d'or `22222222`.
4. **Trancher les écrans morts** (atlas §7) : supprimer plutôt que réparer.

## Angles morts / à confirmer
- Findings `uncertain` non tranchés par les agents (peu nombreux) — à revoir si un écran reste cassé après correction.
- Surfaces hors finance (AG, maintenance, comm, GED, ventes) **non auditées** ici — drift probable similaire, à auditer en suivant.
- Vérifier écran par écran le statut MORT/vivant (atlas §7) avant de réparer.
