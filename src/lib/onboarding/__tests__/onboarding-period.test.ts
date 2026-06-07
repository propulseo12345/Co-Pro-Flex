import { describe, it, expect } from 'vitest';
import { deriveExerciceYearForDate, deriveExercicePeriod } from '@/lib/onboarding/api';

/**
 * Schéma cible : copros.exercice_debut = MOIS de début (int2, 1..12), jour implicite = 1er.
 * (Avant : chaîne 'MM-DD'.) On ne doit JAMAIS utiliser getFullYear() brut pour un exercice décalé.
 */
describe('deriveExerciceYearForDate (mois entier)', () => {
  it('exercice civil (1) : année = année civile de la date', () => {
    expect(deriveExerciceYearForDate(1, new Date(Date.UTC(2026, 0, 15)))).toBe(2026);
    expect(deriveExerciceYearForDate(1, new Date(Date.UTC(2026, 11, 31)))).toBe(2026);
  });

  it('exercice décalé (juillet = 7), jour de JANVIER : exercice ouvert l\'année précédente', () => {
    // 15 janvier 2026, exercice juil→juin -> on est dans juil. 2025 → juin 2026 => année 2025.
    expect(deriveExerciceYearForDate(7, new Date(Date.UTC(2026, 0, 15)))).toBe(2025);
  });

  it('exercice décalé (7), jour d\'AOÛT : exercice de l\'année courante', () => {
    expect(deriveExerciceYearForDate(7, new Date(Date.UTC(2026, 7, 10)))).toBe(2026);
  });

  it('exercice décalé (7), le 1er juillet (borne) : exercice de l\'année courante', () => {
    expect(deriveExerciceYearForDate(7, new Date(Date.UTC(2026, 6, 1)))).toBe(2026);
  });

  it('exercice décalé (7), le 30 juin (veille de bascule) : exercice de l\'année précédente', () => {
    expect(deriveExerciceYearForDate(7, new Date(Date.UTC(2026, 5, 30)))).toBe(2025);
  });

  it('null ou mois hors 1..12 : retombe sur exercice civil', () => {
    expect(deriveExerciceYearForDate(null, new Date(Date.UTC(2026, 2, 1)))).toBe(2026);
    expect(deriveExerciceYearForDate(0, new Date(Date.UTC(2026, 2, 1)))).toBe(2026);
    expect(deriveExerciceYearForDate(13, new Date(Date.UTC(2026, 2, 1)))).toBe(2026);
  });
});

describe('deriveExercicePeriod (mois entier)', () => {
  it('exercice civil (1) : 01-01 → 12-31, libellé "Exercice <année>"', () => {
    const p = deriveExercicePeriod(1, 2026);
    expect(p.start).toBe('2026-01-01');
    expect(p.end).toBe('2026-12-31');
    expect(p.name).toBe('Exercice 2026');
  });

  it('exercice juillet (7) : 07-01 → 30-06 de l\'année suivante', () => {
    const p = deriveExercicePeriod(7, 2026);
    expect(p.start).toBe('2026-07-01');
    expect(p.end).toBe('2027-06-30');
  });

  it('null : retombe sur exercice civil', () => {
    const p = deriveExercicePeriod(null, 2026);
    expect(p.start).toBe('2026-01-01');
    expect(p.end).toBe('2026-12-31');
  });
});
