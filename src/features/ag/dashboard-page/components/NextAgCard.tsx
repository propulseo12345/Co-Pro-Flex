'use client';

import Link from 'next/link';
import { Calendar, Users, Play, ClipboardList, FileText, ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import type { AgOverview } from '@/lib/ag/types';
import { getTypeLabel, getStatusBadge, getStepPath } from '../hooks/useAgDashboardPage';
import styles from '@/app/(dashboard)/ag/dashboard/dashboard.module.css';

interface NextAgCardProps {
  ag: AgOverview;
  isConvoked: boolean;
}

function getCardConfig(status: string, isConvoked: boolean) {
  if (status === 'session_active') {
    return { label: 'Session en cours', cardClass: styles.sessionCard, showResume: true };
  }
  if (status === 'in_progress') {
    return { label: 'AG en cours', cardClass: styles.deroulementCard, showResume: true };
  }
  if (isConvoked) {
    return { label: 'AG convoquée', cardClass: styles.nextAgCard, showResume: false };
  }
  return { label: 'Prochaine Assemblée', cardClass: styles.nextAgCard, showResume: false };
}

export function NextAgCard({ ag, isConvoked }: NextAgCardProps) {
  const typeLabel = getTypeLabel(ag.meeting_type);
  const statusBadge = getStatusBadge(ag.status);
  const config = getCardConfig(ag.status, isConvoked);
  const lastStep = ag.max_step_reached || ag.current_step || 1;
  const stepPath = getStepPath(lastStep);

  return (
    <div className={clsx(styles.nextAgCardCompact, config.cardClass)}>
      <div className={styles.nextAgHeader}>
        <span className={styles.nextAgLabel}>{config.label}</span>
        <span className={clsx(styles.badge, styles[statusBadge.className])}>{statusBadge.label}</span>
      </div>

      <h2 className={styles.nextAgTitleCompact}>{ag.title || `AG ${typeLabel}`}</h2>

      <div className={styles.nextAgInfoCompact}>
        <div className={styles.infoItem}>
          <Calendar size={16} aria-hidden="true" />
          <span>
            {new Date(ag.meeting_date).toLocaleDateString('fr-FR', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            })}
          </span>
        </div>
        <div className={styles.infoItem}>
          <Users size={16} aria-hidden="true" />
          <span>{ag.location || 'Lieu à définir'}</span>
        </div>
        <span className={styles.nextAgStatsInline}>
          {ag.resolutions_count || 0} résolution(s)
          {ag.attendees_count !== null && ag.attendees_count > 0 && ` • ${ag.attendees_count} présence(s)`}
        </span>
      </div>

      <div className={styles.nextAgActions}>
        {config.showResume ? (
          <>
            <Link href={`/ag/${ag.id}/${stepPath}`} className={clsx(styles.actionButton, styles.actionButtonPrimary)}>
              <Play size={16} style={{ marginRight: 6 }} aria-hidden="true" />
              Reprendre (étape {lastStep})
            </Link>
            <Link href={`/ag/${ag.id}/pv`} className={styles.actionButton}>
              <FileText size={16} style={{ marginRight: 6 }} aria-hidden="true" />
              Procès-verbal
            </Link>
          </>
        ) : isConvoked ? (
          <>
            <Link href={`/ag/${ag.id}/session`} className={clsx(styles.actionButton, styles.actionButtonPrimary)}>
              <Play size={16} style={{ marginRight: 6 }} aria-hidden="true" />
              Démarrer la session
            </Link>
            <Link href={`/ag/${ag.id}/agenda`} className={styles.actionButton}>
              <ClipboardList size={16} style={{ marginRight: 6 }} aria-hidden="true" />
              Ordre du jour
            </Link>
          </>
        ) : (
          <>
            <Link href={`/ag/${ag.id}/agenda`} className={styles.actionButton}>
              <ClipboardList size={16} style={{ marginRight: 6 }} aria-hidden="true" />
              Préparer l&apos;ordre du jour
            </Link>
            <Link href={`/ag/${ag.id}/convocation`} className={styles.actionButton}>
              <FileText size={16} style={{ marginRight: 6 }} aria-hidden="true" />
              Gérer les convocations
            </Link>
          </>
        )}
        <Link href={`/ag/${ag.id}/${stepPath}`} className={styles.actionButtonGhost}>
          Détails <ArrowRight size={14} style={{ marginLeft: 4 }} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
