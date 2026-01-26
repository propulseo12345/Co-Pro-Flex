/**
 * Types pour le système de variables dynamiques dans les documents
 */

/**
 * Catégories de variables disponibles
 */
export type CategorieVariable =
  | 'copropriete'      // Infos de la copropriété
  | 'syndic'           // Infos du syndic/gestionnaire
  | 'ag'               // Infos de l'AG
  | 'coproprietaire'   // Infos d'un copropriétaire (contexte mail)
  | 'finance'          // Infos financières
  | 'date'             // Dates formatées
  | 'resolution'       // Infos d'une résolution
  | 'autre';

/**
 * Définition d'une variable
 */
export interface VariableDefinition {
  nom: string;                    // Ex: "nom_syndic"
  cle: string;                    // Ex: "{nom_syndic}"
  categorie: CategorieVariable;
  description: string;            // Description pour la doc
  exemple: string;                // Valeur d'exemple
  obligatoire: boolean;           // Si la variable doit être présente
  source: string;                 // D'où vient la donnée
}

/**
 * Modalités de paiement des fonds
 */
export type ModalitePaiement =
  | 'mensuel'
  | 'bimestriel'
  | 'trimestriel'
  | 'semestriel'
  | 'annuel'
  | 'au_choix_syndic'
  | 'personnalise';

/**
 * Libellés des modalités de paiement
 */
export const LIBELLES_MODALITE_PAIEMENT: Record<ModalitePaiement, string> = {
  mensuel: 'Mensuel',
  bimestriel: 'Bimestriel',
  trimestriel: 'Trimestriel',
  semestriel: 'Semestriel',
  annuel: 'Annuel',
  au_choix_syndic: 'Au choix du syndic',
  personnalise: 'Personnalisé',
};

/**
 * Type de syndic
 */
export type TypeSyndic = 'professionnel' | 'benevole' | 'cooperatif';

/**
 * Contexte de données pour résoudre les variables
 */
export interface VariablesContext {
  // Copropriété
  copropriete?: {
    id: string;
    nom: string;
    adresse: string;
    codePostal: string;
    ville: string;
    nombreLots: number;
    totalTantiemes: number;
  };

  // Syndic / Gestionnaire
  syndic?: {
    id: string;
    type: TypeSyndic;
    raisonSociale?: string;        // Pour syndic pro (cabinetNom ou nomSyndic)
    nom: string;                   // Nom du gestionnaire
    prenom: string;                // Prénom du gestionnaire
    adresse: string;
    codePostal: string;
    ville: string;
    telephone: string;
    email: string;
    numeroCarteProf?: string;      // Carte professionnelle
    garantieFinanciere?: string;   // Nom de l'assurance
  };

  // AG
  ag?: {
    id: string;
    type: 'ordinaire' | 'extraordinaire' | 'mixte' | 'urgente';
    dateAG: Date;
    heureAG: string;
    lieu: string;
    dateConvocation: Date;
    dateLimiteCorrespondance?: Date;
    exercice: {
      dateDebut: Date;
      dateFin: Date;
    };
  };

  // Copropriétaire (pour les mails personnalisés)
  coproprietaire?: {
    id: string;
    civilite: 'M.' | 'Mme' | 'M. et Mme';
    nom: string;
    prenom: string;
    adresse: string;
    lots: { numero: string; tantiemes: number; type: string }[];
    totalTantiemes: number;
  };

  // Finance
  finance?: {
    modalitePaiementFonds: ModalitePaiement;
    modalitePaiementTravaux?: ModalitePaiement;
    budgetPrevisionnel?: number;
    fondsTravauxAnnuel?: number;
    datesPaiement?: Date[];
  };

  // Résolution (pour contexte spécifique)
  resolution?: {
    numero: string;
    titre: string;
    article: string;
  };
}

/**
 * Résultat de la résolution d'une variable
 */
export interface ResolvedVariable {
  cle: string;
  valeur: string;
  source: string;
  resolu: boolean;
  erreur?: string;
}

/**
 * Résultat de la génération d'un document
 */
export interface GenerateDocumentResult {
  content: string;
  resolvedVariables: ResolvedVariable[];
  missingVariables: string[];
  warnings: string[];
  isValid: boolean;
}
