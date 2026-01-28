'use client';

import { RefreshCw, AlertCircle, FileText, Info } from 'lucide-react';
import styles from './Comptabilite.module.css';

interface LoadingStateProps {
  message?: string;
}

export function ComptaLoadingState({ message = 'Chargement de la comptabilité...' }: LoadingStateProps) {
  return (
    <div className={styles.container}>
      <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
        <RefreshCw
          size={32}
          style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }}
        />
        <p style={{ marginTop: '1rem' }}>{message}</p>
      </div>
    </div>
  );
}

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

export function ComptaErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className={styles.container}>
      <div
        className="card"
        style={{ padding: '2rem', textAlign: 'center', borderColor: 'var(--color-error)' }}
      >
        <AlertCircle size={32} style={{ color: 'var(--color-error)', marginBottom: '1rem' }} />
        <h2>Erreur de chargement</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>{error}</p>
        <button className="btn btn-primary" onClick={onRetry} style={{ marginTop: '1rem' }}>
          <RefreshCw size={16} style={{ marginRight: 8 }} /> Réessayer
        </button>
      </div>
    </div>
  );
}

export function ComptaNoPeriodState() {
  return (
    <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
      <AlertCircle size={48} style={{ color: 'var(--color-warning)', marginBottom: '1rem' }} />
      <h2>Aucune période comptable ouverte</h2>
      <p style={{ color: 'var(--color-text-secondary)' }}>
        Veuillez créer ou ouvrir une période comptable pour afficher la comptabilité.
      </p>
    </div>
  );
}

interface EmptyDataStateProps {
  title: string;
  message: string;
}

export function ComptaEmptyDataState({ title, message }: EmptyDataStateProps) {
  return (
    <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
      <FileText size={48} style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }} />
      <h2>{title}</h2>
      <p style={{ color: 'var(--color-text-secondary)' }}>{message}</p>
    </div>
  );
}

interface AnnexeNotConnectedProps {
  title: string;
}

export function ComptaAnnexeNotConnected({ title }: AnnexeNotConnectedProps) {
  return (
    <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
      <Info size={32} style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }} />
      <h3>{title}</h3>
      <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
        Cette annexe n&apos;est pas encore connectée à Supabase.
      </p>
      <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.875rem' }}>
        Les données seront disponibles après migration des vues correspondantes.
      </p>
    </div>
  );
}
