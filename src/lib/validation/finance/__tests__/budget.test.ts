import { describe, it, expect } from 'vitest';
import { budgetTravauxSchema } from '@/lib/validation/finance/budget';

/** Renvoie la liste des champs en erreur d'un safeParse échoué. */
function errorFields(input: unknown): string[] {
  const r = budgetTravauxSchema.safeParse(input);
  if (r.success) return [];
  return r.error.issues.map((i) => String(i.path[0]));
}

/** Fixture valide représentant un budget travaux minimal correct. */
const valid = {
  annee: 2027,
  nom: 'Ravalement façade',
  typeTravaux: 'facade',
  montantTotal: 45000,
  description: 'Ravalement complet de la façade principale',
  scheduleTemplate: 'classic' as const,
  withRetention: false,
};

describe('budgetTravauxSchema', () => {
  it('accepte un budget travaux valide complet', () => {
    expect(budgetTravauxSchema.safeParse(valid).success).toBe(true);
  });

  it('accepte sans description (champ optionnel)', () => {
    const { description: _d, ...rest } = valid;
    expect(budgetTravauxSchema.safeParse(rest).success).toBe(true);
  });

  // --- Règle : année 4 chiffres dans la plage 2000–2100 ---

  it('rejette une année hors plage inférieure', () => {
    expect(errorFields({ ...valid, annee: 1999 })).toContain('annee');
  });

  it('rejette une année hors plage supérieure', () => {
    expect(errorFields({ ...valid, annee: 2101 })).toContain('annee');
  });

  it('coerce une année string en number (input HTML)', () => {
    const r = budgetTravauxSchema.safeParse({ ...valid, annee: '2027' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.annee).toBe(2027);
  });

  it('rejette une année non entière', () => {
    expect(errorFields({ ...valid, annee: 2026.5 })).toContain('annee');
  });

  // --- Règle : nom requis ---

  it('rejette un nom vide', () => {
    expect(errorFields({ ...valid, nom: '' })).toContain('nom');
  });

  it('rejette un nom composé uniquement d\'espaces', () => {
    expect(errorFields({ ...valid, nom: '   ' })).toContain('nom');
  });

  // --- Règle : type de travaux requis ---

  it('rejette un type de travaux vide', () => {
    expect(errorFields({ ...valid, typeTravaux: '' })).toContain('typeTravaux');
  });

  // --- Règle : montant total > 0 ---

  it('rejette un montant nul', () => {
    expect(errorFields({ ...valid, montantTotal: 0 })).toContain('montantTotal');
  });

  it('rejette un montant négatif', () => {
    expect(errorFields({ ...valid, montantTotal: -500 })).toContain('montantTotal');
  });

  it('rejette un montant non numérique', () => {
    expect(errorFields({ ...valid, montantTotal: 'abc' })).toContain('montantTotal');
  });

  it('rejette un montant vide (string vide depuis input HTML)', () => {
    // z.coerce.number() convertit '' en 0 ; montantPositif rejette n <= 0.
    expect(errorFields({ ...valid, montantTotal: '' })).toContain('montantTotal');
  });

  it('coerce un montant string en number (input HTML)', () => {
    const r = budgetTravauxSchema.safeParse({ ...valid, montantTotal: '45000' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.montantTotal).toBe(45000);
  });

  // --- Règle : scheduleTemplate dans l'enum ---

  it('accepte tous les modèles d\'échéancier valides', () => {
    for (const tpl of ['unique', 'fifty_fifty', 'classic', 'quarterly', 'custom'] as const) {
      expect(budgetTravauxSchema.safeParse({ ...valid, scheduleTemplate: tpl }).success).toBe(true);
    }
  });

  it('rejette un modèle d\'échéancier inconnu', () => {
    expect(errorFields({ ...valid, scheduleTemplate: 'mensuel' })).toContain('scheduleTemplate');
  });

  // --- Règle : withRetention est un boolean ---

  it('accepte withRetention à true', () => {
    expect(budgetTravauxSchema.safeParse({ ...valid, withRetention: true }).success).toBe(true);
  });
});
