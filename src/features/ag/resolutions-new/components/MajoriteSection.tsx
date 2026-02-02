'use client';

import { HelpCircle } from 'lucide-react';
import type { MajorityType } from '@/lib/constants/resolutions';
import styles from '@/app/(dashboard)/ag/[id]/resolutions/new/new-resolution.module.css';

interface MajoriteSectionProps {
  majorite: MajorityType;
  MAJORITES: Record<string, { nom: string; description: string }>;
  onMajoriteChange: (majorite: MajorityType) => void;
}

export function MajoriteSection({ majorite, MAJORITES, onMajoriteChange }: MajoriteSectionProps) {
  const handleHelpClick = (e: React.MouseEvent) => {
    e.preventDefault();
    alert('Les majorites determinent le seuil de votes necessaires pour adopter une resolution. Article 24 : majorite simple des voix exprimees. Article 25 : majorite absolue (50% + 1). Article 25-1 et 26 : double majorite. Unanimite : 100% des coproprietaires.');
  };

  return (
    <div className={styles.formGroup}>
      <label htmlFor="majorite" className={styles.label}>
        Majorite
      </label>
      <div className={styles.selectWrapper}>
        <select
          id="majorite"
          className={styles.select}
          value={majorite}
          onChange={(e) => onMajoriteChange(e.target.value as MajorityType)}
          required
        >
          {Object.entries(MAJORITES).map(([key, maj]) => (
            <option key={key} value={key}>
              {maj.nom} - {maj.description}
            </option>
          ))}
        </select>
      </div>
      <a href="#" className={styles.helpLink} onClick={handleHelpClick}>
        <HelpCircle size={16} aria-hidden="true" />
        Comprendre les majorites
      </a>
    </div>
  );
}
