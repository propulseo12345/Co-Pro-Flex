'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Attachment, VisibilityType, CategoryInfo } from '../types';

const MUR_STORAGE_KEY = 'mur-copro-data';

export const WALL_CATEGORIES: (CategoryInfo & { icon: string })[] = [
  { id: 'annonce', label: 'Annonce', color: '#10b981', icon: 'MessageSquare' },
  { id: 'travaux', label: 'Travaux', color: '#f59e0b', icon: 'AlertCircle' },
  { id: 'social', label: 'Social', color: '#8b5cf6', icon: 'Users' },
  { id: 'securite', label: 'Sécurité', color: '#ef4444', icon: 'Lock' },
  { id: 'evenements', label: 'Événements', color: '#3b82f6', icon: 'Clock' },
];

export const POPULAR_TAGS = ['Travaux 2026', 'Événement', 'Sécurité', 'Convivialité', 'Information', 'Urgent'];

export const VISIBILITY_OPTIONS = [
  { id: 'tous', label: 'Tous les copropriétaires', icon: 'Users', description: 'Visible par tous les membres de la copropriété' },
  { id: 'conseil', label: 'Conseil syndical', icon: 'Building', description: 'Visible uniquement par le conseil syndical' },
  { id: 'etage', label: 'Par étage / bâtiment', icon: 'Building', description: 'Visible par un groupe spécifique' },
];

export const ETAGES_BATIMENTS = [
  { id: 'bat-a', label: 'Bâtiment A' },
  { id: 'bat-b', label: 'Bâtiment B' },
  { id: 'etage-1', label: 'Étage 1' },
  { id: 'etage-2', label: 'Étage 2' },
  { id: 'etage-3', label: 'Étage 3' },
  { id: 'etage-4', label: 'Étage 4' },
  { id: 'etage-5', label: 'Étage 5' },
  { id: 'etage-6', label: 'Étage 6' },
];

const MOCK_PUBLICATIONS = [
  { id: 1, author: 'Syndic - Jean DUPONT', authorRole: 'syndic' as const, title: 'Travaux de réfection de la toiture - Planning', content: 'Suite à la décision de l\'AG, les travaux de réfection de la toiture débuteront le 15 janvier 2026. L\'entreprise Toiture Pro interviendra du lundi au vendredi de 8h à 17h...', category: 'travaux' as const, date: '2025-11-28T10:00:00', isPinned: true, isLocked: false, likes: 12, comments: 5, hasAttachment: true, tags: ['Toiture', 'Travaux 2026'] },
  { id: 2, author: 'Marie MARTIN', authorRole: 'conseil' as const, title: 'Organisation Fête des Voisins 2026', content: 'Bonjour à tous, comme chaque année, nous aimerions organiser la Fête des Voisins. Qui serait intéressé pour participer à l\'organisation ?', category: 'social' as const, date: '2025-11-27T14:30:00', isPinned: false, isLocked: false, likes: 24, comments: 18, hasAttachment: false, tags: ['Événement', 'Convivialité'] },
  { id: 3, author: 'Pierre LEBLANC', authorRole: 'copropriétaire' as const, title: 'Rappel - Code d\'accès immeuble', content: 'Merci de ne pas communiquer le code d\'accès de l\'immeuble à des personnes extérieures. Plusieurs livraisons ont été laissées dans le hall sans autorisation.', category: 'securite' as const, date: '2025-11-26T16:45:00', isPinned: true, isLocked: true, likes: 8, comments: 3, hasAttachment: false, tags: ['Sécurité'] }
];

export function useWallEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editId = searchParams.get('edit');
  const isEditMode = !!editId;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('annonce');
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [visibility, setVisibility] = useState<VisibilityType>('tous');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isEditMode);

  useEffect(() => {
    if (!isEditMode || !editId) return;

    let publication = null;
    const stored = localStorage.getItem(MUR_STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      if (data.drafts) publication = data.drafts.find((p: { id: number }) => p.id === parseInt(editId));
      if (!publication && data.list) publication = data.list.find((p: { id: number }) => p.id === parseInt(editId));
      if (!publication && data.publications && data.publications[editId]) publication = data.publications[editId];
    }

    if (!publication) publication = MOCK_PUBLICATIONS.find(p => p.id === parseInt(editId));

    if (publication) {
      setTitle(publication.title || '');
      setContent(publication.content || '');
      setCategory(publication.category || 'annonce');
      setTags(publication.tags || []);
      setIsPinned(publication.isPinned || false);
      setIsLocked(publication.isLocked || false);
      if (publication.attachments) {
        setAttachments(publication.attachments.map((a: { id?: string; name: string; type?: string; size?: string }) => ({
          id: a.id || `${Date.now()}-${a.name}`,
          name: a.name,
          type: a.type || 'document',
          size: a.size || 'N/A'
        })));
      }
    }
    setIsLoading(false);
  }, [isEditMode, editId]);

  const handleTagToggle = useCallback((tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }, []);

  const handleAddCustomTag = useCallback(() => {
    if (customTag.trim() && !tags.includes(customTag.trim())) {
      setTags(prev => [...prev, customTag.trim()]);
      setCustomTag('');
    }
  }, [customTag, tags]);

  const handleRemoveTag = useCallback((tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  }, []);

  const handleGroupToggle = useCallback((groupId: string) => {
    setSelectedGroups(prev => prev.includes(groupId) ? prev.filter(g => g !== groupId) : [...prev, groupId]);
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

  const handlePublish = useCallback(async () => {
    setError(null);

    if (!title.trim()) { setError('Veuillez saisir un titre'); return; }
    if (!content.trim()) { setError('Veuillez saisir le contenu de votre publication'); return; }
    if (visibility === 'etage' && selectedGroups.length === 0) { setError('Veuillez sélectionner au moins un groupe'); return; }

    setIsPublishing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const stored = localStorage.getItem(MUR_STORAGE_KEY);
    const data = stored ? JSON.parse(stored) : { list: [], publications: {}, comments: {}, drafts: [] };

    if (isEditMode && editId) {
      const pubId = parseInt(editId);
      if (data.list) {
        data.list = data.list.map((p: { id: number }) => {
          if (p.id === pubId) {
            return { ...p, title: title.trim(), content: content.trim(), category, isPinned, isLocked, hasAttachment: attachments.length > 0, tags, updatedAt: new Date().toISOString() };
          }
          return p;
        });
      }
      if (data.publications && data.publications[editId]) {
        data.publications[editId] = { ...data.publications[editId], title: title.trim(), content: content.trim(), category, isPinned, isLocked, tags, attachments: attachments.map(a => ({ id: a.id, name: a.name, type: a.type, size: a.size, url: '#' })), updatedAt: new Date().toISOString() };
      }
      if (data.drafts) data.drafts = data.drafts.filter((d: { id: number }) => d.id !== pubId);
    } else {
      const newId = Date.now();
      const newPublication = { id: newId, author: 'Moi', authorRole: 'copropriétaire' as const, title: title.trim(), content: content.trim(), category: category as 'travaux' | 'social' | 'securite' | 'evenements' | 'annonce', date: new Date().toISOString(), isPinned, isLocked, likes: 0, comments: 0, hasAttachment: attachments.length > 0, tags };
      const fullPublication = { ...newPublication, isLiked: false, attachments: attachments.map(a => ({ id: a.id, name: a.name, type: a.type, size: a.size, url: '#' })), comments: [] };

      data.list = [newPublication, ...(data.list || [])];
      data.publications = data.publications || {};
      data.publications[newId.toString()] = fullPublication;
    }

    localStorage.setItem(MUR_STORAGE_KEY, JSON.stringify(data));
    setIsPublishing(false);
    router.push('/communication/mur?success=1');
  }, [title, content, visibility, selectedGroups, isEditMode, editId, category, isPinned, isLocked, attachments, tags, router]);

  const handleSaveDraft = useCallback(async () => {
    setError(null);
    if (!title.trim()) { setError('Veuillez saisir au moins un titre pour enregistrer le brouillon'); return; }

    setIsSavingDraft(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    const stored = localStorage.getItem(MUR_STORAGE_KEY);
    const data = stored ? JSON.parse(stored) : { list: [], publications: {}, comments: {}, drafts: [] };

    data.drafts = data.drafts || [];
    const draftId = isEditMode && editId ? parseInt(editId) : Date.now();
    const draft = { id: draftId, author: 'Moi', authorRole: 'copropriétaire' as const, title: title.trim(), content: content.trim(), category: category as 'travaux' | 'social' | 'securite' | 'evenements' | 'annonce', date: new Date().toISOString(), isPinned, isLocked, hasAttachment: attachments.length > 0, tags, attachments: attachments.map(a => ({ id: a.id, name: a.name, type: a.type, size: a.size })), isDraft: true };

    const existingIndex = data.drafts.findIndex((d: { id: number }) => d.id === draftId);
    if (existingIndex >= 0) data.drafts[existingIndex] = draft;
    else data.drafts.unshift(draft);

    localStorage.setItem(MUR_STORAGE_KEY, JSON.stringify(data));
    setIsSavingDraft(false);
    router.push('/communication/mur?draft=1');
  }, [title, content, category, isPinned, isLocked, attachments, tags, isEditMode, editId, router]);

  const selectedCategory = WALL_CATEGORIES.find(c => c.id === category);

  return {
    isEditMode,
    editId,
    isLoading,
    title, setTitle,
    content, setContent,
    category, setCategory,
    tags,
    customTag, setCustomTag,
    isPinned, setIsPinned,
    isLocked, setIsLocked,
    visibility, setVisibility,
    selectedGroups,
    attachments,
    isPublishing,
    isSavingDraft,
    error, setError,
    fileInputRef,
    selectedCategory,
    categories: WALL_CATEGORIES,
    popularTags: POPULAR_TAGS,
    visibilityOptions: VISIBILITY_OPTIONS,
    etagesBatiments: ETAGES_BATIMENTS,
    handleTagToggle,
    handleAddCustomTag,
    handleRemoveTag,
    handleGroupToggle,
    handleFileSelect,
    removeAttachment,
    handlePublish,
    handleSaveDraft,
  };
}
