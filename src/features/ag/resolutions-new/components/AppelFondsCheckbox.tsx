'use client';

import styles from '@/app/(dashboard)/ag/[id]/resolutions/new/new-resolution.module.css';

interface AppelFondsCheckboxProps {
  estAppelFonds: boolean;
  onEstAppelFondsChange: (value: boolean) => void;
}

export function AppelFondsCheckbox({ estAppelFonds, onEstAppelFondsChange }: AppelFondsCheckboxProps) {
  return (
    <div className={styles.formGroup}>
      <label className={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={estAppelFonds}
          onChange={(e) => onEstAppelFondsChange(e.target.checked)}
        />
        <span>Cette resolution est un appel de fonds</span>
      </label>
    </div>
  );
}
