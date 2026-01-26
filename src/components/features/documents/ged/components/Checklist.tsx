'use client';

import { CheckCircle, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { DOCUMENTS_OBLIGATOIRES_CHECKLIST } from '@/data/mock/documents-ged';
import { getCategoryLabel } from '../domain/utils';
import styles from '../../../../../app/(dashboard)/documents/ged/ged.module.css';

export function Checklist() {
  return (
    <div className={clsx('card', styles.checklistCard)}>
      <h3 className={styles.checklistTitle}>
        <CheckCircle size={20} aria-hidden="true" />
        Documents obligatoires
      </h3>
      <div className={styles.checklistGrid}>
        {DOCUMENTS_OBLIGATOIRES_CHECKLIST.map((item, idx) => (
          <div key={idx} className={styles.checklistItem}>
            {item.present ? (
              <CheckCircle size={16} className={styles.checkPresent} aria-hidden="true" />
            ) : (
              <XCircle size={16} className={styles.checkMissing} aria-hidden="true" />
            )}
            <span>{item.nom}</span>
            <span className={styles.checklistType}>{getCategoryLabel(item.type)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
