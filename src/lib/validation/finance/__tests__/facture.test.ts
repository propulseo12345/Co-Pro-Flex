import { describe, it, expect } from 'vitest';
import { factureSchema } from '@/lib/validation/finance/facture';

/** Renvoie la liste des champs en erreur d'un safeParse échoué. */
function errorFields(input: unknown): string[] {
  const r = factureSchema.safeParse(input);
  if (r.success) return [];
  return r.error.issues.map((i) => String(i.path[0]));
}

const valid = {
  date: '2026-06-13',
  dateEcheance: '2026-07-13',
  fournisseur: 'EDF SA',
  reference: 'FAC-2026-001',
  montant: 1250.0,
  posteBudgetaire: 'electricite' as const,
};

describe('factureSchema', () => {
  it('accepte une facture valide complète', () => {
    expect(factureSchema.safeParse(valid).success).toBe(true);
  });

  it('accepte une échéance égale à la date de facture', () => {
    expect(factureSchema.safeParse({ ...valid, dateEcheance: valid.date }).success).toBe(true);
  });

  // --- fournisseur ---
  it('rejette un fournisseur vide', () => {
    expect(errorFields({ ...valid, fournisseur: '' })).toContain('fournisseur');
  });

  // --- reference ---
  it('rejette une référence vide', () => {
    expect(errorFields({ ...valid, reference: '' })).toContain('reference');
  });

  // --- montant ---
  it('rejette un montant nul, négatif ou non numérique', () => {
    expect(errorFields({ ...valid, montant: 0 })).toContain('montant');
    expect(errorFields({ ...valid, montant: -50 })).toContain('montant');
    expect(errorFields({ ...valid, montant: 'abc' })).toContain('montant');
    expect(errorFields({ ...valid, montant: '' })).toContain('montant');
  });

  it('coerce un montant string en number (input HTML)', () => {
    const r = factureSchema.safeParse({ ...valid, montant: '1250.00' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.montant).toBe(1250);
  });

  // --- date ---
  it('rejette une date de facture vide ou mal formée', () => {
    expect(errorFields({ ...valid, date: '' })).toContain('date');
    expect(errorFields({ ...valid, date: '13/06/2026' })).toContain('date');
    expect(errorFields({ ...valid, date: '2026-13-99' })).toContain('date');
  });

  // --- dateEcheance ---
  it("rejette une date d'échéance vide ou mal formée", () => {
    expect(errorFields({ ...valid, dateEcheance: '' })).toContain('dateEcheance');
    expect(errorFields({ ...valid, dateEcheance: '13/07/2026' })).toContain('dateEcheance');
  });

  it("rejette une échéance antérieure à la date de facture (erreur sur dateEcheance)", () => {
    const fields = errorFields({ ...valid, dateEcheance: '2026-06-01' });
    expect(fields).toContain('dateEcheance');
    expect(fields).not.toContain('date');
  });

  // --- posteBudgetaire ---
  it('rejette un poste budgétaire absent ou inconnu', () => {
    expect(errorFields({ ...valid, posteBudgetaire: undefined })).toContain('posteBudgetaire');
    expect(errorFields({ ...valid, posteBudgetaire: 'inconnu' })).toContain('posteBudgetaire');
  });

  it('rejette les postes de maintenance non exposés dans le sélecteur UI', () => {
    // Ces postes existent dans le type PosteBudget (Budget/types.ts) mais ne sont
    // pas dans ALL_POSTES de PosteBudgetSelector → ils ne peuvent pas être soumis
    // via l'UI. Le schéma les rejette pour cohérence avec ce que le formulaire
    // peut réellement produire. À aligner quand ALL_POSTES sera étendu.
    const postesInaccessibles = [
      'plomberie', 'chauffage', 'toiture', 'parking', 'securite', 'parties_communes',
    ];
    for (const poste of postesInaccessibles) {
      expect(errorFields({ ...valid, posteBudgetaire: poste })).toContain('posteBudgetaire');
    }
  });

  it('accepte les 7 postes budgétaires exposés par le sélecteur', () => {
    const postes = [
      'eau', 'electricite', 'assurance', 'menage', 'ascenseur', 'espaces_verts', 'divers',
    ] as const;
    for (const poste of postes) {
      expect(factureSchema.safeParse({ ...valid, posteBudgetaire: poste }).success).toBe(true);
    }
  });
});
