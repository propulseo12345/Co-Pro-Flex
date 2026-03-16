export type VoteChoice = 'POUR' | 'CONTRE' | 'ABSTENTION' | null;
export type VoteSource = 'CORRESPONDANCE' | 'DIRECT' | null;

export interface Resolution {
  id: string;
  titre: string;
  texte: string;
  majorite: string;
  passerelle?: unknown;
  resultat?: 'ADOPTEE' | 'REJETEE' | 'AJOURNEE';
  variables?: Record<string, string>;
}

export interface VoteData {
  resolutionId: string;
  coproprietaireId: string;
  vote: VoteChoice;
  tantiemes: number;
  source?: VoteSource;
}

export interface SessionState {
  started: boolean;
  currentResolutionIndex: number;
  completedResolutions: string[];
}

export interface VoteStats {
  pour: number;
  contre: number;
  abstention: number;
  nonVote: number;
  total: number;
  pourcentagePour: number;
}

export interface MajorityResult {
  adopted: boolean;
  reason: string;
  passerelle251Eligible?: boolean;
  passerelle251Data?: {
    pourTantiemes: number;
    totalTantiemes: number;
    seuilUntiers: number;
  };
  passerelle261Eligible?: boolean;
  passerelle261Data?: {
    pourTantiemes: number;
    totalTantiemes: number;
    seuilDemiTantiemes: number;
    coprosPour: number;
    totalCoproprietaires: number;
  };
}

export interface PasserelleVoteInitial {
  stats: VoteStats;
  result: MajorityResult;
  votes: VoteData[];
}
