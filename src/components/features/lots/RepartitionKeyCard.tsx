'use client';

import { AlertTriangle } from 'lucide-react';
import type { RepartitionKeyWithTotals } from '@/lib/lots/api';
import type { UseRepartitionKeyDetailReturn } from '@/hooks/modules/useLotsData';
import styles from './RepartitionKeyCard.module.css';

const BASIS_LABELS: Record<string, string> = {
  tantiemes: 'Tantièmes',
  surface: 'Surface',
  custom: 'Personnalisé',
};

interface RepartitionKeyCardProps {
  keyData: RepartitionKeyWithTotals;
  isSelected: boolean;
  onSelect: () => void;
  detail: UseRepartitionKeyDetailReturn | null;
}

export function RepartitionKeyCard({ keyData, isSelected, onSelect, detail }: RepartitionKeyCardProps) {
  const completePct = keyData.lots_count > 0
    ? (keyData.lots_with_weight_count / keyData.lots_count) * 100
    : 0;

  return (
    <div className={isSelected ? styles.cardActive : styles.card} onClick={onSelect}>
      <div className={styles.header}>
        <h3 className={styles.name}>{keyData.name}</h3>
        <span className={styles.basis}>{BASIS_LABELS[keyData.basis] || keyData.basis}</span>
      </div>

      <div className={styles.meta}>
        <span className={styles.metaItem}>
          Lots: <span className={styles.metaValue}>{keyData.lots_with_weight_count}/{keyData.lots_count}</span>
        </span>
        <span className={styles.metaItem}>
          Total: <span className={styles.metaValue}>{keyData.total_weight.toLocaleString('fr-FR')}</span>
        </span>
      </div>

      <div className={styles.progressBar}>
        <div
          className={keyData.is_complete ? styles.progressComplete : styles.progressIncomplete}
          style={{ width: `${completePct}%` }}
        />
      </div>

      {!keyData.is_complete && (
        <div className={styles.warning}>
          <AlertTriangle size={12} />
          {keyData.lots_count - keyData.lots_with_weight_count} lot(s) sans poids
        </div>
      )}

      {isSelected && detail && detail.lines.length > 0 && (
        <div className={styles.detailPanel} onClick={e => e.stopPropagation()}>
          <table className={styles.detailTable}>
            <thead>
              <tr>
                <th>Lot</th>
                <th>Type</th>
                <th>Poids</th>
                <th>Part %</th>
              </tr>
            </thead>
            <tbody>
              {detail.lines.map(line => (
                <tr key={line.line_id}>
                  <td style={{ fontWeight: 600, color: '#3b82f6' }}>{line.lot_ref}</td>
                  <td>{line.lot_type || '-'}</td>
                  <td style={{ fontFamily: "'SF Mono', monospace" }}>{line.weight}</td>
                  <td style={{ fontFamily: "'SF Mono', monospace", color: '#94a3b8' }}>
                    {line.share_pct.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {detail.validation && !detail.validation.isValid && (
            <div className={styles.warning} style={{ marginTop: 12 }}>
              <AlertTriangle size={12} />
              {detail.validation.warnings.join(' · ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
