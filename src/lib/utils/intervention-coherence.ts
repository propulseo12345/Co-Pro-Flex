/**
 * Utilitaires pour la validation de cohérence entre les interventions et les prestataires
 */

import { DomaineActivite, Prestataire } from '@/types';

/**
 * Catégories d'intervention possibles pour un ordre de service
 */
export type CategorieIntervention =
  | 'PLOMBERIE'
  | 'ELECTRICITE'
  | 'CHAUFFAGE_CLIMATISATION'
  | 'ASCENSEUR'
  | 'ESPACES_VERTS'
  | 'NETTOYAGE'
  | 'SERRURERIE_PORTAIL'
  | 'TOITURE_FACADE'
  | 'SECURITE'
  | 'AUTRE';

/**
 * Labels des catégories d'intervention
 */
export const CATEGORIES_INTERVENTION: Record<CategorieIntervention, {
  label: string;
  description: string;
  domainesCompatibles: DomaineActivite[];
}> = {
  'PLOMBERIE': {
    label: 'Plomberie',
    description: 'Fuites, canalisations, robinetterie, chauffe-eau',
    domainesCompatibles: ['PLOMBERIE', 'CHAUFFAGE']
  },
  'ELECTRICITE': {
    label: 'Électricité',
    description: 'Installation, dépannage, mise aux normes électriques',
    domainesCompatibles: ['ELECTRICITE', 'INTERPHONE']
  },
  'CHAUFFAGE_CLIMATISATION': {
    label: 'Chauffage / Climatisation',
    description: 'Chaudière, radiateurs, climatisation, ventilation',
    domainesCompatibles: ['CHAUFFAGE', 'CLIMATISATION', 'PLOMBERIE']
  },
  'ASCENSEUR': {
    label: 'Ascenseur',
    description: 'Maintenance, dépannage, mise aux normes ascenseur',
    domainesCompatibles: ['ASCENSEUR']
  },
  'ESPACES_VERTS': {
    label: 'Espaces verts',
    description: 'Entretien jardins, tonte, taille, plantations',
    domainesCompatibles: ['ESPACES_VERTS']
  },
  'NETTOYAGE': {
    label: 'Nettoyage',
    description: 'Nettoyage parties communes, vitrerie',
    domainesCompatibles: ['MENAGE']
  },
  'SERRURERIE_PORTAIL': {
    label: 'Serrurerie / Portail',
    description: 'Serrures, portes, portails, interphones',
    domainesCompatibles: ['SERRURERIE', 'PORTAIL', 'INTERPHONE']
  },
  'TOITURE_FACADE': {
    label: 'Toiture / Façade',
    description: 'Réparation toiture, ravalement, étanchéité',
    domainesCompatibles: ['TOITURE', 'FACADE', 'PEINTURE']
  },
  'SECURITE': {
    label: 'Sécurité incendie',
    description: 'Extincteurs, alarmes, désenfumage',
    domainesCompatibles: ['AUTRE']
  },
  'AUTRE': {
    label: 'Autre',
    description: 'Intervention non catégorisée',
    domainesCompatibles: ['AUTRE', 'PLOMBERIE', 'ELECTRICITE', 'CHAUFFAGE', 'ASCENSEUR', 'MENAGE', 'ESPACES_VERTS', 'SERRURERIE', 'PEINTURE', 'TOITURE', 'FACADE', 'CLIMATISATION', 'INTERPHONE', 'PORTAIL', 'ARCHITECTURE', 'JURIDIQUE', 'ASSURANCE']
  }
};

/**
 * Vérifie si un prestataire est compatible avec une catégorie d'intervention
 */
export function isPrestataireCompatible(
  prestataire: Prestataire,
  categorie: CategorieIntervention
): boolean {
  const domainesCompatibles = CATEGORIES_INTERVENTION[categorie].domainesCompatibles;
  return prestataire.domaines.some(domaine =>
    domainesCompatibles.includes(domaine as DomaineActivite)
  );
}

/**
 * Filtre les prestataires compatibles avec une catégorie d'intervention
 */
export function filtrerPrestatairesParCategorie(
  prestataires: Prestataire[],
  categorie: CategorieIntervention | null
): Prestataire[] {
  if (!categorie || categorie === 'AUTRE') {
    return prestataires;
  }

  return prestataires.filter(p => isPrestataireCompatible(p, categorie));
}

/**
 * Retourne un message d'alerte si le prestataire n'est pas compatible
 */
export function getAlerteIncoherence(
  prestataire: Prestataire | null,
  categorie: CategorieIntervention | null
): string | null {
  if (!prestataire || !categorie || categorie === 'AUTRE') {
    return null;
  }

  if (!isPrestataireCompatible(prestataire, categorie)) {
    const categorieInfo = CATEGORIES_INTERVENTION[categorie];
    return `Attention : ${prestataire.nom} n'est pas spécialisé dans le domaine "${categorieInfo.label}". ` +
           `Ses domaines de compétence sont : ${prestataire.domaines.join(', ')}.`;
  }

  return null;
}

/**
 * Suggère des prestataires compatibles pour une catégorie
 */
export function suggererPrestataires(
  prestataires: Prestataire[],
  categorie: CategorieIntervention,
  limit: number = 3
): Prestataire[] {
  const compatibles = filtrerPrestatairesParCategorie(prestataires, categorie);

  // Trier par note si disponible
  return compatibles
    .sort((a, b) => (b.noteMoyenne || 0) - (a.noteMoyenne || 0))
    .slice(0, limit);
}
