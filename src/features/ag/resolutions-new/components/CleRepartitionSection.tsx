'use client';

import { HelpCircle } from 'lucide-react';
import { CLES_REPARTITION } from '../hooks/useNewResolutionPage';
import styles from '@/app/(dashboard)/ag/[id]/resolutions/new/new-resolution.module.css';

interface CleRepartitionSectionProps {
  cleRepartition: string;
  onCleRepartitionChange: (cle: string) => void;
}

export function CleRepartitionSection({ cleRepartition, onCleRepartitionChange }: CleRepartitionSectionProps) {
  const handleHelpClick = (e: React.MouseEvent) => {
    e.preventDefault();
    alert('La cle de repartition determine comment les charges seront reparties entre les coproprietaires. Choisissez la cle la plus appropriee selon le type de resolution.');
  };

  return (
    <div className={styles.formGroup}>
      <label htmlFor="cleRepartition" className={styles.label}>
        Cle de repartition
      </label>
      <div className={styles.selectWrapper}>
        <select
          id="cleRepartition"
          className={styles.select}
          value={cleRepartition}
          onChange={(e) => onCleRepartitionChange(e.target.value)}
          required
        >
          {CLES_REPARTITION.map(cle => (
            <option key={cle.value} value={cle.value}>
              {cle.label}
            </option>
          ))}
        </select>
      </div>
      <a href="#" className={styles.helpLink} onClick={handleHelpClick}>
        <HelpCircle size={16} aria-hidden="true" />
        Bien choisir la cle de repartition
      </a>
    </div>
  );
}
