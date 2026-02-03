// ============================================================================
// API: AG Documents - Génération et gestion des documents (Convocation, PV, etc.)
// ============================================================================

import { createUntypedClient, invokeEdgeFunction } from './utils';
import type {
  AgDocument,
  AgDocumentType,
  GenerateDocumentInput,
  GenerateDocumentResponse,
  AgStatus,
} from '../types';

/**
 * Génère un document PDF pour une AG (convocation, présence, PV)
 */
export async function generateAgDocument(input: GenerateDocumentInput): Promise<GenerateDocumentResponse> {
  return invokeEdgeFunction<GenerateDocumentResponse>('ag_generate_document', input);
}

/**
 * Liste les documents générés pour une AG
 */
export async function listAgDocuments(agId: string): Promise<AgDocument[]> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('v_ag_documents')
    .select('*')
    .eq('ag_id', agId)
    .order('generated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as AgDocument[];
}

/**
 * Récupère le dernier document d'un type pour une AG
 */
export async function getLatestAgDocument(
  agId: string,
  docType: AgDocumentType
): Promise<AgDocument | null> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('v_ag_documents')
    .select('*')
    .eq('ag_id', agId)
    .eq('doc_type', docType)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(error.message);
  }
  return data as AgDocument;
}

/**
 * Génère une URL signée pour télécharger un document AG
 * @param storagePath Chemin du fichier dans le bucket storage
 * @param expiresInSeconds Durée de validité (défaut: 900 = 15 minutes)
 */
export async function getAgDocumentSignedUrl(
  storagePath: string,
  expiresInSeconds: number = 900
): Promise<{ signedUrl: string; expiresAt: string }> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase.storage
    .from('ged')
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) throw new Error(error.message);

  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

  return {
    signedUrl: data.signedUrl,
    expiresAt,
  };
}

/**
 * Télécharge directement un document AG (retourne les bytes)
 */
export async function downloadAgDocument(storagePath: string): Promise<Blob> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase.storage
    .from('ged')
    .download(storagePath);

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Vérifie si un document existe pour une AG
 */
export async function hasAgDocument(
  agId: string,
  docType: AgDocumentType
): Promise<boolean> {
  const doc = await getLatestAgDocument(agId, docType);
  return doc !== null;
}

/**
 * Met à jour le statut de l'AG après génération du PV
 */
export async function markPvGenerated(
  agId: string,
  documentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createUntypedClient();

  const { error } = await supabase
    .from('ag_meetings')
    .update({
      status: 'pv_generated' as AgStatus,
      pv_document_id: documentId,
    })
    .eq('id', agId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
