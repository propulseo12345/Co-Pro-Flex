'use client';

/**
 * Service de calcul du budget maintenance
 * Lie les interventions du carnet d'entretien aux postes budgétaires
 *
 * Note: En production, ce sera remplacé par des appels Supabase
 */

import { InterventionCarnet } from '@/types';
import { PosteBudgetData, PosteBudget, POSTE_LABELS, POSTE_COLORS } from '@/components/features/finance/Budget/types';
import { getAllInterventions } from './interventions.service';
import { MOCK_POSTES_BUDGET } from '@/components/features/finance/Budget/mock-data';

/**
 * Résumé de consommation d'un poste budgétaire
 */
export interface ConsommationPoste {
  poste: PosteBudget;
  label: string;
  couleur: string;
  budgetVote: number;
  consommeInterventions: number;  // Montant consommé via les interventions
  consommeFactures: number;       // Montant consommé via les factures (hors interventions)
  consommeTotal: number;          // Total consommé
  restant: number;                // Budget restant
  pourcentageConsomme: number;    // % consommé
  nombreInterventions: number;    // Nombre d'interventions sur ce poste
  alerteDepassement: boolean;     // Si budget dépassé
  alerteProche: boolean;          // Si > 80% consommé
}

/**
 * Statistiques globales du budget maintenance
 */
export interface StatsBudgetMaintenance {
  budgetTotalVote: number;
  totalConsomme: number;
  totalRestant: number;
  pourcentageGlobal: number;
  nombrePostesDepasses: number;
  nombrePostesProchesLimite: number;
  consommationParPoste: ConsommationPoste[];
}

/**
 * Lien entre une intervention et son impact budgétaire
 */
export interface LienInterventionBudget {
  intervention: InterventionCarnet;
  posteLabel: string;
  posteCouleur: string;
  budgetPoste: number;
  consommeAvant: number;        // Consommé avant cette intervention
  montantIntervention: number;
  consommeApres: number;        // Consommé après cette intervention
  restantApres: number;
  impactPourcentage: number;    // Impact de cette intervention sur le budget du poste
}

// Seuils d'alerte
const SEUIL_ALERTE_DEPASSEMENT = 100;  // 100% = dépassement
const SEUIL_ALERTE_PROCHE = 80;        // 80% = proche de la limite

/**
 * Calculer la consommation d'un poste à partir des interventions
 */
function calculerConsommationInterventions(
  poste: PosteBudget,
  interventions: InterventionCarnet[]
): { montant: number; nombre: number } {
  const interventionsPoste = interventions.filter(
    i => i.posteBudgetaire === poste && i.cout !== undefined && i.cout > 0
  );

  const montant = interventionsPoste.reduce((sum, i) => sum + (i.cout || 0), 0);
  return { montant, nombre: interventionsPoste.length };
}

/**
 * Récupérer les données de budget pour un poste
 * Priorité : données mock du Budget module, sinon données par défaut
 */
function getBudgetPoste(poste: PosteBudget): PosteBudgetData | null {
  const mockData = MOCK_POSTES_BUDGET.find(p => p.poste === poste);
  if (mockData) return mockData;

  // Si le poste n'existe pas dans le mock (nouveaux postes maintenance),
  // retourner des valeurs par défaut
  if (POSTE_LABELS[poste]) {
    return {
      poste,
      label: POSTE_LABELS[poste],
      budgetVote: 0,  // Pas de budget voté par défaut
      consomme: 0
    };
  }

  return null;
}

/**
 * Calculer la consommation pour tous les postes budgétaires
 */
export function calculerConsommationParPoste(): ConsommationPoste[] {
  const interventions = getAllInterventions();
  const result: ConsommationPoste[] = [];

  // Parcourir tous les postes possibles
  const allPostes = Object.keys(POSTE_LABELS) as PosteBudget[];

  allPostes.forEach(poste => {
    const budgetData = getBudgetPoste(poste);
    if (!budgetData) return;

    // Calculer la consommation depuis les interventions
    const { montant: consommeInterventions, nombre: nombreInterventions } =
      calculerConsommationInterventions(poste, interventions);

    // La consommation factures = consommé mock - consommé interventions (si positif)
    // Cela simule les dépenses qui ne sont pas des interventions (abonnements, etc.)
    const consommeFactures = Math.max(0, budgetData.consomme - consommeInterventions);

    // Total consommé
    const consommeTotal = consommeInterventions + consommeFactures;

    // Restant
    const restant = budgetData.budgetVote - consommeTotal;

    // Pourcentage
    const pourcentageConsomme = budgetData.budgetVote > 0
      ? (consommeTotal / budgetData.budgetVote) * 100
      : 0;

    result.push({
      poste,
      label: POSTE_LABELS[poste],
      couleur: POSTE_COLORS[poste],
      budgetVote: budgetData.budgetVote,
      consommeInterventions,
      consommeFactures,
      consommeTotal,
      restant,
      pourcentageConsomme,
      nombreInterventions,
      alerteDepassement: pourcentageConsomme >= SEUIL_ALERTE_DEPASSEMENT,
      alerteProche: pourcentageConsomme >= SEUIL_ALERTE_PROCHE && pourcentageConsomme < SEUIL_ALERTE_DEPASSEMENT
    });
  });

  // Trier par consommation décroissante
  return result.sort((a, b) => b.consommeTotal - a.consommeTotal);
}

/**
 * Obtenir les statistiques globales du budget maintenance
 */
export function getStatsBudgetMaintenance(): StatsBudgetMaintenance {
  const consommationParPoste = calculerConsommationParPoste();

  const budgetTotalVote = consommationParPoste.reduce((sum, p) => sum + p.budgetVote, 0);
  const totalConsomme = consommationParPoste.reduce((sum, p) => sum + p.consommeTotal, 0);
  const totalRestant = budgetTotalVote - totalConsomme;
  const pourcentageGlobal = budgetTotalVote > 0 ? (totalConsomme / budgetTotalVote) * 100 : 0;

  const nombrePostesDepasses = consommationParPoste.filter(p => p.alerteDepassement).length;
  const nombrePostesProchesLimite = consommationParPoste.filter(p => p.alerteProche).length;

  return {
    budgetTotalVote,
    totalConsomme,
    totalRestant,
    pourcentageGlobal,
    nombrePostesDepasses,
    nombrePostesProchesLimite,
    consommationParPoste
  };
}

/**
 * Obtenir le détail du lien budget pour une intervention spécifique
 */
export function getLienBudgetIntervention(intervention: InterventionCarnet): LienInterventionBudget | null {
  if (!intervention.posteBudgetaire || !intervention.cout) {
    return null;
  }

  const poste = intervention.posteBudgetaire as PosteBudget;
  const consommation = calculerConsommationParPoste().find(c => c.poste === poste);

  if (!consommation) return null;

  // Calculer le consommé AVANT cette intervention
  const consommeAvant = consommation.consommeTotal - intervention.cout;
  const restantApres = consommation.restant;
  const impactPourcentage = consommation.budgetVote > 0
    ? (intervention.cout / consommation.budgetVote) * 100
    : 0;

  return {
    intervention,
    posteLabel: POSTE_LABELS[poste],
    posteCouleur: POSTE_COLORS[poste],
    budgetPoste: consommation.budgetVote,
    consommeAvant,
    montantIntervention: intervention.cout,
    consommeApres: consommation.consommeTotal,
    restantApres,
    impactPourcentage
  };
}

/**
 * Obtenir la consommation pour un poste spécifique
 */
export function getConsommationPoste(poste: PosteBudget): ConsommationPoste | null {
  return calculerConsommationParPoste().find(c => c.poste === poste) || null;
}

/**
 * Obtenir les interventions liées à un poste budgétaire
 */
export function getInterventionsParPoste(poste: PosteBudget): InterventionCarnet[] {
  const interventions = getAllInterventions();
  return interventions.filter(i => i.posteBudgetaire === poste);
}

/**
 * Formater un montant en euros
 */
export function formatMontant(montant: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(montant);
}

/**
 * Obtenir la couleur de progression basée sur le pourcentage
 */
export function getCouleurProgression(pourcentage: number): string {
  if (pourcentage >= 100) return 'var(--danger)';
  if (pourcentage >= 80) return 'var(--warning)';
  if (pourcentage >= 60) return 'var(--info)';
  return 'var(--success)';
}

/**
 * Obtenir les alertes de budget maintenance
 */
export function getAlertsBudgetMaintenance(): Array<{
  type: 'depassement' | 'proche';
  severity: 'error' | 'warning';
  poste: string;
  message: string;
}> {
  const alerts: Array<{
    type: 'depassement' | 'proche';
    severity: 'error' | 'warning';
    poste: string;
    message: string;
  }> = [];

  const consommations = calculerConsommationParPoste();

  consommations.forEach(c => {
    if (c.alerteDepassement) {
      alerts.push({
        type: 'depassement',
        severity: 'error',
        poste: c.label,
        message: `Budget ${c.label} dépassé : ${formatMontant(c.consommeTotal)} / ${formatMontant(c.budgetVote)} (${c.pourcentageConsomme.toFixed(0)}%)`
      });
    } else if (c.alerteProche) {
      alerts.push({
        type: 'proche',
        severity: 'warning',
        poste: c.label,
        message: `Budget ${c.label} proche de la limite : ${formatMontant(c.consommeTotal)} / ${formatMontant(c.budgetVote)} (${c.pourcentageConsomme.toFixed(0)}%)`
      });
    }
  });

  return alerts;
}
