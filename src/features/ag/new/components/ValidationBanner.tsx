'use client';

import { AlertCircle } from 'lucide-react';
import styles from '../../../../app/(dashboard)/ag/new/new-ag.module.css';

interface ValidationBannerProps {
  errors: Record<string, string>;
  show: boolean;
}

export function ValidationBanner({ errors, show }: ValidationBannerProps) {
  if (!show || Object.keys(errors).length === 0) return null;

  return (
    <div className={styles.validationBanner}>
      <AlertCircle size={20} aria-hidden="true" />
      <div>
        <strong>Veuillez corriger les erreurs suivantes :</strong>
        <ul>
          {Object.entries(errors).map(([key, message]) => (
            <li key={key}>{message}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
