'use client';

import { Video, Users } from 'lucide-react';
import { AGFormat, AG_FORMAT_LABELS, AG_FORMAT_DESCRIPTIONS } from '@/types';
import styles from '../../../../app/(dashboard)/ag/new/new-ag.module.css';

interface FormatAGSectionProps {
  format: AGFormat;
  onChange: (format: AGFormat) => void;
}

export function FormatAGSection({ format, onChange }: FormatAGSectionProps) {
  return (
    <div className={`${styles.section} ${styles.compactChoiceSection}`}>
      <h2 className={styles.sectionTitle}>
        <Video size={20} className={styles.sectionIcon} />
        Format de l&apos;assemblée
      </h2>
      <p className={`${styles.sectionSubtitle} ${styles.compactSectionSubtitle}`}>
        Une AG doit obligatoirement se tenir dans un lieu physique. La visioconférence (loi ELAN 2018) permet une
        participation à distance en complément.
      </p>
      <div className={`${styles.formatGroup} ${styles.formatGroupCompact}`}>
        <label
          className={`${styles.formatCard} ${styles.formatCardCompact} ${format === AGFormat.PRESENTIEL ? styles.formatCardActive : ''}`}
        >
          <input
            type="radio"
            name="format"
            value={AGFormat.PRESENTIEL}
            checked={format === AGFormat.PRESENTIEL}
            onChange={() => onChange(AGFormat.PRESENTIEL)}
          />
          <div className={styles.formatIcon}>
            <Users size={24} />
          </div>
          <div className={styles.formatContent}>
            <div className={styles.formatTitle}>{AG_FORMAT_LABELS[AGFormat.PRESENTIEL]}</div>
            <div className={styles.formatDescription}>{AG_FORMAT_DESCRIPTIONS[AGFormat.PRESENTIEL]}</div>
          </div>
        </label>
        <label
          className={`${styles.formatCard} ${styles.formatCardCompact} ${format === AGFormat.MIXTE ? styles.formatCardActive : ''}`}
        >
          <input
            type="radio"
            name="format"
            value={AGFormat.MIXTE}
            checked={format === AGFormat.MIXTE}
            onChange={() => onChange(AGFormat.MIXTE)}
          />
          <div className={styles.formatIcon}>
            <Users size={24} />
            <Video size={18} className={styles.formatIconOverlay} />
          </div>
          <div className={styles.formatContent}>
            <div className={styles.formatTitle}>{AG_FORMAT_LABELS[AGFormat.MIXTE]}</div>
            <div className={styles.formatDescription}>{AG_FORMAT_DESCRIPTIONS[AGFormat.MIXTE]}</div>
          </div>
        </label>
      </div>
    </div>
  );
}
