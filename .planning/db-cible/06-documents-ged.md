# Domaine 06 — Documents / GED / Versioning — SCHÉMA CIBLE (blueprint)

> Conception cible PROPRE — project `iyfesbjnkpynmwlsmxnp` — 2026-06-04
> Statut : redesign profond JUSTIFIÉ. On corrige les dettes du verdict « À REPENSER » et on PRÉSERVE le bien-fait (rétention légale, full-text FR, indexation, garde d'accès, arbo système idempotente).
> Cadre verrouillé : RLS partout + gardes in-function ; rôles platform_admin / gestionnaire / copropriétaire / anon + service_role ; cloisonnement cabinet centralisé dans les helpers (`user_has_copro_access`/`user_is_copro_manager`).
>
> **Décisions USER appliquées (verrouillées 2026-06-04) :** A4 — confidentialité SIMPLE par document fixée par le gestionnaire (enum `document_visibility` à 3 niveaux), **DROP de `document_access`** (ACL fine). A5 — **DROP `dossiers`** (mini-kanban démo), pas de module tâches. A9 — `document_versions` = source UNIQUE de versioning (bloc atomique). Les arbitrages correspondants du §7 sont donc CLOS.

---

## 0. Faits live qui tranchent le design (vérifiés en lecture seule)

Copros à migrer (IDs RÉELS) : `11111111-aaaa-bbbb-cccc-111111111111` (immuable, **43 docs**) et `22222222-aaaa-bbbb-cccc-222222222222` (boucle d'or, **8 docs**) = **51 docs**.

Inventaire des colonnes sur ces 51 docs :

| Colonne | Lignes non-null / 51 | Conséquence design |
|---|---|---|
| `folder_id` | 45 | **VIVANTE** — on garde le rattachement dossier. |
| `service_order_id` | **1** | quasi-mort → migre vers `document_relations` polymorphe. |
| `ag_id, resolution_id, contract_id, invoice_id, mutation_id, dossier_id, budget_id, lot_id, coproprietaire_id` | **0** | **COLONNES MORTES** sur les données réelles → SUPPRIMÉES de la table cible. Les vrais liens AG passent par `document_links` (29 lignes). |
| `parent_document_id` | 0 | versioning parallèle inerte → SUPPRIMÉE. |
| `is_current_version != true` | 0 | jamais écrit → SUPPRIMÉE. |
| `file_hash` | 0 | jamais alimenté → gardé (utile dédup) mais nullable. |
| `is_starred` | 1 | gardé. |
| `file_path` distincts | 51/51 | aucun doublon aujourd'hui → la nouvelle UNIQUE ne casse rien. |
| `confidentiality` réelles | public / manager / council uniquement | remappé sur l'enum cible `document_visibility` (3 niveaux, A4) ; `restricted` ABANDONNÉ (ACL fine droppée). |

Liens `document_links` : 27 `ag_meeting`+`related` / 2 `ag`+`annexe` → **deux noms pour AG** = à uniformiser. `document_access`, `document_versions`, `technical_documents`, `council_documents` = **0 ligne** (rien à migrer, on (re)conçoit le modèle). `document_access` (0 ligne, ACL fine jamais exercée) → **DROPPÉE** (A4). `dossiers` = 12 lignes de démo kanban, **0 doc ne pointe dessus** → table sans foyer GED → **DROPPÉE** (A5, §9).

**Décision structurante** : les 8 colonnes `*_id` FK-less de `documents` ne portent qu'UNE valeur réelle (1 `service_order_id`). Le verdict (« retirer les colonnes, une seule table de liens polymorphe typée ») est donc à coût quasi nul. On l'applique.

---

## 1. TABLES CIBLES

Le domaine cible = **5 tables** (au lieu de 7) :
`documents`, `document_folders`, `document_relations` (ex-`document_links`, typée), `document_versions`, `technical_documents`.
`document_access` → **DROPPÉE (A4, décision USER verrouillée)**. La confidentialité devient SIMPLE : un seul champ `documents.visibility` (enum `document_visibility`, 3 niveaux) fixé par le gestionnaire. Plus d'ACL fine par (document × personne), plus de 3e mécanisme. `council_documents` → **absorption DIFFÉRÉE, PAS droppée par 06** : la table reste **propriété du domaine 04** (conservée en faux-mort câblé front/edge, cf. 04 §1.9) ; la cible `document_relations(entity_type='council')` + `visibility='conseil'` ne s'applique qu'**après** rebranchement front/edge prouvé (voir §7-2 et 04 §1.9, point de décision unique). Le domaine cible 06 reste à 5 tables car `council_documents` n'a jamais appartenu à 06.

Enums : tous référencés par nom depuis le catalogue rationalisé (T2). Aucun enum redéfini ici.

### 1.1 `documents` (table maîtresse — nettoyée)

Colonnes retirées vs live : `ag_id, resolution_id, service_order_id, contract_id, invoice_id, mutation_id, dossier_id, budget_id` (8 liens FK-less → `document_relations`), `parent_document_id`, `is_current_version` (versioning parallèle mort), `version` (déplacé : la version courante est l'attribut `current_version_no`, l'historique vit dans `document_versions`).

```
documents
  id                  uuid       NOT NULL  DEFAULT gen_random_uuid()   -- PK
  copro_id            uuid       NOT NULL                              -- FK copros(id) ON DELETE CASCADE
  folder_id           uuid       NULL                                  -- FK document_folders(id) ON DELETE SET NULL
  lot_id              uuid       NULL                                  -- FK lots(id) ON DELETE SET NULL (dimension lot-centric, gardée)
  coproprietaire_id   uuid       NULL                                  -- FK coproprietaires(id) ON DELETE SET NULL
  -- fichier
  file_name           text       NOT NULL
  file_path           text       NOT NULL                             -- objet bucket Storage
  file_size           int4       NULL
  mime_type           text       NULL
  file_hash           text       NULL                                 -- dédup (alimenté à terme)
  -- métadonnées
  title               text       NULL
  description         text       NULL
  category            document_category   NOT NULL DEFAULT 'autre'
  tags                text[]     NULL                                 -- index GIN
  document_date       date       NULL
  year                int4       NULL
  status              document_status         NOT NULL DEFAULT 'active'
  visibility          document_visibility     NOT NULL DEFAULT 'gestionnaire_seul'  -- A4 : confidentialité SIMPLE fixée par le gestionnaire (ex-confidentiality + ACL document_access droppée)
  source_module       document_source         NOT NULL DEFAULT 'manual'
  -- versioning (compteur courant ; historique dans document_versions)
  current_version_no  int4       NOT NULL DEFAULT 1
  -- rétention légale (calculée par trigger — BIEN FAIT, conservé)
  retention_years     int4       NULL    DEFAULT 10
  expiration_date     date       NULL                                 -- dérivée trigger
  deletion_blocked    bool       NOT NULL DEFAULT false               -- dérivée trigger
  -- archivage
  is_archived         bool       NOT NULL DEFAULT false
  archived_at         timestamptz NULL
  is_starred          bool       NOT NULL DEFAULT false
  -- recherche plein texte FR (BIEN FAIT, conservé)
  search_text         tsvector   NULL                                 -- index GIN, trigger
  -- audit
  created_by          uuid       NULL                                 -- FK profiles(id) ON DELETE SET NULL
  created_at          timestamptz NOT NULL DEFAULT now()
  updated_at          timestamptz NOT NULL DEFAULT now()
```

- **PK** : `id`.
- **FK** : `copro_id`→copros CASCADE ; `folder_id`→document_folders SET NULL ; `lot_id`→lots SET NULL ; `coproprietaire_id`→coproprietaires SET NULL ; `created_by`→profiles SET NULL.
- **CHECK** : `ck_year CHECK (year IS NULL OR year BETWEEN 1900 AND 2100)` ; `ck_retention CHECK (retention_years IS NULL OR retention_years >= 0)` ; `ck_archived CHECK (is_archived = false OR archived_at IS NOT NULL)` (cohérence archive).
- **UNIQUE** (NOUVEAU, comble la dette §8 du verdict) : `uq_documents_copro_path UNIQUE (copro_id, file_path)` → bloque les doublons de fichier dans une même copro. Index partiel dédup hash : `idx_documents_hash ON documents(copro_id, file_hash) WHERE file_hash IS NOT NULL`.
- **NOUVELLE contrainte d'intégrité copro** (comble la dette « cohérence copro_id ») : trigger `trg_documents_copro_consistency` BEFORE I/U → vérifie que `folder_id`, `lot_id`, `coproprietaire_id` (quand non-null) appartiennent bien à `copro_id`. (Même esprit que `check_budget_line_copro_consistency` côté finance.)
- **Index** : pkey ; `(copro_id)` ; `(folder_id)` ; `(lot_id)` ; `(coproprietaire_id) WHERE coproprietaire_id IS NOT NULL` ; `(copro_id, category)` ; `(copro_id, status)` ; `(copro_id, year)` ; `(copro_id, created_at DESC)` ; `(copro_id, visibility)` ; `(copro_id) WHERE is_starred` ; GIN `tags` ; GIN `search_text`. (On supprime les 4 index partiels devenus inutiles : contract/service_order/ag/budget — ces colonnes n'existent plus.)
- **Triggers** : `set_updated_at` (consolidé) ; `trg_document_expiration` (calculate_document_expiration) ; `trg_document_search_text` (update_document_search_text) ; `trg_prevent_document_deletion` (prevent_protected_document_deletion) ; `trg_documents_copro_consistency` (NOUVEAU).

### 1.2 `document_folders` (arborescence — corrigée)

Inchangée dans sa structure (saine), DEUX corrections : ajout du trigger `updated_at` manquant (dette §8) et clarification `is_system`.

```
document_folders
  id                uuid    NOT NULL DEFAULT gen_random_uuid()   -- PK
  copro_id          uuid    NOT NULL                            -- FK copros(id) ON DELETE CASCADE
  parent_id         uuid    NULL                                -- FK document_folders(id) ON DELETE CASCADE (self)
  name              text    NOT NULL
  description       text    NULL
  icon              text    NOT NULL DEFAULT 'Folder'
  color             text    NOT NULL DEFAULT '#6B7280'
  sort_order        int4    NOT NULL DEFAULT 0
  is_system         bool    NOT NULL DEFAULT false              -- généré par create_document_system_folders
  category_default  document_category NULL
  created_by        uuid    NULL                                -- FK profiles(id) ON DELETE SET NULL
  created_at        timestamptz NOT NULL DEFAULT now()
  updated_at        timestamptz NOT NULL DEFAULT now()
```

- **PK** `id`. **UNIQUE** `(copro_id, parent_id, name)`. **FK** copro CASCADE, parent CASCADE(self), created_by SET NULL.
- **CHECK** `ck_no_self_parent CHECK (parent_id IS DISTINCT FROM id)` (NOUVEAU, anti-cycle basique).
- **Index** : pkey, unique, `(copro_id)`, `(parent_id)`, `(copro_id, parent_id, sort_order)`.
- **Triggers** : `set_updated_at` (NOUVEAU — corrige la colonne figée).

### 1.3 `document_relations` (ex-`document_links` — polymorphe TYPÉ)

Remplace `document_links` (text libre) + absorbe les 8 colonnes `*_id` de `documents`. UNE seule table de liens, **typée par enum**. *(Cible visée : absorber aussi `council_documents` via `entity_type='council'` + `documents.visibility='conseil'`, mais cette absorption est DIFFÉRÉE — la table reste propriété de 04 en faux-mort câblé jusqu'au rebranchement front/edge prouvé, cf. §7-2 et 04 §1.9.)*

```
document_relations
  id            uuid    NOT NULL DEFAULT gen_random_uuid()   -- PK
  document_id   uuid    NOT NULL                            -- FK documents(id) ON DELETE CASCADE
  copro_id      uuid    NOT NULL                            -- FK copros(id) ON DELETE CASCADE (dénormalisé pour RLS rapide)
  entity_type   document_entity_type  NOT NULL              -- ENUM NOUVEAU (voir §2)
  entity_id     uuid    NOT NULL
  relation_kind document_relation_kind NOT NULL DEFAULT 'related'  -- ENUM NOUVEAU (related/annexe/source/justificatif)
  label         text    NULL
  created_by    uuid    NULL                                -- FK profiles(id) ON DELETE SET NULL
  created_at    timestamptz NOT NULL DEFAULT now()
```

- **PK** `id`. **UNIQUE** `(document_id, entity_type, entity_id)` (idempotence du lien).
- **FK** document CASCADE, copro CASCADE, created_by SET NULL.
- **Index** : pkey, unique, `(entity_type, entity_id)` (recherche inverse « docs de cette entité »), `(copro_id)`.
- **Trigger** `trg_relation_copro_consistency` : `copro_id` de la relation = `copro_id` du document parent (intégrité). *(Note : pas de FK polymorphe possible vers `entity_id` — la cohérence de cible se valide à l'écriture via l'enum + check applicatif dans la RPC, pas par contrainte SQL.)*

`entity_id` n'est pas FK (polymorphe) — c'est le compromis assumé du polymorphisme ; l'enum `entity_type` borne les cibles légales et remplace le `text` libre qui avait produit la divergence `ag_meeting`/`ag`.

### 1.4 `document_versions` (historique — GARDÉE, devient la SEULE source de versioning)

Le verdict tranche : modèle propre, on supprime le versioning parallèle de `documents` et on garde CETTE table comme unique source. `documents.current_version_no` = pointeur sur le numéro courant ; chaque révision archive l'état précédent ici.

```
document_versions
  id              uuid    NOT NULL DEFAULT gen_random_uuid()   -- PK
  document_id     uuid    NOT NULL                            -- FK documents(id) ON DELETE CASCADE
  version_number  int4    NOT NULL
  file_path       text    NOT NULL
  file_name       text    NOT NULL
  file_size       int4    NULL
  file_hash       text    NULL
  change_summary  text    NULL
  created_by      uuid    NULL                                -- FK profiles(id) ON DELETE SET NULL
  created_at      timestamptz NOT NULL DEFAULT now()
```

- **PK** `id`. **UNIQUE** `(document_id, version_number)`. **FK** document CASCADE, created_by SET NULL.
- **CHECK** `ck_version_pos CHECK (version_number >= 1)`.
- **Index** : pkey, unique, `(document_id)`.
- **Immutabilité** : une ligne de version est un snapshot historique → trigger `trg_version_no_update` BEFORE U/D → RAISE (on n'altère pas l'historique ; on ne fait qu'ajouter). Cohérent avec l'esprit GL immuable.

### 1.5 `technical_documents` (carnet/diagnostics — double-stockage corrigé)

Correction de la dette §7 : **toujours pointer vers `documents`** (un seul magasin de fichiers). On SUPPRIME `storage_path` ; `document_id` devient NOT NULL.

```
technical_documents
  id            uuid    NOT NULL DEFAULT gen_random_uuid()   -- PK
  copro_id      uuid    NOT NULL                            -- FK copros(id) ON DELETE CASCADE
  document_id   uuid    NOT NULL                            -- FK documents(id) ON DELETE RESTRICT  (corrigé : NOT NULL, plus de storage_path)
  name          text    NOT NULL
  doc_type      technical_doc_type NOT NULL
  added_date    date    NOT NULL DEFAULT CURRENT_DATE
  validity_date date    NULL
  observations  text    NULL
  created_by    uuid    NULL                                -- FK profiles(id) ON DELETE SET NULL
  created_at    timestamptz NOT NULL DEFAULT now()
  updated_at    timestamptz NOT NULL DEFAULT now()
```

- **PK** `id`. **FK** copro CASCADE, document RESTRICT (on ne supprime pas un fichier encore référencé comme pièce technique), created_by SET NULL.
- **UNIQUE** `(copro_id, doc_type, document_id)` (anti-doublon d'entrée carnet).
- **Trigger** `trg_tech_copro_consistency` : le `document_id` doit appartenir à `copro_id`. + `set_updated_at`.
- **Index** : pkey, `(copro_id, doc_type)`, `(copro_id, validity_date) WHERE validity_date IS NOT NULL`.
- `storage_path` SUPPRIMÉ (le doc EST dans `documents`).

---

## 2. ENUMS (catalogue rationalisé — référencés, pas redéfinis)

Réutilisés tels quels (T2) : `document_category`, `document_status`, `document_source`, `technical_doc_type`.

**ENUM REMPLACÉ (A4) :** `document_confidentiality` (`public/council/manager/restricted`, ACL fine) → **abandonné** au profit de `document_visibility` (confidentialité SIMPLE, 3 niveaux, fixée par le gestionnaire).

**Rationalisations demandées sur le catalogue (T2 §1.2 + verdict §6) :**
- `document_category` : **fusionner `correspondance` → `courrier`** (synonymes) ; **retirer `carnet_entretien` et `fiche_synthetique`** du catalogue documents (ils recoupent `technical_doc_type` ; un carnet d'entretien est une entrée `technical_documents`, pas une catégorie GED). Frontière nette : `document_category` = nature du fichier GED ; `technical_doc_type` = type de pièce du carnet. **Décision unique** : ce périmètre (liste cible 17 valeurs) est la source de vérité, propagée à l'identique dans ENUMS §3.1 (plus de divergence : la liste cible y retire bien `correspondance`/`carnet_entretien`/`fiche_synthetique`). Live vérifié : **0 ligne `documents.category`** ne porte ces 3 valeurs → retrait sans perte (les 2 seules occurrences sont des `document_folders.category_default='correspondance'`, traitées par §5.1). **Impact front upload (à câbler hors-SQL)** : `UploadDocumentModal.tsx` et `ged/domain/constants.ts` exposent encore ces 3 valeurs au dropdown de catégorie → les retirer des options d'upload, sinon l'INSERT lèvera `invalid input value for enum document_category`.
**ENUM NOUVEAU `document_visibility` (A4 — confidentialité SIMPLE par document, fixée par le gestionnaire) :**
- `gestionnaire_seul` — visible du seul gestionnaire (du cabinet) — **défaut sûr**.
- `conseil` — visible du gestionnaire + des membres du conseil syndical.
- `tous_coproprietaires` — visible du gestionnaire + de TOUS les copropriétaires de la copro.
Échelle strictement ordonnée (gestionnaire_seul ⊂ conseil ⊂ tous_coproprietaires). UN seul niveau par document. Pas d'ACL par personne, pas de table `document_access`. Remap depuis le live : `public`/`tous`→`tous_coproprietaires`, `council`→`conseil`, `manager`/`restricted`→`gestionnaire_seul`.

**ENUMS NOUVEAUX à créer (remplacent le `text` libre de `document_links`) :**
- `document_entity_type` : `ag` (uniformise `ag_meeting`+`ag`), `resolution`, `service_order`, `contract`, `supplier_invoice`, `mutation`, `budget`, `lot`, `coproprietaire`, `council`, `event`, `other`. → enum unique pour le polymorphisme typé.
- `document_relation_kind` : `related`, `annexe`, `source`, `justificatif`. (couvre `related`/`annexe` live + justificatif de pièce. **`acl` retiré** : l'ACL fine n'existe plus, la confidentialité passe par `documents.visibility`.)

`council_doc_link_type` et `content_visibility` (de `council_documents`) → **CONSERVÉS tant que `council_documents` vit** (table propriété de 04 §1.9, faux-mort câblé ; 04 §2 les liste « inchangé »). Ils ne seront abandonnés (absorbés par `document_entity_type` + `visibility='conseil'`) qu'**après** le rebranchement front/edge qui permet de dropper `council_documents` (cf. §7-2 et 04 §1.9).

---

## 3. RLS — policies par table (3 rôles + bypass service_role)

**Helpers (T1 §G, gardés) :** `user_is_copro_manager(copro_id)` (gestionnaire, intègre le périmètre cabinet), `user_has_copro_access(copro_id)` (membre copro, intègre le périmètre cabinet), `user_can_view_document(doc_id)` (garde canonique **réécrite A4** : visibilité 3 niveaux + propriété de lot + appartenance conseil — **on garde celle-ci, on DROP `can_access_document` cassée**), `is_council_member(copro_id,user_id)` (rebranchement déjà acté `user_is_council_member`→`is_council_member`).

**Garde `user_can_view_document` cible (A4 — sur `documents.visibility`, plus de `document_access`) :**
```
gestionnaire du cabinet de la copro (user_is_copro_manager)          → TRUE  (voit tout)
sinon, selon documents.visibility :
  'tous_coproprietaires' → user_has_copro_access(copro_id)           (tout copropriétaire de la copro)
  'conseil'              → is_council_member(copro_id, auth.uid())
  'gestionnaire_seul'    → FALSE
```
La propriété de lot intervient pour les documents rattachés à un lot : un copropriétaire voit en plus les documents de SON lot (`lot_id ∈ ses lots via lot_owners`) ou nommément rattachés à lui (`coproprietaire_id`), QUEL que soit le niveau de visibilité — le gestionnaire ne masque pas à un copropriétaire les pièces de son propre lot. Plus de branche `document_access`.

**Principe transverse (corrige la faille §9) :** ÉCRITURE GED = **gestionnaire uniquement**. La policy live `documents_insert_members` (tout membre `authenticated` peut insérer) est **SUPPRIMÉE**. Le copropriétaire est LECTURE SEULE sur la GED, filtré par `user_can_view_document`. `anon` = aucun accès. `service_role` bypasse la RLS (post-as-you-go / edge / migration).

**Câblage préalable (dette identité) :** `coproprietaires.user_id` est NULL aujourd'hui → la branche copropriétaire de `user_can_view_document` est inerte tant que le mapping `auth.uid()` → `coproprietaires.user_id` n'est pas câblé (plan transverse domaine Identité). En attendant, seules les policies gestionnaire/service_role sont effectives ; aucune fuite (anon/copro tombent sur `false`).

| Table | SELECT | INSERT / UPDATE | DELETE | anon |
|---|---|---|---|---|
| **documents** | gestionnaire : `user_is_copro_manager(copro_id)` ; copropriétaire : `user_can_view_document(id)` | gestionnaire only : `user_is_copro_manager(copro_id)` | gestionnaire only + le trigger `prevent_protected_document_deletion` bloque les docs légaux protégés | DENY |
| **document_folders** | `user_has_copro_access(copro_id)` (lecture arbo pour tous les membres) | gestionnaire only | gestionnaire only ; `is_system=true` non supprimable (policy `USING (is_system = false)`) | DENY |
| **document_relations** | `user_can_view_document(document_id)` (hérite de l'accès au doc) | gestionnaire only | gestionnaire only | DENY |
| **document_versions** | `user_can_view_document(document_id)` | INSERT via RPC `create_document_version` only ; pas d'UPDATE/DELETE (immutable, trigger) | DENY (immutable) | DENY |
| **technical_documents** | `user_has_copro_access(copro_id)` (carnet visible des membres) | gestionnaire only | gestionnaire only | DENY |

`ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` sur les 5 tables (corrige : 6/7 désactivées en live). En dev, le toggle `_rls_state_snapshot` (hors schéma métier) gère le OFF.

`service_role` : toutes tables → policy `USING (true) WITH CHECK (true)` réservée au rôle `service_role` (bypass explicite, branche du bicéphale).

---

## 4. TRIGGERS conservés / nouveaux

**Conservés (BIEN FAIT) :**
- `calculate_document_expiration` (BEFORE I/U documents) — rétention légale par catégorie, calcule `expiration_date`/`deletion_blocked`. **Déterministe** → à rejouer à la migration.
- `prevent_protected_document_deletion` (BEFORE D documents) — bloque la suppression d'un doc légal non expiré.
- `update_document_search_text` (BEFORE I/U documents) — `to_tsvector('french', …)`.
- `set_updated_at` (consolidé, UNE fonction unique au lieu des ~8 variantes T1 §O) sur documents, document_folders, technical_documents.

**Nouveaux (comblent les dettes) :**
- `trg_documents_copro_consistency` — folder/lot/coproprietaire ∈ copro_id.
- `trg_relation_copro_consistency` — relation.copro_id = document.copro_id.
- `trg_tech_copro_consistency` — technical_documents.document_id ∈ copro_id.
- `trg_version_no_update` (BEFORE U/D document_versions) — immutabilité de l'historique.
- `trg_folders_no_delete_system` — assurée par policy RLS + check `is_system=false` au DELETE.

---

## 5. FONCTIONS du domaine — disposition

| Fonction | Disposition | Garde cible (T1) | Note |
|---|---|---|---|
| `create_document_system_folders(copro_id, user_id)` | **RÉÉCRIRE (garder)** | G-MGR (`user_is_copro_manager`), `REVOKE anon` | idempotente (ON CONFLICT). N'écrit QUE dans `document_folders` ; **ne lit ni n'écrit `dossiers`** (vérifié sur le code live, voir §9.4). Le sort de `dossiers` (DROP/rattachement, §9) ne l'impacte pas. **Réécriture OBLIGATOIRE — dépendance enum (voir §5.1) :** le seed insère `category_default='correspondance'` en dur (dossier « Correspondances », confirmé sur le code live). Or `document_category` SUPPRIME `correspondance` (fusion → `courrier`, ENUMS §3.1). Sans correctif, l'INSERT lève `invalid input value for enum document_category: "correspondance"` → **le seed système de TOUTE nouvelle copro est cassé**. Remplacer la valeur par `'courrier'` (le dossier garde son nom « Correspondances »). |
| `create_document_version(doc_id, …)` | **RÉÉCRIRE (garder)** | G-MGR | Route canonique versioning. Réécrite sur le modèle pointeur : snapshot ancien état → `document_versions`, bump `documents.current_version_no` (plus de `documents.version`/`is_current_version`). Table NON morte : c'est désormais l'UNIQUE source de versioning. |
| `generate_document_path` (4-arg, format `ged/copro/category/year/file`) | **GARDER** | G-INTERNAL, `REVOKE anon` | Format canonique unique. |
| `generate_document_path` (3-arg) | **ABANDONNER** | — | Surcharge legacy, format incompatible (drift). |
| `calculate_document_expiration` (trigger) | **GARDER** | G-TRIG (`REVOKE PUBLIC`) | |
| `update_document_search_text` (trigger) | **GARDER** | G-TRIG | |
| `prevent_protected_document_deletion` (trigger) | **GARDER** | G-TRIG | |
| `user_can_view_document(doc_id)` | **RÉÉCRIRE (A4, obligatoire AVANT DROP `document_access`)** | G-INTERNAL (DEFINER nécessaire RLS) | Garde d'accès canonique. Live : lit `documents.confidentiality` + branche `restricted` qui interroge `document_access` (`SELECT 1 FROM document_access da …`, vérifié live). Réécriture cible : remplacer `confidentiality` par `visibility` (3 niveaux), brancher conseil sur `is_council_member`, conserver l'accès lot-centric (`lot_id ∈ lot_owners` / `coproprietaire_id`), **supprimer entièrement la branche `document_access`**. Cette réécriture est un BLOC ATOMIQUE avec le `DROP TABLE document_access` (le helper CASSE sinon) — voir §7-1. |
| `can_access_document(doc_id, user_id)` | **ABANDONNER** | — | **CASSÉE** : référence `copro_members` (table inexistante) + rôles obsolètes. Doublon stale. DROP sec. |

Toutes les DEFINER d'écriture : `REVOKE EXECUTE FROM anon`, `GRANT authenticated`, garde in-function + branche `service_role` (transverse T1 §Synthèse).

### 5.1 Réécriture `create_document_system_folders` — alignement enum `document_category`

**Problème (bloquant).** Le code live du seed insère **dix dossiers racine** + sous-dossiers avec un `category_default` en dur. Une de ces valeurs, `'correspondance'` (dossier racine n°7 « Correspondances »), est **retirée** de `document_category` par la migration de l'enum (fusion `correspondance` → `courrier`, ENUMS §3.1). Tant que la fonction n'est pas réécrite, le premier appel post-migration (onboarding de N'IMPORTE QUELLE nouvelle copro) échoue avec `invalid input value for enum document_category: "correspondance"` et **aucun dossier système n'est créé**.

**Correctif.** Une seule ligne change ; le nom affiché du dossier (« Correspondances ») est conservé, seule la catégorie par défaut bascule :

```diff
-  (p_copro_id, 'Correspondances', 'Mail', '#EC4899', 7, true, 'correspondance', p_user_id),
+  (p_copro_id, 'Correspondances', 'Mail', '#EC4899', 7, true, 'courrier', p_user_id),
```

Les neuf autres valeurs (`pv_ag`, `reglement`, `contrat`, `facture`, `diagnostic`, `plan`, `ordre_service`, `budget`, `photo`) + celles des sous-dossiers (`assurance`, `devis`, `appel_fonds`, `releve_charges`, `etat_date`) restent **toutes valides** dans `document_category` cible (vérifié contre la liste ENUMS §3.1) → rien d'autre à toucher. La fonction reste idempotente (`ON CONFLICT DO NOTHING`) et n'écrit que dans `document_folders`.

**Ordre de déploiement (sinon échec garanti) :** migrer l'enum `document_category` (ajout `courrier` / retrait `correspondance`) **PUIS** remplacer la fonction. Inverser l'ordre laisse une fenêtre où le seed insère encore `'correspondance'`. La dépendance est signalée symétriquement dans ENUMS §3.1.

---

## 5 bis. VUES DU DOMAINE — disposition

Recensement des vues vivantes (schéma `public`) câblées au domaine GED, pour qu'aucune vue lue par le front ne reste sans disposition explicite.

| Vue | Lecteur câblé (preuve) | Disposition | Note |
|---|---|---|---|
| `v_document_versions` | `lib/documents/api.ts` l.408 (`getDocumentVersions`) — faux-mort câblé T3-B (0 ligne en base) | **RÉÉCRIRE (en bloc avec la table de versioning cible)** | La vue dérivait l'historique de l'ancien versioning parallèle (`documents.version`/`is_current_version`/`parent_document_id`), **supprimé** au schéma cible (§1.1). Elle doit être réécrite pour lire l'**unique source** `document_versions` (§1.4) + le pointeur `documents.current_version_no`, en cohérence avec la réécriture de `create_document_version` (§5). Réécriture **en un bloc cohérent** (table + RPC + vue + front `getDocumentVersions`), conformément à l'arbitrage §7-4. |

Aucune autre vue n'est câblée au domaine GED (le live n'expose pas de `v_documents_*` lue par le front au-delà de `v_document_versions`). `v_mutation_detail` (lue par le front via `lib/sales/api.ts`) relève du **domaine 05** et y est disposée (cf. 05 §5 bis).

---

## 6. CARTE DE MIGRATION (boucle d'or 22222222 + immuable 11111111)

Périmètre : 51 docs (43 + 8), 4 dossiers manuels, 29 liens. 0 ligne pour document_access / document_versions / technical_documents / council_documents → rien à reprendre.

**`documents` (51 → cible) :**
- Repris : id, copro_id, file_name, file_path, file_size, mime_type, title, description, category, tags, document_date, year, status, **visibility (← remap `confidentiality` : public/tous→`tous_coproprietaires`, council→`conseil`, manager/restricted→`gestionnaire_seul`)**, source_module, folder_id, is_starred, is_archived, archived_at, created_by, created_at, updated_at.
- `category` : remapper `correspondance` → `courrier` (aucune occurrence dans les 51, mapping de sûreté) ; `carnet_entretien`/`fiche_synthetique` → si présent, basculer en `technical_documents` (aucune occurrence ici → no-op).
- `current_version_no` ← `documents.version` (toutes valent 1).
- `expiration_date` / `deletion_blocked` : **NE PAS reprendre les valeurs** → recalculées par `calculate_document_expiration` (déterministe).
- `search_text` : **NE PAS reprendre** → régénéré par trigger.
- **NON repris (dette legacy)** : `ag_id, resolution_id, service_order_id, contract_id, invoice_id, mutation_id, dossier_id, budget_id` (le seul `service_order_id` peuplé → recréé comme `document_relations(entity_type='service_order')`), `parent_document_id`, `is_current_version`, `version` (remplacé par current_version_no).
- Dédup : `file_path` 100 % distincts → la nouvelle UNIQUE `(copro_id, file_path)` passe sans conflit.

**`document_folders` :** ne PAS migrer les 52 `is_system=true` (26+26) → **régénérés** par `create_document_system_folders` à l'onboarding des 2 copros. Migrer **uniquement les 4 dossiers manuels** de 11111111 (`is_system=false`) : id, copro_id, parent_id, name, description, icon, color, sort_order, category_default, created_by, created_at. ⚠️ `category_default` : remapper `correspondance` → `courrier` (live = **2 dossiers système** portent cette valeur ; non bloquant ici car ces dossiers système sont régénérés, mais la fonction réécrite (§5.1) doit l'être AVANT toute régénération post-migration de l'enum).

**`document_links` → `document_relations` (29 lignes) :** uniformiser `entity_type` : `ag_meeting`→`ag`, `ag`→`ag` ⇒ tous `entity_type='ag'`. `link_type` : `related`→`relation_kind='related'`, `annexe`→`relation_kind='annexe'`. Renseigner `copro_id` ← `documents.copro_id` du parent. Valider chaque `entity_id` contre `ag_meetings` ; écarter (log) tout lien orphelin.

**Vigilance Storage :** `file_path` pointe le bucket — la reprise métadonnées doit rester cohérente avec les objets réels (hors SQL, à coordonner).

---

## 7. ARBITRAGES OUVERTS (confirmation utilisateur)

1. **`document_access` (table) — TRANCHÉ : DROP (A4, décision USER verrouillée).** 0 ligne, ACL fine jamais exercée. Décision : **confidentialité SIMPLE** par document via `documents.visibility` (3 niveaux fixés par le gestionnaire) ; `DROP TABLE document_access`. Plus d'arbitrage ouvert.
   ⚠️ **Séquençage obligatoire (le DROP n'est PAS sec — bloc atomique).** `document_access` est un faux-mort câblé : (a) `user_can_view_document` la lit dans sa branche `restricted` (`SELECT 1 FROM document_access da …`, vérifié live) ; (b) l'edge `get_document_url` la lit aussi (l.115, vérifié). **Ordre :** (1) migrer l'enum (`document_visibility` créé, `documents.confidentiality`→`documents.visibility` avec remap public/manager/restricted/council → 3 niveaux, cf. ENUMS §2) ; (2) réécrire `user_can_view_document` sur `visibility` + lot-centric, branche `document_access` supprimée (§5) ; (3) rebrancher l'edge `get_document_url` sur le même mécanisme (hors-SQL) ; (4) **alors seulement** `DROP TABLE document_access`. **Impact front (hors-SQL) :** le sélecteur de confidentialité d'upload doit exposer les 3 niveaux `gestionnaire_seul`/`conseil`/`tous_coproprietaires` et retirer tout grain ACL par personne.

2. **`council_documents` (table) — DIFFÉRER l'absorption (TRANCHÉ : propriété → domaine 04).** 0 ligne, recoupe `document_relations` + `visibility='conseil'`. La cible visée reste de modéliser le lien doc↔conseil par `document_relations(entity_type='council')` + `visibility='conseil'`. ⚠️ MAIS la table est câblée front (`useConseilSyndicalPage`, `lib/council/api`) + edge `council-workflow` l.407 (T3 §B) → **le DROP exige un rebranchement front/edge prouvé d'abord**. **Décision (alignée avec 04 §1.9) : NE PAS absorber maintenant.** Le domaine **04 reste propriétaire** de `council_documents` et la conserve en **faux-mort câblé** ; le domaine 06 n'en DROP rien tant que le rebranchement n'est pas prouvé iso-comportement. L'absorption dans `document_relations` ne s'exécute qu'**après** ce rebranchement. → **plus d'arbitrage ouvert ici : voir 04 §1.9 (point de décision unique).**

3. **Lien `documents.dossier_id` — DROP du lien (tranché, fait).** `dossiers` a 12 lignes (module tâches kanban) mais **0 document ne pointe dessus** → le lien doc↔dossier est mort. La colonne `documents.dossier_id` est **supprimée** dans le schéma cible (§1.1). Côté GED, plus aucune dépendance à `dossiers` : la fonction `create_document_system_folders` n'a JAMAIS lu cette table (vérifié sur le code live — elle n'écrit que dans `document_folders`, voir §5). **Le lien est donc clos sans dette.**

   **Sort de la TABLE `dossiers` elle-même — TRANCHÉ : DROP (A5).** L'arbitrage `05-A3` (« domaine tâches-gestion ou drop ») est résolu : décision USER verrouillée = **`DROP TABLE dossiers`** (pas de module tâches). Détail au §9 ci-dessous. Aucun impact résiduel sur la GED.

4. **`document_versions` — TRANCHÉ : source UNIQUE de versioning (A9, décision USER verrouillée).** Aucune version n'existe en base. Décision : `document_versions` devient l'unique source ; le versioning parallèle de `documents` (`version`/`is_current_version`/`parent_document_id`) est supprimé. Risque nul côté données (0 ligne). Mise en œuvre en **BLOC ATOMIQUE** : table `document_versions` (§1.4) + RPC `create_document_version` réécrite sur le modèle pointeur (§5) + vue `v_document_versions` réécrite (§5 bis) + front `getDocumentVersions` (`lib/documents/api.ts`). Plus d'arbitrage ouvert.

5. **Frontière `category` / `technical_doc_type` — TRANCHÉ (décision unique §2).** Retrait de `carnet_entretien`/`fiche_synthetique` de `document_category` (recoupent `technical_doc_type`). Live : 0 occurrence sur `documents.category` → remap = no-op (toute entrée résiduelle bascule en `technical_documents`). Propagé à l'identique dans ENUMS §3.1 (liste cible 17 val.). Impact front upload confirmé (`UploadDocumentModal.tsx`, `ged/domain/constants.ts` proposent encore ces options) → à retirer du dropdown lors du câblage front, hors-SQL. Plus d'ambiguïté de périmètre : cet arbitrage est clos.

---

## 8. NOTE FINANCE (hors périmètre)

*(Le pendant finance « 6 écritures sur compte parent 450 sans lot_id » cité en exemple de consigne relève du domaine Finance, hors périmètre Documents/GED — non traité ici.)*

---

## 9. DÉCISION TRANSVERSE — sort de la table `dossiers` (point de décision unique)

> **Pourquoi cette section existe.** La table `dossiers` était revendiquée puis écartée par DEUX domaines sans qu'aucun ne la possède : le juridique (`05 §0`, arbitrage `05-A3`) et les documents (`06 §7-3`). **Cette section ferme l'arbitrage** : décision USER verrouillée (A5) = **DROP** (pas de module tâches). `05-A3` est résolu ici et le domaine Documents ne revendique PAS cette table.

### 9.1 Faits live qui tranchent (vérifiés en lecture seule)

| Fait | Valeur réelle | Conséquence |
|---|---|---|
| Rôle | Module **tâches/kanban** (statut `A_FAIRE`/…, priorité, deadline, catégorie) | Sans rapport avec la GED. Aucun document ne la référence (`dossier_id` mort). |
| `id` | **`text`** (`'dossier-'\|\|epoch\|\|random`) | **Anti-pattern** : non-uuid, non-séquentiel, collision random possible. Incohérent avec le reste du schéma cible (PK `uuid`). |
| `copro_id` | `uuid NOT NULL` | La donnée EST cloisonnable par copro (le câblage RLS est juste absent). |
| RLS | 4 policies **`USING/CHECK (true)`** pour `authenticated` | **FAILLE** : tout utilisateur authentifié lit/écrit/supprime les tâches de **TOUTES** les copros. À ne JAMAIS reproduire tel quel. |

### 9.2 Décision — **DROP `dossiers`** (A5, décision USER verrouillée)

Le module tâches/kanban n'est **PAS** au périmètre (finance-first ; A5 : « DROP dossiers, pas de module tâches »). **Décision finale : `DROP TABLE dossiers`** lors de la re-baseline. Plus d'option alternative, plus d'arbitrage ouvert.
- **Migration** : aucune reprise (12 lignes de tâches de démo sur la copro immuable 11111111, sans valeur métier ; de toute façon la copro-template part de zéro, A1). Ligne de migration = `-- dossiers : DROP, non repris (module kanban hors périmètre, A5)`.
- **Front/edge à retirer en même temps (hors-SQL)** : grep `dossiers` / `kanban` / `tâches` côté `lib/` et `app/(dashboard)` → supprimer l'écran kanban mort et ses appels avec la table.

→ Le domaine Documents/GED est neutre : il a déjà coupé tout lien (colonne `dossier_id` supprimée du schéma cible §1.1, fonction système indépendante §9.4).

### 9.4 Confirmation `create_document_system_folders` ↔ `dossiers`

**Vérifié sur le code live de la fonction** : `create_document_system_folders(p_copro_id, p_user_id)` n'effectue QUE des `INSERT … ON CONFLICT DO NOTHING` dans `document_folders` (arbo système + sous-dossiers). **Elle ne lit ni n'écrit jamais `dossiers`.** L'affirmation §5 (« Ne dépend plus de `dossiers` ») est donc factuellement vraie ; pour lever l'ambiguïté (« plus » suggérait une dépendance passée), la note §5 est reformulée en « ne dépend pas de `dossiers` (vérifié) ». Le DROP/rattachement de `dossiers` (9.2/9.3) n'a **aucun impact** sur cette fonction.
