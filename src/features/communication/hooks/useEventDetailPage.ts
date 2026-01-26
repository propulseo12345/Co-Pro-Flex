'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { EventDetail, CategoryInfo } from '../types';

const EVENTS_STORAGE_KEY = 'evenements-copro-data';

const CATEGORIES: CategoryInfo[] = [
  { id: 'ag', label: 'Assemblée Générale', color: '#4f46e5' },
  { id: 'reunion', label: 'Réunion', color: '#0284c7' },
  { id: 'fete', label: 'Fête', color: '#8b5cf6' },
  { id: 'travaux', label: 'Travaux', color: '#f59e0b' },
  { id: 'collecte', label: 'Collecte', color: '#10b981' }
];

const MOCK_EVENTS: Record<string, EventDetail> = {
  '1': {
    id: 1,
    title: 'Assemblée Générale Ordinaire',
    category: 'ag',
    date: '2025-12-15',
    time: '18:00',
    endTime: '21:00',
    location: 'Salle de réunion - RDC',
    organizer: 'Syndic - Jean DUPONT',
    organizerRole: 'syndic',
    description: 'Assemblée Générale Ordinaire pour l\'exercice 2025.',
    fullDescription: `L'Assemblée Générale Ordinaire de la copropriété se tiendra le 15 décembre 2025.\n\n**Ordre du jour :**\n1. Approbation des comptes de l'exercice 2025\n2. Vote du budget prévisionnel 2026\n3. Travaux de réfection de la toiture\n4. Questions diverses\n\n**Documents à consulter :**\n- Comptes annuels 2025\n- Projet de budget 2026\n- Devis travaux toiture\n\nVotre présence est importante pour le bon fonctionnement de la copropriété. En cas d'absence, merci de donner pouvoir à un autre copropriétaire.`,
    participants: [
      { id: 1, name: 'Jean DUPONT', status: 'confirmed', role: 'Syndic' },
      { id: 2, name: 'Marie MARTIN', status: 'confirmed', role: 'Président CS' },
      { id: 3, name: 'Pierre LEBLANC', status: 'confirmed', role: 'Lot 3' },
      { id: 4, name: 'Sophie DURAND', status: 'pending', role: 'Lot 5' },
      { id: 5, name: 'Paul BERNARD', status: 'declined', role: 'Lot 7' },
      { id: 6, name: 'Claire PETIT', status: 'pending', role: 'Lot 8' }
    ],
    attachments: [
      { name: 'Convocation_AG_2025.pdf', size: '450 Ko' },
      { name: 'Comptes_annuels_2025.pdf', size: '1.2 Mo' },
      { name: 'Budget_previsionnel_2026.xlsx', size: '85 Ko' }
    ],
    hasInvitations: true,
    isPast: false,
    userStatus: 'pending',
    reminders: ['1 semaine avant', '1 jour avant', '2 heures avant']
  },
  '2': {
    id: 2,
    title: 'Fête des Voisins 2026',
    category: 'fete',
    date: '2026-05-23',
    time: '14:00',
    endTime: '22:00',
    location: 'Jardin commun',
    organizer: 'Marie MARTIN',
    organizerRole: 'conseil',
    description: 'Retrouvons-nous pour la traditionnelle Fête des Voisins.',
    fullDescription: `Retrouvons-nous pour la traditionnelle Fête des Voisins !\n\n**Programme prévu :**\n- 14h00 : Installation et préparatifs\n- 15h00 : Animations pour les enfants\n- 17h00 : Apéritif commun\n- 19h00 : Barbecue/Buffet partagé\n- 21h00 : Musique et détente\n\n**Ce que chacun peut apporter :**\n- Salé : entrées, grillades, salades\n- Sucré : desserts, gâteaux\n- Boissons : jus de fruits, sodas\n\nMerci de confirmer votre participation et d'indiquer ce que vous comptez apporter !`,
    participants: [
      { id: 1, name: 'Marie MARTIN', status: 'confirmed', role: 'Organisatrice' },
      { id: 2, name: 'Pierre LEBLANC', status: 'confirmed', role: 'Lot 3' },
      { id: 3, name: 'Sophie DURAND', status: 'confirmed', role: 'Lot 5' }
    ],
    attachments: [],
    hasInvitations: true,
    isPast: false,
    userStatus: 'confirmed',
    reminders: ['1 semaine avant']
  },
  '3': {
    id: 3,
    title: 'Début travaux toiture',
    category: 'travaux',
    date: '2026-01-15',
    endDate: '2026-02-28',
    time: '08:00',
    endTime: '17:00',
    location: 'Toiture - Bâtiment A',
    organizer: 'Toiture Pro',
    organizerRole: 'syndic',
    description: 'Début des travaux de réfection de la toiture.',
    fullDescription: `Les travaux de réfection de la toiture débuteront le 15 janvier 2026.\n\n**Informations importantes :**\n- Durée estimée : 6 semaines\n- Horaires d'intervention : Lundi au vendredi, 8h - 17h\n- Entreprise : Toiture Pro\n\n**Impacts sur la vie de la copropriété :**\n- Nuisances sonores possibles pendant les heures de travail\n- Stationnement limité dans la cour\n- Échafaudages sur la façade nord\n\nEn cas de question, contactez le syndic ou le chef de chantier sur place.`,
    participants: [],
    attachments: [
      { name: 'Planning_travaux.pdf', size: '320 Ko' },
      { name: 'Consignes_securite.pdf', size: '150 Ko' }
    ],
    hasInvitations: false,
    isPast: false,
    reminders: []
  }
};

interface UseEventDetailPageParams {
  eventId: string;
}

export function useEventDetailPage({ eventId }: UseEventDetailPageParams) {
  const router = useRouter();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    let evt: EventDetail | null = null;
    let isDeleted = false;

    const stored = localStorage.getItem(EVENTS_STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.deletedIds && data.deletedIds.includes(eventId)) isDeleted = true;
        if (!isDeleted && data.events && data.events[eventId]) evt = data.events[eventId];
      } catch (e) { /* ignore */ }
    }

    if (!evt && !isDeleted && MOCK_EVENTS[eventId]) evt = MOCK_EVENTS[eventId];
    if (evt) setEvent(evt);
    setLoading(false);
  }, [eventId]);

  const getCategoryInfo = useCallback((category: string) => {
    return CATEGORIES.find(c => c.id === category) || { label: category, color: '#6b7280' };
  }, []);

  const handleEdit = useCallback(() => {
    router.push(`/communication/evenements/nouveau?edit=${eventId}`);
    setShowActions(false);
  }, [router, eventId]);

  const handleDelete = useCallback(() => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) {
      const stored = localStorage.getItem(EVENTS_STORAGE_KEY);
      const data = stored ? JSON.parse(stored) : { list: [], events: {}, deletedIds: [] };

      if (data.events && data.events[eventId]) delete data.events[eventId];
      if (data.list) data.list = data.list.filter((e: { id: number | string }) => e.id.toString() !== eventId);
      data.deletedIds = data.deletedIds || [];
      if (!data.deletedIds.includes(eventId)) data.deletedIds.push(eventId);

      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(data));
      router.push('/communication/evenements?deleted=1');
    }
    setShowActions(false);
  }, [router, eventId]);

  const handleRSVP = useCallback((status: 'confirmed' | 'declined') => {
    if (!event) return;

    const updatedEvent = { ...event, userStatus: status };
    setEvent(updatedEvent);

    const stored = localStorage.getItem(EVENTS_STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.events && data.events[eventId]) data.events[eventId].userStatus = status;
        if (data.list) {
          data.list = data.list.map((e: { id: number | string; participants: { pending: number; confirmed: number; declined: number } }) => {
            if (e.id.toString() === eventId) {
              const participants = { ...e.participants };
              if (event.userStatus === 'pending') participants.pending = Math.max(0, participants.pending - 1);
              else if (event.userStatus === 'confirmed') participants.confirmed = Math.max(0, participants.confirmed - 1);
              else if (event.userStatus === 'declined') participants.declined = Math.max(0, participants.declined - 1);
              if (status === 'confirmed') participants.confirmed++;
              else if (status === 'declined') participants.declined++;
              return { ...e, participants };
            }
            return e;
          });
        }
        localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(data));
      } catch (e) { /* ignore */ }
    }
  }, [event, eventId]);

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
