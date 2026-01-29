'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCopro } from '@/providers/CoproContext';
import { mailSupabaseService } from '@/lib/services/mail-supabase.service';
import type { Mail, MailOnglet } from '@/types/models/mail';

export type MailTab = MailOnglet;

export interface MailStats {
  inbox: number;
  inboxNonLus: number;
  sent: number;
  drafts: number;
  trash: number;
}

export function useMailPage() {
  const router = useRouter();
  const { currentCoproId } = useCopro();
  const [mails, setMails] = useState<Mail[]>([]);
  const [selectedTab, setSelectedTab] = useState<MailTab>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMailIds, setSelectedMailIds] = useState<string[]>([]);
  const [stats, setStats] = useState<MailStats>({
    inbox: 0,
    inboxNonLus: 0,
    sent: 0,
    drafts: 0,
    trash: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch mails from Supabase
  const fetchMails = useCallback(async () => {
    if (!currentCoproId) {
      setMails([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const mailsData = await mailSupabaseService.getMails(currentCoproId, {
        onglet: selectedTab,
        recherche: searchQuery,
      });
      setMails(mailsData);
    } catch (err) {
      console.error('Error fetching mails:', err);
      setError('Erreur lors du chargement des mails');
      setMails([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentCoproId, selectedTab, searchQuery]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!currentCoproId) return;

    try {
      const statsData = await mailSupabaseService.getStats(currentCoproId);
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, [currentCoproId]);

  // Initial fetch
  useEffect(() => {
    fetchMails();
    fetchStats();
  }, [fetchMails, fetchStats]);

  // Filtered mails
  const filteredMails = useMemo(() => {
    if (!searchQuery.trim()) return mails;

    const query = searchQuery.toLowerCase();
    return mails.filter(
      (m) =>
        m.subject.toLowerCase().includes(query) ||
        m.preview?.toLowerCase().includes(query) ||
        m.sender?.nom.toLowerCase().includes(query)
    );
  }, [mails, searchQuery]);

  // Format date
  const formatDate = useCallback((dateStr: string | undefined) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Hier';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('fr-FR', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    }
  }, []);

  // Toggle mail selection
  const toggleMailSelection = useCallback((mailId: string) => {
    setSelectedMailIds((prev) =>
      prev.includes(mailId) ? prev.filter((id) => id !== mailId) : [...prev, mailId]
    );
  }, []);

  // Select all
  const selectAll = useCallback(() => {
    setSelectedMailIds(filteredMails.map((m) => m.id));
  }, [filteredMails]);

  // Deselect all
  const deselectAll = useCallback(() => {
    setSelectedMailIds([]);
  }, []);

  // Mark as read
  const markAsRead = useCallback(async () => {
    if (selectedMailIds.length === 0) return;

    for (const id of selectedMailIds) {
      await mailSupabaseService.markAsRead(id);
    }

    setSelectedMailIds([]);
    await fetchMails();
    await fetchStats();
  }, [selectedMailIds, fetchMails, fetchStats]);

  // Move to trash
  const moveToTrash = useCallback(async () => {
    if (selectedMailIds.length === 0) return;

    for (const id of selectedMailIds) {
      await mailSupabaseService.moveToTrash(id);
    }

    setSelectedMailIds([]);
    await fetchMails();
    await fetchStats();
  }, [selectedMailIds, fetchMails, fetchStats]);

  // Restore from trash
  const restoreFromTrash = useCallback(async () => {
    if (selectedMailIds.length === 0) return;

    for (const id of selectedMailIds) {
      await mailSupabaseService.restore(id);
    }

    setSelectedMailIds([]);
    await fetchMails();
    await fetchStats();
  }, [selectedMailIds, fetchMails, fetchStats]);

  // Permanent delete
  const permanentDelete = useCallback(async () => {
    if (selectedMailIds.length === 0) return;

    for (const id of selectedMailIds) {
      await mailSupabaseService.permanentDelete(id);
    }

    setSelectedMailIds([]);
    await fetchMails();
    await fetchStats();
  }, [selectedMailIds, fetchMails, fetchStats]);

  // Navigate to mail detail
  const openMail = useCallback((mailId: string) => {
    router.push(`/communication/mail/${mailId}`);
  }, [router]);

  // Navigate to new mail
  const createNewMail = useCallback(() => {
    router.push('/communication/mail/nouveau');
  }, [router]);

  return {
    mails: filteredMails,
    selectedTab,
    setSelectedTab,
    searchQuery,
    setSearchQuery,
    selectedMailIds,
    stats,
    isLoading,
    error,
    formatDate,
    toggleMailSelection,
    selectAll,
    deselectAll,
    markAsRead,
    moveToTrash,
    restoreFromTrash,
    permanentDelete,
    openMail,
    createNewMail,
    refetch: fetchMails,
  };
}
