'use client';

import { BookOpen, Building2, Scale, Tag, Sparkles } from 'lucide-react';
import { MAJORITES, type MajorityType, type TypeAG } from '@/lib/constants/resolutions';
import type { ResolutionFilters } from '@/hooks/modules/useResolutionLibrary';
import styles from '../../../../app/(dashboard)/ag/resolutions/resolutions.module.css';

const AG_TYPES: { value: TypeAG; label: string }[] = [
  { value: 'ORDINAIRE', label: 'AG Ordinaire' },
  { value: 'EXTRAORDINAIRE', label: 'AG Extraordinaire' },
];

interface ResolutionsFiltersProps {
  filters: ResolutionFilters;
  categories: string[];
  allTags: string[];
  onToggleCategory: (category: string) => void;
  onToggleAgType: (agType: TypeAG) => void;
  onToggleMajorite: (majorite: MajorityType) => void;
  onToggleTag: (tag: string) => void;
  onSetObligatoireOnly: (value: boolean) => void;
}

export function ResolutionsFilters({
  filters,
  categories,
  allTags,
  onToggleCategory,
  onToggleAgType,
  onToggleMajorite,
  onToggleTag,
  onSetObligatoireOnly,
}: ResolutionsFiltersProps) {
  return (
    <div className={styles.filtersPanel}>
      <div className={styles.filterSection}>
        <h3 className={styles.filterTitle}>
          <BookOpen size={16} />
          Catégories
        </h3>
        <div className={styles.filterChips}>
          {categories.map(cat => (
            <button
              key={cat}
              className={`${styles.filterChip} ${filters.categories.includes(cat) ? styles.filterChipActive : ''}`}
              onClick={() => onToggleCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.filterSection}>
        <h3 className={styles.filterTitle}>
          <Building2 size={16} />
          Type d&apos;AG
        </h3>
        <div className={styles.filterChips}>
          {AG_TYPES.map(agType => (
            <button
              key={agType.value}
              className={`${styles.filterChip} ${filters.agTypes.includes(agType.value) ? styles.filterChipActive : ''}`}
              onClick={() => onToggleAgType(agType.value)}
            >
              {agType.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.filterSection}>
        <h3 className={styles.filterTitle}>
          <Scale size={16} />
          Majorité requise
        </h3>
        <div className={styles.filterChips}>
          {Object.entries(MAJORITES).map(([key, maj]) => (
            <button
              key={key}
              className={`${styles.filterChip} ${filters.majorites.includes(key as MajorityType) ? styles.filterChipActive : ''}`}
              onClick={() => onToggleMajorite(key as MajorityType)}
            >
              {maj.nom}
            </button>
          ))}
        </div>
      </div>

      {allTags.length > 0 && (
        <div className={styles.filterSection}>
          <h3 className={styles.filterTitle}>
            <Tag size={16} />
            Tags
          </h3>
          <div className={styles.filterChips}>
            {allTags.slice(0, 20).map(tag => (
              <button
                key={tag}
                className={`${styles.filterChip} ${styles.filterChipTag} ${filters.tags.includes(tag) ? styles.filterChipActive : ''}`}
                onClick={() => onToggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={styles.filterSection}>
        <h3 className={styles.filterTitle}>
          <Sparkles size={16} />
          Options
        </h3>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={filters.obligatoireOnly}
            onChange={(e) => onSetObligatoireOnly(e.target.checked)}
          />
          <span>Résolutions obligatoires uniquement</span>
        </label>
      </div>
    </div>
  );
}
