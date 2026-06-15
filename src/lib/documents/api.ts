/**
 * API Documents / GED - Supabase
 * NIVEAU 6C - Gestion Électronique de Documents
 */

import { createClient } from '@/lib/supabase/client';

// Helper: Create untyped client for tables/views not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

// ============================================================================
// TYPES
// ============================================================================

export type DocumentCategory =
  | 'pv_ag' | 'convocation' | 'reglement' | 'contrat' | 'facture' | 'devis'
  | 'diagnostic' | 'assurance' | 'budget' | 'appel_fonds' | 'releve_charges'
  | 'etat_date' | 'courrier' | 'correspondance' | 'ordre_service' | 'photo' | 'plan' | 'autre';

export type DocumentConfidentiality = 'public' | 'council' | 'manager' | 'restricted';
export type DocumentStatus = 'draft' | 'active' | 'archived' | 'expired';
export type DocumentSource = 'ag' | 'finance' | 'maintenance' | 'communication' | 'legal' | 'manual';

// ----------------------------------------------------------------------------
// Traduction legacy → canonique (0052). Les LECTURES passent par les vues de
// compat (qui re-mappent canonique → legacy) ; les ÉCRITURES doivent parler le
// schéma canonique : visibility (enum document_visibility), pas de version /
// is_current_version, liens dans document_relations.
// ----------------------------------------------------------------------------

const VISIBILITY_FROM_CONFIDENTIALITY: Record<DocumentConfidentiality, string> = {
  public: 'tous_coproprietaires',
  council: 'conseil',
  manager: 'gestionnaire_seul',
  restricted: 'gestionnaire_seul', // 'restricted' n'existe plus dans le modèle cible
};

// enum canonique document_source : manual, ag, finance, maintenance, mutation, system
const SOURCE_FROM_LEGACY: Record<DocumentSource, string> = {
  ag: 'ag',
  finance: 'finance',
  maintenance: 'maintenance',
  communication: 'manual',
  legal: 'mutation', // seul appelant legacy : documents de vente (VenteDocuments)
  manual: 'manual',
};

// enum canonique document_entity_type :
// ag | resolution | service_order | contract | supplier_invoice | mutation |
// budget | lot | coproprietaire | council | event | other
// Les clés acceptent le vocabulaire legacy minuscule ET les LinkedEntityType
// front (MAJUSCULES, cf. @/lib/documents/linking) pour éviter le rabattement
// silencieux sur 'other' (ex. getDocumentsForEntity('FACTURE', …)).
const ENTITY_TYPE_FROM_LEGACY: Record<string, string> = {
  ag: 'ag',
  resolution: 'resolution',
  service_order: 'service_order',
  contract: 'contract',
  contrat: 'contract',
  facture: 'supplier_invoice',
  invoice: 'supplier_invoice',
  supplier_invoice: 'supplier_invoice',
  depense: 'budget',
  budget_expense: 'budget',
  budget: 'budget',
  mutation: 'mutation',
  vente: 'mutation',
  lot: 'lot',
  coproprietaire: 'coproprietaire',
  council: 'council',
  event: 'event',
  // --- LinkedEntityType front (MAJUSCULES) ---
  FACTURE: 'supplier_invoice',
  CONTRAT: 'contract',
  ASSEMBLEE_GENERALE: 'ag',
  ORDRE_SERVICE: 'service_order',
  VENTE: 'mutation',
  COPROPRIETAIRE: 'coproprietaire',
  // Pas de valeur d'enum dédiée pour ces trois entités : INTERVENTION est suivie
  // via les ordres de service ; APPEL_FONDS et IMPAYE n'ont pas d'équivalent
  // canonique (faute de migration enum) et restent volontairement 'other'.
  INTERVENTION: 'service_order',
  APPEL_FONDS: 'other',
  IMPAYE: 'other',
};

// enum canonique document_relation_kind : related, annexe, source, justificatif
const RELATION_KIND_FROM_LINK_TYPE: Record<string, string> = {
  main: 'source',
  annexe: 'annexe',
  related: 'related',
  justificatif: 'justificatif',
};

const CANONICAL_STATUSES = ['active', 'archived', 'deleted'];

/** Projette un payload legacy (interface Document) sur les colonnes canoniques. */
function toCanonicalDocumentRow(doc: Partial<Document>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  const passthrough = [
    'copro_id', 'lot_id', 'coproprietaire_id', 'file_name', 'file_path',
    'file_size', 'mime_type', 'category', 'title', 'description', 'tags',
    'document_date', 'year', 'folder_id', 'retention_years',
    'is_archived', 'archived_at', 'is_starred', 'created_by',
  ] as const;
  for (const k of passthrough) {
    if (doc[k] !== undefined) row[k] = doc[k];
  }
  if (doc.status !== undefined && CANONICAL_STATUSES.includes(doc.status)) {
    row.status = doc.status;
  }
  if (doc.confidentiality !== undefined) {
    row.visibility = VISIBILITY_FROM_CONFIDENTIALITY[doc.confidentiality];
  }
  if (doc.source_module !== undefined) {
    row.source_module = SOURCE_FROM_LEGACY[doc.source_module] ?? 'manual';
  }
  return row;
}

/** FK legacy du payload → liens document_relations (créés après l'insert). */
function legacyFkRelations(doc: Partial<Document>): Array<{ entity_type: string; entity_id: string; relation_kind: string }> {
  const out: Array<{ entity_type: string; entity_id: string; relation_kind: string }> = [];
  if (doc.ag_id) out.push({ entity_type: 'ag', entity_id: doc.ag_id, relation_kind: 'related' });
  if (doc.resolution_id) out.push({ entity_type: 'resolution', entity_id: doc.resolution_id, relation_kind: 'related' });
  if (doc.service_order_id) out.push({ entity_type: 'service_order', entity_id: doc.service_order_id, relation_kind: 'related' });
  if (doc.contract_id) out.push({ entity_type: 'contract', entity_id: doc.contract_id, relation_kind: 'related' });
  if (doc.invoice_id) out.push({ entity_type: 'supplier_invoice', entity_id: doc.invoice_id, relation_kind: 'justificatif' });
  if (doc.mutation_id) out.push({ entity_type: 'mutation', entity_id: doc.mutation_id, relation_kind: 'related' });
  return out;
}

export interface DocumentFolder {
  id: string;
  copro_id: string;
  parent_id: string | null;
  name: string;
  description?: string;
  icon: string;
  color: string;
  sort_order: number;
  is_system: boolean;
  category_default?: DocumentCategory;
  created_at: string;
  // Computed
  document_count?: number;
  subfolder_count?: number;
  parent_name?: string;
}

export interface Document {
  id: string;
  copro_id: string;
  lot_id?: string;
  coproprietaire_id?: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  category?: DocumentCategory;
  title?: string;
  description?: string;
  tags?: string[];
  document_date?: string;
  year?: number;
  folder_id?: string;
  status: DocumentStatus;
  confidentiality: DocumentConfidentiality;
  source_module: DocumentSource;
  // Liens entités
  ag_id?: string;
  resolution_id?: string;
  service_order_id?: string;
  contract_id?: string;
  invoice_id?: string;
  mutation_id?: string;
  dossier_id?: string;
  // Conservation
  retention_years?: number;
  expiration_date?: string;
  deletion_blocked: boolean;
  // Versioning
  version: number;
  parent_document_id?: string;
  is_current_version: boolean;
  // Archive
  is_archived?: boolean;
  archived_at?: string;
  // Favori (toggle étoile GED)
  is_starred?: boolean;
  // Audit
  created_at: string;
  created_by?: string;
  updated_at: string;
  // Computed (from views)
  folder_name?: string;
  folder_icon?: string;
  folder_color?: string;
  parent_folder_name?: string;
  copro_name?: string;
  created_by_name?: string;
}

export interface DocumentStats {
  copro_id: string;
  total_documents: number;
  pv_ag_count: number;
  contrat_count: number;
  facture_count: number;
  diagnostic_count: number;
  active_count: number;
  archived_count: number;
  expiring_soon_count: number;
  total_size_bytes?: number;
  last_document_date?: string;
}

export interface DocumentsByCategory {
  copro_id: string;
  category: DocumentCategory;
  count: number;
  total_size?: number;
  last_added?: string;
}

// ============================================================================
// FOLDERS API
// ============================================================================

export async function getFolders(coproId: string): Promise<DocumentFolder[]> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('v_folders_with_counts')
    .select('*')
    .eq('copro_id', coproId)
    .order('sort_order');

  if (error) throw error;
  return data || [];
}

export async function getRootFolders(coproId: string): Promise<DocumentFolder[]> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('v_folders_with_counts')
    .select('*')
    .eq('copro_id', coproId)
    .is('parent_id', null)
    .order('sort_order');

  if (error) throw error;
  return data || [];
}

export async function getSubFolders(coproId: string, parentId: string): Promise<DocumentFolder[]> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('v_folders_with_counts')
    .select('*')
    .eq('copro_id', coproId)
    .eq('parent_id', parentId)
    .order('sort_order');

  if (error) throw error;
  return data || [];
}

export async function getFolderPath(folderId: string): Promise<DocumentFolder[]> {
  const supabase = createUntypedClient();
  const path: DocumentFolder[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const { data, error }: { data: DocumentFolder | null; error: unknown } = await supabase
      .from('document_folders')
      .select('*')
      .eq('id', currentId)
      .single();

    if (error || !data) break;
    path.unshift(data);
    currentId = data.parent_id;
  }

  return path;
}

export async function createFolder(folder: Partial<DocumentFolder>): Promise<DocumentFolder> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('document_folders')
    .insert(folder)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateFolder(id: string, updates: Partial<DocumentFolder>): Promise<DocumentFolder> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('document_folders')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteFolder(id: string): Promise<void> {
  const supabase = createUntypedClient();
  const { error } = await supabase
    .from('document_folders')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// DOCUMENTS API
// ============================================================================

export async function getDocuments(coproId: string, options?: {
  folderId?: string;
  category?: DocumentCategory;
  status?: DocumentStatus;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<Document[]> {
  const supabase = createUntypedClient();
  let query = supabase
    .from('v_documents_with_folder')
    .select('*')
    .eq('copro_id', coproId)
    .eq('is_current_version', true);

  if (options?.folderId) {
    query = query.eq('folder_id', options.folderId);
  }
  if (options?.category) {
    query = query.eq('category', options.category);
  }
  if (options?.status) {
    query = query.eq('status', options.status);
  } else {
    query = query.neq('status', 'archived');
  }
  if (options?.search) {
    query = query.or(`file_name.ilike.%${options.search}%,title.ilike.%${options.search}%`);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getDocumentById(id: string): Promise<Document | null> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('v_documents_with_folder')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function getRecentDocuments(coproId: string, limit = 10): Promise<Document[]> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('v_recent_documents')
    .select('*')
    .eq('copro_id', coproId)
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getDocumentsInFolder(coproId: string, folderId: string): Promise<Document[]> {
  return getDocuments(coproId, { folderId });
}

export async function searchDocuments(coproId: string, query: string): Promise<Document[]> {
  const supabase = createUntypedClient();
  // Vue de compat : la table nue n'a pas is_current_version, et la vue exclut
  // déjà les soft-deleted.
  const { data, error } = await supabase
    .from('v_documents_with_folder')
    .select('*')
    .eq('copro_id', coproId)
    .textSearch('search_text', query, { type: 'websearch', config: 'french' })
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
}

export async function createDocument(doc: Partial<Document>): Promise<Document> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('documents')
    .insert(toCanonicalDocumentRow(doc))
    .select()
    .single();

  if (error) throw error;

  // Les FK legacy (ag_id, invoice_id…) deviennent des liens document_relations.
  const relations = legacyFkRelations(doc);
  if (relations.length > 0) {
    const { error: relError } = await supabase
      .from('document_relations')
      .insert(relations.map((r) => ({ ...r, document_id: data.id, copro_id: data.copro_id })));
    if (relError) throw relError;
  }

  return data;
}

export async function updateDocument(id: string, updates: Partial<Document>): Promise<Document> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('documents')
    .update({ ...toCanonicalDocumentRow(updates), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function archiveDocument(id: string): Promise<Document> {
  return updateDocument(id, { status: 'archived', is_archived: true, archived_at: new Date().toISOString() });
}

export async function deleteDocument(id: string): Promise<void> {
  // Soft delete canonique : status='deleted' (les vues de compat l'excluent).
  // trg_document_soft_delete_guard (0052) REFUSE ce passage pour un document à
  // conservation légale (deletion_blocked) — l'erreur remonte à l'appelant.
  const supabase = createUntypedClient();
  const { error } = await supabase
    .from('documents')
    .update({ status: 'deleted', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// STATS API
// ============================================================================

export async function getDocumentStats(coproId: string): Promise<DocumentStats | null> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('v_documents_stats')
    .select('*')
    .eq('copro_id', coproId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function getDocumentsByCategory(coproId: string): Promise<DocumentsByCategory[]> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('v_documents_by_category')
    .select('*')
    .eq('copro_id', coproId);

  if (error) throw error;
  return data || [];
}

export async function getExpiringDocuments(coproId: string): Promise<Document[]> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('v_documents_expiring')
    .select('*')
    .eq('copro_id', coproId)
    .order('expiration_date');

  if (error) throw error;
  return data || [];
}

// ============================================================================
// STORAGE API
// ============================================================================

export async function uploadDocument(
  file: File,
  coproId: string,
  category: DocumentCategory,
  options?: {
    folderId?: string;
    title?: string;
    description?: string;
    tags?: string[];
    confidentiality?: DocumentConfidentiality;
    sourceModule?: DocumentSource;
    documentDate?: string;
    year?: number;
    serviceOrderId?: string;
    contractId?: string;
    invoiceId?: string;
  }
): Promise<Document> {
  const supabase = createUntypedClient();

  // Générer le chemin (sans préfixe 'ged/' car le bucket s'appelle déjà 'ged')
  const year = options?.year || new Date().getFullYear();
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${coproId}/${category}/${year}/${timestamp}_${safeName}`;

  // Upload le fichier
  const { error: uploadError } = await supabase.storage
    .from('ged')
    .upload(path, file);

  if (uploadError) throw uploadError;

  // Créer l'entrée document
  const doc = await createDocument({
    copro_id: coproId,
    file_name: file.name,
    file_path: path,
    file_size: file.size,
    mime_type: file.type,
    category,
    title: options?.title || file.name,
    description: options?.description,
    tags: options?.tags,
    folder_id: options?.folderId,
    confidentiality: options?.confidentiality || 'public',
    source_module: options?.sourceModule || 'manual',
    document_date: options?.documentDate || new Date().toISOString().split('T')[0],
    year,
    service_order_id: options?.serviceOrderId || undefined,
    contract_id: options?.contractId || undefined,
    invoice_id: options?.invoiceId || undefined,
  });

  return doc;
}

export async function getDocumentUrl(filePath: string, expiresIn = 3600): Promise<string> {
  const supabase = createUntypedClient();

  // Normaliser le chemin: supprimer le préfixe 'ged/' si présent (ancien format)
  // car le bucket s'appelle déjà 'ged'
  const normalizedPath = filePath.startsWith('ged/') ? filePath.slice(4) : filePath;

  const { data, error } = await supabase.storage
    .from('ged')
    .createSignedUrl(normalizedPath, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

export async function downloadDocument(filePath: string): Promise<Blob> {
  const supabase = createUntypedClient();

  // Normaliser le chemin: supprimer le préfixe 'ged/' si présent (ancien format)
  const normalizedPath = filePath.startsWith('ged/') ? filePath.slice(4) : filePath;

  const { data, error } = await supabase.storage
    .from('ged')
    .download(normalizedPath);

  if (error) throw error;
  return data;
}

// ============================================================================
// LINKS API
// ============================================================================

export interface DocumentLink {
  id: string;
  document_id: string;
  copro_id: string;
  entity_type: string;
  entity_id: string;
  /** relation_kind canonique re-mappé vers le vocabulaire legacy du front */
  link_type: 'main' | 'annexe' | 'related' | 'justificatif';
  label?: string | null;
  created_at: string;
}

const LINK_TYPE_FROM_RELATION_KIND: Record<string, DocumentLink['link_type']> = {
  source: 'main',
  annexe: 'annexe',
  related: 'related',
  justificatif: 'justificatif',
};

export async function linkDocumentToEntity(
  documentId: string,
  entityType: string,
  entityId: string,
  linkType: 'main' | 'annexe' | 'related' | 'justificatif' = 'related'
): Promise<void> {
  const supabase = createUntypedClient();

  // document_relations exige copro_id : dérivé du document lié.
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('copro_id')
    .eq('id', documentId)
    .single();
  if (docError) throw docError;

  const { error } = await supabase
    .from('document_relations')
    .insert({
      document_id: documentId,
      copro_id: doc.copro_id,
      entity_type: ENTITY_TYPE_FROM_LEGACY[entityType] ?? 'other',
      entity_id: entityId,
      relation_kind: RELATION_KIND_FROM_LINK_TYPE[linkType] ?? 'related',
    });

  if (error) throw error;
}

export async function getDocumentLinks(documentId: string): Promise<DocumentLink[]> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('document_relations')
    .select('*')
    .eq('document_id', documentId);

  if (error) throw error;
  return (data || []).map((r: { relation_kind: string } & Omit<DocumentLink, 'link_type'>) => ({
    ...r,
    link_type: LINK_TYPE_FROM_RELATION_KIND[r.relation_kind] ?? 'related',
  }));
}

export async function getDocumentsForEntity(entityType: string, entityId: string): Promise<Document[]> {
  const supabase = createUntypedClient();
  const { data: links, error: linksError }: { data: Array<{ document_id: string }> | null; error: unknown } = await supabase
    .from('document_relations')
    .select('document_id')
    .eq('entity_type', ENTITY_TYPE_FROM_LEGACY[entityType] ?? 'other')
    .eq('entity_id', entityId);

  if (linksError) throw linksError;
  if (!links?.length) return [];

  const documentIds = links.map((l: { document_id: string }) => l.document_id);
  // Vue de compat : shape legacy (confidentiality, version…) + soft-deleted exclus.
  const { data, error } = await supabase
    .from('v_documents_with_folder')
    .select('*')
    .in('id', documentIds);

  if (error) throw error;
  return data || [];
}

// ============================================================================
// VERSIONING API (vue v_document_versions — migration 0031, source unique)
// ============================================================================

/** Une ligne d'historique de version d'un document (vue v_document_versions). */
export interface DocumentVersionRow {
  document_id: string;
  version_number: number;
  file_path: string;
  file_name: string;
  file_size: number | null;
  created_by: string | null;
  created_at: string;
}

/**
 * Historique des versions d'un document (plus récent d'abord).
 * Le versioning suit le modèle POINTEUR : chaque snapshot est une ligne de
 * `document_versions`, le document courant pointant sur la dernière version.
 */
export async function getDocumentVersions(documentId: string): Promise<DocumentVersionRow[]> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('v_document_versions')
    .select('*')
    .eq('document_id', documentId)
    .order('version_number', { ascending: false });

  if (error) throw error;
  return data || [];
}
