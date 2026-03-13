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

1. **Drop zone** — drag & drop + clic file picker, multi-fichiers, max 25 Mo/fichier (validation client-side, rejet avec message "Fichier trop volumineux (max 25 Mo)")
2. **Dossier cible** — dropdown arborescent (root + sous-dossiers indentés) + "Créer un dossier" en bas
3. **Catégorie** — dropdown, auto-rempli par détection (voir ci-dessous), modifiable
4. **Titre** — pré-rempli avec nom fichier sans extension, éditable
5. **Confidentialité** + **Tags** — même ligne, dropdowns
6. **Description** — textarea optionnel
7. **Boutons** — Annuler / Importer

### Multi-fichiers
Quand plusieurs fichiers sont déposés, les métadonnées (dossier, catégorie, confidentialité) s'appliquent à tous. Le titre est pré-rempli par fichier individuellement (liste visible sous la drop zone avec nom + taille + bouton supprimer). Chaque fichier est uploadé séquentiellement avec les mêmes métadonnées partagées.

### Auto-détection catégorie (priorité décroissante)
1. Nom fichier contient "facture" ou "invoice" → `facture`
2. Nom contient "PV" ou "procès" → `pv_ag`
3. Nom contient "contrat" → `contrat`
4. Nom contient "devis" → `devis`
5. Nom contient "diagnostic" ou "DPE" → `diagnostic`
6. Nom contient "convocation" → `convocation`
7. Nom contient "relance" → `courrier`
8. `category_default` du dossier cible sélectionné (si non NULL)
9. Fallback : `autre`

### Sélecteur de dossier arborescent
- Liste tous les `rootFolders` avec icône et nom
- Sous chaque root, affiche les sous-dossiers avec indentation (padding-left)
- En bas de la liste : bouton "＋ Créer un dossier" qui ouvre un inline input (nom + parent = dossier courant)
- Utilise `documentsApi.createFolder()` puis refresh

### Upload flow
1. Fichier(s) déposé(s) → validation taille (< 25 Mo) → auto-détection catégorie + pré-remplissage titre
2. Utilisateur ajuste les champs si besoin
3. Clic "Importer" → `documentsApi.uploadDocument(file, coproId, category, { folderId, title, description, tags, confidentiality, sourceModule: 'manual' })`
4. Succès → toast "Document importé dans {dossier}" + `refreshData()`
5. Erreur → toast rouge avec message

### Fichiers
- `src/components/features/documents/ged/components/UploadDocumentModal.tsx`
- `src/components/features/documents/ged/components/UploadDocumentModal.module.css`
- `src/components/features/documents/ged/components/FolderTreeSelect.tsx`
- Utilitaire : `src/lib/documents/detect-category.ts`

---

## 2. Auto-filing des documents générés

### Pré-requis : refactoring des générateurs PDF

Les 8 générateurs retournent actuellement `void` (ils appellent `doc.save()` en interne). **Chaque générateur doit être refactoré** pour retourner l'objet `jsPDF` au lieu d'appeler `doc.save()`. L'appelant (hook/composant) se charge ensuite du download ET du filing :

**Avant** (actuel) :
```typescript
// Dans generateRelancePDF.ts
export function generateRelancePDF(data: RelanceData): void {
  const doc = new jsPDF();
  // ... construction du PDF
  doc.save(fileName);
}
```

**Après** (refactoré) :
```typescript
// Dans generateRelancePDF.ts
export function generateRelancePDF(data: RelanceData): jsPDF {
  const doc = new jsPDF();
  // ... construction du PDF
  return doc;
}

// Dans le hook appelant
const doc = generateRelancePDF(data);
doc.save(fileName); // download navigateur
const blob = doc.output('blob');
autoFileToGED({ blob, fileName, coproId, ... }); // fire-and-forget
```

Ce refactoring touche 8 fichiers générateurs + leurs call sites (hooks).

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
  documentDate?: string;   // date du document (ex: date AG), défaut: aujourd'hui
  year?: number;           // année du document, défaut: année courante
  onSuccess?: (result: { documentId: string; folderPath: string }) => void;
  onError?: (error: Error) => void;
}

async function autoFileToGED(params: AutoFileParams): Promise<{ success: boolean; documentId?: string; folderPath?: string }>
```

### Modification de `uploadDocument()`

Ajouter `source_module?: DocumentSource` au paramètre `options` de `documentsApi.uploadDocument()`. Actuellement hardcodé à `'manual'`, il doit être paramétrable pour que l'auto-filing puisse passer `'ag'`, `'finance'`, etc.

### Toast depuis le service (hors React)

Le service `autoFileToGED` n'a pas accès au contexte React. La communication vers l'UI se fait via **callbacks** :
- Le hook appelant passe `onSuccess` et `onError` à `autoFileToGED`
- Le hook a accès à `useToast()` et affiche le toast dans le callback

```typescript
// Dans le hook
autoFileToGED({
  blob, fileName, coproId, category, sourceModule,
  onSuccess: ({ folderPath }) => showToast({ type: 'success', message: `Sauvé dans ${folderPath}`, link: { label: 'Voir', href: '/documents/ged' } }),
  onError: (err) => showToast({ type: 'error', message: `Erreur GED: ${err.message}` }),
});
```

### Logique interne
1. Résoudre le dossier root par `category_default` du dossier (pas par nom — robuste aux renommages)
2. Résoudre/créer le sous-dossier (par pattern, ex: "AG du {date}")
3. Convertir le Blob en File
4. Appeler `documentsApi.uploadDocument()` avec `folderId`, `sourceModule`, `documentDate`, `year`
5. Si `entityId` fourni, appeler `documentsApi.linkDocumentToEntity()`
6. Appeler `onSuccess` callback
7. En cas d'erreur : si la résolution de dossier échoue, uploader quand même dans le dossier root (pas de sous-dossier). Si l'upload échoue, appeler `onError`.

### Mapping catégorie → dossier root → sous-dossier

| Source | Catégorie | Dossier root (par `category_default`) | Sous-dossier pattern |
|--------|-----------|--------------------------------------|---------------------|
| Convocation AG | `convocation` | `convocation` → Assemblées Générales | AG du {date meeting} |
| PV AG (existant) | `pv_ag` | `pv_ag` → Assemblées Générales | AG du {date meeting} |
| Relance impayé | `courrier` | `correspondance` → Correspondances | Relances {année} |
| Résiliation contrat | `contrat` | `contrat` → Contrats | Résiliations {année} |
| Dossier de vente | `etat_date` | `autre` → Documents Légaux | Ventes {année} |
| Rapport CS | `pv_ag` | `pv_ag` → Assemblées Générales | Rapports CS {année} |
| Doc technique | `diagnostic` | `diagnostic` → Maintenance | Documents techniques |
| Doc assurance | `assurance` | `contrat` → Contrats | Assurances |
| Export impayés | `releve_charges` | `budget` → Comptabilité | Exports {année} |

Le mapping est déclaré comme constante `AUTOFILE_FOLDER_MAP` dans le service.

### Résolution de dossier (robuste)
```
1. SELECT id FROM document_folders WHERE copro_id = X AND category_default = {category} AND parent_id IS NULL
2. Fallback si non trouvé: SELECT id WHERE name = {rootName} AND parent_id IS NULL
3. SELECT id FROM document_folders WHERE copro_id = X AND name = {subName} AND parent_id = {rootId}
4. Si sous-dossier inexistant → createFolder({ name: subName, parent_id: rootId, copro_id, ... })
5. Si createFolder échoue (contrainte unique) → requête le sous-dossier existant (race condition safe)
```

### Pré-requis DB : peupler `category_default` sur les dossiers système

Migration Supabase pour remplir `category_default` sur les dossiers système existants :
```sql
UPDATE document_folders SET category_default = 'pv_ag' WHERE name = 'Assemblées Générales' AND is_system = true;
UPDATE document_folders SET category_default = 'contrat' WHERE name = 'Contrats' AND is_system = true;
UPDATE document_folders SET category_default = 'facture' WHERE name = 'Factures & Devis' AND is_system = true;
-- etc. pour chaque dossier système
```

### Générateurs à refactorer et brancher (8)

| Fichier | Fonction | Retour actuel | Action |
|---------|----------|--------------|--------|
| `generateConvocationPDF.ts` | `generateConvocationPDF()` | `ConvocationPDFResult { blob }` | Déjà refactoré — ajouter auto-filing call site uniquement |
| `generateRelancePDF.ts` | `generateRelancePDF()` | `void` | Refactorer → retourner `jsPDF` |
| `generateVentePDF.ts` | `generateVentePDF()` | `void` | Refactorer → retourner `jsPDF` |
| `generateVenteDocumentPDF.ts` | `generateVenteDocumentPDF()` | `void` | Refactorer → retourner `jsPDF` |
| `generateVentesExportPDF.ts` | `generateVentesExportPDF()` | `void` | Refactorer → retourner `jsPDF` |
| `generateResiliationPDF.ts` | `generateResiliationPDF()` | `void` | Refactorer → retourner `jsPDF` |
| `generateRapportCSPDF.ts` | `generateRapportCSPDF()` | `void` | Refactorer → retourner `jsPDF` |
| `generateDocumentTechniquePDF.ts` | `generateDocumentTechniquePDF()` | `void` | Refactorer → retourner `jsPDF` |
| `generateAssuranceDocumentPDF.ts` | `generateAssuranceDocumentPDF()` | `void` | Refactorer → retourner `jsPDF` |
| Hooks impayés (export) | `handleDownloadPDF/CSV()` | `void` | Refactorer → retourner `jsPDF` / `Blob` |

L'auto-filing est fire-and-forget (pas d'await dans le flux principal). Le download navigateur reste le comportement principal, le filing GED est un bonus silencieux.

---

## 3. Toast notifications

### Composant (nouveau, dashboard-level)
- `src/components/ui/Toast/Toast.tsx` + `Toast.module.css`
- `src/providers/ToastProvider.tsx` — contexte React

Note : un `useToast` local existe dans `src/features/maintenance/shared/hooks/useToast.ts` avec une API différente (`(message, type)` positional). Le nouveau `ToastProvider` est un remplacement au niveau dashboard. Fichiers à migrer :
- `src/features/maintenance/shared/hooks/useToast.ts` (supprimer)
- `src/features/maintenance/shared/hooks/index.ts` (retirer export)
- `src/features/maintenance/shared/hooks/useCoproFlexPage.ts`
- `src/features/maintenance/shared/hooks/useProviderDetailPage.ts`
- `src/features/maintenance/shared/hooks/useProvidersHubPage.ts`

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
- Wrap le layout dashboard `src/app/(dashboard)/layout.tsx` dans `<ToastProvider>`
- Upload modal : toast success/error après import
- Auto-file service : toast via callbacks `onSuccess`/`onError` passés par les hooks appelants

---

## 4. Sidebar arborescente (sous-dossiers)

### Extraction composant

La page GED actuelle fait ~620 lignes (> 300 max CLAUDE.md). Extraire la sidebar dans un composant dédié :
- `src/components/features/documents/ged/components/GedSidebar.tsx`
- `src/components/features/documents/ged/components/GedSidebar.module.css`

### Changement
Afficher l'arborescence complète à 2 niveaux :

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
- Cliquer sur un sous-dossier l'expand et montre ses documents directs
- Les documents directement dans le root restent affichés après les sous-dossiers
- Le comptage docs d'un root inclut les docs de ses sous-dossiers (déjà le cas via `getAllDescendantIds`)

---

## Hors scope
- Recherche full-text dans le contenu des documents
- Versioning de documents (existe dans l'API, pas dans l'UI)
- Workflow d'approbation de documents
- Mapping configurable dossier↔catégorie (hardcodé pour v1)
