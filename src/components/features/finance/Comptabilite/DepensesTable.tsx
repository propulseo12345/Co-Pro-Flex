'use client';

import { useMemo } from 'react';
import { FileText, Link as LinkIcon, Eye, Edit, DollarSign, ArrowRight, Wallet } from 'lucide-react';
import { Depense } from './types';
import { TYPE_DEPENSE_LABELS } from './data';
import { formatCurrency, formatDate } from './utils';
import styles from './Comptabilite.module.css';

interface DepensesTableProps {
  depenses: Depense[];
  onViewDetail: (depense: Depense) => void;
}

export function DepensesTable({ depenses, onViewDetail }: DepensesTableProps) {
  // Calculate totals
  const totals = useMemo(() => {
    return depenses.reduce(
      (acc, dep) => ({
        montant: acc.montant + (dep.montant || 0),
        budget: acc.budget + (dep.budgetPrevu || 0),
      }),
      { montant: 0, budget: 0 }
    );
  }, [depenses]);

  return (
    <div className={styles.tableContainer}>
      {/* Table header with count */}
      <div className={styles.tableHeader}>
        <span className={styles.tableTitle}>
          <Wallet size={16} />
          Compte de gestion
        </span>
        <span className={styles.tableCount}>{depenses.length} dépenses</span>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th style={{ width: '90px' }}>Date</th>
            <th>Libellé</th>
            <th style={{ width: '140px' }}>Fournisseur</th>
            <th style={{ width: '130px' }}>Type</th>
            <th className={styles.textRight} style={{ width: '110px' }}>Montant</th>
            <th className={styles.textRight} style={{ width: '110px' }}>Budget</th>
            <th className={styles.textRight} style={{ width: '100px' }}>Écart</th>
            <th style={{ width: '140px' }}>Compte</th>
            <th className={styles.textCenter} style={{ width: '80px' }}>Liens</th>
            <th className={styles.textCenter} style={{ width: '80px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {depenses.map((depense) => {
            const ecart = (depense.budgetPrevu || 0) - depense.montant;
            return (
              <tr key={depense.id}>
                <td className={styles.dateCell}>
                  {formatDate(depense.date)}
                </td>
                <td className={styles.libelleCell}>{depense.libelle}</td>
                <td className={styles.fournisseurCell}>{depense.fournisseur}</td>
                <td>
                  <span className={styles.typeBadge}>
                    {TYPE_DEPENSE_LABELS[depense.typeDepense]}
                  </span>
                </td>
                <td className={styles.textRight}>
                  <span className={styles.montant}>
                    {formatCurrency(depense.montant)}
                  </span>
                </td>
                <td className={styles.textRight}>
                  <span className={styles.budgetPrevu}>
                    {formatCurrency(depense.budgetPrevu || 0)}
                  </span>
                </td>
                <td className={styles.textRight}>
                  <span className={ecart >= 0 ? styles.ecartPositif : styles.ecartNegatif}>
                    {ecart >= 0 ? '+' : ''}
                    {formatCurrency(ecart)}
                  </span>
                </td>
                <td>
                  <span className={styles.compteBadge}>
                    {depense.compte} - {depense.compteLabel}
                  </span>
                </td>
                <td className={styles.textCenter}>
                  <div className={styles.liens}>
                    {depense.factureLiee && (
                      <span className={styles.lienBadge} title="Facture liée">
                        <FileText size={12} aria-hidden="true" />
                        {depense.factureLiee}
                      </span>
                    )}
                    {depense.mouvementBancaireLie && (
                      <span className={styles.lienBadge} title="Mouvement bancaire lié">
                        <LinkIcon size={12} />
                        {depense.mouvementBancaireLie}
                      </span>
                    )}
                    {depense.budgetLie && (
                      <span className={styles.lienBadgePrimary} title="Budget lié">
                        <DollarSign size={12} aria-hidden="true" />
                        Budget
                      </span>
                    )}
                    {depense.appelFondsLie && (
                      <span className={styles.lienBadgeSuccess} title="Appel de fonds lié">
                        <ArrowRight size={12} aria-hidden="true" />
                        AF
                      </span>
                    )}
                  </div>
                </td>
                <td className={styles.textCenter}>
                  <div className={styles.actions}>
                    <button
                      className={styles.actionButton}
                      onClick={() => onViewDetail(depense)}
                      title="Voir les détails"
                    >
                      <Eye size={16} aria-hidden="true" />
                    </button>
                    <button className={styles.actionButton} title="Modifier" aria-label="Modifier">
                      <Edit size={16} aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        {depenses.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={4} className={styles.textRight}>
                <strong>TOTAUX</strong>
              </td>
              <td className={styles.textRight}>
                <span className={styles.montant}>{formatCurrency(totals.montant)}</span>
              </td>
              <td className={styles.textRight}>
                <span className={styles.budgetPrevu}>{formatCurrency(totals.budget)}</span>
              </td>
              <td className={styles.textRight}>
                <span className={totals.budget - totals.montant >= 0 ? styles.ecartPositif : styles.ecartNegatif}>
                  {totals.budget - totals.montant >= 0 ? '+' : ''}
                  {formatCurrency(totals.budget - totals.montant)}
                </span>
              </td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        )}
      </table>

      {depenses.length === 0 && (
        <div className={styles.emptyState}>
          <FileText size={48} aria-hidden="true" />
          <p>Aucune dépense trouvée</p>
        </div>
      )}
    </div>
  );
}
