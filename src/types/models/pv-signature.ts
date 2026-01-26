/**
 * Types pour la gestion des signatures du procès-verbal d'AG
 */

/**
 * Mode de signature du PV
 */
export type ModeSignature = 'electronique' | 'sur_place';

/**
 * Type de signataire
 */
export type TypeSignataire = 'president' | 'secretaire' | 'scrutateur' | 'syndic';

/**
 * Statut de la signature
 */
export type StatutSignature = 'en_attente' | 'signe' | 'refuse' | 'absent' | 'non_requis';

/**
 * Configuration du mode de signature
 */
export interface ConfigurationSignature {
  mode: ModeSignature;

  // Mode électronique
  serviceSignature?: 'interne' | 'docusign' | 'yousign';

  // Mode sur place
  lieuSignature?: string;
  dateSignaturePhysique?: Date;
  pvScanneUrl?: string;
  pvScanneNom?: string;
  pvScanneTaille?: number;
}

/**
 * Signataire du PV
 */
export interface SignatairePV {
  id: string;
  type: TypeSignataire;
  ordre: number;

  // Identité
  personneId: string;
  typePersonne: 'coproprietaire' | 'gestionnaire' | 'tiers';
  nom: string;
  prenom: string;

  // Contact (optionnel selon le mode)
  email?: string;
  telephone?: string;

  // Si gestionnaire
  societe?: string;
  fonction?: string;

  // Signature
  statut: StatutSignature;
  dateSignature?: Date;

  // Mode électronique
  signatureImage?: string;
  signatureEnvoyeeLe?: Date;
  signatureRelanceLe?: Date;

  // Mode sur place
  signaturePhysique: boolean;
  signaturePhysiqueValideLe?: Date;
  signaturePhysiqueValidePar?: string;

  // Commentaires
  commentaireRefus?: string;

  // Source
  sourceRoleAG: boolean;
}

/**
 * Données de signature du PV
 */
export interface SignaturePVData {
  pvId: string;
  agId: string;

  // Configuration du mode
  configuration: ConfigurationSignature;

  // Signataires
  signataires: SignatairePV[];

  // Statut global
  tousSignes: boolean;
  dateFinalisationPV?: Date;

  // Pré-remplissage
  preRempliDepuisAG: boolean;
  datePreRemplissage?: Date;

  // Métadonnées
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Résultat du pré-remplissage
 */
export interface PreRemplissageResult {
  success: boolean;
  signataires: SignatairePV[];
  rolesManquants: TypeSignataire[];
  warnings: string[];
}

/**
 * Labels et configuration pour chaque mode de signature
 */
export const LABELS_MODE_SIGNATURE: Record<ModeSignature, {
  label: string;
  description: string;
  boutonAction: string;
  emailObligatoire: boolean;
}> = {
  electronique: {
    label: 'Signature électronique',
    description: 'Les signataires recevront un email avec un lien pour signer le PV en ligne.',
    boutonAction: 'Envoyer les demandes de signature',
    emailObligatoire: true,
  },
  sur_place: {
    label: 'Signature sur place',
    description: 'Les signataires signent le PV physiquement. Vous pourrez scanner et archiver le document signé.',
    boutonAction: 'Valider les signatures',
    emailObligatoire: false,
  },
};

/**
 * Labels pour les types de signataires
 */
export const LABELS_TYPE_SIGNATAIRE: Record<TypeSignataire, string> = {
  president: 'Président de séance',
  secretaire: 'Secrétaire de séance',
  scrutateur: 'Scrutateur',
  syndic: 'Syndic',
};

/**
 * Labels pour les statuts de signature
 */
export const LABELS_STATUT_SIGNATURE: Record<StatutSignature, {
  label: string;
  color: string;
}> = {
  en_attente: { label: 'En attente', color: 'warning' },
  signe: { label: 'Signé', color: 'success' },
  refuse: { label: 'Refusé', color: 'error' },
  absent: { label: 'Absent', color: 'neutral' },
  non_requis: { label: 'Non requis', color: 'neutral' },
};
