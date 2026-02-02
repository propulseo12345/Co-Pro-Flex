'use client';

import Link from 'next/link';
import { User, Clock, Tag, Calendar, AlertCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SearchResult } from '../hooks/useRecherchePage';
import styles from '@/app/(dashboard)/communication/recherche/recherche.module.css';

interface SearchResultsProps {
  results: SearchResult[];
  isSearching: boolean;
  getTypeIcon: (type: string) => LucideIcon;
  getTypeLabel: (type: string) => string;
  getTypeColor: (type: string) => string;
}

export function SearchResults({
  results,
  isSearching,
  getTypeIcon,
  getTypeLabel,
  getTypeColor,
}: SearchResultsProps) {
  if (isSearching) {
    return (
      <div className={styles.results}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Recherche en cours...</p>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className={styles.results}>
        <div className={styles.emptyState}>
          <AlertCircle size={48} aria-hidden="true" />
          <h3>Aucun résultat trouvé</h3>
          <p>Essayez de modifier vos critères de recherche ou vos filtres</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.results}>
      <div className={styles.resultsHeader}>
        <p className={styles.resultsCount}>
          {results.length} résultat{results.length > 1 ? 's' : ''} trouvé{results.length > 1 ? 's' : ''}
        </p>
      </div>

      <div className={styles.resultsList}>
        {results.map((result) => {
          const Icon = getTypeIcon(result.type);
          const typeColor = getTypeColor(result.type);

          return (
            <Link
              key={result.id}
              href={result.link}
              className={styles.resultCard}
              aria-hidden="true"
            >
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
    </div>
  );
}
