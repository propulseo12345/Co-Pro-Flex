# Fiche de spécification durable — LE GRAND LIVRE (CoProFlex)

> Audit logique métier, rang 1. Source unique de vérité financière visée.
> Données vérifiées en base le 2026-05-30 (projet Supabase `iyfesbjnkpynmwlsmxnp`).
> **Statut : BROUILLON — en attente de validation des questions expert (§7).**
>
> Arbitrage utilisateur fondateur : **le grand livre (`ledger_entries`) est la source unique de vérité, À LA CONDITION qu'il soit TOUJOURS alimenté** — c'est-à-dire qu'aucune opération métier (facture engagée, appel de fonds, paiement) ne doit exister sans son écriture comptable correspondante.

---

## 1. IDENTITÉ

**Nom métier :** Le Grand Livre comptable de la copropriété. C'est le « cahier de comptes » officiel : chaque euro qui entre, sort ou est dû y est inscrit en partie double (un débit quelque part, un crédit ailleurs, toujours équilibré). C'est lui qui doit servir de référence unique pour la trésorerie, les soldes des copropriétaires, le budget consommé et les annexes comptables 1 à 5.

**Tables Supabase (le cœur) :**
- `ledger_transactions` — l'en-tête de chaque pièce comptable (le bordereau). Une transaction = une opération. États : `draft` (brouillon, modifiable) → `posted` (comptabilisée, gelée).
- `ledger_entries` — **LA SOURCE DE VÉRITÉ** : les lignes élémentaires (1 sens débit/crédit, 1 montant > 0, 1 compte, parfois 1 lot). Le solde d'un compte = SUM(débit) − SUM(crédit) de ses lignes postées.
- `accounts` — le plan comptable de la copro (codes du décret 2005-240, classés 1/4/5/6/7).
- `accounting_periods` — les exercices comptables (le verrou temporel : on ne poste que dans une période `open`).
- `ledger_locks` — le verrou explicite à la clôture (double sécurité avec le statut de période).

**Vues de lecture (consommatrices) :**
- `v_trial_balance` — balance générale par compte (filtre `posted`, RÉFÉRENCE).
- `v_general_ledger` — journal de détail ligne à ligne (expose `draft` et `posted` volontairement).
- `v_general_ledger_by_account_class` — balance par classe comptable (**BUG : ne filtre PAS `posted`**).
- `v_account_balances` — trésorerie classe 5 (**lit `bank_movements`, PAS le ledger** → divergence).
- `v_lot_balance` — solde par lot (filtre `posted`, via `ledger_entries.lot_id`).
- `v_owner_balance` — solde par copropriétaire (dérivée de `v_lot_balance`).
- `fn_annexe_1` (trésorerie/provisions/créances/dettes) et `fn_annexe_2` (budget/réalisé) — lisent le ledger posté.

**Fonctions/triggers qui ÉCRIVENT :**
- `create_ledger_transaction(...)` — RPC, **SEULE fonction DB qui fait un INSERT propre** dans `ledger_transactions` + `ledger_entries`. Appelée uniquement à la main (aucun trigger ne l'appelle).
- `post_ledger_transaction(p_tx_id)` — RPC, fait l'UPDATE `status='posted'` et porte **le seul contrôle d'équilibre débit=crédit**.
- Edge Function `generate_call_for_funds` (v4) — **la seule qui fonctionne réellement** ; insère en direct avec les bonnes colonnes.
- Edge Functions `record_payment`, `create_supplier_invoice`, `pay_supplier_invoice` — **CASSÉES** (noms de colonnes inexistants, voir §5).
- Triggers d'immuabilité : `trg_ledger_tx_immutable`, `trg_ledger_tx_no_delete_posted`, `trg_ledger_entry_immutable`, `trg_ledger_entry_no_insert_posted`, `trg_ledger_entry_consistency`, `enforce_single_open_period`.

---

## 2. MODÈLE DE DONNÉES (et sources de vérité)

**`ledger_entries` (la vérité financière) :**
- `direction` (débit/crédit) + `amount` (numeric(15,2), toujours > 0) → le sens est porté par `direction`, jamais par le signe.
- `account_id` → quel compte. `lot_id` → ventilation par lot (facultatif).
- **Source de vérité du solde d'un compte = SUM(amount débit) − SUM(amount crédit) sur les lignes dont la transaction parente est `posted`.**

**Chiffres dérivés et leur source de vérité visée (= le grand livre) :**

| Chiffre dérivé | Source de vérité CIBLE | Aujourd'hui calculé depuis |
|---|---|---|
| Trésorerie (classe 5) | `ledger_entries` comptes 5xx postés | DEUX sources rivales : `v_account_balances` (initial_balance + `bank_movements`) ET `fn_annexe_1` (ledger) → écart **6 521,49 €** mesuré |
| Budget réalisé/consommé | `ledger_entries` comptes 6xx postés (engagement) | `fn_annexe_2` (ledger 6xx) — MAIS `budget_expenses` vit hors ledger |
| Solde copropriétaire | `ledger_entries` compte 450 par lot/owner | `v_owner_balance` ← `v_lot_balance` (via `lot_id`) |
| Solde lot | `ledger_entries` compte 450, `lot_id` | `v_lot_balance` |
| Impayés | `ledger_entries` 450 débiteur vs encaissements | dérivé du solde 450 (incomplet, voir §5) |

**Colonnes dénormalisées / snapshots à surveiller :**
- `accounts.initial_balance` — **snapshot** : n'est PAS réinjecté automatiquement dans le ledger. Doit être traduit en écriture d'ouverture (`source_type='opening'`), sinon le solde diverge.
- `ledger_transactions.source_type` / `source_id` — lien polymorphe vers la pièce métier, **SANS clé étrangère**. Vérifié en base : `source_id` est **NULL sur 100 % des 38 transactions** (backref totalement cassé).
- `call_for_funds_lines` (ventilation par lot de l'appel) — **redondance hors ledger** : la répartition par lot existe là, mais l'écriture 450 globale n'a souvent pas de `lot_id` → la vérité « par lot » est dédoublée.
- `bank_movements` — source de trésorerie parallèle au ledger (à supprimer ou dériver du ledger).
- `lot_accounts` (21 lignes) — pont lot↔compte 411 partiellement peuplé ; `v_lot_balance` le contourne en passant par `ledger_entries.lot_id`.

---

## 3. RÈGLES MÉTIER ATTENDUES (fondement légal)

> Fondement : décret n°2005-240 du 14/03/2005 (comptabilité du syndicat des copropriétaires), art. 14-3 de la loi n°65-557 du 10/07/1965 (comptabilité en partie double + droits constatés/engagement), arrêté du 14/03/2005 fixant le plan comptable, art. 14-2 (fonds travaux).

- **R1 — Partie double obligatoire.** Toute transaction comptabilisée doit avoir SUM(débits) = SUM(crédits) (tolérance ≤ 0,01 €). *Aujourd'hui : garantie seulement par `post_ledger_transaction`, pas par la base.*
- **R2 — Le grand livre est TOUJOURS alimenté (condition fondatrice de l'utilisateur).** CHAQUE opération métier (facture fournisseur engagée, appel de fonds émis, paiement reçu/émis, transfert ALUR, emprunt, avance) DOIT générer une et une seule écriture en partie double, automatiquement. Aucune opération ne doit pouvoir exister sans son écriture. *C'est la règle pivot : si elle est violée, le grand livre ne peut PAS être source unique de vérité.*
- **R3 — Droits constatés / comptabilité d'engagement (art. 14-3 + art. 4 décret 2005-240).** Une charge est rattachée à l'exercice d'**EXÉCUTION** de la prestation (service rendu / fourniture livrée), indépendamment de la **date de facture** et du paiement ; en pratique comptabilisée à réception de facture (débit charge 6xx / crédit 401) puis régularisée à la clôture via **408** (exécuté non facturé) / **486** (facturé non exécuté). Le « réalisé » = débits classe 6. *Aujourd'hui : non garanti (engagement optionnel + bug).*
- **R4 — Immuabilité des écritures postées.** Une pièce `posted` ne peut être ni modifiée, ni supprimée, ni complétée. Correction = nouvelle écriture d'OD (`source_type='od'`) en contre-passation. *Bien implémenté en base.*
- **R5 — Verrou temporel.** On ne comptabilise que dans une période `open`. À la clôture, la période est verrouillée (statut + `ledger_locks`). *Garanti seulement par la fonction de posting, pas par trigger sur les lignes.*
- **R6 — Cohérence classe ↔ nature de compte (plan comptable décret 2005-240).** Le préfixe du code (1 capitaux, 4 tiers, 5 financiers, 6 charges, 7 produits) doit correspondre au `account_type`. *Aujourd'hui : pure convention applicative, aucune contrainte.*
- **R7 — Source unique pour la trésorerie.** Le solde de trésorerie d'un compte 5xx = solde de ce compte au grand livre posté. Aucune source bancaire parallèle ne doit faire autorité.
- **R8 — Ventilation par lot complète.** Toute écriture sur le compte copropriétaires (450/411) doit porter un `lot_id`, pour que le solde par lot réconcilie exactement avec le solde global du compte 450.
- **R9 — Report à-nouveau N-1.** À l'ouverture d'un exercice, les soldes N-1 sont repris automatiquement par des écritures `source_type='opening'`. *Aujourd'hui : aucune fonction de report, saisie 100 % manuelle.*
- **R10 — Annexes dérivées du grand livre (annexes 1 à 5).** Toutes les annexes légales se calculent à partir du grand livre posté, jamais d'une source parallèle.

---

## 4. ÉTAT RÉEL EN BASE

| Règle | Statut | Détail / invariant réellement CONTRAINT vs applicatif |
|---|---|---|
| R1 Partie double | **PARTIEL** | CONTRAINT : `amount > 0`, `direction IN (debit,credit)`. NON contraint : aucun CHECK/trigger ne vérifie SUM(débit)=SUM(crédit). Garanti UNIQUEMENT par `post_ledger_transaction` (étape 5). Une `draft` peut être déséquilibrée. *(Vérifié : 0 tx déséquilibrée actuellement, mais rien ne l'empêche.)* |
| R2 Toujours alimenté | **BUG / ABSENT** | Aucun trigger ne poste au ledger depuis les tables métier. 3 des 4 edge functions financières sont cassées. `source_id` NULL à 100 %. Condition fondatrice NON tenue. |
| R3 Engagement / droits constatés | **BUG** | L'écriture 6/401 n'est créée que si `post_immediately=true` ET hors bug colonnes (non corrigé). `budget_expenses` (4 lignes) n'a ni `ledger_tx_id` ni `account_id`. |
| R4 Immuabilité posted | **OK** | CONTRAINT en base : triggers rejettent UPDATE/DELETE d'une tx posted et UPDATE/DELETE/INSERT de ses lignes. Solide. *Limite : une tx peut naître `posted` par INSERT direct sans contrôle (ck_posted_consistency exige juste posted_at non NULL).* |
| R5 Verrou temporel | **PARTIEL** | CONTRAINT : `enforce_single_open_period` (1 seule période open/copro). NON contraint : transitions de statut libres ; un INSERT direct d'écriture dans une période `closed`/verrouillée n'est bloqué par AUCUN trigger (seul `post_ledger_transaction` le vérifie). |
| R6 Classe ↔ nature | **ABSENT** | Aucune contrainte ne relie préfixe du code et `account_type`. Index `idx_accounts_code_prefix` présent mais n'impose rien. |
| R7 Source unique trésorerie | **BUG** | `v_account_balances` lit `bank_movements`, pas le ledger. Écart mesuré **6 521,49 €** (7 481,49 vue banque vs 960,00 ledger posté). |
| R8 Ventilation lot complète | **PARTIEL** | Sur le compte 450 : **25 écritures, dont 6 sans `lot_id`** → ces 6 fuient de `v_lot_balance`/`v_owner_balance`. Aucune contrainte n'impose `lot_id` sur les comptes copropriétaires. |
| R9 Report N-1 | **PARTIEL** | 3 tx `opening` postées existent mais AUCUNE fonction de report automatique. Saisie manuelle. |
| R10 Annexes du ledger | **PARTIEL** | `fn_annexe_1`/`fn_annexe_2` lisent bien le ledger posté, MAIS dépendent de R2 (si une facture n'a pas d'écriture 6xx, le réalisé est sous-estimé sans signal). |

---

## 5. MAL IMPLÉMENTÉ / DETTE

**P0 — `v_general_ledger_by_account_class` ne filtre pas `status='posted'` (BUG confirmé en base).** La définition contient `LEFT JOIN ledger_transactions lt ON lt.id = le.tx_id` SANS aucun `WHERE lt.status='posted'` (join mort, aucune colonne de `lt` utilisée). Elle agrège draft + posted alors que `v_trial_balance` filtre posted. Dès qu'une draft déséquilibrée existe, la balance par classe ne réconcilie plus avec la balance générale (et total_debit ≠ total_credit possible). *Correction : ajouter `AND lt.status='posted'`.*

**P0 — Le grand livre n'est PAS toujours alimenté (viole R2).** Aucun trigger sur les tables métier ne poste au ledger. La seule fonction DB propre (`create_ledger_transaction`) n'est appelée par rien automatiquement. Toute la logique de pont vit dans des edge functions hors base.

**P0 — 3 edge functions financières CASSÉES (colonnes inexistantes).** `record_payment`, `create_supplier_invoice`, `pay_supplier_invoice` insèrent dans `ledger_transactions` avec la colonne `date` (la vraie est `tx_date`) et dans `ledger_entries` avec `transaction_id`/`debit`/`credit` (les vraies sont `tx_id`/`direction`/`amount`). Elles throwent à l'insert des écritures AVANT de créer la ligne métier → ni écriture, ni ligne. Conséquence : paiements copro, factures et paiements fournisseurs ne s'écrivent JAMAIS au ledger par le flux applicatif.

**P0 — `source_id` NULL sur 100 % des transactions (backref cassé).** Vérifié : 0 transaction sur 38 ne renseigne `source_id`. Impossible de relier une écriture à sa pièce métier (facture, appel, paiement) → aucune traçabilité, aucun rapprochement automatique.

**P1 — Comptabilité d'engagement non garantie (viole R3).** L'écriture 6/401 est optionnelle (`post_immediately`) et bloquée par le bug colonnes. `budget_expenses` est structurellement disjoint (ni `ledger_tx_id`, ni `account_id`, ni lien vers `supplier_invoices`). Le « budget consommé = charges classe 6 dès l'engagement » est donc indérivable du grand livre.

**P1 — Trésorerie à double source (viole R7).** `v_account_balances` = initial_balance + `bank_movements` (6 mouvements) vs `fn_annexe_1` = ledger 50/51. Écart réel **6 521,49 €**.

**P1 — Écritures 450 sans `lot_id` (viole R8).** 6 écritures sur 25 du compte 450 n'ont pas de lot → exclues de `v_lot_balance`. Le total des soldes par lot ne réconcilie pas avec le compte 450 de la balance générale.

**P2 — Équilibre non contraint en base (renforce R1).** Aucun CHECK/trigger d'équilibre ; un INSERT direct `status='posted'` contourne `post_ledger_transaction` (ck_posted_consistency exige seulement `posted_at` non NULL).

**P2 — Verrou/période non appliqués au niveau ligne (R5).** Un INSERT direct d'écriture dans une période `closed` ou verrouillée n'est bloqué par aucun trigger sur `ledger_entries`.

**P2 — Pas de machine à états sur `accounting_periods.status`.** L'enum autorise n'importe quelle transition (closed→open, approved→rejected). Cohérence horodatages/auteurs non contrainte.

**P3 — Univers disjoints non câblés.** `alur_transfers`, `treasury_advances`, `collective_loans` ne sont reliés au ledger par aucune fonction ni trigger (pas de fonds travaux classe 105, pas de dette d'emprunt classe 16).

**P3 — Aucune fonction de report N-1 automatique (R9).** Les `opening` sont saisis à la main.

**P3 — Classe ↔ nature non contrainte (R6).** Le calcul « budget = classe 6 » repose sur la rigueur du paramétrage des codes, pas sur la base.

---

## 6. SOURCES DIVERGENTES → source unique cible = LE GRAND LIVRE

| Concept | Calculé à plusieurs endroits (aujourd'hui) | SOURCE UNIQUE CIBLE |
|---|---|---|
| **Trésorerie (classe 5)** | `v_account_balances` (initial_balance + `bank_movements`) **ET** `fn_annexe_1` (`v_trial_balance` ledger 50/51) → écart **6 521,49 €** | `ledger_entries` comptes 5xx postés = **trésorerie comptable** (référence) ; `bank_movements`/`v_account_balances` **CONSERVÉS** comme **2e KPI distinct** (solde bancaire instant T) + rapprochement — jamais fusionnés ni supprimés |
| **Budget réalisé/consommé** | `fn_annexe_2` (ledger 6xx postés) **ET** `budget_expenses` (table orpheline) | `ledger_entries` comptes 6xx postés via `v_budget_consumption_by_account` ; `budget_expenses` **REQUALIFIÉE en couche engagement** (jamais réalisé, **ni suppression**) |
| **Solde copropriétaire** | `v_owner_balance` ← `v_lot_balance` (`ledger_entries.lot_id`) ; ventilation aussi dans `call_for_funds_lines` | `ledger_entries` compte 450, agrégé par lot/owner |
| **Solde lot** | `v_lot_balance` (via `lot_id`) ; pont `lot_accounts` (411) partiel | `ledger_entries` compte 450/411 avec `lot_id` obligatoire |
| **Impayés** | dérivé du solde 450 (incomplet : 6 écritures sans lot + appels orphelins) | `ledger_entries` compte 450 débiteur posté, par lot |
| **Balance par classe** | `v_general_ledger_by_account_class` (draft+posted) **≠** `v_trial_balance` (posted) | `v_trial_balance` (posted) — corriger la vue par classe |

---

## 7. QUESTIONS EXPERT OUVERTES

> **Décisions actées (2026-05-30, discussion avec l'expert) :**
> - **Q1 trésorerie → Option A** : on garde `bank_movements` (une fonction de rapprochement bancaire est prévue). **+ afficher DEUX indicateurs distincts au dashboard** : la **trésorerie comptable** (grand livre, comptes 5xx postés) ET le **solde bancaire à l'instant T** (compte réel via relevés). Ne jamais fusionner les deux en un seul chiffre ambigu.
> - **Q4 `lot_id` → Option A** : tout mouvement du compte 450/411 est **toujours lié à un lot** → `lot_id` obligatoire, et l'appel de fonds doit être **ventilé par lot** (une ligne d'écriture par lot, pas un débit global).
> - **Q2 `budget_expenses` → TRANCHÉ** (cf. `research/cycle-depense.md`). Modèle **Voté / Engagé / Réalisé / Disponible** livré au **go-live** :
>   - **Réalisé** = TOUJOURS dérivé du grand livre (classe 6, via `v_budget_consumption_by_account`). On rebranche `v_budgets_overview`/`v_budget_lines_overview`/`useBudget` dessus.
>   - **Engagé** = contrats (`contracts`) + ordres de service (`service_orders`), **+ une saisie manuelle** (`budget_expenses` requalifiée) pour les cas hors-cadre : si **pas de justificatif → on prévient, on ne bloque pas**, mais l'écriture comptable est **quand même** générée (grand livre toujours alimenté).
>   - **Engagement né** à la signature du devis / l'émission de l'OS (récurrent : mise en cours du contrat), **pas** au vote d'AG.
>   - **Dépassement** : on **fige le montant engagé/voté initial** et on historise l'**avenant séparément** (jamais d'écrasement) — preuve du mandat (art. 18-21) + détection des frais supplémentaires.
>   - *Détails par défaut (modifiables) : contrat récurrent = 1 ligne d'engagement annuelle se résorbant facture par facture ; alerte de dépassement = seuil **configurable**, défaut 10 %, qui prévient sans bloquer.*

1. **`bank_movements` : on garde ou on supprime ?** → **TRANCHÉ : Option A** (garder pour le rapprochement) + deux KPI distincts (voir encadré ci-dessus).
2. **`budget_expenses` : pont vers le ledger ou suppression ?** (a) ajouter `ledger_tx_id`/`account_id` et la relier à la classe 6 ; (b) la supprimer et tout dériver des factures fournisseurs engagées. Détermine la faisabilité de R3.
3. **Durcissement de l'équilibre : trigger base ou flux unique ?** (a) trigger CONSTRAINT DEFERRABLE en base (équilibre garanti structurellement) ; (b) forcer tout le flux à passer par `create_ledger_transaction`/`post_ledger_transaction` + bloquer les INSERT `posted` directs. Ou les deux.
4. **Lot obligatoire sur 450/411 ?** Rendre `lot_id` NOT NULL (par trigger) sur les écritures des comptes copropriétaires, OU tolérer des écritures 450 « collectives » sans lot (et alors comment les réconcilier) ?
5. **Report N-1 : automatique à la clôture, ou semi-automatique validé en AG ?** Faut-il générer les `opening` automatiquement au passage `approved`, ou laisser le gestionnaire les valider ?
6. **Immobilisations (classe 2) et stocks (classe 3) : à suivre ou pas ?** Absentes aujourd'hui (compta copro simplifiée). À confirmer pour le périmètre du plan comptable.
7. **ALUR / avances / emprunts (classes 105, 16) : câblage prioritaire ou plus tard ?** Tables aujourd'hui hors ledger — à intégrer dans le go-live ou en phase 2 ?
8. **Contre-passation (OD) : workflow dédié ?** Faut-il un assistant de contre-passation `source_type='od'` (puisque l'immuabilité interdit la correction directe) ?
