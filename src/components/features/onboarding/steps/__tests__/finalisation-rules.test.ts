import assert from 'node:assert/strict';
import { computeFinalizationDecision } from '@/components/features/onboarding/steps/finalisation-rules';

// 1) Copro vide : pas de faute MAIS plan d'appels demandé (installments>0) et 0 appel émis -> bloque.
assert.deepEqual(
  computeFinalizationDecision({
    cleanByWhitelist: true,
    plannedInstallments: 4,
    hasValidatedBudget: true,
    issuedCallCount: 0,
  }),
  { canFinalize: false, reason: 'NO_ISSUED_CALL' },
);

// 2) Faute de la liste blanche -> bloque même si appels OK.
assert.deepEqual(
  computeFinalizationDecision({
    cleanByWhitelist: false,
    plannedInstallments: 4,
    hasValidatedBudget: true,
    issuedCallCount: 4,
  }),
  { canFinalize: false, reason: 'BLOCKING_ISSUE' },
);

// 3) Plan vide (aucun échéancier voulu) + pas de faute -> NE PAS bloquer sur les appels.
assert.deepEqual(
  computeFinalizationDecision({
    cleanByWhitelist: true,
    plannedInstallments: 0,
    hasValidatedBudget: true,
    issuedCallCount: 0,
  }),
  { canFinalize: true, reason: null },
);

// 4) Cas nominal : pas de faute + plan demandé + appels émis -> OK.
assert.deepEqual(
  computeFinalizationDecision({
    cleanByWhitelist: true,
    plannedInstallments: 2,
    hasValidatedBudget: true,
    issuedCallCount: 2,
  }),
  { canFinalize: true, reason: null },
);

// 5) Pas de budget validé du tout (ex. copro démarrée à zéro) + plan vide -> OK (rien à prouver).
assert.deepEqual(
  computeFinalizationDecision({
    cleanByWhitelist: true,
    plannedInstallments: 0,
    hasValidatedBudget: false,
    issuedCallCount: 0,
  }),
  { canFinalize: true, reason: null },
);

console.log('finalisation-rules.test OK');
