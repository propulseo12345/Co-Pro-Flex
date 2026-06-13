# PROGRESS — J2-bis lot 4 : GED avancée — LIVRÉ (PR en revue 2026-06-13)

> **État : implémenté sur `j2bis-lot4-ged` (4 commits : 0052 db+gate, traduction
> écritures+edge, pv_templates réel, purge). 17/17 gates, tsc 0, vitest OK.**
> Découvertes en cours de route : edge get_document_url 100% cassée (colonne
> confidentiality → réparée sur visibility) ; generateTemplateId non-uuid ;
> hooks templates sur MOCK_ORG_ID → câblés CoproContext/session.
> **DETTE TRACÉE (hors lot)** : badges liens/versioning des composants GED
> (DocumentGrid/List/LinkModal/ViewerModal) lisent les services MOCK
> document-linking/document-versioning — INERTES avec des uuids réels (retournent
> vide), à rebrancher à la passe « purge mock » ou J10. AccessBadge/onAccessRights
> idem (modèle ACL abandonné).

# Design d'origine (audit agent + vérifs main, 2026-06-13)

> Méthode lot 2/3 : vues de compat (contrat = ancien types 5c8209e) + gate + rebranch
> front + purge code mort. Schéma canonique : `documents` + `document_folders` +
> `document_relations` + bucket storage `ged` (0048).

## Verdicts par objet (audit appelants RÉELS)

| Objet | Verdict | Détail |
|---|---|---|
| `ged` (table) | ✅ RIEN À FAIRE | tous les `.from('ged')` sont du **storage** (bucket 0048) |
| 6 vues `v_documents_*`/`v_folders_with_counts`/`v_recent_documents` | (a) vues compat | contrat = ancien types (extrait ci-dessous) ; lecteurs : lib/documents/api.ts → useGedPageSupabase → page GED |
| `v_document_versions` | (a) 7ᵉ vue compat **hors liste initiale** | lib/documents/api.ts:408 (getDocumentVersions) ; canonique = `current_version_no` (pas de table versions ? vérifier document_versions dans base — table morte à drop selon audit v1) |
| `document_links` | (b) rebranch → `document_relations` | 5 call-sites : lib/documents/api.ts:519,533,544 + useConvocationDocuments.ts:75,182 ; mapper link_type→relation_kind ('main'→'source'? vérifier valeurs front réelles), copro_id requis ; **convocation AG annexes = flux cassé aujourd'hui** |
| `document_access` | (d) purge | grant/revokeDocumentAccess sans appelant UI ; modèle remplacé par documents.visibility + RLS ; purger aussi le check dans edge get_document_url:115 (fallback silencieux ?) |
| `pv_templates` | (c) TABLE à créer | vraie feature (éditeur templates PV, usePVTemplates/useTemplateEditor/useTemplatesPage + pv-generation) ; colonnes : organization_id (=copro_id ? multi-cabinet à trancher), name, description, status draft/active/archived, is_default, is_system_template, spec jsonb, usage_count, created_by/at, updated_at, last_modified_by + RLS |
| `dossiers` | (d) DÉBRANCHER la page | décision 0020 §A5 : table JAMAIS créée dans le build neuf ; useDossiers a un fallback empty → retirer page + hook + entrée nav (à confirmer DECISIONS_AUTONOMIE) |

## Pièges de mapping canonique → legacy (vues compat)

- `confidentiality` (legacy public/council/manager/restricted) ← `visibility`
  (tous_coproprietaires/conseil/gestionnaire_seul) : mapper tous→public, conseil→council,
  gestionnaire_seul→manager ; 'restricted' n'existe plus (ne jamais produire).
- `is_current_version` ← constante `true` (le canonique ne garde que la version courante,
  `current_version_no`) ; `version` ← `current_version_no`.
- Colonnes FK legacy (ag_id, contract_id, invoice_id, mutation_id, resolution_id,
  service_order_id, dossier_id, parent_document_id) : exposer NULL (ou pivot
  document_relations si un lecteur s'en sert RÉELLEMENT — vérifier au moment du front).
- `source_module` : enums divergents (legacy ag/finance/maintenance/communication/legal/manual
  vs canonique document_source_module — lister les valeurs réelles avant cast).
- v_documents_stats : compte par catégories pv_ag/contrat/facture/diagnostic (enum canonique OK)
  + expiring_soon 30j ; v_documents_expiring : fenêtre 90j + days_until_expiration.

## Écritures à TRADUIRE (chasser les casts, méthode drift_repair)

- `createDocument`/`uploadDocument` (api.ts:320/421) : insèrent le payload LEGACY dans
  `documents` (confidentiality/version/is_current_version/ag_id…) → **upload GED cassé**.
  Traduire : visibility (map inverse), title/file_*/category/tags/document_date/year,
  source_module, folder_id ; relations → insert `document_relations` séparé.
- `updateFolder`/`createFolder` : vérifier colonnes vs document_folders (description/icon/color OK).
- `linkDocumentToEntity` → insert document_relations (copro_id obligatoire — dériver du document).
- useConvocationDocuments : lecture annexes via document_relations (entity_type='ag',
  relation_kind='annexe') + delete ciblé.

## Découpage exécution (branche j2bis-lot4-ged)

1. Migration 0052 : 7 vues compat + table pv_templates + RLS + seed template système ?
   (décision : pas de seed, le service a un fallback statique getDefaultTemplateSpec).
2. Gate gate_0052_ged (contrats stricts ×7 + valeurs : counts folders, stats par catégorie,
   expiring 30/90j, mapping confidentiality, pv_templates CRUD + RLS register/refus).
3. Front : traduction écritures api.ts + rebranch document_links + purge document_access
   + débranchage page dossiers + purge StatusUpdateModal (mort, retour 0047).
4. tsc + vitest + db:test ; commits séparés db/front/purge ; PR ; revue fin de lot.

## Restes à vérifier à l'implémentation

- `document_versions` table existe-t-elle encore (audit v1 la listait « morte à drop ») ?
  getDocumentVersions (v_document_versions) a-t-il un appelant UI réel ? si non → purge
  plutôt que 7ᵉ vue.
- get_document_url (edge) : que fait le check document_access aujourd'hui (115) —
  échec silencieux ou 500 ?
- Valeurs link_type réellement émises par le front ('main'/'annexe'/'related') pour la
  table de correspondance relation_kind.
- pv_templates.organization_id : copro_id ou cabinet_id ? (multi-cabinet — demander si doute,
  défaut copro_id + is_system_template global).
