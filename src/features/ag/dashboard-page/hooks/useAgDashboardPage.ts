'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useCopro } from '@/providers/CoproContext';
import { useAgMeetings } from '@/hooks/modules/useAgData';
import { useAgDrafts, type AgDraft } from '@/hooks/modules/useAgDrafts';
import { createClient } from '@/lib/supabase/client';
import type { AgOverview, AgStatus, AgMeetingType } from '@/lib/ag/types';

interface LocalStorageDraft {
  id: string;
  type: string;
  date: string;
  heure?: string;
  lieu?: string;
  adresse?: string;
}

export function getTypeLabel(type: AgMeetingType): string {
  switch (type) {
    case 'ordinary': return 'Ordinaire';
    case 'extraordinary': return 'Extraordinaire';
    case 'special': return 'Mixte';
    default: return type;
  }
}

export function getStatusBadge(status: AgStatus): { label: string; className: string } {
  switch (status) {
    case 'draft': return { label: 'En préparation', className: 'planifiee' };
    case 'convoked': return { label: 'Convoquée', className: 'convoquee' };
    case 'in_progress': return { label: 'En cours', className: 'ready' };
    case 'closed': return { label: 'Clôturée', className: 'closed' };
    case 'pv_generated': return { label: 'PV généré', className: 'closed' };
    default: return { label: status, className: '' };
  }
}

const STEP_PATHS: Record<number, string> = {
  1: 'edit',
  2: 'agenda',
  3: 'convocation',
  4: 'envoi',
  5: 'preparation',
  6: 'session',
  7: 'pv',
};

export function getStepPath(step: number): string {
  return STEP_PATHS[step] || 'edit';
}

export function useAgDashboardPage() {
  const { currentCoproId, isManager } = useCopro();
  const { meetings, nextMeeting, pastMeetings, isLoading, error, refresh } = useAgMeetings();
  const { drafts: supabaseDrafts, deleteDraft, isLoading: draftsLoading } = useAgDrafts();

  const [localStorageDrafts, setLocalStorageDrafts] = useState<LocalStorageDraft[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamedTitles, setRenamedTitles] = useState<Map<string, string>>(new Map());

  useEffect(() => {
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
        } catch { /* ignore */ }
      }
    }

    drafts.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    setLocalStorageDrafts(drafts);
  }, []);

  const handleDeleteLocalDraft = useCallback((draftId: string) => {
    if (confirm('Supprimer ce brouillon ?')) {
      localStorage.removeItem(`ag-draft-${draftId}`);
      localStorage.removeItem(`ag-resolutions-${draftId}`);
      localStorage.removeItem(`ag-resolutions-created-${draftId}`);
      setLocalStorageDrafts(prev => prev.filter(d => d.id !== draftId));
    }
  }, []);

  const handleOpenDeleteConfirm = useCallback((id: string, title: string) => {
    setDeleteConfirm({ id, title });
  }, []);

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirm(null);
  }, []);

  const handleRename = useCallback(async (id: string, newTitle: string) => {
    setRenamingId(id);
    try {
      const supabase = createClient();
      const { error } = await (supabase as unknown as { from: (t: string) => { update: (d: object) => { eq: (f: string, v: string) => Promise<{ error: unknown }> } } })
        .from('ag_meetings')
        .update({ title: newTitle })
        .eq('id', id);

      if (!error) {
        setRenamedTitles(prev => new Map(prev).set(id, newTitle));
      }
    } finally {
      setRenamingId(null);
    }
  }, []);

  const handleConfirmDelete = useCallback(async () => {
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
  }, [deleteConfirm, deleteDraft]);

  const isConvoked = useMemo(() => {
    if (!nextMeeting) return false;
    return nextMeeting.status === 'convoked' || nextMeeting.status === 'in_progress';
  }, [nextMeeting]);

  const draftMeetings = useMemo(() => {
    return supabaseDrafts
      .filter((d) => !deletedIds.has(d.id))
      .map((d) => ({ ...d, title: renamedTitles.get(d.id) || d.title }));
  }, [supabaseDrafts, deletedIds, renamedTitles]);

  const totalDraftsCount = draftMeetings.length + localStorageDrafts.length;

  return {
    currentCoproId,
    isManager,
    meetings,
    nextMeeting,
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
    handleDeleteLocalDraft,
    handleOpenDeleteConfirm,
    handleCancelDelete,
    handleRename,
    handleConfirmDelete,
  };
}

export type { LocalStorageDraft, AgDraft, AgOverview };
