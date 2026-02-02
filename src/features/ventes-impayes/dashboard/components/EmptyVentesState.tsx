'use client';

import Link from 'next/link';
import { Home, Plus } from 'lucide-react';
import styles from '@/app/(dashboard)/ventes-impayes/ventes-impayes.module.css';

export function EmptyVentesState() {
  return (
    <div className="card">
      <h2 className={styles.sectionTitle}>Ventes récentes</h2>
      <div className={styles.emptyState}>
        <Home size={48} />
        <p>Aucune vente en cours</p>
        <Link href="/ventes-impayes/ventes/nouvelle" className={styles.emptyStateButton}>
          <Plus size={16} />
          Créer une vente
        </Link>
      </div>
    </div>
  );
}
