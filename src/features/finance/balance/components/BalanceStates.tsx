'use client';

import { RefreshCw, AlertCircle, FileText } from 'lucide-react';
import styles from '@/app/(dashboard)/documents/balance/balance.module.css';

interface BalanceLoadingStateProps {}

export function BalanceLoadingState({}: BalanceLoadingStateProps) {
  return (
    <div className="container">
      <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
        <p style={{ marginTop: '1rem' }}>Chargement de la balance comptable...</p>
      </div>
    </div>
  );
}

interface BalanceNoPeriodStateProps {
  anneeExercice: string;
  today: string;
}

export function BalanceNoPeriodState({ anneeExercice, today }: BalanceNoPeriodStateProps) {
  return (
    <div className="container">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Balance Comptable</h1>
          <p className={styles.subtitle}>Exercice {anneeExercice} - Vue au {today}</p>
        </div>
      </div>
      <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: 'var(--color-warning)', marginBottom: '1rem' }} />
        <h2>Aucune période comptable ouverte</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Veuillez créer ou ouvrir une période comptable pour afficher la balance.
        </p>
      </div>
    </div>
  );
}

interface BalanceErrorStateProps {
  error: string;
  onRefresh: () => void;
}

export function BalanceErrorState({ error, onRefresh }: BalanceErrorStateProps) {
  return (
    <div className="container">
      <div className="card" style={{ padding: '2rem', textAlign: 'center', borderColor: 'var(--color-error)' }}>
        <AlertCircle size={32} style={{ color: 'var(--color-error)', marginBottom: '1rem' }} />
        <h2>Erreur de chargement</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>{error}</p>
        <button className="btn btn-primary" onClick={onRefresh} style={{ marginTop: '1rem' }}>
          <RefreshCw size={16} style={{ marginRight: 8 }} /> Réessayer
        </button>
      </div>
    </div>
  );
}

interface BalanceEmptyStateProps {
  anneeExercice: string;
  today: string;
  onRefresh: () => void;
}

export function BalanceEmptyState({ anneeExercice, today, onRefresh }: BalanceEmptyStateProps) {
  return (
    <div className="container">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Balance Comptable</h1>
          <p className={styles.subtitle}>Exercice {anneeExercice} - Vue au {today}</p>
        </div>
        <div className={styles.actions}>
          <button className="btn btn-secondary" onClick={onRefresh}>
            <RefreshCw size={16} style={{ marginRight: 8 }} /> Actualiser
          </button>
        </div>
      </div>
      <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
        <FileText size={48} style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }} />
        <h2>Aucune écriture comptable</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Il n&apos;y a pas encore d&apos;écritures comptables pour cette période.
        </p>
      </div>
    </div>
  );
}
