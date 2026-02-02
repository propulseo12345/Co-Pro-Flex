'use client';

import type { LotWithTantiemes } from '../useCleDetailPage';
import styles from '@/app/(dashboard)/finance/cles-repartition/[id]/cle-detail.module.css';

interface LotsWeightsCardProps {
  lotsData: LotWithTantiemes[];
  tantiemesEdits: Record<string, number>;
  calculatedTotal: number;
  isManager: boolean;
  onTantiemesChange: (lotId: string, value: string) => void;
}

export function LotsWeightsCard({
  lotsData,
  tantiemesEdits,
  calculatedTotal,
  isManager,
  onTantiemesChange,
}: LotsWeightsCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Poids par lot</h2>
        <div className={styles.totalBadge}>
          Total: <strong>{calculatedTotal.toLocaleString('fr-FR')}</strong>
        </div>
      </div>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Lot</th>
              <th>Type</th>
              <th>Coproprietaire</th>
              <th className={styles.textRight}>Poids</th>
              <th className={styles.textRight}>%</th>
            </tr>
          </thead>
          <tbody>
            {lotsData.map(item => {
              const tantiemes = tantiemesEdits[item.lot.id] ?? item.tantiemes ?? 0;
              const pourcentage = calculatedTotal > 0 ? (tantiemes / calculatedTotal) * 100 : 0;
              return (
                <tr key={item.lot.id}>
                  <td><span className={styles.lotNumero}>{item.lot.numero}</span></td>
                  <td><span className={styles.lotType}>{item.lot.type}</span></td>
                  <td>{item.coproprietaire.nom} {item.coproprietaire.prenom}</td>
                  <td className={styles.textRight}>
                    <input
                      type="number"
                      className={styles.tantiemesInput}
                      value={tantiemes || ''}
                      onChange={e => onTantiemesChange(item.lot.id, e.target.value)}
                      min={0}
                      placeholder="0"
                      disabled={!isManager}
                    />
                  </td>
                  <td className={styles.textRight}>
                    <span className={styles.percentage}>{pourcentage.toFixed(2)}%</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}><strong>Total</strong></td>
              <td className={styles.textRight}><strong>{calculatedTotal.toLocaleString('fr-FR')}</strong></td>
              <td className={styles.textRight}><strong>100%</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
