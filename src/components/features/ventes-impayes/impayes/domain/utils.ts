import { WORKFLOW_STEPS } from './constants';
import type { Impaye } from './types';

export function getNextStep(currentStatut: string): string | null {
  const currentIndex = WORKFLOW_STEPS.findIndex((s) => s.id === currentStatut);
  if (currentIndex === -1 || currentIndex >= WORKFLOW_STEPS.length - 1) return null;
  return WORKFLOW_STEPS[currentIndex + 1].id;
}

export function getWorkflowIndex(statut: string): number {
  return WORKFLOW_STEPS.findIndex((s) => s.id === statut);
}

export function getRelanceDescription(type: string): string {
  switch (type) {
    case 'relance_amiable_1':
      return 'Envoi de la 1ère relance amiable par email';
    case 'relance_amiable_2':
      return 'Envoi de la 2ème relance amiable par courrier recommandé';
    case 'mise_en_demeure':
      return 'Envoi de la mise en demeure par huissier';
    case 'contentieux':
      return "Passage en procédure contentieuse - Dossier transmis à l'avocat";
    default:
      return 'Action effectuée';
  }
}

export function calculateStats(impayes: Impaye[], filteredImpayes: Impaye[]) {
  return {
    activeCount: impayes.filter((i) => i.statut !== 'regle').length,
    montantTotal: filteredImpayes.reduce((sum, imp) => sum + imp.montant, 0),
    nbMiseEnDemeure: impayes.filter((i) => i.statut === 'mise_en_demeure').length,
    nbContentieux: impayes.filter((i) => i.statut === 'contentieux').length,
    nbClotures: impayes.filter((i) => i.statut === 'regle').length,
  };
}

export function filterImpayes(impayes: Impaye[], selectedStatut: string): Impaye[] {
  if (selectedStatut === 'tous') return impayes.filter((i) => i.statut !== 'regle');
  if (selectedStatut === 'clotures') return impayes.filter((i) => i.statut === 'regle');
  return impayes.filter((i) => i.statut === selectedStatut);
}

export function getEligibleImpayesForType(selectedImpayes: Impaye[], type: string): Impaye[] {
  return selectedImpayes.filter((imp) => {
    const nextStep = getNextStep(imp.statut);
    return nextStep === type;
  });
}

export function calculateJoursRetard(dateEcheance: string): number {
  return Math.floor((new Date().getTime() - new Date(dateEcheance).getTime()) / (1000 * 60 * 60 * 24));
}
