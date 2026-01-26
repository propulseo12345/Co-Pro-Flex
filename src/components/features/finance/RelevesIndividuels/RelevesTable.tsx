'use client';

import { Eye, FileText, Download, TrendingUp, TrendingDown, Minus, CheckSquare, Square } from 'lucide-react';
import type { ReleveIndividuel } from './types';
import styles from './releves-individuels.module.css';

interface RelevesTableProps {
  releves: ReleveIndividuel[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onViewReleve: (releve: ReleveIndividuel) => void;
  onExportReleve: (releve: ReleveIndividuel) => void;
}

export function RelevesTable({
  releves,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onViewReleve,
  onExportReleve
}: RelevesTableProps) {
  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(montant);
  };

  const formatVariation = (variation: number | undefined) => {
    if (variation === undefined) return '-';
    const sign = variation > 0 ? '+' : '';
    return `${sign}${variation.toFixed(1)}%`;
  };

  const getSoldeBadgeClass = (solde: number) => {
    if (solde < 0) return styles.badgeDebiteur;
    if (solde > 0) return styles.badgeCrediteur;
    return styles.badgeEquilibre;
  };

  const getSoldeIcon = (solde: number) => {
    if (solde < 0) return <TrendingDown size={14} />;
    if (solde > 0) return <TrendingUp size={14} />;
    return <Minus size={14} />;
  };

  const allSelected = releves.length > 0 && selectedIds.length === releves.length;

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.checkboxCell}>
              <button
                className={styles.checkboxButton}
                onClick={onToggleSelectAll}
                title={allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
              >
                {allSelected ? <CheckSquare size={18} /> : <Square size={18} />}
              </button>
            </th>
            <th>Copropriétaire</th>
            <th>Lots</th>
            <th className={styles.textRight}>Tantièmes</th>
            <th className={styles.textRight}>Charges N</th>
            <th className={styles.textRight}>Var. N-1</th>
            <th className={styles.textRight}>Appelé</th>
            <th className={styles.textRight}>Payé</th>
            <th className={styles.textCenter}>Solde</th>
            <th className={styles.textCenter}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {releves.length === 0 ? (
            <tr>
              <td colSpan={10} className={styles.emptyState}>
                <FileText size={48} />
                <p>Aucun relevé trouvé</p>
              </td>
            </tr>
          ) : (
            releves.map((releve) => (
              <tr key={releve.id}>
                <td className={styles.checkboxCell}>
                  <button
                    className={styles.checkboxButton}
                    onClick={() => onToggleSelect(releve.id)}
                  >
                    {selectedIds.includes(releve.id) ? (
                      <CheckSquare size={18} className={styles.checkboxChecked} />
                    ) : (
                      <Square size={18} />
                    )}
                  </button>
                </td>
                <td>
                  <div className={styles.coproInfo}>
                    <span className={styles.coproNom}>
                      {releve.coproprietaire.nom} {releve.coproprietaire.prenom}
                    </span>
                    <span className={styles.coproEmail}>{releve.coproprietaire.email}</span>
                  </div>
                </td>
                <td>
                  <div className={styles.lotsCell}>
                    {releve.coproprietaire.lots.map(lot => (
                      <span key={lot.id} className={styles.lotBadge}>
                        {lot.numero}
                      </span>
                    ))}
                  </div>
                </td>
                <td className={styles.textRight}>
                  <span className={styles.tantiemes}>{releve.coproprietaire.totalTantiemes}</span>
                </td>
                <td className={styles.textRight}>
                  <span className={styles.montant}>{formatMontant(releve.totalCharges)}</span>
                </td>
                <td className={styles.textRight}>
                  <span className={`${styles.variation} ${(releve.variationCharges || 0) > 0 ? styles.variationUp : styles.variationDown}`}>
                    {formatVariation(releve.variationCharges)}
                  </span>
                </td>
                <td className={styles.textRight}>
                  <span className={styles.montant}>{formatMontant(releve.totalAppeles)}</span>
                </td>
                <td className={styles.textRight}>
                  <span className={styles.montant}>{formatMontant(releve.totalPaye)}</span>
                </td>
                <td className={styles.textCenter}>
                  <span className={`${styles.soldeBadge} ${getSoldeBadgeClass(releve.solde)}`}>
                    {getSoldeIcon(releve.solde)}
                    {formatMontant(Math.abs(releve.solde))}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button
                      className={styles.actionButton}
                      onClick={() => onViewReleve(releve)}
                      title="Voir le relevé"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      className={styles.actionButton}
                      onClick={() => onExportReleve(releve)}
                      title="Exporter HTML"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
