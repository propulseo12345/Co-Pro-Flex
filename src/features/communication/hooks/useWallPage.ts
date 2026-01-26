'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Publication, PublicationDraft, RoleBadge } from '../types';

const MUR_STORAGE_KEY = 'mur-copro-data';

const MOCK_PUBLICATIONS: Publication[] = [
  {
    id: 1,
    author: 'Syndic - Jean DUPONT',
    authorRole: 'syndic',
    title: 'Travaux de réfection de la toiture - Planning',
    content: 'Suite à la décision de l\'AG, les travaux de réfection de la toiture débuteront le 15 janvier 2026. L\'entreprise Toiture Pro interviendra du lundi au vendredi de 8h à 17h...',
    category: 'travaux',
    date: '2025-11-28T10:00:00',
    isPinned: true,
    isLocked: false,
    likes: 12,
    comments: 5,
    hasAttachment: true,
    tags: ['Toiture', 'Travaux 2026']
  },
  {
    id: 2,
    author: 'Marie MARTIN',
    authorRole: 'conseil',
    title: 'Organisation Fête des Voisins 2026',
    content: 'Bonjour à tous, comme chaque année, nous aimerions organiser la Fête des Voisins. Qui serait intéressé pour participer à l\'organisation ?',
    category: 'social',
    date: '2025-11-27T14:30:00',
    isPinned: false,
    isLocked: false,
    likes: 24,
    comments: 18,
    hasAttachment: false,
    tags: ['Événement', 'Convivialité']
  },
  {
    id: 3,
    author: 'Pierre LEBLANC',
    authorRole: 'copropriétaire',
    title: 'Rappel - Code d\'accès immeuble',
    content: 'Merci de ne pas communiquer le code d\'accès de l\'immeuble à des personnes extérieures. Plusieurs livraisons ont été laissées dans le hall sans autorisation.',
    category: 'securite',
    date: '2025-11-26T16:45:00',
    isPinned: true,
    isLocked: true,
    likes: 8,
    comments: 3,
    hasAttachment: false,
    tags: ['Sécurité']
  }
];

export const WALL_CATEGORIES = [
  { id: 'tous', label: 'Tous', icon: 'MessageSquare' },
  { id: 'travaux', label: 'Travaux', icon: 'AlertCircle' },
  { id: 'social', label: 'Social', icon: 'MessageCircle' },
  { id: 'securite', label: 'Sécurité', icon: 'Lock' },
  { id: 'evenements', label: 'Événements', icon: 'Clock' },
  { id: 'annonce', label: 'Annonces', icon: 'Pin' }
];

export function useWallPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [publications, setPublications] = useState<Publication[]>(MOCK_PUBLICATIONS);
  const [drafts, setDrafts] = useState<PublicationDraft[]>([]);
  const [showDrafts, setShowDrafts] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(MUR_STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.list && Array.isArray(data.list)) {
          setPublications([...data.list, ...MOCK_PUBLICATIONS]);
        }
        if (data.drafts && Array.isArray(data.drafts)) {
          setDrafts(data.drafts);
        }
      } catch (e) { /* ignore */ }
    }
  }, []);

  const handleDeletePublication = useCallback((id: number) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette publication ?')) {
      setPublications(prev => prev.filter(p => p.id !== id));
      const stored = localStorage.getItem(MUR_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.list) data.list = data.list.filter((p: { id: number }) => p.id !== id);
        if (data.publications && data.publications[id.toString()]) delete data.publications[id.toString()];
        localStorage.setItem(MUR_STORAGE_KEY, JSON.stringify(data));
      }
    }
  }, []);

  const handleLikePublication = useCallback((id: number) => {
    const stored = localStorage.getItem(MUR_STORAGE_KEY);
    const data = stored ? JSON.parse(stored) : { list: [], publications: {}, likes: {} };
    data.likes = data.likes || {};
    const wasLiked = data.likes[id];
    data.likes[id] = !wasLiked;
    if (data.list) {
      data.list = data.list.map((p: { id: number; likes: number }) => {
        if (p.id === id) return { ...p, likes: wasLiked ? p.likes - 1 : p.likes + 1 };
        return p;
      });
    }
    localStorage.setItem(MUR_STORAGE_KEY, JSON.stringify(data));
  }, []);

  const handleTogglePin = useCallback((id: number) => {
    setPublications(prev => prev.map(p => p.id === id ? { ...p, isPinned: !p.isPinned } : p));
    const stored = localStorage.getItem(MUR_STORAGE_KEY);
    const data = stored ? JSON.parse(stored) : { list: [], publications: {} };
    if (data.list) {
      data.list = data.list.map((p: { id: number; isPinned: boolean }) => p.id === id ? { ...p, isPinned: !p.isPinned } : p);
    }
    if (data.publications && data.publications[id.toString()]) {
      data.publications[id.toString()].isPinned = !data.publications[id.toString()].isPinned;
    }
    localStorage.setItem(MUR_STORAGE_KEY, JSON.stringify(data));
  }, []);

  const handleDeleteDraft = useCallback((id: number) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce brouillon ?')) {
      setDrafts(prev => prev.filter(d => d.id !== id));
      const stored = localStorage.getItem(MUR_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.drafts) data.drafts = data.drafts.filter((d: { id: number }) => d.id !== id);
        localStorage.setItem(MUR_STORAGE_KEY, JSON.stringify(data));
      }
    }
  }, []);

  const handleEditPublication = useCallback((id: number) => {
    router.push(`/communication/mur/nouveau?edit=${id}`);
  }, [router]);

  const filteredPublications = publications.filter(pub => {
    const matchesCategory = selectedCategory === 'tous' || pub.category === selectedCategory;
    const matchesSearch =
      pub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pub.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pub.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const pinnedPubs = filteredPublications.filter(pub => pub.isPinned);
  const regularPubs = filteredPublications.filter(pub => !pub.isPinned);

  const getCategoryColor = useCallback((category: string) => {
    const colors: Record<string, string> = {
      travaux: '#f59e0b',
      social: '#8b5cf6',
      securite: '#ef4444',
      evenements: '#3b82f6',
      annonce: '#10b981'
    };
    return colors[category] || '#6b7280';
  }, []);

  const getRoleBadge = useCallback((role: string): RoleBadge => {
    const badges: Record<string, RoleBadge> = {
      syndic: { label: 'Syndic', color: '#4f46e5' },
      conseil: { label: 'Conseil Syndical', color: '#059669' },
      copropriétaire: { label: 'Copropriétaire', color: '#6b7280' }
    };
    return badges[role] || badges.copropriétaire;
  }, []);

  return {
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    publications,
    drafts,
    showDrafts,
    setShowDrafts,
    filteredPublications,
    pinnedPubs,
    regularPubs,
    categories: WALL_CATEGORIES,
    getCategoryColor,
    getRoleBadge,
    handleDeletePublication,
    handleLikePublication,
    handleTogglePin,
    handleDeleteDraft,
    handleEditPublication,
  };
}
