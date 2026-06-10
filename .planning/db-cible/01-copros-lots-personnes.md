# Domaine 01 — Copros / Immeubles / Lots / Tantièmes / Personnes — **SCHÉMA CIBLE (blueprint)**

> Conçu 2026-06-04. Forme idéale (PAS une photo du live). Socle **lot-centric** dont dépendent TOUS les autres domaines (FK `lots`, `coproprietaires`, `profiles`, `accounting_periods`…).
> Source des faits : cartographie `_cartographie/01-copros-lots-personnes.md` + `ENUMS.md` + `AUTORISATION.md` + **vérifications live lecture seule** (project `iyfesbjnkpynmwlsmxnp`, 2026-06-04).
> **A1 (décision USER) : PAS de reprise des données du live.** On construit une **COPRO-TEMPLATE propre de A à Z** (nouvelle référence test/démo qui remplace la boucle d'or). Le **schéma fait foi**, pas l'historique. La « carte de migration » (§6) devient donc un **plan de seed du template** (volumes cibles, pas une copie). Les 2 copros live ne sont **plus migrées**.
> **MULTI-CABINET (décision USER, posée dès la cible).** On ajoute une **couche de tenance** au-dessus de la copro : la table **`cabinets`** (organisation syndic) chapeaute N copros. `copros.cabinet_id` devient **FK NOT NULL → cabinets** (A12 corrige A1-historique : la colonne n'est plus droppée, elle est **branchée**). Le cloisonnement « un gestionnaire ne voit que les copros de SON cabinet » est **centralisé dans les helpers** `user_has_copro_access`/`user_is_copro_manager` (AUTORISATION §1/§4) — les policies de domaine n'ont pas à gérer le cabinet. Les **écrans** de gestion de cabinet (CRUD, invitation gestionnaires) sont **différés** (finance d'abord) ; seule la **couche schéma + RLS** est posée maintenant.

---

## 0. Périmètre du domaine cible

| Table cible | Rôle | Provenance live | Décision |
|---|---|---|---|
| `cabinets` | **Tenant racine (organisation syndic)** chapeautant N copros | *(absente du live)* | **AJOUTÉE** (couche de tenance multi-cabinet, §1.0) |
| `copros` | La copropriété (sous un cabinet) | `copros` (refondue) | **REFONTE + purge compteurs morts + typage + `cabinet_id` FK NOT NULL** |
| `buildings` | Bâtiment d'une copro (optionnel assumé) | `buildings` | **GARDÉE** (concept optionnel, peuplée si conservé) |
| `lots` | **Unité de gestion canonique** | `lots` (refondue) | **REPRISE − DROP des 4 `tantiemes_*`** |
| `lot_owners` | Rattachement lot↔personne, historisé | `lot_owners` | **REPRISE + triggers d'intégrité + unicité primaire** |
| `coproprietaires` | Personne physique/morale | `coproprietaires` | **REPRISE** (`user_id` câblable, cf. AUTORISATION §3) |
| `repartition_keys` | Clés de charges (Art.10) — versionnées | `repartition_keys` | **REPRISE telle quelle (modèle canonique)** |
| `repartition_key_lines` | Poids lot×clé — **source unique des quotes-parts** | `repartition_key_lines` | **REPRISE + trigger cohérence copro_id** |
| `memberships` | Utilisateur↔copro↔rôle | `memberships` | **REPRISE + enum rationalisé 5→3** (gestionnaire / coproprietaire / platform_admin) |
| `profiles` | Extension `auth.users` (+ `cabinet_id` du gestionnaire) | `profiles` | **REPRISE + `cabinet_id` (rattachement gestionnaire→cabinet)** |
| `copro_invitations` | Invitation portail (token) → cible du câblage `user_id` | *(absente du live)* | **AJOUTÉE** (pivot câblage portail, AUTORISATION §3.2/§3.3) |

**Principe socle (verrouillé, mémoire `lot_centric_rule`)** : l'unité de gestion est **LE LOT**, jamais le copropriétaire. La quote-part d'un lot vit **exclusivement** dans `repartition_key_lines` (poids lot×clé). Le solde d'une personne se **dérive** en sommant ses lots. → Justifie la suppression des `lots.tantiemes_*` (§1.3) et l'absence de toute colonne « tantième » portée par une personne.

**Principe de tenance (verrouillé, décision USER multi-cabinet)** : la racine de tenance n'est plus la copro mais le **CABINET** (organisation syndic). Chaîne : `cabinets → copros → {lots, coproprietaires, …}`. Un **gestionnaire** appartient à **un cabinet** (`profiles.cabinet_id`) et n'accède **qu'aux copros de son cabinet** ; un **copropriétaire** est rattaché à ses copros (donc à un cabinet **transitivement**, jamais directement) ; un **`platform_admin`** (équipe CoProFlex) est transverse, **hors cabinet**. Ce périmètre est **porté par les helpers** d'autorisation (AUTORISATION §4), pas par chaque policy.

---

## 1. TABLES (schéma cible)

### 1.0 `cabinets` — organisation syndic (tenant racine, **AJOUTÉE**)

**AJOUTÉE (couche de tenance multi-cabinet, décision USER).** Le cabinet est l'**organisation syndic** qui chapeaute N copros. C'est la nouvelle **racine de cloisonnement** : toute copro appartient à exactement un cabinet ; tout gestionnaire appartient à un cabinet et ne voit que les copros de celui-ci. Pas de reprise live (table inexistante) → **créée vide**, puis 1 cabinet « template » seedé qui porte la COPRO-TEMPLATE (§6).

| Colonne | Type PG | Null | Défaut | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `name` | text | NO | — | raison sociale / nom commercial du cabinet |
| `siret` | text | YES | — | SIRET du cabinet (non unique imposé — peut manquer à la création) |
| `email` | text | YES | — | contact principal (`CHECK` format si non NULL) |
| `phone` | text | YES | — | |
| `address_line1` | text | YES | — | |
| `address_line2` | text | YES | — | |
| `city` | text | YES | — | |
| `postal_code` | text | YES | — | |
| `country` | text | NO | `'France'` | |
| `is_active` | bool | NO | `true` | désactivation logique (jamais de DELETE dur — copros rattachées) |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | maintenu par trigger |

- **PK** : `id`.
- **FK** : *(aucune sortante)* — c'est la racine de tenance.
- **CHECK** : `ck_cabinet_email` : `email IS NULL OR email ~* '^[^@]+@[^@]+\.[^@]+$'`.
- **Index** : `cabinets_pkey` · `idx_cabinets_name (name)`.
- **Triggers** : `set_updated_at` (BEFORE UPDATE, fonction consolidée).
- **RLS** : voir §3. **`platform_admin`** : ALL (transverse). **`gestionnaire`** : SELECT **de SON cabinet uniquement** (`id = current profiles.cabinet_id`) ; PAS d'UPDATE/INSERT/DELETE en session-user (CRUD cabinet = écrans différés, via RPC `service_role`/`platform_admin`). **`coproprietaire`** : aucune policy (il ne voit jamais le cabinet directement). **`anon`** : aucune.

> **Rattachement des gestionnaires au cabinet — décision : `profiles.cabinet_id`** (1 gestionnaire = 1 cabinet, §1.9). On **n'introduit pas** de table `cabinet_members` séparée : un gestionnaire n'appartient qu'à un seul cabinet (le multi-cabinet pour un même humain n'est pas au périmètre), donc une colonne sur `profiles` suffit et reste la source unique lue par les helpers. Si un jour un gestionnaire doit couvrir plusieurs cabinets, on promouvra `profiles.cabinet_id` en table `cabinet_memberships(user_id, cabinet_id, role)` — non requis aujourd'hui.

---

### 1.1 `copros` — la copropriété (sous un cabinet)

Refonte : **suppression des 3 compteurs dénormalisés morts/faux** (`lots_count` NULL 12/12, `total_tantiemes` NULL 12/12, `buildings_count` faux — 11111111 dit 1, 2 réels) → ces valeurs se **dérivent par vue** (`v_copro_tantiemes` existe déjà). **Typage correct** des champs aujourd'hui en `text` (`date_reglement`, `annee_construction`, `exercice_debut`). **`cabinet_id` : BRANCHÉ en FK NOT NULL → `cabinets`** (décision USER multi-cabinet, **annule le DROP historique §7-A1**) : la colonne morte du live (`NULL 12/12`) devient le pivot de tenance — toute copro appartient à un cabinet.

| Colonne | Type PG | Null | Défaut | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `cabinet_id` | uuid | **NO** | — | **FK → cabinets(id)** — racine de tenance (cloisonnement RLS via helpers) |
| `name` | text | NO | — | nom de la copro |
| `address` | text | YES | — | |
| `city` | text | YES | — | |
| `postal_code` | text | YES | — | |
| `siret` | text | YES | — | SIRET du syndicat (non unique — copro peut ne pas en avoir) |
| `num_immatriculation` | text | YES | — | n° au registre national des copropriétés |
| `date_reglement` | **date** | YES | — | **TYPÉ** (était `text`) — date du règlement de copropriété |
| `annee_construction` | **int2** | YES | — | **TYPÉ** (était `text`) — année (`CHECK >= 1700 AND <= extract(year from now())+5`) |
| `exercice_debut` | **int2** | NO | `1` | **TYPÉ** (était `text '01-01'`) — **mois** de début d'exercice (1–12), `CHECK BETWEEN 1 AND 12` ; le jour est implicitement le 1er |
| `onboarding_step` | int2 | YES | `0` | progression onboarding |
| `onboarding_max_step` | int2 | YES | — | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | maintenu par trigger consolidé |

**SUPPRIMÉ vs live** : `lots_count`, `total_tantiemes`, `buildings_count` (dénormalisations **mortes/fausses** — dérivées par vue). *(NB : `cabinet_id` n'est PAS supprimé — il passe de colonne morte à **FK NOT NULL**, décision multi-cabinet. NB : `exercice_debut` passe de `text` 'MM-JJ' à `int2` mois ; si le jour ≠ 1 doit être supporté un jour, ajouter `exercice_debut_day int2` — non requis sur la COPRO-TEMPLATE au 01-01.)*

- **PK** : `id`.
- **FK** : **`cabinet_id → cabinets(id)` ON DELETE RESTRICT** (interdit de supprimer un cabinet qui porte des copros — désactivation logique via `cabinets.is_active` à la place). C'est la **seule** FK de tenance ; le cloisonnement par cabinet est ensuite assuré par les helpers (AUTORISATION §4), pas répété sur chaque table fille.
- **CHECK** : `ck_copro_exercice_mois` : `exercice_debut BETWEEN 1 AND 12` · `ck_copro_annee` : `annee_construction IS NULL OR (annee_construction BETWEEN 1700 AND extract(year from now())::int + 5)`.
- **Index** : `copros_pkey` · `idx_copros_cabinet (cabinet_id)` · `idx_copros_name (name)`.
- **Triggers** : `set_updated_at` (BEFORE UPDATE, fonction **consolidée unique**) · `tr_create_default_reminder_rules` · `tr_create_reminder_settings` (AFTER INSERT — domaine relances, conservés).
- **RLS** : voir §3. **Pas de policy INSERT/DELETE** (création/suppression d'un tenant via RPC `service_role`, cf. AUTORISATION §6.5).

---

### 1.2 `buildings` — bâtiment d'une copro (optionnel assumé)

**GARDÉE** mais rendue **optionnelle-assumée** (45/66 lots sans building en live = concept présent non adopté). `lots.building_id` reste `ON DELETE SET NULL`. À la migration, réassigner les `building_id` des 21 lots réels si le concept est conservé.

| Colonne | Type PG | Null | Défaut | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `copro_id` | uuid | NO | — | FK copros |
| `name` | text | NO | — | |
| `address` | text | YES | — | |
| `floors_count` | int2 | YES | `1` | nb d'étages |
| `construction_year` | int2 | YES | — | (`CHECK` cohérent comme `copros.annee_construction`) |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | maintenu par trigger |

- **PK** : `id`. **FK** : `copro_id → copros(id)` **ON DELETE CASCADE**.
- **Index** : `idx_buildings_copro_id (copro_id)`.
- **Triggers** : `set_updated_at`.

---

### 1.3 `lots` — **unité de gestion canonique**

**Refonte majeure (dette structurelle #1)** : **DROP des 4 colonnes `tantiemes_*`** (`generaux`, `escalier`, `ascenseur`, `chauffage`). Preuve live de la dette :
- `tantiemes_ascenseur` = 0 / 66, `tantiemes_chauffage` = 0 / 66 → **colonnes mortes**.
- `tantiemes_escalier` (Σ=970 sur 11111111) **diverge** de la clé "Ascenseur" subset existante (Σ=971 vérifié live) → **deux sources concurrentes incohérentes**, libellés différents.
- `tantiemes_generaux` (Σ=1029) **double** la clé "Charges générales" (Σ=1029 vérifié live).
→ **Source unique des quotes-parts = `repartition_key_lines`** (§1.7). Aucune quote-part ne vit plus sur `lots`.

| Colonne | Type PG | Null | Défaut | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `copro_id` | uuid | NO | — | FK copros |
| `building_id` | uuid | YES | — | FK buildings (optionnel) |
| `ref` | text | NO | — | référence du lot (ex. « Lot 12 ») |
| `type` | `lot_type` (enum) | NO | `'appartement'` | enum conservé (cf. ENUMS §4) |
| `floor` | int2 | YES | — | étage |
| `surface` | numeric(8,2) | YES | — | surface (sert de base à la clé `surface`) |
| `description` | text | YES | — | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | maintenu par trigger |

**SUPPRIMÉ vs live** : `tantiemes_generaux`, `tantiemes_escalier`, `tantiemes_ascenseur`, `tantiemes_chauffage` (la quote-part est portée **uniquement** par `repartition_key_lines`).

- **PK** : `id`.
- **FK** : `copro_id → copros(id)` **ON DELETE CASCADE** · `building_id → buildings(id)` **ON DELETE SET NULL**.
- **UNIQUE** : `uq_lots_copro_ref (copro_id, ref)`.
- **Index** : `idx_lots_copro (copro_id)` · `idx_lots_building (building_id)` · `idx_lots_ref (copro_id, ref)`.
- **Triggers** : `set_updated_at` · **`tr_lot_copro_consistency`** (BEFORE I/U → si `building_id` renseigné, impose `building.copro_id = copro_id`, **intégrité ajoutée**).

---

### 1.4 `lot_owners` — rattachement lot↔personne (historisé, indivision-ready)

**Refonte (dette #8 / trou #2)** : ajout des **triggers d'intégrité `copro_id`** et de la **garantie « 1 seul propriétaire primaire actif à 100% par lot »** (modèle indivision ouvert en live mais non contraint). `copro_id` dénormalisé **conservé** (sécurise RLS/index lot-centric sans JOIN) mais désormais **garanti cohérent par trigger**.

| Colonne | Type PG | Null | Défaut | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `lot_id` | uuid | NO | — | FK lots |
| `coproprietaire_id` | uuid | NO | — | FK coproprietaires |
| `copro_id` | uuid | NO | — | FK copros (dénormalisé — **cohérence imposée par trigger**) |
| `share_percent` | numeric(6,3) | NO | `100` | quote-part d'indivision (`CHECK > 0 AND <= 100`) |
| `is_primary` | bool | NO | `true` | propriétaire référent (destinataire des appels) |
| `start_date` | date | NO | `CURRENT_DATE` | début du rattachement |
| `end_date` | date | YES | — | NULL = rattachement **actif** |
| `created_at` | timestamptz | NO | `now()` | |

- **PK** : `id`.
- **FK** : `lot_id → lots(id)` **ON DELETE CASCADE** · `coproprietaire_id → coproprietaires(id)` **ON DELETE CASCADE** · `copro_id → copros(id)` **ON DELETE CASCADE**.
- **CHECK** :
  - `ck_lo_share` : `share_percent > 0 AND share_percent <= 100`
  - `ck_lo_dates` : `end_date IS NULL OR end_date >= start_date`
- **UNIQUE / EXCLUDE** :
  - `uq_active_ownership (lot_id, coproprietaire_id, start_date)` *(conservé du live — empêche le doublon exact)*.
  - **`uq_lot_primary_active`** — **unique partiel** : `UNIQUE (lot_id) WHERE end_date IS NULL AND is_primary` → **garantit AU PLUS 1 propriétaire primaire actif par lot** (matérialise la règle lot-centric ; cf. trou #2). *(Variante EXCLUDE possible si l'on veut aussi borner par période — non requis ici, l'historisation passe par `end_date`.)*
  - **`tr_lot_owner_shares_sum`** (trigger, voir §4) — vérifie que **Σ `share_percent` des owners actifs d'un lot = 100** (indivision cohérente). Au-cas où l'indivision est exercée (0 cas en live, mais le modèle l'autorise).
- **Index** (lot-centric, partiels sur l'actif) : `idx_lo_active (lot_id) WHERE end_date IS NULL` · `idx_lo_copro_active (copro_id, end_date)` · `idx_lo_owner_active (coproprietaire_id, end_date)` · `idx_lo_lot_active (lot_id, end_date)` · `idx_lo_owner_primary (coproprietaire_id, is_primary)`.
- **Triggers** : **`tr_lot_owner_copro_consistency`** (BEFORE I/U → impose `lot.copro_id = copro_id` ET `coproprietaire.copro_id = copro_id`, **intégrité ajoutée** — trou #1/#2) · **`tr_lot_owner_shares_sum`** (BEFORE I/U/D → Σ share_percent actifs = 100 par lot).

---

### 1.5 `coproprietaires` — personne physique ou morale

REPRISE. `user_id` (lien vers `profiles`/`auth.users`) **conservé** mais NULL tant que le portail copropriétaire n'est pas câblé (plan de câblage : AUTORISATION §3, **non bloquant** pour le volet gestionnaire). `email`/`phone` restent portés ici (le copropriétaire n'a pas toujours de compte auth).

| Colonne | Type PG | Null | Défaut | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `copro_id` | uuid | NO | — | FK copros |
| `user_id` | uuid | YES | — | **FK profiles** — NULL tant que non invité/activé (AUTORISATION §3) |
| `is_company` | bool | NO | `false` | personne morale ? |
| `company_name` | text | YES | — | si `is_company` |
| `civility` | text | YES | — | |
| `first_name` | text | YES | — | |
| `last_name` | text | YES | — | |
| `email` | text | YES | — | |
| `phone` | text | YES | — | |
| `mobile` | text | YES | — | |
| `address_line1` | text | YES | — | |
| `address_line2` | text | YES | — | |
| `city` | text | YES | — | |
| `postal_code` | text | YES | — | |
| `country` | text | NO | `'France'` | |
| `prefers_email` | bool | NO | `true` | canal de notif (cf. ENUMS `notification_channel`) |
| `prefers_paper` | bool | NO | `false` | |
| `is_resident` | bool | NO | `true` | occupant ou bailleur |
| `notes` | text | YES | — | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | maintenu par trigger |

- **PK** : `id`.
- **FK** : `copro_id → copros(id)` **ON DELETE CASCADE** · `user_id → profiles(id)` **ON DELETE SET NULL** *(un user = plusieurs coproprietaires possibles ⇒ **PAS UNIQUE**, cf. AUTORISATION §3.3)*.
- **CHECK** : `ck_copro_person_company` : `is_company = (company_name IS NOT NULL)` *(une personne morale a un nom de société ; une personne physique non)* · `ck_copro_email` : `email IS NULL OR email ~* '^[^@]+@[^@]+\.[^@]+$'`.
- **Index** : `idx_coproprietaires_copro (copro_id)` · `idx_coproprietaires_email (email)` · `idx_coproprietaires_name (last_name, first_name)` · `idx_coproprietaires_user (user_id) WHERE user_id IS NOT NULL`.
- **Triggers** : `set_updated_at`.

---

### 1.6 `repartition_keys` — clés de charges (Art.10) — **modèle canonique, REPRISE telle quelle**

**BIEN FAIT, conservé sans dette.** Modèle versionné (`valid_from`/`valid_to`), couvre général/spécial/ALUR via `category`, couverture `all_lots`/`subset`. C'est **LE** modèle de tantièmes.

| Colonne | Type PG | Null | Défaut | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `copro_id` | uuid | NO | — | FK copros |
| `name` | text | NO | — | « Charges générales », « Ascenseur »… |
| `basis` | `repartition_basis` (enum) | NO | — | `tantiemes` / `surface` / `custom` |
| `category` | `repartition_category` (enum) | NO | `'general'` | `general` / `special` / `alur` (≈ 450-1/2/3) |
| `coverage_mode` | `coverage_mode` (enum) | NO | `'all_lots'` | `all_lots` / `subset` |
| `description` | text | YES | — | |
| `is_active` | bool | NO | `true` | |
| `valid_from` | date | NO | `CURRENT_DATE` | versionnement |
| `valid_to` | date | YES | — | NULL = en vigueur |
| `created_at` | timestamptz | NO | `now()` | |

- **PK** : `id`. **FK** : `copro_id → copros(id)` **ON DELETE CASCADE**.
- **CHECK** : `ck_key_validity` : `valid_to IS NULL OR valid_to >= valid_from`.
- **UNIQUE** : `uq_key_copro_name (copro_id, name)`.
- **Index** : `idx_keys_copro_active (copro_id, is_active)`.
- **Triggers** : (aucun trigger d'horodatage — pas d'`updated_at` ; conservé tel quel).

---

### 1.7 `repartition_key_lines` — poids lot×clé — **SOURCE UNIQUE des quotes-parts**

**BIEN FAIT, REPRISE + 1 garde ajoutée.** Table lot-centric des quotes-parts. `copro_id` dénormalisé justifié (RLS/index sans JOIN). **AJOUT (trou #1/#2)** : trigger garantissant `key.copro_id = lot.copro_id = copro_id` (absent en live).

| Colonne | Type PG | Null | Défaut | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `key_id` | uuid | NO | — | FK repartition_keys |
| `lot_id` | uuid | NO | — | FK lots — **unité de gestion** |
| `copro_id` | uuid | NO | — | FK copros (dénormalisé — **cohérence imposée par trigger**) |
| `weight` | numeric(12,4) | NO | — | poids du lot dans la clé (`CHECK >= 0`) |
| `created_at` | timestamptz | NO | `now()` | |

- **PK** : `id`.
- **FK** : `key_id → repartition_keys(id)` **ON DELETE CASCADE** · `lot_id → lots(id)` **ON DELETE CASCADE** · `copro_id → copros(id)` **ON DELETE CASCADE**.
- **CHECK** : `ck_rkl_weight` : `weight >= 0`.
- **UNIQUE** : `uq_rkl_key_lot (key_id, lot_id)` *(un lot ne figure qu'une fois par clé)*.
- **Index** : `idx_rkl_copro (copro_id)` · `idx_rkl_key (key_id)` · `idx_rkl_lot (lot_id)`.
- **Triggers** : **`tr_rkl_copro_consistency`** (BEFORE I/U → impose **`key.copro_id = lot.copro_id = copro_id`**, **intégrité ajoutée** — c'est le trou central #2). Empêche d'attribuer à une clé d'une copro un lot d'une autre copro.

---

### 1.8 `memberships` — utilisateur↔copro↔rôle (pivot des gardes)

**REPRISE + rationalisation enum (5→3, cf. ENUMS §1.4 / AUTORISATION §1.2).** Table pivot de toutes les autorisations gestionnaire. `membre_cs` n'est plus un rôle d'appartenance (→ attribut `council_members`) ; `prestataire` supprimé (vit dans `providers`).

| Colonne | Type PG | Null | Défaut | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `user_id` | uuid | NO | — | FK profiles |
| `copro_id` | uuid | NO | — | FK copros |
| `role` | `membership_role` (enum **3 val.**) | NO | `'coproprietaire'` | `gestionnaire` / `coproprietaire` / `platform_admin` (A13 : ex-`admin` renommé transverse) |
| `created_at` | timestamptz | NO | `now()` | |

- **PK** : `id`.
- **FK** : `user_id → profiles(id)` **ON DELETE CASCADE** · `copro_id → copros(id)` **ON DELETE CASCADE**.
- **UNIQUE** : `uq_membership_user_copro (user_id, copro_id)` *(un user = 1 rôle par copro)*.
- **Index** : `idx_memberships_copro (copro_id)` · `idx_memberships_copro_role (copro_id, role)` · `idx_memberships_user (user_id)`.
- **Triggers** : (aucun — table d'autz simple, pas d'`updated_at`).
- *NB : la cohérence « un membership `coproprietaire` suppose une ligne `coproprietaires` correspondante (`user_id`, `copro_id`) » est portée par la RPC d'invitation `link_coproprietaire_account` (AUTORISATION §3.2-B), pas par un trigger ici — évite un couplage circulaire au moment de l'activation.*

---

### 1.9 `profiles` — extension `auth.users` (+ rattachement gestionnaire→cabinet)

**Maigre et sain.** Le rôle métier vit dans `memberships`, PAS ici (correct pour le multi-tenant). **AJOUT (multi-cabinet)** : `cabinet_id` = rattachement du gestionnaire à son cabinet. C'est la **source unique** lue par les helpers pour le périmètre cabinet (AUTORISATION §4).

| Colonne | Type PG | Null | Défaut | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | — | **PK = FK `auth.users(id)`** (1:1) |
| `email` | text | YES | — | |
| `full_name` | text | YES | — | |
| `phone` | text | YES | — | |
| `avatar_url` | text | YES | — | |
| `cabinet_id` | uuid | YES | — | **FK → cabinets(id)** — cabinet du gestionnaire ; **NULL** pour un copropriétaire (rattaché à ses copros, cabinet transitif) ET pour un `platform_admin` (transverse, hors cabinet) |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | maintenu par trigger |

- **PK** : `id`. **FK** : `id → auth.users(id)` **ON DELETE CASCADE** · `cabinet_id → cabinets(id)` **ON DELETE SET NULL** *(si le cabinet est purgé, le profil survit, dé-rattaché)*.
- **Index** : `idx_profiles_email (email)` · `idx_profiles_cabinet (cabinet_id) WHERE cabinet_id IS NOT NULL`.
- **Triggers** : `set_updated_at` · `handle_new_user` (AFTER INSERT sur `auth.users` → crée le profil, cf. AUTORISATION §3.2-B).
- *NB sémantique : `cabinet_id` est renseigné **pour les gestionnaires** (à l'invitation gestionnaire — écran différé) et laissé **NULL** pour copropriétaires et `platform_admin`. Un gestionnaire sans `cabinet_id` ne voit aucune copro (fail-closed) — cohérent avec le cloisonnement par cabinet.*

---

### 1.10 `copro_invitations` — invitation au portail copropriétaire (cible de `link_coproprietaire_account`)

**AJOUTÉE (trou majeur #1)** : `link_coproprietaire_account` (§5) et AUTORISATION §3.2-A/§3.3 décrivent une table d'invitations (token + `coproprietaire_id` + email) **sans la définir**. Sans cette table, le câblage `user_id` (§3) est irréalisable. C'est le **pivot du câblage portail** : le gestionnaire crée une invitation (Jalon A), le copropriétaire l'accepte avec son token (Jalon B) → la RPC pose `coproprietaires.user_id` + crée le `memberships`. Porte l'**unicité métier** « un copropriétaire n'est pas invité deux fois en parallèle » (AUTORISATION §3.3).

| Colonne | Type PG | Null | Défaut | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `copro_id` | uuid | NO | — | FK copros (dénormalisé — RLS/index sans JOIN, cohérence par trigger) |
| `coproprietaire_id` | uuid | NO | — | FK coproprietaires — personne invitée (cible du câblage `user_id`) |
| `email` | text | NO | — | email destinataire ; **doit = email JWT à l'acceptation** (garde RPC, AUTORISATION §3.2-B) |
| `token` | text | NO | `encode(gen_random_bytes(32),'hex')` | secret d'acceptation (lookup public restreint) |
| `status` | `invitation_status` (enum) | NO | `'pending'` | `pending` / `accepted` / `revoked` / `expired` |
| `expires_at` | timestamptz | NO | `now() + interval '14 days'` | péremption ; au-delà → `expired` (refus RPC) |
| `accepted_at` | timestamptz | YES | — | horodatage d'acceptation (rempli par la RPC) |
| `created_by` | uuid | NO | — | FK profiles — gestionnaire émetteur (traçabilité) |
| `created_at` | timestamptz | NO | `now()` | |

- **PK** : `id`.
- **FK** : `copro_id → copros(id)` **ON DELETE CASCADE** · `coproprietaire_id → coproprietaires(id)` **ON DELETE CASCADE** · `created_by → profiles(id)` **ON DELETE SET NULL** *(conserver l'invitation si le gestionnaire émetteur part)* — `created_by` reste donc **YES** en pratique pour cette FK ; modélisé `NOT NULL` à la création, l'`ON DELETE SET NULL` le ramène à NULL si l'émetteur disparaît.
- **CHECK** :
  - `ck_inv_email` : `email ~* '^[^@]+@[^@]+\.[^@]+$'`.
  - `ck_inv_accepted` : `(status = 'accepted') = (accepted_at IS NOT NULL)` *(accepted ⇔ horodaté)*.
- **UNIQUE** :
  - `uq_invitation_token (token)` *(token globalement unique — clé d'acceptation)*.
  - **`uq_invitation_pending_coprop`** — **unique partiel** : `UNIQUE (coproprietaire_id) WHERE status = 'pending'` → **porte l'unicité métier AUTORISATION §3.3** : au plus **une** invitation en attente par personne (ré-inviter exige de révoquer/expirer la précédente).
- **Index** : `idx_inv_copro (copro_id)` · `idx_inv_coprop (coproprietaire_id)` · `idx_inv_token (token)` · `idx_inv_pending (copro_id, status) WHERE status = 'pending'`.
- **Triggers** : **`tr_invitation_copro_consistency`** (BEFORE I/U → impose `coproprietaire.copro_id = copro_id`, **intégrité ajoutée** — même garde lot-centric que §1.4/§1.7).
- **RLS** : voir §3. **G-MGR** en lecture/écriture (le gestionnaire émet/révoque, scoping par copro) ; l'**acceptation par token** ne passe pas par une policy `authenticated` (le copropriétaire n'a pas encore d'accès à la copro) mais par la **RPC `link_coproprietaire_account` SECURITY DEFINER** qui résout le token et vérifie `email JWT = email invité` (AUTORISATION §3.2-B). Aucune policy `anon`.

---

## 2. ENUMS (cités, pas redéfinis — cf. `ENUMS.md`)

| Enum cible | Valeurs | Statut |
|---|---|---|
| `membership_role` | `gestionnaire`, `coproprietaire`, `platform_admin` | **RÉDUIT 5→3** (ENUMS §1.4) + **A13 : `admin` → `platform_admin`** (transverse, équipe CoProFlex) ; `membre_cs` → attribut `council_role`, `prestataire` → `providers` |
| `lot_type` | `appartement, studio, commerce, bureau, cave, parking, garage, local_technique, autre` | inchangé |
| `repartition_basis` | `tantiemes, surface, custom` | inchangé |
| `coverage_mode` | `all_lots, subset` | inchangé |
| `repartition_category` | `general, special, alur` | inchangé (aligne sur 450-1/2/3) |
| `invitation_status` | `pending, accepted, revoked, expired` | **NOUVEAU** (statut `copro_invitations` §1.10 — à déclarer dans `ENUMS.md`) |

---

## 3. RLS (platform_admin / gestionnaire / coproprietaire / anon + bypass service_role)

**Principe verrouillé (AUTORISATION §6)** : RLS `ENABLE` partout en prod (`FORCE` non requis ici — pas de tables comptables dans ce domaine), `DISABLE` en dev. Les policies ciblent `authenticated` ; `service_role` n'est jamais soumis aux policies. **Cloisonnement cabinet centralisé** : les helpers `user_has_copro_access(copro)` / `user_is_copro_manager(copro)` **intègrent désormais le périmètre cabinet** (un gestionnaire ne « passe » que sur les copros de son cabinet ; un `platform_admin` passe partout — AUTORISATION §4). **Les policies de domaine ci-dessous restent inchangées dans leur forme** : elles appellent les mêmes helpers, qui portent le filtre cabinet en interne. Seules les policies de la table `cabinets` elle-même mentionnent le cabinet explicitement (il n'y a pas encore de helper en amont d'elle).

| Table | Rôle | Policy (cmd) | Garde |
|---|---|---|---|
| `cabinets` | platform_admin | ALL | `user_is_platform_admin()` *(transverse)* |
| `cabinets` | gestionnaire | SELECT | `id = (select cabinet_id from profiles where id = auth.uid())` *(son cabinet seul)* |
| `cabinets` | gestionnaire | INSERT/UPDATE/DELETE | — **aucune policy** (CRUD cabinet = écrans différés → RPC `service_role`/`platform_admin`) |
| `cabinets` | copropriétaire / anon | — | **aucune** (le copropriétaire ne voit jamais le cabinet directement ; rattachement transitif via ses copros) |
| `copros` | gestionnaire | SELECT | `user_has_copro_access(id)` |
| `copros` | gestionnaire | UPDATE | `user_is_copro_manager(id)` |
| `copros` | copropriétaire | SELECT | `user_has_copro_access(id)` *(R sa copro)* |
| `copros` | anon / INSERT / DELETE | — | **aucune policy** (création/suppression via RPC `service_role`) |
| `buildings` | gestionnaire | ALL | `user_is_copro_manager(copro_id)` |
| `buildings` | copropriétaire | SELECT | `user_has_copro_access(copro_id)` |
| `lots` | gestionnaire | ALL | `user_is_copro_manager(copro_id)` |
| `lots` | copropriétaire | SELECT | `user_has_copro_access(copro_id)` |
| `lot_owners` | gestionnaire | ALL | `user_is_copro_manager(copro_id)` |
| `lot_owners` | copropriétaire | SELECT (own) | `user_is_lot_owner(lot_id)` *(ses lots — dépend de `coproprietaires.user_id`)* |
| `coproprietaires` | gestionnaire | ALL | `user_is_copro_manager(copro_id)` |
| `coproprietaires` | copropriétaire | SELECT (own) | `user_id = auth.uid()` |
| `repartition_keys` | gestionnaire | SELECT/INSERT/UPDATE/DELETE | `user_has_copro_access` (SELECT) · `user_is_copro_manager` (écriture) |
| `repartition_keys` | copropriétaire | SELECT | `user_has_copro_access(copro_id)` |
| `repartition_key_lines` | gestionnaire | SELECT/INSERT/UPDATE/DELETE | idem repartition_keys |
| `repartition_key_lines` | copropriétaire | SELECT (own) | lot ∈ `get_user_lot_ids(copro_id)` |
| `memberships` | gestionnaire | ALL | `user_is_copro_manager(copro_id)` |
| `memberships` | copropriétaire | SELECT (own) | `user_id = auth.uid()` |
| `profiles` | tous | SELECT/UPDATE/INSERT (own) | `id = auth.uid()` |
| `copro_invitations` | gestionnaire | ALL | `user_is_copro_manager(copro_id)` *(émettre/lister/révoquer ses invitations)* |
| `copro_invitations` | copropriétaire / acceptation | — | **aucune policy** : acceptation par token via RPC `link_coproprietaire_account` (DEFINER, garde email JWT = email invité) — l'invité n'a pas encore d'accès copro |
| toutes | anon | — | **aucune** (deny by default) |

**Dépendance de câblage** (AUTORISATION §3) : les policies « own » des copropriétaires reposent sur `coproprietaires.user_id`. Le volet **gestionnaire** passe par `memberships` **ET** le périmètre cabinet (`profiles.cabinet_id` = `copro.cabinet_id`), les deux étant combinés **dans le helper** `user_is_copro_manager` — donc aucune policy de domaine ne change quand on ajoute le cabinet. Le portail copropriétaire devient opérant dès que `user_id` est peuplé via `link_coproprietaire_account`, **sans modification de policy**.

> **Pourquoi le cabinet ne se voit pas dans les policies de domaine.** Le filtre « ce gestionnaire appartient-il au cabinet de cette copro ? » est ajouté **une seule fois**, dans `user_is_copro_manager`/`user_has_copro_access`. Toutes les tables filles (`lots`, `coproprietaires`, finance, AG, GED…) héritent du cloisonnement gratuitement, sans répéter `cabinet_id` ni JOIN. C'est la « défense en profondeur centralisée » : on ne peut pas oublier le filtre cabinet sur une table puisqu'aucune table fille ne le porte.

---

## 4. TRIGGERS conservés / ajoutés

| Trigger | Table | Événement | Rôle | Statut |
|---|---|---|---|---|
| `set_updated_at` | cabinets, copros, buildings, lots, coproprietaires, profiles | BEFORE UPDATE | horodatage (fonction **consolidée unique**) | **CONSOLIDÉ** |
| `tr_create_default_reminder_rules` / `tr_create_reminder_settings` | copros | AFTER INSERT | seed relances | **GARDÉS** (domaine finance/relances) |
| `handle_new_user` | auth.users | AFTER INSERT | crée le `profiles` lié | **GARDÉ** |
| **`tr_lot_copro_consistency`** | lots | BEFORE I/U | si `building_id` → `building.copro_id = copro_id` | **AJOUTÉ** (intégrité) |
| **`tr_lot_owner_copro_consistency`** | lot_owners | BEFORE I/U | impose `lot.copro_id = copro_id` ET `coproprietaire.copro_id = copro_id` | **AJOUTÉ** (trou #1/#2) |
| **`tr_lot_owner_shares_sum`** | lot_owners | BEFORE I/U/D | Σ `share_percent` des owners actifs d'un lot = 100 | **AJOUTÉ** (indivision cohérente) |
| **`tr_rkl_copro_consistency`** | repartition_key_lines | BEFORE I/U | impose **`key.copro_id = lot.copro_id = copro_id`** | **AJOUTÉ** (trou #2, central) |
| **`tr_invitation_copro_consistency`** | copro_invitations | BEFORE I/U | impose `coproprietaire.copro_id = copro_id` | **AJOUTÉ** (§1.10, garde lot-centric) |

> La règle « 1 seul propriétaire **primaire** actif par lot » est portée par la **contrainte d'unicité partielle** `uq_lot_primary_active` (§1.4), pas par un trigger — un index partiel est plus sûr et moins coûteux qu'un trigger pour une unicité.

---

## 5. FONCTIONS du domaine (GARDER / RÉÉCRIRE / ABANDONNER)

Cohérent avec AUTORISATION §4-§5. Helpers d'autz = **GARDÉS** (bien conçus), seul leur **branchement effectif** (RLS ON + gardes) change.

| Fonction | Disposition | Garde | Note |
|---|---|---|---|
| `user_has_copro_access`, `user_is_copro_manager` | **GARDER + INTÉGRER LE PÉRIMÈTRE CABINET** | G-INTERNAL (DEFINER, REVOKE anon) | pivots RLS — `user_is_copro_manager` = (role `gestionnaire` **ET** `profiles.cabinet_id = copro.cabinet_id`) **OU** `platform_admin` ; `user_has_copro_access` ajoute le même filtre cabinet pour le gestionnaire (AUTORISATION §4) |
| `user_is_platform_admin()` | **AJOUTER** | G-INTERNAL (DEFINER, REVOKE anon) | ∃ membership `role='platform_admin'` pour `auth.uid()` (transverse, hors cabinet) — utilisé par la policy `cabinets` ALL et englobé dans les 2 helpers ci-dessus |
| `user_is_lot_owner`, `user_is_lot_owner_in_copro`, `user_is_lot_owner_or_manager`, `user_owns_any_lot_in_copro`, `get_user_lot_ids` | **GARDER** | G-INTERNAL | opérants dès câblage `coproprietaires.user_id` (AUTORISATION §3) |
| `compute_repartition_shares(key_id)` | **GARDER** | G-INTERNAL | **cœur lot-centric** : (lot_id, weight, share_pct=weight/total×100) |
| `repartition_key_is_complete(key_id)` | **GARDER** | G-INTERNAL | all_lots ⇒ tous lots couverts ; subset ⇒ ≥1 ligne >0 — sert d'invariant migration (§6) |
| `provision_copro_chart(copro)` | **GARDER** | G-MGR / G-SVC | provisionne le plan comptable |
| `link_coproprietaire_account(p_invite_token)` | **AJOUTER** | DEFINER, garde email JWT = email invité | résout le token sur **`copro_invitations` (§1.10)** : vérifie `status='pending'` + `now()<expires_at` + `email JWT = email invité`, puis câble `coproprietaires.user_id`, crée membership, passe l'invitation `accepted`/`accepted_at` (AUTORISATION §3.2-B) |
| `ensure_dev_membership`, `get_default_copro_id` | **ABANDONNER (prod)** | DEV-only | artefacts dev — hors schéma cible prod (AUTORISATION §5.2) |
| `create_test_copro(_seeded)`, `create_clean_test_copro(_seeded)` | **RÉÉCRIRE (CI)** | G-SVC | harnais jetable, hors prod publique. **Cassent avec `copros.cabinet_id` NOT NULL** : `create_clean_test_copro` fait un `INSERT INTO copros(...)` sans `cabinet_id` → violation NOT NULL ; `create_test_copro` copie `cabinet_id` de la source `22222222` (NULL en live 12/12) → copie NULL → même violation. **Fix** : injecter un `cabinet_id` valide dans l'`INSERT INTO copros` (seeder/réutiliser un cabinet de test — celui du template §6.1) ET retirer les colonnes mortes droppées (`buildings_count`, `lots_count`, `total_tantiemes`, `tantiemes_*`). À faire **avant** le re-test session-user (§7-8). |

`repartition_keys`/`repartition_key_lines` : CRUD direct PostgREST sous RLS (pas de RPC bespoke). Volontaire.

---

## 6. PLAN DE SEED — **COPRO-TEMPLATE propre (A1 : PAS de reprise live)**

**A1 (décision USER) : aucune donnée du live n'est reprise.** On **construit de zéro** une COPRO-TEMPLATE propre (nouvelle référence test/démo qui **remplace la boucle d'or** `22222222`). Les volumes ci-dessous sont des **cibles de seed** (forme idéale), pas une copie. Le **schéma fait foi** ; les invariants legacy 970≠971 du live ne sont **plus pertinents** (rien n'est migré). Ordre de seed imposé par les FK : **cabinet → copro → buildings → lots → keys → key_lines → coproprietaires → lot_owners → (profiles/memberships du gestionnaire)**.

### 6.1 Tables & volumes cibles du template (seed propre)

| Table | Volume cible template | Notes de seed |
|---|---|---|
| `cabinets` | **1** (« Cabinet Template ») | racine de tenance ; porte la copro template ; `is_active=true` |
| `copros` | **1** (template) | `cabinet_id` = cabinet template (**FK NOT NULL**) ; `exercice_debut=1` ; types corrects dès la création |
| `buildings` | 1–2 | optionnel-assumé (§A3) — `building_id` cohérent par trigger |
| `lots` | ~6 | **aucune** colonne `tantiemes_*` (la quote-part vit dans `repartition_key_lines`) |
| `repartition_keys` | ~4 | Charges générales (all_lots, tantiemes), Eau (surface), Ascenseur (subset), Fonds ALUR (all_lots) |
| `repartition_key_lines` | ~24 | poids = quotes-parts ; Σ cohérente par clé (cf. §6.2) ; `key.copro_id = lot.copro_id` garanti par trigger |
| `coproprietaires` | ~6 | `user_id` NULL au seed (peuplé via invitation portail) |
| `lot_owners` | ~6 | 1 primaire actif/lot (`uq_lot_primary_active`) ; `copro_id` cohérent par trigger |
| `profiles` | ≥1 gestionnaire | `cabinet_id` = cabinet template (rattachement gestionnaire→cabinet) ; ≥1 `platform_admin` (`cabinet_id` NULL) |
| `memberships` | 1 (gestionnaire) | `role='gestionnaire'`, `copro_id` = copro template |
| `copro_invitations` | 0 | créée vide ; alimentée au fil des invitations portail |

### 6.2 Invariants à garantir sur le template (cohérence — pas une reprise)

| Invariant | Règle cible |
|---|---|
| Σ `weight` des clés `all_lots, basis tantiemes` (Charges générales, Fonds ALUR) | **égale** au total tantièmes du règlement de la copro template (valeur cohérente choisie au seed) |
| Σ `weight` clé `surface` (Eau) | = somme des surfaces des lots couverts |
| Σ `weight` clé `subset` (Ascenseur) | = somme des poids des seuls lots desservis (cohérente, **sans** double source) |
| `repartition_key_is_complete` sur toutes les clés | **true** |
| Lots couverts par les clés `all_lots` | tous |
| Indivision (`share_percent ≠ 100`) | 0 (ou cohérent Σ=100/lot si un cas d'indivision est volontairement seedé) |
| Multi-primaire actif par lot | **0** (garanti par `uq_lot_primary_active`) |
| `copro.cabinet_id` renseigné | **toujours** (FK NOT NULL) |

> **La dette legacy n'existe plus dans le template** : aucune colonne `tantiemes_*`, aucune double source. La quote-part vit **exclusivement** dans `repartition_key_lines` dès le premier INSERT. C'est l'intérêt d'un seed propre vs une migration : zéro artefact historique à corriger.

---

## 7. ARBITRAGES (tranchés — schéma cible déterministe)

### A1. **`copros.cabinet_id` : DROP OU créer la table `cabinets` ?** — **RE-TRANCHÉ (décision USER multi-cabinet) : CRÉER `cabinets` + FK NOT NULL**
*(Renverse l'ancien arbitrage « DROP ».)* Le multi-cabinet **entre dans la cible** : on **crée la table `cabinets`** (§1.0, organisation syndic chapeautant N copros) et `copros.cabinet_id` devient **FK NOT NULL → cabinets** (`ON DELETE RESTRICT`). La colonne morte du live (`NULL 12/12`) est donc **branchée**, pas droppée.
→ **Décision : couche de tenance cabinet posée maintenant** (schéma + RLS). Cloisonnement centralisé dans `user_has_copro_access`/`user_is_copro_manager` (intègrent `profiles.cabinet_id = copro.cabinet_id`) ; `platform_admin` transverse ; copropriétaire rattaché transitivement via ses copros. **Écrans** de gestion de cabinet (CRUD, invitation gestionnaires) **différés** (finance d'abord) — seuls schéma+RLS sont actés ici.
> **Dépendance de séquence (cabinet_id NOT NULL → harnais)** : passer `copros.cabinet_id` en NOT NULL **casse** `create_test_copro(_seeded)` et `create_clean_test_copro(_seeded)` (INSERT sans `cabinet_id`, ou copie de `cabinet_id` NULL depuis la source live). Ces harnais doivent être **réécrits AVANT le re-test session-user** (§7-8 / §6.5) : injecter un `cabinet_id` valide + retirer les colonnes mortes droppées. Cf. §5 (reclassés **RÉÉCRIRE**).

### A2. **`exercice_debut` : `int2` mois OU `date` modèle ?** — **TRANCHÉ : `int2` mois**
Live = `text` '01-01' (mois-jour). Les 2 copros réelles démarrent au 1er janvier.
→ **Décision : `int2`** (mois 1–12, jour = 1er implicite, `CHECK BETWEEN 1 AND 12`) — suffisant et typé (acté §1.1). Si un jour ≠ 1 devient nécessaire un jour, ajouter `exercice_debut_day int2` (non requis : 2 copros réelles toutes au 01-01).

### A3. **`buildings` : peupler ou rendre purement optionnel ?** — **TRANCHÉ : optionnel-assumé**
45/66 lots sans `building_id` en live.
→ **Décision : optionnel-assumé** (concept présent, non obligatoire) ; à la migration des 21 lots réels, **réassigner** les `building_id` (les 3 buildings réels couvrent les 2 copros). Ne pas rendre `lots.building_id` NOT NULL.

### A4. **Indivision : activer le trigger `tr_lot_owner_shares_sum` dès maintenant ?** — **TRANCHÉ : OUI, activé**
0 cas d'indivision en live, mais le modèle l'autorise (`share_percent`).
→ **Décision : activer dès maintenant** (coût nul tant qu'aucune indivision, filet pour le jour où elle est exercée — acté §1.4/§4). Confirme la cohérence Σ=100 par lot.

---

## 8. Synthèse « BIEN FAIT conservé » vs « DETTE corrigée »

**Conservé (ne pas refaire pour refaire)** : modèle de clés versionné (`valid_from/to`, général/spécial/ALUR) · `repartition_key_lines` lot-centric (UNIQUE key×lot, CHECK weight≥0) · index partiels sur `end_date IS NULL` · historisation `lot_owners` · helpers d'autz factorisés · `profiles` minimal sain · enums `lot_type`/`repartition_*`.

**Ajouté (trou comblé)** : **`cabinets` (§1.0)** — couche de tenance multi-cabinet (organisation syndic chapeautant N copros) ; `copros.cabinet_id` = FK NOT NULL ; gestionnaire rattaché via `profiles.cabinet_id` ; cloisonnement centralisé dans les helpers. · **`copro_invitations` (§1.10)** — table d'invitations portail (token + `coproprietaire_id` + email + `status`/`expires_at`) que `link_coproprietaire_account` et AUTORISATION §3.2/§3.3 supposaient sans la définir ; porte l'unicité métier (1 invitation `pending`/personne) et rend réalisable tout le câblage `user_id` (§3) + le nouvel enum `invitation_status`.

**Corrigé** : **DROP des 4 `lots.tantiemes_*`** (double source incohérente 970≠971 — source unique = `repartition_key_lines`) · DROP des 3 compteurs morts `copros.{lots_count,total_tantiemes,buildings_count}` (dérivés par vue) · **typage** `date_reglement`/`annee_construction`/`exercice_debut` · **triggers d'intégrité `copro_id`** sur `lot_owners` (lot + coproprietaire) et `repartition_key_lines` (key = lot = copro) · **contrainte « 1 primaire actif/lot »** (`uq_lot_primary_active`) + Σshare=100 (trigger) · **enum `membership_role` 5→3 + A13 `admin`→`platform_admin`** (membre_cs→attribut conseil, prestataire→providers) · **`cabinet_id` BRANCHÉ en FK NOT NULL → `cabinets`** (renverse l'ancien DROP §7-A1 : multi-cabinet désormais dans la cible) · RLS `ENABLE` prod (drift débranché corrigé).
