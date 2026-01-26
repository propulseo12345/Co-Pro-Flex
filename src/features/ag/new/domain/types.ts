import { AGFormat } from '@/types';

export interface GooglePlaceResult {
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  name?: string;
}

export interface GoogleAutocomplete {
  addListener: (event: string, callback: () => void) => void;
  getPlace: () => GooglePlaceResult;
}

export interface GoogleAutocompleteOptions {
  types?: string[];
  componentRestrictions?: { country: string };
  fields?: string[];
}

export interface GoogleMapsAPI {
  maps: {
    places: {
      Autocomplete: new (input: HTMLInputElement, options?: GoogleAutocompleteOptions) => GoogleAutocomplete;
    };
    event: {
      clearInstanceListeners: (instance: GoogleAutocomplete) => void;
    };
  };
}

declare global {
  interface Window {
    google: GoogleMapsAPI;
    initGoogleMaps: () => void;
  }
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
