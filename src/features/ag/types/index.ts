import type { PasserelleMajorite } from '@/types';
import type { MajorityType } from '@/lib/constants/resolutions';

// Export notification types
export * from './notifications';

export interface Resolution {
  id: string;
  templateId?: string;
  titre: string;
  texte: string;
  majorite: MajorityType;
  variables?: Record<string, string>;
  custom?: boolean;
  categorie?: string;
  resultat?: 'ADOPTEE' | 'REJETEE' | 'AJOURNEE';
  passerelle?: PasserelleMajorite;
  action_type?: string;
}

export type VoteChoice = 'POUR' | 'CONTRE' | 'ABSTENTION' | null;
export type VoteSource = 'DIRECT' | 'CORRESPONDANCE' | null;

export interface VoteData {
  resolutionId: string;
  coproprietaireId: string;
  vote: VoteChoice;
  tantiemes: number;
  source: VoteSource;
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

export interface PasserelleVoteInitial {
  stats: VoteStats;
  result: MajorityResult;
  votes: VoteData[];
}

export interface MajorityResult {
  adopted: boolean;
  reason: string;
  passerelle251Eligible?: boolean;
}

export interface EditingVariable {
  name: string;
  value: string;
}

export type SendingMethod = 'RECOMMANDE' | 'LETTRE_SIMPLE' | 'AVIS_ELECTRONIQUE' | 'EMAIL' | 'REMISE_MAIN_PROPRE';

export interface SendingChoice {
  coproprietaireId: string;
  methods: SendingMethod[];
}

export interface BudgetPoste {
  id: string;
  poste: string;
  montant: number;
}

export interface AdresseAG {
  nomLieu: string;
  rue: string;
  codePostal: string;
  ville: string;
}

export interface AGFormData {
  type: 'ORDINAIRE' | 'EXTRAORDINAIRE';
  date: string;
  heure: string;
  lieu: string;
  adresse: AdresseAG;
  adresseComplete: string;
  budget: boolean;
  budgetMontant: string;
  budgetExercice: string;
  budgetPostes: BudgetPoste[];
}
