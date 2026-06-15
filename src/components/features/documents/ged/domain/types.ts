import type { LinkedEntityType, ExtractedDocumentData } from '@/lib/documents/linking';
import type { NiveauConfidentialite } from '@/types/enums/misc';

// ============================================================================
// GED FOLDER TYPE
// ============================================================================

export interface GEDFolder {
  id: string;
  nom: string;
  parentId: string | null;
  icon?: string;
  color?: string;
  ordre: number;
  description?: string;
  documentCount?: number;
  subfolderCount?: number;
  categoryDefault?: string;
}

// ============================================================================
// DOCUMENT TYPE
// ============================================================================

export interface DocumentWithFolder {
  id: string;
  nom: string;
  titre?: string;
  description?: string;
  dateAjout: string;
  taille: string;
  type: 'PDF' | 'IMAGE' | 'AUTRE';
  categorie: string;
  tags?: string[];
  dossierId?: string | null;
  confidentialite?: NiveauConfidentialite | string;
  coproprieteId?: string;
  url?: string;
  annee?: number;
  isStarred?: boolean;
}

// ============================================================================
// PAGE STATE TYPES
// ============================================================================

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

export { LinkedEntityType, ExtractedDocumentData };
