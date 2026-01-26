'use client';

import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.code}>404</h1>
        <h2 className={styles.title}>Page non trouvée</h2>
        <p className={styles.message}>
          Désolé, la page que vous recherchez n&apos;existe pas ou a été déplacée.
        </p>

        <div className={styles.actions}>
          <Link href="/dashboard" className={styles.primaryButton}>
            <Home size={18} aria-hidden="true" />
            Retour au tableau de bord
          </Link>

          <button
            onClick={() => window.history.back()}
            className={styles.secondaryButton}
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Page précédente
          </button>
        </div>
      </div>
    </div>
  );
}
