# Fiche de spécification durable — DASHBOARD KPIs (CoProFlex)

> Audit logique métier, rang 2. Données vérifiées en base (runtime) le 2026-05-30 (projet `iyfesbjnkpynmwlsmxnp`).
> **Statut : BROUILLON — en attente de validation des questions expert (§7).**
>
> Source unique de vérité cible = **GRAND LIVRE** (`ledger_entries` filtrées `ledger_transactions.status='posted'`), via les annexes (`fn_annexe_1`, `fn_annexe_2`) déjà correctement branchées dessus (validé rang 1).
> **Principe directeur : un KPI d'accueil doit valoir exactement la même chose que sa page de détail.**

---

## 1. IDENTITÉ

**Image simple :** le tableau de bord est la « page de garde » de chaque copro. La règle d'or : la couverture doit annoncer **exactement** les mêmes chiffres que les pages détaillées à l'intérieur. Aujourd'hui la couverture et l'intérieur ne sont **pas d'accord**.

**Objets en base :**
- VUE `v_dashboard_kpis` (11 colonnes) — accueil : trésorerie, impayés, budget, prochaine AG.
- FONCTION `fn_dashboard_kpis(p_copro_id, p_period_id)` — bandeaux finance/budget + 2 champs travaux de l'accueil. Lit `fn_annexe_1`, `fn_annexe_2`, `fn_annexe_4`.
- VUES `v_dashboard_recent_activity`, `v_dashboard_todos`.
- Amont : `fn_annexe_1/2`, `v_account_balances` (→ `accounts` + `bank_movements`), `v_unpaid_lots` (→ `v_lot_balance`), `budget_lines`/`budgets`/`accounting_periods`, `ledger_entries`.

**Fichiers front :** `src/lib/dashboard/api.ts` (`.from('v_dashboard_kpis')` + `rpc('fn_dashboard_kpis')` en complément) ; `src/providers/AnnexeContext.tsx` (canal commun des bandeaux) ; `FinanceAnnexeStats.tsx` ; `BudgetAnnexeStats.tsx`.

**Symptôme observé :** budget **0 €** sur l'accueil vs ~**5 430 €** sur la page budget ; trésorerie **1 325 €** sur l'accueil vs **0 €** sur le bandeau comptabilité. **Cause racine : double implémentation divergente (vue vs fonction) + bugs de clé JSON dans la fonction + filtre de période sur `CURRENT_DATE`.**

---

## 2. MODÈLE DE DONNÉES — chaque KPI et sa source de vérité

| KPI | Implémentation actuelle | Source CIBLE (grand livre) |
|---|---|---|
| `tresorerie_courante`/`_travaux`/`current_balance` | VUE : `v_account_balances` (= `initial_balance` + `bank_movements`), split `512%`/`5121%`/`502%` | `fn_annexe_1` → `total_tresorerie` → `exercice_clos` (classe 5 ledger POSTED) |
| `unpaid_total` | VUE : `sum(v_unpaid_lots.balance>0)` (→ `v_lot_balance`) | `fn_annexe_1` → `total_creances` → `exercice_clos` (classe 4 POSTED) |
| `critical_unpaid_count` | VUE : `count` où `severity='critical'` (minuscules) | `severity='CRITICAL'` (MAJUSCULES) |
| `next_ag_*` | VUE : `ag_meetings`, `meeting_date >= CURRENT_DATE` | RAS (hors finance, OK) |
| `budget_vote` | VUE : `sum(budget_lines.amount)`, période = `CURRENT_DATE`, **sans `status`** | `fn_annexe_2` → `total_i_charges` → `ex_clos_budget_vote` |
| `budget_realise` | VUE : `sum(ledger_entries)` classe 6 débit, période `CURRENT_DATE`, **sans `posted`** | `fn_annexe_2` → `total_i_charges` → `ex_clos_realise` (POSTED) |
| `budget_pct` | VUE : `round(realise*100/vote)` (sous-requêtes inline) | dérivé corrigé, `round(...,1)` |
| `tresorerie`/`total_impayes`/`provisions_travaux`/`dettes` (fonction) | FONCTION : `section_x->'<tableau>'->>'total'` (**clé inexistante**) | `section_x->'total_<bloc>'->>'exercice_clos'` |
| `budget_vote`/`budget_realise` (fonction) | FONCTION : `v_annexe2->'total_charges'->>'ex_clos_budget/realise'` (**parent inexistant**) | `total_i_charges->>'ex_clos_budget_vote'`/`'ex_clos_realise'` |
| `travaux_en_cours`/`nb_travaux_ouverts` | FONCTION : `fn_annexe_4->'operations'[].'solde'` | à confirmer (annexe 4 non auditée rang 2) |

**Note clé (le cœur du bug fonction) :** dans `fn_annexe_1`, les blocs `tresorerie`/`creances`/`provisions`/`dettes` sont des **TABLEAUX** ; `->>'total'` dessus renvoie toujours `NULL`. Les totaux sont des **OBJETS** `{exercice_precedent, exercice_clos}` sous `total_tresorerie`/`total_creances`/… La clé `'total'` **n'existe nulle part**. Dans `fn_annexe_2`, aucune clé `'total_charges'` (réel : `sous_total_charges`, `total_i_charges`…) ni colonne `'ex_clos_budget'` (réel : `'ex_clos_budget_vote'`).

---

## 3. RÈGLES MÉTIER ATTENDUES

1. **R1 — Accueil = détail.** Chaque KPI d'accueil = la valeur de sa page de détail.
2. **R2 — Lecture du grand livre.** Tout KPI financier lit `ledger_entries` POSTED via les annexes (déjà correctes).
3. **R3 — Filtre `posted` obligatoire** (décret 2005-240 : seules les écritures validées font foi).
4. **R4 — Période explicite, pas `CURRENT_DATE`.** La période = **exercice actif de la copro** (`p_period_id`), jamais la date système.
5. **R5 — Une seule implémentation par concept** (supprimer la redondance vue vs fonction).
6. **R6 — Arrondi cohérent** partout.
7. **R7 — Casse des sévérités** alignée sur les valeurs réelles (`'CRITICAL'`).
8. **R8 — Budget voté = budgets validés** (`status IN (validated,closed)`), jamais brouillons.
9. **R9 — Distinguer `NULL` de `0`** : un `COALESCE(...,0)` ne doit pas masquer une lecture cassée.

---

## 4. ÉTAT RÉEL EN BASE (vérifié runtime, exercice 2025 alimenté)

`fn_dashboard_kpis` renvoie `{tresorerie:0, total_impayes:0, provisions_travaux:0, dettes:0, budget_vote:0, budget_realise:0, budget_pct:0}` **alors que les vraies valeurs sont** : trésorerie **−120**, dettes **635**, budget réalisé **890**. Les 6 lectures JSON sont cassées → COALESCE force tout à 0.

| KPI | Producteur | État |
|---|---|---|
| `next_ag_*`, `v_dashboard_recent_activity`, grand livre/balance (corps compta) | VUE/ledger | **OK** |
| `critical_unpaid_count` + `v_dashboard_todos` | VUE | **BUG** (casse `'critical'` vs `'CRITICAL'` → toujours 0) |
| `tresorerie_*`, `current_balance` | VUE | **DIVERGENT** (bank_movements, hors ledger) |
| `budget_vote`, `budget_realise`, `budget_pct` | VUE | **BUG** (période `CURRENT_DATE` vide + pas de `posted` + pas de `status`) |
| `tresorerie`, `total_impayes`, `provisions_travaux`, `dettes`, `budget_*` | FONCTION | **BUG** (6 clés JSON inexistantes → 0) |
| `travaux_en_cours`, `nb_travaux_ouverts` | FONCTION | **PARTIEL** (annexe 4 à auditer) |

---

## 5. MAL IMPLÉMENTÉ / DETTE

- **P0 — `fn_dashboard_kpis` : 6 clés JSON inexistantes** → tous les KPI fonction à 0 (trésorerie/créances/provisions/dettes via `->>'total'` sur des tableaux ; budget via `'total_charges'`/`'ex_clos_budget'` absentes). Vérifié runtime (−120/635/890 masqués en 0).
- **P0 — `v_dashboard_kpis.budget_*` filtrent `CURRENT_DATE`** : 2026 vide, données en 2025 → budget d'accueil à 0.
- **P0 — `v_dashboard_kpis.budget_realise` sans `status='posted'`** : inclut des écritures non comptabilisées (viole R3).
- **P1 — Double implémentation divergente** (VUE vs FONCTION) consommée par le même écran d'accueil → divergence trésorerie 1 325 vs 0.
- **P1 — Bug de casse `severity`** (`critical_unpaid_count` + `v_dashboard_todos`) : **les impayés critiques ne remontent JAMAIS** (risque métier : mise en demeure / art. 19 jamais signalée).
- **P1 — Trésorerie hors grand livre** (`v_account_balances` = `bank_movements`) — lié à l'arbitrage trésorerie (déjà tranché : 2 KPI distincts).
- **P1 — `budget_vote` sans filtre `b.status`** : peut additionner des budgets brouillons.
- **P2** — redondance inline (`current_balance`, `budget_pct` réécrivent leurs sous-requêtes) ; arrondi incohérent (vue `round()` vs fonction `round(,1)`) ; `COALESCE(...,0)` masque les clés cassées (un bug devient un faux « tout va bien »).
- **P3** — 3 sous-requêtes `next_ag` redondantes ; filtre `balance>0` redondant ; `fn_annexe_2` appelée sans `p_next_period_id`.

---

## 6. SOURCES DIVERGENTES → source unique cible = GRAND LIVRE (via annexes corrigées)

| Concept | Sources actuelles | Cible |
|---|---|---|
| Trésorerie | VUE (bank_movements) **vs** FONCTION (annexe 1, clé cassée) | `fn_annexe_1.total_tresorerie.exercice_clos` **+** KPI distinct « solde bancaire instant T » (décision actée) |
| Impayés / créances | VUE (`v_lot_balance`) **vs** FONCTION (annexe 1, clé cassée) | `fn_annexe_1.total_creances.exercice_clos` (lot_id obligatoire, décidé) |
| Impayés critiques | `severity='critical'` (mort) | `severity='CRITICAL'` |
| Budget voté | VUE (`budget_lines`, CURRENT_DATE) **vs** FONCTION (clé inexistante) **vs** corps budget (`v_budgets_overview`) | `fn_annexe_2.total_i_charges.ex_clos_budget_vote` |
| Budget réalisé | VUE (ledger 6% non posté) **vs** FONCTION (clé inexistante) **vs** corps (`v_budget_expenses_detail`) | `fn_annexe_2.total_i_charges.ex_clos_realise` (= réalisé ledger, décidé) |
| Provisions / Dettes | FONCTION uniquement (clés cassées) | `fn_annexe_1.total_provisions`/`total_dettes.exercice_clos` |

---

## 7. QUESTIONS EXPERT OUVERTES

> **Déjà tranché (rang 1 / discussion budget) :** trésorerie = KPI comptable (ledger) **+** KPI solde bancaire à l'instant T ; `lot_id` obligatoire ; réalisé = ledger classe 6.

> **Décisions actées (2026-05-30) :**
> 1. **Période active = exercice ouvert (`status='open'`, unique par copro) par défaut + sélecteur** permettant de basculer sur un autre exercice. Remplace `CURRENT_DATE` partout.
> 2. **Seuils de sévérité des impayés paramétrables par copro** ; le niveau **« critique » = seuil de mise en demeure / recouvrement** (art. **19-2** — recouvrement accéléré après mise en demeure infructueuse ; *l'art. 19 vise l'hypothèque légale, ne pas confondre*). (Casse `'CRITICAL'` à corriger d'abord.)
> 3. **Budget voté = approuvé en AG uniquement** (`validated`/`closed`) ; un budget `submitted` est **exclu** du « budget voté ». → **Implication transverse** : la transition `submitted → validated` (et beaucoup d'autres données de la copro) doit être **incrémentée automatiquement par les décisions d'AG**. Chantier transverse, voir mémoire `ag_auto_population` + mécanisme existant `ag_pending_actions`/`activate_ag_decisions` (à fiabiliser, rang 6).
> 4. **Split trésorerie courant/travaux** : *défaut* — rendre le type de compte (courant/travaux/fonds) **explicite** sur `accounts` plutôt que déduit du préfixe de code (`512x`/`5121x`/`502x`), pour éviter qu'un renumérotage casse silencieusement le KPI.
