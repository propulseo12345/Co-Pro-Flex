/**
 * Templates d'email pour le module Ventes
 * Utilisés pour la communication avec les notaires et autres parties prenantes
 */

export interface EmailTemplateVente {
  id: string;
  nom: string;
  description: string;
  objet: string;
  corps: string;
  variablesDisponibles: string[];
}

/**
 * Variables disponibles pour les templates d'email ventes
 * Format: {{variable}} dans le template
 */
export const VARIABLES_EMAIL_VENTE = {
  // Notaire
  CIVILITE_NOTAIRE: '{{civilite_notaire}}',
  NOM_NOTAIRE: '{{nom_notaire}}',
  PRENOM_NOTAIRE: '{{prenom_notaire}}',
  EMAIL_NOTAIRE: '{{email_notaire}}',

  // Lot et copropriété
  NUMERO_LOT: '{{numero_lot}}',
  TYPE_LOT: '{{type_lot}}',
  ADRESSE_IMMEUBLE: '{{adresse_immeuble}}',
  NOM_COPROPRIETE: '{{nom_copropriete}}',

  // Parties
  NOM_VENDEUR: '{{nom_vendeur}}',
  PRENOM_VENDEUR: '{{prenom_vendeur}}',
  NOM_ACQUEREUR: '{{nom_acquereur}}',
  PRENOM_ACQUEREUR: '{{prenom_acquereur}}',

  // Dates
  DATE_ETAT_DATE: '{{date_etat_date}}',
  DATE_COMPROMIS: '{{date_compromis}}',
  DATE_SIGNATURE_PREVUE: '{{date_signature_prevue}}',

  // Syndic
  CIVILITE_SYNDIC: '{{civilite_syndic}}',
  NOM_SYNDIC: '{{nom_syndic}}',
  COORDONNEES_SYNDIC: '{{coordonnees_syndic}}',

  // Documents
  LISTE_DOCUMENTS: '{{liste_documents}}',
  NOMBRE_DOCUMENTS: '{{nombre_documents}}',
} as const;

/**
 * Template principal - Email professionnel au notaire
 * Conforme aux usages syndic/notaire pour transmission de l'état daté
 */
export const TEMPLATE_EMAIL_NOTAIRE_PRINCIPAL: EmailTemplateVente = {
  id: 'notaire-etat-date-principal',
  nom: 'Transmission état daté - Standard',
  description: 'Template professionnel pour l\'envoi des documents de vente au notaire',
  objet: 'Transmission de l\'état daté – Vente du lot {{numero_lot}} – {{nom_copropriete}}',
  corps: `{{civilite_notaire}} {{prenom_notaire}} {{nom_notaire}},

Dans le cadre de la vente du lot n°{{numero_lot}} situé au sein de la copropriété {{nom_copropriete}}, dont le vendeur est {{prenom_vendeur}} {{nom_vendeur}} et l'acquéreur {{prenom_acquereur}} {{nom_acquereur}}, vous trouverez ci-joint les documents suivants :

{{liste_documents}}

Ces documents permettent de préciser la situation financière du lot et du vendeur vis-à-vis du syndicat des copropriétaires, conformément aux dispositions des articles 10-1 de la loi du 10 juillet 1965 et L721-2 du Code de la construction et de l'habitation.

Nous restons à votre disposition pour toute précision complémentaire ou pour tout document que vous jugeriez nécessaire à la finalisation de l'acte.

Cordialement,

{{civilite_syndic}} {{nom_syndic}}
Syndic de la copropriété {{nom_copropriete}}
{{coordonnees_syndic}}`,
  variablesDisponibles: [
    '{{civilite_notaire}}',
    '{{prenom_notaire}}',
    '{{nom_notaire}}',
    '{{numero_lot}}',
    '{{nom_copropriete}}',
    '{{prenom_vendeur}}',
    '{{nom_vendeur}}',
    '{{prenom_acquereur}}',
    '{{nom_acquereur}}',
    '{{liste_documents}}',
    '{{civilite_syndic}}',
    '{{nom_syndic}}',
    '{{coordonnees_syndic}}',
  ],
};

/**
 * Template simplifié - Version courte
 */
export const TEMPLATE_EMAIL_NOTAIRE_SIMPLE: EmailTemplateVente = {
  id: 'notaire-etat-date-simple',
  nom: 'Transmission état daté - Simplifié',
  description: 'Version courte pour envois rapides',
  objet: 'Documents vente lot {{numero_lot}} - {{nom_copropriete}}',
  corps: `{{civilite_notaire}} {{prenom_notaire}} {{nom_notaire}},

Veuillez trouver ci-joint les documents relatifs à la vente du lot n°{{numero_lot}} (vendeur : {{prenom_vendeur}} {{nom_vendeur}}, acquéreur : {{prenom_acquereur}} {{nom_acquereur}}).

Documents joints :
{{liste_documents}}

Cordialement,
{{civilite_syndic}} {{nom_syndic}}
{{coordonnees_syndic}}`,
  variablesDisponibles: [
    '{{civilite_notaire}}',
    '{{prenom_notaire}}',
    '{{nom_notaire}}',
    '{{numero_lot}}',
    '{{nom_copropriete}}',
    '{{prenom_vendeur}}',
    '{{nom_vendeur}}',
    '{{prenom_acquereur}}',
    '{{nom_acquereur}}',
    '{{liste_documents}}',
    '{{civilite_syndic}}',
    '{{nom_syndic}}',
    '{{coordonnees_syndic}}',
  ],
};

/**
 * Template complet avec détails supplémentaires
 */
export const TEMPLATE_EMAIL_NOTAIRE_COMPLET: EmailTemplateVente = {
  id: 'notaire-etat-date-complet',
  nom: 'Transmission état daté - Complet',
  description: 'Version détaillée avec références légales et liste exhaustive',
  objet: 'Transmission de l\'état daté – Vente du lot {{numero_lot}} – Immeuble {{nom_copropriete}}',
  corps: `{{civilite_notaire}} {{prenom_notaire}} {{nom_notaire}},

Dans le cadre de la vente du lot n°{{numero_lot}} situé au sein de la copropriété {{nom_copropriete}}, dont le vendeur est {{prenom_vendeur}} {{nom_vendeur}} et l'acquéreur {{prenom_acquereur}} {{nom_acquereur}}, vous trouverez ci-joint les documents suivants :

{{liste_documents}}

Ces documents comprennent notamment :
• L'état daté établi en date du {{date_etat_date}} ;
• Le règlement de copropriété et ses modificatifs, le cas échéant ;
• Les trois derniers procès-verbaux d'assemblée générale ;
• Les derniers appels de fonds et décomptes de charges relatifs au lot ;
• Tout autre document utile à la rédaction de l'acte authentique.

Ces documents permettent de préciser la situation financière du lot et du vendeur vis-à-vis du syndicat des copropriétaires, conformément aux dispositions des articles 10-1 de la loi du 10 juillet 1965 et L721-2 du Code de la construction et de l'habitation.

Nous restons à votre disposition pour toute précision complémentaire ou pour tout document que vous jugeriez nécessaire à la finalisation de l'acte.

Cordialement,

{{civilite_syndic}} {{nom_syndic}}
Syndic de la copropriété {{nom_copropriete}}
{{coordonnees_syndic}}`,
  variablesDisponibles: [
    '{{civilite_notaire}}',
    '{{prenom_notaire}}',
    '{{nom_notaire}}',
    '{{numero_lot}}',
    '{{nom_copropriete}}',
    '{{prenom_vendeur}}',
    '{{nom_vendeur}}',
    '{{prenom_acquereur}}',
    '{{nom_acquereur}}',
    '{{liste_documents}}',
    '{{date_etat_date}}',
    '{{civilite_syndic}}',
    '{{nom_syndic}}',
    '{{coordonnees_syndic}}',
  ],
};

/**
 * Liste de tous les templates disponibles
 */
export const TEMPLATES_EMAIL_NOTAIRE: EmailTemplateVente[] = [
  TEMPLATE_EMAIL_NOTAIRE_PRINCIPAL,
  TEMPLATE_EMAIL_NOTAIRE_SIMPLE,
  TEMPLATE_EMAIL_NOTAIRE_COMPLET,
];

/**
 * Récupère un template par son ID
 */
export const getTemplateById = (id: string): EmailTemplateVente | undefined => {
  return TEMPLATES_EMAIL_NOTAIRE.find(t => t.id === id);
};

/**
 * Template par défaut
 */
export const DEFAULT_TEMPLATE_NOTAIRE = TEMPLATE_EMAIL_NOTAIRE_PRINCIPAL;
