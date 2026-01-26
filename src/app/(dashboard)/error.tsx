'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import styles from './error.module.css';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log l'erreur vers un service de monitoring (Sentry, etc.)
    console.error('Dashboard Error:', error);
  }, [error]);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.iconWrapper}>
          <AlertTriangle size={48} aria-hidden="true" />
        </div>

        <h1 className={styles.title}>Une erreur est survenue</h1>

        <p className={styles.message}>
          Nous sommes désolés, quelque chose s&apos;est mal passé.
          Veuillez réessayer ou retourner à l&apos;accueil.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <details className={styles.details}>
            <summary>Détails de l&apos;erreur</summary>
            <pre className={styles.errorStack}>
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}

        <div className={styles.actions}>
          <button onClick={reset} className={styles.retryButton}>
            <RefreshCw size={18} aria-hidden="true" />
            Réessayer
          </button>

          <Link href="/dashboard" className={styles.homeButton}>
            <Home size={18} aria-hidden="true" />
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
