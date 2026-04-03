'use client';

import { Sun, Moon } from 'lucide-react';
import { useDemoTheme } from './DemoThemeContext';
import styles from './FeatureGrid.module.css';

interface DemoThemeToggleProps {
  labelColor: string;
}

export function DemoThemeToggle({ labelColor }: DemoThemeToggleProps) {
  const { demoTheme, toggleDemoTheme } = useDemoTheme();

  return (
    <button
      className={styles.themeToggle}
      onClick={toggleDemoTheme}
      aria-label={`Basculer les démos en mode ${demoTheme === 'dark' ? 'light' : 'dark'}`}
      style={{ '--label-color': labelColor } as React.CSSProperties}
    >
      {demoTheme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
      <span>{demoTheme === 'dark' ? 'Light' : 'Dark'}</span>
    </button>
  );
}
