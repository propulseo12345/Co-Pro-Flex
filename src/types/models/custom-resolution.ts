/**
 * Types pour les résolutions personnalisées
 */

import type { MajorityType } from '@/lib/constants/resolutions';

// Scope de partage
export type ResolutionScope = 'private' | 'org' | 'shared';

// Variable personnalisée
export interface CustomVariable {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'select';
  required: boolean;
  defaultValue?: string;
  options?: string[]; // Pour type 'select'
  placeholder?: string;
}

// Résolution personnalisée complète
export interface ICustomResolution {
  id: string;

  // Métadonnées
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  organizationId: string;

  // Contenu
  titre: string;
  texte: string;
  categorie: string;
  majorite: MajorityType;

  // Variables
  variables: CustomVariable[];

  // Scope et partage
  scope: ResolutionScope;
  isTemplate: boolean;

  // Validation juridique
  legalRef?: string;
  legalWarnings?: string[];

  // Stats
  usageCount: number;
  lastUsedAt?: string;

  // Tags
  tags: string[];
}

// Format d'export
export interface ResolutionExport {
  version: '1.0';
  exportedAt: string;
  resolution: Omit<ICustomResolution, 'id' | 'createdBy' | 'organizationId' | 'usageCount' | 'lastUsedAt'>;
}

// Validation juridique - mapping article/catégorie
export const ARTICLE_CATEGORY_VALIDATION: Record<MajorityType, string[]> = {
  'ART_24': [
    'Assemblée Générale',
    'Gestion courante',
    'Syndic',
    'Budget',
    'Comptabilité',
    'Communication',
    'Divers',
    'Autre',
  ],
  'ART_25': [
    'Syndic',
    'Conseil syndical',
    'Travaux',
    'Contrats',
    'Règlement intérieur',
    'Sécurité et conformité',
    'Énergie et environnement',
    'Assurances',
  ],
  'ART_25_1': [
    'Travaux',
    'Contrats',
  ],
  'ART_26': [
    'Travaux',
    'Règlement de copropriété',
    'Parties communes',
    'Parking et espaces communs',
  ],
  'ART_26_1': [
    'Travaux',
    'Règlement de copropriété',
  ],
  'UNANIMITE': [
    'Parties communes',
    'Règlement de copropriété',
  ],
  'INFORMATION': [
    'Assemblée Générale',
    'Communication',
    'Divers',
    'Autre',
  ],
};

// Templates de départ
export const STARTER_TEMPLATES: Partial<ICustomResolution>[] = [
  {
    titre: 'Travaux de rénovation',
    texte: "L'Assemblée Générale, après en avoir délibéré, décide de faire réaliser les travaux de {nature_travaux} par l'entreprise {entreprise} pour un montant de {montant} € TTC, selon le devis n° {numero_devis} du {date_devis}.\n\nLes travaux seront financés par un appel de fonds exceptionnel réparti selon les tantièmes généraux.\n\nLe syndic est autorisé à signer tous documents nécessaires à l'exécution de la présente décision.",
    categorie: 'Travaux',
    majorite: 'ART_24',
    variables: [
      { key: 'nature_travaux', label: 'Nature des travaux', type: 'text', required: true, placeholder: 'ex: ravalement de façade' },
      { key: 'entreprise', label: 'Entreprise', type: 'text', required: true },
      { key: 'montant', label: 'Montant TTC', type: 'currency', required: true },
      { key: 'numero_devis', label: 'N° de devis', type: 'text', required: true },
      { key: 'date_devis', label: 'Date du devis', type: 'date', required: true },
    ],
    tags: ['travaux', 'devis', 'appel de fonds'],
  },
  {
    titre: 'Autorisation de travaux privatifs',
    texte: "L'Assemblée Générale, après en avoir délibéré, autorise {nom_coproprietaire}, propriétaire du lot n° {numero_lot}, à réaliser les travaux suivants affectant les parties communes ou l'aspect extérieur de l'immeuble :\n\n{description_travaux}\n\nCette autorisation est donnée sous réserve :\n- Du respect des règles d'urbanisme applicables\n- De la souscription d'une assurance dommages-ouvrage\n- De l'absence de nuisances excessives pour les autres copropriétaires\n\nLes frais et honoraires liés à ces travaux sont à la charge exclusive du demandeur.",
    categorie: 'Travaux',
    majorite: 'ART_25',
    variables: [
      { key: 'nom_coproprietaire', label: 'Nom du copropriétaire', type: 'text', required: true },
      { key: 'numero_lot', label: 'N° de lot', type: 'text', required: true },
      { key: 'description_travaux', label: 'Description des travaux', type: 'text', required: true },
    ],
    tags: ['travaux privatifs', 'autorisation', 'parties communes'],
  },
  {
    titre: 'Modification du règlement intérieur',
    texte: "L'Assemblée Générale, après en avoir délibéré, décide de modifier le règlement intérieur de la copropriété comme suit :\n\n{modifications}\n\nCes modifications entreront en vigueur à compter du {date_effet}.\n\nLe syndic est chargé de notifier ces modifications à l'ensemble des copropriétaires et occupants.",
    categorie: 'Règlement intérieur',
    majorite: 'ART_25',
    variables: [
      { key: 'modifications', label: 'Modifications apportées', type: 'text', required: true },
      { key: 'date_effet', label: "Date d'effet", type: 'date', required: true },
    ],
    tags: ['règlement', 'modification'],
  },
  {
    titre: 'Souscription contrat de maintenance',
    texte: "L'Assemblée Générale, après en avoir délibéré, décide de souscrire un contrat de maintenance {type_maintenance} auprès de la société {prestataire} pour une durée de {duree} à compter du {date_debut}, pour un montant annuel de {montant_annuel} € TTC.\n\nLe syndic est autorisé à signer le contrat et tous documents y afférents.",
    categorie: 'Contrats',
    majorite: 'ART_24',
    variables: [
      { key: 'type_maintenance', label: 'Type de maintenance', type: 'select', required: true, options: ['ascenseur', 'chaufferie', 'VMC', 'portail', 'interphone', 'espaces verts'] },
      { key: 'prestataire', label: 'Prestataire', type: 'text', required: true },
      { key: 'duree', label: 'Durée', type: 'select', required: true, options: ['1 an', '2 ans', '3 ans', '5 ans'] },
      { key: 'date_debut', label: 'Date de début', type: 'date', required: true },
      { key: 'montant_annuel', label: 'Montant annuel TTC', type: 'currency', required: true },
    ],
    tags: ['contrat', 'maintenance', 'prestataire'],
  },
  {
    titre: 'Constitution d\'un fonds travaux supplémentaire',
    texte: "L'Assemblée Générale, après en avoir délibéré, décide de constituer un fonds travaux supplémentaire, en plus du fonds travaux légal (article 14-2 de la loi du 10 juillet 1965), afin de financer les travaux de {objet_travaux}.\n\nCe fonds sera alimenté par une cotisation annuelle de {pourcentage}% du budget prévisionnel, soit {montant_annuel} €, répartie selon les tantièmes généraux.\n\nCette cotisation s'appliquera à compter de l'exercice {exercice}.",
    categorie: 'Budget',
    majorite: 'ART_25',
    variables: [
      { key: 'objet_travaux', label: 'Objet des travaux', type: 'text', required: true },
      { key: 'pourcentage', label: 'Pourcentage du budget', type: 'number', required: true },
      { key: 'montant_annuel', label: 'Montant annuel', type: 'currency', required: true },
      { key: 'exercice', label: 'Exercice de début', type: 'text', required: true },
    ],
    tags: ['fonds travaux', 'budget', 'épargne'],
  },
];

// Fonction de validation juridique
export function validateResolutionLegal(
  majorite: MajorityType,
  categorie: string
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const validCategories = ARTICLE_CATEGORY_VALIDATION[majorite] || [];

  if (validCategories.length > 0 && !validCategories.includes(categorie)) {
    warnings.push(
      `La catégorie "${categorie}" n'est généralement pas associée à l'${majorite.replace('_', ' ')}. Vérifiez que le choix de majorité est approprié.`
    );
  }

  // Warnings spécifiques
  if (majorite === 'UNANIMITE' && !['Parties communes', 'Règlement de copropriété'].includes(categorie)) {
    warnings.push(
      "L'unanimité est rarement requise en dehors des aliénations de parties communes ou modifications substantielles du règlement de copropriété."
    );
  }

  if (majorite === 'ART_26' && categorie === 'Gestion courante') {
    warnings.push(
      "L'article 26 (double majorité) n'est normalement pas requis pour la gestion courante."
    );
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}
