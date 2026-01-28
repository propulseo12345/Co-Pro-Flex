'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCopro } from '@/providers/CoproContext';
import { createClient } from '@/lib/supabase/client';
import type { Attachment, InvitationType, CategoryInfo, Organizer, Coproprietaire } from '../types';

export const CATEGORIES: CategoryInfo[] = [
  { id: 'ag', label: 'Assemblée Générale', color: '#4f46e5' },
  { id: 'reunion', label: 'Réunion', color: '#0284c7' },
  { id: 'fete', label: 'Fête / Convivialité', color: '#8b5cf6' },
  { id: 'travaux', label: 'Travaux', color: '#f59e0b' },
  { id: 'collecte', label: 'Collecte / Ramassage', color: '#10b981' },
];

export const ORGANISATEURS: Organizer[] = [
  { id: 'syndic', name: 'Syndic', role: 'Syndic' },
  { id: 'conseil', name: 'Conseil Syndical', role: 'Conseil Syndical' },
];

export function useEventEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentCoproId } = useCopro();
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
  const [coproprietaires, setCoproprietaires] = useState<Coproprietaire[]>([]);

  // Fetch coproprietaires for invitations
  useEffect(() => {
    const fetchCoproprietaires = async () => {
      if (!currentCoproId) return;

      const supabase = createClient();
      const { data } = await supabase
        .from('coproprietaires')
        .select('id, first_name, last_name, email')
        .eq('copro_id', currentCoproId);

      if (data) {
        setCoproprietaires(data.map(c => ({
          id: c.id,
          name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Sans nom',
          lot: '', // TODO: Add lot info
          email: c.email || '',
        })));
      }
    };

    fetchCoproprietaires();
  }, [currentCoproId]);

  // Load existing event for edit mode from Supabase
  useEffect(() => {
    if (!isEditMode || !editId || !currentCoproId) {
      setIsLoading(false);
      return;
    }

    const fetchEvent = async () => {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('v_events_overview')
        .select('*')
        .eq('id', editId)
        .eq('copro_id', currentCoproId)
        .single();

      if (fetchError || !data) {
        console.error('Error fetching event for edit:', fetchError);
        setIsLoading(false);
        return;
      }

      const startsAt = data.starts_at ? new Date(data.starts_at) : null;
      const endsAt = data.ends_at ? new Date(data.ends_at) : null;

      setTitle(data.title || '');
      setCategory(data.event_type || 'reunion');
      if (startsAt) {
        setDate(startsAt.toISOString().split('T')[0]);
        setTime(startsAt.toTimeString().slice(0, 5));
      }
      if (endsAt) {
        setEndDate(endsAt.toISOString().split('T')[0]);
        setEndTime(endsAt.toTimeString().slice(0, 5));
      }
      setLocation(data.location || '');
      setDescription(data.description || '');
      setIsLoading(false);
    };

    fetchEvent();
  }, [isEditMode, editId, currentCoproId]);

  const filteredParticipants = coproprietaires.filter(user =>
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
      case 'all': return coproprietaires.length;
      case 'cs': return 5; // Approximate CS size
      case 'custom': return selectedParticipants.length;
      default: return 0;
    }
  }, [invitationType, selectedParticipants, coproprietaires.length]);

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
    if (!currentCoproId) { setError('Copropriété non trouvée'); return; }

    setIsCreating(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('Vous devez être connecté');
        setIsCreating(false);
        return;
      }

      // Build starts_at timestamp
      const startsAt = new Date(`${date}T${time}:00`);

      // Build ends_at timestamp (optional)
      let endsAt: Date | null = null;
      if (endDate && endTime) {
        endsAt = new Date(`${endDate}T${endTime}:00`);
      } else if (endTime) {
        endsAt = new Date(`${date}T${endTime}:00`);
      }

      // Map visibility
      const visibilityMap: Record<string, 'all_members' | 'council_only' | 'managers_only'> = {
        'all': 'all_members',
        'cs': 'council_only',
        'custom': 'all_members',
      };

      // Map frontend category to DB enum
      const categoryMap: Record<string, 'ag' | 'reunion_cs' | 'fete' | 'travaux' | 'intervention' | 'autre'> = {
        'ag': 'ag',
        'reunion': 'reunion_cs',
        'reunion_cs': 'reunion_cs',
        'fete': 'fete',
        'travaux': 'travaux',
        'intervention': 'intervention',
        'collecte': 'autre',
        'autre': 'autre',
      };

      if (isEditMode && editId) {
        // Update existing event
        const { error: updateError } = await supabase
          .from('events')
          .update({
            title: title.trim(),
            description: description.trim(),
            event_type: categoryMap[category] || 'autre',
            location: location.trim(),
            starts_at: startsAt.toISOString(),
            ends_at: endsAt?.toISOString() || null,
            visibility: visibilityMap[invitationType] || 'all_members',
          })
          .eq('id', editId);

        if (updateError) {
          console.error('Error updating event:', updateError);
          setError('Erreur lors de la modification');
          setIsCreating(false);
          return;
        }

        setIsCreating(false);
        router.push(`/communication/evenements/${editId}?updated=1`);
      } else {
        // Create new event
        const { data: newEvent, error: insertError } = await supabase
          .from('events')
          .insert({
            copro_id: currentCoproId,
            created_by: user.id,
            title: title.trim(),
            description: description.trim(),
            event_type: categoryMap[category] || 'autre',
            location: location.trim(),
            starts_at: startsAt.toISOString(),
            ends_at: endsAt?.toISOString() || null,
            all_day: false,
            visibility: visibilityMap[invitationType] || 'all_members',
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating event:', insertError);
          setError('Erreur lors de la création');
          setIsCreating(false);
          return;
        }

        setIsCreating(false);
        router.push('/communication/evenements?success=1');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Erreur inattendue');
      setIsCreating(false);
    }
  }, [validateForm, currentCoproId, isEditMode, editId, title, description, category, location, date, time, endDate, endTime, invitationType, router]);

  const handleSaveDraft = useCallback(async () => {
    setError('Les brouillons ne sont pas encore supportés');
    setIsSavingDraft(false);
  }, []);

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
