'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCopro } from '@/providers/CoproContext';
import { createClient } from '@/lib/supabase/client';
import type { EventDetail, CategoryInfo } from '../types';

const CATEGORIES: CategoryInfo[] = [
  { id: 'ag', label: 'Assemblée Générale', color: '#4f46e5' },
  { id: 'reunion', label: 'Réunion', color: '#0284c7' },
  { id: 'fete', label: 'Fête', color: '#8b5cf6' },
  { id: 'travaux', label: 'Travaux', color: '#f59e0b' },
  { id: 'collecte', label: 'Collecte', color: '#10b981' }
];

interface EventRow {
  id: string;
  copro_id: string | null;
  title: string | null;
  description: string | null;
  event_type: string | null;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  all_day: boolean | null;
  visibility: string | null;
  created_by: string | null;
  creator_name: string | null;
  is_past: boolean | null;
  is_today: boolean | null;
}

interface UseEventDetailPageParams {
  eventId: string;
}

export function useEventDetailPage({ eventId }: UseEventDetailPageParams) {
  const router = useRouter();
  const { currentCoproId } = useCopro();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showActions, setShowActions] = useState(false);

  // Fetch event detail from Supabase
  useEffect(() => {
    const fetchEvent = async () => {
      if (!currentCoproId || !eventId) {
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from('v_events_overview')
          .select('*')
          .eq('id', eventId)
          .eq('copro_id', currentCoproId)
          .single();

        if (fetchError || !data) {
          console.error('Error fetching event:', fetchError);
          setEvent(null);
          setLoading(false);
          return;
        }

        const startsAt = data.starts_at ? new Date(data.starts_at) : new Date();
        const endsAt = data.ends_at ? new Date(data.ends_at) : null;

        const eventDetail: EventDetail = {
          id: data.id || '',
          title: data.title || 'Sans titre',
          category: data.event_type || 'reunion',
          date: startsAt.toISOString().split('T')[0],
          time: startsAt.toTimeString().slice(0, 5),
          endDate: endsAt ? endsAt.toISOString().split('T')[0] : undefined,
          endTime: endsAt ? endsAt.toTimeString().slice(0, 5) : undefined,
          location: data.location || 'Non précisé',
          organizer: data.creator_name || 'Organisateur',
          organizerRole: 'syndic',
          description: data.description || '',
          fullDescription: data.description || '',
          participants: [], // TODO: Add participant tracking
          attachments: [], // TODO: Add attachment support
          hasInvitations: false,
          isPast: data.is_past || false,
          userStatus: 'pending',
          reminders: [],
        };

        setEvent(eventDetail);
      } catch (err) {
        console.error('Unexpected error:', err);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId, currentCoproId]);

  const getCategoryInfo = useCallback((category: string) => {
    return CATEGORIES.find(c => c.id === category) || { label: category, color: '#6b7280' };
  }, []);

  const handleEdit = useCallback(() => {
    router.push(`/communication/evenements/nouveau?edit=${eventId}`);
    setShowActions(false);
  }, [router, eventId]);

  const handleDelete = useCallback(async () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) {
      const supabase = createClient();
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (!error) {
        router.push('/communication/evenements?deleted=1');
      }
    }
    setShowActions(false);
  }, [router, eventId]);

  const handleRSVP = useCallback(async (status: 'confirmed' | 'declined') => {
    // Will be implemented in WRITE phase
    if (!event) return;
    const updatedEvent = { ...event, userStatus: status };
    setEvent(updatedEvent);
    // RSVP status updated
  }, [event]);

  const handleExportICS = useCallback(() => {
    if (!event) return;

    const startDate = event.date.replace(/-/g, '');
    const startTime = event.time.replace(':', '') + '00';
    const endDate = event.endDate ? event.endDate.replace(/-/g, '') : startDate;

    const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Copro Manager//FR\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\nBEGIN:VEVENT\nUID:${event.id}@copromanager\nDTSTART:${startDate}T${startTime}\nSUMMARY:${event.title}\nLOCATION:${event.location}\nDESCRIPTION:${event.description.replace(/\n/g, '\\n')}\nEND:VEVENT\nEND:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `evenement-${event.id}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [event]);

  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({ title: event?.title || 'Événement', text: event?.description || '', url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Lien copié dans le presse-papier !');
    }
  }, [event]);

  const handleDownloadAttachment = useCallback((fileName: string) => {
    const content = `Contenu simulé du fichier: ${fileName}\n\nCe fichier serait téléchargé depuis le serveur en production.`;
    const blob = new Blob([content], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert(`Téléchargement de "${fileName}" en cours...`);
  }, []);

  const goBack = useCallback(() => router.back(), [router]);

  const confirmedCount = event?.participants.filter(p => p.status === 'confirmed').length || 0;
  const declinedCount = event?.participants.filter(p => p.status === 'declined').length || 0;
  const pendingCount = event?.participants.filter(p => p.status === 'pending').length || 0;

  return {
    event,
    loading,
    showActions,
    setShowActions,
    confirmedCount,
    declinedCount,
    pendingCount,
    getCategoryInfo,
    handleEdit,
    handleDelete,
    handleRSVP,
    handleExportICS,
    handleShare,
    handleDownloadAttachment,
    goBack,
  };
}
