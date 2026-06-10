# Fiche de spécification durable — LE BUDGET (CoProFlex)

> Audit logique métier, rang 3. S'appuie sur la source unique de vérité financière (le grand livre) définie au rang 1.
> Données vérifiées en base le 2026-05-30 (projet Supabase `iyfesbjnkpynmwlsmxnp`).
> **Statut : BROUILLON — en attente de validation des questions expert (§7).**
>
> **Modèle déjà tranché avec l'expert (cf. `research/cycle-depense.md`, NON rouvert ici) :** Voté ≥ Engagé ≥ Réalisé ; Disponible = Voté − Engagé − Réalisé. Le **réalisé vient TOUJOURS du grand livre** (débits classe 6 postés, via `v_budget_consumption_by_account` / `fn_annexe_2`), **jamais** de `budget_expenses`. `budget_expenses` est **requalifiée** en couche d'engagement extra-comptable + porte de saisie manuelle.

---

## 1. IDENTITÉ

**Nom métier :** Le Budget de la copropriété. C'est la « feuille de route financière » votée par les copropriétaires : combien on prévoit de dépenser cette année (chauffage, ménage, assurance, travaux…), poste par poste. Trois budgets coexistent :
- **Budget prévisionnel courant** (`budget_type = 'current'`) — les charges courantes de l'année, votées en AG, base des appels de fonds trimestriels (**art. 14-1**).
- **Budget travaux** (`budget_type = 'works'`) — les gros travaux hors budget courant, votés et appelés séparément (**art. 14-2**).
- **Fonds travaux ALUR** (`budget_type = 'alur'`, compte **105**) — la cagnotte obligatoire (**art. 14-2** = existence du fonds + PPT ; **art. 14-2-1** = cotisation : ≥ 5 % du budget prévisionnel courant **sans PPT** ; **si un PPT est adopté**, s'ajoute un second plancher de **≥ 2,5 % du montant des travaux du PPT**). → prévoir un flag « PPT adopté » au niveau copro qui pilote le calcul du minimum.

Le budget n'est PAS de la comptabilité : c'est une **prévision** (le « voté »). Le rôle du module est de **comparer en continu cette prévision au réel** (lu dans le grand livre) et à l'**engagé** (devis signés, contrats en cours).

**Tables Supabase (cœur) :**
- `budgets` — en-tête. `copro_id`, `period_id` (FK `accounting_periods`, NOT NULL), `budget_type` (`current`/`works`/`alur`), `status` (enum `budget_status`), `version`, `source_ag_id` (lien vers le vote), `validated_by`/`validated_at`. `UNIQUE (copro_id, period_id, budget_type, version)`.
- `budget_lines` — lignes (un poste = une ligne). `account_id` (NOT NULL — **pivot vers le réalisé ledger**), `repartition_key_id` (NOT NULL), `amount` (CHECK ≥ 0 — **montant VOTÉ**), `label`, `code`. Trigger `check_budget_line_copro_consistency()`.
- `budget_expenses` — **À REQUALIFIER en couche ENGAGEMENT**. Aujourd'hui orpheline : `budget_line_id`, `amount`, `status`, `fournisseur`, `montant_ht`, `taux_tva`, `piece_jointe` — mais **ni `account_id` ni `ledger_tx_id`**.
- `accounting_periods` — l'exercice (verrou temporel ; valider dans une période `open`).
- `alur_transfers` — sorties du fonds ALUR (105). **Sans `ledger_tx_id` ni trigger** → invisible au grand livre.

**Vues :**
- `v_budget_consumption_by_account` — **LE BON RÉALISÉ** (`budget_lines.account_id` ↔ débits `ledger_entries`). À fiabiliser (filtre `posted`, inclure `closed`).
- `fn_annexe_2` — Annexe 2 réglementaire. Le **réalisé budgétaire = débits classe 6** `posted` (l'annexe expose aussi les produits classe 7, hors « consommé »). Correct, mais inclut à tort `submitted` dans le voté.
- `v_budgets_overview` / `v_budget_lines_overview` — **À REBRANCHER** (calculent le réalisé depuis `budget_expenses`, faux).
- `v_budget_expenses_detail` — détail des engagements/saisies. Légitime **comme couche d'engagement**.
- `v_alur_fund_summary` / `v_alur_lot_contributions` — solde ALUR hors ledger (voté − transferts).

**Fonctions de cycle de vie :**
- `submit_budget` : `draft → submitted` (≥ 1 ligne + clés complètes). `submitted` n'est **PAS** voté.
- `validate_budget` : `draft|submitted → validated`. **Définition canonique du « voté » manuel.** Exige période `open`, clés complètes, unicité. Pose `validated_by`/`validated_at`.
- `prepare_ag_decisions` / `activate_ag_decisions` : chaîne AG → données copro (`CREATE_BUDGET` → `validated` ; `APPROVE_ACCOUNTS` → `closed` ; `SCHEDULE_*` → appels).
- `create_budget_from_ag` : 3e porte (SECURITY DEFINER), crée un budget `current` directement `validated`. **`create_budget_from_ag_with_account_and_key` N'EXISTE PAS en base.**
- `generate_combined_calls_from_ag` / `generate_calls_from_ag_payload` — **DEUX générateurs d'appels divergents** (voir §5/§6).

---

## 2. MODÈLE DE DONNÉES (Voté / Engagé / Réalisé / Disponible)

```
VOTÉ  ≥  ENGAGÉ  ≥  RÉALISÉ
DISPONIBLE = VOTÉ − ENGAGÉ − RÉALISÉ   (vision prudente, défaut)
DISPONIBLE_comptable = VOTÉ − RÉALISÉ  (vision annexe 2/3)
```

| Niveau | Définition | Porteur | **Source CIBLE** | État |
|---|---|---|---|---|
| **VOTÉ** | Prévision approuvée en AG, par poste | `budget_lines.amount` (`account_id` classe 6), `status IN ('validated','closed')` | `budget_lines.amount` | OK (donnée) ; définition à unifier |
| **ENGAGÉ** | Obligation juridique pas encore comptabilisée (devis/OS/contrat + saisie manuelle) | `budget_expenses` **requalifiée** (`budget_line_id`+`account_id`+`montant_engage`+`montant_vote_initial` figé) + `contracts`/`service_orders` | couche extra-comptable reliée amont (`budget_lines`) & aval (`supplier_invoices`) | **ABSENT** (rien de câblé) |
| **RÉALISÉ** | Charges comptabilisées (dès la facture, art. 14-3) | **aucune saisie manuelle** | débits classe 6 **postés**, via `v_budget_consumption_by_account` / `fn_annexe_2` | **BUG** (exposé depuis `budget_expenses`) |
| **DISPONIBLE** | Ce qu'il reste à dépenser | calculé | `Voté − Engagé − Réalisé` | **ABSENT** (`remaining` = voté − faux réalisé) |

**Points non négociables (décidés) :** (1) réalisé = TOUJOURS le grand livre ; (2) `budget_expenses` = engagement + saisie manuelle (prévient sans bloquer, mais **génère l'écriture**) ; (3) engagement né à la signature devis/OS ; (4) dépassement = fige l'initial + avenant séparé (seuil défaut 10 %) ; (5) voté = `validated`/`closed`, `submitted` exclu.

---

## 3. RÈGLES MÉTIER ATTENDUES (fondement légal)

> Fondement : loi 65-557 (art. **14-1** budget/provisions, **14-2 / 14-2-1** travaux + fonds ALUR, **14-3** engagement, 18-21 mandat, **42** contestation des comptes), décret 2005-240 + arrêté 14/03/2005 (plan comptable, annexes 2-5).
> *Précisions review (2026-05-30) : le « réalisé » se rattache à l'**exécution** de la prestation (pas à la date de facture), régularisée à la clôture via **408** (FNP) / **486** (CCA) ; l'art. 42 ouvre une **action en contestation** (forclusion 2 mois, opposants/défaillants), pas une nullité automatique ; appels de provisions = 4×25 % **par défaut**, l'AG peut voter d'autres modalités (art. 14-1).*

- **B1 — Voté = approuvé en AG** (`status IN ('validated','closed')`, `submitted` exclu), définition unique partout.
- **B2 — Réalisé dérivé du grand livre** (classe 6 postés, par `account_id`), jamais saisi à la main ni lu depuis `budget_expenses`.
- **B3 — Modèle 4 niveaux calculable** (Disponible = Voté − Engagé − Réalisé) ; l'engagé doit être matérialisé et relié à `budget_line_id`.
- **B4 — Engagement PUR = signature devis/OS/contrat** : palier **extra-comptable**, un engagement non exécuté **n'écrit JAMAIS** au grand livre (pas de compte d'engagement au plan comptable copro) ; il sort de l'agrégat engagé dès qu'il devient une charge (facture/exécution), sans double comptage.
- **B5 — La saisie manuelle enregistre une CHARGE, pas un engagement.** Elle sert à comptabiliser une **dépense déjà exécutée** sans passer par `supplier_invoices` (petite facture, note de frais) → elle **génère une écriture** (Débit charge 6x / Crédit 401) = du **réalisé**. Sans justificatif → prévient sans bloquer, mais l'écriture est créée. ⚠️ En base, `budget_expenses` requalifiée doit **distinguer deux natures de ligne** : *engagement* (aucune écriture) vs *charge directe* (génère l'écriture), sinon le même montant gonflerait engagé **et** réalisé.
- **B6 — Dépassement = avenant figé séparément** (initial gelé, alerte > seuil 10 % configurable).
- **B7 — Appels de provisions dérivés du voté** (4 × 25 %, **par clé de répartition**), un appel émis génère son écriture (provision 45/70 — rang 4).
- **B8 — Cotisation ALUR (art. 14-2-1)** : ≥ 5 % du budget prévisionnel **courant** sans PPT ; **+ ≥ 2,5 % du montant du PPT** si un plan pluriannuel est adopté. Solde du fonds = mouvements **postés** du compte 105.
- **B9 — Période active = exercice `open` + sélecteur** (jamais `CURRENT_DATE`).
- **B10 — Report N-1 → N** (pré-remplissage depuis le final voté N-1, à spécifier rang 6).
- **B11 — Décision d'AG → incrément auto** (budget voté → actif + appels), via `ag_pending_actions`/`activate_ag_decisions` (à fiabiliser rang 6).
- **B12 — Annexes dérivées du voté vs ledger** (annexes 2/3 courant, 4/5 travaux).

---

## 4. ÉTAT RÉEL EN BASE

| Règle | Statut | Détail |
|---|---|---|
| B1 Voté = validated/closed | **PARTIEL** | `v_budget_consumption_by_account` garde QUE `validated` (exclut `closed`) ; `fn_annexe_2` inclut `submitted` (à tort). 4 portes posent `validated`, seule `validate_budget` pose `validated_by/at`. Pas d'unicité DB du voté. |
| B2 Réalisé = ledger | **BUG** | `v_budgets_overview`/`v_budget_lines_overview` calculent le réalisé sur `budget_expenses` (orpheline). Le bon réalisé (`v_budget_consumption_by_account`) n'est pas branché à l'UI. |
| B3 Modèle 4 niveaux | **ABSENT** | Pas de couche engagé → Disponible non câblable. |
| B4 Engagement | **ABSENT** | `service_orders` (estimated/quoted/actual + `calculerEcart`) et `contracts.annual_amount` **sans `budget_line_id`** ; `planned_works.budget_line_id` nullable (0 lien). |
| B5 Saisie manuelle comptable | **ABSENT** | `budget_expenses` n'écrit rien au ledger (seul `tr_..._updated_at`). |
| B6 Dépassement figé + avenant | **PARTIEL** | `service_orders` porte estimated/quoted/actual (base correcte) mais sans lien budget ni historisation d'avenant ; `actual_amount` à la main. |
| B7 Appels dérivés du budget | **BUG** | DEUX générateurs divergents (par clé vs par tantièmes), appels en `draft` jamais émis, **aucune écriture ledger**. |
| B8 Fonds ALUR | **PARTIEL** | Solde = cotisation votée − `alur_transfers`, **hors ledger** (105 jamais touché) ; `v_alur_lot_contributions` sur dernier exercice. |
| B9 Période active | **PARTIEL** | `validate_budget` exige `open` (OK) ; mais `generate_calls_from_ag_payload` fallback `CURRENT_DATE`, `v_alur_lot_contributions` dernier exercice. |
| B10 Report N-1 | **ABSENT** | Aucun carry-forward ; `calculate_budget_projection` = extrapolation, pas un report. |
| B11 AG → budget actif | **PARTIEL** | Chaîne présente mais fragile : `create_budget_from_ag` court-circuite `submitted` ; `activate_ag_decisions` avale les erreurs (`EXCEPTION WHEN OTHERS`) → activation partielle. Statuts `pending_approval`/`rejected` orphelins. |
| B12 Annexes du ledger | **PARTIEL** | `fn_annexe_2` lit bien le ledger posté mais dépend de B2 (ledger vide tant que factures cassées) et inclut `submitted`. |

---

## 5. MAL IMPLÉMENTÉ / DETTE

- **P0 — Faux réalisé dans `v_budgets_overview`/`v_budget_lines_overview` (B2).** Réalisé calculé par LATERAL sur `budget_expenses` (ni `account_id` ni `ledger_tx_id`). C'est ce qui alimente l'UI (`useBudget`). *→ rebrancher sur `v_budget_consumption_by_account` ; `remaining` = voté − engagé − réalisé.*
- **P0 — `v_budget_consumption_by_account` sans `lt.status='posted'`.** Inclut des écritures `draft` → réalisé surestimé. *→ ajouter `AND lt.status='posted'`.*
- **P0 — Définition du « voté » inconsistante (B1).** `validated` seul (exclut `closed`) vs `validated`+`submitted`+`closed`. *→ partout `status IN ('validated','closed')`.*
- **P0 — Réalisé ledger structurellement vide (dépendance rang 1).** 3 edge functions facture/paiement cassées → ~4 écritures classe 6. **Même rebranché, le réalisé reste ~0 tant que non réparé : prérequis bloquant.**
- **P1 — Couche ENGAGÉ absente (B3/B4).** `service_orders`/`contracts`/`planned_works` sans `budget_line_id`. *→ requalifier `budget_expenses` en engagement + relier OS/contrats.*
- **P1 — `budget_expenses` n'écrit rien au ledger (B5).** *→ requalifier ; saisie manuelle prévient sans bloquer mais génère l'écriture.*
- **P1 — Deux générateurs d'appels divergents (B7).** Par clé (`budget_id=NULL`) vs par tantièmes (`budget_id` renseigné) ; appels `draft` jamais émis, aucune écriture. *→ un seul générateur, par clé, avec émission + pont ledger.*
- **P1 — Fonds ALUR hors compta (B8).** `alur_transfers` sans `ledger_tx_id` ; solde hors ledger ; `v_alur_lot_contributions` sur dernier exercice. *→ adosser au compte 105.*
- **P1 — `period_id` NOT NULL contredit par works/ALUR.** Branches `CREATE_WORK_BUDGET` insèrent sans `period_id`. *→ réconcilier le rattachement temporel.*
- **P2 — Pas de traçabilité du vote AG** (`validated` sans `validated_by/at`) ; **unicité du voté non garantie en base** (*→ index unique partiel `WHERE status='validated'`*).
- **P2 — Chaîne AG→copro fragile (B11, rang 6)** ; **anti-pattern `CURRENT_DATE`** (`generate_calls_from_ag_payload`, `v_alur_lot_contributions`).
- **P3 — Report N-1 absent ; statuts enum orphelins (`pending_approval`/`rejected`) ; `create_budget_from_ag_with_account_and_key` introuvable** (RPC fantôme à nettoyer).

---

## 6. SOURCES DIVERGENTES → source unique cible = LE GRAND LIVRE

| Concept | Aujourd'hui | CIBLE |
|---|---|---|
| Budget réalisé | overviews (`budget_expenses`) **vs** `v_budget_consumption_by_account`/`fn_annexe_2` (ledger) | `ledger_entries` 6xx **postés** via `v_budget_consumption_by_account` |
| Définition « voté » | `validated` seul **vs** `validated`+`submitted`+`closed` | `status IN ('validated','closed')` (submitted exclu) |
| Engagé | `contracts`/`service_orders`/`planned_works`/`budget_expenses` non reliés | `budget_expenses` requalifiée agrégeant contrats + OS, FK `supplier_invoice_id` |
| Disponible | `total_planned − validated_spent` | `Voté − Engagé − Réalisé` |
| Solde ALUR (105) | `v_alur_fund_summary` (votée − transferts) | `ledger_entries` compte **105** posté |
| Répartition appels | par `repartition_key_id` **vs** par tantièmes généraux | un seul générateur, **par clé de répartition** |
| Période | `open` / `CURRENT_DATE` / dernier exercice | exercice `open` + sélecteur |

---

## 7. QUESTIONS EXPERT OUVERTES

> **Déjà tranché (NON rouvert) :** modèle Voté/Engagé/Réalisé/Disponible ; réalisé = grand livre ; `budget_expenses` requalifiée en engagement + saisie manuelle ; engagement né à la signature devis/OS ; dépassement = fige + avenant ; voté = `validated`/`closed` ; période = `open` + sélecteur ; AG → incrément auto (rang 6) ; ALUR ≥ 5 % à clé propre.

> **Décisions actées (2026-05-30, avec l'expert) :**
> 1. **Exercice clos → snapshot FIGÉ.** Une fois les comptes approuvés en AG, le réalisé de l'exercice est gelé (annexe 2 approuvée = référence légale). Recalcul live **seulement** pour l'exercice ouvert. → `v_budget_consumption_by_account` inclut `closed` mais via snapshot ; la clôture fige les annexes.
> 2. **Appels de provisions → auto-générés en brouillon au vote, émis par le gestionnaire.** Le vote crée les 4 appels trimestriels en `draft` ; le gestionnaire les vérifie et les émet ; l'**écriture de provision** (classe 45/70) se passe à l'émission (rang 4). Prévient sans bloquer.
> 3. **Travaux urgents → statut dédié** « engagé par le syndic, ratification en attente ». Pouvoir d'agir = **art. 18 loi 65-557** ; la provision **≤ 1/3 du devis** sans vote préalable relève de l'**art. 37 décret 67-223** et ne vaut que pour l'**ouverture du chantier** (toute provision supplémentaire exige une décision d'AG, après consultation du CS). La charge peut entrer au grand livre **avant** ratification → cas légitime de **Réalisé > Voté** (l'invariant Voté ≥ Réalisé est un objectif de pilotage, pas une contrainte dure : afficher le dépassement en signal, pas en blocage).
> 4. **Rattachement temporel** : budget **courant = annuel** (rattaché à l'exercice) ; budget **travaux = par opération** (potentiellement **pluriannuel**, rattachement souple) ; **fonds ALUR = cagnotte permanente** (hors exercice). → résout l'incohérence `period_id` NOT NULL (à assouplir pour works/ALUR).
> 5. **Pont engagement↔charge → on crée le lien `providers ↔ suppliers`** (ou unification) pour réconcilier automatiquement engagé → facturé.
> 6. **Seuil de dépassement → global + configurable** par copro (option « par poste/budget » ultérieure).
