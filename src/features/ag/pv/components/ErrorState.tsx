'use client';

import { AlertCircle, RefreshCw, ArrowLeft, Home } from 'lucide-react';
import styles from '../../../../app/(dashboard)/ag/[id]/pv/pv.module.css';

interface ErrorStateProps {
  title: string;
  message: string;
  onRefresh?: () => void;
  onBack?: () => void;
  onHome?: () => void;
  iconColor?: string;
}

export function ErrorState({ title, message, onRefresh, onBack, onHome, iconColor = 'var(--color-error)' }: ErrorStateProps) {
  return (
    <div className="container">
      <div className={styles.errorContainer || styles.loadingContainer}>
        <AlertCircle size={48} color={iconColor} />
        <h2 style={{ marginTop: '1rem' }}>{title}</h2>
        <p style={{ marginTop: '0.5rem', color: 'var(--color-text-muted)' }}>{message}</p>
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          {onRefresh && (
            <button onClick={onRefresh} className="btn btn-primary">
              <RefreshCw size={16} />
              Rafraîchir la page
            </button>
          )}
          {onBack && (
            <button onClick={onBack} className="btn btn-secondary">
              <ArrowLeft size={16} />
              Retour à la session
            </button>
          )}
          {onHome && (
            <button onClick={onHome} className="btn btn-primary">
              <Home size={16} />
              Tableau de bord AG
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
