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

export type MutationType = 'sale' | 'donation' | 'succession' | 'other';

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
  succession: 'Succession',
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

// Payload V2 — SORTIE RÉELLE de la RPC generate_etat_date_payload (migrations 0076 + 0080).
// Forme PLATE adossée au grand livre + identité des parties GELÉE dans le snapshot (Option B).
// Art. 5 décret 67-223. Toute évolution doit rester synchronisée avec le `jsonb_build_object` SQL.
export interface EtatDatePayloadV2 {
  version: '2.0';
  legal_reference: string;
  snapshot_type: SnapshotType;
  effective_date: string;

  // ── Identité gelée à la génération (valeur probante) ──
  copro: {
    id: string;
    name: string | null;
    address: string | null;
    siret: string | null;
    num_immatriculation: string | null;
  };
  syndic: {
    name: string | null;
    siret: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
  } | null;
  lot: {
    id: string;
    ref: string | null;
    type: string | null;
    floor: number | null;
    surface: number | null;
  };
  seller: {
    id: string;
    name: string | null;
    civility: string | null;
    is_company: boolean | null;
    email: string | null;
    address: string | null;
  };
  notaire: {
    name: string | null;
    office_name: string | null;
    notary_reference: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
  } | null;

  // ── Cédant(s) : tous les propriétaires actifs du lot à la date d'effet (H2 multi-cédants) ──
  cedants: Array<{
    coproprietaire_id: string;
    nom: string;
    share_percent: number;
    start_date: string;
    end_date: string | null;
  }>;

  // ── Partie 1 : sommes dues PAR le vendeur (comptes 45x débiteurs) ──
  partie_1_sommes_dues_vendeur: {
    label: string;
    items: Array<{ code: string; nature: string; amount: number }>;
    total: number;
  };

  // ── Partie 2 : sommes dues AU vendeur (45x créditeurs, hors 450-5 ALUR) ──
  partie_2_dues_par_syndicat: {
    label: string;
    items: Array<{ code: string; nature: string; amount: number }>;
    total: number;
    note: string;
  };

  // ── Partie 3 : à la charge de l'acquéreur ──
  partie_3_charge_acquereur: {
    label: string;
    reconstitution_avances: number;
    provisions_appelees_non_echues: number;
    provisions_votees_non_appelees_courant: number;
    provisions_votees_non_appelees_travaux: number;
    alur_a_venir: number;
    alur_note: string | null;
    total: number;
  };

  // ── Annexe : bases de calcul de la quote-part (art. 5) ──
  annexe_quote_part: {
    label: string;
    tantiemes_lot: number;
    tantiemes_total: number;
    owner_share_pct: number;
  };

  // Soldes 45x par compte (diagnostic).
  balance_45x_by_nature: Record<string, number>;
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
