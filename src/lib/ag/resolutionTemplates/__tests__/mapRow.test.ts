import { describe, it, expect } from 'vitest';
import { mapRowFromDb } from '@/lib/ag/resolutionTemplates/api';

describe('mapRowFromDb (couture snake_case DB -> camelCase UI)', () => {
  const row = mapRowFromDb({
    is_information: true,
    variables_typees: [{ name: 'x' }],
    legal_ref: 'L25',
    created_at: '2026-01-01',
    usage_count: 3,
    cabinet_id: null,
    copro_id: null,
  });

  it('mappe is_information -> isInformation', () => {
    expect(row.isInformation).toBe(true);
  });

  it('mappe variables_typees -> variablesTypees (non vide)', () => {
    expect(row.variablesTypees).toBeDefined();
    expect(row.variablesTypees?.length).toBeGreaterThan(0);
  });

  it('mappe legal_ref -> legalRef', () => {
    expect(row.legalRef).toBe('L25');
  });

  it('mappe created_at -> createdAt', () => {
    expect(row.createdAt).toBeDefined();
    expect(row.createdAt).toBe('2026-01-01');
  });

  it('mappe usage_count -> usageCount', () => {
    expect(row.usageCount).toBe(3);
  });

  it('conserve les dimensions de tenance cabinet_id / copro_id', () => {
    expect(row.cabinet_id).toBeNull();
    expect(row.copro_id).toBeNull();
  });
});
