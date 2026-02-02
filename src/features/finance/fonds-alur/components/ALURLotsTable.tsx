'use client';

import { Search, X, FileText, ChevronRight } from 'lucide-react';
import type { ALURLotContribution } from '@/hooks/modules/useALURData';
import styles from '@/app/(dashboard)/finance/fonds-alur/fonds-alur.module.css';

interface ALURLotsTableProps {
  filteredLots: ALURLotContribution[];
  totalLots: number;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onSelectLot: (lot: ALURLotContribution) => void;
}

export function ALURLotsTable({
  filteredLots,
  totalLots,
  searchTerm,
  onSearchChange,
  onClearSearch,
  onSelectLot,
}: ALURLotsTableProps) {
  return (
    <>
      <div className={styles.searchSection}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Rechercher par lot ou copropriétaire..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchTerm && (
            <button className={styles.clearSearch} onClick={onClearSearch}>
              <X size={16} />
            </button>
          )}
        </div>
        <div className={styles.resultCount}>
          {filteredLots.length} lot{filteredLots.length > 1 ? 's' : ''} sur {totalLots}
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Lot</th>
              <th>Copropriétaire</th>
              <th className={styles.textRight}>Tantièmes</th>
              <th className={styles.textRight}>Quote-part</th>
              <th className={styles.textRight}>Solde ALUR</th>
              <th className={styles.textRight}>Cotisation/an</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredLots.map((lot) => (
              <tr
                key={lot.lotId}
                className={styles.mainRow}
                onClick={() => onSelectLot(lot)}
              >
                <td>
                  <span className={styles.lotBadge}>{lot.lotRef}</span>
                </td>
                <td className={styles.coproCell}>{lot.ownerName}</td>
                <td className={styles.textRight}>
                  {lot.tantiemesGeneraux.toLocaleString('fr-FR')}
                </td>
                <td className={styles.textRight}>{lot.sharePercent.toFixed(2)}%</td>
                <td className={styles.textRight}>
                  <span className={styles.soldeValue}>
                    {lot.lotSoldeAlur.toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </span>
                </td>
                <td className={styles.textRight}>
                  {lot.lotCotisationAnnuelle.toLocaleString('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                  })}
                </td>
                <td className={styles.actionCell}>
                  <button className={styles.detailButton} title="Voir le détail">
                    <ChevronRight size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredLots.length === 0 && (
          <div className={styles.emptyState}>
            <FileText size={48} />
            <p>{totalLots === 0 ? 'Aucun lot configuré' : 'Aucun lot trouvé'}</p>
          </div>
        )}
      </div>
    </>
  );
}
