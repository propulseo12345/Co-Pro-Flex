'use client';

import { Mail, FileSignature, Check } from 'lucide-react';
import { ModeSignature, LABELS_MODE_SIGNATURE } from '@/types/models/pv-signature';
import styles from './ModeSignatureSelector.module.css';

interface ModeSignatureSelectorProps {
  mode: ModeSignature;
  onChange: (mode: ModeSignature) => void;
  disabled?: boolean;
}

export function ModeSignatureSelector({
  mode,
  onChange,
  disabled = false,
}: ModeSignatureSelectorProps) {
  const modes: { value: ModeSignature; icon: React.ReactNode }[] = [
    { value: 'sur_place', icon: <FileSignature size={24} aria-hidden="true" /> },
    { value: 'electronique', icon: <Mail size={24} aria-hidden="true" /> },
  ];

  return (
    <div className={styles.container}>
      <label className={styles.label}>Mode de signature</label>

      <div className={styles.options}>
        {modes.map(({ value, icon }) => {
          const config = LABELS_MODE_SIGNATURE[value];
          const isSelected = mode === value;

          return (
            <button
              key={value}
              type="button"
              className={`${styles.option} ${isSelected ? styles.selected : ''}`}
              onClick={() => onChange(value)}
              disabled={disabled}
              aria-pressed={isSelected}
            >
              <div className={styles.optionHeader}>
                <div className={styles.optionIcon}>{icon}</div>
                {isSelected && (
                  <div className={styles.checkmark}>
                    <Check size={16} aria-hidden="true" />
                  </div>
                )}
              </div>
              <div className={styles.optionContent}>
                <span className={styles.optionLabel}>{config.label}</span>
                <span className={styles.optionDescription}>{config.description}</span>
              </div>

              <div className={styles.emailIndicator}>
                {config.emailObligatoire ? (
                  <span className={styles.emailRequired}>Email obligatoire</span>
                ) : (
                  <span className={styles.emailOptional}>Email facultatif</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
