/**
 * Service de validation du workflow de vente V2
 * Vérifie que toutes les étapes obligatoires sont complétées avant finalisation
 */

import type {
  VenteEtapeWorkflowV2,
  VenteValidationRule,
  VenteStepValidationResult,
  VenteWorkflowValidation,
  ValidationRuleResult,
  ValidationStatus,
  ClotureCompteVendeur,
} from '@/types/models/vente-workflow';
import type { VenteDocument } from '@/components/features/ventes/VenteDetail/types';
import type { Vente } from '@/components/features/ventes/VenteDetail/types';
import { WORKFLOW_STEPS_V2, WORKFLOW_STEP_ORDER_V2 } from '@/components/features/ventes/VenteDetail/constants';

// Mapping des types de documents entre les deux formats
const DOCUMENT_TYPE_MAPPING: Record<string, string> = {
  'PRE_ETAT_DATE': 'pre_etat_date',
  'ETAT_DATE': 'etat_date',
  'CERTIFICAT_ARTICLE_20': 'certificat_art20',
  'DIAGNOSTIC': 'diagnostic',
  'PV_AG': 'pv_ag',
  'REGLEMENT': 'reglement',
  'CARNET_ENTRETIEN': 'carnet_entretien',
  'COMPROMIS': 'compromis',
  'AUTRE': 'autre',
};

// Mapping inverse
const DOCUMENT_TYPE_MAPPING_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(DOCUMENT_TYPE_MAPPING).map(([k, v]) => [v, k])
);

/**
 * Accède à une valeur imbriquée dans un objet via un chemin (ex: 'notaire.email')
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Évalue une règle de validation individuelle
 */
function evaluateValidationRule(
  rule: VenteValidationRule,
  vente: Vente,
  documents: VenteDocument[]
): ValidationRuleResult {
  switch (rule.type) {
    case 'document': {
      // Chercher le document du type demandé
      const docType = rule.documentType ? DOCUMENT_TYPE_MAPPING[rule.documentType] : null;
      const doc = documents.find(d => d.type === docType);

      if (!doc) {
        return {
          ruleId: rule.id,
          label: rule.label,
          status: 'manquant',
          message: 'Document non trouvé',
        };
      }

      // Vérifier le statut si requis
      if (rule.documentStatutRequis) {
        const statutRequis = rule.documentStatutRequis.toLowerCase();
        if (doc.statut !== statutRequis) {
          return {
            ruleId: rule.id,
            label: rule.label,
            status: 'en_attente',
            message: `Document en attente de ${statutRequis === 'signe' ? 'signature' : 'envoi'}`,
          };
        }
      }

      return {
        ruleId: rule.id,
        label: rule.label,
        status: 'valide',
      };
    }

    case 'champ': {
      const value = getNestedValue(vente as unknown as Record<string, unknown>, rule.champPath || '');
      const isValid = value !== null && value !== undefined && value !== '';

      return {
        ruleId: rule.id,
        label: rule.label,
        status: isValid ? 'valide' : 'manquant',
        message: isValid ? undefined : 'Champ non renseigné',
      };
    }

    case 'solde': {
      const solde = vente.clotureCompte?.soldeActuel ?? vente.vendeur?.impayes ?? 0;
      const isZero = solde === 0;

      return {
        ruleId: rule.id,
        label: rule.label,
        status: isZero ? 'valide' : 'manquant',
        message: isZero ? undefined : `Solde actuel : ${solde.toFixed(2)} €`,
      };
    }

    case 'action_manuelle': {
      // Pour les actions manuelles, on vérifie selon le contexte
      if (rule.id === 'cloture_confirmee') {
        const confirme = vente.clotureCompte?.clotureManuelleFaite ?? false;
        return {
          ruleId: rule.id,
          label: rule.label,
          status: confirme ? 'valide' : 'en_attente',
          message: confirme ? undefined : 'En attente de confirmation manuelle',
        };
      }

      if (rule.id === 'docs_envoyes') {
        const envoyes = vente.documentsTransmisNotaire ?? false;
        return {
          ruleId: rule.id,
          label: rule.label,
          status: envoyes ? 'valide' : 'en_attente',
          message: envoyes ? undefined : 'Documents non encore transmis',
        };
      }

      // Par défaut, considérer comme non fait
      return {
        ruleId: rule.id,
        label: rule.label,
        status: 'en_attente',
        message: 'Action en attente',
      };
    }

    default:
      return {
        ruleId: rule.id,
        label: rule.label,
        status: 'manquant',
        message: 'Type de validation inconnu',
      };
  }
}

/**
 * Valide une étape spécifique du workflow
 */
export function validateWorkflowStep(
  stepId: VenteEtapeWorkflowV2,
  vente: Vente,
  documents: VenteDocument[]
): VenteStepValidationResult {
  const stepConfig = WORKFLOW_STEPS_V2.find(s => s.id === stepId);

  if (!stepConfig) {
    return {
      stepId,
      stepLabel: stepId,
      isComplete: false,
      validations: [],
    };
  }

  const validationResults: ValidationRuleResult[] = (stepConfig.validations || []).map(rule =>
    evaluateValidationRule(rule, vente, documents)
  );

  const isComplete = validationResults.every(v => v.status === 'valide');

  return {
    stepId,
    stepLabel: stepConfig.label,
    isComplete,
    validations: validationResults,
  };
}

/**
 * Détermine l'index de l'étape actuelle dans le workflow
 */
export function getStepIndex(stepId: string): number {
  return WORKFLOW_STEP_ORDER_V2.indexOf(stepId as VenteEtapeWorkflowV2);
}

/**
 * Vérifie si une étape est complétée (basé sur les dates d'étapes ou l'étape actuelle)
 */
function isStepCompleted(
  stepId: VenteEtapeWorkflowV2,
  vente: Vente,
  currentStepIndex: number
): boolean {
  // Si on a une date pour cette étape, elle est complétée
  if (vente.datesEtapes?.[stepId]) {
    return true;
  }

  // Sinon, si l'étape actuelle est après cette étape, considérer comme complétée
  const stepIndex = getStepIndex(stepId);
  return stepIndex < currentStepIndex;
}

/**
 * Valide l'ensemble du workflow et détermine si la vente peut être terminée
 */
export function validateFullWorkflow(
  vente: Vente,
  documents: VenteDocument[]
): VenteWorkflowValidation {
  const etapesManquantes: VenteStepValidationResult[] = [];
  const etapesCompletes: VenteStepValidationResult[] = [];
  const alertesBloquantes: string[] = [];
  const alertesAvertissement: string[] = [];

  const currentStepId = vente.etapeWorkflow as VenteEtapeWorkflowV2;
  const currentStepIndex = getStepIndex(currentStepId);

  // Valider chaque étape obligatoire
  for (const step of WORKFLOW_STEPS_V2) {
    if (step.obligatoire) {
      const validation = validateWorkflowStep(step.id as VenteEtapeWorkflowV2, vente, documents);

      if (validation.isComplete || isStepCompleted(step.id as VenteEtapeWorkflowV2, vente, currentStepIndex)) {
        etapesCompletes.push(validation);
      } else {
        etapesManquantes.push(validation);

        // Générer les alertes
        validation.validations
          .filter(v => v.status !== 'valide')
          .forEach(v => {
            const alertMessage = `${step.labelCourt || step.label}: ${v.label}`;
            if (v.status === 'manquant') {
              alertesBloquantes.push(alertMessage);
            } else {
              alertesAvertissement.push(alertMessage);
            }
          });
      }
    }
  }

  // Vérification spéciale pour le solde vendeur
  const soldeVendeur = vente.clotureCompte?.soldeActuel ?? vente.vendeur?.impayes ?? 0;
  if (soldeVendeur !== 0 && !alertesBloquantes.some(a => a.includes('Solde'))) {
    alertesBloquantes.push(`Le solde du compte vendeur est de ${soldeVendeur.toFixed(2)} € (doit être 0 €)`);
  }

  const toutesEtapesCompletes = etapesManquantes.length === 0;
  const peutTerminer = toutesEtapesCompletes && alertesBloquantes.length === 0;

  return {
    etapeActuelle: currentStepId,
    peutTerminer,
    toutesEtapesCompletes,
    etapesManquantes,
    etapesCompletes,
    alertesBloquantes,
    alertesAvertissement,
    nombreEtapesCompletes: etapesCompletes.length,
    nombreEtapesTotal: WORKFLOW_STEPS_V2.filter(s => s.obligatoire).length,
  };
}

/**
 * Vérifie si on peut avancer à l'étape suivante
 */
export function canAdvanceToStep(
  currentStep: VenteEtapeWorkflowV2,
  targetStep: VenteEtapeWorkflowV2,
  vente: Vente,
  documents: VenteDocument[]
): { canAdvance: boolean; canForce: boolean; blockers: string[] } {
  const currentIndex = getStepIndex(currentStep);
  const targetIndex = getStepIndex(targetStep);

  // On ne peut pas reculer
  if (targetIndex <= currentIndex) {
    return {
      canAdvance: false,
      canForce: false,
      blockers: ['Impossible de revenir à une étape précédente'],
    };
  }

  // Valider l'étape actuelle
  const currentValidation = validateWorkflowStep(currentStep, vente, documents);
  const blockers: string[] = [];

  currentValidation.validations
    .filter(v => v.status !== 'valide')
    .forEach(v => {
      blockers.push(`${v.label}: ${v.message || 'Non valide'}`);
    });

  return {
    canAdvance: currentValidation.isComplete,
    canForce: blockers.length > 0, // Peut forcer s'il y a des blockers mais avec avertissement
    blockers,
  };
}

/**
 * Vérifie si le compte peut être clôturé
 */
export function verifierClotureCompte(
  vente: Vente
): ClotureCompteVendeur {
  const soldeActuel = vente.clotureCompte?.soldeActuel ?? vente.vendeur?.impayes ?? 0;

  return {
    soldeActuel,
    estCloturable: soldeActuel === 0,
    clotureManuelleFaite: vente.clotureCompte?.clotureManuelleFaite ?? false,
    dateCloture: vente.clotureCompte?.dateCloture,
    clotureParUtilisateur: vente.clotureCompte?.clotureParUtilisateur,
  };
}

/**
 * Calcule le solde du vendeur (mock - à intégrer avec le module Finance)
 */
export function calculerSoldeVendeur(_vendeurId: string): number {
  // TODO: Implémenter la logique réelle avec le service Finance
  // Pour l'instant, retourne une valeur mock
  return 0;
}

/**
 * Retourne le libellé d'une étape
 */
export function getStepLabel(stepId: string): string {
  const step = WORKFLOW_STEPS_V2.find(s => s.id === stepId);
  return step?.label || stepId;
}

/**
 * Retourne l'étape suivante dans le workflow
 */
export function getNextStep(currentStep: VenteEtapeWorkflowV2): VenteEtapeWorkflowV2 | null {
  const currentIndex = getStepIndex(currentStep);
  if (currentIndex < 0 || currentIndex >= WORKFLOW_STEP_ORDER_V2.length - 1) {
    return null;
  }
  return WORKFLOW_STEP_ORDER_V2[currentIndex + 1];
}

/**
 * Vérifie si c'est la dernière étape du workflow
 */
export function isLastStep(stepId: VenteEtapeWorkflowV2): boolean {
  return stepId === 'cloture_compte';
}
