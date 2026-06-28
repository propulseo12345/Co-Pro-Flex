# Audit from-scratch — chasse à la copie paresseuse (BL) — 2026-06-28

> Re-audit adversarial (4 hunters « default-to-suspicion ») demandé par USER après avoir constaté que j'avais sous-pondéré le from-scratch (PE-2/PE-4). Filtre = règle « copie à deux voies ». Source : workflow `audit-from-scratch-baseline`.
> **Verdict : direction maigre/finance-first = la bonne, gros du tri fait, MAIS pas prêt à graver 0003 tant que (a) le drift chart est tranché, (b) quelques corps de RPC sont lus, (c) le statut de `commitments` est confirmé.**

## 🔴 3 grosses rouilles vérifiées en base
1. **`provision_copro_chart` insère le plan comptable INTÉGRAL (~85 comptes)** alors que le golden n'en exerce que **~25** → ~60 comptes à couper. C'est exactement le réflexe « on amène tout parce que la v1 l'avait ». Le décret 2005-240 n'oblige pas à instancier tous les comptes par copro, seuls les mouvementés (les autres = `INSERT` trivial avec leur feature).
2. **La moitié des vues que BL-06 range « dans la baseline » N'EXISTENT PAS dans qqfq** (rouille de blueprint du 4 juin contre l'ancien live iyfes : `v_lot_balance`, `v_owner_balance`, `v_unpaid_lots`, `v_*_mismatch`…). La notice 8 (BL_POINT_ENSEMBLE) corrige déjà, mais les 2 docs coexistent = piège à copie → **marquer le bloc vues de BL-06 PÉRIMÉ** dans REFONTE_DECISIONS.
3. **`seed_golden_loop` du live = l'ANCIEN pilote** (4 lots/1000, codes de comptes 601/611/614/621 ≠ ceux du golden 602/606/615/622) → **ne JAMAIS recopier** ; le seed béni est un livrable d'aval (BL-07).

## 🧹 Autres rouilles nettes (à dropper / différer)
- **Valeurs d'enum mortes** : `period_status.rejected/locked` (le rejet = `reopen_period`), `repartition_category.alur` (ALUR via `budget_type`, pas via catégorie de clé), `membership_role.platform_admin` (super-admin = table dédiée), 5 valeurs `ledger_source_type` de domaines différés (`budget_expense`/`bank_movement`/`mutation`/`collective_loan`/`opening` nu triplon), `lot_type.garage` (doublon de `parking`).
- **2 tables déjà tranchées hors baseline** : `budget_expenses` (+ enum `expense_status`), `budget_payment_schedules` (+ `payment_phase_status`).
- **Dizaines de colonnes d'affichage/contact** présumées rouille : `buildings.floors_count/construction_year` ; `coproprietaires` (téléphone, adresse, prefs comm, notes) ; `profiles.phone/avatar_url` ; `tiers` (tout le bloc annuaire maintenance : notation, rayon, dispo, certifs) ; `supplier_invoices.service_order_id`/`document_id` (FK vers domaines différés = orphelines).
- **`apply_rls_environment`** (toggle RLS prod/dev) → PÉRIMÉ : FORCE 100% natif.
- **`provision_demo_tenant`** + le seed démo (`password123` en clair) → hors périmètre + anti-piège.
- **`create_ledger_transaction` : anti-pattern `WHEN OTHERS THEN success:false`** (maquille les erreurs = viole « jamais maquiller ») → KEEP la fonction (cœur GL voie 1) mais réécrire en laissant remonter l'erreur.

## 📦 À DIFFÉRER confirmé (utile mais hors boucle golden)
Sous-système relances complet (PE-2) · tout le hors-finance (AG/conseil/maintenance/GED/comm) · ventes/mutations/état-daté (la primitive financière `get_lot_balance_45x` suffit au golden) · bancaire (faux-morts) · emprunt collectif + avances trésorerie · avances fournisseur · affectation ALUR à un budget (compte 705) · `opening_balance_residual_items` (PE-6) · présentation/annexes (KPIs, 5 annexes, relevés) · colonnes traçabilité créateur + notes + métadonnées onboarding copro · `recalculate_all_call_statuses` · `budget_lines.code/sort_order`.

## ✅ Baseline MAIGRE par notice (justifiée)
- **0001 enums** : ~20 enums finance+socle au set maigre (codes ci-dessous), `ledger_source_type` à figer sur lecture de corps.
- **0002 socle** : `cabinets`, `copros`, `buildings`(maigre), `lots`, `coproprietaires`(identité min), `lot_owners`, `repartition_keys`, `repartition_key_lines`, `memberships`, `profiles`(maigre), `work_domain`, `tiers`(identité+facturation).
- **0003 finance** : `accounts`(sans iban/bic/initial_balance) + **plan ~25 comptes exercés** ; `accounting_periods`, `ledger_transactions`, `ledger_entries`(bigint), `budgets`, `budget_lines`, `call_for_funds(_lines)`, `payments`, `payment_allocations`, `supplier_invoices(_lines)`, `supplier_payments`, `period_cutoff_items`, **`copro_bank_accounts` NEUVE**, **`commitments` NEUVE (conditionnelle)** ; les RPC voie 1 (GL/FIFO/cut-off/clôture) + triggers immutabilité ; **vues de preuve réellement présentes** (`v_general_ledger`, `v_trial_balance`, `v_lot_vs_gl_mismatch`, `v_result_allocation_split`, `v_lot_advance_balance`, `v_works_*`, `v_owner_statement_by_lot`) + fonctions `get_lot_balance_45x`/`audit_finance_integrity`.
- **0004 sécurité** : `platform_admins`, helpers sains (bypass admin LECTURE only), anti-cumul, RLS ENABLE+FORCE natif, `create_copro` (onboarding).

## ❓ FLAGS — à trancher avant gravure
**Bloquant (expertise Lyes) :**
- **FLAG-CHART-DRIFT** : le PLAN_GOLDEN §6.1 dit `602=eau, 606=chauffage, 618=CS` ; le décret/qqfq dit `601=eau froide, 602=électricité, 603=combustibles, 624=frais CS`. Les asserts du scénario SQL pointeront le mauvais compte si on ne tranche pas. **Reco : le décret fait foi → corriger les codes du PLAN_GOLDEN.**

**À résoudre par lecture de corps de RPC (moi, factuel) :**
- FLAG-SOURCE-TYPE-CORPS : extraire les corps (create_ledger_transaction + appelants) et grep les littéraux `source_type` avant de figer l'enum maigre.
- FLAG-ALUR-TRANSFERS : lire `post_alur_transfer`/`settle_alur_transfer_cash` — INSERT dans `alur_transfers` (à garder) ou GL-pur (différer la table) ? Contradiction « golden l'exerce » vs « faux-mort reporté ».
- FLAG-COMMITMENTS : le golden n'exerce que le cut-off 408 (facture reçue non payée), pas le 486 (engagement pur). `commitments` = poster prouvé ou confort ?
- FLAG-SEQ-PIECES : une RPC de la chaîne golden consomme-t-elle une séquence sans-trou, ou l'appelant fournit le numéro ?
- FLAG-VALIDATE-BUDGET-EXPENSE : PE-1 ayant supprimé `budget_expenses`, `validate_budget_expense` DISPARAÎT (pas réécrite).

**Préférences à confirmer (mineures) :**
- FLAG-TVA (garder HT/TVA/taux ou TTC seul — la TVA non-récup n'a pas de rôle comptable mais certains syndics l'affichent).
- FLAG-CUTOFF-KIND (CAP seul exercé ; graver CAP+CCA, ou les 4 quadrants ?).
- FLAG-TOTAL-TANTIEMES (colonne invariant déclaré vs dérivé pur).
- FLAG-AMOUNT-PAID (carnet d'âge non-autorité vs drop).
- FLAG-LOT-TYPE-COMMERCE (`commerce` vs `local_commercial`).
