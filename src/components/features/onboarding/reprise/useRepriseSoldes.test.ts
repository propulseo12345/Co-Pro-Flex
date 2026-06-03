import { describe, it, expect } from 'vitest';
import {
  buildOpeningLines,
  buildCodeIndex,
  rebuildFormFromLines,
  type RepriseInputs,
} from '@/components/features/onboarding/reprise/useRepriseSoldes';
import type { OpeningBalanceLine } from '@/lib/onboarding/api';

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

// ── Comptes utilisés pour les tests de ré-hydratation (id + code) ──
const bankAccounts = [
  { id: 'acc-512', code: '512000' },   // compte courant
  { id: 'acc-502', code: '512100' },   // fonds travaux (même préfixe 512, autre compte)
];
const planAccounts = [
  { id: 'acc-601', code: '601' },      // charge
  { id: 'acc-701', code: '701' },      // produit
  { id: 'acc-468', code: '468' },      // « autre » compte de bilan (classe 4)
];

describe('buildCodeIndex (factorisation index code -> account_id)', () => {
  it('classe banque/charges/produits/autres, sans confondre les codes 512x', () => {
    const idx = buildCodeIndex(bankAccounts, planAccounts);
    expect(idx.bankIdByCode).toEqual({ '512000': 'acc-512', '512100': 'acc-502' });
    expect(idx.chargeIdByCode).toEqual({ '601': 'acc-601' });
    expect(idx.produitIdByCode).toEqual({ '701': 'acc-701' });
    expect(idx.autresIdByCode).toEqual({ '468': 'acc-468' });
  });
});

describe('rebuildFormFromLines (P0-A : ré-hydratation complète)', () => {
  // Simule get_opening_balance : amount signé (debit +, credit -), exposé par account_code.
  const linesFromGet: OpeningBalanceLine[] = [
    { accountCode: '450-1', lotId: 'lot-1', amount: 500, nature: 'current' },
    { accountCode: '103', lotId: 'lot-2', amount: 300 },
    { accountCode: '105', lotId: null, amount: -1000 },   // réserve ALUR (crédit)
    { accountCode: '401', lotId: null, amount: -200 },    // dette fournisseur (crédit)
    { accountCode: '110', lotId: null, amount: 50 },
    { accountCode: '120', lotId: null, amount: 80 },
    { accountCode: '512000', lotId: null, amount: 4200 }, // BANQUE
    { accountCode: '512100', lotId: null, amount: 900 },  // 2e BANQUE
    { accountCode: '468', lotId: null, amount: 75 },      // AUTRE
    { accountCode: '601', lotId: null, amount: 100 },     // CHARGE -> active midYear
    { accountCode: '701', lotId: null, amount: -900 },    // PRODUIT (crédit, signé négatif)
  ];

  it('restaure banque/autres/6-7 (et plus seulement 450/103/105/401/110/120)', () => {
    const { form, lotValues } = rebuildFormFromLines(linesFromGet, '2026-06-01', bankAccounts, planAccounts);
    // lots
    expect(lotValues['lot-1:current']).toBe('500');
    expect(lotValues['lot-2:avance']).toBe('300');
    // essentiels
    expect(form.fondsAlur).toBe('1000');
    expect(form.fournisseurs).toBe('200');
    expect(form.report110).toBe('50');
    expect(form.report120).toBe('80');
    // BANQUE restaurée par account_id (régression P0-A)
    expect(form.bankBalances['acc-512']).toBe('4200');
    expect(form.bankBalances['acc-502']).toBe('900');
    // AUTRE restauré
    expect(form.autres['acc-468']).toBe('75');
    // 6/7 restaurés + midYear activé, produit ré-inversé en positif
    expect(form.charges['acc-601']).toBe('100');
    expect(form.produits['acc-701']).toBe('900');
    expect(form.midYear).toBe(true);
    expect(form.asOfDate).toBe('2026-06-01');
  });

  it('FIX 7 : 450-3 / 450-4 NE sont PAS reclassés en ALUR (skip silencieux évité)', () => {
    const linesWithUnknown450: OpeningBalanceLine[] = [
      { accountCode: '450-1', lotId: 'lot-1', amount: 500, nature: 'current' },
      { accountCode: '450-5', lotId: 'lot-1', amount: 200, nature: 'alur' },
      { accountCode: '450-3', lotId: 'lot-1', amount: 999 }, // avance -> non éditable ici
      { accountCode: '450-4', lotId: 'lot-1', amount: 888 }, // prêt -> non éditable ici
    ];
    const { lotValues } = rebuildFormFromLines(linesWithUnknown450, '2026-01-01', bankAccounts, planAccounts, '2026-01-01');
    expect(lotValues['lot-1:current']).toBe('500');
    expect(lotValues['lot-1:alur']).toBe('200'); // SEULEMENT la vraie ligne ALUR (450-5)
    // 450-3/450-4 ignorés : ils ne polluent PAS la colonne ALUR.
    expect(lotValues['lot-1:alur']).not.toBe('999');
    expect(lotValues['lot-1:alur']).not.toBe('888');
  });

  it('FIX 6 : reprise plein-exercice (as_of_date == periodStart) NE coche PAS midYear', () => {
    const lines: OpeningBalanceLine[] = [
      { accountCode: '450-1', lotId: 'lot-1', amount: 500, nature: 'current' },
      { accountCode: '105', lotId: null, amount: -1000 },
    ];
    // as_of_date == début de période -> plein exercice, midYear doit rester FALSE.
    const { form } = rebuildFormFromLines(lines, '2026-01-01', bankAccounts, planAccounts, '2026-01-01');
    expect(form.midYear).toBe(false);
    // as_of_date strictement après le début -> reprise en cours d'année.
    const mid = rebuildFormFromLines(lines, '2026-06-15', bankAccounts, planAccounts, '2026-01-01');
    expect(mid.form.midYear).toBe(true);
  });

  it('ROUND-TRIP : buildOpeningLines -> get(simulé) -> rebuild -> buildOpeningLines est stable', () => {
    // 1) Saisie initiale complète (toutes natures), telle que produite par l'UI.
    const idx = buildCodeIndex(bankAccounts, planAccounts);
    const invert = (m: Record<string, string>) =>
      Object.fromEntries(Object.entries(m).map(([code, id]) => [id, code]));
    const initialForm = {
      ...emptyForm,
      midYear: true,
      asOfDate: '2026-06-01',
      bankBalances: { 'acc-512': '4200', 'acc-502': '900' },
      fondsAlur: '1000',
      fournisseurs: '200',
      report110: '50',
      report120: '80',
      autres: { 'acc-468': '75' },
      charges: { 'acc-601': '100' },
      produits: { 'acc-701': '900' },
    };
    const initialInputs: RepriseInputs = {
      form: initialForm,
      lotValues: { 'lot-1:current': '500', 'lot-2:avance': '300' },
      bankCodeById: invert(idx.bankIdByCode),
      autresCodeById: invert(idx.autresIdByCode),
      chargeCodeById: invert(idx.chargeIdByCode),
      produitCodeById: invert(idx.produitIdByCode),
    };
    const linesA = buildOpeningLines(initialInputs, lots);

    // 2) get_opening_balance renvoie les MÊMES lignes (signe debit+/credit-), par account_code.
    //    buildOpeningLines produit déjà ce format -> on les réutilise telles quelles.
    // 3) Ré-hydratation depuis ces lignes.
    const { form, lotValues } = rebuildFormFromLines(linesA, '2026-06-01', bankAccounts, planAccounts);

    // 4) Re-construction des lignes depuis le form ré-hydraté.
    const reInputs: RepriseInputs = {
      form,
      lotValues,
      bankCodeById: invert(idx.bankIdByCode),
      autresCodeById: invert(idx.autresIdByCode),
      chargeCodeById: invert(idx.chargeIdByCode),
      produitCodeById: invert(idx.produitIdByCode),
    };
    const linesB = buildOpeningLines(reInputs, lots);

    // Les deux jeux de lignes doivent être identiques (à l'ordre près) -> aucune perte.
    const sortKey = (l: OpeningBalanceLine) => `${l.accountCode}|${l.lotId ?? ''}`;
    const sort = (arr: OpeningBalanceLine[]) => [...arr].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
    expect(sort(linesB)).toEqual(sort(linesA));
    // La banque DOIT survivre au round-trip (cœur de la régression P0-A).
    expect(linesB).toContainEqual({ accountCode: '512000', lotId: null, amount: 4200 });
    expect(linesB).toContainEqual({ accountCode: '512100', lotId: null, amount: 900 });
  });

  it('ROUND-TRIP FIX 6 : reprise plein-exercice reste midYear=false après rebuild', () => {
    // Saisie plein-exercice (midYear=false) : pas de 6xx/7xx, juste un solde de lot.
    const idx = buildCodeIndex(bankAccounts, planAccounts);
    const invert = (m: Record<string, string>) =>
      Object.fromEntries(Object.entries(m).map(([code, id]) => [id, code]));
    const inputs: RepriseInputs = {
      form: { ...emptyForm, midYear: false },
      lotValues: { 'lot-1:current': '500' },
      bankCodeById: invert(idx.bankIdByCode),
      autresCodeById: invert(idx.autresIdByCode),
      chargeCodeById: invert(idx.chargeIdByCode),
      produitCodeById: invert(idx.produitIdByCode),
    };
    const linesA = buildOpeningLines(inputs, lots);
    // save() poste à as_of_date = periodStart pour une reprise plein-exercice.
    const periodStart = '2026-01-01';
    const { form } = rebuildFormFromLines(linesA, periodStart, bankAccounts, planAccounts, periodStart);
    // La case « reprise en cours d'année » NE doit PAS se re-cocher.
    expect(form.midYear).toBe(false);
    expect(form.asOfDate).toBe(periodStart);
  });
});
