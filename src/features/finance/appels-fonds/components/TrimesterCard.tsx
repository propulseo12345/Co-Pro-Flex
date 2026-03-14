'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { FileText, BarChart3 } from 'lucide-react';
import type { TrimesterCard as TrimesterCardType } from '../types';
import { formatEuros } from '../utils';
import { StatusBadge } from './StatusBadge';
import styles from '../styles/Cards.module.css';

interface TrimesterCardProps {
  card: TrimesterCardType;
  onEmit?: (callId: string) => void;
}

function recoveryBadgeVariant(rate: number): 'green' | 'amber' | 'neutral' {
  if (rate >= 75) return 'green';
  if (rate >= 25) return 'amber';
  return 'neutral';
}

export function TrimesterCard({ card, onEmit }: TrimesterCardProps) {
  const router = useRouter();
  const firstCallId = card.calls[0]?.id;
  const issuedAt = card.calls.find(c => c.issued_at)?.issued_at;

  const handleDetail = () => {
    if (firstCallId) router.push(`/finance/appels-fonds/${firstCallId}`);
  };

  const unpaidCount = card.calls.reduce((sum, c) => sum + c.lines_unpaid_count, 0);
  const progressColor = card.recoveryRate >= 75 ? 'green' : 'amber';

  return (
    <div
      className={clsx(
        styles.trimCard,
        card.status === 'active' && styles.trimCardActive,
        card.status === 'draft' && styles.trimCardDraft,
      )}
      onClick={handleDetail}
    >
      <div className={styles.trimHeader}>
        <span className={styles.trimTitle}>{card.label}</span>
        <StatusBadge
          label={card.status === 'draft' ? 'Brouillon' : `${card.recoveryRate} %`}
          variant={card.status === 'draft' ? 'neutral' : recoveryBadgeVariant(card.recoveryRate)}
        />
      </div>

      <div className={styles.trimMeta}>
        {card.keys.length} clé{card.keys.length > 1 ? 's' : ''} · {formatEuros(card.totalAmount)}
        {issuedAt && ` · Émis le ${new Date(issuedAt).toLocaleDateString('fr-FR')}`}
        {card.status === 'active' && !issuedAt && (
          <strong className={styles.trimMetaActive}> · En cours</strong>
        )}
      </div>

      <div className={styles.trimProgress}>
        <div
          className={clsx(styles.trimProgressFill, progressColor === 'green' ? styles.trimProgressGreen : styles.trimProgressAmber)}
          style={{ '--progress-width': `${card.recoveryRate}%` } as React.CSSProperties}
        />
      </div>

      <div className={styles.trimKeys}>
        {card.keys.map(k => (
          <span key={k.name} className={styles.trimKeyTag}>
            {k.name} — {formatEuros(k.amount)}
          </span>
        ))}
      </div>

      <div className={styles.trimActions}>
        {card.status === 'draft' ? (
          <button
            className={styles.actionBtnPrimary}
            onClick={e => { e.stopPropagation(); if (firstCallId && onEmit) onEmit(firstCallId); }}
          >
            Émettre
          </button>
        ) : (
          <>
            <button className={styles.actionBtn} onClick={e => e.stopPropagation()}>
              <FileText size={14} /> Avis
            </button>
            <button className={styles.actionBtnPrimary} onClick={e => { e.stopPropagation(); handleDetail(); }}>
              <BarChart3 size={14} /> Détail
            </button>
            {unpaidCount > 0 && (
              <button className={styles.actionBtn} onClick={e => e.stopPropagation()}>
                Relancer ({unpaidCount})
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
