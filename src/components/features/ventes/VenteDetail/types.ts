import type {
  VenteEtapeWorkflowV2,
  VenteValidationRule,
  ValidationStatus,
  ClotureCompteVendeur,
  ConfirmationFinalisation,
  DatesEtapesWorkflow
} from '@/types/models/vente-workflow';

export type { VenteEtapeWorkflowV2 } from '@/types/models/vente-workflow';

/** Mode de signature utilisé */
export type ModeSignature = 'electronique' | 'manuscrite' | 'pad';

/** Informations complètes du signataire pour le PDF */
export interface SignataireComplet {
  id?: string;
  nom: string;
  prenom: string;
  role: string; // "Syndic", "Président du conseil syndical", etc.
  email?: string;
}

/** Bloc signature pour injection PDF */
export interface BlocSignaturePDF {
  signataire: SignataireComplet;
  signatureImage: string; // Base64 PNG
  lieuSignature: string;
  dateSignature: Date;
  modeSignature: ModeSignature;
  /** Mention générée : "Fait à Paris, le 3 janvier 2026" */
  mention: string;
}

export interface VenteDocument {
  id: number;
  type: 'pre_etat_date' | 'etat_date' | 'certificat_art20' | 'compromis' | 'diagnostic' | 'pv_ag' | 'autre';
  nom: string;
  statut: 'disponible' | 'en_attente' | 'signe' | 'expire' | 'envoye';
  dateGeneration?: string;
  dateSignature?: string;
  dateEnvoi?: string;
  signePar?: string;
  signatureData?: string; // Base64 PNG de la signature manuscrite
  signataireRole?: string; // Rôle du signataire (ex: "Syndic", "Président")
  lieuSignature?: string; // Lieu de signature pour la mention légale
  ipAddress?: string; // Adresse IP pour traçabilité
  obligatoire: boolean;
  /** Bloc signature complet pour le PDF (si disponible) */
  blocSignature?: BlocSignaturePDF;
}

export interface HistoriqueItem {
  id: number;
  type: 'creation' | 'generation_doc' | 'signature' | 'envoi' | 'reception' | 'modification' | 'workflow';
  description: string;
  date: string;
  auteur: string;
}

export interface OrdreService {
  id: string;
  titre: string;
  date: string;
  statut: 'BROUILLON' | 'ENVOYE' | 'EN_ATTENTE_PRESTATAIRE' | 'INTERVENTION_PROGRAMMEE' | 'INTERVENTION_REALISEE' | 'CLOTURE';
  fournisseur: string;
}

export interface Partie {
  nom: string;
  prenom?: string;
  email: string;
  telephone: string;
}

export interface Vendeur extends Partie {
  impayes: number;
}

// Étapes workflow (legacy + V2)
export type VenteEtapeWorkflowLocal =
  | 'creation' | 'generation' | 'signature' | 'transmission' | 'notification' // Legacy
  | 'demande' | 'pre_etat_date' | 'etat_date' | 'envoi_notaire' | 'signature_acte' | 'cloture_compte'; // V2

export interface Vente {
  id: number;
  lotId: string;
  lotType: string;
  statut: 'en_cours' | 'finalise' | 'annule';
  vendeur: Vendeur;
  acquereur: Partie;
  notaire: Partie;
  dateCompromis: string;
  dateActeAuthentique: string | null;
  dateCreation: string;
  dateNotificationArt6: string | null;
  etapeWorkflow: VenteEtapeWorkflowLocal;
  observations: string;
  ordresServiceIds: string[];
  notesInternes: string;

  // Nouveaux champs pour le workflow V2
  clotureCompte?: ClotureCompteVendeur;
  datesEtapes?: DatesEtapesWorkflow;
  confirmationFinalisation?: ConfirmationFinalisation;
  workflowV2?: boolean;
  documentsTransmisNotaire?: boolean;
  dateTransmissionNotaire?: string;
}

export interface WorkflowStep {
  id: string;
  label: string;
  labelCourt?: string;
  description: string;
  icon: React.ComponentType<{ size?: number }>;
  obligatoire?: boolean;
  validations?: VenteValidationRule[];
}

export interface WorkflowValidation {
  canAdvance: boolean;
  message?: string;
  etapesManquantes?: string[];
}

// Résultat de validation étendu pour le workflow V2
export interface WorkflowValidationV2 {
  canAdvance: boolean;
  canForceAdvance: boolean; // Peut forcer avec avertissement
  message?: string;
  validations: {
    ruleId: string;
    label: string;
    status: ValidationStatus;
    message?: string;
  }[];
  etapesManquantes: string[];
  requiresConfirmation: boolean;
}

export type ToastType = 'success' | 'error' | 'info';

export interface ToastState {
  message: string;
  type: ToastType;
}

export type ActiveTab = 'documents' | 'workflow' | 'historique';
