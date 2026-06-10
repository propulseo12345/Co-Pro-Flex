# Domaine 06 — Documents / GED / Versioning

> Cartographie LIVE (lecture seule) — project `iyfesbjnkpynmwlsmxnp` — 2026-06-04
> Périmètre : `documents`, `document_folders`, `document_links`, `document_access`, `document_versions`, `technical_documents` (+ `council_documents` réassigné, voir §0).

## 0. Périmètre & réassignations

| Table | Lignes | RLS activé | Policies | Verdict appartenance |
|---|---|---|---|---|
| `documents` | **51** (43 sur 11111111, 8 sur 22222222) | ❌ non | 5 | Cœur du domaine. VIVANTE. |
| `document_folders` | **56** (30 sur 11111111, 26 sur 22222222) | ❌ non | 4 | Cœur du domaine. VIVANTE. |
| `document_links` | **29** | ❌ non | 2 | Domaine. VIVANTE. |
| `document_access` | **0** | ❌ non | 3 | Domaine (ACL fine). VIDE. |
| `document_versions` | **0** | ❌ non | 2 | Domaine (versioning). VIDE. |
| `technical_documents` | **0** | ✅ **oui** | 4 | Domaine (carnet/diagnostics). VIDE. |
| `council_documents` | **0** | ❌ non | 3 | **AJOUTÉ au périmètre** — table de jointure doc↔conseil syndical, naturellement GED. Frontière partagée avec domaine « Conseil syndical ». VIDE. |

Tables-graines confirmées complètes. Pas de table manquante détectée (pas de `attachments`/`storage`/`upload` séparée — tout passe par `documents`). `mail_folders` appartient au domaine Messagerie (exclu). `profiles` est transverse.

**Note RLS (cadre dev volontaire, MEMORY)** : RLS désactivé sur 6/7 tables alors que les policies EXISTENT. En prod le cadre exige RLS activé partout → il faudra `ENABLE ROW LEVEL SECURITY` sur les 6 et auditer les policies (voir §3, défaut majeur sur `documents_insert_members`).

---

## 1. STRUCTURE LIVE (par table)

### 1.1 `documents` (40 colonnes — table maîtresse)

| Col | Type | Null | Défaut |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| copro_id | uuid | NO | — → `copros(id)` ON DELETE CASCADE |
| lot_id | uuid | YES | — → `lots(id)` ON DELETE SET NULL |
| coproprietaire_id | uuid | YES | — → `coproprietaires(id)` ON DELETE SET NULL |
| file_name | text | NO | — |
| file_path | text | NO | — (chemin storage) |
| file_size | int4 | YES | — |
| mime_type | text | YES | — |
| category | document_category | YES | 'autre' |
| title | text | YES | — |
| description | text | YES | — |
| tags | _text (text[]) | YES | — (index GIN) |
| document_date | date | YES | — |
| year | int4 | YES | — |
| created_by | uuid | YES | → `profiles(id)` |
| created_at / updated_at | timestamptz | NO | now() |
| is_archived | bool | YES | false |
| archived_at | timestamptz | YES | — |
| folder_id | uuid | YES | → `document_folders(id)` ON DELETE SET NULL |
| status | document_status | YES | 'active' |
| confidentiality | document_confidentiality | YES | 'public' |
| source_module | document_source | YES | 'manual' |
| ag_id | uuid | YES | — *(pas de FK)* |
| resolution_id | uuid | YES | — *(pas de FK)* |
| service_order_id | uuid | YES | — *(pas de FK)* |
| contract_id | uuid | YES | — *(pas de FK)* |
| invoice_id | uuid | YES | — *(pas de FK)* |
| mutation_id | uuid | YES | — *(pas de FK)* |
| dossier_id | uuid | YES | — *(pas de FK)* |
| budget_id | uuid | YES | → `budgets(id)` ON DELETE SET NULL *(seule FK des 8 « id liens »)* |
| retention_years | int4 | YES | 10 |
| expiration_date | date | YES | — (calculée par trigger) |
| deletion_blocked | bool | YES | false |
| version | int4 | YES | 1 |
| parent_document_id | uuid | YES | → `documents(id)` (self, pas d'action) |
| is_current_version | bool | YES | true |
| search_text | tsvector | YES | — (index GIN, alimenté par trigger) |
| file_hash | text | YES | — |
| is_starred | bool | NO | false |

**PK** id. **FK** : copro_id, lot_id, coproprietaire_id, created_by, folder_id, parent_document_id, budget_id.
**CHECK / UNIQUE** : aucune (pas d'unicité sur (copro_id, file_path) ni sur hash → doublons possibles).
**Index** (17) : pkey + copro_id, lot_id, coproprietaire_id(partiel), folder, category, status, year, created_at DESC, confidentiality(copro_id,confidentiality), contract(partiel), service_order(partiel), ag(partiel), budget, starred(partiel WHERE is_starred), tags GIN, search GIN.
**Triggers** : `on_documents_updated` (BEFORE UPDATE → handle_updated_at), `trg_document_expiration` (BEFORE INS/UPD → calculate_document_expiration), `trg_document_search_text` (BEFORE INS/UPD → update_document_search_text), `trg_prevent_document_deletion` (BEFORE DELETE → prevent_protected_document_deletion).
**Vues lectrices** : v_accessible_documents, v_documents_by_category, v_documents_expiring, v_documents_stats, v_documents_with_folder, v_recent_documents, v_dashboard_recent_activity.

### 1.2 `document_folders` (13 colonnes — arborescence)
id(pk) · copro_id NO →copros CASCADE · parent_id YES →self CASCADE · name NO · description · icon ('Folder') · color ('#6B7280') · sort_order (0) · is_system (false) · category_default (document_category) · created_at/updated_at NO now() · created_by →profiles.
**UNIQUE** (copro_id, parent_id, name). **Index** : pkey, unique, copro, parent, hierarchy(copro_id,parent_id,sort_order). **Triggers** : aucun (⚠️ pas de maj `updated_at`). **Vues** : v_folders_with_counts, v_documents_with_folder.
Données : 52/56 `is_system=true` (générées par `create_document_system_folders`), 4 manuelles.

### 1.3 `document_links` (7 colonnes — polymorphe doc↔entité)
id(pk) · document_id NO →documents CASCADE · entity_type **text** NO · entity_id uuid NO · link_type text ('related') · created_at NO · created_by →profiles.
**UNIQUE** (document_id, entity_type, entity_id). **Index** : pkey, unique, document, entity(entity_type,entity_id).
⚠️ Polymorphe NON typé : `entity_type`/`link_type` sont des `text` libres, pas d'enum, pas de FK. Valeurs live incohérentes : entity_type ∈ {`ag_meeting`×27, `ag`×2} — deux noms pour la même chose. link_type ∈ {`related`×27, `annexe`×2}.

### 1.4 `document_access` (11 colonnes — ACL fine, VIDE)
id(pk) · document_id NO →documents CASCADE · user_id →profiles CASCADE · coproprietaire_id →coproprietaires CASCADE · lot_id →lots CASCADE · can_view (true) · can_download (true) · can_edit (false) · granted_at NO now() · granted_by →profiles · expires_at.
**CHECK** : au moins un de (user_id, coproprietaire_id, lot_id) non null. **Index** : pkey, document, user(partiel), copro(partiel).
0 ligne : mécanisme `confidentiality='restricted'` jamais exercé.

### 1.5 `document_versions` (10 colonnes — historique, VIDE)
id(pk) · document_id NO →documents CASCADE · version_number int NO · file_path NO · file_name NO · file_size · file_hash · change_summary · created_at NO · created_by →profiles.
**UNIQUE** (document_id, version_number). **Index** : pkey, unique, document. **Vues** : v_document_versions.
0 ligne : versioning jamais déclenché en live (alors que `documents.version` existe en parallèle, voir §3).

### 1.6 `technical_documents` (12 colonnes — carnet/diagnostics, VIDE, RLS ✅)
id(pk) · copro_id NO →copros CASCADE · name NO · doc_type **technical_doc_type** NO · added_date NO CURRENT_DATE · validity_date · document_id YES →documents (pas d'action) · storage_path · observations · created_at/updated_at NO · created_by →profiles.
**Index** : pkey, copro, type(copro,doc_type), validity(partiel). **Trigger** : updated_at. Seule table RLS-activée.
⚠️ Redondance : porte SOIT `document_id` (→GED) SOIT `storage_path` (fichier propre) — deux chemins de stockage concurrents.

### 1.7 `council_documents` (10 colonnes — jointure doc↔conseil, VIDE)
id(pk) · copro_id NO →copros CASCADE · document_id NO →documents CASCADE · visibility **content_visibility** NO ('council_only') · linked_type **council_doc_link_type** · linked_id uuid · label · notes · created_by NO →profiles · created_at NO.
**UNIQUE** (copro_id, document_id). **Index** : pkey, unique, copro.
⚠️ Recoupe `document_links` (lien polymorphe) + `documents.confidentiality='council'` : **3e** mécanisme pour exprimer « doc réservé au conseil ».

### Enums du domaine
- `document_category` (20) : pv_ag, convocation, reglement, contrat, facture, devis, diagnostic, assurance, budget, appel_fonds, releve_charges, etat_date, courrier, photo, plan, autre, ordre_service, **correspondance** (doublon de courrier ?), carnet_entretien, fiche_synthetique.
- `document_status` (4) : draft, active, archived, expired.
- `document_confidentiality` (4) : public, council, manager, restricted.
- `document_source` (6) : ag, finance, maintenance, communication, legal, manual.
- `technical_doc_type` (19) : dta, dpe_collectif, diagnostic_plomb/electricite/gaz, carnet_entretien, controle_ascenseur/chaufferie/incendie/jeux, garantie_decennale/biennale, plan_copropriete, reglement_copropriete, etat_descriptif, ppt, dtg, audit_energetique, autre.
- `content_visibility` (3) : all_members, council_only, managers_only.
- `council_doc_link_type` (6) : contract, service_order, ag, invoice, budget, other.

---

## 2. CONTRAT FONCTIONNEL

| Fonction | Signature (args) | Sécu | Lit / Écrit |
|---|---|---|---|
| `create_document_version` | (doc_id, new_file_path, new_file_name, new_file_size, new_file_hash, change_summary?, user_id?) → uuid | INVOKER | **R** documents · **W** document_versions (snapshot ancienne), **U** documents (file_*, version+1). Route canonique du versioning. |
| `create_document_system_folders` | (copro_id, user_id?) → void | INVOKER | **W** document_folders (10 racines + sous-dossiers AG/Contrats/Factures/Compta, ON CONFLICT DO NOTHING). Appelée à l'onboarding copro. |
| `generate_document_path` (v1) | (copro_id, category, filename) → text | INVOKER | pur : `copro/category/year/uuid.ext`. |
| `generate_document_path` (v2) | (copro_id, category, year?, file_name?) → text | INVOKER IMMUTABLE | pur : `ged/copro/category/year/file`. **⚠️ 2 surcharges, formats DIFFÉRENTS** (un `ged/` préfixe, l'autre non ; un uuid, l'autre file_name). Drift. |
| `user_can_view_document` | (doc_id) → bool | DEFINER STABLE | **R** documents, coproprietaires, document_access (+ helpers user_is_copro_manager/has_copro_access/is_council_member/is_lot_owner, lot_owners). **À JOUR** (utilise memberships/lot_owners). Garde RLS canonique. |
| `can_access_document` | (doc_id, user_id) → bool | DEFINER | **R** documents, **`copro_members`**, council_members, document_access. ⚠️ **DRIFT/MORTE** : référence `copro_members` (table inexistante) + `cm.role IN ('manager','admin')` (rôles obsolètes vs membership_role). Doublon stale de `user_can_view_document`. |
| `calculate_document_expiration` | trigger | INVOKER | **W** NEW.retention_years/expiration_date/deletion_blocked selon category. Logique de rétention légale (pv_ag/contrat→protégé). |
| `prevent_protected_document_deletion` | trigger | INVOKER | **R** OLD.deletion_blocked/expiration_date → RAISE si protégé et non expiré. |
| `update_document_search_text` | trigger | INVOKER | **W** NEW.search_text = to_tsvector('french', file_name+title+description+tags). |
| `create_etat_date_snapshot` | (copro_id, mutation_id, snapshot_type) → … | DEFINER | écrit un doc d'état daté (frontière Mutations — voir domaine Mutations). |
| `create_ag_notification` | (…, p_document_id) → … | DEFINER | consomme document_id (frontière Notifications/AG). |

**Contrat que le schéma cible doit honorer** : (a) versioning via `create_document_version` (snapshot+bump) ; (b) génération d'arbo système à l'onboarding ; (c) rétention/protection légale auto par catégorie ; (d) recherche plein texte FR ; (e) garde d'accès `user_can_view_document` lot/conseil/restricted.

---

## 3. VERDICT QUALITÉ : **À REPENSER** (moitié bien conçu, mais incohérences structurelles fortes)

Raison principale : **le modèle multiplie les mécanismes redondants pour les mêmes besoins (liaison, confidentialité, versioning, stockage) sans en imposer un seul**, et porte une dénormalisation lourde (8 colonnes de liens FK-less sur `documents`).

**Défauts concrets (preuves) :**
1. **Versioning schizophrène.** `documents.version` + `documents.is_current_version` + `documents.parent_document_id` (auto-référence) COEXISTENT avec la table `document_versions`. La fonction canonique n'utilise QUE `documents.version` + `document_versions` ; `is_current_version`/`parent_document_id` ne sont écrits par aucune fonction → **colonnes mortes**. `document_versions` = 0 ligne (jamais exercé).
2. **Liaison doc↔entité éclatée en 3 systèmes** : (a) 8 colonnes `*_id` dénormalisées sur `documents` (ag_id, resolution_id, service_order_id, contract_id, invoice_id, mutation_id, dossier_id, budget_id), dont **7 sans FK** (intégrité non garantie) ; (b) `document_links` polymorphe text non typé ; (c) `council_documents`. Cible : UNE table de liens polymorphe typée (enum entity_type) + retirer les colonnes `*_id` de `documents`.
3. **Confidentialité exprimée 3× :** enum `documents.confidentiality`, table `document_access`, table `council_documents` (+ enum `content_visibility`). À unifier.
4. **Drift fonctions** : `can_access_document` lit `copro_members` (table inexistante) et des rôles `'manager'/'admin'` ≠ `membership_role` → fonction CASSÉE si appelée. `user_can_view_document` est la version correcte → `can_access_document` à DROP. Les 2 surcharges `generate_document_path` produisent des chemins incompatibles (`ged/…` vs `…`).
5. **Incohérence de données live** : `document_links.entity_type` = `ag_meeting` (27) vs `ag` (2) pour la même cible → pas d'enum = valeurs libres divergentes.
6. **Enum `document_category` pollué** : `courrier` ET `correspondance` (synonymes), `carnet_entretien`/`fiche_synthetique` qui recoupent `technical_doc_type`. Frontière documents↔technical_documents floue.
7. **`technical_documents` à double stockage** (`document_id` OU `storage_path`) → devrait toujours pointer vers `documents` (1 seul magasin de fichiers).
8. **Contraintes manquantes** : aucune UNIQUE sur (copro_id, file_path) ni sur file_hash → doublons de fichiers non bloqués. `document_folders` sans trigger `updated_at` (colonne présente mais figée).
9. **Faille RLS** : policy `documents_insert_members` (role `authenticated`) autorise TOUT membre (y compris copropriétaire) à insérer un document dès qu'il appartient à la copro — contredit le cadre « écriture GED = gestionnaire ». À retirer/restreindre en prod. RLS par ailleurs désactivé sur 6/7 tables (dev OK, mais à activer en prod).

**Ce qui est BIEN FAIT (à conserver)** : rétention légale auto par catégorie + blocage suppression (`calculate_document_expiration` / `prevent_protected_document_deletion`) — vraie valeur métier copro ; recherche tsvector FR ; indexation riche et pertinente (partiels, GIN tags/search) ; arbo système cohérente et idempotente ; `user_can_view_document` propre et aligné (lot_owners/memberships). La table `documents` elle-même (cœur fichier+métadonnées+rétention) est saine ; ce sont ses *satellites* qui doivent être rationalisés.

---

## 4. CANDIDATS MORTS / DOUBLONS (à confirmer transverse)

| Objet | Statut | Raison |
|---|---|---|
| `can_access_document(uuid,uuid)` | **MORTE** | Référence `copro_members` (table inexistante) + rôles obsolètes. Doublon de `user_can_view_document`. À DROP. |
| `documents.is_current_version` | **COLONNE MORTE** | Écrite par aucune fonction ; versioning gère via document_versions. |
| `documents.parent_document_id` | **COLONNE QUASI-MORTE** | Self-FK jamais peuplée par les fonctions ; redondante avec document_versions. |
| `documents.resolution_id / dossier_id / mutation_id` | suspects | FK-less, à vérifier usage côté app (probable 0 ligne non-null). |
| `generate_document_path` (1 des 2 surcharges) | **DOUBLON** | Garder une seule (format `ged/…`). |
| `document_access` (table) | VIDE | Mécanisme `restricted` jamais utilisé — garder si cible conserve ACL fine, sinon fusionner. |
| `document_versions` (table) | VIDE | 0 ligne, mais c'est le bon modèle de versioning → garder, supprimer les colonnes versioning parallèles de `documents`. |
| `council_documents` (table) | VIDE | Recoupe document_links + confidentiality. Candidat fusion. |
| `documents.category` valeurs `courrier`/`correspondance` | DOUBLON enum | Fusionner. |

---

## 5. MIGRATION (données à reprendre)

**Tables porteuses (uniquement copro 11111111 immuable + 22222222 boucle d'or) :**
- `documents` : 51 lignes (43 sur 11111111, 8 sur 22222222). source_module : ag×31, manual×15, maintenance×3, finance×2. **À migrer** en mappant les 8 colonnes `*_id` vers la future table de liens polymorphe ; recalculer `expiration_date`/`deletion_blocked` via le nouveau trigger (déterministe) ; régénérer `search_text` ; abandonner `is_current_version`/`parent_document_id` (non peuplés).
- `document_folders` : 56 lignes (30/26). Les `is_system=true` (52) sont **régénérables** par `create_document_system_folders` → ne PAS migrer, recréer. Migrer seulement les 4 dossiers manuels (`is_system=false`).
- `document_links` : 29 lignes. **Normaliser à la reprise** : `entity_type` `ag_meeting`→`ag` (uniformiser), valider chaque (entity_type, entity_id) contre la cible.
- `document_access`, `document_versions`, `technical_documents`, `council_documents` : **0 ligne → rien à migrer.**

**Vigilance** : `documents.file_path` pointe vers le bucket Storage — la migration métadonnées doit rester cohérente avec les objets Storage réels (hors périmètre SQL, à coordonner). Aucune UNIQUE sur file_path aujourd'hui → dédupliquer avant reprise.
