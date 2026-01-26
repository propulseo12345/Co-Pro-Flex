'use client';

import { useState } from 'react';
import {
  Search,
  Filter,
  MessageSquare,
  Mail,
  Calendar,
  MessageCircle,
  Clock,
  User,
  Tag,
  FileText,
  AlertCircle,
  X
} from 'lucide-react';
import styles from './recherche.module.css';
import Link from 'next/link';
import clsx from 'clsx';

interface SearchResult {
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

const RESULT_TYPES = [
  { id: 'tous', label: 'Tous les résultats', icon: Search },
  { id: 'message', label: 'Messages privés', icon: MessageCircle },
  { id: 'mail', label: 'Mails', icon: Mail },
  { id: 'mur', label: 'Mur', icon: MessageSquare },
  { id: 'evenement', label: 'Événements', icon: Calendar }
];

export default function RechercheGlobalePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('tous');
  const [dateFilter, setDateFilter] = useState('all');
  const [authorFilter, setAuthorFilter] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    // Simulate search
    setTimeout(() => setIsSearching(false), 500);
  };

  const filteredResults = MOCK_RESULTS.filter(result => {
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

  const getTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      message: MessageCircle,
      mail: Mail,
      mur: MessageSquare,
      evenement: Calendar
    };
    return icons[type] || FileText;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      message: 'Message privé',
      mail: 'Mail',
      mur: 'Publication',
      evenement: 'Événement'
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      message: '#8b5cf6',
      mail: '#4f46e5',
      mur: '#0284c7',
      evenement: '#f59e0b'
    };
    return colors[type] || '#6b7280';
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedType('tous');
    setDateFilter('all');
    setAuthorFilter('');
  };

  return (
    <div className="container">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Recherche globale</h1>
          <p className={styles.subtitle}>
            Recherchez dans tous vos messages, mails, publications et événements
          </p>
        </div>
      </div>

      {/* Search Form */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <div className={styles.mainSearch}>
            <Search size={20} className={styles.searchIcon} aria-hidden="true" />
            <input type="text" placeholder="Rechercher par mot-clé, titre, contenu, auteur..." className={styles.searchInput} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => setSearchQuery('')}
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Type</label>
              <select
                className={styles.select}
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                {RESULT_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Date</label>
              <select
                className={styles.select}
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option value="all">Toutes les dates</option>
                <option value="today">Aujourd'hui</option>
                <option value="week">Cette semaine</option>
                <option value="month">Ce mois</option>
                <option value="year">Cette année</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Auteur</label>
              <input type="text" placeholder="Filtrer par auteur" className={styles.select} value={authorFilter} onChange={(e) => setAuthorFilter(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={clearFilters}
              style={{ marginTop: '1.5rem' }}
            >
              <X size={16} style={{ marginRight: 6 }} aria-hidden="true" />
              Effacer
            </button>
          </div>
        </form>
      </div>

      {/* Type Filter Tabs */}
      <div className={styles.typeTabs}>
        {RESULT_TYPES.map((type) => {
          const Icon = type.icon;
          const count = type.id === 'tous'
            ? filteredResults.length
            : filteredResults.filter(r => r.type === type.id).length;

          return (
            <button
              key={type.id}
              className={clsx(
                styles.typeTab,
                selectedType === type.id && styles.active
              )}
              onClick={() => setSelectedType(type.id)}
            >
              <Icon size={18} aria-hidden="true" />
              {type.label}
              <span className={styles.count}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Results */}
      <div className={styles.results}>
        {isSearching ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Recherche en cours...</p>
          </div>
        ) : filteredResults.length > 0 ? (
          <>
            <div className={styles.resultsHeader}>
              <p className={styles.resultsCount}>
                {filteredResults.length} résultat{filteredResults.length > 1 ? 's' : ''} trouvé{filteredResults.length > 1 ? 's' : ''}
              </p>
            </div>

            <div className={styles.resultsList}>
              {filteredResults.map((result) => {
                const Icon = getTypeIcon(result.type);
                const typeColor = getTypeColor(result.type);

                return (
                  <Link key={result.id}
                    href={result.link}
                    className={styles.resultCard} aria-hidden="true">
                    <div className={styles.resultIcon} style={{ background: `${typeColor}20` }}>
                      <Icon size={24} style={{ color: typeColor }} aria-hidden="true" />
                    </div>

                    <div className={styles.resultContent}>
                      <div className={styles.resultHeader}>
                        <h3 className={styles.resultTitle}>{result.title}</h3>
                        <span
                          className={styles.typeBadge}
                          style={{ background: `${typeColor}20`, color: typeColor }}
                        >
                          {getTypeLabel(result.type)}
                        </span>
                      </div>

                      <p className={styles.resultText}>{result.content}</p>

                      <div className={styles.resultMeta}>
                        {result.author && (
                          <span className={styles.metaItem}>
                            <User size={14} aria-hidden="true" />
                            {result.author}
                          </span>
                        )}
                        <span className={styles.metaItem}>
                          <Clock size={14} aria-hidden="true" />
                          {new Date(result.date).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {result.metadata?.category && (
                          <span className={styles.metaItem}>
                            <Tag size={14} aria-hidden="true" />
                            {result.metadata.category}
                          </span>
                        )}
                        {result.metadata?.location && (
                          <span className={styles.metaItem}>
                            <Calendar size={14} aria-hidden="true" />
                            {result.metadata.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <AlertCircle size={48} aria-hidden="true" />
            <h3>Aucun résultat trouvé</h3>
            <p>Essayez de modifier vos critères de recherche ou vos filtres</p>
          </div>
        )}
      </div>
    </div>
  );
}
