'use client';

import Link from 'next/link';
import { FileText, Eye, Copy } from 'lucide-react';
import type { AgOverview } from '@/lib/ag/types';
import { AgDocumentQuickActions } from '@/components/features/ag';
import { getTypeLabel } from './helpers';
import styles from './AgOverview.module.css';

interface AgHistoryItemProps {
  ag: AgOverview;
}

function AgHistoryItem({ ag }: AgHistoryItemProps) {
  const typeLabel = getTypeLabel(ag.meeting_type);
  const participantsCount =
    (ag.present_count || 0) + (ag.proxy_count || 0) + (ag.correspondence_count || 0);
  const hasPV = ['pv_generated', 'pv_signed', 'pv_sent', 'finalized', 'closed'].includes(ag.status);

  return (
    <div className={styles.historyItem}>
      <div className={styles.historyIcon}>
        <FileText size={20} aria-hidden="true" />
      </div>
      <div className={styles.historyContent}>
        <div className={styles.historyTitle}>
          {ag.title || `AG ${typeLabel}`} du{' '}
          {new Date(ag.meeting_date).toLocaleDateString('fr-FR')}
        </div>
        <div className={styles.historyMeta}>
          {ag.location || 'Lieu non défini'}
          {participantsCount > 0 && ` • ${participantsCount} participants`}
          {ag.approved_count > 0 && ` • ${ag.approved_count}/${ag.resolutions_count} adoptées`}
        </div>
      </div>
      <div className={styles.historyActions}>
        {hasPV && <AgDocumentQuickActions agId={ag.id} agStatus={ag.status} compact />}
        <Link
          href={`/ag/${ag.id}/pv`}
          className={styles.historyLink}
          title="Voir le procès-verbal"
        >
          <Eye size={16} aria-hidden="true" />
          <span className={styles.historyLinkText}>PV</span>
        </Link>
        <Link
          href={`/ag/new?duplicate=${ag.id}`}
          className={styles.historyLink}
          title="Dupliquer pour nouvelle AG"
        >
          <Copy size={16} aria-hidden="true" />
          <span className={styles.historyLinkText}>Dupliquer</span>
        </Link>
      </div>
    </div>
  );
}

interface AgHistorySectionProps {
  pastMeetings: AgOverview[];
}

export function AgHistorySection({ pastMeetings }: AgHistorySectionProps) {
  return (
    <div className="card">
      <h3 className={styles.sectionTitle}>Historique ({pastMeetings.length} AG)</h3>
      <div className={styles.historyList}>
        {pastMeetings.length === 0 ? (
          <p className={styles.emptyHistory}>Aucune AG terminée.</p>
        ) : (
          pastMeetings.map((ag) => <AgHistoryItem key={ag.id} ag={ag} />)
        )}
      </div>
    </div>
  );
}
