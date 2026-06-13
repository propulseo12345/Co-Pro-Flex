import { describe, it, expect } from 'vitest';
import type { GeneralLedgerEntry, TrialBalanceEntry } from '@/lib/finance/api';
import {
  generateGrandLivreCSV,
  generateBalanceCSV,
  generateJournauxCSV,
  csvEscape,
  formatCsvAmount,
  formatCsvDate,
  csvFileName,
} from '@/lib/export/accounting-csv';

const meta = { coproName: 'Le Clos Saint-Michel', periodName: 'Exercice 2026', year: 2026 };

function gl(over: Partial<GeneralLedgerEntry>): GeneralLedgerEntry {
  return {
    entry_id: 'e1', tx_id: 't1', copro_id: 'c1', period_id: 'p1',
    tx_date: '2026-03-15', tx_label: 'Appel T1', source_type: 'AF', source_id: 's1',
    status: 'posted', posted_at: null, account_id: 'a1', account_code: '450-1',
    account_name: 'Copropriétaires', account_type: 'tiers', lot_id: 'l1', lot_ref: 'A101',
    direction: 'debit', amount: 1200, entry_label: null,
    ...over,
  };
}

function bal(over: Partial<TrialBalanceEntry>): TrialBalanceEntry {
  return {
    copro_id: 'c1', period_id: 'p1', period_name: 'Exercice 2026', account_id: 'a1',
    account_code: '512', account_name: 'Banque', account_type: 'tresorerie',
    account_parent_id: null, total_debit: 5000, total_credit: 2000, balance: 3000,
    ...over,
  };
}

describe('helpers CSV', () => {
  it('csvEscape entoure de guillemets si ; " ou retour ligne', () => {
    expect(csvEscape('abc')).toBe('abc');
    expect(csvEscape('a;b')).toBe('"a;b"');
    expect(csvEscape('a"b')).toBe('"a""b"');
    expect(csvEscape(null)).toBe('');
    expect(csvEscape(12)).toBe('12');
  });

  it('formatCsvAmount : virgule décimale, 2 décimales', () => {
    expect(formatCsvAmount(1200)).toBe('1200,00');
    expect(formatCsvAmount(1234.5)).toBe('1234,50');
    expect(formatCsvAmount(Number.NaN)).toBe('0,00');
  });

  it('formatCsvDate : ISO -> JJ/MM/AAAA', () => {
    expect(formatCsvDate('2026-03-15')).toBe('15/03/2026');
    expect(formatCsvDate('')).toBe('');
    expect(formatCsvDate(null)).toBe('');
  });

  it('csvFileName : slug sans accents', () => {
    expect(csvFileName('grand-livre', { ...meta, coproName: 'Résidence Été' })).toBe(
      'grand-livre_residence-ete_2026.csv'
    );
  });
});

describe('generateGrandLivreCSV', () => {
  const csv = generateGrandLivreCSV(
    [
      gl({ direction: 'debit', amount: 1200, account_code: '450-1' }),
      gl({ direction: 'credit', amount: 1200, account_code: '701', tx_label: 'Produit; courant', entry_label: 'T1' }),
    ],
    meta
  );
  const lines = csv.split('\r\n');

  it("contient l'en-tête copropriété + la ligne de colonnes", () => {
    expect(csv).toContain('Le Clos Saint-Michel');
    expect(lines).toContain('Date;Journal;Compte;Libellé compte;Libellé écriture;Lot;Débit;Crédit');
  });

  it('ventile débit/crédit et échappe les points-virgules', () => {
    const debitLine = lines.find((l) => l.startsWith('15/03/2026;AF;450-1'));
    expect(debitLine?.endsWith(';1200,00;')).toBe(true);
    const creditLine = lines.find((l) => l.includes('701'));
    expect(creditLine).toContain('"Produit; courant - T1"');
    expect(creditLine?.endsWith(';;1200,00')).toBe(true);
  });
});

describe('generateBalanceCSV', () => {
  const csv = generateBalanceCSV([bal({})], meta);
  it('a les colonnes et les soldes formatés', () => {
    expect(csv).toContain('Compte;Libellé;Total débit;Total crédit;Solde');
    expect(csv).toContain('512;Banque;5000,00;2000,00;3000,00');
  });
});

describe('generateJournauxCSV', () => {
  const csv = generateJournauxCSV(
    [
      gl({ source_type: 'REG', tx_date: '2026-05-01' }),
      gl({ source_type: 'AF', tx_date: '2026-02-01' }),
      gl({ source_type: 'AF', tx_date: '2026-01-01' }),
    ],
    meta
  );
  const dataLines = csv.split('\r\n').filter((l) => /^(AF|REG);/.test(l));

  it('trie par journal puis par date', () => {
    expect(dataLines[0].startsWith('AF;01/01/2026')).toBe(true);
    expect(dataLines[1].startsWith('AF;01/02/2026')).toBe(true);
    expect(dataLines[2].startsWith('REG;01/05/2026')).toBe(true);
  });
});
