import { TypeLitige, StatutLitige, UrgenceLevel, TypeRapport, StatutRapport } from '../enums';

/**
 * Litige
 */
export interface Litige {
  id: string;
  titre: string;
  type: TypeLitige | string;
  dateOuverture: string;
  statut: StatutLitige | string;
  parties: string[];
  description: string;
  priorite: UrgenceLevel | string;
}

/**
 * Rapport
 */
export interface Rapport {
  id: string;
  titre: string;
  type: TypeRapport | string;
  periode: string;
  dateGeneration: string;
  statut: StatutRapport | string;
  url?: string;
}
