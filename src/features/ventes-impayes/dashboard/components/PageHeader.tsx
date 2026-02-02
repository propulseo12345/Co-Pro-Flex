'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import styles from '@/app/(dashboard)/ventes-impayes/ventes-impayes.module.css';

export function PageHeader() {
  return (
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>Ventes & Impayés</h1>
        <p className={styles.subtitle}>
          Gestion centralisée des ventes de lots et du suivi des impayés
        </p>
      </div>
      <div className={styles.headerActions}>
        <Link href="/ventes-impayes/ventes/nouvelle" className={styles.primaryButton}>
          <Plus size={18} aria-hidden="true" />
          Nouvelle vente
        </Link>
      </div>
    </div>
  );
}
