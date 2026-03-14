/**
 * Types pour le pipeline d'envoi des convocations AG
 */

import type { SendingMethod } from '@/features/ag/types';

// ============================================================
// DESTINATAIRE (page de garde PDF)
// ============================================================

export interface ConvocationDestinataire {
  nom: string;
  adresse: string;
  complement?: string;
  codePostal: string;
  ville: string;
  lot: string;
  tantiemes: number;
  totalTantiemes: number;
  sendingMethod: string;
}

// ============================================================
// DISPATCH
// ============================================================

export interface DispatchParams {
  blob: Blob;
  fileName: string;
  copro: {
    id: string;
    nom: string;
    email?: string;
    adresse?: string;
    codePostal?: string;
    ville?: string;
  };
  method: SendingMethod;
  agId: string;
  coproId: string;
  agDate: string;
}

export interface DispatchResult {
  coproprietaireId: string;
  method: SendingMethod;
  status: 'sent' | 'queued' | 'error';
  trackingRef?: string;
  documentId?: string;
  error?: string;
  sentAt: string;
}

// ============================================================
// BUNDLE RPC (données pour génération PDF)
// ============================================================

export interface ConvocationBundleCopro {
  id: string;
  nom: string;
  email?: string;
  telephone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  postal_code?: string;
  lot_id?: string;
  has_lot: boolean;
  tantiemes?: number;
}

export interface ConvocationBundle {
  agData: {
    id: string;
    meeting_type: string;
    meeting_date: string;
    location: string;
    copro_id: string;
    opening_notes?: string;
    closing_notes?: string;
  };
  resolutions: Array<{
    id: string;
    title: string;
    description: string;
    majority_type: string;
    resolution_number: number;
    status: string;
    variables: Record<string, unknown>;
  }>;
  coproprietaires: ConvocationBundleCopro[];
  totalTantiemes: number;
  syndic: {
    nom: string;
    adresse: string;
    ville: string;
    code_postal: string;
  };
}

// ============================================================
// PROGRESSION UI
// ============================================================

export interface SendProgress {
  isActive: boolean;
  current: number;
  total: number;
  currentName: string;
  currentStep: 'loading' | 'generating' | 'dispatching' | 'archiving' | 'done' | 'cancelled';
  results: DispatchResult[];
  cancelled: boolean;
  zipUrl?: string;
}

export interface PostalEntry {
  blob: Blob;
  fileName: string;
  method: SendingMethod;
}
