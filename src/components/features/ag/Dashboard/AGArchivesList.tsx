'use client';

import Link from 'next/link';
import { FileText, Eye, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import clsx from 'clsx';
import styles from './AGArchivesList.module.css';
import { getTypeLabel } from '@/features/ag/dashboard-page';

interface ActionStats {
  activated: number;
  pending: number;
  failed: number;
}

export interface ClosedAG {
  id: string;
  title: string;
  meeting_type: 'ordinary' | 'extraordinary' | 'special';
  meeting_date: string;
  session_ended_at: string | null;
  resolutions_count: number;
  approved_count: number;
  actionStats: ActionStats;
}

interface AGArchivesListProps {
  closedAGs: ClosedAG[];
  isLoading: boolean;
}

export function AGArchivesList({ closedAGs, isLoading }: AGArchivesListProps) {
  if (isLoading) {
    return <div className={styles.empty}>Chargement des AG archivees...</div>;
  }

  if (closedAGs.length === 0) {
    return <div className={styles.empty}>Aucune AG cloturee pour cette copropriete.</div>;
  }

  return (
    <div className={styles.container}>
      {closedAGs.map((ag) => {
        const typeLabel = getTypeLabel(ag.meeting_type);
        const dateStr = new Date(ag.meeting_date).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
        const hasActions = ag.actionStats.activated + ag.actionStats.pending + ag.actionStats.failed > 0;

        return (
          <div key={ag.id} className={styles.item}>
            <div className={styles.icon}>
              <FileText size={20} aria-hidden="true" />
            </div>

            <div className={styles.content}>
              <div className={styles.titleRow}>
                <span className={styles.title}>
                  {ag.title || `AG ${typeLabel}`}
                </span>
              </div>
              <div className={styles.meta}>
                {dateStr}
                {' \u2022 '}
                {ag.approved_count}/{ag.resolutions_count} resolutions adoptees
              </div>
            </div>

            {hasActions && (
              <div className={styles.actionsStatus}>
                {ag.actionStats.activated > 0 && (
                  <span className={clsx(styles.statusBadge, styles.badgeActivated)}>
                    <CheckCircle size={12} />
                    {ag.actionStats.activated}
                  </span>
                )}
                {ag.actionStats.pending > 0 && (
                  <span className={clsx(styles.statusBadge, styles.badgePending)}>
                    <Clock size={12} />
                    {ag.actionStats.pending}
                  </span>
                )}
                {ag.actionStats.failed > 0 && (
                  <span className={clsx(styles.statusBadge, styles.badgeFailed)}>
                    <AlertCircle size={12} />
                    {ag.actionStats.failed}
                  </span>
                )}
              </div>
            )}

            <div className={styles.linkActions}>
              <Link href={`/ag/${ag.id}/pv`} className={styles.linkBtn} title="Voir le PV">
                <Eye size={16} />
                <span>PV</span>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
