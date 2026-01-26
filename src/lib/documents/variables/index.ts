/**
 * Système de variables dynamiques pour les documents
 *
 * Ce module fournit un système robuste et typé pour la gestion des variables
 * dans les documents générés (convocations, PV, annexes, etc.)
 *
 * CORRECTIONS PRINCIPALES :
 * - {nom_syndic} : Retourne maintenant le nom du syndic (raison sociale ou nom/prénom)
 * - {modalite_paiement_fonds} : Retourne le libellé correct de la modalité
 */

// Types
export type {
  CategorieVariable,
  VariableDefinition,
  ModalitePaiement,
  TypeSyndic,
  VariablesContext,
  ResolvedVariable,
  GenerateDocumentResult,
} from './types';

export { LIBELLES_MODALITE_PAIEMENT } from './types';

// Catalogue
export {
  CATALOGUE_VARIABLES,
  getVariableDefinition,
  getVariablesByCategorie,
  getAllVariableKeys,
  getCategories,
} from './catalogue';

// Résolveur
export {
  resolveVariables,
  resolveVariable,
  generateEcheancesDates,
} from './resolver';
