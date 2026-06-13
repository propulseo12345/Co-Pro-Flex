import { describe, it, expect } from 'vitest';
import { depenseSchema } from '@/lib/validation/finance/depense';

/** Renvoie la liste des champs en erreur d'un safeParse échoué. */
function errorFields(input: unknown): string[] {
  const r = depenseSchema.safeParse(input);
  if (r.success) return [];
  return r.error.issues.map((i) => String(i.path[0]));
}

const valid = {
  libelle: 'Facture eau T1',
  fournisseur: 'Veolia Eau',
  montant: 350.0,
  date: '2026-06-13',
  poste: 'eau' as const,
  compteId: '602001',
  recuperable: 0,
  deductible: 0,
};

describe('depenseSchema', () => {
  it('accepte une dépense valide complète', () => {
    expect(depenseSchema.safeParse(valid).success).toBe(true);
  });

  it('accepte sans poste ni compteId ni champs optionnels', () => {
    const { poste: _p, compteId: _c, recuperable: _r, deductible: _d, ...rest } = valid;
    expect(depenseSchema.safeParse(rest).success).toBe(true);
  });

  it('accepte poste vide (aucun poste sélectionné)', () => {
    expect(depenseSchema.safeParse({ ...valid, poste: '' }).success).toBe(true);
  });

  // --- Règle : valeurs par défaut ---
  it('applique 0 par défaut pour recuperable et deductible absents', () => {
    const { recuperable: _r, deductible: _d, ...rest } = valid;
    const r = depenseSchema.safeParse(rest);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.recuperable).toBe(0);
      expect(r.data.deductible).toBe(0);
    }
  });

  // --- Règle : libellé requis ---
  it('rejette un libellé vide', () => {
    expect(errorFields({ ...valid, libelle: '' })).toContain('libelle');
  });

  it("rejette un libellé composé uniquement d'espaces", () => {
    expect(errorFields({ ...valid, libelle: '   ' })).toContain('libelle');
  });

  // --- Règle : fournisseur requis ---
  it('rejette un fournisseur vide', () => {
    expect(errorFields({ ...valid, fournisseur: '' })).toContain('fournisseur');
  });

  it("rejette un fournisseur composé uniquement d'espaces", () => {
    expect(errorFields({ ...valid, fournisseur: '   ' })).toContain('fournisseur');
  });

  // --- Règle : montant > 0 ---
  it('rejette un montant nul, négatif ou non numérique', () => {
    expect(errorFields({ ...valid, montant: 0 })).toContain('montant');
    expect(errorFields({ ...valid, montant: -10 })).toContain('montant');
    expect(errorFields({ ...valid, montant: 'abc' })).toContain('montant');
    expect(errorFields({ ...valid, montant: '' })).toContain('montant');
  });

  it('coerce un montant string en number (input HTML)', () => {
    const r = depenseSchema.safeParse({ ...valid, montant: '350.00' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.montant).toBe(350);
  });

  // --- Règle : date ISO valide ---
  it('rejette une date vide ou mal formée', () => {
    expect(errorFields({ ...valid, date: '' })).toContain('date');
    expect(errorFields({ ...valid, date: '13/06/2026' })).toContain('date');
    expect(errorFields({ ...valid, date: '2026-13-99' })).toContain('date');
  });

  // --- Règle : récupérable ≥ 0 ---
  it('rejette un montant récupérable négatif', () => {
    expect(errorFields({ ...valid, recuperable: -1 })).toContain('recuperable');
  });

  it('accepte récupérable = 0', () => {
    expect(depenseSchema.safeParse({ ...valid, recuperable: 0 }).success).toBe(true);
  });

  // --- Règle : déductible ≥ 0 ---
  it('rejette un montant déductible négatif', () => {
    expect(errorFields({ ...valid, deductible: -5 })).toContain('deductible');
  });

  // --- Poste enum ---
  it('rejette un poste inconnu', () => {
    expect(errorFields({ ...valid, poste: 'inconnu_poste' })).toContain('poste');
  });
});
