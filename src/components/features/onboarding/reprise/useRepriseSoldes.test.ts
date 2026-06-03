import { describe, it, expect } from 'vitest';
import { buildOpeningLines, type RepriseInputs } from '@/components/features/onboarding/reprise/useRepriseSoldes';

const lots = [
  { id: 'lot-1', ref: 'A-101', ownerName: 'Alice' },
  { id: 'lot-2', ref: 'A-102', ownerName: 'Bob' },
];

const emptyForm = {
  bankBalances: {}, fondsAlur: '', fournisseurs: '', report110: '', report120: '',
  autres: {}, midYear: false, asOfDate: '', produits: {}, charges: {},
};

describe('buildOpeningLines', () => {
  it('produit une ligne 450-1/lot pour un solde courant (lot-centric, nature=current)', () => {
    const inputs: RepriseInputs = {
      form: emptyForm,
      lotValues: { 'lot-1:current': '500' },
      bankCodeById: { 'acc-512': '512000' },
      autresCodeById: {},
      chargeCodeById: {},
      produitCodeById: {},
    };
    const lines = buildOpeningLines(inputs, lots);
    expect(lines).toContainEqual({ accountCode: '450-1', lotId: 'lot-1', amount: 500, nature: 'current' });
  });

  it('mappe 103/lot pour une avance', () => {
    const inputs: RepriseInputs = {
      form: emptyForm,
      lotValues: { 'lot-2:avance': '300' },
      bankCodeById: {}, autresCodeById: {}, chargeCodeById: {}, produitCodeById: {},
    };
    const lines = buildOpeningLines(inputs, lots);
    expect(lines).toContainEqual({ accountCode: '103', lotId: 'lot-2', amount: 300 });
  });

  it('mappe les comptes globaux essentiels (105/401/110/120) sans lotId', () => {
    const inputs: RepriseInputs = {
      form: { ...emptyForm, fondsAlur: '1000', fournisseurs: '200', report110: '50', report120: '80' },
      lotValues: {},
      bankCodeById: {}, autresCodeById: {}, chargeCodeById: {}, produitCodeById: {},
    };
    const lines = buildOpeningLines(inputs, lots);
    expect(lines).toContainEqual({ accountCode: '105', lotId: null, amount: -1000 });
    expect(lines).toContainEqual({ accountCode: '401', lotId: null, amount: -200 });
    expect(lines).toContainEqual({ accountCode: '110', lotId: null, amount: 50 });
    expect(lines).toContainEqual({ accountCode: '120', lotId: null, amount: 80 });
  });

  it('mappe la banque par CODE résolu via account_id (B5), pas par 512 nu', () => {
    const inputs: RepriseInputs = {
      form: { ...emptyForm, bankBalances: { 'acc-512': '4200' } },
      lotValues: {},
      bankCodeById: { 'acc-512': '512000' },
      autresCodeById: {}, chargeCodeById: {}, produitCodeById: {},
    };
    const lines = buildOpeningLines(inputs, lots);
    expect(lines).toContainEqual({ accountCode: '512000', lotId: null, amount: 4200 });
  });

  it('ignore les champs vides / 0 et n\'inclut les 6/7 que si midYear', () => {
    const inputs: RepriseInputs = {
      form: { ...emptyForm, midYear: false, charges: { 'acc-601': '100' } },
      lotValues: { 'lot-1:current': '0', 'lot-1:works': '' },
      bankCodeById: {}, autresCodeById: {}, chargeCodeById: { 'acc-601': '601' }, produitCodeById: {},
    };
    const lines = buildOpeningLines(inputs, lots);
    expect(lines.find(l => l.accountCode === '601')).toBeUndefined(); // midYear off
    expect(lines.find(l => l.accountCode === '450-1' && l.lotId === 'lot-1')).toBeUndefined(); // 0/vide
  });

  it('inclut les charges 6xx (débit) et produits 7xx (crédit, signé négatif) quand midYear', () => {
    const inputs: RepriseInputs = {
      form: { ...emptyForm, midYear: true, asOfDate: '2026-06-01',
              charges: { 'acc-601': '100' }, produits: { 'acc-701': '900' } },
      lotValues: {},
      bankCodeById: {}, autresCodeById: {},
      chargeCodeById: { 'acc-601': '601' }, produitCodeById: { 'acc-701': '701' },
    };
    const lines = buildOpeningLines(inputs, lots);
    expect(lines).toContainEqual({ accountCode: '601', lotId: null, amount: 100 });
    expect(lines).toContainEqual({ accountCode: '701', lotId: null, amount: -900 });
  });
});
