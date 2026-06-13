'use client';

import { useRef, useEffect } from 'react';
import { Search, X, Sliders, History, TrendingUp, Tag, Folder, FileText, Clock } from 'lucide-react';
import clsx from 'clsx';
import type { SearchSuggestion } from '../domain/types';
import styles from '../../../../../app/(dashboard)/documents/ged/ged.module.css';

interface SearchBarProps {
  searchQuery: string;
  showDropdown: boolean;
  searchHistory: string[];
  suggestions: SearchSuggestion[];
  hasActiveFilters: boolean;
  showAdvancedFilters: boolean;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onClearSearch: () => void;
  onToggleFilters: () => void;
  onFocus: () => void;
  onBlur: () => void;
  onHistoryClick: (query: string) => void;
  onRemoveFromHistory: (query: string) => void;
  onSuggestionClick: (suggestion: SearchSuggestion) => void;
  onDropdownClose: () => void;
}

export function SearchBar({
  searchQuery,
  showDropdown,
  searchHistory,
  suggestions,
  hasActiveFilters,
  showAdvancedFilters,
  onSearchChange,
  onSearchSubmit,
  onClearSearch,
  onToggleFilters,
  onFocus,
  onBlur,
  onHistoryClick,
  onRemoveFromHistory,
  onSuggestionClick,
  onDropdownClose,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        onDropdownClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onDropdownClose]);

  return (
    <div className={styles.searchSection}>
      <form onSubmit={onSearchSubmit} className={styles.searchForm}>
        <div className={styles.searchContainer}>
          <Search size={20} className={styles.searchMainIcon} aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher par nom, type, date... (ex: facture EDF octobre)"
            className={styles.searchMainInput}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            aria-label="Rechercher un document"
          />
          {searchQuery && (
            <button
              type="button"
              className={styles.searchClear}
              onClick={onClearSearch}
              aria-label="Effacer la recherche"
            >
              <X size={18} />
            </button>
          )}
          <button
            type="button"
            className={clsx(
              styles.searchFilterBtn,
              (showAdvancedFilters || hasActiveFilters) && styles.searchFilterBtnActive
            )}
            onClick={onToggleFilters}
            aria-label="Filtres avancés"
          >
            <Sliders size={18} />
            {hasActiveFilters && <span className={styles.filterBadge} />}
          </button>
        </div>

        {showDropdown && (suggestions.length > 0 || searchHistory.length > 0 || !searchQuery) && (
          <div ref={dropdownRef} className={styles.searchDropdown}>
            {searchHistory.length > 0 && !searchQuery && (
              <div className={styles.dropdownSection}>
                <div className={styles.dropdownHeader}>
                  <History size={14} />
                  <span>Recherches récentes</span>
                </div>
                {searchHistory.map((query) => (
                  <div key={query} className={styles.dropdownItem}>
                    <button
                      type="button"
                      className={styles.dropdownItemBtn}
                      onClick={() => onHistoryClick(query)}
                    >
                      <Clock size={14} className={styles.dropdownItemIcon} />
                      <span>{query}</span>
                    </button>
                    <button
                      type="button"
                      className={styles.dropdownItemRemove}
                      onClick={() => onRemoveFromHistory(query)}
                      aria-label="Supprimer de l'historique"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {suggestions.length > 0 && (
              <div className={styles.dropdownSection}>
                <div className={styles.dropdownHeader}>
                  <TrendingUp size={14} />
                  <span>Suggestions</span>
                </div>
                {suggestions.map((suggestion) => (
                  <button
                    key={`${suggestion.type}-${suggestion.value}`}
                    type="button"
                    className={styles.dropdownSuggestion}
                    onClick={() => onSuggestionClick(suggestion)}
                  >
                    <span className={styles.suggestionIcon} style={{ color: suggestion.color }}>
                      {suggestion.type === 'category' && <Tag size={14} />}
                      {suggestion.type === 'folder' && <Folder size={14} />}
                      {suggestion.type === 'document' && <FileText size={14} />}
                    </span>
                    <span className={styles.suggestionLabel}>{suggestion.label}</span>
                    <span className={styles.suggestionType}>
                      {suggestion.type === 'category' && 'Catégorie'}
                      {suggestion.type === 'folder' && 'Dossier'}
                      {suggestion.type === 'document' && 'Document'}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {!searchQuery && (
              <div className={styles.searchHelp}>
                <p>Tapez pour rechercher dans le nom, la catégorie ou le contenu des documents</p>
                <div className={styles.searchTips}>
                  <span>
                    <strong>Exemples :</strong>
                  </span>
                  <span>"facture EDF"</span>
                  <span>"PV AG 2024"</span>
                  <span>"contrat assurance"</span>
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
