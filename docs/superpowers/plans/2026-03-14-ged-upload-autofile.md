# GED Upload + Auto-filing Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add upload modal with folder selection, auto-file generated PDFs to GED, toast notifications, and subfolder sidebar.

**Architecture:** Toast provider wraps dashboard layout. Upload modal uses FolderTreeSelect + detect-category utility. Auto-file service accepts blob + metadata, resolves folder by category_default, uploads via existing API. PDF generators refactored to return jsPDF instead of void.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS Modules, Supabase, jsPDF

**Spec:** `docs/superpowers/specs/2026-03-14-ged-upload-autofile-design.md`

---

## Task 1: Toast System

**Files:**
- Create: `src/components/ui/Toast/Toast.tsx`
- Create: `src/components/ui/Toast/Toast.module.css`
- Create: `src/providers/ToastProvider.tsx`
- Modify: `src/app/(dashboard)/layout.tsx` — wrap with ToastProvider
- Delete: `src/features/maintenance/shared/hooks/useToast.ts` (after migration)

- [ ] **Step 1: Create Toast component + CSS**

Toast.tsx: renders toast list from context. CSS: position fixed bottom-right, slide-in animation, success/error/info variants.

```typescript
// Toast.tsx
interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  link?: { label: string; href: string };
}
```

- [ ] **Step 2: Create ToastProvider**

Context with `showToast()` method. Auto-remove after 4s (success/info) or 6s (error).

- [ ] **Step 3: Wrap dashboard layout**

Add `<ToastProvider>` in `src/app/(dashboard)/layout.tsx`.

- [ ] **Step 4: Migrate existing useToast consumers**

Replace imports in:
- `src/features/maintenance/shared/hooks/useCoproFlexPage.ts`
- `src/features/maintenance/shared/hooks/useProviderDetailPage.ts`
- `src/features/maintenance/shared/hooks/useProvidersHubPage.ts`

- [ ] **Step 5: Verify build compiles**

Run: `npx tsc --noEmit 2>&1 | grep -i toast`

- [ ] **Step 6: Commit**

---

## Task 2: uploadDocument API update

**Files:**
- Modify: `src/lib/documents/api.ts` — add `sourceModule` to uploadDocument options

- [ ] **Step 1: Add sourceModule to options type and use it**

In `uploadDocument()`, add `sourceModule?: DocumentSource` to options, use `options?.sourceModule || 'manual'` instead of hardcoded `'manual'`.

Also add `documentDate?: string` and `year?: number` to options.

- [ ] **Step 2: Commit**

---

## Task 3: Detect category utility

**Files:**
- Create: `src/lib/documents/detect-category.ts`

- [ ] **Step 1: Write detectCategory function**

```typescript
export function detectCategory(fileName: string, folderCategoryDefault?: DocumentCategory | null): DocumentCategory
```

Priority: filename regex → folder category_default → 'autre'

- [ ] **Step 2: Commit**

---

## Task 4: DB migration — populate category_default

**Files:**
- Supabase migration (apply via MCP)

- [ ] **Step 1: Apply migration**

```sql
UPDATE document_folders SET category_default = 'pv_ag' WHERE name = 'Assemblées Générales' AND is_system = true;
UPDATE document_folders SET category_default = 'contrat' WHERE name = 'Contrats' AND is_system = true;
UPDATE document_folders SET category_default = 'facture' WHERE name = 'Factures & Devis' AND is_system = true;
UPDATE document_folders SET category_default = 'diagnostic' WHERE name = 'Diagnostics' AND is_system = true;
UPDATE document_folders SET category_default = 'plan' WHERE name = 'Plans' AND is_system = true;
UPDATE document_folders SET category_default = 'correspondance' WHERE name = 'Correspondances' AND is_system = true;
UPDATE document_folders SET category_default = 'autre' WHERE name = 'Documents Légaux' AND is_system = true;
UPDATE document_folders SET category_default = 'ordre_service' WHERE name = 'Maintenance' AND is_system = true;
UPDATE document_folders SET category_default = 'photo' WHERE name = 'Photos' AND is_system = true;
UPDATE document_folders SET category_default = 'budget' WHERE name = 'Comptabilité' AND is_system = true;
```

---

## Task 5: FolderTreeSelect component

**Files:**
- Create: `src/components/features/documents/ged/components/FolderTreeSelect.tsx`
- Create: `src/components/features/documents/ged/components/FolderTreeSelect.module.css`

- [ ] **Step 1: Build FolderTreeSelect**

Props: `folders: GEDFolder[], value: string | null, onChange: (id: string | null) => void, onCreateFolder: (name: string, parentId: string | null) => Promise<void>`

Renders: dropdown with root folders, indented sub-folders, "+ Créer un dossier" at bottom with inline input.

- [ ] **Step 2: Commit**

---

## Task 6: UploadDocumentModal

**Files:**
- Create: `src/components/features/documents/ged/components/UploadDocumentModal.tsx`
- Create: `src/components/features/documents/ged/components/UploadDocumentModal.module.css`
- Modify: `src/app/(dashboard)/documents/ged/page.tsx` — add modal trigger

- [ ] **Step 1: Build UploadDocumentModal**

Single column: drop zone → file list → dossier (FolderTreeSelect) → catégorie (auto-detect) → titre → confidentialité + tags → description → buttons.

Multi-file: shared metadata, individual titles shown in file list.

25 Mo client-side validation.

- [ ] **Step 2: Wire into GED page**

Replace the current `<label>` file input with modal open. Button "Importer" opens modal. On success → toast + refreshData.

- [ ] **Step 3: Verify build + manual test**

- [ ] **Step 4: Commit**

---

## Task 7: GedSidebar extraction + subfolder tree

**Files:**
- Create: `src/components/features/documents/ged/components/GedSidebar.tsx`
- Create: `src/components/features/documents/ged/components/GedSidebar.module.css`
- Modify: `src/app/(dashboard)/documents/ged/page.tsx` — replace inline sidebar with component

- [ ] **Step 1: Extract sidebar into GedSidebar component**

Move all sidebar JSX + state (sidebarTab, expandedFolders, sidebarSearch) into GedSidebar. Add 2-level tree: root → sub-folders → docs.

- [ ] **Step 2: Update page.tsx to use GedSidebar**

- [ ] **Step 3: Commit**

---

## Task 8: Auto-file GED service

**Files:**
- Create: `src/lib/services/auto-file-ged.service.ts`

- [ ] **Step 1: Build autoFileToGED service**

Implements: folder resolution by category_default → name fallback → sub-folder creation → upload → link entity → callbacks.

Constant: `AUTOFILE_FOLDER_MAP` with category → rootFolderCategoryDefault + subFolderPattern.

- [ ] **Step 2: Commit**

---

## Task 9: Refactor PDF generators + wire auto-filing

**Files (refactor return type):**
- Modify: `src/lib/pdf/generateRelancePDF.ts`
- Modify: `src/lib/pdf/generateVentePDF.ts`
- Modify: `src/lib/pdf/generateVenteDocumentPDF.ts`
- Modify: `src/lib/pdf/generateVentesExportPDF.ts`
- Modify: `src/lib/pdf/generateResiliationPDF.ts`
- Modify: `src/lib/pdf/generateRapportCSPDF.ts`
- Modify: `src/lib/pdf/generateDocumentTechniquePDF.ts`
- Modify: `src/lib/pdf/generateAssuranceDocumentPDF.ts`

**Files (wire auto-filing in call sites):**
- Modify: call site hooks for each generator

- [ ] **Step 1: Refactor each generator**

Remove internal `doc.save()`, return `jsPDF` doc instead.

- [ ] **Step 2: Update call sites**

Each call site: `const doc = generateXxx(data); doc.save(fileName); autoFileToGED({...})` fire-and-forget.

- [ ] **Step 3: Wire convocation (already returns blob)**

`generateConvocationPDF` already returns `ConvocationPDFResult`. Just add `autoFileToGED` call in the hook.

- [ ] **Step 4: Verify build**

- [ ] **Step 5: Commit**
