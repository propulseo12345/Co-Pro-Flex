import type {
  CategorieComptable,
  ICompteComptable,
} from './types';

export const MOTS_CLES_DETECTION = {
  appelsFonds: ['appel de fonds', 'appel fonds', 'charges', 'provision', 'cotisation'],
  travaux: ['travaux', 'btp', 'chantier', 'renovation', 'rénovation'],
  entretien: ['entretien', 'maintenance', 'réparation', 'reparation', 'ascenseur', 'plomberie'],
  assurance: ['assurance', 'prime', 'sinistre'],
  energie: ['edf', 'electricite', 'électricité', 'engie', 'gaz', 'veolia', 'eau'],
  remboursement: ['remboursement', 'avoir', 'retour', 'annulation'],
};

export const HEURISTIQUES_LIBELLE: Array<{
  pattern: RegExp;
  compte: string;
  label: string;
  categorie: CategorieComptable;
}> = [
  { pattern: /vir(ement)?\.?\s*(sepa|entrant)/i, compte: '701', label: 'Appels de fonds courants', categorie: 'produit' },
  { pattern: /appel\s*(de\s*)?fonds/i, compte: '701', label: 'Appels de fonds courants', categorie: 'produit' },
  { pattern: /charges?\s*(copro|courantes?)/i, compte: '701', label: 'Appels de fonds courants', categorie: 'produit' },
  { pattern: /prel[eè]v\.?\s*(edf|engie|électricité)/i, compte: '602', label: 'Électricité', categorie: 'charge' },
  { pattern: /edf|électricité|electricite/i, compte: '602', label: 'Électricité', categorie: 'charge' },
  { pattern: /veolia|lyonnaise|eau\s*(de\s*)?paris/i, compte: '601', label: 'Eau', categorie: 'charge' },
  { pattern: /gaz|engie/i, compte: '603', label: 'Chauffage', categorie: 'charge' },
  { pattern: /otis|schindler|kone|ascenseur/i, compte: '614', label: 'Contrats maintenance', categorie: 'charge' },
  { pattern: /entretien|maintenance|réparation|plombier|électricien/i, compte: '615', label: 'Réparations', categorie: 'charge' },
  { pattern: /axa|allianz|maif|assurance|prime/i, compte: '616', label: 'Assurance', categorie: 'charge' },
  { pattern: /travaux|rénovation|btp|chantier/i, compte: '671', label: 'Travaux votés AG', categorie: 'charge' },
  { pattern: /syndic|honoraires?\s*syndic/i, compte: '621', label: 'Honoraires syndic', categorie: 'charge' },
  { pattern: /remboursement|avoir|annulation/i, compte: '714', label: 'Produits divers', categorie: 'produit' },
];

export const PLAN_COMPTABLE_ESSENTIEL: ICompteComptable[] = [
  { code: '601', label: 'Eau', categorie: 'charge', keywords: ['eau', 'veolia', 'lyonnaise', 'suez'] },
  { code: '602', label: 'Électricité', categorie: 'charge', keywords: ['edf', 'electricite', 'électricité', 'enedis'] },
  { code: '603', label: 'Chauffage', categorie: 'charge', keywords: ['gaz', 'engie', 'chauffage', 'fuel', 'fioul'] },
  { code: '611', label: 'Nettoyage', categorie: 'charge', keywords: ['nettoyage', 'ménage', 'propreté'] },
  { code: '614', label: 'Contrats maintenance', categorie: 'charge', keywords: ['otis', 'schindler', 'kone', 'ascenseur', 'maintenance'] },
  { code: '615', label: 'Réparations', categorie: 'charge', keywords: ['réparation', 'reparation', 'plombier', 'électricien', 'serrurier'] },
  { code: '616', label: 'Assurance', categorie: 'charge', keywords: ['axa', 'allianz', 'maif', 'assurance', 'prime'] },
  { code: '621', label: 'Honoraires syndic', categorie: 'charge', keywords: ['syndic', 'honoraires', 'gestion'] },
  { code: '623', label: 'Honoraires tiers', categorie: 'charge', keywords: ['avocat', 'notaire', 'expert', 'géomètre', 'architecte'] },
  { code: '662', label: 'Frais bancaires', categorie: 'charge', keywords: ['frais bancaires', 'commission', 'agios'] },
  { code: '671', label: 'Travaux votés AG', categorie: 'charge', keywords: ['travaux', 'rénovation', 'btp', 'chantier'] },
  { code: '701', label: 'Appels de fonds courants', categorie: 'produit', keywords: ['appel', 'fonds', 'charges', 'provision', 'cotisation'] },
  { code: '702', label: 'Appels de fonds travaux', categorie: 'produit', keywords: ['appel', 'travaux', 'fonds travaux'] },
  { code: '705', label: 'Fonds travaux ALUR', categorie: 'produit', keywords: ['alur', 'fonds travaux', 'épargne'] },
  { code: '714', label: 'Produits divers', categorie: 'produit', keywords: ['remboursement', 'avoir', 'divers', 'location'] },
];
