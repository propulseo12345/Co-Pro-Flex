import { describe, it, expect } from 'vitest';
import { deriveExerciceYearForDate } from '@/lib/onboarding/api';

/**
 * FIX 3 — dérivation de l'année d'exercice CONTENANT une date, à partir de exercice_debut.
 * On ne doit JAMAIS utiliser getFullYear() brut pour un exercice décalé.
 */
describe('deriveExerciceYearForDate', () => {
  it('exercice civil (01-01) : année = année civile de la date', () => {
    expect(deriveExerciceYearForDate('01-01', new Date(Date.UTC(2026, 0, 15)))).toBe(2026);
    expect(deriveExerciceYearForDate('01-01', new Date(Date.UTC(2026, 11, 31)))).toBe(2026);
  });

  it('exercice décalé (07-01), jour de JANVIER : vise l\'exercice ouvert l\'année précédente', () => {
    // 15 janvier 2026, exercice juil→juin -> on est dans juil. 2025 → juin 2026 => année 2025.
    expect(deriveExerciceYearForDate('07-01', new Date(Date.UTC(2026, 0, 15)))).toBe(2025);
  });

  it('exercice décalé (07-01), jour d\'AOÛT : vise l\'exercice ouvert l\'année courante', () => {
    // 10 août 2026 -> exercice juil. 2026 → juin 2027 => année 2026.
    expect(deriveExerciceYearForDate('07-01', new Date(Date.UTC(2026, 7, 10)))).toBe(2026);
  });

  it('exercice décalé (07-01), le 1er juillet (borne) : exercice de l\'année courante', () => {
    expect(deriveExerciceYearForDate('07-01', new Date(Date.UTC(2026, 6, 1)))).toBe(2026);
  });

  it('exercice décalé (07-01), le 30 juin (veille de bascule) : exercice de l\'année précédente', () => {
    expect(deriveExerciceYearForDate('07-01', new Date(Date.UTC(2026, 5, 30)))).toBe(2025);
  });

  it('exercice_debut nul ou invalide : retombe sur exercice civil', () => {
    expect(deriveExerciceYearForDate(null, new Date(Date.UTC(2026, 2, 1)))).toBe(2026);
    expect(deriveExerciceYearForDate('garbage', new Date(Date.UTC(2026, 2, 1)))).toBe(2026);
  });
});
