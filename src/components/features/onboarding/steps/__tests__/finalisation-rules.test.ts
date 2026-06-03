import { describe, it, expect } from 'vitest';
import { computeFinalizationDecision } from '@/components/features/onboarding/steps/finalisation-rules';

describe('computeFinalizationDecision', () => {
  it('copro vide : plan d\'appels demandé et 0 appel émis -> bloque (NO_ISSUED_CALL)', () => {
    expect(
      computeFinalizationDecision({
        cleanByWhitelist: true,
        plannedInstallments: 4,
        hasValidatedBudget: true,
        issuedCallCount: 0,
      }),
    ).toEqual({ canFinalize: false, reason: 'NO_ISSUED_CALL' });
  });

  it('faute de la liste blanche -> bloque même si appels OK (BLOCKING_ISSUE)', () => {
    expect(
      computeFinalizationDecision({
        cleanByWhitelist: false,
        plannedInstallments: 4,
        hasValidatedBudget: true,
        issuedCallCount: 4,
      }),
    ).toEqual({ canFinalize: false, reason: 'BLOCKING_ISSUE' });
  });

  it('plan vide (aucun échéancier voulu) + pas de faute -> NE PAS bloquer sur les appels', () => {
    expect(
      computeFinalizationDecision({
        cleanByWhitelist: true,
        plannedInstallments: 0,
        hasValidatedBudget: true,
        issuedCallCount: 0,
      }),
    ).toEqual({ canFinalize: true, reason: null });
  });

  it('cas nominal : pas de faute + plan demandé + appels émis -> OK', () => {
    expect(
      computeFinalizationDecision({
        cleanByWhitelist: true,
        plannedInstallments: 2,
        hasValidatedBudget: true,
        issuedCallCount: 2,
      }),
    ).toEqual({ canFinalize: true, reason: null });
  });

  it('pas de budget validé du tout + plan vide -> OK (rien à prouver)', () => {
    expect(
      computeFinalizationDecision({
        cleanByWhitelist: true,
        plannedInstallments: 0,
        hasValidatedBudget: false,
        issuedCallCount: 0,
      }),
    ).toEqual({ canFinalize: true, reason: null });
  });
});
