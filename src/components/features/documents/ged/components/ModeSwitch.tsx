'use client';

import { FolderTree, LayoutGrid } from 'lucide-react';
import clsx from 'clsx';
import type { NavigationMode } from '../domain/types';
import styles from '../../../../../app/(dashboard)/documents/ged/ged.module.css';

interface ModeSwitchProps {
  navigationMode: NavigationMode;
  onModeChange: (mode: NavigationMode) => void;
}

export function ModeSwitch({ navigationMode, onModeChange }: ModeSwitchProps) {
  return (
    <div className={styles.modeSwitch}>
      <button
        className={clsx(styles.modeBtn, navigationMode === 'folders' && styles.modeBtnActive)}
        onClick={() => onModeChange('folders')}
      >
        <FolderTree size={18} aria-hidden="true" />
        Navigation par dossiers
      </button>
      <button
        className={clsx(styles.modeBtn, navigationMode === 'all' && styles.modeBtnActive)}
        onClick={() => onModeChange('all')}
      >
        <LayoutGrid size={18} aria-hidden="true" />
        Tous les documents
      </button>
    </div>
  );
}
