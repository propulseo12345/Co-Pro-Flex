/**
 * Types pour le workflow de vente avec validation obligatoire
 */

import type { VenteDocumentType } from './vente';

// Étapes du workflow de vente (nouveau)
export type VenteEtapeWorkflowV2 =
  | 'demande'           // Création de la vente
  | 'pre_etat_date'     // Pré-état daté (TOUJOURS obligatoire)
  | 'etat_date'         // État daté complet
  | 'envoi_notaire'     // Transmission au notaire
  | 'signature_acte'    // Signature de l'acte authentique
  | 'cloture_compte';   // Clôture du compte vendeur

// Ordre des étapes pour navigation
export const WORKFLOW_STEP_ORDER: VenteEtapeWorkflowV2[] = [
  'demande',
  'pre_etat_date',
  'etat_date',
  'envoi_notaire',
  'signature_acte',
  'cloture_compte',
];

// Type de règle de validation
export type ValidationRuleType = 'document' | 'champ' | 'solde' | 'action_manuelle';

// Règle de validation pour une étape
export interface VenteValidationRule {
  id: string;
  label: string;
  type: ValidationRuleType;
  documentType?: VenteDocumentType;
  champPath?: string; // ex: 'notaire.email'
  documentStatutRequis?: 'SIGNE' | 'ENVOYE' | 'DISPONIBLE';
  required: boolean;
}

// Configuration d'une étape du workflow
export interface VenteWorkflowStepConfig {
  id: VenteEtapeWorkflowV2;
  label: string;
  labelCourt: string;
  description: string;
  iconName: 'ClipboardCheck' | 'FileText' | 'FileCheck' | 'Send' | 'PenTool' | 'Wallet';
  obligatoire: boolean;
  validations: VenteValidationRule[];
}

// Statut d'une validation
export type ValidationStatus = 'valide' | 'manquant' | 'en_attente';

// Résultat de validation d'une règle
export interface ValidationRuleResult {
  ruleId: string;
  label: string;
  status: ValidationStatus;
  message?: string;
}

// Résultat de validation d'une étape
export interface VenteStepValidationResult {
  stepId: VenteEtapeWorkflowV2;
  stepLabel: string;
  isComplete: boolean;
  validations: ValidationRuleResult[];
}

// État global de validation du workflow
export interface VenteWorkflowValidation {
  etapeActuelle: VenteEtapeWorkflowV2;
  peutTerminer: boolean;
  toutesEtapesCompletes: boolean;
  etapesManquantes: VenteStepValidationResult[];
  etapesCompletes: VenteStepValidationResult[];
  alertesBloquantes: string[];
  alertesAvertissement: string[];
  nombreEtapesCompletes: number;
  nombreEtapesTotal: number;
}

// Pour la clôture du compte vendeur
export interface ClotureCompteVendeur {
  soldeActuel: number;
  estCloturable: boolean; // solde = 0
  clotureManuelleFaite: boolean; // checkbox cochée
  dateCloture?: string;
  clotureParUtilisateur?: string;
}

// Confirmation de finalisation forcée
export interface ConfirmationFinalisation {
  confirmationFaite: boolean;
  dateConfirmation?: string;
  confirmeParUtilisateur?: string;
  etapesManquantesAuMomentConfirmation?: string[];
  motifConfirmationForcee?: string;
}

// Dates de complétion de chaque étape
export type DatesEtapesWorkflow = Partial<Record<VenteEtapeWorkflowV2, string>>;
