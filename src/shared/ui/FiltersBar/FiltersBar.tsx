'use client';

import { useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { Search, X, Calendar, ChevronDown } from 'lucide-react';
import styles from './FiltersBar.module.css';

export interface DatePreset {
  key: string;
  label: string;
  getValue: () => { start: Date; end: Date };
}

export interface FilterChip {
  key: string;
  label: string;
  value: string;
  onRemove: () => void;
}

export interface FiltersBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  datePresets?: DatePreset[];
  activeDatePreset?: string | null;
  onDatePresetChange?: (preset: DatePreset | null) => void;
  chips?: FilterChip[];
  children?: ReactNode;
  className?: string;
}

export function FiltersBar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Rechercher...',
  datePresets,
  activeDatePreset,
  onDatePresetChange,
  chips,
  children,
  className = '',
}: FiltersBarProps) {
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const dateMenuRef = useRef<HTMLDivElement>(null);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange?.(e.target.value);
    },
    [onSearchChange]
  );

  const handleClearSearch = useCallback(() => {
    onSearchChange?.('');
  }, [onSearchChange]);

  const handleDatePresetSelect = useCallback(
    (preset: DatePreset | null) => {
      onDatePresetChange?.(preset);
      setIsDateMenuOpen(false);
    },
    [onDatePresetChange]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateMenuRef.current && !dateMenuRef.current.contains(event.target as Node)) {
        setIsDateMenuOpen(false);
      }
    };

    if (isDateMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDateMenuOpen]);

  const activePresetLabel = datePresets?.find((p) => p.key === activeDatePreset)?.label;

  return (
    <div className={`${styles.bar} ${className}`}>
      <div className={styles.filters}>
        {onSearchChange && (
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              value={searchValue}
              onChange={handleSearchChange}
              placeholder={searchPlaceholder}
              className={styles.searchInput}
            />
            {searchValue && (
              <button
                type="button"
                onClick={handleClearSearch}
                className={styles.clearButton}
                aria-label="Effacer la recherche"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {datePresets && datePresets.length > 0 && (
          <div className={styles.datePresetWrapper} ref={dateMenuRef}>
            <button
              type="button"
              className={`${styles.datePresetButton} ${activeDatePreset ? styles.active : ''}`}
              onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
              aria-expanded={isDateMenuOpen}
            >
              <Calendar size={16} />
              <span>{activePresetLabel || 'Période'}</span>
              <ChevronDown size={14} className={isDateMenuOpen ? styles.rotated : ''} />
            </button>
            {isDateMenuOpen && (
              <div className={styles.datePresetMenu}>
                {activeDatePreset && (
                  <button
                    type="button"
                    className={styles.datePresetOption}
                    onClick={() => handleDatePresetSelect(null)}
                  >
                    Toutes les dates
                  </button>
                )}
                {datePresets.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    className={`${styles.datePresetOption} ${
                      activeDatePreset === preset.key ? styles.selected : ''
                    }`}
                    onClick={() => handleDatePresetSelect(preset)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {children}
      </div>

      {chips && chips.length > 0 && (
        <div className={styles.chips}>
          {chips.map((chip) => (
            <span key={chip.key} className={styles.chip}>
              <span className={styles.chipLabel}>{chip.label}:</span>
              <span className={styles.chipValue}>{chip.value}</span>
              <button
                type="button"
                onClick={chip.onRemove}
                className={styles.chipRemove}
                aria-label={`Supprimer le filtre ${chip.label}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export const DEFAULT_DATE_PRESETS: DatePreset[] = [
  {
    key: 'today',
    label: "Aujourd'hui",
    getValue: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      return { start, end };
    },
  },
  {
    key: 'week',
    label: 'Cette semaine',
    getValue: () => {
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(now.getFullYear(), now.getMonth(), diff);
      const end = new Date();
      return { start, end };
    },
  },
  {
    key: 'month',
    label: 'Ce mois',
    getValue: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date();
      return { start, end };
    },
  },
  {
    key: 'quarter',
    label: 'Ce trimestre',
    getValue: () => {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), quarter * 3, 1);
      const end = new Date();
      return { start, end };
    },
  },
  {
    key: 'year',
    label: 'Cette année',
    getValue: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date();
      return { start, end };
    },
  },
];
