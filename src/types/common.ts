/**
 * Types utilitaires partagés
 */

// Type pour les identifiants
export type ID = string;

// Interface de base avec timestamps
export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

// Entité de base
export interface BaseEntity extends Timestamps {
  id: ID;
}

// Type nullable
export type Nullable<T> = T | null;

// Type pour les réponses paginées
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Type pour les réponses API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Type pour les filtres de recherche
export interface SearchFilters {
  query?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Adresse générique
export interface Adresse {
  rue: string;
  codePostal: string;
  ville: string;
  pays?: string;
}
