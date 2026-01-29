'use client';

import { useMemo, useState, useEffect } from 'react';
import { Calendar, Users, FileText, Plus, Mail, Play, ClipboardList, Copy, Eye, Edit3, Trash2 } from 'lucide-react';
import { AGQuickActions, AgListItem, ConfirmModal } from '@/components/features/ag/Dashboard';
import type { AgListItemAction } from '@/components/features/ag/Dashboard';
import { AgDocumentQuickActions } from '@/components/features/ag';
import { DataState, LoadingState } from '@/components/ui/DataState/DataState';
import { useCopro } from '@/providers/CoproContext';
import { useAgMeetings } from '@/hooks/modules/useAgData';
import { useAgDrafts } from '@/hooks/modules/useAgDrafts';
import { createClient } from '@/lib/supabase/client';
import type { AgOverview, AgStatus, AgMeetingType } from '@/lib/ag/types';
import styles from './dashboard.module.css';
import clsx from 'clsx';
import Link from 'next/link';

// Type for localStorage draft AG
interface LocalStorageDraft {
  id: string;
  type: string;
  date: string;
  heure?: string;
  lieu?: string;
  adresse?: string;
}

// Helper to map backend meeting_type to display label
function getTypeLabel(type: AgMeetingType): string {
  switch (type) {
    case 'ordinary': return 'Ordinaire';
    case 'extraordinary': return 'Extraordinaire';
    case 'special': return 'Mixte';
    default: return type;
  }
}

// Helper to map backend status to display badge
function getStatusBadge(status: AgStatus): { label: string; className: string } {
  switch (status) {
    case 'draft': return { label: 'En préparation', className: styles.planifiee };
    case 'convoked': return { label: 'Convoquée', className: styles.convoquee };
    case 'in_progress': return { label: 'En cours', className: styles.ready };
    case 'closed': return { label: 'Clôturée', className: styles.closed };
    case 'pv_generated': return { label: 'PV généré', className: styles.closed };
    default: return { label: status, className: '' };
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

export default function AGDashboardPage() {
  const { currentCoproId, isManager } = useCopro();
  const { meetings, nextMeeting, pastMeetings, isLoading, error, refresh } = useAgMeetings();
  const { deleteDraft } = useAgDrafts();

  // State for localStorage drafts
  const [localStorageDrafts, setLocalStorageDrafts] = useState<LocalStorageDraft[]>([]);

  // State for delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // State pour les IDs supprimés (évite le refresh qui scroll en haut)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  // State pour le renommage
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamedTitles, setRenamedTitles] = useState<Map<string, string>>(new Map());

  // Load localStorage drafts on mount
  useEffect(() => {
    const loadLocalStorageDrafts = () => {
      if (typeof window === 'undefined') return;

      const agKeys = Object.keys(localStorage).filter(key => key.startsWith('ag-draft-'));
      const drafts: LocalStorageDraft[] = [];

      for (const key of agKeys) {
        const agId = key.replace('ag-draft-', '');
        const isCompleted = localStorage.getItem(`ag-completed-${agId}`);

        if (!isCompleted) {
          try {
            const draftData = JSON.parse(localStorage.getItem(key) || '{}');
            drafts.push({
              id: agId,
              type: draftData.type || 'ORDINAIRE',
              date: draftData.date || '',
              heure: draftData.heure,
              lieu: draftData.lieu,
              adresse: draftData.adresse,
            });
          } catch { /* ignore invalid JSON */ }
        }
      }

      drafts.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      setLocalStorageDrafts(drafts);
    };

    loadLocalStorageDrafts();
  }, []);

  // Delete a localStorage draft
  const handleDeleteLocalDraft = (draftId: string) => {
    if (confirm('Supprimer ce brouillon ?')) {
      localStorage.removeItem(`ag-draft-${draftId}`);
      localStorage.removeItem(`ag-resolutions-${draftId}`);
      localStorage.removeItem(`ag-resolutions-created-${draftId}`);
      setLocalStorageDrafts(prev => prev.filter(d => d.id !== draftId));
    }
  };

  // Open delete confirmation for Supabase draft
  const handleOpenDeleteConfirm = (id: string, title: string) => {
    setDeleteConfirm({ id, title });
  };

  // Cancel delete
  const handleCancelDelete = () => {
    setDeleteConfirm(null);
  };

  // Rename a Supabase draft
  const handleRename = async (id: string, newTitle: string) => {
    setRenamingId(id);
    try {
      const supabase = createClient();
      const { error } = await (supabase as any)
        .from('ag_meetings')
        .update({ title: newTitle })
        .eq('id', id);

      if (!error) {
        setRenamedTitles(prev => new Map(prev).set(id, newTitle));
      }
    } finally {
      setRenamingId(null);
    }
  };

  // Confirm delete Supabase draft
  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;

    setIsDeleting(true);
    setDeletingId(deleteConfirm.id);

    try {
      const success = await deleteDraft(deleteConfirm.id);
      if (success) {
        setDeletedIds(prev => new Set(prev).add(deleteConfirm.id));
      }
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
      setDeleteConfirm(null);
    }
  };

  // Determine if the next meeting is convoked
  const isConvoked = useMemo(() => {
    if (!nextMeeting) return false;
    return nextMeeting.status === 'convoked' || nextMeeting.status === 'in_progress';
  }, [nextMeeting]);

  // Get all draft meetings from Supabase, excluant les supprimés, avec titres renommés
  const draftMeetings = useMemo(() => {
    return meetings
      .filter((m) => m.status === 'draft' && !deletedIds.has(m.id))
      .map((m) => ({ ...m, title: renamedTitles.get(m.id) || m.title }));
  }, [meetings, deletedIds, renamedTitles]);

  const totalDraftsCount = draftMeetings.length + localStorageDrafts.length;

  if (!currentCoproId) {
    return <LoadingState message="Chargement de la copropriété..." />;
  }

  // Build actions for Supabase draft items
  const buildDraftActions = (ag: AgOverview): AgListItemAction[] => [
    { icon: <Edit3 size={16} />, label: 'Continuer', href: `/ag/${ag.id}/edit`, title: 'Continuer la préparation' },
    { icon: <ClipboardList size={16} />, label: 'Agenda', href: `/ag/${ag.id}/agenda`, title: 'Ordre du jour' },
    {
      icon: <Trash2 size={16} />,
      onClick: () => handleOpenDeleteConfirm(ag.id, ag.title || `AG ${getTypeLabel(ag.meeting_type)}`),
      title: 'Supprimer le brouillon',
      variant: 'danger',
      disabled: deletingId === ag.id,
      isLoading: deletingId === ag.id,
    },
  ];

  // Build actions for localStorage draft items
  const buildLocalDraftActions = (draft: LocalStorageDraft): AgListItemAction[] => [
    { icon: <Edit3 size={16} />, label: 'Continuer', href: `/ag/${draft.id}/edit`, title: 'Continuer la préparation' },
    { icon: <ClipboardList size={16} />, label: 'Agenda', href: `/ag/${draft.id}/agenda`, title: 'Ordre du jour' },
    { icon: <Trash2 size={16} />, onClick: () => handleDeleteLocalDraft(draft.id), title: 'Supprimer le brouillon', variant: 'danger' },
  ];

  // Build actions for history items
  const buildHistoryActions = (ag: AgOverview): AgListItemAction[] => {
    const hasPV = ag.status === 'pv_generated' || ag.status === 'closed';
    return [
      ...(hasPV ? [{ icon: <AgDocumentQuickActions agId={ag.id} agStatus={ag.status} compact />, title: '', href: undefined }] : []),
      { icon: <Eye size={16} />, label: 'PV', href: `/ag/${ag.id}/pv`, title: 'Voir le procès-verbal' },
      { icon: <Copy size={16} />, label: 'Dupliquer', href: `/ag/new?duplicate=${ag.id}`, title: 'Dupliquer pour nouvelle AG' },
    ].filter(a => a.title !== '');
  };

  return (
    <div className="container">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Assemblées Générales</h1>
          <p className={styles.subtitle}>Gérez vos réunions de copropriété, de la convocation au procès-verbal.</p>
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
                <div className={styles.emptyStateIcon}><Calendar size={48} aria-hidden="true" /></div>
                <h3 className={styles.emptyStateTitle}>Aucune AG planifiée</h3>
                <p className={styles.emptyStateText}>Planifiez votre prochaine Assemblée Générale pour la copropriété.</p>
                {isManager && (
                  <Link href="/ag/new" className="btn btn-primary">
                    <Plus size={16} style={{ marginRight: 8 }} aria-hidden="true" />Planifier une AG
                  </Link>
                )}
              </div>
            )}

            {/* Section Brouillons */}
            <div className="card">
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>
                  <Edit3 size={20} style={{ marginRight: 8 }} aria-hidden="true" />
                  Brouillons ({totalDraftsCount})
                </h3>
                {isManager && (
                  <Link href="/ag/new" className={styles.newBrouillonBtn}>
                    <Plus size={16} aria-hidden="true" />Nouvelle AG
                  </Link>
                )}
              </div>
              {totalDraftsCount > 0 ? (
                <div className={clsx(styles.list, styles.listDraft)}>
                  {draftMeetings.map((ag) => {
                    const typeLabel = getTypeLabel(ag.meeting_type);
                    const meta = [
                      ag.meeting_date ? `Prévue le ${new Date(ag.meeting_date).toLocaleDateString('fr-FR')}` : 'Date non définie',
                      ag.location,
                      `${ag.resolutions_count || 0} résolution(s)`,
                    ].filter(Boolean).join(' • ');

                    return (
                      <AgListItem
                        key={ag.id}
                        icon={<Edit3 size={20} aria-hidden="true" />}
                        title={ag.title || `AG ${typeLabel}`}
                        meta={meta}
                        actions={buildDraftActions(ag)}
                        variant="draft"
                        editable
                        onRename={(newTitle) => handleRename(ag.id, newTitle)}
                        isRenaming={renamingId === ag.id}
                      />
                    );
                  })}
                  {localStorageDrafts.map((draft) => {
                    const typeLabel = draft.type === 'EXTRAORDINAIRE' ? 'Extraordinaire' : 'Ordinaire';
                    const meta = [
                      draft.date ? `Prévue le ${new Date(draft.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}` : 'Date non définie',
                      draft.heure && `à ${draft.heure}`,
                      draft.adresse,
                    ].filter(Boolean).join(' • ');

                    return (
                      <AgListItem
                        key={draft.id}
                        icon={<Edit3 size={20} aria-hidden="true" />}
                        title={`AG ${typeLabel}`}
                        meta={meta}
                        actions={buildLocalDraftActions(draft)}
                        variant="draft"
                      />
                    );
                  })}
                </div>
              ) : (
                <div className={styles.emptyBrouillons}>
                  <Edit3 size={24} aria-hidden="true" />
                  <p>Aucun brouillon en cours</p>
                  <span>Les AG en préparation apparaîtront ici</span>
                </div>
              )}
            </div>

            {/* Historique */}
            <div className="card">
              <h3 className={styles.sectionTitle}>Historique ({pastMeetings.length} AG)</h3>
              <div className={styles.list}>
                {pastMeetings.length === 0 ? (
                  <p className={styles.emptyHistory}>Aucune AG terminée.</p>
                ) : (
                  pastMeetings.map((ag) => {
                    const typeLabel = getTypeLabel(ag.meeting_type);
                    const participantsCount = (ag.present_count || 0) + (ag.proxy_count || 0) + (ag.correspondence_count || 0);
                    const meta = [
                      ag.location || 'Lieu non défini',
                      participantsCount > 0 && `${participantsCount} participants`,
                      ag.approved_count > 0 && `${ag.approved_count}/${ag.resolutions_count} adoptées`,
                    ].filter(Boolean).join(' • ');

                    return (
                      <AgListItem
                        key={ag.id}
                        icon={<FileText size={20} aria-hidden="true" />}
                        title={`${ag.title || `AG ${typeLabel}`} du ${new Date(ag.meeting_date).toLocaleDateString('fr-FR')}`}
                        meta={meta}
                        actions={buildHistoryActions(ag)}
                        variant="history"
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className={styles.sideColumn}>
            <div className="card"><AGQuickActions /></div>
          </div>
        </div>
      </DataState>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={!!deleteConfirm}
        icon={<Trash2 size={32} aria-hidden="true" />}
        title="Supprimer ce brouillon ?"
        description={<>Vous êtes sur le point de supprimer <strong>&quot;{deleteConfirm?.title}&quot;</strong>.</>}
        warning="Cette action supprimera définitivement l'AG et toutes ses données associées."
        confirmLabel="Supprimer"
        confirmIcon={<Trash2 size={16} aria-hidden="true" />}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
