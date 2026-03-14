/**
 * Service de dispatch des convocations AG
 * Orchestre l'envoi par canal (email, postal, remise)
 */

import { autoFileToGED } from '@/lib/services/auto-file-ged.service';
import { createClient } from '@/lib/supabase/client';
import type {
  DispatchParams,
  DispatchResult,
  PostalEntry,
} from '@/features/ag/types/envoi-dispatch';

// ============================================================
// LABELS pour les methodes d'envoi
// ============================================================

export const SENDING_METHOD_LABELS: Record<string, string> = {
  RECOMMANDE: 'Recommande AR',
  LETTRE_SIMPLE: 'Lettre simple',
  AVIS_ELECTRONIQUE: 'Avis electronique',
  EMAIL: 'Email',
  REMISE_MAIN_PROPRE: 'Remise en main propre',
};

// ============================================================
// DISPATCH PRINCIPAL
// ============================================================

export async function dispatchConvocation(
  params: DispatchParams
): Promise<{ result: DispatchResult; postalEntry?: PostalEntry }> {
  const { blob, fileName, copro, method, agId, coproId, agDate } = params;
  const now = new Date().toISOString();

  // 1. Archiver dans la GED (fire-and-forget)
  let documentId: string | undefined;
  try {
    const gedResult = await autoFileToGED({
      blob,
      fileName,
      coproId,
      category: 'convocation',
      sourceModule: 'ag',
      entityId: agId,
      entityType: 'ag_meeting',
      linkType: 'related',
      subFolderName: `Convocations AG ${agDate}`,
      year: new Date().getFullYear(),
    });
    documentId = gedResult.documentId;
  } catch {
    // Non-bloquant : on continue meme si la GED echoue
  }

  // 2. Dispatcher selon le canal
  try {
    switch (method) {
      case 'EMAIL':
        return await dispatchEmail(params, documentId, now);

      case 'AVIS_ELECTRONIQUE':
        return {
          result: {
            coproprietaireId: copro.id,
            method,
            status: 'queued',
            documentId,
            sentAt: now,
          },
        };

      case 'RECOMMANDE':
      case 'LETTRE_SIMPLE':
      case 'REMISE_MAIN_PROPRE':
        return {
          result: {
            coproprietaireId: copro.id,
            method,
            status: 'queued',
            documentId,
            sentAt: now,
          },
          postalEntry: { blob, fileName, method },
        };

      default:
        return {
          result: {
            coproprietaireId: copro.id,
            method,
            status: 'error',
            error: `Canal inconnu: ${method}`,
            sentAt: now,
          },
        };
    }
  } catch (err) {
    return {
      result: {
        coproprietaireId: copro.id,
        method,
        status: 'error',
        error: err instanceof Error ? err.message : 'Erreur inconnue',
        documentId,
        sentAt: now,
      },
    };
  }
}

// ============================================================
// EMAIL DISPATCH
// ============================================================

async function dispatchEmail(
  params: DispatchParams,
  documentId: string | undefined,
  sentAt: string
): Promise<{ result: DispatchResult }> {
  const { copro, method, agId } = params;

  if (!copro.email) {
    return {
      result: {
        coproprietaireId: copro.id,
        method,
        status: 'error',
        error: 'Pas d\'adresse email',
        documentId,
        sentAt,
      },
    };
  }

  try {
    const supabase = createClient();

    // Convertir blob en base64
    const arrayBuffer = await params.blob.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).functions.invoke('send-convocation-email', {
      body: {
        to: copro.email,
        subject: `Convocation Assemblee Generale — ${params.agDate}`,
        recipientName: copro.nom,
        pdfBase64: base64,
        fileName: params.fileName,
        agId,
      },
    });

    if (error) throw error;

    return {
      result: {
        coproprietaireId: copro.id,
        method,
        status: 'sent',
        trackingRef: data?.messageId,
        documentId,
        sentAt,
      },
    };
  } catch (err) {
    return {
      result: {
        coproprietaireId: copro.id,
        method,
        status: 'error',
        error: err instanceof Error ? err.message : 'Erreur envoi email',
        documentId,
        sentAt,
      },
    };
  }
}

// ============================================================
// ZIP GENERATION
// ============================================================

export async function generatePostalZip(entries: PostalEntry[]): Promise<Blob> {
  const JSZipModule = await import('jszip');
  const zip = new JSZipModule.default();

  for (const entry of entries) {
    const folderName = entry.method.toLowerCase();
    const folder = zip.folder(folderName);
    if (folder) {
      folder.file(entry.fileName, entry.blob);
    }
  }

  return zip.generateAsync({ type: 'blob' });
}

// ============================================================
// SAVE TRACKING TO DB
// ============================================================

export async function saveEnvoiTracking(
  agId: string,
  results: DispatchResult[]
): Promise<void> {
  if (results.length === 0) return;

  const supabase = createClient();

  const entries = results.map(r => ({
    coproprietaireId: r.coproprietaireId,
    method: r.method,
    status: r.status,
    trackingRef: r.trackingRef || null,
    documentId: r.documentId || null,
    error: r.error || null,
    sentAt: r.sentAt,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).rpc('save_ag_envoi_tracking', {
    p_ag_id: agId,
    p_entries: entries,
  });
}
