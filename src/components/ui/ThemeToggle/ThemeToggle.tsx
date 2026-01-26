'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/providers/ThemeProvider';
import styles from './ThemeToggle.module.css';

export default function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  // Ne rien afficher tant que le composant n'est pas monté côté client
  if (!mounted) {
    return (
      <div className={styles.toggleSkeleton}>
        <div className={styles.iconWrapper}>
          <div className={styles.iconPlaceholder} />
        </div>
        <span className={styles.label}>Chargement...</span>
      </div>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={styles.toggle}
      aria-label={`Basculer vers le thème ${theme === 'light' ? 'sombre' : 'clair'}`}
      title={`Basculer vers le thème ${theme === 'light' ? 'sombre' : 'clair'}`}
    >
      <div className={styles.iconWrapper}>
        <Sun
          className={`${styles.icon} ${styles.sunIcon} ${theme === 'light' ? styles.active : ''}`}
          size={18}
          aria-hidden="true"
        />
        <Moon
          className={`${styles.icon} ${styles.moonIcon} ${theme === 'dark' ? styles.active : ''}`}
          size={18}
          aria-hidden="true"
        />
      </div>
      <span className={styles.label}>
        {theme === 'light' ? 'Mode clair' : 'Mode nuit'}
      </span>
    </button>
  );
}
