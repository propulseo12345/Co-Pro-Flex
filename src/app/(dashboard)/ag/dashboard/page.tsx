'use client';

import Link from 'next/link';
import { Calendar, Plus, FileText, ClipboardList, Copy, Eye, Edit3, Trash2, Play, CheckCircle, Archive } from 'lucide-react';
import { AGArchivesList, AgListItem, ConfirmModal } from '@/components/features/ag/Dashboard';
import type { AgListItemAction } from '@/components/features/ag/Dashboard';
import { archiveAg } from '@/lib/ag/api';
import archiveStyles from '@/components/features/ag/Dashboard/AGArchivesList.module.css';
import { AgDocumentQuickActions } from '@/components/features/ag';
import { AgStatusBadge } from '@/components/features/ag/Dashboard/components/AgStatusBadge';
import { DataState, LoadingState } from '@/components/ui/DataState/DataState';
import { useAgDashboardPage, NextAgCard, getTypeLabel, getStatusBadge, getStepPath, type AgDraft, type AgOverview } from '@/features/ag/dashboard-page';
import styles from './dashboard.module.css';
import clsx from 'clsx';

export default function AGDashboardPage() {
  const {
    currentCoproId,
    isManager,
    nextMeeting,
    activeMeetings,
    pastMeetings,
    isLoading,
    error,
    refresh,
    localStorageDrafts,
    draftMeetings,
    totalDraftsCount,
    deleteConfirm,
    isDeleting,
    deletingId,
    renamingId,
    isConvoked,
    activeTab,
    setActiveTab,
    closedAGs,
    closedAGsLoading,
    handleDeleteLocalDraft,
    handleOpenDeleteConfirm,
    handleCancelDelete,
    handleRename,
    handleConfirmDelete,
  } = useAgDashboardPage();

  if (!currentCoproId) {
    return <LoadingState message="Chargement de la copropriété..." />;
  }

  const buildDraftActions = (draft: AgDraft): AgListItemAction[] => {
    // Utiliser maxStepReached pour la navigation (reprend là où l'utilisateur s'est arrêté)
    const resumeStep = draft.maxStepReached || draft.currentStep || 1;
    return [
    { icon: <Edit3 size={16} />, label: 'Continuer', href: `/ag/${draft.id}/${getStepPath(resumeStep)}`, title: `Reprendre à l'étape ${resumeStep}` },
    { icon: <ClipboardList size={16} />, label: 'Agenda', href: `/ag/${draft.id}/agenda`, title: 'Ordre du jour' },
    { icon: <Trash2 size={16} />, onClick: () => handleOpenDeleteConfirm(draft.id, draft.title || `AG ${getTypeLabel(draft.meeting_type)}`), title: 'Supprimer le brouillon', variant: 'danger', disabled: deletingId === draft.id, isLoading: deletingId === draft.id },
  ];
  };

  const buildLocalDraftActions = (draft: { id: string; type: string }) => [
    { icon: <Edit3 size={16} />, label: 'Continuer', href: `/ag/${draft.id}/edit`, title: 'Continuer la préparation' },
    { icon: <ClipboardList size={16} />, label: 'Agenda', href: `/ag/${draft.id}/agenda`, title: 'Ordre du jour' },
    { icon: <Trash2 size={16} />, onClick: () => handleDeleteLocalDraft(draft.id), title: 'Supprimer le brouillon', variant: 'danger' as const },
  ];

  const handleArchive = async (agId: string) => {
    const res = await archiveAg(agId);
    if (res.success) refresh();
  };

  const buildHistoryActions = (ag: AgOverview): AgListItemAction[] => {
    const hasPV = ['pv_generated', 'pv_signed', 'pv_sent', 'finalized', 'closed'].includes(ag.status);
    return [
      ...(hasPV ? [{ icon: <AgDocumentQuickActions agId={ag.id} agStatus={ag.status} compact />, title: '', href: undefined }] : []),
      { icon: <Eye size={16} />, label: 'PV', href: `/ag/${ag.id}/pv`, title: 'Voir le procès-verbal' },
      { icon: <Copy size={16} />, label: 'Dupliquer', href: `/ag/new?duplicate=${ag.id}`, title: 'Dupliquer pour nouvelle AG' },
      ...(isManager && ag.status === 'finalized'
        ? [{ icon: <Archive size={16} />, label: 'Archiver', onClick: () => handleArchive(ag.id), title: 'Archiver cette AG' }]
        : []),
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

      <DataState isLoading={isLoading} error={error} isEmpty={false} loadingMessage="Chargement des assemblées générales..." onRetry={refresh}>
        <div className={archiveStyles.tabs}>
          <button
            className={clsx(archiveStyles.tab, activeTab === 'current' && archiveStyles.tabActive)}
            onClick={() => setActiveTab('current')}
          >
            AG en cours
            <span className={archiveStyles.tabCount}>{(nextMeeting ? 1 : 0) + activeMeetings.length + totalDraftsCount}</span>
          </button>
          <button
            className={clsx(archiveStyles.tab, activeTab === 'archives' && archiveStyles.tabActive)}
            onClick={() => setActiveTab('archives')}
          >
            AG passees
            <span className={archiveStyles.tabCount}>{pastMeetings.length}</span>
          </button>
        </div>

        <div className={styles.grid}>
          <div className={styles.mainColumn}>
            {activeTab === 'archives' ? (
              <div className="card">
                <h3 className={styles.sectionTitle}>AG cloturees ({closedAGs.length})</h3>
                <AGArchivesList closedAGs={closedAGs} isLoading={closedAGsLoading} />
              </div>
            ) : (<>
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

            {activeMeetings.length > 0 && (
              <div className="card">
                <h3 className={styles.sectionTitle}>
                  <Play size={20} style={{ marginRight: 8 }} aria-hidden="true" />
                  AG en cours ({activeMeetings.length})
                </h3>
                <div className={styles.list}>
                  {activeMeetings.map((ag) => {
                    const typeLabel = getTypeLabel(ag.meeting_type);
                    const statusInfo = getStatusBadge(ag.status);
                    const participantsCount = (ag.present_count || 0) + (ag.proxy_count || 0) + (ag.correspondence_count || 0);
                    const meta = [
                      new Date(ag.meeting_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
                      ag.location,
                      `${ag.resolutions_count || 0} résolution(s)`,
                      participantsCount > 0 ? `${participantsCount} présence(s)` : null,
                    ].filter(Boolean).join(' • ');

                    const lastStep = ag.max_step_reached || ag.current_step || 1;
                    const stepPath = getStepPath(lastStep);
                    const actions: AgListItemAction[] = [
                      { icon: <Play size={16} />, label: 'Reprendre', href: `/ag/${ag.id}/${stepPath}`, title: `Reprendre (étape ${lastStep})` },
                      { icon: <ClipboardList size={16} />, label: 'PV', href: `/ag/${ag.id}/pv`, title: 'Procès-verbal' },
                    ];

                    return (
                      <AgListItem
                        key={ag.id}
                        icon={<AgStatusBadge status={ag.status as 'session_active' | 'in_progress' | 'convoked'} />}
                        title={`${ag.title || `AG ${typeLabel}`}`}
                        meta={meta}
                        actions={actions}
                        variant="history"
                      />
                    );
                  })}
                </div>
              </div>
            )}

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
                  {draftMeetings.map((draft) => {
                    const typeLabel = getTypeLabel(draft.meeting_type);
                    // Utiliser maxStepReached pour l'affichage de la progression
                    const displayStep = draft.maxStepReached || draft.currentStep || 1;
                    const meta = [
                      draft.meeting_date ? `Prévue le ${new Date(draft.meeting_date).toLocaleDateString('fr-FR')}` : 'Date non définie',
                      draft.location,
                      `${draft.resolutionsCount || 0} résolution(s)`,
                      `Étape ${displayStep}/8`,
                    ].filter(Boolean).join(' • ');

                    return (
                      <AgListItem key={draft.id} icon={<Edit3 size={20} aria-hidden="true" />} title={draft.title || `AG ${typeLabel}`} meta={meta} actions={buildDraftActions(draft)} variant="draft" editable onRename={(newTitle) => handleRename(draft.id, newTitle)} isRenaming={renamingId === draft.id} />
                    );
                  })}
                  {localStorageDrafts.map((draft) => {
                    const typeLabel = draft.type === 'EXTRAORDINAIRE' ? 'Extraordinaire' : 'Ordinaire';
                    const meta = [
                      draft.date ? `Prévue le ${new Date(draft.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}` : 'Date non définie',
                      draft.heure && `à ${draft.heure}`,
                      draft.adresse,
                    ].filter(Boolean).join(' • ');

                    return <AgListItem key={draft.id} icon={<Edit3 size={20} aria-hidden="true" />} title={`AG ${typeLabel}`} meta={meta} actions={buildLocalDraftActions(draft)} variant="draft" />;
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

            <div className="card">
              <h3 className={styles.sectionTitle}>Historique ({pastMeetings.length} AG)</h3>
              <div className={styles.list}>
                {pastMeetings.length === 0 ? (
                  <p className={styles.emptyHistory}>Aucune AG terminée.</p>
                ) : (
                  pastMeetings.map((ag) => {
                    const typeLabel = getTypeLabel(ag.meeting_type);
                    const participantsCount = (ag.present_count || 0) + (ag.proxy_count || 0) + (ag.correspondence_count || 0);
                    const meta = [ag.location || 'Lieu non défini', participantsCount > 0 && `${participantsCount} participants`, ag.approved_count > 0 && `${ag.approved_count}/${ag.resolutions_count} adoptées`].filter(Boolean).join(' • ');

                    return <AgListItem key={ag.id} icon={<FileText size={20} aria-hidden="true" />} title={`${ag.title || `AG ${typeLabel}`} du ${new Date(ag.meeting_date).toLocaleDateString('fr-FR')}`} meta={meta} actions={buildHistoryActions(ag)} variant="history" />;
                  })
                )}
              </div>
            </div>
            </>)}
          </div>
        </div>
      </DataState>

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
