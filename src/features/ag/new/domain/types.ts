import { AGFormat } from '@/types';

export type GoogleMapsAutocompleteStatus = 'idle' | 'ready' | 'missing_api_key' | 'loading_error';

export interface AdresseAutocompleteSuggestion {
  id: string;
  label: string;
  nomLieu: string;
  adresse: AdresseAG;
}

export interface BudgetPoste {
  id: string;
  poste: string;
  montant: number;
  accountId?: string;
  accountCode?: string;
  accountName?: string;
  repartitionKeyId?: string;
  repartitionKeyName?: string;
}

export interface AdresseAG {
  nomLieu: string;
  rue: string;
  codePostal: string;
  ville: string;
}

export interface AGFormData {
  type: 'ORDINAIRE' | 'EXTRAORDINAIRE' | 'URGENTE';
  format: AGFormat;
  date: string;
  heure: string;
  lieu: string;
  adresse: AdresseAG;
  adresseComplete: string;
  visioUrl: string;
  visioProvider?: string;
  budget: boolean;
  budgetMontant: string;
  budgetExercice: string;
  budgetPostes: BudgetPoste[];
}

export interface EditingPosteState {
  id: string | null;
  data: { poste: string; montant: string };
  error: string | null;
}
