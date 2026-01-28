'use client';

import Link from 'next/link';
import { Clock, Calendar, MapPin, ArrowRight, Trash2 } from 'lucide-react';
import type { AgDraft } from '@/hooks/modules/useAgDrafts';
import clsx from 'clsx';
import styles from './AgOverview.module.css';

interface AgDraftCardProps {
  draft: AgDraft;
  onDelete: (id: string) => void;
}

const TYPE_LABELS: Record<string, string> = {
  ordinary: 'AG Ordinaire',
  extraordinary: 'AG Extraordinaire',
  mixed: 'AG Mixte',
};

const STEP_LABELS: Record<number, string> = {
  1: 'Étape 1 : Informations générales',
  2: 'Étape 2 : Résolutions',
  3: 'Étape 3 : Participants',
  4: 'Étape 4 : Votes par correspondance',
  5: 'Étape 5 : Convocation',
};

function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

function formatUpdatedAt(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return date.toLocaleDateString('fr-FR');
}

function getResumeUrl(draft: AgDraft): string {
  switch (draft.suggestedStep) {
    case 1:
      return `/ag/${draft.id}/edit`;
    case 2:
      return `/ag/${draft.id}/agenda`;
    case 3:
      return `/ag/${draft.id}/preparation`;
    case 4:
      return `/ag/${draft.id}/votes-correspondance`;
    case 5:
      return `/ag/${draft.id}/convocation`;
    default:
      return `/ag/${draft.id}/edit`;
  }
}

export function AgDraftCard({ draft, onDelete }: AgDraftCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Supprimer ce brouillon et toutes ses données ?')) {
      onDelete(draft.id);
    }
  };

  const progressItems = [
    { done: !!(draft.meeting_date && draft.location), label: 'Infos' },
    { done: draft.hasResolutions, label: 'Résolutions' },
    { done: draft.hasAttendance, label: 'Participants' },
    { done: draft.hasVotes, label: 'Votes' },
  ];
  const progressPercent = Math.round(
    (progressItems.filter((p) => p.done).length / progressItems.length) * 100
  );

  return (
    <div className={styles.draftCard}>
      <div className={styles.draftCardHeader}>
        <div className={styles.draftCardType}>
          <span className={clsx(styles.draftTypeBadge, styles[`draftType${draft.meeting_type}`])}>
            {TYPE_LABELS[draft.meeting_type] || 'AG'}
          </span>
        </div>
        <div className={styles.draftCardMeta}>
          <Clock size={12} aria-hidden="true" />
          Modifié {formatUpdatedAt(draft.updated_at)}
        </div>
      </div>

      <div className={styles.draftCardBody}>
        <h3 className={styles.draftTitle}>{draft.title}</h3>

        <div className={styles.draftInfoRow}>
          <Calendar size={16} className={styles.draftInfoIcon} aria-hidden="true" />
          <div className={styles.draftInfoContent}>
            {draft.meeting_date ? (
              <span className={styles.draftInfoValue}>{formatDate(draft.meeting_date)}</span>
            ) : (
              <span className={styles.draftInfoMissing}>Date non définie</span>
            )}
          </div>
        </div>

        <div className={styles.draftInfoRow}>
          <MapPin size={16} className={styles.draftInfoIcon} aria-hidden="true" />
          <div className={styles.draftInfoContent}>
            {draft.location ? (
              <span className={styles.draftInfoValue}>{draft.location}</span>
            ) : (
              <span className={styles.draftInfoMissing}>Lieu non défini</span>
            )}
          </div>
        </div>

        <div className={styles.draftCounters}>
          <span className={clsx(styles.draftCounter, draft.hasResolutions && styles.draftCounterDone)}>
            {draft.resolutionsCount} résolution{draft.resolutionsCount > 1 ? 's' : ''}
          </span>
          <span className={clsx(styles.draftCounter, draft.hasAttendance && styles.draftCounterDone)}>
            {draft.attendanceCount} participant{draft.attendanceCount > 1 ? 's' : ''}
          </span>
          {draft.hasVotes && (
            <span className={clsx(styles.draftCounter, styles.draftCounterDone)}>
              {draft.votesCount} vote{draft.votesCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className={styles.draftProgress}>
          <div className={styles.draftProgressBar}>
            <div className={styles.draftProgressFill} style={{ width: `${progressPercent}%` }} />
          </div>
          <span className={styles.draftProgressText}>{progressPercent}%</span>
        </div>

        <div className={styles.draftStep}>
          <ArrowRight size={14} aria-hidden="true" />
          {STEP_LABELS[draft.suggestedStep]}
        </div>
      </div>

      <div className={styles.draftCardFooter}>
        <button
          onClick={handleDelete}
          className={styles.draftDeleteBtn}
          title="Supprimer le brouillon"
        >
          <Trash2 size={16} aria-hidden="true" />
          Supprimer
        </button>
        <Link href={getResumeUrl(draft)} className={styles.draftContinueBtn}>
          Continuer
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
