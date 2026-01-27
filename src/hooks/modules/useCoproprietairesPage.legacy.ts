/**
 * Données mock legacy - conservées uniquement pour compatibilité
 * @deprecated Utiliser useCoproprietaires() à la place
 */

import type { Coproprietaire } from './useCoproprietairesPage';

export const INITIAL_COPROPRIETAIRES: Coproprietaire[] = [
  { id: '1', nom: 'DUPONT', prenom: 'Jean', fonction: 'Membre du CS', solde: -73.30, telephone: '+33 6 12 34 56 78', email: 'jean.dupont@email.fr', type: 'COPROPRIETAIRE' },
  { id: '2', nom: 'GONTCHAROV', prenom: 'François', solde: -1372.84, telephone: '+33 6 23 45 67 89', email: 'francois.gontcharov@email.fr', type: 'COPROPRIETAIRE' },
];
