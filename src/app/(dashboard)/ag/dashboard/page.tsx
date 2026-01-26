'use client';

import { useMemo } from 'react';
import { Calendar, Users, FileText, Plus, Mail, Play, ClipboardList, Copy, Eye, Download } from 'lucide-react';
import { AGQuickActions } from '@/components/features/ag/Dashboard';
import { AgDocumentQuickActions } from '@/components/features/ag';
import { DataState, NoCoproSelected } from '@/components/ui/DataState/DataState';
import { useCopro } from '@/providers/CoproContext';
import { useAgMeetings } from '@/hooks/modules/useAgData';
import type { AgOverview, AgStatus, AgMeetingType } from '@/lib/ag/types';
import styles from './dashboard.module.css';
import clsx from 'clsx';
import Link from 'next/link';

// Helper to map backend meeting_type to display label
function getTypeLabel(type: AgMeetingType): string {
  switch (type) {
    case 'ordinary':
      return 'Ordinaire';
    case 'extraordinary':
      return 'Extraordinaire';
    case 'mixed':
      return 'Mixte';
    default:
      return type;
  }
}

// Helper to map backend status to display badge
function getStatusBadge(status: AgStatus): { label: string; className: string } {
  switch (status) {
    case 'draft':
      return { label: 'En préparation', className: styles.planifiee };
    case 'convoked':
      return { label: 'Convoquée', className: styles.convoquee };
    case 'in_progress':
      return { label: 'En cours', className: styles.ready };
    case 'closed':
      return { label: 'Clôturée', className: styles.closed };
    case 'pv_generated':
      return { label: 'PV généré', className: styles.closed };
    default:
      return { label: status, className: '' };
  }
}

// Component for displaying the next AG card
function NextAgCard({ ag, isConvoked }: { ag: AgOverview; isConvoked: boolean }) {
  const typeLabel = getTypeLabel(ag.meeting_type);
  const statusBadge = getStatusBadge(ag.status);

  return (
    <>
      {/* Module Déroulement + PV - affiché si convocations envoyées */}
      {isConvoked && (
        <div className={clsx(styles.nextAgCard, styles.deroulementCard)}>
          <div className={styles.nextAgHeader}>
            <span className={styles.nextAgLabel}>Déroulement + PV</span>
            <span className={clsx(styles.badge, styles.ready)}>
              Prêt à démarrer
            </span>
          </div>

          <h2 className={styles.nextAgTitle}>
            {ag.title || `AG ${typeLabel}`}
          </h2>

          <div className={styles.nextAgInfo}>
            <div className={styles.infoItem}>
              <Calendar size={20} aria-hidden="true" />
              <span>
                {new Date(ag.meeting_date).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            <div className={styles.infoItem}>
              <Users size={20} aria-hidden="true" />
              <span>{ag.location || 'Lieu à définir'}</span>
            </div>
            {ag.quorum_ratio !== null && (
              <div className={styles.infoItem}>
                <span className={styles.quorumBadge}>
                  Quorum: {ag.quorum_ratio?.toFixed(1)}%
                </span>
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

      {/* Module Préparation AG */}
      <div className={clsx(
        styles.nextAgCard,
        isConvoked && styles.preparationCardCompact,
      )}>
        <div className={styles.nextAgHeader}>
          <span className={styles.nextAgLabel}>
            {isConvoked ? 'Préparation AG' : 'Prochaine Assemblée'}
          </span>
          <span className={clsx(styles.badge, statusBadge.className)}>
            {statusBadge.label}
          </span>
        </div>

        {!isConvoked && (
          <>
            <h2 className={styles.nextAgTitle}>
              {ag.title || `AG ${typeLabel}`}
            </h2>

            <div className={styles.nextAgInfo}>
              <div className={styles.infoItem}>
                <Calendar size={20} aria-hidden="true" />
                <span>
                  {new Date(ag.meeting_date).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
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

// Component for displaying past AG history
function AgHistoryItem({ ag }: { ag: AgOverview }) {
  const typeLabel = getTypeLabel(ag.meeting_type);
  const participantsCount = (ag.present_count || 0) + (ag.proxy_count || 0) + (ag.correspondence_count || 0);
  const hasPV = ag.status === 'pv_generated' || ag.status === 'closed';

  return (
    <div className={styles.historyItem}>
      <div className={styles.historyIcon}>
        <FileText size={20} aria-hidden="true" />
      </div>
      <div className={styles.historyContent}>
        <div className={styles.historyTitle}>
          {ag.title || `AG ${typeLabel}`} du {new Date(ag.meeting_date).toLocaleDateString('fr-FR')}
        </div>
        <div className={styles.historyMeta}>
          {ag.location || 'Lieu non défini'}
          {participantsCount > 0 && ` • ${participantsCount} participants`}
          {ag.approved_count > 0 && ` • ${ag.approved_count}/${ag.resolutions_count} adoptées`}
        </div>
      </div>
      <div className={styles.historyActions}>
        {/* Quick document actions for closed AGs */}
        {hasPV && (
          <AgDocumentQuickActions agId={ag.id} agStatus={ag.status} compact />
        )}
        <Link href={`/ag/${ag.id}/pv`} className={styles.historyLink} title="Voir le procès-verbal">
          <Eye size={16} aria-hidden="true" />
          <span className={styles.historyLinkText}>PV</span>
        </Link>
        <Link href={`/ag/new?duplicate=${ag.id}`} className={styles.historyLink} title="Dupliquer pour nouvelle AG">
          <Copy size={16} aria-hidden="true" />
          <span className={styles.historyLinkText}>Dupliquer</span>
        </Link>
      </div>
    </div>
  );
}

export default function AGDashboardPage() {
  const { currentCoproId, isManager } = useCopro();
  const { meetings, nextMeeting, pastMeetings, isLoading, error, refresh } = useAgMeetings();

  // Determine if the next meeting is convoked
  const isConvoked = useMemo(() => {
    if (!nextMeeting) return false;
    return nextMeeting.status === 'convoked' || nextMeeting.status === 'in_progress';
  }, [nextMeeting]);

  // No copro selected
  if (!currentCoproId) {
    return <NoCoproSelected />;
  }

  return (
    <div className="container">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Assemblées Générales</h1>
          <p className={styles.subtitle}>
            Gérez vos réunions de copropriété, de la convocation au procès-verbal.
          </p>
        </div>
        {isManager && (
          <div className={styles.actions}>
            <Link href="/ag/new" className="btn btn-primary">
              <Plus size={16} style={{ marginRight: 8 }} aria-hidden="true" /> Planifier une AG
            </Link>
          </div>
        )}
      </div>

      <DataState
        isLoading={isLoading}
        error={error}
        isEmpty={false}
        loadingMessage="Chargement des assemblées générales..."
        onRetry={refresh}
      >
        <div className={styles.grid}>
          <div className={styles.mainColumn}>
            {nextMeeting ? (
              <NextAgCard ag={nextMeeting} isConvoked={isConvoked} />
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>
                  <Calendar size={48} aria-hidden="true" />
                </div>
                <h3 className={styles.emptyStateTitle}>Aucune AG planifiée</h3>
                <p className={styles.emptyStateText}>
                  Planifiez votre prochaine Assemblée Générale pour la copropriété.
                </p>
                {isManager && (
                  <Link href="/ag/new" className="btn btn-primary">
                    <Plus size={16} style={{ marginRight: 8 }} aria-hidden="true" />
                    Planifier une AG
                  </Link>
                )}
              </div>
            )}

            <div className="card">
              <h3 className={styles.sectionTitle}>Historique ({pastMeetings.length} AG)</h3>
              <div className={styles.historyList}>
                {pastMeetings.length === 0 ? (
                  <p className={styles.emptyHistory}>Aucune AG terminée.</p>
                ) : (
                  pastMeetings.map((ag) => (
                    <AgHistoryItem key={ag.id} ag={ag} />
                  ))
                )}
              </div>
            </div>
          </div>

          <div className={styles.sideColumn}>
            <div className="card">
              <AGQuickActions />
            </div>
          </div>
        </div>
      </DataState>
    </div>
  );
}
