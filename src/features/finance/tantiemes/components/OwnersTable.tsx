'use client';

import styles from '@/app/(dashboard)/finance/tantiemes/tantiemes.module.css';

interface OwnerAggregate {
  id: string;
  nom: string;
  tantiemes: number;
  lotsCount: number;
}

interface OwnersTableProps {
  owners: OwnerAggregate[];
  totalTantiemes: number;
  totalLots: number;
}

export function OwnersTable({ owners, totalTantiemes, totalLots }: OwnersTableProps) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Copropriétaire</th>
            <th>Lots</th>
            <th>Tantièmes</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          {owners.map(owner => (
            <tr key={owner.id}>
              <td>{owner.nom}</td>
              <td>{owner.lotsCount}</td>
              <td><strong>{owner.tantiemes.toLocaleString('fr-FR')}</strong></td>
              <td>
                {totalTantiemes > 0
                  ? `${((owner.tantiemes / totalTantiemes) * 100).toFixed(2)}%`
                  : '-'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className={styles.totalRow}>
            <td><strong>Total</strong></td>
            <td><strong>{totalLots}</strong></td>
            <td><strong>{totalTantiemes.toLocaleString('fr-FR')}</strong></td>
            <td><strong>100%</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
