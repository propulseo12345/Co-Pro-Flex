import assert from 'node:assert/strict';
import {
  BLOCKING_ISSUE_TYPES,
  hasBlockingIssue,
  splitAuditIssues,
} from '@/lib/onboarding/audit-rules';
import type { OnboardingAuditIssue } from '@/lib/onboarding/api';

function issue(issue_type: string): OnboardingAuditIssue {
  return { entity_type: 'x', issue_type, description: issue_type, difference: 0 };
}

// 1) La liste blanche contient exactement les 5 fautes bloquantes du spec §6.
assert.deepEqual(
  [...BLOCKING_ISSUE_TYPES].sort(),
  ['CHAPEAU_450_POSTED', 'OVER_ALLOCATED', 'OVER_PAID', 'SOURCE_ID_MISSING', 'TOTAL_MISMATCH'],
);

// 2) Une copro vide (0 issue) n'a PAS de faute bloquante (le blocage viendra de la preuve positive, Task 2).
assert.equal(hasBlockingIssue([]), false);

// 3) LOT_GL_MISMATCH d'origine reprise = NON bloquant (avertissement).
assert.equal(hasBlockingIssue([issue('LOT_GL_MISMATCH')]), false);

// 4) CALL_VS_BUDGET_MISMATCH = NON bloquant.
assert.equal(hasBlockingIssue([issue('CALL_VS_BUDGET_MISMATCH')]), false);

// 5) TOTAL_MISMATCH = bloquant.
assert.equal(hasBlockingIssue([issue('TOTAL_MISMATCH')]), true);

// 6) Un mélange : split sépare bloquants / avertissements.
const mixed = [issue('TOTAL_MISMATCH'), issue('LOT_GL_MISMATCH'), issue('SOURCE_ID_MISSING')];
const split = splitAuditIssues(mixed);
assert.equal(split.blocking.length, 2);
assert.equal(split.warnings.length, 1);
assert.equal(split.warnings[0].issue_type, 'LOT_GL_MISMATCH');

console.log('audit-rules.test OK');
