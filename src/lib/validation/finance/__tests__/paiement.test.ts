import { describe, it, expect } from 'vitest';
import { paymentSchema } from '@/lib/validation/finance/paiement';

/** Renvoie la liste des champs en erreur d'un safeParse échoué. */
function errorFields(input: unknown): string[] {
  const r = paymentSchema.safeParse(input);
  if (r.success) return [];
  return r.error.issues.map((i) => String(i.path[0]));
}

const valid = {
  lotId: 'lot-123',
  amount: 150.5,
  paymentDate: '2026-06-13',
  method: 'transfer' as const,
  natureFilter: '' as const,
  reference: 'VIR-001',
};

describe('paymentSchema', () => {
  it('accepte un paiement valide complet', () => {
    expect(paymentSchema.safeParse(valid).success).toBe(true);
  });

  it('accepte sans référence ni nature (champs optionnels)', () => {
    const { reference: _r, natureFilter: _n, ...rest } = valid;
    expect(paymentSchema.safeParse(rest).success).toBe(true);
  });

  it('rejette un lot non sélectionné', () => {
    expect(errorFields({ ...valid, lotId: '' })).toContain('lotId');
  });

  it('rejette un montant nul, négatif ou non numérique', () => {
    expect(errorFields({ ...valid, amount: 0 })).toContain('amount');
    expect(errorFields({ ...valid, amount: -10 })).toContain('amount');
    expect(errorFields({ ...valid, amount: 'abc' })).toContain('amount');
    expect(errorFields({ ...valid, amount: '' })).toContain('amount');
  });

  it('coerce un montant string en number (input HTML)', () => {
    const r = paymentSchema.safeParse({ ...valid, amount: '150.5' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.amount).toBe(150.5);
  });

  it('rejette une date vide ou mal formée', () => {
    expect(errorFields({ ...valid, paymentDate: '' })).toContain('paymentDate');
    expect(errorFields({ ...valid, paymentDate: '13/06/2026' })).toContain('paymentDate');
    expect(errorFields({ ...valid, paymentDate: '2026-13-99' })).toContain('paymentDate');
  });

  it('rejette un mode de paiement inconnu', () => {
    expect(errorFields({ ...valid, method: 'bitcoin' })).toContain('method');
  });

  it('accepte les natures valides et la chaîne vide, rejette une nature inconnue', () => {
    expect(paymentSchema.safeParse({ ...valid, natureFilter: 'works' }).success).toBe(true);
    expect(paymentSchema.safeParse({ ...valid, natureFilter: '' }).success).toBe(true);
    expect(errorFields({ ...valid, natureFilter: 'autre' })).toContain('natureFilter');
  });
});
