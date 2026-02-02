'use client';

import styles from '@/app/(dashboard)/ag/[id]/resolutions/new/new-resolution.module.css';

interface CorpsSectionProps {
  corps: string;
  onCorpsChange: (corps: string) => void;
}

export function CorpsSection({ corps, onCorpsChange }: CorpsSectionProps) {
  return (
    <div className={styles.formGroup}>
      <label htmlFor="corps" className={styles.label}>
        Corps de la resolution
      </label>
      <textarea
        id="corps"
        className={styles.textarea}
        placeholder="Ajouter ici le corps de votre resolution"
        value={corps}
        onChange={(e) => onCorpsChange(e.target.value)}
        rows={10}
        required
      />
    </div>
  );
}
