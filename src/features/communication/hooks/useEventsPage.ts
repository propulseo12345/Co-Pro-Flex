'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Event, CategoryInfo } from '../types';

const EVENTS_STORAGE_KEY = 'evenements-copro-data';

const MOCK_EVENTS: Event[] = [
  {
    id: 1,
    title: 'Assemblée Générale Ordinaire',
    category: 'ag',
    date: '2025-12-15',
    time: '18:00',
    location: 'Salle de réunion - RDC',
    organizer: 'Syndic - Jean DUPONT',
    description: 'Assemblée Générale Ordinaire pour l\'exercice 2025. Ordre du jour : approbation des comptes, vote du budget 2026, travaux de réfection.',
    participants: { confirmed: 12, declined: 2, pending: 8 },
    hasInvitations: true,
    isPast: false
  },
  {
    id: 2,
    title: 'Fête des Voisins 2026',
    category: 'fete',
    date: '2026-05-23',
    time: '14:00',
    endDate: '2026-05-23',
    location: 'Jardin commun',
    organizer: 'Marie MARTIN',
    description: 'Retrouvons-nous pour la traditionnelle Fête des Voisins. Apportez vos spécialités à partager !',
    participants: { confirmed: 18, declined: 1, pending: 12 },
    hasInvitations: true,
    isPast: false
  },
  {
    id: 3,
    title: 'Début travaux toiture',
    category: 'travaux',
    date: '2026-01-15',
    time: '08:00',
    endDate: '2026-02-28',
    location: 'Toiture - Bâtiment A',
    organizer: 'Toiture Pro',
    description: 'Début des travaux de réfection de la toiture. Présence du lundi au vendredi de 8h à 17h.',
    participants: { confirmed: 0, declined: 0, pending: 0 },
    hasInvitations: false,
    isPast: false
  },
  {
    id: 4,
    title: 'Réunion Conseil Syndical',
    category: 'reunion',
    date: '2025-11-20',
    time: '19:00',
    location: 'Salle de réunion',
    organizer: 'Conseil Syndical',
    description: 'Réunion mensuelle du Conseil Syndical',
    participants: { confirmed: 5, declined: 0, pending: 0 },
    hasInvitations: false,
    isPast: true
  }
];

export const CATEGORIES: CategoryInfo[] = [
  { id: 'tous', label: 'Tous', color: '#6b7280' },
  { id: 'ag', label: 'AG', color: '#4f46e5' },
  { id: 'reunion', label: 'Réunion', color: '#0284c7' },
  { id: 'fete', label: 'Fête', color: '#8b5cf6' },
  { id: 'travaux', label: 'Travaux', color: '#f59e0b' },
  { id: 'collecte', label: 'Collecte', color: '#10b981' }
];

export function useEventsPage() {
  const [selectedCategory, setSelectedCategory] = useState('tous');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<Event[]>(MOCK_EVENTS);

  useEffect(() => {
    const stored = localStorage.getItem(EVENTS_STORAGE_KEY);
    let deletedIds: string[] = [];
    let customEvents: Event[] = [];

    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.list && Array.isArray(data.list)) customEvents = data.list;
        if (data.deletedIds && Array.isArray(data.deletedIds)) deletedIds = data.deletedIds;
      } catch (e) { /* ignore */ }
    }

    const filteredMockEvents = MOCK_EVENTS.filter(
      event => !deletedIds.includes(event.id.toString())
    );
    setEvents([...customEvents, ...filteredMockEvents]);
  }, []);

  const filteredEvents = events.filter(event => {
    if (selectedCategory === 'tous') return true;
    return event.category === selectedCategory;
  });

  const upcomingEvents = filteredEvents.filter(e => !e.isPast);
  const pastEvents = filteredEvents.filter(e => e.isPast);

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
  };
}
