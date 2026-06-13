/**
 * Hook pour gérer les documents uploadés en annexe d'une convocation AG.
 *
 * - Upload vers Supabase storage (bucket 'ged')
 * - Liaison document ↔ AG via document_links
 * - Chargement des documents liés
 * - Suppression
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  uploadDocument,
  downloadDocument,
  linkDocumentToEntity,
  type Document,
} from '@/lib/documents/api';
import {
  renderAllDocumentsToPages,
  type RenderedPage,
  type UploadedDocFile,
} from '@/lib/pdf/pdf-document-renderer';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

const ACCEPTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export interface UploadedAnnexeDoc {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  filePath: string;
  createdAt: string;
}

export interface UseConvocationDocumentsReturn {
  documents: UploadedAnnexeDoc[];
  isLoading: boolean;
  isUploading: boolean;
  error: string | null;
  uploadFile: (file: File) => Promise<boolean>;
  removeFile: (docId: string) => Promise<boolean>;
  renderedPages: RenderedPage[];
  isRendering: boolean;
  renderDocuments: () => Promise<void>;
}

export function useConvocationDocuments(
  agId: string | null,
  coproId: string | null,
): UseConvocationDocumentsReturn {
  const [documents, setDocuments] = useState<UploadedAnnexeDoc[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renderedPages, setRenderedPages] = useState<RenderedPage[]>([]);
  const [isRendering, setIsRendering] = useState(false);

  // Charger les documents liés à l'AG
  const loadDocuments = useCallback(async () => {
    if (!agId) return;
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createUntypedClient();

      // Chercher les documents liés à cette AG en tant qu'annexe
      // (document_relations = table canonique des liens, kind 'annexe')
      const { data, error: queryError } = await supabase
        .from('document_relations')
        .select(`
          document_id,
          documents:document_id (
            id, file_name, file_path, file_size, mime_type, created_at, status
          )
        `)
        .eq('entity_type', 'ag')
        .eq('entity_id', agId)
        .eq('relation_kind', 'annexe');

      if (queryError) throw new Error(queryError.message);

      const docs: UploadedAnnexeDoc[] = (data || [])
        .filter((row: { documents: { status?: string } | null }) =>
          row.documents && row.documents.status !== 'deleted')
        .map((row: { documents: { id: string; file_name: string; mime_type: string; file_size: number; file_path: string; created_at: string } }) => ({
          id: row.documents.id,
          name: row.documents.file_name,
          mimeType: row.documents.mime_type || 'application/octet-stream',
          size: row.documents.file_size || 0,
          filePath: row.documents.file_path,
          createdAt: row.documents.created_at,
        }));

      setDocuments(docs);
    } catch (err) {
      console.error('[useConvocationDocuments] Load error:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  }, [agId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Auto-render quand les documents changent
  useEffect(() => {
    if (documents.length > 0) {
      renderDocuments();
    } else {
      setRenderedPages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents.length]);

  // Upload un fichier
  const uploadFile = useCallback(async (file: File): Promise<boolean> => {
    if (!agId || !coproId) {
      setError('AG ou copropriété non définie');
      return false;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Type de fichier non supporté. Formats acceptés : PDF, PNG, JPG, WEBP');
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('Fichier trop volumineux (max 20 Mo)');
      return false;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Upload le document — catégorie 'autre' : fichier de TRAVAIL supprimable
      // pendant la rédaction. La catégorie 'convocation' déclenche la rétention
      // légale (deletion_blocked) qui doit protéger la convocation FINALE
      // (générée et archivée via ag_documents), pas ses brouillons d'annexes.
      const doc = await uploadDocument(file, coproId, 'autre', {
        title: file.name,
        description: `Annexe convocation AG`,
      });

      // Lier le document à l'AG
      await linkDocumentToEntity(doc.id, 'ag', agId, 'annexe');

      // Ajouter au state local
      setDocuments(prev => [...prev, {
        id: doc.id,
        name: doc.file_name,
        mimeType: doc.mime_type || file.type,
        size: doc.file_size || file.size,
        filePath: doc.file_path,
        createdAt: doc.created_at,
      }]);

      return true;
    } catch (err) {
      console.error('[useConvocationDocuments] Upload error:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload');
      return false;
    } finally {
      setIsUploading(false);
    }
  }, [agId, coproId]);

  // Supprimer un document
  const removeFile = useCallback(async (docId: string): Promise<boolean> => {
    if (!agId) return false;
    setError(null);

    try {
      const supabase = createUntypedClient();

      // Supprimer le lien
      const { error: relError } = await supabase
        .from('document_relations')
        .delete()
        .eq('document_id', docId)
        .eq('entity_type', 'ag')
        .eq('entity_id', agId);
      if (relError) throw new Error(relError.message);

      // Soft-delete D'ABORD : trg_document_soft_delete_guard (0052) refuse la
      // suppression d'un doc à conservation légale — dans ce cas on N'EFFACE PAS
      // le binaire. Le storage n'est retiré qu'après acceptation du soft-delete.
      const doc = documents.find(d => d.id === docId);
      if (doc) {
        const { error: delError } = await supabase.from('documents')
          .update({ status: 'deleted' })
          .eq('id', docId);
        if (delError) throw new Error(delError.message);
        await supabase.storage.from('ged').remove([doc.filePath]);
      }

      setDocuments(prev => prev.filter(d => d.id !== docId));

      return true;
    } catch (err) {
      console.error('[useConvocationDocuments] Remove error:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      return false;
    }
  }, [agId, documents]);

  // Rendre tous les documents en pages image pour insertion dans le PDF
  const renderDocuments = useCallback(async () => {
    if (documents.length === 0) {
      setRenderedPages([]);
      return;
    }

    setIsRendering(true);

    try {
      // Télécharger tous les fichiers depuis Supabase storage
      const files: UploadedDocFile[] = [];

      for (const doc of documents) {
        try {
          const blob = await downloadDocument(doc.filePath);
          files.push({
            name: doc.name,
            mimeType: doc.mimeType,
            blob,
          });
        } catch (err) {
          console.error(`[useConvocationDocuments] Download failed for ${doc.name}:`, err);
        }
      }

      // Rendre en pages
      const pages = await renderAllDocumentsToPages(files);
      setRenderedPages(pages);
    } catch (err) {
      console.error('[useConvocationDocuments] Render error:', err);
    } finally {
      setIsRendering(false);
    }
  }, [documents]);

  return {
    documents,
    isLoading,
    isUploading,
    error,
    uploadFile,
    removeFile,
    renderedPages,
    isRendering,
    renderDocuments,
  };
}
