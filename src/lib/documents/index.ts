/**
 * Module de génération de documents
 *
 * Ce module fournit les outils pour générer des documents avec des variables dynamiques.
 *
 * CORRECTIONS PRINCIPALES :
 * - {nom_syndic} : Retourne maintenant le nom du syndic (raison sociale ou nom/prénom)
 * - {modalite_paiement_fonds} : Retourne le libellé correct de la modalité
 */

// Service principal
export { DocumentGenerator } from './document-generator';

// Variables
export * from './variables';

// Utilitaires de construction de contexte
export { buildVariablesContext } from './build-context';
