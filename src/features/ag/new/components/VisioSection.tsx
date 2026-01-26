'use client';

import { Video, Link2 } from 'lucide-react';
import { VISIO_PROVIDER_LABELS } from '@/types';
import styles from '../../../../app/(dashboard)/ag/new/new-ag.module.css';

interface VisioSectionProps {
  visioUrl: string;
  visioProvider?: string;
  error?: string;
  onVisioUrlChange: (url: string) => void;
}

export function VisioSection({ visioUrl, visioProvider, error, onVisioUrlChange }: VisioSectionProps) {
  return (
    <div className={styles.visioSection}>
      <h3 className={styles.visioSectionTitle}>
        <Video size={18} aria-hidden="true" />
        Participation à distance
        <span className={styles.visioBadge}>Optionnel</span>
      </h3>

      <div className={styles.formGroup}>
        <label htmlFor="visioUrl" className={styles.label}>
          <Link2 size={16} aria-hidden="true" />
          Lien de visioconférence (optionnel)
        </label>
        <div className={styles.visioInputWrapper}>
          <input
            type="url"
            id="visioUrl"
            className={`${styles.input} ${error ? styles.inputError : ''}`}
            placeholder="https://zoom.us/j/... ou https://teams.microsoft.com/..."
            value={visioUrl}
            onChange={(e) => onVisioUrlChange(e.target.value)}
          />
          {visioProvider && visioUrl && (
            <span className={styles.visioProviderBadge}>
              {VISIO_PROVIDER_LABELS[visioProvider as keyof typeof VISIO_PROVIDER_LABELS]}
            </span>
          )}
        </div>
        {error && <span className={styles.error}>{error}</span>}
        <p className={styles.visioHint}>
          Permet aux copropriétaires de participer à distance. Le lien doit provenir d'un service de visioconférence
          (Zoom, Teams, Google Meet, Webex...).
        </p>
      </div>

      {visioUrl && visioProvider && (
        <div className={styles.visioPreview}>
          <Video size={16} />
          <span>
            Les copropriétaires pourront rejoindre la réunion via{' '}
            <strong>{VISIO_PROVIDER_LABELS[visioProvider as keyof typeof VISIO_PROVIDER_LABELS]}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
