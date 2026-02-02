'use client';

import { TrendingUp, TrendingDown, Minus, CheckCircle, AlertTriangle } from 'lucide-react';
import type { LigneBalance } from '@/components/features/finance/Comptabilite/types';
import styles from '@/app/(dashboard)/documents/balance/balance.module.css';

interface BalanceTotals {
  totalOuvertureDebit: number;
  totalOuvertureCredit: number;
  totalMouvementDebit: number;
  totalMouvementCredit: number;
  totalClotureDebit: number;
  totalClotureCredit: number;
}

interface BalanceTableProps {
  filteredBalance: LigneBalance[];
  totaux: BalanceTotals;
  anneeExercice: string;
  showComparison: boolean;
  isEquilibre: boolean;
  ecart: number;
  formatCurrency: (value: number) => string;
}

export function BalanceTable({
  filteredBalance,
  totaux,
  anneeExercice,
  showComparison,
  isEquilibre,
  ecart,
  formatCurrency,
}: BalanceTableProps) {
  return (
    <div className={`card ${styles.tableWrapper}`}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th rowSpan={2}>Compte</th>
            <th rowSpan={2}>Libellé</th>
            {showComparison && (
              <th colSpan={2} className={styles.headerGroup}>Ouverture</th>
            )}
            <th colSpan={2} className={styles.headerGroup}>Mouvements {anneeExercice}</th>
            <th colSpan={2} className={styles.headerGroup}>Clôture {anneeExercice}</th>
            {showComparison && (
              <th rowSpan={2} className={styles.headerEvolution}>Évol.</th>
            )}
          </tr>
          <tr>
            {showComparison && <th className={styles.subHeader}>Débit</th>}
            {showComparison && <th className={styles.subHeader}>Crédit</th>}
            <th className={styles.subHeader}>Débit</th>
            <th className={styles.subHeader}>Crédit</th>
            <th className={styles.subHeader}>Débit</th>
            <th className={styles.subHeader}>Crédit</th>
          </tr>
        </thead>
        <tbody>
          {filteredBalance.map((ligne: LigneBalance) => {
            const evolution = ligne.variationPourcent;

            return (
              <tr key={ligne.compte} className={styles[`level-${ligne.classe.length}`]}>
                <td className={styles.accountNumber}>{ligne.compte}</td>
                <td className={styles.accountName}>{ligne.compteLabel}</td>
                {showComparison && (
                  <td className={styles.amount}>
                    {ligne.soldeOuvertureDebit > 0 ? formatCurrency(ligne.soldeOuvertureDebit) : '-'}
                  </td>
                )}
                {showComparison && (
                  <td className={styles.amount}>
                    {ligne.soldeOuvertureCredit > 0 ? formatCurrency(ligne.soldeOuvertureCredit) : '-'}
                  </td>
                )}
                <td className={styles.amount}>
                  {ligne.mouvementDebit > 0 ? formatCurrency(ligne.mouvementDebit) : '-'}
                </td>
                <td className={styles.amount}>
                  {ligne.mouvementCredit > 0 ? formatCurrency(ligne.mouvementCredit) : '-'}
                </td>
                <td className={styles.amountMain}>
                  {ligne.soldeClotureDebit > 0 ? formatCurrency(ligne.soldeClotureDebit) : '-'}
                </td>
                <td className={styles.amountMain}>
                  {ligne.soldeClotureCredit > 0 ? formatCurrency(ligne.soldeClotureCredit) : '-'}
                </td>
                {showComparison && (
                  <td className={styles.evolution}>
                    {evolution !== undefined ? (
                      <span className={
                        evolution > 5 ? styles.evolutionUp :
                        evolution < -5 ? styles.evolutionDown :
                        styles.evolutionNeutral
                      }>
                        {evolution > 5 && <TrendingUp size={14} />}
                        {evolution < -5 && <TrendingDown size={14} />}
                        {evolution >= -5 && evolution <= 5 && <Minus size={14} />}
                        {evolution > 0 ? '+' : ''}{evolution.toFixed(1)}%
                      </span>
                    ) : (
                      <span className={styles.evolutionNew}>-</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className={styles.totalRow}>
            <td colSpan={2}><strong>TOTAUX</strong></td>
            {showComparison && (
              <td className={styles.amount}>
                <strong>{totaux.totalOuvertureDebit > 0 ? formatCurrency(totaux.totalOuvertureDebit) : '-'}</strong>
              </td>
            )}
            {showComparison && (
              <td className={styles.amount}>
                <strong>{totaux.totalOuvertureCredit > 0 ? formatCurrency(totaux.totalOuvertureCredit) : '-'}</strong>
              </td>
            )}
            <td className={styles.amount}>
              <strong>{formatCurrency(totaux.totalMouvementDebit)}</strong>
            </td>
            <td className={styles.amount}>
              <strong>{formatCurrency(totaux.totalMouvementCredit)}</strong>
            </td>
            <td className={styles.amountMain}>
              <strong>{formatCurrency(totaux.totalClotureDebit)}</strong>
            </td>
            <td className={styles.amountMain}>
              <strong>{formatCurrency(totaux.totalClotureCredit)}</strong>
            </td>
            {showComparison && <td></td>}
          </tr>
          <tr className={styles.equilibreRow}>
            <td colSpan={showComparison ? 9 : 6}>
              {isEquilibre ? (
                <span className={styles.equilibreOk}>
                  <CheckCircle size={16} aria-hidden="true" />
                  Balance équilibrée - Total mouvements: {formatCurrency(totaux.totalMouvementDebit)}
                </span>
              ) : (
                <span className={styles.equilibreError}>
                  <AlertTriangle size={16} aria-hidden="true" />
                  Balance déséquilibrée - Écart : {formatCurrency(ecart)}
                </span>
              )}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
