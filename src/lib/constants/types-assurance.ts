/**
 * Configuration des types d'assurance pour copropriété
 */

export interface TypeAssuranceConfig {
  id: string;
  label: string;
  labelCourt: string;
  description: string;
  obligatoire: boolean;
  dureeTypique: number; // en années
}

export const TYPES_ASSURANCE: Record<string, TypeAssuranceConfig> = {
  MRI: {
    id: 'MRI',
    label: 'Multirisque Immeuble (MRI)',
    labelCourt: 'MRI',
    description: 'Couverture globale de l\'immeuble contre les risques principaux',
    obligatoire: true,
    dureeTypique: 1,
  },
  RC_SYNDICAT: {
    id: 'RC_SYNDICAT',
    label: 'Responsabilité Civile Syndicat',
    labelCourt: 'RC Syndicat',
    description: 'Responsabilité civile du syndicat des copropriétaires',
    obligatoire: true,
    dureeTypique: 1,
  },
  DOMMAGES_OUVRAGE: {
    id: 'DOMMAGES_OUVRAGE',
    label: 'Dommages Ouvrage (DO)',
    labelCourt: 'DO',
    description: 'Garantie décennale pour les travaux de construction/rénovation',
    obligatoire: false,
    dureeTypique: 10,
  },
  PROTECTION_JURIDIQUE: {
    id: 'PROTECTION_JURIDIQUE',
    label: 'Protection Juridique',
    labelCourt: 'PJ',
    description: 'Couverture des frais de procédure et défense juridique',
    obligatoire: false,
    dureeTypique: 1,
  },
  AUTRE: {
    id: 'AUTRE',
    label: 'Autre',
    labelCourt: 'Autre',
    description: 'Autre type d\'assurance',
    obligatoire: false,
    dureeTypique: 1,
  },
} as const;

export type SousTypeAssuranceKey = keyof typeof TYPES_ASSURANCE;

/**
 * Garanties standards pour assurance multirisque immeuble
 */
export interface GarantieStandard {
  id: string;
  nom: string;
  description: string;
  categorie: 'dommages' | 'responsabilite' | 'protection';
}

export const GARANTIES_STANDARDS: GarantieStandard[] = [
  // Dommages aux biens
  {
    id: 'incendie',
    nom: 'Incendie',
    description: 'Dommages causés par le feu, fumée, explosion',
    categorie: 'dommages',
  },
  {
    id: 'degats_eaux',
    nom: 'Dégâts des eaux',
    description: 'Fuites, infiltrations, ruptures de canalisations',
    categorie: 'dommages',
  },
  {
    id: 'vol_vandalisme',
    nom: 'Vol et vandalisme',
    description: 'Vol et actes de vandalisme dans les parties communes',
    categorie: 'dommages',
  },
  {
    id: 'bris_glace',
    nom: 'Bris de glace',
    description: 'Vitres, miroirs, enseignes des parties communes',
    categorie: 'dommages',
  },
  {
    id: 'catastrophes_naturelles',
    nom: 'Catastrophes naturelles',
    description: 'Inondations, séismes, tempêtes exceptionnelles',
    categorie: 'dommages',
  },
  {
    id: 'tempete_grele_neige',
    nom: 'Tempête, grêle, neige',
    description: 'Dommages climatiques courants',
    categorie: 'dommages',
  },
  {
    id: 'degats_electriques',
    nom: 'Dégâts électriques',
    description: 'Surtensions, courts-circuits sur équipements',
    categorie: 'dommages',
  },
  // Responsabilité
  {
    id: 'responsabilite_civile',
    nom: 'Responsabilité civile',
    description: 'Dommages causés aux tiers par l\'immeuble',
    categorie: 'responsabilite',
  },
  {
    id: 'defense_recours',
    nom: 'Défense et recours',
    description: 'Défense en cas de mise en cause, recours contre tiers',
    categorie: 'responsabilite',
  },
  // Protection
  {
    id: 'protection_juridique',
    nom: 'Protection juridique',
    description: 'Frais de procédure et conseils juridiques',
    categorie: 'protection',
  },
  {
    id: 'assistance',
    nom: 'Assistance',
    description: 'Intervention d\'urgence 24h/24 (serrurier, plombier...)',
    categorie: 'protection',
  },
];

/**
 * Obtenir le label d'un type d'assurance
 */
export function getTypeAssuranceLabel(sousType: string): string {
  return TYPES_ASSURANCE[sousType]?.label || sousType;
}

/**
 * Obtenir le label court d'un type d'assurance
 */
export function getTypeAssuranceLabelCourt(sousType: string): string {
  return TYPES_ASSURANCE[sousType]?.labelCourt || sousType;
}

/**
 * Vérifier si un type d'assurance est obligatoire
 */
export function isAssuranceObligatoire(sousType: string): boolean {
  return TYPES_ASSURANCE[sousType]?.obligatoire || false;
}

/**
 * Obtenir les garanties par catégorie
 */
export function getGarantiesParCategorie(): Record<string, GarantieStandard[]> {
  return GARANTIES_STANDARDS.reduce((acc, garantie) => {
    if (!acc[garantie.categorie]) {
      acc[garantie.categorie] = [];
    }
    acc[garantie.categorie].push(garantie);
    return acc;
  }, {} as Record<string, GarantieStandard[]>);
}

/**
 * Labels des catégories de garanties
 */
export const CATEGORIES_GARANTIES_LABELS: Record<string, string> = {
  dommages: 'Dommages aux biens',
  responsabilite: 'Responsabilité',
  protection: 'Protection et assistance',
};
