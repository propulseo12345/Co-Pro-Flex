'use client';

import { useMemo } from 'react';
import { FileText, Link as LinkIcon, Eye, Edit } from 'lucide-react';
import { OperationComptable } from './types';
import { formatCurrency, formatDate } from './utils';
import styles from './Comptabilite.module.css';

interface GrandLivreTableProps {
  operations: OperationComptable[];
  onViewDetail: (operation: OperationComptable) => void;
}

export function GrandLivreTable({ operations, onViewDetail }: GrandLivreTableProps) {
  // Calculate totals
  const totals = useMemo(() => {
    return operations.reduce(
      (acc, op) => ({
        debit: acc.debit + (op.debit || 0),
        credit: acc.credit + (op.credit || 0),
      }),
      { debit: 0, credit: 0 }
    );
  }, [operations]);

  return (
    <div className={styles.tableContainer}>
      {/* Table header with count */}
      <div className={styles.tableHeader}>
        <span className={styles.tableTitle}>
          <FileText size={16} />
          Grand Livre
        </span>
        <span className={styles.tableCount}>{operations.length} écritures</span>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th style={{ width: '90px' }}>Date</th>
            <th style={{ width: '90px' }}>N° Pièce</th>
            <th style={{ width: '180px' }}>Compte</th>
            <th>Libellé</th>
            <th className={styles.textRight} style={{ width: '120px' }}>Débit</th>
            <th className={styles.textRight} style={{ width: '120px' }}>Crédit</th>
            <th className={styles.textRight} style={{ width: '120px' }}>Solde</th>
            <th className={styles.textCenter} style={{ width: '100px' }}>Liens</th>
            <th className={styles.textCenter} style={{ width: '80px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {operations.map((operation) => (
            <tr key={operation.id}>
              <td className={styles.dateCell}>
                {formatDate(operation.date)}
              </td>
              <td className={styles.pieceCell}>
                {operation.numeroPiece || '-'}
              </td>
              <td>
                <span className={styles.compteBadge}>
                  {operation.compte}
                </span>
                <div className={styles.compteLabel}>{operation.compteLabel}</div>
              </td>
              <td className={styles.libelleCell}>{operation.libelle}</td>
              <td className={styles.textRight}>
                {operation.debit > 0 ? (
                  <span className={styles.debit}>
                    {formatCurrency(operation.debit)}
                  </span>
                ) : (
                  <span className={styles.emptyCell}>-</span>
                )}
              </td>
              <td className={styles.textRight}>
                {operation.credit > 0 ? (
                  <span className={styles.credit}>
                    {formatCurrency(operation.credit)}
                  </span>
                ) : (
                  <span className={styles.emptyCell}>-</span>
                )}
              </td>
              <td className={styles.textRight}>
                <span className={styles.solde}>
                  {operation.solde !== undefined ? formatCurrency(operation.solde) : '-'}
                </span>
              </td>
              <td className={styles.textCenter}>
                <div className={styles.liens}>
                  {operation.factureLiee && (
                    <span className={styles.lienBadge} title="Facture liée">
                      <FileText size={12} aria-hidden="true" />
                      {operation.factureLiee}
                    </span>
                  )}
                  {operation.mouvementBancaireLie && (
                    <span className={styles.lienBadge} title="Mouvement bancaire lié">
                      <LinkIcon size={12} />
                      {operation.mouvementBancaireLie}
                    </span>
                  )}
                  {!operation.factureLiee && !operation.mouvementBancaireLie && (
                    <span className={styles.emptyCell}>-</span>
                  )}
                </div>
              </td>
              <td className={styles.textCenter}>
                <div className={styles.actions}>
                  <button
                    className={styles.actionButton}
                    onClick={() => onViewDetail(operation)}
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
          ))}
        </tbody>
        {operations.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={4} className={styles.textRight}>
                <strong>TOTAUX</strong>
              </td>
              <td className={styles.textRight}>
                <span className={styles.debit}>{formatCurrency(totals.debit)}</span>
              </td>
              <td className={styles.textRight}>
                <span className={styles.credit}>{formatCurrency(totals.credit)}</span>
              </td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        )}
      </table>

      {operations.length === 0 && (
        <div className={styles.emptyState}>
          <FileText size={48} aria-hidden="true" />
          <p>Aucune opération trouvée</p>
        </div>
      )}
    </div>
  );
}
