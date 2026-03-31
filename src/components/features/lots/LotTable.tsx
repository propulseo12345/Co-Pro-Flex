'use client';

import { useRouter } from 'next/navigation';
import { ChevronUp, ChevronDown, Edit } from 'lucide-react';
import type { LotWithOwner } from '@/lib/lots/api';
import type { LotSortField, SortDirection } from '@/hooks/modules/useLotsPage';
import styles from './LotTable.module.css';

const LOT_TYPE_LABELS: Record<string, string> = {
  appartement: 'Appartement',
  studio: 'Studio',
  parking: 'Parking',
  cave: 'Cave',
  local_commercial: 'Commerce',
  bureau: 'Bureau',
  garage: 'Garage',
  box: 'Box',
  jardin: 'Jardin',
  terrasse: 'Terrasse',
  balcon: 'Balcon',
  loggia: 'Loggia',
  autre: 'Autre',
};

interface LotTableProps {
  lots: LotWithOwner[];
  sortField: LotSortField;
  sortDirection: SortDirection;
  onSort: (field: LotSortField) => void;
  onEdit: (lot: LotWithOwner) => void;
}

export function LotTable({ lots, sortField, sortDirection, onSort, onEdit }: LotTableProps) {
  const router = useRouter();

  const SortIcon = ({ field }: { field: LotSortField }) => {
    if (field !== sortField) {
      return <ChevronUp size={12} className={styles.sortIcon} />;
    }
    const Icon = sortDirection === 'asc' ? ChevronUp : ChevronDown;
    return <Icon size={12} className={styles.sortIconActive} />;
  };

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th onClick={() => onSort('ref')}>Réf <SortIcon field="ref" /></th>
            <th onClick={() => onSort('type')}>Type <SortIcon field="type" /></th>
            <th onClick={() => onSort('floor')}>Étage <SortIcon field="floor" /></th>
            <th onClick={() => onSort('surface')}>Surface <SortIcon field="surface" /></th>
            <th onClick={() => onSort('tantiemes_generaux')}>Tantièmes <SortIcon field="tantiemes_generaux" /></th>
            <th onClick={() => onSort('owner_display_name')}>Propriétaire <SortIcon field="owner_display_name" /></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {lots.map(lot => (
            <tr key={lot.id}>
              <td>
                <span
                  className={styles.lotRef}
                  onClick={() => router.push(`/coproprietaires/lots/${lot.id}`)}
                >
                  {lot.ref}
                </span>
              </td>
              <td>
                <span className={styles.typeBadge}>
                  {lot.type ? LOT_TYPE_LABELS[lot.type] || lot.type : '-'}
                </span>
              </td>
              <td>{lot.floor != null ? `${lot.floor}` : '-'}</td>
              <td className={styles.surface}>
                {lot.surface != null ? `${lot.surface} m²` : '-'}
              </td>
              <td className={styles.tantiemes}>{lot.tantiemes_generaux}</td>
              <td>
                {lot.owner_display_name ? (
                  <span className={styles.ownerName}>{lot.owner_display_name}</span>
                ) : (
                  <span className={styles.noOwner}>Non attribué</span>
                )}
              </td>
              <td>
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(lot); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#3b82f6',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'all 0.15s',
                  }}
                  title="Modifier ce lot"
                >
                  <Edit size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
