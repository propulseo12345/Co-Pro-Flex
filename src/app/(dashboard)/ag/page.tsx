'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Users,
  FileText,
  Plus,
  Mail,
  Play,
  ClipboardList,
  Copy,
  Eye,
  BookOpen,
  ChevronRight,
  Edit3,
  Trash2,
  Clock,
  MapPin,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { AGQuickActions } from '@/components/features/ag/Dashboard';
import { AgDocumentQuickActions } from '@/components/features/ag';
import { DataState, LoadingState } from '@/components/ui/DataState/DataState';
import { useCopro } from '@/providers/CoproContext';
import { useAgMeetings } from '@/hooks/modules/useAgData';
import { useAgDrafts, type AgDraft } from '@/hooks/modules/useAgDrafts';
import type { AgOverview, AgStatus, AgMeetingType } from '@/lib/ag/types';
import styles from './ag.module.css';
import clsx from 'clsx';

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
      return { label: 'Brouillon', className: styles.planifiee };
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
            <span className={clsx(styles.badge, styles.ready)}>Prêt à démarrer</span>
          </div>

          <h2 className={styles.nextAgTitle}>{ag.title || `AG ${typeLabel}`}</h2>

          <div className={styles.nextAgInfo}>
            <div className={styles.infoItem}>
              <Calendar size={20} aria-hidden="true" />
              <span>
                {new Date(ag.meeting_date).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
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
            <Link
              href={`/ag/${ag.id}/session`}
              className={clsx(styles.actionButton, styles.actionButtonPrimary)}
            >
              <Play size={18} style={{ marginRight: 8 }} aria-hidden="true" />
              Commencer l'AG
            </Link>
          </div>
        </div>
      )}

      {/* Module Préparation AG */}
      <div className={clsx(styles.nextAgCard, isConvoked && styles.preparationCardCompact)}>
        <div className={styles.nextAgHeader}>
          <span className={styles.nextAgLabel}>
            {isConvoked ? 'Préparation AG' : 'Prochaine Assemblée'}
          </span>
          <span className={clsx(styles.badge, statusBadge.className)}>{statusBadge.label}</span>
        </div>

        {!isConvoked && (
          <>
            <h2 className={styles.nextAgTitle}>{ag.title || `AG ${typeLabel}`}</h2>

            <div className={styles.nextAgInfo}>
              <div className={styles.infoItem}>
                <Calendar size={20} aria-hidden="true" />
                <span>
                  {new Date(ag.meeting_date).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
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
            {isConvoked ? 'Ordre du jour' : "Préparer l'ordre du jour"}
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

// Component for displaying a draft AG card
function DraftAgCard({
  draft,
  onDelete,
}: {
  draft: AgDraft;
  onDelete: (id: string) => void;
}) {
  const typeLabels: Record<string, string> = {
    ordinary: 'AG Ordinaire',
    extraordinary: 'AG Extraordinaire',
    mixed: 'AG Mixte',
  };

  const stepLabels: Record<number, string> = {
    1: 'Étape 1 : Informations générales',
    2: 'Étape 2 : Résolutions',
    3: 'Étape 3 : Participants',
    4: 'Étape 4 : Votes par correspondance',
    5: 'Étape 5 : Convocation',
  };

  const formatDate = (dateStr: string | null) => {
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
  };

  const formatUpdatedAt = (dateStr: string) => {
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
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Supprimer ce brouillon et toutes ses données ?')) {
      onDelete(draft.id);
    }
  };

  // Calcul de la progression
  const progressItems = [
    { done: !!(draft.meeting_date && draft.location), label: 'Infos' },
    { done: draft.hasResolutions, label: 'Résolutions' },
    { done: draft.hasAttendance, label: 'Participants' },
    { done: draft.hasVotes, label: 'Votes' },
  ];
  const progressPercent = Math.round(
    (progressItems.filter(p => p.done).length / progressItems.length) * 100
  );

  // Déterminer l'URL de reprise selon l'étape
  const getResumeUrl = () => {
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
  };

  return (
    <div className={styles.draftCard}>
      <div className={styles.draftCardHeader}>
        <div className={styles.draftCardType}>
          <span className={clsx(styles.draftTypeBadge, styles[`draftType${draft.meeting_type}`])}>
            {typeLabels[draft.meeting_type] || 'AG'}
          </span>
        </div>
        <div className={styles.draftCardMeta}>
          <Clock size={12} aria-hidden="true" />
          Modifié {formatUpdatedAt(draft.updated_at)}
        </div>
      </div>

      <div className={styles.draftCardBody}>
        <h3 className={styles.draftTitle}>{draft.title}</h3>

        {/* Date et lieu */}
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

        {/* Compteurs */}
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

        {/* Barre de progression */}
        <div className={styles.draftProgress}>
          <div className={styles.draftProgressBar}>
            <div
              className={styles.draftProgressFill}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className={styles.draftProgressText}>
            {progressPercent}%
          </span>
        </div>

        {/* Étape courante */}
        <div className={styles.draftStep}>
          <ArrowRight size={14} aria-hidden="true" />
          {stepLabels[draft.suggestedStep]}
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
        <Link href={getResumeUrl()} className={styles.draftContinueBtn}>
          Continuer
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

// Component for displaying past AG history
function AgHistoryItem({ ag }: { ag: AgOverview }) {
  const typeLabel = getTypeLabel(ag.meeting_type);
  const participantsCount =
    (ag.present_count || 0) + (ag.proxy_count || 0) + (ag.correspondence_count || 0);
  const hasPV = ag.status === 'pv_generated' || ag.status === 'closed';

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

export default function AGPage() {
  const { currentCoproId, isManager } = useCopro();
  const { meetings, nextMeeting, pastMeetings, isLoading, error, refresh, stats } = useAgMeetings();
  const {
    drafts,
    isLoading: isDraftsLoading,
    error: draftsError,
    deleteDraft,
    refresh: refreshDrafts,
  } = useAgDrafts();

  // Determine if the next meeting is convoked
  const isConvoked = useMemo(() => {
    if (!nextMeeting) return false;
    return nextMeeting.status === 'convoked' || nextMeeting.status === 'in_progress';
  }, [nextMeeting]);

  // Filtrer nextMeeting si c'est un draft (on le montre dans la section drafts)
  const displayNextMeeting = useMemo(() => {
    if (!nextMeeting) return null;
    if (nextMeeting.status === 'draft') return null; // Les drafts sont dans leur section
    return nextMeeting;
  }, [nextMeeting]);

  // Mode Single Copro: si pas encore chargé, afficher loading
  if (!currentCoproId) {
    return <LoadingState message="Chargement de la copropriété..." />;
  }

  const handleDeleteDraft = async (draftId: string) => {
    await deleteDraft(draftId);
  };

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
            {/* Section Brouillons AG */}
            <div className={styles.draftsSection}>
              <div className={styles.draftsSectionHeader}>
                <div className={styles.draftsSectionTitle}>
                  <Edit3 size={24} aria-hidden="true" />
                  <div>
                    <h3>Brouillons AG en cours</h3>
                    <p>
                      {drafts.length > 0
                        ? `${drafts.length} AG non finalisée${drafts.length > 1 ? 's' : ''}`
                        : 'Vos AG en cours de création apparaîtront ici'}
                    </p>
                  </div>
                </div>
              </div>

              {isDraftsLoading ? (
                <div className={styles.draftsLoading}>
                  <span>Chargement des brouillons...</span>
                </div>
              ) : draftsError ? (
                <div className={styles.draftsError}>
                  <AlertCircle size={20} />
                  <span>{draftsError}</span>
                  <button onClick={refreshDrafts} className={styles.draftsRetryBtn}>
                    Réessayer
                  </button>
                </div>
              ) : drafts.length > 0 ? (
                <div className={styles.draftsGrid}>
                  {drafts.map((draft) => (
                    <DraftAgCard key={draft.id} draft={draft} onDelete={handleDeleteDraft} />
                  ))}
                </div>
              ) : (
                <div className={styles.draftsEmpty}>
                  <Edit3 size={32} aria-hidden="true" />
                  <p>Aucun brouillon pour le moment</p>
                  <span>
                    Lorsque vous commencez à planifier une AG, elle sera automatiquement
                    sauvegardée ici jusqu'à sa finalisation.
                  </span>
                  <Link href="/ag/new" className={styles.draftsEmptyBtn}>
                    <Plus size={16} aria-hidden="true" />
                    Planifier une nouvelle AG
                  </Link>
                </div>
              )}
            </div>

            {/* Prochaine AG (non-draft) */}
            {displayNextMeeting ? (
              <NextAgCard ag={displayNextMeeting} isConvoked={isConvoked} />
            ) : (
              !drafts.length && (
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
              )
            )}

            {/* Historique */}
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

            {/* Lien vers la bibliothèque de résolutions */}
            <Link href="/ag/resolutions" className="card" style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: 'var(--primary-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                  }}
                >
                  <BookOpen size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>
                    Bibliothèque de résolutions
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Modèles de résolutions pré-définis et personnalisés
                  </p>
                </div>
                <ChevronRight size={20} style={{ color: 'var(--text-tertiary)' }} />
              </div>
            </Link>
          </div>

          <div className={styles.sideColumn}>
            <div className="card">
              <AGQuickActions />
            </div>

            {/* Stats Card */}
            {stats && stats.total > 0 && (
              <div className="card" style={{ marginTop: '1rem' }}>
                <h3 className={styles.sectionTitle}>Statistiques</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.875rem',
                    }}
                  >
                    <span style={{ color: 'var(--text-secondary)' }}>Total AG</span>
                    <span style={{ fontWeight: 600 }}>{stats.total}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.875rem',
                    }}
                  >
                    <span style={{ color: 'var(--text-secondary)' }}>Brouillons</span>
                    <span style={{ fontWeight: 600, color: 'var(--warning)' }}>{stats.draft}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.875rem',
                    }}
                  >
                    <span style={{ color: 'var(--text-secondary)' }}>Convoquées</span>
                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                      {stats.convoked}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.875rem',
                    }}
                  >
                    <span style={{ color: 'var(--text-secondary)' }}>Clôturées</span>
                    <span style={{ fontWeight: 600, color: 'var(--success)' }}>
                      {stats.closed + stats.pvGenerated}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DataState>
    </div>
  );
}
