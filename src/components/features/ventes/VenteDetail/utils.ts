import {
  DOCUMENT_TYPE_LABELS,
  STATUT_STYLES,
  OS_STATUT_COLORS,
  OS_STATUT_LABELS,
  WORKFLOW_STEPS
} from './constants';
import type { Vente, VenteDocument, WorkflowValidation } from './types';

export function getDocumentTypeLabel(type: string): string {
  return DOCUMENT_TYPE_LABELS[type] || type;
}

export function getStatutStyle(statut: string): { bg: string; color: string; label: string } {
  return STATUT_STYLES[statut] || STATUT_STYLES.disponible;
}

export function getOsStatutColor(statut: string): { bg: string; color: string } {
  return OS_STATUT_COLORS[statut] || OS_STATUT_COLORS.BROUILLON;
}

export function getOsStatutLabel(statut: string): string {
  return OS_STATUT_LABELS[statut] || statut;
}

export function getWorkflowStepIndex(step: string): number {
  const steps = ['generation', 'signature', 'transmission', 'notification'];
  return steps.indexOf(step);
}

export function canAdvanceWorkflow(
  step: string,
  vente: Vente,
  documents: VenteDocument[]
): WorkflowValidation {
  switch (step) {
    case 'generation':
      if (!vente.acquereur.nom) {
        return { canAdvance: false, message: "L'acquéreur doit être renseigné" };
      }
      return { canAdvance: true };

    case 'signature': {
      const unsignedDocs = documents.filter(d => d.obligatoire && d.statut === 'en_attente');
      if (unsignedDocs.length > 0) {
        return {
          canAdvance: false,
          message: `${unsignedDocs.length} document(s) en attente de signature`
        };
      }
      return { canAdvance: true };
    }

    case 'transmission':
      if (!vente.notaire.email) {
        return { canAdvance: false, message: "L'email du notaire doit être renseigné" };
      }
      return { canAdvance: true };

    case 'notification':
      if (!vente.dateActeAuthentique) {
        return { canAdvance: false, message: "La date d'acte authentique doit être renseignée" };
      }
      return { canAdvance: true };

    default:
      return { canAdvance: true };
  }
}

export function getWorkflowStepLabel(stepId: string): string {
  const step = WORKFLOW_STEPS.find(s => s.id === stepId);
  return step?.label || stepId;
}

export function formatDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  return new Date(dateString).toLocaleDateString('fr-FR', options);
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
