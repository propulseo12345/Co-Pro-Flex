/**
 * Types et utilitaires pour les votes par correspondance
 * Art. 17-1 A loi 65-557
 */

import type { VoteDirection } from './types';

/**
 * Statut d'un formulaire de vote par correspondance
 */
export type CorrespondenceFormStatus = 'pending' | 'integrated' | 'partial' | 'rejected';

/**
 * Mode de réception du formulaire
 */
export type CorrespondenceReceptionMode = 'postal' | 'email' | 'remise_main';

/**
 * Formulaire de vote par correspondance
 */
export interface CorrespondenceForm {
  id: string;
  ag_id: string;
  copro_id: string;
  coproprietaire_id: string;
  form_document_id?: string;
  received_at?: string;
  validated: boolean;
  validated_by?: string;
  validated_at?: string;
  integration_status: CorrespondenceFormStatus;
  integrated_at?: string;
  mode_reception: CorrespondenceReceptionMode;
  notes?: string;
  created_at: string;
}

/**
 * Détail d'un vote par correspondance pour une résolution
 */
export interface CorrespondenceVoteDetail {
  id: string;
  correspondence_form_id: string;
  resolution_id: string;
  copro_id: string;
  coproprietaire_id: string;
  vote: VoteDirection;
  recorded_at: string;
  recorded_by?: string;
  integrated_vote_id?: string;
  integrated_at?: string;
}

/**
 * Copropriétaire éligible au vote par correspondance
 */
export interface EligibleOwner {
  id: string;
  name: string;
  email?: string;
  lots: {
    id: string;
    ref: string;
    tantiemes: number;
  }[];
  total_tantiemes: number;
  attendance?: {
    registered: boolean;
    presence_type?: 'present' | 'proxy' | 'correspondence';
    signed?: boolean;
  };
  correspondence?: {
    form_id: string;
    received_at: string;
    validated: boolean;
    integration_status: CorrespondenceFormStatus;
    votes_count: number;
  };
  voted_resolutions?: {
    resolution_id: string;
    vote: VoteDirection;
    vote_source: 'live' | 'correspondence';
  }[];
}

/**
 * Vote à enregistrer
 */
export interface CorrespondenceVoteInput {
  resolution_id: string;
  vote: VoteDirection;
}

/**
 * Résultat de l'enregistrement d'un formulaire
 */
export interface CorrespondenceFormResult {
  success: boolean;
  form_id?: string;
  votes_registered?: number;
  votes_failed?: number;
  details?: {
    resolution_id: string;
    result: {
      success: boolean;
      vote_id?: string;
      error?: string;
    };
  }[];
  error?: string;
}

/**
 * Statut global des votes par correspondance pour une AG
 */
export interface CorrespondenceStatus {
  ag_id: string;
  ag_title: string;
  ag_status: string;
  forms_received: number;
  forms_validated: number;
  forms_integrated: number;
  vote_details_count: number;
  votes_integrated: number;
  correspondence_tantiemes: number;
  total_tantiemes: number;
  correspondence_ratio: number;
}

/**
 * Breakdown des votes par source
 */
export interface VotesBySource {
  live: {
    voters: number;
    for: number;
    against: number;
    abstention: number;
  };
  correspondence: {
    voters: number;
    for: number;
    against: number;
    abstention: number;
  };
}

/**
 * Résultat de résolution enrichi avec breakdown par source
 */
export interface ResolutionResultWithBreakdown {
  resolution_id: string;
  majority_type: string;
  majority_rule: string;
  is_approved: boolean;
  is_bridgeable: boolean;
  votes: {
    for: { tantiemes: number; voters: number };
    against: { tantiemes: number; voters: number };
    abstention: { tantiemes: number; voters: number };
  };
  votes_by_source: VotesBySource;
  thresholds: {
    tantiemes_required: number;
    owners_required?: number;
  };
  quorum: {
    total_tantiemes: number;
    present_tantiemes: number;
    ratio: number;
    attendees_count: number;
  };
}

/**
 * Données live pour le projecteur (polling backend)
 */
export interface LiveResults {
  success: boolean;
  ag: {
    id: string;
    title: string;
    status: string;
    meeting_date: string;
    session_started_at?: string;
  };
  quorum: {
    total_tantiemes: number;
    present_tantiemes: number;
    quorum_ratio: number;
    attendees_count: number;
    present_count: number;
    proxy_count: number;
    correspondence_count: number;
  };
  resolutions: {
    id: string;
    resolution_number: number;
    title: string;
    majority_type: string;
    status: string;
    tantiemes_for: number;
    tantiemes_against: number;
    tantiemes_abstention: number;
    voters_for: number;
    voters_against: number;
    voters_abstention: number;
    threshold_tantiemes: number;
    is_approved: boolean | null;
    vote_details: {
      by_source?: VotesBySource;
    } | null;
    live_votes: {
      for: number;
      against: number;
      abstention: number;
      voters: number;
    };
    participation_percent: number;
  }[];
  timestamp: string;
  error?: string;
}
