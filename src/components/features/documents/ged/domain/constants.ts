import type { SearchFilters } from './types';

export const ITEMS_PER_PAGE = 24;
export const MAX_SEARCH_HISTORY = 10;
export const SEARCH_HISTORY_KEY = 'ged_search_history';

export const DEFAULT_FILTERS: SearchFilters = {
  categories: [],
  dateFrom: '',
  dateTo: '',
  sizeMin: '',
  sizeMax: '',
  fileTypes: [],
};

export const AVAILABLE_MONTHS = [
  { value: '01', label: 'Janvier' },
  { value: '02', label: 'Février' },
  { value: '03', label: 'Mars' },
  { value: '04', label: 'Avril' },
  { value: '05', label: 'Mai' },
  { value: '06', label: 'Juin' },
  { value: '07', label: 'Juillet' },
  { value: '08', label: 'Août' },
  { value: '09', label: 'Septembre' },
  { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' },
  { value: '12', label: 'Décembre' },
];

export const CATEGORY_COLORS: Record<string, string> = {
  PV_AG: '#3B82F6',
  REGLEMENT: '#8B5CF6',
  CONTRAT: '#10B981',
  FACTURE: '#F59E0B',
  DIAGNOSTIC: '#EF4444',
  PLAN: '#06B6D4',
  CORRESPONDANCE: '#EC4899',
  PHOTO: '#84CC16',
  ORDRE_SERVICE: '#F97316',
  AUTRE: '#6B7280',
};

export const FILE_TYPES = ['PDF', 'Image', 'Excel', 'Autre'];
