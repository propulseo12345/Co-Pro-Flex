# Cartographie domaine 01 — Copros / Immeubles / Lots / Tantièmes / Personnes

> Live `iyfesbjnkpynmwlsmxnp` (lecture seule), relevé du 2026-06-04.
> Périmètre : copros, buildings, lots, lot_owners, coproprietaires, repartition_keys, repartition_key_lines, memberships, profiles.
> **9 tables couvertes, 24 fonctions touchant le domaine, ~36 vues lectrices.**

---

## 0. Vue d'ensemble (counts réels & RLS)

| Table | Lignes réelles | RLS activé | Policies | Verdict vivant |
|---|---|---|---|---|
| copros | 12 | **NON** | 2 | vivant (2 utiles : 11111111, 22222222 ; 10 jetables) |
| buildings | 3 | **NON** | 2 | quasi-mort (3 lignes pour 12 copros, 45/66 lots sans building) |
| lots | 66 | **NON** | 2 | vivant |
| lot_owners | 66 | **NON** | 3 | vivant (1 seul end_date, 0 indivision) |
| coproprietaires | 58 | **NON** | 3 | vivant |
| repartition_keys | 35 | **NON** | 4 | vivant (modèle canonique des tantièmes) |
| repartition_key_lines | 233 | **NON** | 4 | vivant |
| memberships | 12 | **NON** | 5 | vivant |
| profiles | 5 | **NON** | 3 | vivant mais maigre |

> ⚠️ **RLS désactivé sur les 9 tables** (`pg_class.relrowsecurity = false`) alors que **24 policies existent et sont bien écrites**. En dev c'est volontaire (cf. mémoire) ; la cible prod doit **réactiver `ENABLE ROW LEVEL SECURITY` partout**. Les policies elles-mêmes sont saines (cf. §2 verdict).

---

## 1. STRUCTURE LIVE par table

### 1.1 `copros` (tenant racine, 12 lignes)
Colonnes : `id uuid PK (gen_random_uuid)`, `name text NOT NULL`, `address/city/postal_code text`, `siret text`, `num_immatriculation text`, `date_reglement text`, `created_at/updated_at timestamptz NOT NULL`, `buildings_count int (def 1)`, `lots_count int`, `total_tantiemes int`, `annee_construction text`, `exercice_debut text (def '01-01')`, `cabinet_id uuid`, `onboarding_step int2`, `onboarding_max_step int2`.
- PK : `(id)`. Aucune FK sortante (cabinet_id non contraint, cf. morts).
- Index : `copros_pkey`, `idx_copros_name`.
- Triggers : `on_copros_updated` (handle_updated_at) ; `tr_create_default_reminder_rules`, `tr_create_reminder_settings` (AFTER INSERT — relancent du domaine finance/relances).
- Policies : SELECT `user_has_copro_access(id)`, UPDATE `user_is_copro_manager(id)`. **Pas de policy INSERT/DELETE** (création via RPC service_role).
- ⚠️ Pas de colonne `id` lisible « courte » : numéros 11111111/22222222 sont des préfixes UUID.

**Défauts** : `lots_count`, `total_tantiemes` = **NULL sur 12/12** (jamais maintenus). `buildings_count` **faux** (11111111 dit 1 → 2 réels). `cabinet_id` **NULL 12/12**. `date_reglement`/`annee_construction`/`exercice_debut` typés **`text`** (devraient être `date`/`int`/format normalisé). `siret` non unique, non contraint.

### 1.2 `buildings` (3 lignes — quasi-mort)
`id PK`, `copro_id uuid NOT NULL FK→copros ON DELETE CASCADE`, `name text NOT NULL`, `address text`, `floors_count int (def 1)`, `construction_year int`, `created_at/updated_at`.
- Index `idx_buildings_copro_id`. Trigger `on_buildings_updated`.
- Policies SELECT (access) / ALL (manager). Lue par `v_logbook_overview`, `v_lots_with_owners`, `v_service_orders_overview`.
- **Défaut** : 3 buildings pour 12 copros ; **45/66 lots ont `building_id` NULL**. Concept présent mais non adopté. `lots.building_id` est `ON DELETE SET NULL` (OK).

### 1.3 `lots` (66 lignes — unité de gestion canonique)
`id PK`, `copro_id NOT NULL FK→copros CASCADE`, `building_id FK→buildings SET NULL`, `ref text NOT NULL`, `type lot_type (def appartement)`, `floor int`, `surface numeric`, `tantiemes_generaux int NOT NULL def 0`, `tantiemes_escalier/ascenseur/chauffage int def 0`, `description text`, timestamps.
- UNIQUE `(copro_id, ref)`. Index : copro_id, building_id, ref.
- Trigger `on_lots_updated`.
- Policies SELECT (access) / ALL (manager).
- enum `lot_type` = appartement, studio, commerce, bureau, cave, parking, garage, local_technique, autre.

**Défaut majeur (dénormalisation incohérente)** : les 4 colonnes `tantiemes_*` **doublonnent `repartition_keys`** et sont en partie mortes/incohérentes :
- `tantiemes_ascenseur` = 0 partout, `tantiemes_chauffage` = 0 partout → **colonnes mortes**.
- `tantiemes_escalier` non nul sur 10 lots (copro 11111111, sum=970) **alors qu'une `repartition_keys` "Ascenseur" subset existe en parallèle pour la même copro (sum=971, 11 lots)** → **deux sources concurrentes ET divergentes** (970≠971, libellé escalier vs ascenseur).
- `tantiemes_generaux` (sum 1029 sur 11111111) est **redondant** avec la key "Charges générales" (basis=tantiemes, sum 1029).
→ La source de vérité des quotes-parts est `repartition_key_lines`. Les `lots.tantiemes_*` sont du legacy à **supprimer** (au mieux garder `tantiemes_generaux` en commodité d'affichage, à trancher).

### 1.4 `lot_owners` (66 lignes — rattachement lot↔personne, historisé)
`id PK`, `lot_id NOT NULL FK→lots CASCADE`, `coproprietaire_id NOT NULL FK→coproprietaires CASCADE`, `copro_id NOT NULL FK→copros CASCADE`, `share_percent numeric def 100`, `is_primary bool def true`, `start_date date NOT NULL def CURRENT_DATE`, `end_date date`, `created_at`.
- UNIQUE `unique_active_ownership(lot_id, coproprietaire_id, start_date)`.
- Index riches : actif (`WHERE end_date IS NULL`), `(copro_id,end_date)`, `(coproprietaire_id,end_date)`, `(lot_id,end_date)`, `(coproprietaire_id,is_primary)`.
- Policies : SELECT manager + SELECT own (via coproprietaires.user_id) + ALL manager.
- Données : **0 ligne d'indivision** (share_percent ≠ 100), 0 `is_primary=false`, **1 seul end_date** → l'historisation et l'indivision sont **modélisées mais non exercées**. `copro_id` est dénormalisé (dérivable de lot_id) mais **utile** : sécurise les policies/index lot-centric et évite un JOIN. **À conserver** (avec trigger de cohérence — absent aujourd'hui).

### 1.5 `coproprietaires` (58 lignes — personne physique/morale)
`id PK`, `copro_id NOT NULL FK→copros CASCADE`, `user_id uuid FK→profiles SET NULL`, `is_company bool def false`, `company_name`, `civility`, `first_name`, `last_name`, `email`, `phone`, `mobile`, `address_line1/2`, `city`, `postal_code`, `country (def France)`, `prefers_email (def true)`, `prefers_paper (def false)`, `notes`, `is_resident (def true)`, timestamps.
- Index : copro_id, email, `(last_name,first_name)`, user_id.
- Policies : SELECT manager + SELECT own (`user_id = auth.uid()`) + ALL manager.
- **Défaut** : `user_id` **NULL 58/58** → le lien personne↔compte auth n'est **jamais établi** ⇒ toutes les policies « own » (ici, sur lot_owners, memberships) sont **inopérantes** côté copropriétaire. Le portail copropriétaire (mémoire : pas encore implémenté) en dépend. `email`/`phone` dupliquent partiellement `profiles` quand user_id sera lié.

### 1.6 `repartition_keys` (35 lignes — clés de charges, Art.10)
`id PK`, `copro_id NOT NULL FK→copros CASCADE`, `name NOT NULL`, `basis repartition_basis NOT NULL`, `description`, `is_active bool NOT NULL def true`, `created_at`, `coverage_mode coverage_mode NOT NULL def all_lots`, `category repartition_category`, `valid_from date def CURRENT_DATE`, `valid_to date`.
- UNIQUE `(copro_id, name)`. Index `(copro_id, is_active)`.
- enums : `repartition_basis` {tantiemes, surface, custom} ; `coverage_mode` {all_lots, subset} ; `repartition_category` {general, special, alur}.
- Policies CRUD complètes (4) : SELECT access, INSERT/UPDATE/DELETE manager.
- **Bien fait** : modèle propre, versionné (valid_from/to), couvre général/spécial/ALUR. `category` non nul en données (0 NULL). C'est **LE** modèle de tantièmes à garder.

### 1.7 `repartition_key_lines` (233 lignes — poids lot×clé)
`id PK`, `key_id NOT NULL FK→repartition_keys CASCADE`, `copro_id NOT NULL FK→copros CASCADE`, `lot_id NOT NULL FK→lots CASCADE`, `weight numeric NOT NULL CHECK(weight>=0)`, `created_at`.
- UNIQUE `(key_id, lot_id)`. Index copro, key.
- Policies CRUD complètes (4).
- **Bien fait** : c'est la table lot-centric des quotes-parts. `copro_id` dénormalisé mais justifié (RLS/index sans JOIN). CHECK weight>=0 présent. **Manque** : pas de trigger garantissant que `(key_id.copro_id = lot_id.copro_id = copro_id)`.

### 1.8 `memberships` (12 lignes — utilisateur↔copro↔rôle)
`id PK`, `user_id NOT NULL FK→profiles CASCADE`, `copro_id NOT NULL FK→copros CASCADE`, `role membership_role NOT NULL def coproprietaire`, `created_at`.
- UNIQUE `(user_id, copro_id)`. Index : copro_id, `(copro_id,role)`, role, `(user_id,copro_id)`, user_id.
- Policies (5) : SELECT manager + SELECT own + INSERT/UPDATE/DELETE manager.
- enum `membership_role` = admin, gestionnaire, membre_cs, coproprietaire, prestataire.
- **Bien fait pour l'autz gestionnaire.** C'est la table pivot de toutes les gardes. **Tension cible** : le brief demande 3 rôles (gestionnaire / copropriétaire / anon) ; l'enum en a 5. `prestataire` = 0 ligne, `membre_cs` = 1. `admin` et `gestionnaire` sont fusionnés dans `user_is_copro_manager`. À rationaliser (cf. verdict).

### 1.9 `profiles` (5 lignes — extension auth.users)
`id uuid PK FK→auth.users CASCADE`, `email`, `full_name`, `phone`, `avatar_url`, timestamps.
- Index `idx_profiles_email`. Trigger `on_profiles_updated`.
- Policies : SELECT own, UPDATE own, INSERT (`auth.uid()=id`).
- **Maigre mais sain.** 5 profils = comptes gestionnaires de test. Pas de rôle global ici (le rôle vit dans memberships, correct pour le multi-tenant).

---

## 2. CONTRAT FONCTIONNEL (24 fonctions touchant le domaine)

### Gardes d'autorisation (SECURITY DEFINER, search_path=public) — **contrat à honorer**
| Fonction | Sig. | Lit | Logique |
|---|---|---|---|
| `user_has_copro_access(p_copro_id)` | →bool | memberships | true si membership(user, copro) existe (tout rôle) |
| `user_is_copro_manager(p_copro_id)` | →bool | memberships | true si role ∈ {admin, gestionnaire} |
| `user_is_lot_owner(p_lot_id)` | →bool | lot_owners, coproprietaires | propriétaire actif du lot (via coproprietaires.user_id) |
| `user_is_lot_owner_in_copro(copro,lot)` | →bool | lot_owners, coproprietaires, lots | idem borné copro |
| `user_is_lot_owner_or_manager(copro,lot)` | →bool | (compose) | OR des deux |
| `user_owns_any_lot_in_copro(copro)` | →bool | lot_owners, coproprietaires | possède ≥1 lot actif |
| `get_user_lot_ids(copro)` | →uuid[] | lot_owners, coproprietaires | lots actifs de l'utilisateur (FIFO lot-centric) |

> Toutes lisent `auth.uid()`, renvoient FALSE si non authentifié → modèle session-user propre. **Dépendent toutes de `coproprietaires.user_id` (NULL 58/58)** pour le volet copropriétaire ⇒ contrat correct mais **données non câblées**.

### Domaine répartition / tantièmes
| Fonction | Lit/écrit | Rôle |
|---|---|---|
| `compute_repartition_shares(key_id)` | lit repartition_key_lines | renvoie (lot_id, weight, share_pct=weight/total*100 arrondi 4). **Cœur lot-centric.** |
| `repartition_key_is_complete(key_id)` | lit repartition_keys, repartition_key_lines, lots | all_lots ⇒ tous lots couverts ; subset ⇒ ≥1 ligne >0 |
| `resolve_lot_tiers_account(copro,nature)` | lit accounts | mappe nature→sous-compte 450-1..5 (current/works/advance/loan/alur). **Honore la règle ledger par nature** ; lève si compte manquant |

### Onboarding / dev / tenants
- `provision_copro_chart(copro)` →int : provisionne le plan comptable (écrit accounts).
- `get_default_copro_id()` →uuid : 1ʳᵉ copro par created_at (commodité dev).
- `ensure_dev_membership(copro)` : **DEV uniquement** — upsert membership role=admin, crée une copro minimale si aucune. À **retirer/garder hors prod**.
- `create_test_copro(_seeded)`, `create_clean_test_copro(_seeded)` : harnais jetable (clone boucle d'or). Hors schéma cible mais utiles en CI.

### Triggers du domaine
- `handle_updated_at` (sur copros, buildings, lots, coproprietaires, profiles) — sain.
- `create_default_reminder_rules` / `create_default_reminder_settings` (AFTER INSERT copros) — domaine relances.
- `enforce_lot_id_on_45x`, `check_budget_line_copro_consistency` — gardes finance (référencent lots/copros).
- `trg_ag_attendance_calc_tantiemes`, `rpc_get_ag_coproprietaires`, `get_correspondence_eligible_owners` — AG lit tantièmes/coproprietaires.

### Vues lectrices clés (le schéma cible doit les nourrir)
`v_lots_with_owners`, `v_coproprietaires_overview`, `v_copro_tantiemes`, `v_repartition_key_lines_detailed`, `v_repartition_key_totals`, `v_lot_balance`, `v_unpaid_by_lot`, `v_owner_statement_*`, `v_owner_financial_summary`, `v_alur_lot_contributions`, `v_call_lines_detailed`, `v_general_ledger` (lit lots+profiles), `v_council_members`, `v_mutations_overview/detail`, `v_etat_date_latest`. → **Confirme le contrat lot-centric** : tout solde personne se dérive en sommant ses lots.

---

## 3. VERDICT QUALITÉ : **BIEN FAIT, avec 1 dette structurelle à corriger**

Le cœur du domaine (lots / lot_owners / repartition_keys / repartition_key_lines / memberships) est **solidement conçu** : FK CASCADE cohérentes, UNIQUE pertinents, index lot-centric riches (partiels sur `end_date IS NULL`), historisation owners, gardes d'autz factorisées et propres, modèle de clés versionné couvrant général/spécial/ALUR, CHECK weight>=0. **Conforme aux principes lot-centric et ledger-par-nature.**

**Raison principale du « à retoucher » (pas « à repenser ») — une dette ciblée :**
1. **Double modélisation des tantièmes (incohérence avérée).** `lots.tantiemes_{generaux,escalier,ascenseur,chauffage}` coexistent avec `repartition_keys`. Preuve : copro 11111111 a `tantiemes_escalier` (Σ=970) ET une key "Ascenseur" subset (Σ=971) — valeurs **divergentes**, libellés différents. `tantiemes_generaux` (Σ=1029) double la key "Charges générales" (Σ=1029). `tantiemes_ascenseur`/`chauffage` = **0 partout (mortes)**. → **Supprimer les 4 colonnes** (ou ne garder `tantiemes_generaux` qu'en cache d'affichage explicite). Source unique = `repartition_key_lines`.

**Autres défauts (mineurs, à nettoyer dans la cible) :**
2. **Compteurs dénormalisés non maintenus** : `copros.lots_count`/`total_tantiemes` **NULL 12/12** (trompeurs), `buildings_count` **faux**. → Supprimer, dériver par vue (`v_copro_tantiemes` existe déjà).
3. **`copros.cabinet_id` NULL 12/12, non contraint (pas de FK)** : multi-tenant cabinet jamais branché → colonne morte, ou créer la table `cabinets` + FK si le cabinet entre dans le scope.
4. **`coproprietaires.user_id` NULL 58/58** : lien personne↔auth jamais établi ⇒ toutes les policies « own » dormantes. À câbler avant d'activer le portail copropriétaire/anon.
5. **Typages texte au lieu de typés** : `copros.date_reglement` (text), `annee_construction` (text), `exercice_debut` (text). → `date`/`int`.
6. **RLS désactivé partout** (volontaire en dev) : la cible prod doit l'activer ; les policies sont déjà bonnes.
7. **`buildings` quasi-mort** (45/66 lots sans building) : garder le concept mais le rendre optionnel-assumé, ou peupler.
8. **Contraintes d'intégrité métier manquantes** : aucun trigger ne vérifie que `repartition_key_lines.copro_id = key.copro_id = lot.copro_id`, ni que `lot_owners.copro_id = lot.copro_id` ; aucune garantie « 1 seul propriétaire actif primaire à 100% par lot » (modèle indivision ouvert mais non contraint).
9. **enum `membership_role` (5 valeurs) vs cible 3 rôles** : `prestataire`=0, `membre_cs`=1, `admin`≈`gestionnaire`. Rationaliser vers gestionnaire/copropriétaire (+ membre_cs traité comme attribut conseil, pas comme rôle d'accès).

---

## 4. CANDIDATS MORTS / DOUBLONS (à confirmer par l'agent transverse)

| Objet | Statut | Preuve |
|---|---|---|
| `lots.tantiemes_ascenseur` | **MORT** | 0 non nul / 66 |
| `lots.tantiemes_chauffage` | **MORT** | 0 non nul / 66 |
| `lots.tantiemes_escalier` | **DOUBLON incohérent** | doublonne key "Ascenseur" 11111111, Σ divergente |
| `lots.tantiemes_generaux` | **DOUBLON** | = key "Charges générales" (à garder seulement si cache assumé) |
| `copros.lots_count` | **MORT** | NULL 12/12 |
| `copros.total_tantiemes` | **MORT** | NULL 12/12 |
| `copros.buildings_count` | **FAUX/MORT** | incohérent (11111111 : 1 vs 2 réels) |
| `copros.cabinet_id` | **MORT** | NULL 12/12, pas de FK |
| `coproprietaires.user_id` | **NON CÂBLÉ** | NULL 58/58 (à garder, mais à brancher) |
| enum `membership_role.prestataire` | **NON UTILISÉ** | 0 ligne |
| `ensure_dev_membership`, `get_default_copro_id` | **DEV-only** | à exclure de la cible prod |
| 10 copros « Residence Test » / « HARNESS … » / « MArtin myster » | **JETABLES** | données de test, non migrées |

---

## 5. MIGRATION (données à reprendre : 22222222 + 11111111 uniquement)

À migrer tel quel (le reste = test jetable) :
- **copros** : 2 lignes (11111111 « Résidence Les Jardins d'Émeraude », 22222222 « Le Clos Saint-Michel »). Recalculer `buildings_count` ; **ne pas reprendre** `lots_count`/`total_tantiemes` (dérivés) ni `cabinet_id`. Normaliser `exercice_debut`/`annee_construction`/`date_reglement` en types corrects.
- **buildings** : 2 (copro 11111111) + 1 (22222222) — réassigner les `lots.building_id` manquants si le concept est conservé.
- **lots** : 15 (11111111) + 6 (22222222) = 21 lots. **Ne PAS migrer `tantiemes_escalier/ascenseur/chauffage`** ; migrer la quote-part via `repartition_key_lines`. `tantiemes_generaux` : à reporter dans la key "Charges générales" (déjà présent), pas comme colonne.
- **repartition_keys** : 4 par copro (Charges générales/general, Ascenseur/special-subset, Eau froide/special-surface, Fonds travaux ALUR/alur) = 8 clés. **C'est la source de vérité des tantièmes — migration prioritaire.**
- **repartition_key_lines** : 11111111 (15+11+15+15=56) + 22222222 (6×4=24) ≈ 80 lignes. Reprendre intégralement (poids = quotes-parts légales).
- **coproprietaires** : les personnes rattachées aux 21 lots (sous-ensemble des 58). `user_id` restera NULL tant que le portail n'est pas câblé.
- **lot_owners** : rattachements actifs des 21 lots (+ l'unique ligne end_date si elle concerne ces copros). Recréer `copro_id` cohérent.
- **memberships** : le gestionnaire/admin des 2 copros (parmi 12 lignes).
- **profiles** : les comptes auth liés à ces memberships (parmi 5).

**Invariants à re-vérifier après migration** : Σ weight de chaque key all_lots = total tantièmes attendu (1029 pour 11111111, 1000 pour 22222222) ; chaque lot couvert par les keys all_lots ; `repartition_key_is_complete` = true sur les 8 clés ; aucune divergence escalier/ascenseur (la dette legacy ne doit pas être reportée).
