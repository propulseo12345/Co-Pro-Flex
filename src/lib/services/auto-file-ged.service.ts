/**
 * Auto-file GED Service
 * Files generated PDFs silently into the GED with proper folder resolution.
 */

import * as documentsApi from '@/lib/documents/api';
import type { DocumentCategory, DocumentSource } from '@/lib/documents/api';

// ============================================================================
// TYPES
// ============================================================================

export interface AutoFileParams {
  blob: Blob;
  fileName: string;
  coproId: string;
  category: DocumentCategory;
  sourceModule: DocumentSource;
  entityId?: string;
  entityType?: string;
  linkType?: 'main' | 'annexe' | 'related';
  documentDate?: string;
  year?: number;
  subFolderName?: string;
  onSuccess?: (result: { documentId: string; folderPath: string }) => void;
  onError?: (error: Error) => void;
}

interface FolderMapping {
  categoryDefault: DocumentCategory | string;
  fallbackName: string;
}

// ============================================================================
// FOLDER MAPPING
// ============================================================================

const AUTOFILE_FOLDER_MAP: Record<string, FolderMapping> = {
  convocation: { categoryDefault: 'pv_ag', fallbackName: 'Assemblées Générales' },
  pv_ag: { categoryDefault: 'pv_ag', fallbackName: 'Assemblées Générales' },
  courrier: { categoryDefault: 'correspondance', fallbackName: 'Correspondances' },
  contrat: { categoryDefault: 'contrat', fallbackName: 'Contrats' },
  etat_date: { categoryDefault: 'autre', fallbackName: 'Documents Légaux' },
  diagnostic: { categoryDefault: 'diagnostic', fallbackName: 'Diagnostics' },
  assurance: { categoryDefault: 'contrat', fallbackName: 'Contrats' },
  releve_charges: { categoryDefault: 'budget', fallbackName: 'Comptabilité' },
  facture: { categoryDefault: 'facture', fallbackName: 'Factures & Devis' },
  ordre_service: { categoryDefault: 'ordre_service', fallbackName: 'Maintenance' },
  budget: { categoryDefault: 'budget', fallbackName: 'Comptabilité' },
  photo: { categoryDefault: 'photo', fallbackName: 'Photos' },
};

// ============================================================================
// FOLDER RESOLUTION
// ============================================================================

async function resolveRootFolder(
  coproId: string,
  category: DocumentCategory
): Promise<string | null> {
  const mapping = AUTOFILE_FOLDER_MAP[category];
  if (!mapping) return null;

  // Try by category_default first (robust to renames)
  const folders = await documentsApi.getFolders(coproId);

  // Priority 1: match by category_default
  const byCategoryDefault = folders.find(
    f => !f.parent_id && f.category_default === mapping.categoryDefault
  );
  if (byCategoryDefault) return byCategoryDefault.id;

  // Priority 2: match by name (fallback)
  const byName = folders.find(
    f => !f.parent_id && f.name === mapping.fallbackName
  );
  if (byName) return byName.id;

  return null;
}

async function resolveOrCreateSingleFolder(
  coproId: string,
  parentId: string,
  folderName: string
): Promise<string> {
  const folders = await documentsApi.getFolders(coproId);
  const existing = folders.find(
    f => f.parent_id === parentId && f.name === folderName
  );
  if (existing) return existing.id;

  try {
    const created = await documentsApi.createFolder({
      copro_id: coproId,
      name: folderName,
      parent_id: parentId,
      icon: 'FolderOpen',
      color: '#6366f1',
      sort_order: 0,
      is_system: false,
    });
    return created.id;
  } catch {
    const retryFolders = await documentsApi.getFolders(coproId);
    const retry = retryFolders.find(
      f => f.parent_id === parentId && f.name === folderName
    );
    if (retry) return retry.id;
    throw new Error(`Failed to create sub-folder "${folderName}"`);
  }
}

async function resolveOrCreateSubFolder(
  coproId: string,
  parentId: string,
  subFolderPath: string
): Promise<string> {
  const segments = subFolderPath.split('/').filter(Boolean);
  let currentParentId = parentId;
  for (const segment of segments) {
    currentParentId = await resolveOrCreateSingleFolder(coproId, currentParentId, segment);
  }
  return currentParentId;
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

export async function autoFileToGED(params: AutoFileParams): Promise<{
  success: boolean;
  documentId?: string;
  folderPath?: string;
}> {
  const {
    blob, fileName, coproId, category, sourceModule,
    entityId, entityType, linkType = 'related',
    documentDate, year,
    subFolderName,
    onSuccess, onError,
  } = params;

  try {
    // 1. Resolve root folder
    let folderId = await resolveRootFolder(coproId, category);
    let folderPath = AUTOFILE_FOLDER_MAP[category]?.fallbackName || 'Racine';

    // 2. Resolve/create sub-folder if specified
    if (folderId && subFolderName) {
      try {
        const subId = await resolveOrCreateSubFolder(coproId, folderId, subFolderName);
        folderId = subId;
        folderPath = `${folderPath}/${subFolderName}`;
      } catch {
        // Fall back to root folder (sub-folder creation failed)
      }
    }

    // 3. Convert Blob to File
    const file = new File([blob], fileName, { type: blob.type || 'application/pdf' });

    // 4. Upload
    const doc = await documentsApi.uploadDocument(file, coproId, category, {
      folderId: folderId || undefined,
      title: fileName,
      sourceModule,
      documentDate,
      year,
    });

    // 5. Link to entity if provided
    if (entityId && entityType) {
      try {
        await documentsApi.linkDocumentToEntity(doc.id, entityType, entityId, linkType);
      } catch {
        // Non-blocking: document is uploaded, link failed
      }
    }

    // 6. Success callback
    const result = { documentId: doc.id, folderPath };
    onSuccess?.(result);
    return { success: true, ...result };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    onError?.(error);
    return { success: false };
  }
}
