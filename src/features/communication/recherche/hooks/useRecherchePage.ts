'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Search,
  MessageSquare,
  Mail,
  Calendar,
  MessageCircle,
  FileText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface SearchResult {
  id: number;
  type: 'message' | 'mail' | 'mur' | 'evenement';
  title: string;
  content: string;
  author?: string;
  date: string;
  metadata?: {
    participants?: string[];
    category?: string;
    status?: string;
    location?: string;
  };
  link: string;
}

export interface ResultType {
  id: string;
  label: string;
  icon: LucideIcon;
}

const MOCK_RESULTS: SearchResult[] = [
  {
    id: 1,
    type: 'mail',
    title: 'Convocation Assemblée Générale - 15 Décembre 2025',
    content: 'Nous avons le plaisir de vous convoquer à l\'Assemblée Générale...',
    author: 'Syndic - Jean DUPONT',
    date: '2025-11-28T14:30:00',
    metadata: {
      participants: ['Tous les copropriétaires'],
      status: 'Envoyé'
    },
    link: '/communication/mail/1'
  },
  {
    id: 2,
    type: 'mur',
    title: 'Travaux de réfection de la toiture - Planning',
    content: 'Suite à la décision de l\'AG, les travaux de réfection de la toiture débuteront le 15 janvier 2026...',
    author: 'Syndic - Jean DUPONT',
    date: '2025-11-28T10:00:00',
    metadata: {
      category: 'Travaux'
    },
    link: '/communication/mur/1'
  },
  {
    id: 3,
    type: 'evenement',
    title: 'Assemblée Générale Ordinaire',
    content: 'Assemblée Générale Ordinaire pour l\'exercice 2025. Ordre du jour : approbation des comptes...',
    author: 'Syndic - Jean DUPONT',
    date: '2025-12-15T18:00:00',
    metadata: {
      location: 'Salle de réunion - RDC',
      category: 'AG'
    },
    link: '/communication/evenements/1'
  },
  {
    id: 4,
    type: 'message',
    title: 'Conversation avec Marie Martin',
    content: 'Merci pour votre retour concernant les travaux...',
    author: 'Marie Martin',
    date: '2025-11-28T10:30:00',
    metadata: {
      participants: ['Jean Dupont', 'Marie Martin']
    },
    link: '/communication/messagerie-privee/1'
  }
];

export const RESULT_TYPES: ResultType[] = [
  { id: 'tous', label: 'Tous les résultats', icon: Search },
  { id: 'message', label: 'Messages privés', icon: MessageCircle },
  { id: 'mail', label: 'Mails', icon: Mail },
  { id: 'mur', label: 'Mur', icon: MessageSquare },
  { id: 'evenement', label: 'Événements', icon: Calendar }
];

const TYPE_ICONS: Record<string, LucideIcon> = {
  message: MessageCircle,
  mail: Mail,
  mur: MessageSquare,
  evenement: Calendar
};

const TYPE_LABELS: Record<string, string> = {
  message: 'Message privé',
  mail: 'Mail',
  mur: 'Publication',
  evenement: 'Événement'
};

const TYPE_COLORS: Record<string, string> = {
  message: '#8b5cf6',
  mail: '#4f46e5',
  mur: '#0284c7',
  evenement: '#f59e0b'
};

export function useRecherchePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('tous');
  const [dateFilter, setDateFilter] = useState('all');
  const [authorFilter, setAuthorFilter] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    // Simulate search
    setTimeout(() => setIsSearching(false), 500);
  }, []);

  const filteredResults = useMemo(() => {
    return MOCK_RESULTS.filter(result => {
      const matchesType = selectedType === 'tous' || result.type === selectedType;
      const matchesQuery =
        !searchQuery ||
        result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        result.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        result.author?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAuthor =
        !authorFilter ||
        result.author?.toLowerCase().includes(authorFilter.toLowerCase());
      return matchesType && matchesQuery && matchesAuthor;
    });
  }, [searchQuery, selectedType, authorFilter]);

  const getTypeIcon = useCallback((type: string): LucideIcon => {
    return TYPE_ICONS[type] || FileText;
  }, []);

  const getTypeLabel = useCallback((type: string): string => {
    return TYPE_LABELS[type] || type;
  }, []);

  const getTypeColor = useCallback((type: string): string => {
    return TYPE_COLORS[type] || '#6b7280';
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedType('tous');
    setDateFilter('all');
    setAuthorFilter('');
  }, []);

  const getResultCount = useCallback((typeId: string): number => {
    if (typeId === 'tous') {
      return filteredResults.length;
    }
    return filteredResults.filter(r => r.type === typeId).length;
  }, [filteredResults]);

  return {
    // State
    searchQuery,
    setSearchQuery,
    selectedType,
    setSelectedType,
    dateFilter,
    setDateFilter,
    authorFilter,
    setAuthorFilter,
    isSearching,

    // Data
    filteredResults,
    resultTypes: RESULT_TYPES,

    // Handlers
    handleSearch,
    clearFilters,

    // Helpers
    getTypeIcon,
    getTypeLabel,
    getTypeColor,
    getResultCount,
  };
}
