import { describe, it, expect } from 'vitest';
import {
  BLOCKING_ISSUE_TYPES,
  hasBlockingIssue,
  splitAuditIssues,
} from '@/lib/onboarding/audit-rules';
import type { OnboardingAuditIssue } from '@/lib/onboarding/api';

function issue(issue_type: string): OnboardingAuditIssue {
  return { entity_type: 'x', issue_type, description: issue_type, difference: 0 };
}

describe('audit-rules', () => {
  it('la liste blanche = les 2 fautes structurelles bloquantes (décision 2026-06-08)', () => {
    expect([...BLOCKING_ISSUE_TYPES].sort()).toEqual(
      ['LEDGER_UNBALANCED', 'LOT_ID_MISSING_45X'],
    );
  });

  it('une copro vide (0 issue) n\'a PAS de faute bloquante', () => {
    // Le blocage viendra de la preuve positive (Task 2), pas de l'audit.
    expect(hasBlockingIssue([])).toBe(false);
  });

  it('LOT_GL_MISMATCH (écart de réconciliation) = NON bloquant (avertissement)', () => {
    expect(hasBlockingIssue([issue('LOT_GL_MISMATCH')])).toBe(false);
  });

  it('CALL_TOTAL_MISMATCH (total d\'appel) = NON bloquant (avertissement)', () => {
    expect(hasBlockingIssue([issue('CALL_TOTAL_MISMATCH')])).toBe(false);
  });

  it('LEDGER_UNBALANCED (déséquilibre comptable) = bloquant', () => {
    expect(hasBlockingIssue([issue('LEDGER_UNBALANCED')])).toBe(true);
  });

  it('split sépare bloquants / avertissements', () => {
    const mixed = [issue('LEDGER_UNBALANCED'), issue('LOT_GL_MISMATCH'), issue('LOT_ID_MISSING_45X')];
    const split = splitAuditIssues(mixed);
    expect(split.blocking.length).toBe(2);
    expect(split.warnings.length).toBe(1);
    expect(split.warnings[0].issue_type).toBe('LOT_GL_MISMATCH');
  });
});
