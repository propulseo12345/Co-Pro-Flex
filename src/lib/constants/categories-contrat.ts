import type { TypeContrat } from '@/types';

export type CategorieContrat = 'ASSURANCE' | 'MAINTENANCE' | 'PRESTATION' | 'AUTRE';

export interface CategorieContratConfig {
  value: CategorieContrat;
  label: string;
  types: TypeContrat[];
}

export const CATEGORIES_CONTRAT: CategorieContratConfig[] = [
  {
    value: 'ASSURANCE',
    label: 'Assurances',
    types: ['ASSURANCE', 'JURIDIQUE']
  },
  {
    value: 'MAINTENANCE',
    label: 'Maintenance technique',
    types: ['ASCENSEUR', 'CHAUFFAGE', 'ELECTRICITE', 'EAU', 'TOITURE', 'FACADE', 'INTERPHONE', 'PORTAIL']
  },
  {
    value: 'PRESTATION',
    label: 'Prestations de service',
    types: ['MENAGE', 'ESPACES_VERTS']
  },
  {
    value: 'AUTRE',
    label: 'Autres',
    types: ['AUTRE']
  }
];

export const TYPES_CONTRAT: { value: TypeContrat; label: string; categorie: CategorieContrat }[] = [
  { value: 'ASCENSEUR', label: 'Ascenseur', categorie: 'MAINTENANCE' },
  { value: 'MENAGE', label: 'Ménage et entretien', categorie: 'PRESTATION' },
  { value: 'EAU', label: 'Eau', categorie: 'MAINTENANCE' },
  { value: 'ELECTRICITE', label: 'Électricité', categorie: 'MAINTENANCE' },
  { value: 'ASSURANCE', label: 'Assurance', categorie: 'ASSURANCE' },
  { value: 'ESPACES_VERTS', label: 'Espaces verts', categorie: 'PRESTATION' },
  { value: 'CHAUFFAGE', label: 'Chauffage', categorie: 'MAINTENANCE' },
  { value: 'TOITURE', label: 'Toiture', categorie: 'MAINTENANCE' },
  { value: 'FACADE', label: 'Façade', categorie: 'MAINTENANCE' },
  { value: 'INTERPHONE', label: 'Interphone', categorie: 'MAINTENANCE' },
  { value: 'PORTAIL', label: 'Portail', categorie: 'MAINTENANCE' },
  { value: 'JURIDIQUE', label: 'Services juridiques', categorie: 'ASSURANCE' },
  { value: 'AUTRE', label: 'Autre', categorie: 'AUTRE' },
];

export function getCategorieFromType(type: TypeContrat): CategorieContrat {
  const categorie = CATEGORIES_CONTRAT.find(cat => cat.types.includes(type));
  return categorie?.value || 'AUTRE';
}
