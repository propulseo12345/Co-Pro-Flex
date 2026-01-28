'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCopro } from '@/providers/CoproContext';
import { createClient } from '@/lib/supabase/client';
import type { Attachment, VisibilityType, CategoryInfo } from '../types';

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

export function useWallEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentCoproId } = useCopro();
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

  // Load existing post for edit mode from Supabase
  useEffect(() => {
    if (!isEditMode || !editId || !currentCoproId) {
      setIsLoading(false);
      return;
    }

    const fetchPost = async () => {
      const supabase = createClient();
      const { data: post, error: fetchError } = await supabase
        .from('v_wall_feed')
        .select('*')
        .eq('id', editId)
        .eq('copro_id', currentCoproId)
        .single();

      if (fetchError || !post) {
        console.error('Error fetching post for edit:', fetchError);
        setIsLoading(false);
        return;
      }

      setTitle(post.title || '');
      setContent(post.content || '');
      setCategory(post.category || 'annonce');
      setIsPinned(post.is_pinned || false);
      // TODO: Load attachments when document system is connected
      setIsLoading(false);
    };

    fetchPost();
  }, [isEditMode, editId, currentCoproId]);

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
    if (!currentCoproId) { setError('Copropriété non trouvée'); return; }

    setIsPublishing(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('Vous devez être connecté');
        setIsPublishing(false);
        return;
      }

      // Map visibility to enum
      const visibilityMap: Record<string, 'all_members' | 'council_only' | 'managers_only'> = {
        'tous': 'all_members',
        'conseil': 'council_only',
        'etage': 'all_members', // TODO: Handle group visibility
      };

      // Map frontend category to DB enum
      const categoryMap: Record<string, 'information' | 'urgent' | 'question' | 'event' | 'other'> = {
        'annonce': 'information',
        'travaux': 'urgent',
        'social': 'other',
        'securite': 'urgent',
        'evenements': 'event',
        'information': 'information',
        'urgent': 'urgent',
        'question': 'question',
        'event': 'event',
        'other': 'other',
      };

      if (isEditMode && editId) {
        // Update existing post
        const { error: updateError } = await supabase
          .from('wall_posts')
          .update({
            title: title.trim(),
            content: content.trim(),
            category: categoryMap[category] || 'information',
            is_pinned: isPinned,
            visibility: visibilityMap[visibility] || 'all_members',
            updated_at: new Date().toISOString(),
          })
          .eq('id', editId);

        if (updateError) {
          console.error('Error updating post:', updateError);
          setError('Erreur lors de la modification');
          setIsPublishing(false);
          return;
        }
      } else {
        // Create new post
        const { error: insertError } = await supabase
          .from('wall_posts')
          .insert({
            copro_id: currentCoproId,
            author_id: user.id,
            title: title.trim(),
            content: content.trim(),
            category: categoryMap[category] || 'information',
            is_pinned: isPinned,
            visibility: visibilityMap[visibility] || 'all_members',
          });

        if (insertError) {
          console.error('Error creating post:', insertError);
          setError('Erreur lors de la création');
          setIsPublishing(false);
          return;
        }
      }

      setIsPublishing(false);
      router.push('/communication/mur?success=1');
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Erreur inattendue');
      setIsPublishing(false);
    }
  }, [title, content, visibility, selectedGroups, isEditMode, editId, category, isPinned, currentCoproId, router]);

  const handleSaveDraft = useCallback(async () => {
    setError(null);
    if (!title.trim()) { setError('Veuillez saisir au moins un titre pour enregistrer le brouillon'); return; }

    // Drafts not yet supported in Supabase - show message
    setError('Les brouillons ne sont pas encore supportés');
    setIsSavingDraft(false);
  }, [title]);

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
