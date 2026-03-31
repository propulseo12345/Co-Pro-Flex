// ============================================================================
// TYPES: Mutations & États Datés (Conforme docs métier)
// ============================================================================

// Status workflow (docs métier: notifiée → pré_état_envoyé → en_attente_acte → validée)
export type MutationStatus =
  | 'draft'              // Brouillon
  | 'pre_etat_generated' // Pré-état daté généré
  | 'etat_generated'     // État daté final généré
  | 'signed'             // Acte signé
  | 'validated'          // Mutation validée (transfert effectué)
  | 'cancelled';         // Annulée

export type MutationType = 'sale' | 'donation' | 'inheritance' | 'other';

export type SnapshotType = 'pre' | 'final';

// Labels français pour l'UI
export const MUTATION_STATUS_LABELS: Record<MutationStatus, string> = {
  draft: 'Notifiée',
  pre_etat_generated: 'Pré-état envoyé',
  etat_generated: 'État daté généré',
  signed: 'En attente acte',
  validated: 'Validée',
  cancelled: 'Annulée',
};

export const MUTATION_TYPE_LABELS: Record<MutationType, string> = {
  sale: 'Vente',
  donation: 'Donation',
  inheritance: 'Succession',
  other: 'Autre',
};

// ============================================================================
// INTERFACES
// ============================================================================

export interface Mutation {
  id: string;
  copro_id: string;
  lot_id: string;
  status: MutationStatus;
  mutation_type: MutationType;

  // Vendeur
  seller_owner_id: string;

  // Acheteur (peut être null avant validation)
  buyer_owner_id: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_is_company: boolean | null;

  // Notaire
  notary_name: string | null;
  notary_email: string | null;
  notary_reference: string | null;

  // Dates
  requested_at: string;
  signature_date: string | null;
  effective_date: string | null;

  // Métadonnées
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Vue enrichie (v_mutations_overview)
export interface MutationOverview extends Mutation {
  lot_ref: string;
  lot_type: string;
  tantiemes_generaux: number;
  building_id: string | null;
  floor: number | null;
  seller_name: string;
  seller_email: string | null;
  days_until_pre_etat_deadline: number | null;
  has_pre_etat: boolean;
  has_final_etat: boolean;
}

// Snapshot état daté
export interface EtatDateSnapshot {
  id: string;
  copro_id: string;
  mutation_id: string;
  snapshot_type: SnapshotType;
  generated_at: string;
  generated_by: string | null;
  payload: EtatDatePayload;
  document_id: string | null;
}

// Payload JSON conforme Art. 20 (V1 — legacy)
export interface EtatDatePayloadV1 {
  version?: '1.0';
  legal_reference: string;
  snapshot_type: SnapshotType;
  generated_at: string;

  copro: {
    id: string;
    name: string;
    address: string | null;
    siret: string | null;
  };

  lot: {
    id: string;
    ref: string;
    type: string;
    tantiemes_generaux: number;
    building_id: string | null;
    floor: number | null;
    surface: number | null;
  };

  seller: {
    id: string;
    name: string;
    email: string | null;
    is_company: boolean;
  };

  financial_situation: {
    snapshot_date: string;
    current_balance: number;
    total_calls_issued: number;
    total_payments_received: number;

    // Impayés exigibles (Art. 20 - obligatoire)
    unpaid: {
      amount: number;
      lines_count: number;
      oldest_due_date: string | null;
      days_overdue: number;
    };

    // Fonds travaux ALUR (Art. 14-2 II - obligatoire)
    work_fund_alur: {
      balance: number;
      note: string;
    };

    // Appels à venir (obligatoire)
    pending_calls: {
      amount: number;
      note: string;
    };
  };

  recent_transactions: Array<{
    line_date: string;
    line_type: 'call' | 'payment';
    label: string;
    debit: number;
    credit: number;
    running_balance: number;
    line_status: string;
  }>;

  recent_transactions_count: number;

  mutation: {
    id: string;
    type: MutationType;
    requested_at: string;
    signature_date: string | null;
    notary_name: string | null;
  };
}

// Payload V2 — conforme Décret 67-223 du 17 mars 1967, Art. 5 et 5-1
export interface EtatDatePayloadV2 {
  version: '2.0';
  legal_reference: 'Décret 67-223 du 17 mars 1967, Art. 5 et 5-1';
  snapshot_type: SnapshotType;
  generated_at: string;
  snapshot_date: string;

  copro: {
    id: string;
    name: string;
    address: string;
    siret: string | null;
    syndic_name: string;
    syndic_address: string;
  };

  lot: {
    id: string;
    ref: string;
    type: string;
    building: string | null;
    floor: number | null;
    surface: number | null;
    tantiemes_generaux: number;
    total_tantiemes: number;
    repartition_keys: Array<{
      key_name: string;
      tantiemes: number;
      total: number;
    }>;
  };

  seller: {
    id: string;
    name: string;
    email: string | null;
    address: string | null;
    is_company: boolean;
  };

  mutation: {
    id: string;
    type: MutationType;
    requested_at: string;
    signature_date: string | null;
    notary_name: string | null;
    notary_email: string | null;
  };

  partie1_vendeur_doit: {
    provisions_budget: {
      amount: number;
      detail: Array<{ label: string; due_date: string; amount_due: number; amount_paid: number; remaining: number; }>;
    };
    provisions_travaux: {
      amount: number;
      detail: Array<{ label: string; due_date: string; amount_due: number; amount_paid: number; remaining: number; }>;
    };
    arrieres: {
      amount: number;
      detail: Array<{ period_label: string; amount: number; }>;
    };
    emprunts_collectifs: {
      amount: number;
      detail: Array<{ label: string; lender: string; total_loan: number; seller_share: number; remaining: number; }>;
    };
    avances_exigibles: {
      amount: number;
      detail: Array<{ label: string; amount_due: number; amount_paid: number; }>;
    };
    total: number;
  };

  partie2_syndicat_doit: {
    avances_versees: {
      amount: number;
      detail: Array<{ label: string; type: string; amount: number; }>;
    };
    provisions_post_mutation: { amount: number; note: string; };
    trop_percus: { amount: number; note: string; };
    total: number;
  };

  partie3_acquereur: {
    reconstitution_avances: {
      amount: number;
      detail: Array<{ label: string; amount: number; }>;
    };
    provisions_non_exigibles: { amount: number; note: string; };
    travaux_votes_non_appeles: {
      amount: number;
      detail: Array<{ label: string; ag_date: string; total_vote: number; lot_share: number; }>;
    };
    fonds_travaux_alur: { balance: number; note: string; };
    total: number;
  };

  annexe: {
    historique_charges: Array<{ period_label: string; budget_previsionnel: number; hors_budget: number; total: number; }>;
    procedures_judiciaires: Array<{ title: string; nature: string; opposing_party: string; amount_at_stake: number; status: string; court: string; }>;
    solde_compte: number;
    recent_transactions: Array<{ line_date: string; line_type: 'call' | 'payment'; label: string; debit: number; credit: number; running_balance: number; }>;
  };
}

export type EtatDatePayload = EtatDatePayloadV1 | EtatDatePayloadV2;

export function isPayloadV2(payload: EtatDatePayload): payload is EtatDatePayloadV2 {
  return payload.version === '2.0';
}

// ============================================================================
// FORMULAIRES
// ============================================================================

export interface CreateMutationInput {
  copro_id: string;
  lot_id: string;
  seller_owner_id: string;
  mutation_type: MutationType;
  buyer_name?: string;
  buyer_email?: string;
  buyer_is_company?: boolean;
  notary_name?: string;
  notary_email?: string;
  notary_reference?: string;
  notes?: string;
}

export interface ValidateMutationInput {
  mutation_id: string;
  signature_date: string;
  buyer_owner_id?: string;
  buyer_first_name?: string;
  buyer_last_name?: string;
  buyer_email?: string;
  buyer_is_company?: boolean;
}

// ============================================================================
// STATS
// ============================================================================

export interface MutationsStats {
  total: number;
  draft: number;
  pre_etat_generated: number;
  etat_generated: number;
  signed: number;
  validated: number;
  cancelled: number;
  enCours: number;
  documentsManquants: number;
}

// ============================================================================
// FILTERS
// ============================================================================

export interface MutationsFilters {
  search: string;
  status: MutationStatus | 'ALL';
  mutation_type: MutationType | 'ALL';
}
