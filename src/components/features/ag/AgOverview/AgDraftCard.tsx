'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Trash2 } from 'lucide-react';
import type { AgDraft } from '@/hooks/modules/useAgDrafts';
import { DeleteDraftModal } from './DeleteDraftModal';
import clsx from 'clsx';
import styles from './AgOverview.module.css';

interface AgDraftCardProps {
  draft: AgDraft;
  onDelete: (id: string) => Promise<boolean>;
}

const TYPE_LABELS: Record<string, string> = {
  ordinary: 'AG Ordinaire',
  extraordinary: 'AG Extraordinaire',
  mixed: 'AG Mixte',
};

// Labels pour les 8 étapes du wizard
const STEP_LABELS: Record<number, string> = {
  1: 'Étape 1/8 : Planification',
  2: 'Étape 2/8 : Ordre du jour',
  3: 'Étape 3/8 : Préparation convocations',
  4: 'Étape 4/8 : Envoi convocations',
  5: 'Étape 5/8 : Votes par correspondance',
  6: 'Étape 6/8 : Feuille de présence',
  7: 'Étape 7/8 : Tenue de l\'AG',
  8: 'Étape 8/8 : Procès-verbal',
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

// URLs pour reprendre à l'étape maximale atteinte
function getResumeUrl(draft: AgDraft): string {
  // Utiliser maxStepReached pour la navigation (reprend là où l'utilisateur s'est arrêté)
  const step = draft.maxStepReached || draft.currentStep || 1;
  switch (step) {
    case 1:
      return `/ag/${draft.id}/edit`;
    case 2:
      return `/ag/${draft.id}/agenda`;
    case 3:
      return `/ag/${draft.id}/convocation`;
    case 4:
      return `/ag/${draft.id}/envoi`;
    case 5:
      return `/ag/${draft.id}/votes-correspondance`;
    case 6:
      return `/ag/${draft.id}/feuille-presence`;
    case 7:
      return `/ag/${draft.id}/session`;
    case 8:
      return `/ag/${draft.id}/pv`;
    default:
      return `/ag/${draft.id}/edit`;
  }
}

export function AgDraftCard({ draft, onDelete }: AgDraftCardProps) {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleOpenDeleteModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (): Promise<boolean> => {
    return onDelete(draft.id);
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
    <div className={styles.draftRow}>
      <span className={clsx(styles.draftTypeBadge, styles[`draftType${draft.meeting_type}`])}>
        {TYPE_LABELS[draft.meeting_type] || 'AG'}
      </span>

      <div className={styles.draftRowInfo}>
        <span className={styles.draftRowTitle}>{draft.title}</span>
        <span className={styles.draftRowMeta}>
          {draft.meeting_date ? formatDate(draft.meeting_date) : 'Date non définie'}
        </span>
      </div>

      <span className={styles.draftRowStep}>
        {STEP_LABELS[draft.maxStepReached] || `Étape ${draft.maxStepReached}/8`}
      </span>

      <span className={styles.draftRowProgress}>{progressPercent}%</span>

      <div className={styles.draftRowActions}>
        <button
          onClick={handleOpenDeleteModal}
          className={styles.draftDeleteBtn}
          title="Supprimer le brouillon"
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
        <Link href={getResumeUrl(draft)} className={styles.draftContinueBtn}>
          Continuer
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>

      <DeleteDraftModal
        isOpen={isDeleteModalOpen}
        draftTitle={draft.title}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
