/**
 * Types pour le module Dossiers de la copropriété
 */

/**
 * Catégories de dossiers
 */
export enum DossierCategorie {
  FINANCE = 'FINANCE',
  AG = 'AG',
  DOCUMENTS = 'DOCUMENTS',
  MAINTENANCE = 'MAINTENANCE'
}

/**
 * Statuts possibles d'un dossier
 */
export enum DossierStatut {
  A_FAIRE = 'A_FAIRE',
  EN_COURS = 'EN_COURS',
  BLOQUE = 'BLOQUE',
  TERMINE = 'TERMINE'
}

/**
 * Niveaux de priorité
 */
export enum DossierPriorite {
  BASSE = 'BASSE',
  NORMALE = 'NORMALE',
  HAUTE = 'HAUTE',
  URGENTE = 'URGENTE'
}

/**
 * Interface d'un dossier
 */
export interface IDossier {
  id: string;
  titre: string;
  description?: string;
  categorie: DossierCategorie;
  statut: DossierStatut;
  priorite: DossierPriorite;
  deadline: string; // ISO date string
  coproprieteId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Labels des catégories
 */
export const DOSSIER_CATEGORIE_LABELS: Record<DossierCategorie, string> = {
  [DossierCategorie.FINANCE]: 'Finance',
  [DossierCategorie.AG]: 'Assemblée Générale',
  [DossierCategorie.DOCUMENTS]: 'Documents',
  [DossierCategorie.MAINTENANCE]: 'Maintenance'
};

/**
 * Couleurs des catégories
 */
export const DOSSIER_CATEGORIE_COLORS: Record<DossierCategorie, string> = {
  [DossierCategorie.FINANCE]: '#10B981',
  [DossierCategorie.AG]: '#8B5CF6',
  [DossierCategorie.DOCUMENTS]: '#3B82F6',
  [DossierCategorie.MAINTENANCE]: '#F59E0B'
};

/**
 * Labels des statuts
 */
export const DOSSIER_STATUT_LABELS: Record<DossierStatut, string> = {
  [DossierStatut.A_FAIRE]: 'À faire',
  [DossierStatut.EN_COURS]: 'En cours',
  [DossierStatut.BLOQUE]: 'Bloqué',
  [DossierStatut.TERMINE]: 'Terminé'
};

/**
 * Couleurs des statuts
 */
export const DOSSIER_STATUT_COLORS: Record<DossierStatut, string> = {
  [DossierStatut.A_FAIRE]: '#6B7280',
  [DossierStatut.EN_COURS]: '#3B82F6',
  [DossierStatut.BLOQUE]: '#EF4444',
  [DossierStatut.TERMINE]: '#10B981'
};

/**
 * Labels des priorités
 */
export const DOSSIER_PRIORITE_LABELS: Record<DossierPriorite, string> = {
  [DossierPriorite.BASSE]: 'Basse',
  [DossierPriorite.NORMALE]: 'Normale',
  [DossierPriorite.HAUTE]: 'Haute',
  [DossierPriorite.URGENTE]: 'Urgente'
};

/**
 * Couleurs des priorités
 */
export const DOSSIER_PRIORITE_COLORS: Record<DossierPriorite, string> = {
  [DossierPriorite.BASSE]: '#6B7280',
  [DossierPriorite.NORMALE]: '#3B82F6',
  [DossierPriorite.HAUTE]: '#F59E0B',
  [DossierPriorite.URGENTE]: '#EF4444'
};

/**
 * Formulaire de création/édition d'un dossier
 */
export interface DossierFormData {
  titre: string;
  description?: string;
  categorie: DossierCategorie;
  priorite: DossierPriorite;
  deadline: string;
}
