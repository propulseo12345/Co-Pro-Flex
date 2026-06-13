import { describe, it, expect } from 'vitest';
import { resolutionInlineSchema, MAJORITY_TYPES } from '@/lib/validation/ag/resolution-inline';

/** Renvoie la liste des champs en erreur d'un safeParse échoué. */
function errorFields(input: unknown): string[] {
  const r = resolutionInlineSchema.safeParse(input);
  if (r.success) return [];
  return r.error.issues.map((i) => String(i.path[0]));
}

const valid = {
  titre: 'Approbation des comptes',
  texte: "L'assemblée générale approuve les comptes de l'exercice.",
  majorite: 'ART_24' as const,
};

describe('resolutionInlineSchema', () => {
  it('accepte une résolution valide', () => {
    expect(resolutionInlineSchema.safeParse(valid).success).toBe(true);
  });

  it('trim le titre et le texte en sortie', () => {
    const r = resolutionInlineSchema.safeParse({ ...valid, titre: '  Titre  ', texte: '  Texte  ' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.titre).toBe('Titre');
      expect(r.data.texte).toBe('Texte');
    }
  });

  it("rejette un titre vide ou composé uniquement d'espaces", () => {
    expect(errorFields({ ...valid, titre: '' })).toContain('titre');
    expect(errorFields({ ...valid, titre: '   ' })).toContain('titre');
  });

  it("rejette un texte vide ou composé uniquement d'espaces", () => {
    expect(errorFields({ ...valid, texte: '' })).toContain('texte');
    expect(errorFields({ ...valid, texte: '   ' })).toContain('texte');
  });

  it('rejette une majorité inconnue', () => {
    expect(errorFields({ ...valid, majorite: 'ART_99' })).toContain('majorite');
    expect(errorFields({ ...valid, majorite: '' })).toContain('majorite');
  });

  it('accepte toutes les majorités légales', () => {
    for (const maj of MAJORITY_TYPES) {
      expect(resolutionInlineSchema.safeParse({ ...valid, majorite: maj }).success).toBe(true);
    }
  });
});
