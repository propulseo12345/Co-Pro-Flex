/**
 * Data Adapter - Transforms Supabase data to local Comptabilite format
 */
import type { GeneralLedgerEntry, TrialBalanceEntry } from '@/lib/finance/api';
import type { OperationComptable, LigneBalance } from './types';

type TypeCompte = 'ACTIF' | 'PASSIF' | 'CHARGE' | 'PRODUIT';

/**
 * Maps Supabase account_type to local TypeCompte
 */
export function mapAccountType(accountType: string): TypeCompte {
  switch (accountType) {
    case 'asset':
      return 'ACTIF';
    case 'liability':
      return 'PASSIF';
    case 'equity':
      return 'PASSIF';
    case 'revenue':
      return 'PRODUIT';
    case 'expense':
      return 'CHARGE';
    default:
      return 'ACTIF';
  }
}

/**
 * Transforms GeneralLedgerEntry[] from Supabase to OperationComptable[]
 */
export function transformLedgerToOperations(entries: GeneralLedgerEntry[]): OperationComptable[] {
  let runningBalance = 0;

  return entries.map((entry) => {
    const debit = entry.direction === 'debit' ? Number(entry.amount) : 0;
    const credit = entry.direction === 'credit' ? Number(entry.amount) : 0;
    runningBalance += debit - credit;

    return {
      id: entry.entry_id,
      date: entry.tx_date,
      compte: entry.account_code,
      compteLabel: entry.account_name,
      typeCompte: mapAccountType(entry.account_type),
      libelle: entry.tx_label + (entry.entry_label ? ` - ${entry.entry_label}` : ''),
      debit,
      credit,
      solde: runningBalance,
      numeroPiece: entry.source_id?.slice(0, 8) || undefined,
    };
  });
}

/**
 * Transforms TrialBalanceEntry[] from Supabase to LigneBalance[]
 */
export function transformTrialBalanceToLigneBalance(entries: TrialBalanceEntry[]): LigneBalance[] {
  return entries.map((entry) => ({
    compte: entry.account_code,
    compteLabel: entry.account_name,
    typeCompte: mapAccountType(entry.account_type),
    classe: entry.account_code.charAt(0),
    soldeOuvertureDebit: 0,
    soldeOuvertureCredit: 0,
    mouvementDebit: Number(entry.total_debit),
    mouvementCredit: Number(entry.total_credit),
    soldeClotureDebit: Number(entry.balance) > 0 ? Number(entry.balance) : 0,
    soldeClotureCredit: Number(entry.balance) < 0 ? -Number(entry.balance) : 0,
  }));
}
