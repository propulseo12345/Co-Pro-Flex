/**
 * Types pour le module Convocation (Étape 3)
 */

import { AGFormat } from '@/types';

export interface AdressePostale {
  rue: string;
  codePostal: string;
  ville: string;
}

export interface AGData {
  type: 'ORDINAIRE' | 'EXTRAORDINAIRE' | 'URGENTE';
  format?: AGFormat | 'PRESENTIEL' | 'VISIO' | 'MIXTE';
  date: string;
  heure: string;
  lieu: string;
  adresse: string | { nomLieu: string; rue: string; codePostal: string; ville: string };
  adresseComplete?: string;
  visioUrl?: string;
  visioProvider?: string;
  budget: boolean;
  budgetMontant: string;
  budgetExercice: string;
}

export interface Resolution {
  id: string;
  titre: string;
  texte: string;
  majorite: string;
  variables?: Record<string, string>;
  templateId?: string;
}

export interface Coproprietaire {
  id: string;
  nom: string;
  lot: string;
  email?: string;
  telephone?: string;
  adressePostale?: AdressePostale;
  tantiemes: number;
}

export interface CoproprietaireEditable extends Coproprietaire {
  isEditing?: boolean;
}

export interface CoproprieteInfo {
  id: string;
  nom: string;
  adresse: string;
  ville: string;
  codePostal: string;
}

export interface SyndicInfo {
  nom: string;
  adresse: string;
  codePostal: string;
  ville: string;
}

export type SendingMethod = 'RECOMMANDE' | 'LETTRE_SIMPLE' | 'AVIS_ELECTRONIQUE' | 'EMAIL' | 'REMISE_MAIN_PROPRE';

export interface SendingChoice {
  coproprietaireId: string;
  methods: SendingMethod[];
}

export type LoadingStatus = 'loading' | 'ready' | 'error' | 'degraded';

export interface DegradedMode {
  agDataFailed: boolean;
  resolutionsFailed: boolean;
  coproprietairesFailed: boolean;
}

export interface ConvocationError {
  code: string;
  message: string;
  details?: string;
}

export interface ConvocationState {
  status: LoadingStatus;
  agData: AGData | null;
  resolutions: Resolution[];
  coproprietaires: CoproprietaireEditable[];
  copropriete: CoproprieteInfo | null;
  syndic: SyndicInfo | null;
  sendingChoices: SendingChoice[];
  error: ConvocationError | null;
  degradedMode: DegradedMode;
}

export interface UseConvocationDataOptions {
  agId: string;
  timeoutMs?: number;
}

export interface UseConvocationDataReturn extends ConvocationState {
  reload: () => void;
  setCoproprietaires: React.Dispatch<React.SetStateAction<CoproprietaireEditable[]>>;
  setSendingChoices: React.Dispatch<React.SetStateAction<SendingChoice[]>>;
  saveCoproprietaires: (copros: CoproprietaireEditable[]) => void;
  saveSendingChoices: (choices: SendingChoice[]) => void;
}

export interface DraftMetadata {
  format?: AGFormat;
  heure?: string;
  adresse?: { nomLieu: string; rue: string; codePostal: string; ville: string };
  visioUrl?: string;
  visioProvider?: string;
  budget?: boolean;
  budgetMontant?: string;
  budgetExercice?: string;
  syndic?: SyndicInfo;
}
