'use client';

import { AlertCircle } from 'lucide-react';
import styles from '@/app/(dashboard)/finance/budgets/validation/validation.module.css';

interface ErrorBannerProps {
  error: string;
}

export function ErrorBanner({ error }: ErrorBannerProps) {
  return (
    <div className={styles.content}>
      <div
        className="card"
        style={{
          background: 'var(--color-error-light)',
          padding: '1rem',
          marginBottom: '1rem',
        }}
      >
        <p style={{ color: 'var(--color-error)', margin: 0 }}>
          <AlertCircle
            size={16}
            style={{ verticalAlign: 'middle', marginRight: '0.5rem' }}
            aria-hidden="true"
          />
          {error}
        </p>
      </div>
    </div>
  );
}
