/**
 * Domaines d'activité des prestataires
 * Données de référence (labels) — pas des données d'entité
 * Aligné sur l'enum provider_domain en base Supabase
 */

export type DomaineActiviteValue =
  | 'plomberie' | 'electricite' | 'chauffage' | 'ascenseur'
  | 'menage' | 'espaces_verts' | 'serrurerie' | 'peinture'
  | 'assurance' | 'juridique' | 'architecture' | 'toiture'
  | 'facade' | 'climatisation' | 'interphone' | 'portail'
  | 'securite' | 'autre';

export interface DomaineActivite {
  value: string;
  label: string;
  dbValue: DomaineActiviteValue;
}

/**
 * Liste des domaines d'activité avec labels FR
 * Le champ `value` garde l'uppercase pour compatibilité front existant
 * Le champ `dbValue` contient la valeur Supabase (lowercase)
 */
export const DOMAINES_ACTIVITE: DomaineActivite[] = [
  { value: 'PLOMBERIE', label: 'Plomberie', dbValue: 'plomberie' },
  { value: 'ELECTRICITE', label: 'Électricité', dbValue: 'electricite' },
  { value: 'CHAUFFAGE', label: 'Chauffage', dbValue: 'chauffage' },
  { value: 'ASCENSEUR', label: 'Ascenseur', dbValue: 'ascenseur' },
  { value: 'MENAGE', label: 'Ménage et entretien', dbValue: 'menage' },
  { value: 'ESPACES_VERTS', label: 'Espaces verts', dbValue: 'espaces_verts' },
  { value: 'SERRURERIE', label: 'Serrurerie', dbValue: 'serrurerie' },
  { value: 'PEINTURE', label: 'Peinture', dbValue: 'peinture' },
  { value: 'ASSURANCE', label: 'Assurance', dbValue: 'assurance' },
  { value: 'JURIDIQUE', label: 'Juridique', dbValue: 'juridique' },
  { value: 'ARCHITECTURE', label: 'Architecture', dbValue: 'architecture' },
  { value: 'TOITURE', label: 'Toiture et couverture', dbValue: 'toiture' },
  { value: 'FACADE', label: 'Ravalement façade', dbValue: 'facade' },
  { value: 'CLIMATISATION', label: 'Climatisation', dbValue: 'climatisation' },
  { value: 'INTERPHONE', label: 'Interphone / Vidéophone', dbValue: 'interphone' },
  { value: 'PORTAIL', label: 'Portail automatique', dbValue: 'portail' },
  { value: 'SECURITE', label: 'Sécurité', dbValue: 'securite' },
  { value: 'AUTRE', label: 'Autre', dbValue: 'autre' },
];

/** Trouver le label d'un domaine par sa valeur (uppercase ou lowercase) */
export function getDomaineLabel(value: string): string {
  const upper = value.toUpperCase();
  return DOMAINES_ACTIVITE.find(d => d.value === upper)?.label || value;
}
