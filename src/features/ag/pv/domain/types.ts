// Types pour jspdf-autotable
export interface AutoTableStyles {
  fillColor?: number[];
  textColor?: number[];
  fontSize?: number;
  fontStyle?: string;
  cellWidth?: number | 'auto' | 'wrap';
}

export interface AutoTableOptions {
  startY?: number;
  head?: string[][];
  body?: (string | number)[][];
  theme?: 'striped' | 'grid' | 'plain';
  styles?: AutoTableStyles;
  headStyles?: AutoTableStyles;
  bodyStyles?: AutoTableStyles;
  alternateRowStyles?: AutoTableStyles;
  columnStyles?: Record<number, AutoTableStyles>;
  margin?: { left?: number; right?: number };
}

// Types métier
export interface AGData {
  type: 'ORDINAIRE' | 'EXTRAORDINAIRE' | 'MIXTE';
  date: string;
  heure: string;
  lieu: string;
  adresse: string;
}

export interface Resolution {
  id: string;
  titre: string;
  texte: string;
  majorite: string;
  variables?: Record<string, string>;
  templateId?: string;
  resultat?: 'ADOPTEE' | 'REJETEE' | 'AJOURNEE';
  passerelle?: {
    type: string;
    voteInitial: {
      pour: number;
      contre: number;
      abstention: number;
    };
    secondVote?: {
      pour: number;
      contre: number;
      abstention: number;
    };
    mentionPV?: string;
  };
}

export interface VoteData {
  resolutionId: string;
  coproprietaireId: string;
  vote: 'POUR' | 'CONTRE' | 'ABSTENTION' | null;
  tantiemes: number;
}

export interface Signataire {
  id: string;
  role: 'president' | 'secretaire' | 'scrutateur';
  roleLabel: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  signature?: string;
  signedAt?: string;
  estGestionnaire?: boolean;
  representeSyndic?: string;
}

export interface PresenceData {
  coproprietaireId: string;
  statut: 'PRESENT' | 'REPRESENTE' | 'ABSENT' | null;
  mandataireId?: string;
  mandataireManuel?: string;
}

export interface ResolutionResult {
  pour: number;
  contre: number;
  abstention: number;
  total: number;
  adopte: boolean;
  passerelle?: Resolution['passerelle'];
}

export interface PVStats {
  adoptedCount: number;
  rejectedCount: number;
  totalCount: number;
}
