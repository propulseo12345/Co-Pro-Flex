# 05 — Tantièmes & clés de répartition des charges

> **Statut : BROUILLON** — Audit logique métier CoProFlex, RANG 5 — Date : 2026-05-30
> Périmètre : art. 10 loi 65-557 (charges générales selon tantièmes / charges spéciales selon utilité), art. 11 & 25 b (modification), art. 14-2-1 (fonds travaux ALUR).
> Source de vérité financière : **grand livre** (`ledger_transactions` + `ledger_entries`, `status='posted'`). Les clés ne *calculent pas* les soldes : elles **ventilent par lot** les montants qui se matérialisent ensuite en écritures.
> Posture : double lecture **dev fullstack senior** (intégrité schéma, ponts amont/aval, perf) + **expert syndic** (droit copro, plan comptable, terrain).

---

## 1. Identité (périmètre rang 5)

Le rang 5 régit **comment un montant global est éclaté entre les lots**. Trois familles de clés cohabitent, conformément à l'art. 10 :

- **Tantièmes généraux** (charges générales : conservation, entretien, administration des parties communes) → répartition proportionnelle à la valeur relative de chaque lot. Une seule clé « générale » par copropriété, base fixe (1000 ou 10000).
- **Clés spéciales** (services collectifs + éléments d'équipement : ascenseur, eau, chauffage…) → répartition selon **l'utilité objective** du service pour chaque lot. Un lot non bénéficiaire a un poids 0 (ou est exclu). Couverture partielle légitime (`coverage_mode='subset'`).
- **Clé ALUR** (art. 14-2-1) → fonds travaux obligatoire, assiette ≥ 5 % du budget courant (+ ≥ 2,5 % du PPT si adopté), routée vers un sous-compte tiers dédié.

Ces trois familles sont **toutes stockées dans la même table `repartition_keys`**, sans colonne de catégorie. La distinction est aujourd'hui *implicite* (nom textuel + heuristique `coverage_mode`) — c'est la dette structurante de ce rang.

---

## 2. Modèle de données + source de vérité

### 2.1 Tables cœur
**`repartition_keys`** : `id` · `copro_id` · `name` · `basis` enum `repartition_basis` · `description` · `is_active` (def true) · `created_at` · `coverage_mode` enum (def `all_lots`).
Contraintes : PK, **UNIQUE(`copro_id`,`name`)**. **Absentes** : `period_id`, `valid_from/to`, `version`, `category`/`is_alur`, `expected_total_weight`.

**`repartition_key_lines`** : `id` · `key_id` (FK → `repartition_keys` **ON DELETE CASCADE**) · `copro_id` · `lot_id` (FK → `lots` **ON DELETE CASCADE**) · `weight` numeric · `created_at`.
Contraintes : PK, **UNIQUE(`key_id`,`lot_id`)**, **CHECK(`weight >= 0`)**. **Absents** : `updated_at`, table d'historique, contrainte sur la somme des poids.

**`lots`** : `tantiemes_generaux` int + `tantiemes_escalier`/`tantiemes_ascenseur`/`tantiemes_chauffage` (def 0). **Colonnes dénormalisées non synchronisées** avec `repartition_key_lines.weight`.

### 2.2 Enums (vérifiés `pg_type`/`pg_enum`)
- `repartition_basis` = {`tantiemes`, `surface`, `custom`}
- `coverage_mode` = {`all_lots`, `subset`}
- `budget_type` = {`current`, `works`, `alur`}

### 2.3 Vues & fonction
- **`v_repartition_key_totals`** : `lots_with_weight_count`, `lots_count`, `total_weight`, `is_complete`. Correcte, mais ne valide ni la base attendue ni l'assiette ALUR.
- **`v_repartition_key_lines_detailed`** : ajoute `share_pct`.
- **`compute_repartition_shares(p_key_id)`** : protège la division par zéro.

### 2.4 Ponts amont/aval
- `budget_lines.repartition_key_id` → **NOT NULL** (53/53 renseignés). `call_for_funds.repartition_key_id` → **NOT NULL**. `supplier_invoice_lines.repartition_key_id` → **NULLABLE** (1 seule clé pointée).
- **`call_for_funds_lines`** : **PAS de `repartition_key_id` ni de `weight`** (traçabilité ligne→clé par jointure via l'en-tête seulement).
- FK des clés référencées en **NO ACTION** → suppression d'une clé utilisée bloquée nativement (protection PG).

### 2.5 Chemin du montant (rang 5 → grand livre)
`budget_lines`/AG → `generate_call_for_funds` (ou `generate_combined_calls_from_ag`) → lit `repartition_key_lines.weight` → ventile `amount_due = round(total * weight / Σweight, 2)` → `call_for_funds_lines` + écritures 450/701. **C'est ici que la clé matérialise la dette de chaque lot.**

---

## 3. Règles métier + loi

| Règle | Fondement | Traduction schéma attendue |
|---|---|---|
| Charges générales = tantièmes, base fixe (1000/10000) | art. 10 al. 1 | `basis='tantiemes'`, `coverage_mode='all_lots'`, `Σweight = base` |
| Charges spéciales = utilité objective, lot non bénéficiaire = poids 0 | art. 10 al. 2 | `coverage_mode='subset'`, ligne `weight=0` ou absente |
| Modifier la clé **générale** = unanimité | art. 11 | gating AG + versioning |
| Adapter une clé **spéciale** = art. 25 b | art. 25 b | gating AG + versioning |
| Ne jamais réécrire un exercice clos | décret 2005-240 | historisation/versioning par exercice |
| ALUR : clé propre, assiette ≥ 5 % budget courant (+2,5 % PPT) | art. 14-2-1 | clé identifiable + contrôle assiette |
| 1 nature de charge ↔ 1 nature de clé ↔ 1 sous-compte 450 | décision actée | routage `budget_type → 450-x` |

**Sous-comptes 450 existants en base** : `450-1` Budget courant · `450-2` Travaux art. 14-2 · `450-3` Avances · `450-4` Emprunts · `450-5` ALUR. Plan comptable **prêt**, mais routage **non câblé** (cf. §5 D5-04).

---

## 4. État réel en base (preuves)

### 4.1 Inventaire des clés (5 copros, ~31 lots, ~85 lignes)

| copro | clé | basis | coverage | lignes | total_weight | lots copro | complète ? |
|---|---|---|---|---|---|---|---|
| 11111111 | Fonds travaux ALUR | tantiemes | all_lots | **0** | **0** | 16 | ❌ orpheline |
| 11111111 | Charges générales | tantiemes | all_lots | 15 | 1029 | 16 | ❌ 1 lot manquant |
| 11111111 | Eau froide | surface | all_lots | 15 | 796.50 | 16 | ❌ 1 lot manquant |
| 11111111 | Ascenseur | custom | subset | 11 | 971 | 16 | ✅ (subset) |
| 11111111 | Test | tantiemes | all_lots | 16 | 1473 | 16 | ✅ (base aberrante) |
| 22222222 | Ascenseur | custom | subset | 6 | 1000 | 6 | ✅ |
| 22222222 | Eau froide | surface | all_lots | 6 | 305.00 | 6 | ✅ |
| 22222222 | Fonds travaux ALUR | tantiemes | all_lots | 6 | 1000 | 6 | ✅ |
| 22222222 | Charges générales | tantiemes | all_lots | 6 | 1000 | 6 | ✅ |
| fd415d71 | Charges générales | tantiemes | all_lots | 4 | 1000 | 4 | ✅ |
| fd415d71 | Test | custom | subset | 4 | 1000 (1 ligne weight=0) | 4 | ✅ |
| 2e34114… | Charges générales | tantiemes | all_lots | 1 | 124 | 4 | ❌ 3 lots manquants |

### 4.2 Élucidation de l'écart « 17 lignes / 1 lot »
L'observation initiale portait sur **un sous-ensemble** de la base dev. Réel : **5 copros (~31 lots, ~85 lignes)**, pas de lignes orphelines (FK `lot_id` ON DELETE CASCADE). **L'écart grave est ailleurs** : clé ALUR copro 11111111 à **0 ligne**, deux clés `all_lots` à **15/16** (lot manquant `3a47563c…`), une à **1/4**, et des **bases aberrantes** (1029, 1473, 124). Données de test (`Test`) mêlées au réel.

### 4.3 Intégrité CONFIRMÉE (socle sain)
- Enums correctement typés (`typtype='e'`) — le constat « basis = text » est **réfuté**.
- `UNIQUE(copro_id,name)` ; `CHECK(weight >= 0)` (weight 0 conforme art. 10 al. 2) ; FK CASCADE (pas d'orphelins).
- Suppression d'une clé utilisée **bloquée** par les FK NO ACTION (les « triggers noaction » sont ce comportement PG par défaut).
- `compute_repartition_shares` protège la division par zéro.

### 4.4 Edge function (vérifiée)
`generate_call_for_funds` : garde `lines.length===0 → 400 "No lots found"` (la clé ALUR orpheline échoue **proprement**, pas de division par zéro — mais sans message métier). Routage comptable : `acc450 = accounts.find(a => a.code === '450')` → **toujours le compte parent générique, jamais 450-1/450-2/450-5**.

---

## 5. Mal implémenté / dette (P0-P3)

### P0 — bloquants

**[D5-01] Clé ALUR active mais vide (orpheline) — copro 11111111.** `id=4a1e46ba`, `is_active=true`, `coverage_mode='all_lots'`, 0 ligne / poids 0, 16 lots. Le fonds travaux ALUR (obligatoire art. 14-2-1) ne peut pas être appelé (« No lots found »), état daté faussé.
→ Peupler 16 lignes (poids = tantièmes généraux) OU `is_active=false` tant qu'incomplète ; **bloquer `is_active=true` si `is_complete=false`** ; vérifier le vote ALUR en AG.

**[D5-02] Aucun versioning/historisation des clés.** Ni `period_id`/`valid_from`/`valid_to`/`version`, ni `updated_at`, ni table d'historique. Modification in-place (UPDATE) → **réécrit rétroactivement** la base de ventilation des exercices clos. Viole l'immutabilité comptable (décret 2005-240) et l'opposabilité AG (art. 11/25 b). Couplé au FK NO ACTION, la seule voie de modif d'une clé utilisée est l'UPDATE destructeur.
→ `valid_from`/`valid_to` + `version` (ou table `repartition_keys_history`) ; `call_for_funds` résout la version active à `issue_date` ; figer les clés des exercices clos.

### P1 — majeurs

**[D5-03]** `call_for_funds_lines` sans `repartition_key_id` → traçabilité clé→ligne opaque. → ajouter `repartition_key_id` (+ idéalement `weight_snapshot`) avec CHECK de cohérence avec l'en-tête.
**[D5-04 = D-05]** Routage 450 **générique** : `acc450 = code '450'`, les sous-comptes 450-1/2/5 jamais utilisés ; `call_for_funds.budget_id` souvent NULL. → router `budget_type → 450-x` (`current→450-1`, `works→450-2`, `alur→450-5`) ; exploiter/obliger `budget_id` ou ajouter `call_for_funds.budget_type` ; synchroniser les 2 générateurs.
**[D5-05]** Clés `all_lots` incomplètes (15/16, 1/4) **ventilées silencieusement** : `generate_call_for_funds` ne consulte jamais `is_complete` (seul garde-fou `lines.length>0`). → rejeter si `is_complete=false` pour `all_lots`, côté fonction ET UI.
**[D5-06]** Pas de **catégorie** formelle (générale/spéciale/ALUR), distinguée par le seul `name`. → enum `category {general, special, alur}` (+ CHECK cohérence) ; pré-requis du routage 450 et des contrôles ALUR.
**[D5-07]** Aucun contrôle d'**assiette ALUR** (≥ 5 % courant, ≥ 2,5 % PPT) ; pas de `budgets.ppt_adopte` ; le 5 % est hard-codé front. → `budgets.ppt_adopte` + vue d'assiette + validation avant adoption du budget ALUR.
**[D5-08]** RLS : `repartition_keys_update_policy = user_is_copro_manager` seul → un gestionnaire peut modifier une clé **sans gating AG ni exercice ouvert** (viole art. 24/25, touche un exercice clos). → conditionner l'UPDATE à une résolution AG + exercice ouvert (dépend de D5-02/D5-14).
**[D5-09]** Aucun processus de **régularisation/ventilation des charges 6xx par lot** (la facture écrit 6xx/401 sans 450-x par lot ; `supplier_invoice_lines.lot_id` absent). → edge fn/RPC de ventilation 6xx via la clé (Débit 450-x par lot / Crédit 6xx) ; définir le moment (facture vs fin de période). Complète la D-05.

### P2 — importants
**[D5-10]** Totaux de poids non normalisés (124, 305, 796.50, 971, 1029, 1473…) ; pas de base attendue. → `expected_total_weight` + CHECK/trigger ; convention `surface`.
**[D5-11]** Double source `lots.tantiemes_*` vs `repartition_key_lines.weight` (Ascenseur : `tantiemes_ascenseur=0` mais weights réels). → source unique = `repartition_key_lines` ; supprimer/vue de compat ; éventuel trigger de synchro pour `tantiemes_generaux`.
**[D5-12]** `v_repartition_key_totals.is_complete` ne couvre ni base attendue ni assiette ALUR (dépend D5-06/07/10).
**[D5-13]** Deux générateurs d'appels parallèles aux sémantiques divergentes (`generate_call_for_funds` edge vs `generate_combined_calls_from_ag` PL/pgSQL ; aucun ne route 450-x). → documenter le primaire, aligner, ou déprécier.
**[D5-14]** Lien AG↔clé implicite (payload JSON) : `ag_resolutions` sans `linked_repartition_key_id`, `ag_pending_actions` sans `action_type` dédié. → ajouter le lien + type d'action traité par `activate_ag_decisions`.

### P3 — mineurs
**[D5-15]** `CreateKeyModal` (front) n'expose pas `basis=surface` (enum l'a) — à confirmer côté repo.
**[D5-16]** Arrondi cumulatif de ventilation **non absorbé sur le dernier lot** dans l'edge function (contrairement à `generate_combined_calls_from_ag`) → écart possible de centimes vs `total_amount`. À harmoniser (tolérance 0.01 du trigger).

> *Écartés par la vérif :* « basis = text » (enums OK) ; « lignes orphelines » (FK CASCADE) ; un cas commerce/ascenseur (M7, non reproduit en base).

---

## 6. Sources divergentes → source unique

| Sujet | Sources concurrentes | Source unique cible |
|---|---|---|
| Poids de répartition par lot | `repartition_key_lines.weight` **vs** `lots.tantiemes_*` | `repartition_key_lines.weight` (D5-11) |
| Solde par lot | calcul par clé **vs** grand livre | **grand livre** (`v_lot_balance`, ledger postée) — déjà conforme |
| Nature de la dette (courant/travaux/ALUR) | nom de clé (texte) **vs** `budget_type` **vs** sous-compte 450 | `category` de clé ⇒ `budget_type` ⇒ `450-x` (D5-04/06) |
| Complétude d'une clé | `lines.length` (edge fn) **vs** `is_complete` (vue) | `is_complete` (D5-05) |
| Seuil ALUR | hard-code front 5 % **vs** règle légale | colonne/vue d'assiette en base (D5-07) |
| Version de clé d'un appel | clé in-place mutable | version datée/historisée (D5-02) |

**Principe** : la clé est un *instrument de ventilation*, pas une source de solde. Le solde vit dans le grand livre ; la clé doit être **figée par exercice** au moment où elle produit des écritures.

---

## 7. Questions expert (à trancher)

1. **Versioning** : modification de poids votée en AG → nouvelle clé par exercice (`period_id`) ou historisation (`valid_from/to`) ? (aucune colonne de version aujourd'hui).
2. **Exercice clos** : une clé utilisée par des appels postés peut-elle être modifiée l'exercice suivant ? Interdiction totale si exercice clos ?
3. **ALUR copro 11111111** : fonds travaux voté en AG ? Si oui, peupler les 16 lignes (poids = tantièmes généraux) ou désactiver la clé orpheline ?
4. **Assiette ALUR** : où stocker « PPT adopté » (budgets ? AG ?) ? Le 5 % hard-codé front doit passer en base.
5. **Base de normalisation** : base attendue (1000 ? 10000 ?) fixe par copro ? Pour `surface`, Σpoids = Σsurfaces (habitable seul, ou parties communes incluses) ?
6. **Charges spéciales** : pour chaque clé (ascenseur, eau, chauffage, escalier), lots inclus/exclus ? Lot non bénéficiaire = ligne `weight=0` (exclu explicite) ou absence de ligne (manquant) ?
7. **Source des poids** : `lots.tantiemes_*` = valeurs historiques délibérées ou caches redondants à supprimer au profit de `repartition_key_lines` ?
8. **Synchronisation** : modifier `lots.tantiemes_generaux` doit-il propager vers la clé « Charges générales », ou notions distinctes ?
9. **Routage 450** : nature → sous-compte via colonne `category`, table de mapping, ou `budget_type` ? Quel 450 par défaut pour un appel d'ajustement sans `budget_id` ?
10. **Régularisation 6xx** : quand (facture / trimestriel / fin d'exercice) et par qui (auto/syndic) ventile-t-on les charges réelles par lot ?
11. **Validation appel** : interdire la génération sur clé incomplète (`is_complete=false`), ou tolérer une ventilation partielle ?
12. **Gating AG / RLS** : modifier une clé réservé au syndic sur résolution AG approuvée, ou gestionnaire libre comme aujourd'hui ?
13. **Arrondi** : poids décimaux acceptés (8.00, 65.50) ? Garantir Σ`amount_due` = `total_amount` au centime (résidu sur le dernier lot) ?

---

## 8. Vue d'ensemble & impacts transverses (dev fullstack + syndic)

### 8.1 Place du rang 5 dans la chaîne
`lots` (valeur, rang 3) → **clés (rang 5)** → `budget_lines.repartition_key_id` (rang 3) → appels (rang 4) → **ventilation par lot** `call_for_funds_lines` → **écritures 450-x / 701** → soldes `v_lot_balance`/`v_owner_balance` → **état daté** (rang 7). La clé est le **point de bascule du collectif vers l'individuel** : si elle est fausse ou incomplète, tout l'aval l'est.

### 8.2 Ce que la dette du rang 5 bloque en aval
- **Rang 4 (D-05)** : la ventilation N écritures 450 *par lot et par sous-compte 450-x* est impossible tant que la clé n'a pas de `category`/routage (D5-06) et que l'edge fn tape le 450 générique (D5-04). **La D-05 dépend directement de l'intégrité auditée ici.**
- **Régularisation 6xx (D5-09)** : sans elle, « budget réalisé = classe 6 » n'est jamais éclaté par lot → comparaison budget/réalisé par lot aveugle.
- **État daté** : un solde par lot fiable suppose des écritures 450 ventilées par la bonne clé, à la bonne version (D5-02). Clé orpheline (D5-01) ou incomplète (D5-05) ⇒ état daté partiel.
- **Conformité légale** : sans versioning ni gating AG (D5-02, D5-08), toute modif de clé est non opposable et corrompt les exercices clos.

### 8.3 Arbitrages d'architecture
1. **Versioning** : « nouvelle clé par exercice » (simple, duplique) vs `valid_from/to` + historique (compact, résolution temporelle par appel). Reco : `valid_from/to` + historique, résolution à `issue_date`. **Pré-requis P0** qui débloque le gating AG et l'immutabilité.
2. **lot_id vs owner** : conforme — la clé est portée par le **lot** (`repartition_key_lines.lot_id`), pas le copropriétaire. Une mutation (rang 7) ne touche pas les poids (art. 10).
3. **Source unique des poids** : abandonner `lots.tantiemes_*` au profit de `repartition_key_lines` (D5-11), vue de compat pour ne pas casser le front.
4. **Catégorisation + routage** : `category` de clé est la pièce manquante reliant le métier (générale/spéciale/ALUR), le comptable (450-1/2/5) et le budgétaire (`budget_type`). **Nœud** dont dépendent D5-04, D5-07, D5-12.

### 8.4 Priorisation
P0 (D5-01 ALUR orpheline, D5-02 versioning) → conformité + appel ALUR. P1 routage/complétude/traçabilité (D5-03→09) → débloquent la D-05 et l'état daté par nature. P2/P3 → robustesse et hygiène. **À traiter dans le même lot de correction que les P0 du rang 4** (chemin commun clé → ventilation → 450-x).
