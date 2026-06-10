# Domaine 05 — Mutations / État daté / Vente de lots / Procédures juridiques

> Cartographie LIVE (project `iyfesbjnkpynmwlsmxnp`), lecture seule, 2026-06-04.
> Périmètre : `mutations`, `mutation_steps`, `etat_date_snapshots`, `legal_proceedings`, `dossiers`, `alur_transfers`.

## 0. Panorama & assignations

| Table | Cols | Lignes | RLS | Verdict d'appartenance |
|---|---|---|---|---|
| `mutations` | 20 | **1** (copro 11111111) | OFF | Cœur du domaine |
| `mutation_steps` | 9 | 0 | OFF | Cœur du domaine |
| `etat_date_snapshots` | 9 | **2** (copro 11111111) | OFF | Cœur du domaine |
| `legal_proceedings` | 14 | **1** (copro 22222222) | ON | Cœur du domaine (procédures juridiques) |
| `dossiers` | 10 | **12** (copro 11111111) | ON | **À RÉASSIGNER** — pas une table juridique : c'est un mini-kanban de tâches transverses (catégories FINANCE/AG/DOCUMENTS/MAINTENANCE). À traiter par l'agent transverse / domaine « tâches-gestion ». Aucune colonne juridique, aucun lien mutation. |
| `alur_transfers` | 11 | 0 | ON | **Rattaché au domaine Finance/ALUR** (transfert fonds travaux art.14-2). Pertinent ici uniquement parce qu'une mutation déclenche un transfert ALUR ; le redesign devrait le laisser au domaine Finance. Documenté ici pour mémoire. |

**Tables manquantes / attendues mais absentes** : pas de table `pre_etat_date` séparée (fusionnée dans `etat_date_snapshots` via `snapshot_type`), pas de table `notaires` (notaire stocké en texte libre sur `mutations`), pas de table de pièces/échanges notaire, pas de table d'événements/audiences pour `legal_proceedings` (procédure mono-ligne sans historique d'actes). Pas de table reliant `legal_proceedings` à un `lot_id`/débiteur (recouvrement non lot-centric — voir verdict).

---

## 1. STRUCTURE LIVE (table par table)

### 1.1 `mutations` — dossier de vente/transfert d'un lot

| # | Colonne | Type | Null | Défaut |
|---|---|---|---|---|
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | copro_id | uuid | NO | — |
| 3 | lot_id | uuid | NO | — |
| 4 | status | text | NO | 'draft' |
| 5 | mutation_type | text | NO | 'sale' |
| 6 | seller_owner_id | uuid | NO | — |
| 7 | buyer_owner_id | uuid | YES | — |
| 8 | buyer_name | text | YES | — |
| 9 | buyer_email | text | YES | — |
| 10 | buyer_is_company | boolean | YES | false |
| 11 | notary_name | text | YES | — |
| 12 | notary_email | text | YES | — |
| 13 | notary_reference | text | YES | — |
| 14 | requested_at | timestamptz | NO | now() |
| 15 | signature_date | date | YES | — |
| 16 | effective_date | date | YES | — |
| 17 | created_by | uuid | YES | — |
| 18 | notes | text | YES | — |
| 19 | created_at | timestamptz | NO | now() |
| 20 | updated_at | timestamptz | NO | now() |

- **PK** : `id`.
- **FK** : `copro_id→copros(id)` CASCADE · `lot_id→lots(id)` **RESTRICT** (bon : empêche suppression lot avec mutation) · `seller_owner_id→coproprietaires(id)` NO ACTION · `buyer_owner_id→coproprietaires(id)` NO ACTION · `created_by→profiles(id)` NO ACTION.
- **CHECK** : `mutation_type ∈ {sale, donation, succession, other}` · `status ∈ {draft, pre_etat_generated, etat_generated, signed, validated, cancelled}`.
- **Index** : `idx_mutations_copro_status (copro_id, status)` · `idx_mutations_seller (seller_owner_id)` · **`idx_mutations_active_lot` UNIQUE partiel sur `lot_id` WHERE status IN (draft, pre_etat_generated, etat_generated, signed)** → garantit une seule mutation active par lot (excellent garde-fou).
- **Triggers** : `mutations_updated_at` BEFORE UPDATE (`trg_mutations_updated_at`) · `tr_mutation_init_steps` AFTER INSERT (`initialize_mutation_steps`, crée les 6 steps).
- **Vues lectrices** : `v_etat_date_latest`, `v_mutation_detail`, `v_mutations_overview`.
- **RLS** : **DÉSACTIVÉ** mais 4 policies définies (select/insert/update/delete) → **DRIFT, voir verdict §3**.

### 1.2 `mutation_steps` — workflow en 6 étapes d'une mutation

| # | Colonne | Type | Null | Défaut |
|---|---|---|---|---|
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | copro_id | uuid | NO | — |
| 3 | mutation_id | uuid | NO | — |
| 4 | step_key | text | NO | — |
| 5 | status | text | NO | 'pending' |
| 6 | completed_at | timestamptz | YES | — |
| 7 | payload | jsonb | YES | '{}' |
| 8 | created_at | timestamptz | NO | now() |
| 9 | updated_at | timestamptz | NO | now() |

- **PK** : `id`. **UNIQUE** : `(mutation_id, step_key)`.
- **FK** : `copro_id→copros` CASCADE · `mutation_id→mutations(id)` CASCADE.
- **CHECK** : `status ∈ {pending, in_progress, completed, skipped}` · `step_key ∈ {demande, pre_etat_date, etat_date, envoi_notaire, signature_acte, cloture_compte}`.
- **Index** : `idx_mutation_steps_copro`, `idx_mutation_steps_mutation`, `idx_mutation_steps_status (mutation_id, status)`.
- **Triggers** : `tr_mutation_steps_updated_at` BEFORE UPDATE.
- **Vues** : `v_mutation_detail`.
- **RLS** : **DÉSACTIVÉ** + 4 policies définies → **DRIFT**.

### 1.3 `etat_date_snapshots` — pré-état daté & état daté (art.20 loi 65-557)

| # | Colonne | Type | Null | Défaut |
|---|---|---|---|---|
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | copro_id | uuid | NO | — |
| 3 | mutation_id | uuid | NO | — |
| 4 | snapshot_type | text | NO | — |
| 5 | generated_at | timestamptz | NO | now() |
| 6 | generated_by | uuid | YES | — |
| 7 | payload | jsonb | NO | — |
| 8 | document_id | uuid | YES | — |
| 9 | created_at | timestamptz | NO | now() |

- **PK** : `id`.
- **FK** : `copro_id→copros` CASCADE · `mutation_id→mutations(id)` CASCADE · `document_id→documents(id)` NO ACTION · `generated_by→profiles(id)` NO ACTION.
- **CHECK** : `snapshot_type ∈ {pre, final}`.
- **Index** : `idx_etat_date_snapshots_mutation (copro_id, mutation_id, snapshot_type)` (non unique → plusieurs snapshots du même type possibles, par design d'historisation).
- **Triggers** : aucun.
- **Vues** : `v_etat_date_latest`, `v_mutation_detail`, `v_mutations_overview`.
- **RLS** : **DÉSACTIVÉ** + 2 policies (select/insert) → **DRIFT**.

### 1.4 `legal_proceedings` — procédures juridiques / contentieux

| # | Colonne | Type | Null | Défaut |
|---|---|---|---|---|
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | copro_id | uuid | NO | — |
| 3 | title | text | NO | — |
| 4 | nature | text | NO | — |
| 5 | opposing_party | text | YES | — |
| 6 | amount_at_stake | numeric | YES | — |
| 7 | status | text | NO | 'pending' |
| 8 | start_date | date | YES | — |
| 9 | end_date | date | YES | — |
| 10 | court | text | YES | — |
| 11 | lawyer | text | YES | — |
| 12 | notes | text | YES | — |
| 13 | created_at | timestamptz | NO | now() |
| 14 | updated_at | timestamptz | NO | now() |

- **PK** : `id`. **FK** : `copro_id→copros` CASCADE uniquement.
- **CHECK** : `nature ∈ {litigation, recovery, other}` · `status ∈ {pending, in_progress, closed, won, lost}`.
- **Index** : `idx_legal_proceedings_copro`.
- **Triggers** : aucun trigger updated_at visible (la colonne existe mais aucun trigger ne la maintient → **bug latent**, updated_at restera figé).
- **Vues** : aucune.
- **RLS** : **ACTIVÉ**, 2 policies basées sur `memberships` (manage = admin/gestionnaire ; view = tout membre).

### 1.5 `dossiers` — (HORS DOMAINE, kanban de tâches) — voir §0

| # | Colonne | Type | Null | Défaut |
|---|---|---|---|---|
| 1 | id | text | NO | `'dossier-'||epoch||'-'||random` |
| 2 | titre | text | NO | — |
| 3 | description | text | YES | — |
| 4 | categorie | text | NO | — |
| 5 | statut | text | NO | 'A_FAIRE' |
| 6 | priorite | text | NO | 'NORMALE' |
| 7 | deadline | timestamptz | YES | — |
| 8 | copro_id | uuid | NO | — |
| 9 | created_at | timestamptz | NO | now() |
| 10 | updated_at | timestamptz | NO | now() |

- PK `id` (text). FK `copro_id→copros` CASCADE. CHECK `categorie ∈ {FINANCE,AG,DOCUMENTS,MAINTENANCE}` · `statut ∈ {A_FAIRE,EN_COURS,BLOQUE,TERMINE}` · `priorite ∈ {BASSE,NORMALE,HAUTE,URGENTE}`. Index copro/deadline/statut. Trigger `update_dossiers_updated_at`. RLS ON mais policies **`true`/`authenticated`** (aucun cloisonnement copro → faille). **Réassigné hors domaine juridique.**

### 1.6 `alur_transfers` — (rattaché Finance/ALUR) — voir §0

| # | Colonne | Type | Null | Défaut |
|---|---|---|---|---|
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | copro_id | uuid | NO | — |
| 3 | alur_budget_id | uuid | NO | — |
| 4 | amount | numeric | NO | — |
| 5 | transfer_date | date | NO | CURRENT_DATE |
| 6 | destination | enum `transfer_destination` | NO | — |
| 7 | destination_budget_id | uuid | YES | — |
| 8 | description | text | NO | — |
| 9 | resolution_ag_id | uuid | YES | — |
| 10 | created_by | uuid | YES | — |
| 11 | created_at | timestamptz | NO | now() |

- PK `id`. FK `copro_id→copros` CASCADE · `alur_budget_id→budgets` CASCADE · `destination_budget_id→budgets` SET NULL · `created_by→profiles`. CHECK `amount > 0`. Index copro/budget/date. RLS **ON** + policies propres (`user_has_copro_access` / `user_is_copro_manager`). Vues `v_alur_fund_summary`, `v_alur_transfers_history`. **Bien fait, à garder côté Finance.**

---

## 2. CONTRAT FONCTIONNEL

7 fonctions touchent le domaine. **Aucune** ne dessert `legal_proceedings` ni `dossiers` (CRUD direct via PostgREST + RLS). Tous les helpers métier sont `SECURITY DEFINER, search_path=public`.

| Fonction | Signature (args) | Sec | Lit | Écrit |
|---|---|---|---|---|
| `initialize_mutation_steps()` | trigger AFTER INSERT mutations | DEFINER | NEW (mutations) | INSERT `mutation_steps` ×6 (demande=completed, reste pending) |
| `upsert_mutation_step` | (p_mutation_id, p_step_key, p_status, p_payload) | DEFINER | `mutations.copro_id` | UPSERT `mutation_steps` (merge jsonb payload, gère completed_at) |
| `create_etat_date_snapshot` | (p_copro_id, p_mutation_id, p_snapshot_type) | DEFINER | `mutations`, `lots.ref` | appelle `generate_etat_date_payload` ; INSERT `etat_date_snapshots` ; INSERT `documents` (GED, category=`etat_date`) ; UPDATE `etat_date_snapshots.document_id` ; UPDATE `mutations.status` (pre→pre_etat_generated, final→etat_generated) |
| `generate_etat_date_payload` | (p_copro_id, p_mutation_id, p_snapshot_type) | DEFINER | `mutations`, `copros`, `lots`, `coproprietaires`, **`v_owner_statement_summary`**, **`ledger_entries`+`accounts` (105%)**, **`call_for_funds_lines`+`call_for_funds`**, **`v_owner_statement_lines`** | aucune écriture (pure lecture → jsonb art.20) |
| `validate_mutation` | (p_mutation_id, p_signature_date, p_buyer_owner_id, p_buyer_first_name, p_buyer_last_name, p_buyer_email, p_buyer_is_company, p_buyer_company_name) | DEFINER | `mutations` | INSERT `coproprietaires` (si nouvel acquéreur) ; UPDATE `lot_owners.end_date` (clôt vendeur) ; INSERT `lot_owners` (acquéreur, start_date) ; UPDATE `mutations` (status=validated, signature/effective_date, buyer_owner_id) |
| `trg_mutations_updated_at()` | trigger | INVOKER | — | NEW.updated_at |
| `update_mutation_steps_updated_at()` | trigger | DEFINER | — | NEW.updated_at |

**Chaîne canonique du domaine** : INSERT mutation → (trigger) 6 steps → `create_etat_date_snapshot('pre')` → `create_etat_date_snapshot('final')` → `validate_mutation` (transfert propriété). `upsert_mutation_step` pilote l'avancement kanban en parallèle.

**Contrat à honorer par le schéma cible** : l'état daté DÉPEND de 4 objets finance (`v_owner_statement_summary`, `v_owner_statement_lines`, `ledger_entries`/`accounts 105`, `call_for_funds*`). Ces contrats croisés doivent survivre au redesign sous peine de casser l'art.20.

---

## 3. VERDICT QUALITÉ : **À REPENSER**

Le module est **fonctionnellement riche et bien indexé** (workflow 6 étapes, snapshot art.20 conforme, garde-fou unicité mutation active/lot, FK lot_id RESTRICT), mais il présente **3 défauts bloquants** pour la prod et un **trou métier majeur**.

**Preuves / défauts concrets :**

1. **DRIFT RLS critique — sécurité béante.** `mutations`, `mutation_steps`, `etat_date_snapshots` ont **RLS DÉSACTIVÉ** alors que des policies complètes existent (`user_is_copro_manager`/`user_has_copro_access`). Les policies sont donc **inertes** : aujourd'hui n'importe quel rôle authentifié lit/écrit toutes les copros. Contradiction directe avec la décision « RLS activé partout + mutations accessibles GESTIONNAIRE uniquement ». → en cible : `ENABLE ROW LEVEL SECURITY` + `FORCE` sur ces 3 tables, policies déjà prêtes à réactiver.

2. **`validate_mutation` ne génère AUCUNE écriture au grand livre.** Elle transfère la propriété (`lot_owners`) mais ne clôture pas le compte du vendeur ni ne reporte/solde le 450 par lot. Viole « chaque opération génère une écriture » et l'étape de workflow `cloture_compte` n'est jamais matérialisée comptablement. L'état daté affiche un solde vendeur (impayés, fonds travaux ALUR) qui n'est jamais apuré ni transféré → incohérence entre le document légal produit et le grand livre. **C'est le défaut métier #1 à corriger dans le redesign.**

3. **`legal_proceedings` n'est pas lot-centric ni reliée au recouvrement.** `nature='recovery'` mais aucune FK vers `lot_id`/`coproprietaire_id`/écriture du GL ; `opposing_party` est du texte libre. Une procédure de recouvrement de charges devrait pointer le lot débiteur et la créance (450) concernée. De plus `updated_at` existe **sans trigger** pour la maintenir.

4. **Notaire dénormalisé en texte libre** (`notary_name/email/reference` sur `mutations`) — pas d'entité tiers notaire réutilisable ; idem `buyer_name/email` doublonnent `buyer_owner_id` (deux représentations de l'acquéreur, source d'incohérence avant validation).

5. **`dossiers` mal placée + RLS permissive `true`** (aucun cloisonnement copro) — à sortir du domaine et à sécuriser.

**Ce qui est BIEN FAIT (à conserver dans le redesign)** : index partiel d'unicité de mutation active par lot ; `snapshot_type ∈ {pre,final}` + historisation non-unique ; payload art.20 complet et juridiquement référencé ; FK CASCADE cohérentes + `lot_id` RESTRICT ; `alur_transfers` (policies propres, vues, CHECK amount>0).

---

## 4. CANDIDATS MORTS / DOUBLONS (à confirmer par l'agent transverse)

- **`mutation_steps`** : 0 ligne. Pas mort (alimentée par trigger sur futures mutations) mais **redondance partielle** avec `mutations.status` : les 6 `step_key` recouvrent largement les valeurs de `mutations.status`. À arbitrer : garder le kanban OU dériver l'avancement du status — pas les deux désynchronisés.
- **`alur_transfers`** : 0 ligne — vivante par design (déclenchée à la mutation/AG), à laisser au domaine Finance.
- **Colonnes potentiellement mortes sur `mutations`** : `buyer_name`, `buyer_email`, `buyer_is_company` font doublon avec `buyer_owner_id`/`coproprietaires` une fois l'acquéreur créé → candidates à suppression après normalisation.
- **`dossiers`** : à réassigner (hors domaine).
- Pas de table fantôme `pre_etat_date`/`notaires`/`ventes` détectée (bon, pas de doublon EN/FR ici).

---

## 5. MIGRATION (données à reprendre)

Seules **2 copros** portent des données réelles à migrer (le reste = 0 ligne ou copros de test).

| Table | Copro 22222222 (boucle d'or) | Copro 11111111 (immuable) | À reprendre ? |
|---|---|---|---|
| `mutations` | 0 | **1** | OUI (11111111) |
| `etat_date_snapshots` | 0 | **2** | OUI (11111111) — payload jsonb art.20 figé, immuable |
| `legal_proceedings` | **1** | 0 | OUI (22222222) |
| `mutation_steps` | 0 | 0 | rien (mais si la mutation 11111111 est reprise, ses 6 steps devront être régénérés/repris) |
| `alur_transfers` | 0 | 0 | rien |
| `dossiers` | 0 | 12 | hors domaine (à voir avec agent tâches) |

**Points d'attention migration :**
- Les 2 `etat_date_snapshots` de 11111111 sont des **documents légaux figés (art.20)** : reprendre le `payload` tel quel, conserver `generated_at`/`document_id` (lien GED). Ne pas régénérer (le solde financier de l'époque ne doit pas bouger).
- La mutation de 11111111 a probablement des `mutation_steps` orphelins à recréer si on garde le workflow (le trigger `initialize_mutation_steps` ne se déclenche qu'à l'INSERT).
- `legal_proceedings` de 22222222 : 1 ligne simple, reprise triviale ; en profiter pour ajouter le lien lot/créance manquant si la cible le normalise.
- **Décision cible suggérée** (à valider) : à la reprise, soit on régénère la chaîne mutation proprement avec écriture GL de clôture de compte (défaut #2), soit on reprend l'historique tel quel sur la copro immuable sans rejouer la compta.
