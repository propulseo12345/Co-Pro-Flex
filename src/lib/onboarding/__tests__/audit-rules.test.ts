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
  it('la liste blanche contient exactement les 5 fautes bloquantes du spec §6', () => {
    expect([...BLOCKING_ISSUE_TYPES].sort()).toEqual(
      ['CHAPEAU_450_POSTED', 'OVER_ALLOCATED', 'OVER_PAID', 'SOURCE_ID_MISSING', 'TOTAL_MISMATCH'],
    );
  });

  it('une copro vide (0 issue) n\'a PAS de faute bloquante', () => {
    // Le blocage viendra de la preuve positive (Task 2), pas de l'audit.
    expect(hasBlockingIssue([])).toBe(false);
  });

  it('LOT_GL_MISMATCH d\'origine reprise = NON bloquant (avertissement)', () => {
    expect(hasBlockingIssue([issue('LOT_GL_MISMATCH')])).toBe(false);
  });

  it('CALL_VS_BUDGET_MISMATCH = NON bloquant', () => {
    expect(hasBlockingIssue([issue('CALL_VS_BUDGET_MISMATCH')])).toBe(false);
  });

  it('TOTAL_MISMATCH = bloquant', () => {
    expect(hasBlockingIssue([issue('TOTAL_MISMATCH')])).toBe(true);
  });

  it('split sépare bloquants / avertissements', () => {
    const mixed = [issue('TOTAL_MISMATCH'), issue('LOT_GL_MISMATCH'), issue('SOURCE_ID_MISSING')];
    const split = splitAuditIssues(mixed);
    expect(split.blocking.length).toBe(2);
    expect(split.warnings.length).toBe(1);
    expect(split.warnings[0].issue_type).toBe('LOT_GL_MISMATCH');
  });
});
