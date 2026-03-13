# GED — Import manuel + Auto-filing documents

**Date** : 2026-03-14
**Status** : Approved
**Scope** : Modale d'import enrichie, auto-filing silencieux des PDFs générés, toast notifications, sidebar arborescente

---

## Contexte

La GED CoProFlex a 12 documents et 27 dossiers (11 root + 16 sous-dossiers) mais :
- L'import manuel est cassé (RLS storage fixé) et n'a pas d'interface dédiée
- 8 générateurs PDF sur 11 ne sauvent pas dans la GED (download navigateur uniquement)
- La sidebar n'affiche pas les sous-dossiers

## 1. Modale d'import manuel — `UploadDocumentModal`

### Layout
Colonne unique, overlay modal :

1. **Drop zone** — drag & drop + clic file picker, multi-fichiers, max 25 Mo/fichier
2. **Dossier cible** — dropdown arborescent (root + sous-dossiers indentés) + "Créer un dossier" en bas
3. **Catégorie** — dropdown, auto-rempli par détection (voir ci-dessous), modifiable
4. **Titre** — pré-rempli avec nom fichier sans extension, éditable
5. **Confidentialité** + **Tags** — même ligne, dropdowns
6. **Description** — textarea optionnel
7. **Boutons** — Annuler / Importer

### Auto-détection catégorie (priorité décroissante)
1. Nom fichier contient "facture" ou "invoice" → `facture`
2. Nom contient "PV" ou "procès" → `pv_ag`
3. Nom contient "contrat" → `contrat`
4. Nom contient "devis" → `devis`
5. Nom contient "diagnostic" ou "DPE" → `diagnostic`
6. Nom contient "convocation" → `convocation`
7. Nom contient "relance" → `courrier`
8. `category_default` du dossier cible sélectionné
9. Fallback : `autre`

### Sélecteur de dossier arborescent
- Liste tous les `rootFolders` avec icône et nom
- Sous chaque root, affiche les sous-dossiers avec indentation (padding-left)
- En bas de la liste : bouton "＋ Créer un dossier" qui ouvre un inline input (nom + parent = dossier courant)
- Utilise `documentsApi.createFolder()` puis refresh

### Upload flow
1. Fichier(s) déposé(s) → auto-détection catégorie + pré-remplissage titre
2. Utilisateur ajuste les champs si besoin
3. Clic "Importer" → `documentsApi.uploadDocument(file, coproId, category, { folderId, title, description, tags, confidentiality })`
4. Succès → toast "Document importé dans {dossier}" + `refreshData()`
5. Erreur → toast rouge avec message

### Fichiers
- `src/components/features/documents/ged/components/UploadDocumentModal.tsx`
- `src/components/features/documents/ged/components/UploadDocumentModal.module.css`
- `src/components/features/documents/ged/components/FolderTreeSelect.tsx`
- Utilitaire : `src/lib/documents/detect-category.ts`

---

## 2. Auto-filing des documents générés

### Service central

**Fichier** : `src/lib/services/auto-file-ged.service.ts`

```typescript
interface AutoFileParams {
  blob: Blob;
  fileName: string;
  coproId: string;
  category: DocumentCategory;
  sourceModule: DocumentSource;
  entityId?: string;
  entityType?: string;
  linkType?: 'main' | 'annexe' | 'related';
}

async function autoFileToGED(params: AutoFileParams): Promise<{ success: boolean; documentId?: string; folderPath?: string }>
```

### Logique interne
1. Résoudre le dossier root par mapping catégorie → nom dossier
2. Résoudre/créer le sous-dossier (par pattern, ex: "AG du {date}")
3. Convertir le Blob en File
4. Appeler `documentsApi.uploadDocument()` avec `folderId` du sous-dossier
5. Si `entityId` fourni, appeler `documentsApi.linkDocumentToEntity()`
6. Retourner `{ success, documentId, folderPath }`

### Mapping catégorie → dossier root → sous-dossier

| Source | Catégorie | Dossier root | Sous-dossier pattern |
|--------|-----------|-------------|---------------------|
| Convocation AG | `convocation` | Assemblées Générales | AG du {date meeting} |
| PV AG (existant) | `pv_ag` | Assemblées Générales | AG du {date meeting} |
| Relance impayé | `courrier` | Correspondances | Relances {année} |
| Résiliation contrat | `contrat` | Contrats | Résiliations {année} |
| Dossier de vente | `etat_date` | Documents Légaux | Ventes {année} |
| Rapport CS | `pv_ag` | Assemblées Générales | Rapports CS {année} |
| Doc technique | `diagnostic` | Maintenance | Documents techniques |
| Doc assurance | `assurance` | Contrats | Assurances |
| Export impayés | `releve_charges` | Comptabilité | Exports {année} |

Le mapping est déclaré comme constante `AUTOFILE_FOLDER_MAP` dans le service.

### Résolution de dossier
```
1. SELECT id FROM document_folders WHERE copro_id = X AND name = {rootName} AND parent_id IS NULL
2. SELECT id FROM document_folders WHERE copro_id = X AND name = {subName} AND parent_id = {rootId}
3. Si sous-dossier inexistant → createFolder({ name: subName, parent_id: rootId, copro_id, ... })
```

### Générateurs à brancher (8)

| Fichier | Fonction | Branchement |
|---------|----------|-------------|
| `generateConvocationPDF.ts` | `generateConvocationPDF()` | Après `doc.save()`, appeler `autoFileToGED()` avec blob |
| `generateRelancePDF.ts` | `generateRelancePDF()` | Idem |
| `generateVentePDF.ts` | `generateVentePDF()` | Idem |
| `generateResiliationPDF.ts` | `generateResiliationPDF()` | Idem |
| `generateRapportCSPDF.ts` | `generateRapportCSPDF()` | Idem |
| `generateDocumentTechniquePDF.ts` | `generateDocumentTechniquePDF()` | Idem |
| `generateAssuranceDocumentPDF.ts` | `generateAssuranceDocumentPDF()` | Idem |
| Hooks impayés (export) | `handleDownloadPDF/CSV()` | Idem |

**Pattern de branchement** : chaque générateur retourne le `jsPDF` doc. L'appelant (hook) fait :
```typescript
const doc = generateXxxPDF(data);
doc.save(fileName); // download navigateur (existant)
const blob = doc.output('blob');
autoFileToGED({ blob, fileName, coproId, category: 'xxx', sourceModule: 'yyy', entityId, entityType });
```

Le `autoFileToGED` est fire-and-forget (pas d'await dans le flux principal). Erreurs loguées, pas bloquantes.

---

## 3. Toast notifications

### Composant
- `src/components/ui/Toast/Toast.tsx` + `Toast.module.css`
- `src/providers/ToastProvider.tsx` — contexte React

### API
```typescript
const { showToast } = useToast();
showToast({ type: 'success' | 'error' | 'info', message: string, link?: { label: string, href: string } });
```

### Comportement
- Position : bas droite, empilé
- Auto-disparaît : 4 secondes (success/info), 6 secondes (error)
- Variantes couleur : success (#22c55e), error (#ef4444), info (#3b82f6)
- Lien optionnel : "Voir dans la GED" → `/documents/ged`
- Animation : slide-in depuis la droite, fade-out

### Intégration
- Wrap le layout dashboard dans `<ToastProvider>`
- Upload modal : toast success/error après import
- Auto-file service : toast success avec lien GED

---

## 4. Sidebar arborescente (sous-dossiers)

### Changement
La sidebar GED affiche actuellement uniquement les `rootFolders`. Modifier pour afficher l'arborescence complète à 2 niveaux :

```
📁 Assemblées Générales (4 docs)
  └ 📂 AG du 15-03-2026 (2 docs)
  └ 📂 Rapports CS 2026 (1 doc)
📁 Contrats (3 docs)
  └ 📂 Résiliations 2026 (0 docs)
  └ 📂 Assurances (1 doc)
```

### Logique
- Au expand d'un dossier root, afficher d'abord les sous-dossiers (indentés, icône FolderOpen)
- Sous chaque sous-dossier, les documents directs
- Les documents directement dans le root restent affichés après les sous-dossiers
- Le comptage docs d'un root inclut les docs de ses sous-dossiers (déjà le cas via `getAllDescendantIds`)

### Fichier
- Modification de `src/app/(dashboard)/documents/ged/page.tsx` — section sidebar `sidebarTab === 'dossiers'`

---

## Hors scope
- Recherche full-text dans le contenu des documents
- Versioning de documents (existe dans l'API, pas dans l'UI)
- Workflow d'approbation de documents
- Mapping configurable dossier↔catégorie (hardcodé pour v1)
