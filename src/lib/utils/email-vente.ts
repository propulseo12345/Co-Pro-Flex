/**
 * Utilitaires pour la génération d'emails dans le module Ventes
 */

import type { EmailTemplateVente } from '@/lib/constants/email-templates-ventes';
import { DEFAULT_TEMPLATE_NOTAIRE } from '@/lib/constants/email-templates-ventes';

/**
 * Interface pour les données de la vente utilisées dans le template
 */
export interface VenteEmailData {
  // Notaire
  notaire: {
    nom: string;
    prenom?: string;
    email: string;
    telephone: string;
  };
  // Vendeur
  vendeur: {
    nom: string;
    prenom?: string;
  };
  // Acquéreur
  acquereur: {
    nom: string;
    prenom?: string;
  };
  // Lot
  lotId: string;
  lotType?: string;
  // Copropriété
  copropriete: {
    nom: string;
    adresse?: string;
  };
  // Syndic
  syndic: {
    civilite?: string;
    nom: string;
    email?: string;
    telephone?: string;
  };
  // Dates
  dateCompromis?: string;
  dateActeAuthentique?: string | null;
  dateEtatDate?: string;
  // Documents
  documents: Array<{
    nom: string;
    type?: string;
    statut?: string;
  }>;
}

/**
 * Configuration par défaut du syndic (à remplacer par les vraies données)
 * TODO: Récupérer depuis le contexte utilisateur/paramètres
 */
const DEFAULT_SYNDIC = {
  civilite: 'M.',
  nom: 'Jean MARTIN',
  email: 'syndic@coproflex.fr',
  telephone: '01 23 45 67 89',
};

/**
 * Nom par défaut de la copropriété
 * TODO: Récupérer depuis le contexte
 */
const DEFAULT_COPROPRIETE = {
  nom: 'Résidence Les Jardins',
  adresse: '50 Route La Carrière au Loup, 75002 Paris',
};

/**
 * Formate une date ISO en format français lisible
 */
const formatDateFr = (dateString?: string | null): string => {
  if (!dateString) return 'Non définie';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Génère la liste des documents au format texte
 */
const formatDocumentsList = (documents: VenteEmailData['documents']): string => {
  if (documents.length === 0) {
    return '• Aucun document joint';
  }

  return documents
    .map(doc => `• ${doc.nom}${doc.statut === 'signe' ? ' (signé)' : ''}`)
    .join('\n');
};

/**
 * Construit le dictionnaire de variables pour la substitution
 */
export const buildEmailVariables = (data: VenteEmailData): Record<string, string> => {
  const syndic = { ...DEFAULT_SYNDIC, ...data.syndic };
  const copropriete = { ...DEFAULT_COPROPRIETE, ...data.copropriete };

  return {
    // Notaire
    civilite_notaire: 'Maître',
    nom_notaire: data.notaire.nom,
    prenom_notaire: data.notaire.prenom || '',
    email_notaire: data.notaire.email,

    // Lot et copropriété
    numero_lot: data.lotId,
    type_lot: data.lotType || 'Lot',
    adresse_immeuble: copropriete.adresse || '',
    nom_copropriete: copropriete.nom,

    // Parties
    nom_vendeur: data.vendeur.nom,
    prenom_vendeur: data.vendeur.prenom || '',
    nom_acquereur: data.acquereur.nom,
    prenom_acquereur: data.acquereur.prenom || '',

    // Dates
    date_etat_date: formatDateFr(data.dateEtatDate || new Date().toISOString()),
    date_compromis: formatDateFr(data.dateCompromis),
    date_signature_prevue: formatDateFr(data.dateActeAuthentique),

    // Syndic
    civilite_syndic: syndic.civilite || '',
    nom_syndic: syndic.nom,
    coordonnees_syndic: `Tél. : ${syndic.telephone || 'N/A'} | Email : ${syndic.email || 'N/A'}`,

    // Documents
    liste_documents: formatDocumentsList(data.documents),
    nombre_documents: String(data.documents.length),
  };
};

/**
 * Substitue les variables dans un template
 * Remplace les patterns {{variable}} par les valeurs correspondantes
 */
export const substituteEmailVariables = (
  template: string,
  variables: Record<string, string>
): string => {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key];
    return value !== undefined ? value : match;
  });
};

/**
 * Génère l'objet et le corps de l'email à partir d'un template et des données de vente
 */
export const generateEmailNotaire = (
  data: VenteEmailData,
  template: EmailTemplateVente = DEFAULT_TEMPLATE_NOTAIRE
): { objet: string; corps: string } => {
  const variables = buildEmailVariables(data);

  return {
    objet: substituteEmailVariables(template.objet, variables),
    corps: substituteEmailVariables(template.corps, variables),
  };
};

/**
 * Génère uniquement le corps de l'email (pour mise à jour dynamique)
 */
export const generateEmailCorps = (
  data: VenteEmailData,
  template: EmailTemplateVente = DEFAULT_TEMPLATE_NOTAIRE
): string => {
  const variables = buildEmailVariables(data);
  return substituteEmailVariables(template.corps, variables);
};

/**
 * Génère uniquement l'objet de l'email
 */
export const generateEmailObjet = (
  data: VenteEmailData,
  template: EmailTemplateVente = DEFAULT_TEMPLATE_NOTAIRE
): string => {
  const variables = buildEmailVariables(data);
  return substituteEmailVariables(template.objet, variables);
};

/**
 * Valide que toutes les variables requises sont présentes
 */
export const validateEmailData = (
  data: VenteEmailData
): { isValid: boolean; missingFields: string[] } => {
  const missingFields: string[] = [];

  if (!data.notaire?.nom) missingFields.push('Nom du notaire');
  if (!data.notaire?.email) missingFields.push('Email du notaire');
  if (!data.vendeur?.nom) missingFields.push('Nom du vendeur');
  if (!data.acquereur?.nom) missingFields.push('Nom de l\'acquéreur');
  if (!data.lotId) missingFields.push('Numéro de lot');

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
};
