import type { DocumentWithFolder } from '@/data/mock/documents-ged';
import type { LinkedEntityType, ExtractedDocumentData } from '@/lib/services/document-linking.service';

export type SortField = 'nom' | 'dateAjout' | 'taille' | 'categorie' | 'pertinence';
export type SortOrder = 'asc' | 'desc';
export type ViewMode = 'grid' | 'list';
export type NavigationMode = 'folders' | 'all' | 'search';

export interface SearchFilters {
  categories: string[];
  dateFrom: string;
  dateTo: string;
  sizeMin: string;
  sizeMax: string;
  fileTypes: string[];
}

export interface SearchSuggestion {
  type: 'document' | 'category' | 'folder';
  label: string;
  value: string;
  color?: string;
}

export interface DetectedEntityType {
  type: LinkedEntityType;
  confidence: number;
}

export interface DocumentWithRelevance extends DocumentWithFolder {
  relevanceScore?: number;
}

export { DocumentWithFolder, LinkedEntityType, ExtractedDocumentData };
