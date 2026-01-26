'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Attachment, InvitationType, CategoryInfo, Organizer, Coproprietaire } from '../types';

const EVENTS_STORAGE_KEY = 'evenements-copro-data';

export const CATEGORIES: CategoryInfo[] = [
  { id: 'ag', label: 'Assemblée Générale', color: '#4f46e5' },
  { id: 'reunion', label: 'Réunion', color: '#0284c7' },
  { id: 'fete', label: 'Fête / Convivialité', color: '#8b5cf6' },
  { id: 'travaux', label: 'Travaux', color: '#f59e0b' },
  { id: 'collecte', label: 'Collecte / Ramassage', color: '#10b981' },
];

export const ORGANISATEURS: Organizer[] = [
  { id: 'syndic', name: 'Syndic - Cabinet Gestion Immo', role: 'Syndic' },
  { id: 'president', name: 'Jean DUPONT', role: 'Président CS' },
  { id: 'secretaire', name: 'Marie MARTIN', role: 'Secrétaire CS' },
  { id: 'tresorier', name: 'Pierre DURAND', role: 'Trésorier CS' },
];

export const COPROPRIETAIRES: Coproprietaire[] = [
  { id: 'u1', name: 'Marie Martin', lot: 'Lot 12', email: 'marie.martin@email.com' },
  { id: 'u2', name: 'Jean-Pierre Dubois', lot: 'Lot 8', email: 'jp.dubois@email.com' },
  { id: 'u3', name: 'Sophie Leroy', lot: 'Lot 3', email: 's.leroy@email.com' },
  { id: 'u4', name: 'Paul Bernard', lot: 'Lot 15', email: 'p.bernard@email.com' },
  { id: 'u5', name: 'Claire Moreau', lot: 'Lot 7', email: 'c.moreau@email.com' },
  { id: 'u6', name: 'Thomas Petit', lot: 'Lot 22', email: 't.petit@email.com' },
  { id: 'u7', name: 'Isabelle Durand', lot: 'Lot 5', email: 'i.durand@email.com' },
  { id: 'u8', name: 'François Robert', lot: 'Lot 18', email: 'f.robert@email.com' },
];

const MOCK_EVENTS_DETAIL: Record<string, { id: number; title: string; category: string; date: string; endDate?: string; time: string; endTime?: string; location: string; organizer: string; fullDescription: string; attachments: { name: string; size: string }[]; hasInvitations: boolean; reminders: string[] }> = {
  '1': { id: 1, title: 'Assemblée Générale Ordinaire', category: 'ag', date: '2025-12-15', time: '18:00', endTime: '21:00', location: 'Salle de réunion - RDC', organizer: 'syndic', fullDescription: `L'Assemblée Générale Ordinaire de la copropriété se tiendra le 15 décembre 2025.\n\n**Ordre du jour :**\n1. Approbation des comptes de l'exercice 2025\n2. Vote du budget prévisionnel 2026\n3. Travaux de réfection de la toiture\n4. Questions diverses`, attachments: [{ name: 'Convocation_AG_2025.pdf', size: '450 Ko' }, { name: 'Comptes_annuels_2025.pdf', size: '1.2 Mo' }], hasInvitations: true, reminders: ['3'] },
  '2': { id: 2, title: 'Fête des Voisins 2026', category: 'fete', date: '2026-05-23', time: '14:00', endTime: '22:00', location: 'Jardin commun', organizer: 'secretaire', fullDescription: `Retrouvons-nous pour la traditionnelle Fête des Voisins !\n\n**Programme prévu :**\n- 14h00 : Installation et préparatifs\n- 15h00 : Animations pour les enfants\n- 17h00 : Apéritif commun`, attachments: [], hasInvitations: true, reminders: ['7'] },
  '3': { id: 3, title: 'Début travaux toiture', category: 'travaux', date: '2026-01-15', endDate: '2026-02-28', time: '08:00', endTime: '17:00', location: 'Toiture - Bâtiment A', organizer: 'syndic', fullDescription: `Les travaux de réfection de la toiture débuteront le 15 janvier 2026.\n\n**Informations importantes :**\n- Durée estimée : 6 semaines\n- Horaires d'intervention : Lundi au vendredi, 8h - 17h`, attachments: [{ name: 'Planning_travaux.pdf', size: '320 Ko' }], hasInvitations: false, reminders: [] }
};

export function useEventEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editId = searchParams.get('edit');
  const isEditMode = !!editId;
  const prefilledDate = searchParams.get('date');

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('reunion');
  const [date, setDate] = useState(prefilledDate || '');
  const [endDate, setEndDate] = useState('');
  const [time, setTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [organizer, setOrganizer] = useState('syndic');
  const [description, setDescription] = useState('');
  const [invitationType, setInvitationType] = useState<InvitationType>('all');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [participantSearch, setParticipantSearch] = useState('');
  const [sendInvitations, setSendInvitations] = useState(true);
  const [sendReminder, setSendReminder] = useState(true);
  const [reminderDays, setReminderDays] = useState('3');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isEditMode);

  useEffect(() => {
    if (!isEditMode || !editId) return;

    const stored = localStorage.getItem(EVENTS_STORAGE_KEY);
    let eventData = null;

    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.events && data.events[editId]) eventData = data.events[editId];
      } catch (e) { /* ignore */ }
    }

    if (!eventData && MOCK_EVENTS_DETAIL[editId]) eventData = MOCK_EVENTS_DETAIL[editId];

    if (eventData) {
      setTitle(eventData.title || '');
      setCategory(eventData.category || 'reunion');
      setDate(eventData.date || '');
      setEndDate(eventData.endDate || '');
      setTime(eventData.time || '');
      setEndTime(eventData.endTime || '');
      setLocation(eventData.location || '');
      setOrganizer(eventData.organizer || 'syndic');
      setDescription(eventData.fullDescription || eventData.description || '');
      setSendInvitations(eventData.hasInvitations ?? true);
      if (eventData.reminders && eventData.reminders.length > 0) {
        setSendReminder(true);
        const match = eventData.reminders[0].match(/(\d+)/);
        if (match) setReminderDays(match[1]);
      }
      if (eventData.attachments) {
        setAttachments(eventData.attachments.map((a: { name: string; size: string }) => ({
          id: `existing-${a.name}`,
          name: a.name,
          size: a.size,
          type: a.name.endsWith('.pdf') ? 'pdf' as const : 'document' as const
        })));
      }
    }
    setIsLoading(false);
  }, [isEditMode, editId]);

  const filteredParticipants = COPROPRIETAIRES.filter(user =>
    user.name.toLowerCase().includes(participantSearch.toLowerCase()) ||
    user.lot.toLowerCase().includes(participantSearch.toLowerCase())
  );

  const handleParticipantToggle = useCallback((userId: string) => {
    setSelectedParticipants(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const maxSize = 10 * 1024 * 1024;
    const newAttachments: Attachment[] = [];

    Array.from(files).forEach(file => {
      if (file.size > maxSize) {
        setError(`Le fichier "${file.name}" dépasse la limite de 10 MB`);
        return;
      }
      let type: 'pdf' | 'image' | 'document' = 'document';
      if (file.type === 'application/pdf') type = 'pdf';
      else if (file.type.startsWith('image/')) type = 'image';
      newAttachments.push({ id: `${Date.now()}-${file.name}`, name: file.name, size: formatFileSize(file.size), type });
    });

    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  }, []);

  const getParticipantCount = useCallback((): number => {
    switch (invitationType) {
      case 'all': return 42;
      case 'cs': return 5;
      case 'custom': return selectedParticipants.length;
      default: return 0;
    }
  }, [invitationType, selectedParticipants]);

  const validateForm = useCallback((): boolean => {
    if (!title.trim()) { setError('Veuillez saisir un titre pour l\'événement'); return false; }
    if (!date) { setError('Veuillez sélectionner une date'); return false; }
    if (!time) { setError('Veuillez sélectionner une heure'); return false; }
    if (!location.trim()) { setError('Veuillez indiquer un lieu'); return false; }
    if (invitationType === 'custom' && selectedParticipants.length === 0) { setError('Veuillez sélectionner au moins un participant'); return false; }
    return true;
  }, [title, date, time, location, invitationType, selectedParticipants]);

  const handleCreate = useCallback(async () => {
    setError(null);
    if (!validateForm()) return;

    setIsCreating(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const selectedOrg = ORGANISATEURS.find(o => o.id === organizer);
    const stored = localStorage.getItem(EVENTS_STORAGE_KEY);
    const data = stored ? JSON.parse(stored) : { list: [], events: {} };

    if (isEditMode && editId) {
      if (data.list) {
        data.list = data.list.map((e: { id: number | string }) => {
          if (e.id.toString() === editId) {
            return { ...e, title: title.trim(), category, date, endDate: endDate || undefined, time, location: location.trim(), organizer: selectedOrg?.name || 'Organisateur', description: description.trim().substring(0, 100) + (description.length > 100 ? '...' : ''), hasInvitations: sendInvitations };
          }
          return e;
        });
      }
      data.events = data.events || {};
      data.events[editId] = {
        ...data.events[editId],
        id: parseInt(editId),
        title: title.trim(),
        category,
        date,
        endDate: endDate || undefined,
        time,
        endTime: endTime || undefined,
        location: location.trim(),
        organizer: selectedOrg?.name || 'Organisateur',
        organizerRole: 'syndic',
        description: description.trim().substring(0, 100) + (description.length > 100 ? '...' : ''),
        fullDescription: description.trim(),
        participants: data.events[editId]?.participants || [],
        attachments: attachments.map(a => ({ name: a.name, size: a.size })),
        hasInvitations: sendInvitations,
        isPast: false,
        userStatus: 'pending',
        reminders: sendReminder ? [`${reminderDays} jour(s) avant`] : []
      };
      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(data));
      setIsCreating(false);
      router.push(`/communication/evenements/${editId}?updated=1`);
    } else {
      const newId = Date.now();
      let participantCount = 0;
      if (invitationType === 'all') participantCount = 42;
      else if (invitationType === 'cs') participantCount = 5;
      else participantCount = selectedParticipants.length;

      const newEvent = { id: newId, title: title.trim(), category, date, endDate: endDate || undefined, time, location: location.trim(), organizer: selectedOrg?.name || 'Organisateur', description: description.trim().substring(0, 100) + (description.length > 100 ? '...' : ''), participants: { confirmed: 0, declined: 0, pending: participantCount }, hasInvitations: sendInvitations, isPast: false };
      const newEventDetail = { id: newId, title: title.trim(), category, date, endDate: endDate || undefined, time, endTime: endTime || undefined, location: location.trim(), organizer: selectedOrg?.name || 'Organisateur', organizerRole: 'syndic', description: description.trim().substring(0, 100) + (description.length > 100 ? '...' : ''), fullDescription: description.trim(), participants: [], attachments: attachments.map(a => ({ name: a.name, size: a.size })), hasInvitations: sendInvitations, isPast: false, userStatus: 'pending', reminders: sendReminder ? [`${reminderDays} jour(s) avant`] : [] };

      data.list = [newEvent, ...(data.list || [])];
      data.events = data.events || {};
      data.events[newId.toString()] = newEventDetail;

      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(data));
      setIsCreating(false);
      router.push('/communication/evenements?success=1');
    }
  }, [validateForm, organizer, isEditMode, editId, title, category, date, endDate, time, endTime, location, description, sendInvitations, attachments, sendReminder, reminderDays, invitationType, selectedParticipants, router]);

  const handleSaveDraft = useCallback(async () => {
    setIsSavingDraft(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsSavingDraft(false);
    router.push('/communication/evenements?draft=1');
  }, [router]);

  const handleExportICS = useCallback(() => {
    if (!title || !date || !time) {
      setError('Veuillez remplir au minimum le titre, la date et l\'heure pour exporter');
      return;
    }
    alert('Export ICS en cours de téléchargement...');
  }, [title, date, time]);

  const selectedCategory = CATEGORIES.find(c => c.id === category);
  const selectedOrganizer = ORGANISATEURS.find(o => o.id === organizer);

  return {
    isEditMode,
    editId,
    isLoading,
    title, setTitle,
    category, setCategory,
    date, setDate,
    endDate, setEndDate,
    time, setTime,
    endTime, setEndTime,
    location, setLocation,
    organizer, setOrganizer,
    description, setDescription,
    invitationType, setInvitationType,
    selectedParticipants,
    participantSearch, setParticipantSearch,
    filteredParticipants,
    sendInvitations, setSendInvitations,
    sendReminder, setSendReminder,
    reminderDays, setReminderDays,
    attachments,
    isCreating,
    isSavingDraft,
    error, setError,
    fileInputRef,
    selectedCategory,
    selectedOrganizer,
    categories: CATEGORIES,
    organisateurs: ORGANISATEURS,
    handleParticipantToggle,
    handleFileSelect,
    removeAttachment,
    getParticipantCount,
    handleCreate,
    handleSaveDraft,
    handleExportICS,
  };
}
