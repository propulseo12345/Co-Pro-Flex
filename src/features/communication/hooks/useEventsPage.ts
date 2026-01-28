'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCopro } from '@/providers/CoproContext';
import { createClient } from '@/lib/supabase/client';
import type { Event, CategoryInfo } from '../types';

export const CATEGORIES: CategoryInfo[] = [
  { id: 'tous', label: 'Tous', color: '#6b7280' },
  { id: 'ag', label: 'AG', color: '#4f46e5' },
  { id: 'reunion', label: 'Réunion', color: '#0284c7' },
  { id: 'fete', label: 'Fête', color: '#8b5cf6' },
  { id: 'travaux', label: 'Travaux', color: '#f59e0b' },
  { id: 'collecte', label: 'Collecte', color: '#10b981' }
];

interface EventRow {
  id: string | null;
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

function mapEventRowToEvent(row: EventRow): Event {
  const startsAt = row.starts_at ? new Date(row.starts_at) : new Date();

  return {
    id: row.id || '',
    title: row.title || 'Sans titre',
    category: row.event_type || 'reunion',
    date: startsAt.toISOString().split('T')[0],
    time: startsAt.toTimeString().slice(0, 5),
    endDate: row.ends_at ? new Date(row.ends_at).toISOString().split('T')[0] : undefined,
    location: row.location || 'Non précisé',
    organizer: row.creator_name || 'Organisateur',
    description: row.description || '',
    participants: { confirmed: 0, declined: 0, pending: 0 }, // TODO: Add participant tracking
    hasInvitations: false,
    isPast: row.is_past || false,
  };
}

export function useEventsPage() {
  const { currentCoproId } = useCopro();
  const [selectedCategory, setSelectedCategory] = useState('tous');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch events from Supabase
  useEffect(() => {
    const fetchEvents = async () => {
      if (!currentCoproId) {
        setEvents([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from('v_events_overview')
          .select('*')
          .eq('copro_id', currentCoproId)
          .order('starts_at', { ascending: true });

        if (fetchError) {
          console.error('Error fetching events:', fetchError);
          setError('Erreur lors du chargement des événements');
          setEvents([]);
        } else {
          setEvents((data || []).map(mapEventRowToEvent));
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('Erreur inattendue');
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [currentCoproId]);

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      if (selectedCategory === 'tous') return true;
      return event.category === selectedCategory;
    });
  }, [events, selectedCategory]);

  const upcomingEvents = useMemo(() => filteredEvents.filter(e => !e.isPast), [filteredEvents]);
  const pastEvents = useMemo(() => filteredEvents.filter(e => e.isPast), [filteredEvents]);

  const getCategoryColor = useCallback((category: string) => {
    return CATEGORIES.find(c => c.id === category)?.color || '#6b7280';
  }, []);

  const getCategoryLabel = useCallback((category: string) => {
    return CATEGORIES.find(c => c.id === category)?.label || category;
  }, []);

  const handleExportICS = useCallback(() => {
    const evts = filteredEvents.filter(e => !e.isPast);
    if (evts.length === 0) {
      alert('Aucun événement à venir à exporter.');
      return;
    }

    let icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Copro Manager//FR\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\n`;
    evts.forEach(event => {
      const startDate = event.date.replace(/-/g, '');
      const startTime = event.time.replace(':', '') + '00';
      const endDate = event.endDate ? event.endDate.replace(/-/g, '') : startDate;
      icsContent += `BEGIN:VEVENT\nUID:${event.id}@copromanager\nDTSTART:${startDate}T${startTime}\nSUMMARY:${event.title}\nLOCATION:${event.location}\nDESCRIPTION:${event.description.replace(/\n/g, '\\n')}\nEND:VEVENT\n`;
    });
    icsContent += 'END:VCALENDAR';

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'evenements-copropriete.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredEvents]);

  const handleExportPDF = useCallback(() => {
    const evts = filteredEvents.filter(e => !e.isPast);
    if (evts.length === 0) {
      alert('Aucun événement à venir à exporter.');
      return;
    }

    const printContent = `<!DOCTYPE html><html><head><title>Événements - Copropriété</title><style>body{font-family:Arial,sans-serif;padding:20px}h1{color:#4f46e5;border-bottom:2px solid #4f46e5;padding-bottom:10px}.event{margin-bottom:20px;padding:15px;border:1px solid #e5e7eb;border-radius:8px}.event-title{font-size:18px;font-weight:bold;color:#1f2937;margin-bottom:8px}.event-meta{color:#6b7280;font-size:14px;margin-bottom:5px}.event-desc{color:#374151;margin-top:10px;white-space:pre-line}@media print{body{-webkit-print-color-adjust:exact}}</style></head><body><h1>Événements de la copropriété</h1><p style="color:#6b7280">Exporté le ${new Date().toLocaleDateString('fr-FR')}</p>${evts.map(event => `<div class="event"><div class="event-title">${event.title}</div><div class="event-meta">📅 ${new Date(event.date).toLocaleDateString('fr-FR')} à ${event.time}</div><div class="event-meta">📍 ${event.location}</div><div class="event-meta">👤 ${event.organizer}</div><div class="event-desc">${event.description}</div></div>`).join('')}</body></html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 250);
    }
  }, [filteredEvents]);

  const handleSendGroupInvitations = useCallback(() => {
    const eventsWithInvitations = filteredEvents.filter(e => !e.isPast && e.hasInvitations);
    if (eventsWithInvitations.length === 0) {
      alert('Aucun événement avec invitations à envoyer.');
      return;
    }
    const totalPending = eventsWithInvitations.reduce((sum, e) => sum + e.participants.pending, 0);
    alert(`Envoi des relances pour ${eventsWithInvitations.length} événement(s) à ${totalPending} participant(s) en attente...`);
  }, [filteredEvents]);

  return {
    selectedCategory,
    setSelectedCategory,
    viewMode,
    setViewMode,
    currentMonth,
    setCurrentMonth,
    events,
    filteredEvents,
    upcomingEvents,
    pastEvents,
    categories: CATEGORIES,
    getCategoryColor,
    getCategoryLabel,
    handleExportICS,
    handleExportPDF,
    handleSendGroupInvitations,
    isLoading,
    error,
  };
}
