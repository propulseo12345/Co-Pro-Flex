'use client';

import Link from 'next/link';
import { Calendar, Users, Mail, Play, ClipboardList, FileText } from 'lucide-react';
import clsx from 'clsx';
import type { AgOverview } from '@/lib/ag/types';
import { getTypeLabel, getStatusBadge } from '../hooks/useAgDashboardPage';
import styles from '@/app/(dashboard)/ag/dashboard/dashboard.module.css';

interface NextAgCardProps {
  ag: AgOverview;
  isConvoked: boolean;
}

export function NextAgCard({ ag, isConvoked }: NextAgCardProps) {
  const typeLabel = getTypeLabel(ag.meeting_type);
  const statusBadge = getStatusBadge(ag.status);

  return (
    <>
      {isConvoked && (
        <div className={clsx(styles.nextAgCard, styles.deroulementCard)}>
          <div className={styles.nextAgHeader}>
            <span className={styles.nextAgLabel}>Déroulement + PV</span>
            <span className={clsx(styles.badge, styles.ready)}>Prêt à démarrer</span>
          </div>

          <h2 className={styles.nextAgTitle}>{ag.title || `AG ${typeLabel}`}</h2>

          <div className={styles.nextAgInfo}>
            <div className={styles.infoItem}>
              <Calendar size={20} aria-hidden="true" />
              <span>
                {new Date(ag.meeting_date).toLocaleDateString('fr-FR', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                })}
              </span>
            </div>
            <div className={styles.infoItem}>
              <Users size={20} aria-hidden="true" />
              <span>{ag.location || 'Lieu à définir'}</span>
            </div>
            {ag.quorum_ratio !== null && (
              <div className={styles.infoItem}>
                <span className={styles.quorumBadge}>Quorum: {ag.quorum_ratio?.toFixed(1)}%</span>
              </div>
            )}
          </div>

          <div className={styles.nextAgActions}>
            <Link href={`/ag/${ag.id}/preparation`} className={styles.actionButton}>
              <Mail size={18} style={{ marginRight: 8 }} aria-hidden="true" />
              Votes par correspondance
            </Link>
            <Link href={`/ag/${ag.id}/session`} className={clsx(styles.actionButton, styles.actionButtonPrimary)}>
              <Play size={18} style={{ marginRight: 8 }} aria-hidden="true" />
              Commencer l'AG
            </Link>
          </div>
        </div>
      )}

      <div className={clsx(styles.nextAgCard, isConvoked && styles.preparationCardCompact)}>
        <div className={styles.nextAgHeader}>
          <span className={styles.nextAgLabel}>
            {isConvoked ? 'Préparation AG' : 'Prochaine Assemblée'}
          </span>
          <span className={clsx(styles.badge, styles[statusBadge.className])}>{statusBadge.label}</span>
        </div>

        {!isConvoked && (
          <>
            <h2 className={styles.nextAgTitle}>{ag.title || `AG ${typeLabel}`}</h2>
            <div className={styles.nextAgInfo}>
              <div className={styles.infoItem}>
                <Calendar size={20} aria-hidden="true" />
                <span>
                  {new Date(ag.meeting_date).toLocaleDateString('fr-FR', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                  })}
                </span>
              </div>
              <div className={styles.infoItem}>
                <Users size={20} aria-hidden="true" />
                <span>{ag.location || 'Lieu à définir'}</span>
              </div>
            </div>
          </>
        )}

        <div className={styles.nextAgStats}>
          <span>{ag.resolutions_count || 0} résolution(s)</span>
          {ag.attendees_count !== null && ag.attendees_count > 0 && (
            <span> • {ag.attendees_count} présence(s) enregistrée(s)</span>
          )}
        </div>

        <div className={styles.nextAgActions}>
          <Link href={`/ag/${ag.id}/agenda`} className={styles.actionButton}>
            <ClipboardList size={18} style={{ marginRight: 8 }} aria-hidden="true" />
            {isConvoked ? 'Ordre du jour' : 'Préparer l\'ordre du jour'}
          </Link>
          <Link href={`/ag/${ag.id}/convocation`} className={styles.actionButton}>
            <FileText size={18} style={{ marginRight: 8 }} aria-hidden="true" />
            {isConvoked ? 'Convocations' : 'Gérer les convocations'}
          </Link>
        </div>
      </div>
    </>
  );
}
