'use client';

import { LayoutList, Columns3 } from 'lucide-react';
import clsx from 'clsx';
import type { FacturesViewMode } from '../types';
import styles from './FacturesViewToggle.module.css';

interface FacturesViewToggleProps {
  viewMode: FacturesViewMode;
  onViewModeChange: (mode: FacturesViewMode) => void;
}

export function FacturesViewToggle({ viewMode, onViewModeChange }: FacturesViewToggleProps) {
  return (
    <div className={styles.toggle}>
      <button
        className={clsx(styles.btn, viewMode === 'table' && styles.active)}
        onClick={() => onViewModeChange('table')}
      >
        <LayoutList size={14} /> Table
      </button>
      <button
        className={clsx(styles.btn, viewMode === 'kanban' && styles.active)}
        onClick={() => onViewModeChange('kanban')}
      >
        <Columns3 size={14} /> Kanban
      </button>
    </div>
  );
}
