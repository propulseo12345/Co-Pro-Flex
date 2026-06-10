# Blueprint DB cible — Domaine FINANCE (grand livre)

> Schéma cible PROPRE du cœur comptable CoProFlex. Redesign justifié : corrige les dettes du verdict, **préserve le noyau bien fait** (ledger header+lignes, partie double, immutabilité, lot-centric par sous-compte de nature).
> Source : cartographie `_cartographie/02-finance-grand-livre.md` + T1/T2/T3 + sondes live `iyfesbjnkpynmwlsmxnp` (lecture seule, 2026-06-04).
> **PAS de reprise du live (décision A1, verrou USER)** : on construit une **COPRO-TEMPLATE propre de A à Z** (nouvelle référence test/démo qui remplace l'ex-boucle d'or 22222222 et l'ex-immuable 11111111). Le schéma fait foi, pas l'historique. Voir §6.

---

## 0. Principe directeur

Le noyau GL n'est **pas** à repenser : modèle ledger pur (en-tête + lignes), partie double vérifiée à la pose, immutabilité réellement câblée par triggers, lot-centric par dimension `lot_id` + sous-comptes `450-1..5`, idempotence par clés partielles. **0/134 tx déséquilibrée en live.** On NETTOIE et on DURCIT, on ne réécrit pas.

Diagramme du flux (inchangé, c'est le bon) :

```
  saisie métier (appel / paiement / facture / cut-off / à-nouveau / affectation)
        │  (1 RPC posteur par geste, SECURITY DEFINER, garde in-function)
        ▼
  create_ledger_transaction(copro, period, date, label, source_type, source_id, entries[], auto_post)
        │  insère 1 en-tête + N lignes (partie double)
        ▼
  post_ledger_transaction(tx_id)  ──►  équilibre Σdébit=Σcrédit, période 'open', is_postable, lot_id sur 45x
        │  status: draft → posted   (À PARTIR D'ICI = IMMUABLE)
        ▼
  ledger_transactions / ledger_entries   ← SOURCE UNIQUE
        │
        ▼  (vues, status='posted' uniquement)
  v_general_ledger → v_trial_balance → v_lot_balance → v_owner_balance → annexes 1..5
```

Règle d'or réaffirmée : **tout solde (lot, personne, trésorerie) se DÉRIVE du GL posté.** On supprime les chemins parallèles (`bank_movements` pour la trésorerie, `call_for_funds_lines` pour le solde copro) en tant que *source* — ils restent des intrants (rapprochement, relevé) mais ne font plus autorité.

### 0.1 Deux notions distinctes : « solde comptable » vs « relevé d'appel » (NE PAS confondre)

Le sondage live révèle que **deux familles de vues répondent à « combien doit ce copropriétaire »**, par deux chemins différents — exactement le doublon que `v_lot_vs_gl_mismatch` est conçu pour traquer. On les tranche ici noir sur blanc (mémoire `ledger_account_model` : **GL = source unique du solde**) :

| Vue | Chemin actuel (live) | Nature cible | Disposition |
|---|---|---|---|
| `v_lot_balance` | `ledger_entries` (GL) | **SOLDE COMPTABLE — fait autorité** | GARDER tel quel (source du solde lot) |
| `v_owner_balance` | dérive `v_lot_balance` (GL) | solde comptable par personne (somme des lots) | GARDER |
| `v_unpaid_lots` | dérive `v_lot_balance` (GL) | impayé comptable | GARDER |
| `v_owner_statement_summary` | `call_for_funds_lines` (relevé) | **RELEVÉ D'APPEL — PAS le solde comptable** | GARDER mais **renommer/documenter** « relevé d'appels et règlements » ; ne fait PAS autorité sur le solde |
| `v_owner_statement_lines` / `_by_period` | `call_for_funds_lines` (relevé) | détail des lignes d'appel imputées | idem — vue de **présentation** (extrait de compte copropriétaire), pas de calcul de créance officielle |
| `v_owner_financial_summary` | `call_for_funds_lines` (relevé) | agrégat appelé/payé du relevé | idem — vue de présentation |
| `v_unpaid_by_lot` | `call_for_funds_lines` (relevé) | reste-à-payer **par appel** (granularité ligne d'appel, utile aux relances) | GARDER comme vue de **suivi d'appel**, distincte de l'impayé comptable `v_unpaid_lots` |
| `v_lot_vs_gl_mismatch` | croise relevé (`call_for_funds_lines`) **et** GL (`v_lot_balance`) | **GARDE-FOU** : détecte tout écart relevé ↔ GL | GARDER — c'est le filet qui rend les deux chemins sûrs |

**Décision (verrou) :**
1. Le **solde comptable officiel** d'un lot/copropriétaire (« combien doit-il ») se lit **exclusivement** sur `v_lot_balance` / `v_owner_balance` (dérivés du GL). Toute UI affichant « solde / créance » pointe ces vues.
2. Les vues `v_owner_statement_*`, `v_owner_financial_summary`, `v_unpaid_by_lot` **restent des vues « relevé d'appel »** (présentation détaillée appel par appel, échéancier, relances) et **ne sont PAS un second calcul de créance faisant autorité**. On NE les reconstruit PAS sur le GL : un relevé d'appel a une granularité (ligne d'appel × échéance) que le GL agrège — les deux sont complémentaires, pas concurrents.
3. `v_lot_vs_gl_mismatch` **reste le garde-fou permanent** : tant qu'il renvoie 0 ligne, relevé et GL sont réconciliés. C'est ce qui autorise à conserver les deux familles sans violer « GL = source unique » (le relevé ne fait jamais autorité ; il est seulement vérifié contre le GL).

Ces ~9 vues sont listées dans la sous-section migration **§5 bis (Vues du domaine — GARDER / RÉÉCRIRE)** pour leur repointage sur les colonnes renommées.

### 0.2 Invariant d'affectation du résultat : `110` (travaux) ≠ `120` (courant) — VENTILATION PAR NATURE OBLIGATOIRE

Règle métier verrouillée (mémoire `ventilation_110_120` + `affectation_resultat_copro`) : à la clôture, le **résultat de l'exercice se ventile par NATURE** sur deux comptes de report distincts, **jamais tout sur 120** :
- **`120`** = report à nouveau / résultat du **budget COURANT** (charges générales art.14-1) ;
- **`110`** = report à nouveau / résultat des **TRAVAUX** (art.14-2 / fonds travaux) ;

et le résultat se déverse sur les **sous-comptes de copropriétaires correspondants par nature** :

> **Écriture cible d'affectation** (postée à l'AG d'approbation, exercice N+1, `source_type='result_allocation'`, une seule par période via `uq_ledger_tx_result_allocation`) — **par quote-part de lot** :
> - **D `120` / C `450-1`** (résultat courant → copropriétaires, nature *current*) ;
> - **D `110` / C `450-2`** (résultat travaux → copropriétaires, nature *works*).
>
> (Sens débit/crédit selon excédent/déficit ; l'excédent reste par défaut sur le 450, apuré par l'appel T1 N+1 — cf. `affectation_resultat_copro`.)

**Bug live à NE PAS reproduire** : aujourd'hui tout est déversé sur `120`, sans distinction 110/120 ni ventilation `450-1`/`450-2`. Le schéma cible exige les **deux** comptes de report et la **double ventilation par nature**.

**Garde-fou OBLIGATOIRE (garanti par la base, pas seulement par le code de `regularize_period`)** — décision : option (a), assertion bloquante sur le modèle de `check_transaction_balance`.

1. **Vue d'intégrité `v_result_allocation_split`** : pour chaque écriture `result_allocation` de la période, elle vérifie **DEUX propriétés** (renvoie 0 ligne si conforme, 1 ligne par écriture fautive sinon — modèle `v_lot_vs_gl_mismatch`) :
   - **(a) routage par nature** : la part travaux transite par `110`/`450-2` et la part courante par `120`/`450-1` (jamais tout sur `120`/`450-1`) ;
   - **(b) invariant de somme — VRAIE GARDE** : `Σ(mouvement 120) + Σ(mouvement 110)` (la ventilation déversée) **= résultat de l'exercice de la période** (excédent/déficit du compte de résultat, classes 6/7 du GL posté), **et** la contrepartie copropriétaire **par quote-part** : `Σ(450-1 crédité par lot) = mouvement 120` et `Σ(450-2 crédité par lot) = mouvement 110`. Toute affectation dont la somme ventilée ≠ résultat, ou dont la ventilation 110/120 ne se retrouve pas à l'identique sur les 450-2/450-1, est signalée. Cette propriété (b) est **l'assiette de la garde réclamée** : « somme ventilée 110+120 = résultat, par quote-part ».
   
   La vue **constate** et **sert d'assiette** à l'assertion bloquante ci-dessous.
2. **Fonction d'assertion `assert_result_allocation_split(p_copro_id, p_period_id)`** (G-INTERNAL, SECURITY DEFINER) : `IF EXISTS (SELECT 1 FROM v_result_allocation_split WHERE copro_id = p_copro_id AND period_id = p_period_id) THEN RAISE EXCEPTION` — i.e. lève (rollback) dès qu'une écriture `result_allocation` de la période viole **soit** le routage par nature (part travaux déversée sur `120`/`450-1` au lieu de `110`/`450-2` — le bug live), **soit** l'invariant de somme (`110+120 ≠ résultat`, ou ventilation 450-1/450-2 par quote-part incohérente avec 120/110). Une seule assertion couvre les deux propriétés via la vue.
3. **Appel garanti** : `regularize_period` (et toute fonction postant un `result_allocation`) **DOIT** appeler `assert_result_allocation_split` en fin de traitement, juste après la pose de l'écriture d'affectation et avant le COMMIT — exactement comme `check_transaction_balance` est appelé en fin de `post_ledger_transaction`. L'invariant 110/120 est ainsi **garanti par convention d'appel** : tout posteur passant par cette chaîne est bloqué si la double ventilation manque. **Limite à connaître (non bloquante)** : la garde est une assertion *in-function* (un `RAISE` en fin de `regularize_period`), pas une contrainte déclarative — un futur posteur qui écrirait un `result_allocation` **sans passer par `regularize_period`** ni appeler `assert_result_allocation_split` échapperait à la garantie. Option pour une **vraie garantie déclarative** (au-delà de la convention) : un **CONSTRAINT TRIGGER DEFERRED** sur `ledger_entries` filtré `WHERE source_type='result_allocation'`, qui rejoue `v_result_allocation_split` au COMMIT quel que soit le chemin d'écriture. Retenue en option car homogène avec le pattern `check_transaction_balance` (§5) mais plus coûteuse à câbler ; à arbitrer si un posteur hors-chaîne apparaît.

> Pourquoi une assertion en fin de fonction plutôt qu'un constraint-trigger DEFERRED (option (b)) : la double ventilation est une propriété de l'**ensemble** des lignes de l'écriture `result_allocation` (couple 120/450-1 + 110/450-2), corrélée au résultat travaux de la période — c'est une assertion multi-lignes/multi-comptes naturelle à exprimer sur la vue, comme l'équilibre Σdébit=Σcrédit. On reste homogène avec le pattern `check_transaction_balance` déjà en place (§5).

Cet invariant contraint la fonction d'affectation (chemin V0→V2→V1→V4, à-nouveau AVANT affectation) ; voir §5 (`regularize_period`, `assert_result_allocation_split` et l'affectation `result_allocation`).

---

## 1. TABLES

Conventions communes à toutes les tables du domaine :
- `id uuid PK DEFAULT gen_random_uuid()`.
- `copro_id uuid NOT NULL → copros(id) ON DELETE RESTRICT` (jamais CASCADE sur du comptable : on n'efface pas une copro qui a un grand livre).
- Horodatage : `created_at timestamptz NOT NULL DEFAULT now()`, `updated_at timestamptz NOT NULL DEFAULT now()` (trigger unique `set_updated_at()`).
- Index `copro_id` systématique (filtrage RLS).

### 1.1 `accounts` — plan de comptes (répliqué par copro)

| col | type | null | défaut | note |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK |
| copro_id | uuid | NO | — | FK copros ON DELETE RESTRICT |
| code | text | NO | — | ex. `701`, `450-1`, `512` |
| name | text | NO | — | |
| account_type | `account_type` | NO | — | asset/liability/income/expense/equity |
| nature | `account_receivable_nature` | YES | — | **NOUVEAU** : pour 45x uniquement (current/works/alur/loan/advance/doubtful) — supprime le parsing de `code` |
| is_active | bool | NO | true | |
| is_system | bool | NO | false | comptes provisionnés (protégés) |
| is_postable | bool | NO | true | false = agrégateur (ex. `450` parent) |
| description | text | YES | — | |
| iban | text | YES | — | comptes `512` (banque) |
| bic | text | YES | — | |
| bank_name | text | YES | — | (ex-`banque`, renommé clair) |
| initial_balance | numeric(14,2) | NO | 0 | |

- PK `id` ; **UNIQUE (copro_id, code)**.
- **SUPPRIMÉ** : `parent_id uuid` (FK self) — 1081/1081 NULL en live, hiérarchie jamais peuplée. La structure parent/enfant est portée par la convention de code (`450` parent, `450-1` enfant) + `is_postable`, pas par une FK.
- Index : `(copro_id)`, `(copro_id, code)` (=UNIQUE), `(copro_id, left(code,1))` (classe → annexes), `(copro_id, account_type)`, partiel `(copro_id, nature) WHERE nature IS NOT NULL`.
- CHECK `ck_nature_only_on_45x` : `nature IS NULL OR code LIKE '45%'` (la nature ne qualifie que les comptes de copropriétaires).
- Triggers : `set_updated_at` ; `trg_enforce_is_postable` (référencé par ledger, voir §4).

### 1.2 `ledger_transactions` — en-tête d'écriture

| col | type | null | défaut | note |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK |
| copro_id | uuid | NO | — | FK copros RESTRICT |
| period_id | uuid | NO | — | FK accounting_periods RESTRICT |
| tx_date | date | NO | CURRENT_DATE | |
| source_type | `ledger_source_type` | NO | — | **ENUM** (ex-CHECK 16 valeurs) — voir §2 ; **devient NOT NULL** |
| source_id | uuid | YES | — | lien vers l'objet métier (appel, paiement…) |
| label | text | NO | — | |
| status | `ledger_tx_status` | NO | 'draft' | **ENUM** draft/posted (ex-CHECK) |
| created_by | uuid | YES | — | FK profiles |
| posted_by | uuid | YES | — | FK profiles |
| posted_at | timestamptz | YES | — | |
| metadata | jsonb | NO | '{}' | |

- PK `id` ; FK period_id, copro_id.
- CHECK `ck_posted_consistency` : `(status='draft' AND posted_at IS NULL AND posted_by IS NULL) OR (status='posted' AND posted_at IS NOT NULL)`. **Conservé (excellent).**
- Index idempotence partiels (conservés, renforcés) : `uq_ledger_tx_closing (copro_id, source_id, period_id) WHERE source_type='closing'`, `uq_ledger_tx_opening_balance … WHERE source_type='opening_balance'`, `uq_ledger_tx_opening_onboarding … WHERE source_type='opening_onboarding'`, `uq_ledger_tx_result_allocation (copro_id, period_id) WHERE source_type='result_allocation'` (**NOUVEAU** : une seule affectation par période), `idx_ledger_tx_source (source_type, source_id) WHERE source_id IS NOT NULL`.
- Triggers : `trg_ledger_tx_immutable` (BEFORE UPDATE bloqué si posted), `trg_ledger_tx_no_delete_posted` (BEFORE DELETE). **Conservés.**

### 1.3 `ledger_entries` — lignes débit/crédit · **CŒUR DU GL**

| col | type | null | défaut | note |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK |
| tx_id | uuid | NO | — | FK ledger_transactions **ON DELETE CASCADE** (cohérent avec immutabilité : on ne supprime qu'une tx draft, ce qui emporte ses lignes) |
| copro_id | uuid | NO | — | FK copros RESTRICT (redondant mais utile à l'index RLS + cohérence) |
| period_id | uuid | NO | — | FK accounting_periods |
| account_id | uuid | NO | — | FK accounts RESTRICT |
| lot_id | uuid | YES | — | FK lots RESTRICT — **dimension analytique lot-centric** |
| direction | `ledger_direction` | NO | — | **ENUM** debit/credit (ex-CHECK) |
| amount | numeric(14,2) | NO | — | CHECK > 0 |
| entry_label | text | YES | — | |

- Index : `(tx_id)`, `(account_id)`, `(copro_id, period_id, account_id)`, partiel `(lot_id) WHERE lot_id IS NOT NULL`.
- **5 triggers (garde-fous) conservés + 1 élargi** — voir §4 : `enforce_is_postable`, `trg_enforce_lot_id_on_45x` (**élargi A2 : `lot_id` NOT NULL sur TOUT `45%` postable, sans liste blanche**), `trg_ledger_entry_consistency`, `trg_ledger_entry_no_insert_posted`, `trg_ledger_entry_immutable`.
- Lu par : v_general_ledger, v_trial_balance, v_lot_balance, v_lot_avance, v_dashboard_kpis, v_budget_consumption_by_account, v_finance_integrity_issues, v_general_ledger_by_account_class. **Aucune divergence tolérée.**

### 1.4 `accounting_periods` — exercices comptables

| col | type | null | défaut | note |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK |
| copro_id | uuid | NO | — | FK copros RESTRICT |
| name | text | NO | — | |
| start_date | date | NO | — | |
| end_date | date | NO | — | |
| status | `period_status` | NO | 'open' | **ENUM rationalisé** open/closed/approved (voir §2) |
| closed_at | timestamptz | YES | — | |
| closed_by | uuid | YES | — | FK profiles |
| approved_at | timestamptz | YES | — | |
| approved_by | uuid | YES | — | FK profiles |
| approval_notes | text | YES | — | |
| notes | text | YES | — | |

- **SUPPRIMÉ** : `locked_at`, `locked_by` (verrou abandonné WP5.2, vestiges morts). Le gel est binaire : `status='open'` ⇒ écriture possible, sinon non.
- CHECK `valid_dates` : `end_date > start_date` ; **UNIQUE (copro_id, name)** ; **NOUVEAU UNIQUE partiel** `(copro_id) WHERE status='open'` (remplace le trigger `enforce_single_open_period` par une contrainte déclarative — plus robuste).
- Triggers : `set_updated_at`. (`enforce_single_open_period` → remplacé par la contrainte unique partielle ci-dessus.)

### 1.5 `period_cutoff_items` — cut-off droits constatés (art.14-3)

| col | type | null | défaut | note |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK |
| copro_id | uuid | NO | — | FK copros RESTRICT |
| period_id | uuid | NO | — | FK accounting_periods |
| kind | `cutoff_kind` | NO | — | **ENUM** CAP/CCA/PCA/PAR (ex-CHECK) |
| account_id | uuid | NO | — | FK accounts |
| counterpart_account_id | uuid | NO | — | FK accounts |
| amount | numeric(14,2) | NO | — | CHECK > 0 |
| label | text | YES | — | |
| tiers_id | uuid | YES | — | **FK `tiers`** (ex-`supplier_id → suppliers`, repointé sur l'entité fusionnée) |
| auto_reverse | bool | NO | true | |
| posting_tx_id | uuid | YES | — | FK ledger_transactions |
| reversal_tx_id | uuid | YES | — | FK ledger_transactions |

- Bien fait (auto-extourne des charges/produits constatés d'avance). Seul changement : FK `supplier_id` → `tiers_id`.

### 1.6 `payments` — encaissements (lot-centric)

| col | type | null | défaut | note |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK |
| copro_id | uuid | NO | — | FK copros RESTRICT |
| period_id | uuid | NO | — | FK accounting_periods |
| lot_id | uuid | NO | — | FK lots — **lot-centric (NOT NULL)** |
| amount | numeric(14,2) | NO | — | CHECK > 0 |
| payment_date | date | NO | CURRENT_DATE | |
| method | `payment_method` | NO | — | ENUM |
| reference | text | YES | — | |
| status | `payment_status` | NO | 'recorded' | ENUM recorded/reconciled/reversed |
| ledger_tx_id | uuid | YES | — | FK ledger_transactions |
| created_by | uuid | YES | — | FK profiles |
| idempotency_key | text | YES | — | |

- Index `ux_payments_idempotency (copro_id, idempotency_key) WHERE idempotency_key IS NOT NULL`. Conservé.

### 1.7 `payment_allocations` — imputation FIFO cloisonnée

| col | type | null | défaut | note |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK |
| copro_id | uuid | NO | — | FK copros RESTRICT |
| payment_id | uuid | NO | — | FK payments **ON DELETE CASCADE** |
| call_line_id | uuid | NO | — | FK call_for_funds_lines |
| amount_allocated | numeric(14,2) | NO | — | CHECK > 0 |

- **UNIQUE (payment_id, call_line_id)**.
- Index dédupliqués : **un seul** `(payment_id)`, **un seul** `(call_line_id)` (le verdict relevait 4 index pour 2 axes → on supprime les doublons `idx_allocations_payment` / `idx_payment_allocations_payment_id`).
- Triggers : `trg_validate_payment_allocation` (BEFORE, n'over-alloue pas), `trg_allocation_update_line` (AFTER, met à jour le payé de la ligne). Conservés.

### 1.8 `bank_movements` — relevés bancaires importés

| col | type | null | défaut | note |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK |
| copro_id | uuid | NO | — | FK copros RESTRICT |
| period_id | uuid | YES | — | FK accounting_periods — **nullable (décision A15, verrou USER)** : un mouvement importé peut précéder son affectation à une période. Relâche le NOT NULL du live. |
| bank_date | date | NO | — | |
| value_date | date | YES | — | |
| amount_signed | numeric(14,2) | NO | — | signé (+ crédit / − débit) |
| label | text | YES | — | |
| bank_ref | text | YES | — | |
| status | `bank_movement_status` | NO | 'unmatched' | ENUM unmatched/matched/ignored |
| account_id | uuid | NO | — | FK accounts (compte `512`) |

- **SUPPRIMÉ** : `account_code`, `account_category` (dénormalisation redondante avec `account_id → accounts` ; le code/catégorie se joint). Corrige le verdict §5.
  - **Impact aval (sondé 2026-06-04)** : `refresh_bank_movement_status` ne lit QUE `bank_matches` + `bank_movements.amount_signed`/`status` → **aucun impact**, gardée telle quelle. `v_payments_overview` ne lit pas ces colonnes → **aucun impact**. En revanche `v_bank_movements_overview` **SELECT explicitement `bm.account_code` et `bm.account_category`** → cette vue doit être **RÉÉCRITE** pour joindre `accounts` et exposer `accounts.code AS account_code` / une catégorie dérivée (ex. `left(accounts.code,1)`), avant le DROP des deux colonnes. Listé au §5 bis.
- DELETE autorisé seulement si `status='unmatched'` (trigger ou policy). Conservé.
- **Note d'architecture** : `bank_movements` est un INTRANT de rapprochement, **pas** la source du solde de trésorerie. `v_account_balances` (qui dérivait le 512 des mouvements) est **DROP** ; la trésorerie se dérive du GL (écritures 512) via `v_trial_balance`.

### 1.9 `bank_matches` — rapprochement (faux mort, GARDÉ)

| col | type | null | défaut | note |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK |
| copro_id | uuid | NO | — | FK copros RESTRICT |
| bank_movement_id | uuid | NO | — | FK bank_movements ON DELETE CASCADE |
| target_type | `bank_match_target_type` | NO | — | ENUM payment/supplier_payment/other |
| target_id | uuid | YES | — | polymorphe (validé applicativement selon target_type) |
| amount_matched | numeric(14,2) | NO | — | CHECK > 0 |
| matched_at | timestamptz | NO | now() | |
| matched_by | uuid | YES | — | FK profiles |

- 0 ligne mais **câblé** : `refresh_bank_movement_status`, vues `v_bank_movements_overview`/`v_payments_overview`. GARDÉ (T3-B).

### 1.10 `treasury_advances` — avances de trésorerie (art.35)

| col | type | null | défaut | note |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK |
| copro_id | uuid | NO | — | FK copros RESTRICT |
| lot_id | uuid | NO | — | FK lots — **lot-centric** |
| advance_type | `treasury_advance_type` | NO | — | **ENUM** permanent/special/work_fund (ex-CHECK) |
| label | text | YES | — | |
| amount_due | numeric(14,2) | NO | 0 | |
| amount_paid | numeric(14,2) | NO | 0 | |

- **SUPPRIMÉ** : `owner_id` (FK coproprietaires) — 12/12 NULL en live + viole « le solde par personne se dérive du lot ». Le propriétaire se dérive de `lot_owners` à la date.

### 1.11 `collective_loans` / `collective_loan_shares` — emprunt collectif (à brancher au GL)

`collective_loans` : id, copro_id (FK RESTRICT), label, lender, total_amount, remaining_amount, annual_payment, interest_rate, start_date, end_date, status (`collective_loan_status` active/repaid/cancelled), **+ NOUVEAU** `ledger_tx_id uuid → ledger_transactions` (mise en place de l'emprunt = écriture D512/C164).

`collective_loan_shares` : id, loan_id (FK ON DELETE CASCADE), lot_id (FK), share_amount, remaining_amount, last_payment_date. **UNIQUE (loan_id, lot_id)**. Lot-centric, conservé.

- **Correction du verdict §8** : l'emprunt collectif n'a aujourd'hui aucun lien GL → viole « chaque opération génère une écriture ». On ajoute le rattachement et un posteur `post_collective_loan` (voir §5). Hors copros à migrer (0 ligne sur 11111111/22222222) → branchement à câbler, pas de reprise de données.
- **`source_type` retenu = `collective_loan`** (figé dès maintenant, §2) : l'écriture de mise en place D512/C164 portera ce type dédié, **pas** `od` ni `transfer`. Idem pour un éventuel posteur d'avances de trésorerie (`treasury_advances`) le jour où il postera au GL : il réutilisera un type dédié plutôt que `od`. Décision actée ici pour ne PAS rouvrir l'arbitrage de typage à l'implémentation différée (§A5).

### 1.12 `tiers` — entité fusionnée (suppliers + providers + notaires) — **DÉFINIE PAR LE DOMAINE 07**

Fusion verrouillée (décision user). Une seule entité « tiers » porte fournisseurs, prestataires ET notaires. **La définition canonique appartient au domaine 07-maintenance (§1.1) — le grand livre la CONSOMME, il ne la redéfinit pas.** Le GL y FAIT FK via `period_cutoff_items.tiers_id`, `budget_expenses.tiers_id`, `supplier_invoices.tiers_id`, `supplier_payments` (chaîne fournisseur portée par 07).

**Modèle de rôles = FLAGS booléens (PAS d'enum).** Décision unifiée avec 07 §1.1 : un tiers cumule les rôles via `is_supplier` / `is_provider` / `is_notary` (un même tiers peut être à la fois fournisseur et prestataire — un enum `{supplier,provider,both}` ne sait pas exprimer le cumul avec le notaire et explose en `{supplier,provider,notary,supplier_provider,…}`). **L'enum `tiers_type` est donc ABANDONNÉ** (retiré du catalogue ENUMS §6.1 et de ce blueprint) au profit des flags.

Colonnes vues par le GL (sous-ensemble de la définition 07 ; voir 07 §1.1 pour la table complète) :

| col | type | null | note |
|---|---|---|---|
| id | uuid | NO | PK |
| copro_id | uuid | NO | FK copros RESTRICT |
| name | text | NO | raison sociale / « Maître X » |
| is_supplier | boolean | NO | rôle fournisseur (facturable, référencé par `supplier_invoices`) |
| is_provider | boolean | NO | rôle prestataire d'intervention |
| is_notary | boolean | NO | **rôle notaire** (référencé par `mutations.notaire_id`, domaine 05 ; absent de l'ancien modèle 02) |
| siret | text | YES | |
| iban | text | YES | **porté ici** (RIB indispensable au paiement ; à migrer depuis providers+suppliers, NULL au live) |
| bic | text | YES | |
| email / phone / address | text | YES | |

- CHECK `ck_tiers_role (is_supplier OR is_provider OR is_notary)` (un tiers sert à au moins une chose — défini en 07).
- Les anciennes FK `…_id → suppliers` et `…_id → providers` se repointent toutes sur `tiers`. **JAMAIS de drop des deux tables source** : migration de fusion (T3-B).
- **Cohérence inter-domaine** : la catégorisation métier (`category`/`domains`/notaire `office_name`…) et la définition complète vivent en 07 §1.1. Ce §1.12 n'expose que la surface FK + RIB nécessaire au grand livre.

### 1.13 SUPPRIMÉE : `lot_accounts`

21 lignes mais **0 fonction / 0 vue / 0 FK entrante / 0 import front** (T3-A1). Vestige du modèle « un compte 411 par lot », contredit la règle lot-centric. **DROP — non reprise.**

### 1.14 `budget_expenses` — **RÉFÉRENCE : voir domaine 03 §1.3 (table maître)**

**Source unique = 03-budgets-appels-impayes §1.3 (domaine propriétaire).** Le grand livre ne (re)définit PAS cette table — **pas de spec de colonnes ici**, simple renvoi. Il la **consomme** au palier « réalisé » du cycle d'engagement (voté→engagé→réalisé→payé, défini en 03 §1.3) : `validate_budget_expense` (§5) lit la dépense `validated`, poste l'écriture **D[compte charge de la ligne] / C401** (cut-off 408/486 si période fermée) et renseigne `budget_expenses.ledger_tx_id` (lien immuable). Colonnes, CHECK montant, FK→`tiers`, index et requalification ENGAGEMENT : **voir 03 §1.3**. (Définition dupliquée retirée du présent domaine pour garantir une source unique.)

---

## 2. ENUMS (catalogue cible — référence, non redéfini ici)

Réutilisés tels quels : `account_type`, `payment_method`, `payment_status`, `bank_movement_status`, `bank_match_target_type`, `expense_status` (draft / pending_validation / validated / rejected — lu par `budget_expenses` §1.14).

**Promotions CHECK → ENUM** (typage fort, fini les chaînes libres) :
- `ledger_source_type` ← ex-CHECK liste blanche, **enrichie de 2 valeurs cibles** : `budget, call_for_funds, payment, supplier_invoice, supplier_payment, bank_movement, transfer, od, opening, closing, manual, opening_balance, opening_onboarding, reclassification, result_allocation, budget_expense, mutation, collective_loan`.
  - **`mutation` (NOUVEAU)** : type de l'écriture de **clôture de compte à la validation d'une mutation** (05 §5 `validate_mutation` réécrite + 05 §7-A1). Solde le 450 du vendeur par nature et le reporte sur l'acquéreur, `source_id=mutation_id`. **Sans cette valeur, l'écriture de mutation est impossible à typer** (elle n'est ni un `transfer` bancaire ni une `reclassification` comptable : c'est un transfert de titularité lot-centric). À répercuter dans le catalogue ENUMS §6.1.
  - **`collective_loan` (NOUVEAU)** : type de l'écriture de **mise en place d'emprunt collectif** D512/C164 postée par `post_collective_loan` (§1.11, §5). Implémentation différée (§A5) mais le source_type est **figé dès maintenant** pour ne pas rouvrir l'arbitrage de typage à l'implémentation. À répercuter dans ENUMS §6.1.
- `ledger_tx_status` : `draft, posted`.
- `ledger_direction` : `debit, credit`.
- `cutoff_kind` : `CAP, CCA, PCA, PAR`.
- `treasury_advance_type` : `permanent, special, work_fund`.
- `collective_loan_status` : `active, repaid, cancelled`.
- ~~`tiers_type`~~ : **ABANDONNÉ** — le modèle de rôles de `tiers` est porté par des FLAGS booléens (`is_supplier`/`is_provider`/`is_notary`, cf. §1.12 et 07 §1.1), pas par un enum. Retiré aussi du catalogue ENUMS §6.1.
- **NOUVEAU** `account_receivable_nature` : `current, works, alur, loan, advance, doubtful` (mappe 450-1/2/5/4/3 + 459 ; remplace le parsing fragile du `code`).

**Rationalisé** :
- `period_status` : **{open, closed, approved}** uniquement. Purge `locked` et `rejected` (jamais utilisés en live : sondage = open/closed/approved seulement). Cohérent WP5.1/5.2.

Hors périmètre finance mais cités par la cartographie transverse (fusion votée ailleurs) : `vote_choice` (fusion vote_direction+council_vote_choice), delivery/urgency — traités par les domaines AG/comm.

---

## 3. RLS — 3 rôles + bypass service_role

État cible : **RLS ACTIVÉ partout** (aujourd'hui off sur le noyau finance, volontairement en dev). Bicéphale : `service_role` bypass total (ON prod / OFF dev) ; sinon session-user filtré par helper.

Helpers (SECURITY DEFINER, conservés, T1-G) :
- `user_has_copro_access(copro_id)` → lecture (gestionnaire OU copropriétaire de la copro).
- `user_is_copro_manager(copro_id)` → écriture gestionnaire.
- `user_is_lot_owner_in_copro(copro_id, lot_id)` / `user_owns_any_lot_in_copro(copro_id)` → portail copropriétaire.

**Plan de câblage `coproprietaires.user_id`** : aujourd'hui NULL partout → le rôle « copropriétaire » ne peut pas encore résoudre ses lots. Tant que non câblé, les policies copropriétaire sont **définies mais inertes** (renvoient faux). Câblage = peupler `coproprietaires.user_id` à l'invitation au portail (domaine onboarding). Aucune policy copropriétaire en écriture sur le GL.

Matrice (toutes les tables du domaine, `bypass service_role` implicite via `USING (auth.role()='service_role')` en première policy permissive) :

| table | gestionnaire | copropriétaire | anon |
|---|---|---|---|
| accounts | SELECT+ALL `user_is_copro_manager(copro_id)` | SELECT `user_has_copro_access(copro_id)` (plan comptable visible) | ✗ |
| ledger_transactions | ALL `user_is_copro_manager` (mais INSERT/UPDATE bornés par triggers immutabilité) | SELECT `user_has_copro_access` | ✗ |
| ledger_entries | ALL `user_is_copro_manager` | SELECT lignes de SES lots : `user_has_copro_access(copro_id) AND (lot_id IS NULL OR user_is_lot_owner_in_copro(copro_id, lot_id))` | ✗ |
| accounting_periods | ALL `user_is_copro_manager` | SELECT `user_has_copro_access` | ✗ |
| period_cutoff_items | ALL `user_is_copro_manager` | ✗ | ✗ |
| payments | ALL `user_is_copro_manager` | SELECT `user_is_lot_owner_in_copro(copro_id, lot_id)` (ses paiements) | ✗ |
| payment_allocations | ALL `user_is_copro_manager` | SELECT via lot du paiement parent | ✗ |
| bank_movements | ALL `user_is_copro_manager` | ✗ (donnée bancaire syndic) | ✗ |
| bank_matches | ALL `user_is_copro_manager` | ✗ | ✗ |
| treasury_advances | ALL `user_is_copro_manager` | SELECT `user_is_lot_owner_in_copro(copro_id, lot_id)` | ✗ |
| collective_loans / _shares | ALL `user_is_copro_manager` | SELECT `user_has_copro_access` (loans) / lot owner (shares) | ✗ |
| tiers | ALL `user_is_copro_manager` | ✗ | ✗ |

- **anon = aucun accès** sur tout le domaine finance (lecture comme écriture). Corrige le verdict T1 (189/190 fonctions exposées anon).
- Écriture GL **uniquement gestionnaire** (jamais copropriétaire, jamais anon) ; le copropriétaire est en lecture sur SES lots.

---

## 4. TRIGGERS conservés (socle légal — NE PAS toucher la sémantique)

| table | trigger | rôle | disposition |
|---|---|---|---|
| ledger_entries | `trg_ledger_entry_immutable` | UPDATE/DELETE bloqués sur tx posted | **GARDER** |
| ledger_entries | `trg_ledger_entry_no_insert_posted` | interdit INSERT dans une tx posted | **GARDER** |
| ledger_entries | `trg_ledger_entry_consistency` | copro/period de la ligne = ceux de l'en-tête | **GARDER** |
| ledger_entries | `enforce_is_postable` (CONSTRAINT TRIGGER déférable) | refuse ligne sur compte `is_postable=false` | **GARDER** |
| ledger_entries | `trg_enforce_lot_id_on_45x` | impose `lot_id` sur TOUT compte copropriétaire 45x **postable** | **GARDER + ÉLARGIR (décision A2, verrou USER)** → couvre **TOUS les comptes `45%` postables, SANS liste blanche ni exception** (450-1..5, 459, 451, 455, 458…). Toute ligne sur un compte `code LIKE '45%' AND is_postable=true` DOIT porter `lot_id IS NOT NULL` (sinon `RAISE EXCEPTION`). **Ne vise PAS** 512 (banque), 401 (fournisseurs), classes 6x/7x (charges/produits), 105/110/120 (réserves/report) : aucun lot_id requis sur ces comptes. La nature 45x se lit sur `accounts.nature` (§1.1) ; le périmètre du trigger reste le préfixe `45%` postable. |
| ledger_transactions | `trg_ledger_tx_immutable` | UPDATE bloqué si posted | **GARDER** |
| ledger_transactions | `trg_ledger_tx_no_delete_posted` | DELETE bloqué si posted | **GARDER** |
| accounting_periods | ~~`enforce_single_open_period`~~ | une seule période open | **REMPLACÉ** par UNIQUE partiel `(copro_id) WHERE status='open'` (déclaratif > trigger) |
| toutes | `set_updated_at` | horodatage | **GARDER (consolidé en 1 seule fonction**, vs ~11 variantes — T2 §3.1) |

Triggers de dérivation conservés (hors GL strict mais finance) : `trg_validate_payment_allocation`, `trg_allocation_update_line`, `validate_call_for_funds_total`, `update_call_line_status`/`trg_update_call_status_from_lines`, `validate_supplier_invoice_total`, `validate_supplier_payment`, `update_supplier_invoice_status_after_payment`, `check_budget_line_copro_consistency`.

---

## 5. FONCTIONS du domaine — GARDER / RÉÉCRIRE / ABANDONNER

Disposition cohérente avec T1. Garde par défaut = **G-MGR** (`REVOKE EXECUTE FROM anon; GRANT authenticated; IF NOT user_is_copro_manager(p_copro_id) THEN RAISE`).

### GARDER (chaîne canonique d'écriture)
| fonction | garde | note |
|---|---|---|
| `create_ledger_transaction` | G-MGR + G-SVC | route canonique ; **RÉÉCRIRE le `WHEN OTHERS THEN success:false`** (verdict §3) → laisser l'exception remonter (rollback réel) |
| `post_ledger_transaction` | G-MGR + G-SVC | idem : retirer le `WHEN OTHERS` masquant |
| `post_budget_call_for_funds` (10-arg) | G-MGR | appel agrégé D450-x/lot · C701. **GARDER** |
| `post_owner_payment` | G-MGR | encaissement lot-centric + FIFO cloisonné |
| `allocate_payment` | G-MGR (via RLS) | INVOKER, imputation FIFO par nature |
| `post_supplier_invoice` | G-MGR | B en 2 temps ; FK → `tiers` |
| `post_supplier_payment` (8-arg idempotent) | G-MGR | **GARDER la version idempotente** |
| `set_opening_balance` / `get_opening_balance` | G-MGR / G-DEF-RO | reprise de mandat |
| `post_period_cutoff` / `reverse_period_cutoff` / `cutoff_entry_pair` | G-MGR / G-INTERNAL | cut-off 408/486 |
| `open_next_period` / `close_period` / `approve_period` / `reopen_period` / `regularize_period` | G-MGR | cycle période ; à-nouveau AVANT affectation ; reopen interdit si approved. **L'étape d'affectation du résultat (`source_type='result_allocation'`) DOIT respecter l'invariant 110/120 (§0.2)** : ventiler par nature **D120/C450-1 (courant)** ET **D110/C450-2 (travaux)** par quote-part — jamais tout sur 120. **`regularize_period` appelle `assert_result_allocation_split` en fin de traitement (rollback si non ventilé).** |
| `assert_result_allocation_split` | G-INTERNAL | **NOUVEAU** — garde-fou OBLIGATOIRE de l'invariant 110/120 (§0.2). `RAISE EXCEPTION` si une écriture `result_allocation` de la période ne ventile pas la part travaux par `110`/`450-2`. Appelée en fin de `regularize_period`, sur le modèle de `check_transaction_balance`. |
| `resolve_lot_tiers_account` | G-INTERNAL | sous-comptes 450-x par nature (s'appuiera sur `accounts.nature`) |
| `provision_copro_chart` | G-MGR | déjà sans anon (modèle de référence) |
| `validate_budget_expense` | G-MGR | poste le **réalisé** D6xx/C401 ; table source = `budget_expenses` (03 §1.3, consommée §1.14), écrit `ledger_tx_id` (immuable) |
| `refresh_bank_movement_status` | G-MGR | **GARDER (T1 §L)** — rapprochement bancaire : recalcule `bank_movements.status` (unmatched/matched/ignored, §1.9) à partir des `bank_matches`. Fonction conservée touchant le domaine, disposition désormais explicite. |
| **geste d'écriture de rapprochement** (INSERT `bank_matches`, §1.9) | G-MGR | rattache un `bank_movement` à un paiement/règlement fournisseur (`target_type`/`target_id` polymorphe). Écriture réservée gestionnaire (jamais copropriétaire/anon, cf. §3) ; appelle ensuite `refresh_bank_movement_status`. Le rapprochement est un **intrant** : il ne crée PAS d'écriture GL (cf. §1.8 — `bank_movements` n'est pas la source du solde). |
| `fn_annexe_1..5`, `fn_dashboard_kpis`, `calculate_budget_projection`, `audit_finance_integrity`, `get_owner_statement` | G-DEF-RO / G-MIXTE | lecture dérivée du GL ; corriger libellés annexes (T-tables) |
| chaîne AG canonique postant le GL : `prepare_ag_decisions → activate_ag_decisions → generate_calls_from_ag_payload → post_budget_call_for_funds` | G-MGR | **seule chaîne AG conservée** |

### RÉÉCRIRE
| fonction | raison |
|---|---|
| `create_ledger_transaction`, `post_ledger_transaction` | supprimer `WHEN OTHERS THEN success:false` (anti-pattern compta) |
| `post_call_for_funds` (mono-clé) | supplanté par l'agrégé ; **rebrancher l'edge `generate_call_for_funds` AVANT** abandon (T3-A5). Recommandation : abandonner après rebranchement. |
| `create_alur_fund_from_ag` | la logique ALUR doit **poster D450-5 / C105** via la chaîne canonique (et non en bespoke). Réécrire comme étape de `generate_calls_from_ag_payload`. |
| **NOUVEAU** `post_collective_loan` | brancher l'emprunt collectif au GL (verdict §8) |

### ABANDONNER (verrouillé, non repris)
- Surcharges legacy : `post_budget_call_for_funds` 8-arg, `post_supplier_payment` 7-arg (risque double paiement), `post_call_for_funds` mono-clé (après rebranchement edge).
- Couche AG bespoke hors-GL : `generate_combined_calls_from_ag`, `create_budget_from_ag`, `elect_council_from_ag`, `get_ag_pending_actions`, `mark_ag_action_activated` (+ mécanisme `ag_pending_actions`).
- Artefacts dev : `get_default_copro_id`, `ensure_dev_membership` (accès copro implicite).
- 7 migrations mortes (T3-A6) : ne pas rejouer.

---

## 5 bis. VUES DU DOMAINE — GARDER / RÉÉCRIRE

Toutes les vues finance vivantes (sondage live, schema `public`). Aucune n'est abandonnée **sauf `v_account_balances`** (DROP, §1.8 — elle dérivait le 512 des `bank_movements`, chemin parallèle supprimé). Les autres sont **GARDÉES**, mais celles qui lisent une **colonne renommée** au schéma cible doivent être **RÉÉCRITES (repointées)** : `banque → bank_name`, `supplier_id → tiers_id`, et fin du **parsing du `code`** (la nature 45x se lit désormais sur `accounts.nature`).

### A. Vues de solde / GL (source = `ledger_entries`, font autorité)
| vue | repointage nécessaire | disposition |
|---|---|---|
| `v_general_ledger` | — | GARDER (status='posted' uniquement) |
| `v_general_ledger_by_account_class` | si parse `left(code,1)` : OK (code conservé) ; pas de renommage | GARDER |
| `v_trial_balance` | — | GARDER (dérive aussi la trésorerie 512) |
| `v_lot_balance` | — | GARDER — **source du solde lot** |
| `v_owner_balance` | — | GARDER (somme des lots) |
| `v_lot_avance` | — | GARDER |
| `v_unpaid_lots` | — | GARDER (impayé comptable, dérivé GL) |
| `v_account_movements` | si lit `accounts.banque` → **`bank_name`** | RÉÉCRIRE (repointer colonne) |
| `v_budget_consumption_by_account` | nature 45x : remplacer parsing `code` par `accounts.nature` si utilisé | RÉÉCRIRE (repointer nature) |
| `v_dashboard_kpis` | — (lit `ledger_entries` agrégé) | GARDER, vérifier qu'aucun champ renommé n'est référencé |

### B. Vues « relevé d'appel » (source = `call_for_funds_lines`, NE FONT PAS autorité — cf. §0.1)
| vue | repointage | disposition |
|---|---|---|
| `v_owner_statement_summary` | — | GARDER (relevé, pas le solde comptable) |
| `v_owner_statement_lines` / `v_owner_statement_lines_by_period` | — | GARDER (présentation détaillée) |
| `v_owner_financial_summary` | — | GARDER (agrégat appelé/payé) |
| `v_unpaid_by_lot` | — | GARDER (reste-à-payer par appel, relances) |

### C. Vues garde-fou / intégrité (croisent relevé ↔ GL ou fournisseurs)
| vue | repointage | disposition |
|---|---|---|
| `v_lot_vs_gl_mismatch` | — | GARDER — **garde-fou central** (relevé vs GL) |
| `v_result_allocation_split` | — (**NOUVELLE**, source = `ledger_entries`) | **CRÉER** — garde-fou de l'invariant 110/120 (§0.2) ; assiette de l'assertion bloquante `assert_result_allocation_split` (§5) |
| `v_finance_integrity_issues` | si lit `supplier_id` → **`tiers_id`** | RÉÉCRIRE (repointer FK fusion) |
| `v_call_total_mismatch` | — | GARDER |
| `v_invoice_total_mismatch` | si lit `supplier_id` → **`tiers_id`** | RÉÉCRIRE |
| `v_payment_allocation_issues` | — | GARDER |
| `v_supplier_payment_issues` | `supplier_*` → **`tiers_*`** | RÉÉCRIRE (repointer FK fusion) |

### D. Vues bancaires / rapprochement (lisent `bank_movements`/`bank_matches`)
| vue | repointage | disposition |
|---|---|---|
| `v_bank_movements_overview` | **SELECT `bm.account_code` + `bm.account_category`** — colonnes DROPPÉES (§1.8) | **RÉÉCRIRE** : joindre `accounts` sur `account_id`, exposer `accounts.code AS account_code` et une catégorie dérivée (`left(accounts.code,1)` ou via `accounts.account_type`). À faire AVANT le DROP des colonnes (sondé 2026-06-04). |
| `v_payments_overview` | aucun (ne lit ni `account_code`/`account_category`, ni colonne renommée) | GARDER (sondé : sûre) |

### E. Vues ALUR (lisent `alur_transfers`, table **CONSERVÉE** — faux-mort câblé, 03 §1.10)
**Statut tranché (verrou de réconciliation) :** `alur_transfers` est un **FAUX-MORT CÂBLÉ — CONSERVÉE** (0 ligne mais branchée `useALURData.ts` + 2 vues ; même traitement que `bank_matches`/`mutation_steps`). La mention antérieure « table DROPPÉE » est **CORRIGÉE** : aucune des deux vues n'est droppée, la table source survit. Le jour où la feature est réellement câblée, un transfert ALUR **postera une écriture GL canonique** (cf. 03 §1.10). Les 2 vues sont **GARDÉES** :

| vue | dépendance | disposition |
|---|---|---|
| `v_alur_fund_summary` | lit `budgets`/`budget_lines` **+ `alur_transfers`** (LATERAL `total_transferred`) | **GARDER**. La source `alur_transfers` étant conservée, la vue reste valide telle quelle. (Évolution souhaitable, non bloquante : faire reposer `solde_actuel` sur le solde GL des comptes **`105`** / **`450-5`** via `v_trial_balance` le jour où le transfert ALUR poste une écriture — conforme `alur_fonds_travaux_accounting`, appel art.14-2 = D450-5/C105. Tant que la table reste à 0 ligne, le terme `total_transferred` vaut 0, sans incidence.) |
| `v_alur_transfers_history` | lit **uniquement `alur_transfers`** (historique des transferts) | **GARDER**. La table source est conservée → la vue reste valide. Pas de DROP. |

> Règle générale : toute vue qui SELECT `accounts.banque`, `*.supplier_id`/`suppliers.*`/`providers.*`, ou les colonnes droppées `bank_movements.account_code`/`account_category`, ou qui **dérive la nature 45x par parsing de `code`**, est **RÉÉCRITE** (repointée sur `bank_name`, `tiers(_id)`, `accounts(.code/.nature)`). Les autres sont reprises sans modification. **`alur_transfers` n'est PAS droppée** (faux-mort câblé) → les 2 vues ALUR sont GARDÉES. **Seul DROP de vue du domaine : `v_account_balances` (§1.8, dérivait le 512 des `bank_movements`).**

### Triggers de dérivation (§4) — disposition individuelle pour la migration
Les triggers de dérivation listés au §4 sont **tous GARDÉS** ; les seuls touchés par les renommages de colonnes/FK sont signalés :

| trigger | table | impact migration | disposition |
|---|---|---|---|
| `trg_validate_payment_allocation` | payment_allocations | aucun | GARDER tel quel |
| `trg_allocation_update_line` | payment_allocations | aucun | GARDER |
| `validate_call_for_funds_total` | call_for_funds | aucun | GARDER |
| `update_call_line_status` / `trg_update_call_status_from_lines` | call_for_funds_lines | aucun | GARDER |
| `validate_supplier_invoice_total` | supplier_invoices | FK `supplier_id → tiers_id` | GARDER + **repointer la FK** |
| `validate_supplier_payment` | supplier_payments | FK `supplier_id → tiers_id` | GARDER + **repointer la FK** |
| `update_supplier_invoice_status_after_payment` | supplier_payments | aucun (logique de statut) | GARDER |
| `check_budget_line_copro_consistency` | budget_lines | aucun | GARDER |

---

## 6. COPRO-TEMPLATE PROPRE — PAS de reprise du live (décision A1, verrou USER)

**Décision A1 (USER, verrouillée)** : on **ne migre AUCUNE donnée du live**. La référence test/démo (ex-boucle d'or 22222222, ex-immuable 11111111) est **remplacée** par une **COPRO-TEMPLATE construite de A à Z** sur le schéma cible propre. **Le schéma fait foi, pas l'historique.** Conséquence : **toutes les anciennes cartes de migration, inventaires de `source_id` NULL et exemptions « immuables » de ce domaine sont SANS OBJET et retirés.**

La copro-template est **semée par les posteurs canoniques eux-mêmes** (chaîne §5 : `provision_copro_chart` → `validate_budget` → `generate_calls_from_ag_payload` → `post_budget_call_for_funds` → `post_owner_payment` → `validate_budget_expense` → cycle période). Aucune insertion « brute » contournant les triggers : **la donnée naît conforme** (équilibre, `is_postable`, `lot_id` sur 45x, période ouverte). Il n'y a donc **plus jamais** de ligne `450`/lot_id NULL ni de ligne posée sur le `450` parent `is_postable=false` à « rattraper » : ces cas n'existent que dans l'historique live, qu'on n'importe pas.

Bénéfice direct : **le point bloquant des 4 écritures `450`/lot_id NULL disparaît**. Le trigger `trg_enforce_lot_id_on_45x` élargi (A2 : `lot_id` NOT NULL sur **tout** `45%` postable, sans liste blanche) s'applique **sans aucune exemption ni flag `migration_exempt`** — il n'y a rien à exempter. Le `450` parent reste `is_postable=false` uniformément sur **toutes** les copros (plus d'hétérogénéité 11111111).

Plan de comptes : `provision_copro_chart` crée directement le chart cible (`bank_name`, `accounts.nature` posée à la création des 45x, pas de `parent_id`). Le chart inclut **471/472 (comptes d'attente de reprise de mandat)**, contreparties des à-nouveaux d'ouverture posés par `set_opening_balance` (TEMPLATE-SEED §2 étape 9, `source_type='opening_onboarding'`). Toutes les écritures de la template sont posées sur les sous-comptes `450-1..5`/`459` avec `lot_id`, jamais sur le `450` parent.

---

## 7. ARBITRAGES — TRANCHÉS (verrous USER appliqués)

Tous les arbitrages de ce domaine sont **tranchés**. Plus aucune décision USER en attente ici.

**A1 — Reprise du live → ABANDONNÉE (verrou USER).** On ne migre rien : copro-template propre de A à Z (§6). Les ex-arbitrages « 4 écritures `450`/lot_id NULL de la copro immuable » et « exemption double trigger » sont **CADUQUES** (la donnée fautive n'est jamais importée).

**A2 — `enforce_lot_id_on_45x` élargi → TRANCHÉ (verrou USER).** `lot_id` NOT NULL sur **TOUS** les comptes `45%` postables, **SANS liste blanche ni exception** (§4, §1.3). Ne vise PAS 512/401/6x/7x/105/110/120. La donnée de la template naissant via les posteurs canoniques, l'invariant est respecté par construction.

**A3 — `post_call_for_funds` mono-clé → ABANDON (verrou A7).** Rebrancher l'edge `generate_call_for_funds` sur l'agrégé 10-args **AVANT** abandon (séquencé). Aucun chemin mono-clé conservé. Voir §5 RÉÉCRIRE.

**A4 — `bank_movements.period_id` nullable → TRANCHÉ (verrou A15).** Relâché à nullable (§1.8) : un mouvement importé peut précéder son affectation à une période.

**A5 — Emprunt collectif au GL → DIFFÉRÉ HORS TEMPLATE (verrou A16).** Le schéma est prêt (`collective_loans.ledger_tx_id`, `source_type='collective_loan'` figé §2). L'implémentation de `post_collective_loan` (D512/C164) est **différée hors copro-template testable** : pas dans la boucle financière de base. Branchement à câbler plus tard, pas de reprise de données.
