'use client';

import { useState, useMemo } from 'react';
import { Search, Eye, EyeOff, Filter } from 'lucide-react';
import type { AccountWithBalance } from './types';
import { formatCurrency, CLASSES_COMPTABLES } from './utils';
import styles from './Comptabilite.module.css';

interface LivreComptableTableProps {
  accounts: AccountWithBalance[];
  annee: number;
}

export function LivreComptableTable({ accounts, annee }: LivreComptableTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [masquerSoldesNuls, setMasquerSoldesNuls] = useState(false);
  const [classeFilter, setClasseFilter] = useState('TOUTES');

  const filtered = useMemo(() => {
    let result = accounts;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (a) => a.code.toLowerCase().includes(term) || a.name.toLowerCase().includes(term)
      );
    }

    if (classeFilter !== 'TOUTES') {
      result = result.filter((a) => a.code.startsWith(classeFilter));
    }

    if (masquerSoldesNuls) {
      result = result.filter((a) => a.debit !== 0 || a.credit !== 0);
    }

    return result;
  }, [accounts, searchTerm, classeFilter, masquerSoldesNuls]);

  const grouped = useMemo(() => {
    const map: Record<string, AccountWithBalance[]> = {};
    for (const account of filtered) {
      const classe = account.code.charAt(0);
      if (!map[classe]) map[classe] = [];
      map[classe].push(account);
    }
    return map;
  }, [filtered]);

  const totals = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    for (const a of filtered) {
      totalDebit += a.debit;
      totalCredit += a.credit;
    }
    return { totalDebit, totalCredit, solde: totalDebit - totalCredit };
  }, [filtered]);

  return (
    <div className={styles.balanceContainer}>
      <div className={styles.balanceFilters}>
        <div className={styles.searchBox}>
          <Search size={18} color="var(--text-tertiary)" aria-hidden="true" />
          <input
            type="text"
            placeholder="Rechercher un compte..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className={styles.balanceFilterGroup}>
          <Filter size={16} aria-hidden="true" />
          <select
            value={classeFilter}
            onChange={(e) => setClasseFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="TOUTES">Toutes les classes</option>
            {Object.entries(CLASSES_COMPTABLES).map(([classe, label]) => (
              <option key={classe} value={classe}>{label}</option>
            ))}
          </select>
        </div>

        <button
          className={`${styles.balanceToggle} ${masquerSoldesNuls ? styles.active : ''}`}
          onClick={() => setMasquerSoldesNuls(!masquerSoldesNuls)}
          title={masquerSoldesNuls ? 'Afficher tous les comptes' : 'Masquer les comptes sans mouvement'}
        >
          {masquerSoldesNuls ? <Eye size={16} /> : <EyeOff size={16} />}
          {masquerSoldesNuls ? 'Afficher tous' : 'Masquer nuls'}
        </button>
      </div>

      <div className={styles.balanceInfo}>
        <span>Plan comptable - Exercice {annee}</span>
        <span className={styles.balanceInfoCount}>
          {filtered.length} compte{filtered.length > 1 ? 's' : ''} sur {accounts.length}
        </span>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Compte</th>
              <th>Libelle</th>
              <th>Type</th>
              <th className={styles.textRight}>Debit</th>
              <th className={styles.textRight}>Credit</th>
              <th className={styles.textRight}>Solde</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([classe, comptes]) => (
              <>
                <tr key={`classe-${classe}`} className={styles.classeHeader}>
                  <td colSpan={6}>
                    {CLASSES_COMPTABLES[classe] || `Classe ${classe}`}
                  </td>
                </tr>
                {comptes.map((account) => {
                  const solde = account.debit - account.credit;
                  const hasMovement = account.debit !== 0 || account.credit !== 0;
                  return (
                    <tr key={account.code} className={!hasMovement ? styles.rowMuted : undefined}>
                      <td className={styles.compteBadge}>{account.code}</td>
                      <td className={styles.libelleCell}>{account.name}</td>
                      <td>
                        <span className={styles.typeBadge}>{account.accountType}</span>
                      </td>
                      <td className={styles.textRight}>
                        {account.debit > 0 ? (
                          <span className={styles.debit}>{formatCurrency(account.debit)}</span>
                        ) : (
                          <span className={styles.textMuted}>-</span>
                        )}
                      </td>
                      <td className={styles.textRight}>
                        {account.credit > 0 ? (
                          <span className={styles.credit}>{formatCurrency(account.credit)}</span>
                        ) : (
                          <span className={styles.textMuted}>-</span>
                        )}
                      </td>
                      <td className={styles.textRight}>
                        {hasMovement ? (
                          <span className={solde >= 0 ? styles.debit : styles.credit}>
                            {formatCurrency(Math.abs(solde))}
                            {solde < 0 ? ' Cr' : ' Db'}
                          </span>
                        ) : (
                          <span className={styles.textMuted}>0,00</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </>
            ))}
          </tbody>
          <tfoot>
            <tr className={styles.totalRow}>
              <td colSpan={3}><strong>TOTAUX</strong></td>
              <td className={styles.textRight}>
                <strong className={styles.debit}>{formatCurrency(totals.totalDebit)}</strong>
              </td>
              <td className={styles.textRight}>
                <strong className={styles.credit}>{formatCurrency(totals.totalCredit)}</strong>
              </td>
              <td className={styles.textRight}>
                <strong>{formatCurrency(Math.abs(totals.solde))}{totals.solde < 0 ? ' Cr' : ' Db'}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
