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
  onDelete?: () => void;
  onEdit?: () => void;
}

export function RepartitionKeyCard({ keyData, isSelected, onSelect, detail, onDelete, onEdit }: RepartitionKeyCardProps) {
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
                  <td>
                    <input
                      type="number"
                      defaultValue={line.weight}
                      onBlur={(e) => {
                        const newWeight = parseInt(e.target.value, 10);
                        if (!isNaN(newWeight) && newWeight !== line.weight && detail) {
                          detail.updateLineWeight(line.lot_id, newWeight);
                        }
                      }}
                      style={{
                        width: '80px',
                        padding: '4px 8px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid rgba(148, 163, 184, 0.08)',
                        borderRadius: '6px',
                        color: 'var(--text-main)',
                        fontSize: '12px',
                        fontFamily: "'SF Mono', 'Fira Code', monospace",
                        textAlign: 'right',
                      }}
                    />
                  </td>
                  <td style={{ fontFamily: "'SF Mono', monospace", color: 'var(--text-secondary)' }}>
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

          {isSelected && detail && (
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.();
                }}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '8px',
                  color: '#3b82f6',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                Modifier la clé
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Supprimer la clé "${keyData.name}" ?`)) {
                    onDelete?.();
                  }
                }}
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  color: '#ef4444',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                Supprimer cette clé
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
