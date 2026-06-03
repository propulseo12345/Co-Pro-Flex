export type FinalizationBlockReason = 'BLOCKING_ISSUE' | 'NO_ISSUED_CALL' | null;

export interface FinalizationInputs {
  /** Résultat de la liste blanche (Task 1) : true = aucune faute comptable. */
  cleanByWhitelist: boolean;
  /** Nombre d'échéances voulues par le syndic (callPlan.installments.length). 0 = aucun échéancier. */
  plannedInstallments: number;
  /** Un budget 'validated' existe-t-il en base ? */
  hasValidatedBudget: boolean;
  /** Nombre d'appels réellement émis pour ce budget (lecture base). */
  issuedCallCount: number;
}

/**
 * Décision de finalisation (spec §6 / I7), pure & testable.
 * - Bloque si une faute de la liste blanche est présente.
 * - Bloque si un échéancier était voulu (plannedInstallments>0) ET un budget validé existe
 *   ET aucun appel n'a été émis (faux positif évité : on ne bloque pas un plan vide).
 */
export function computeFinalizationDecision(
  i: FinalizationInputs
): { canFinalize: boolean; reason: FinalizationBlockReason } {
  if (!i.cleanByWhitelist) return { canFinalize: false, reason: 'BLOCKING_ISSUE' };

  const wantedSchedule = i.plannedInstallments > 0;
  if (wantedSchedule && i.hasValidatedBudget && i.issuedCallCount === 0) {
    return { canFinalize: false, reason: 'NO_ISSUED_CALL' };
  }
  return { canFinalize: true, reason: null };
}
