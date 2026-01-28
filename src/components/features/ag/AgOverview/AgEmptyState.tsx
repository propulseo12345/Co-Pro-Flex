'use client';

import Link from 'next/link';
import { Calendar, Plus } from 'lucide-react';
import styles from './AgOverview.module.css';

interface AgEmptyStateProps {
  isManager: boolean;
}

export function AgEmptyState({ isManager }: AgEmptyStateProps) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyStateIcon}>
        <Calendar size={48} aria-hidden="true" />
      </div>
      <h3 className={styles.emptyStateTitle}>Aucune AG planifiée</h3>
      <p className={styles.emptyStateText}>
        Planifiez votre prochaine Assemblée Générale pour la copropriété.
      </p>
      {isManager && (
        <Link href="/ag/new" className="btn btn-primary">
          <Plus size={16} style={{ marginRight: 8 }} aria-hidden="true" />
          Planifier une AG
        </Link>
      )}
    </div>
  );
}
