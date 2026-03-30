'use client';

import {
  MessageSquare,
  Info,
  AlertTriangle,
  HelpCircle,
  Calendar,
  BarChart3,
  Pin,
  User,
} from 'lucide-react';
import clsx from 'clsx';
import type { PostCategory } from '@/features/communication/mur/domain/types';
import { CATEGORY_CONFIG } from '@/features/communication/mur/domain/constants';
import type { CategoryFilterValue } from '@/features/communication/mur/hooks';
import styles from './MurSidebar.module.css';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface MurSidebarProps {
  categoryFilter: CategoryFilterValue;
  onCategoryChange: (filter: CategoryFilterValue) => void;
  postCounts: Record<string, number>;
}

// ----------------------------------------------------------------------------
// Icon map
// ----------------------------------------------------------------------------

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  Info,
  AlertTriangle,
  HelpCircle,
  Calendar,
  BarChart3,
};

// ----------------------------------------------------------------------------
// Sidebar items
// ----------------------------------------------------------------------------

interface SidebarItem {
  id: CategoryFilterValue;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

const POPULAR_TAGS = ['Travaux 2025', 'Ravalement', 'Tri sélectif', 'Bruit', 'AG', 'Convivialité'];

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export function MurSidebar({ categoryFilter, onCategoryChange, postCounts }: MurSidebarProps) {
  const categoryItems: SidebarItem[] = [
    { id: 'all', label: 'Toutes', icon: MessageSquare },
    ...Object.entries(CATEGORY_CONFIG).map(([key, config]) => ({
      id: key as PostCategory,
      label: config.label,
      icon: ICON_MAP[config.icon] || MessageSquare,
    })),
  ];

  const specialItems: SidebarItem[] = [
    { id: 'pinned', label: 'Epinglés', icon: Pin },
    { id: 'mine', label: 'Mes publications', icon: User },
  ];

  return (
    <aside className={styles.sidebar}>
      <div>
        <h3 className={styles.sectionTitle}>Catégories</h3>
        <div className={styles.categoryList}>
          {categoryItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={clsx(styles.categoryBtn, categoryFilter === item.id && styles.active)}
                onClick={() => onCategoryChange(item.id)}
              >
                <Icon size={18} />
                <span className={styles.categoryLabel}>{item.label}</span>
                {(postCounts[item.id] ?? 0) > 0 && (
                  <span className={styles.categoryCount}>{postCounts[item.id]}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <hr className={styles.divider} />

      <div>
        <h3 className={styles.sectionTitle}>Filtres</h3>
        <div className={styles.categoryList}>
          {specialItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={clsx(styles.categoryBtn, categoryFilter === item.id && styles.active)}
                onClick={() => onCategoryChange(item.id)}
              >
                <Icon size={18} />
                <span className={styles.categoryLabel}>{item.label}</span>
                {(postCounts[item.id] ?? 0) > 0 && (
                  <span className={styles.categoryCount}>{postCounts[item.id]}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <hr className={styles.divider} />

      <div className={styles.tagsSection}>
        <h3 className={styles.sectionTitle}>Tags populaires</h3>
        <div className={styles.tagsList}>
          {POPULAR_TAGS.map((tag) => (
            <span key={tag} className={styles.tagItem}>
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}
