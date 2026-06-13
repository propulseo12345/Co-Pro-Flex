import type { GeneralLedgerEntry, TrialBalanceEntry } from '@/lib/finance/api';

/**
 * Export comptable CSV (grand livre, balance, journaux) généré côté client
 * depuis les données déjà chargées par l'écran Comptabilité.
 *
 * Finalité légale : transmission au conseil syndical / expert-comptable
 * (art. 18-1 de la loi du 10 juillet 1965). Format pensé pour Excel FR :
 * séparateur `;`, décimale virgule, BOM UTF-8 (cf. downloadCSV).
 */

export type ExportCsvKind = 'grand-livre' | 'balance' | 'journaux';

export interface AccountingCsvMeta {
  coproName?: string | null;
  periodName?: string | null;
  /** Année de l'exercice (pour le nom de fichier et l'en-tête). */
  year: number;
}

const SEP = ';';
const EOL = '\r\n';

/**
 * Échappe une valeur pour un CSV à séparateur `;` (guillemets si `;`, `"` ou saut de ligne).
 * Neutralise aussi l'injection de formule (Excel/LibreOffice) : une cellule commençant par
 * un caractère de formule (`= + - @` ou tab/CR) est préfixée d'une apostrophe — SAUF les
 * nombres légitimes (ex. un montant négatif `-500,00`), qui ne doivent pas être altérés.
 */
export function csvEscape(value: string | number | null | undefined): string {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(,\d+)?$/.test(s)) {
    s = `'${s}`;
  }
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Montant au format français : `1234,56` (virgule décimale, 2 décimales, sans séparateur de milliers). */
export function formatCsvAmount(n: number): string {
  return (Number.isFinite(n) ? n : 0).toFixed(2).replace('.', ',');
}

/** Date ISO `YYYY-MM-DD` → `JJ/MM/AAAA` (renvoie la valeur brute si non parsable, '' si vide). */
export function formatCsvDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

function toCsv(rows: Array<Array<string | number | null | undefined>>): string {
  return rows.map((row) => row.map(csvEscape).join(SEP)).join(EOL);
}

function headerRows(title: string, meta: AccountingCsvMeta): Array<Array<string>> {
  return [
    [title],
    ['Copropriété', meta.coproName ?? ''],
    ['Exercice', meta.periodName ?? String(meta.year)],
    [],
  ];
}

/** Libellé d'écriture combiné (libellé de la transaction + libellé de ligne si présent). */
function entryLabel(e: GeneralLedgerEntry): string {
  return e.entry_label ? `${e.tx_label} - ${e.entry_label}` : e.tx_label;
}

/** Grand livre : une ligne par écriture, colonnes débit/crédit séparées. */
export function generateGrandLivreCSV(entries: GeneralLedgerEntry[], meta: AccountingCsvMeta): string {
  const rows: Array<Array<string | number>> = [
    ...headerRows('Grand livre', meta),
    ['Date', 'Journal', 'Compte', 'Libellé compte', 'Libellé écriture', 'Lot', 'Débit', 'Crédit'],
  ];
  for (const e of entries) {
    rows.push([
      formatCsvDate(e.tx_date),
      e.source_type ?? '',
      e.account_code,
      e.account_name,
      entryLabel(e),
      e.lot_ref ?? '',
      e.direction === 'debit' ? formatCsvAmount(Number(e.amount)) : '',
      e.direction === 'credit' ? formatCsvAmount(Number(e.amount)) : '',
    ]);
  }
  return toCsv(rows);
}

/** Balance : une ligne par compte, totaux débit/crédit et solde. */
export function generateBalanceCSV(entries: TrialBalanceEntry[], meta: AccountingCsvMeta): string {
  const rows: Array<Array<string | number>> = [
    ...headerRows('Balance', meta),
    ['Compte', 'Libellé', 'Total débit', 'Total crédit', 'Solde'],
  ];
  for (const e of entries) {
    rows.push([
      e.account_code,
      e.account_name,
      formatCsvAmount(Number(e.total_debit)),
      formatCsvAmount(Number(e.total_credit)),
      formatCsvAmount(Number(e.balance)),
    ]);
  }
  return toCsv(rows);
}

/** Journaux : mêmes écritures que le grand livre, regroupées par journal (source_type) puis par date. */
export function generateJournauxCSV(entries: GeneralLedgerEntry[], meta: AccountingCsvMeta): string {
  const sorted = [...entries].sort((a, b) => {
    const ja = a.source_type ?? '';
    const jb = b.source_type ?? '';
    if (ja !== jb) return ja < jb ? -1 : 1;
    return (a.tx_date ?? '') < (b.tx_date ?? '') ? -1 : 1;
  });
  const rows: Array<Array<string | number>> = [
    ...headerRows('Journaux', meta),
    ['Journal', 'Date', 'Compte', 'Libellé écriture', 'Lot', 'Débit', 'Crédit'],
  ];
  for (const e of sorted) {
    rows.push([
      e.source_type ?? '',
      formatCsvDate(e.tx_date),
      e.account_code,
      entryLabel(e),
      e.lot_ref ?? '',
      e.direction === 'debit' ? formatCsvAmount(Number(e.amount)) : '',
      e.direction === 'credit' ? formatCsvAmount(Number(e.amount)) : '',
    ]);
  }
  return toCsv(rows);
}

/** Nom de fichier normalisé : `grand-livre_le-clos-saint-michel_2026.csv`. */
export function csvFileName(kind: ExportCsvKind, meta: AccountingCsvMeta): string {
  const slug =
    (meta.coproName ?? 'copro')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'copro';
  return `${kind}_${slug}_${meta.year}.csv`;
}

/** Déclenche le téléchargement d'un CSV (BOM UTF-8 pour la détection Excel FR). */
export function downloadCSV(csv: string, fileName: string): void {
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
