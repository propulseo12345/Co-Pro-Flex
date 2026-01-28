'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import styles from './AgOverview.module.css';

interface AgPageHeaderProps {
  isManager: boolean;
}

export function AgPageHeader({ isManager }: AgPageHeaderProps) {
  return (
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>Assemblées Générales</h1>
        <p className={styles.subtitle}>
          Gérez vos réunions de copropriété, de la convocation au procès-verbal.
        </p>
      </div>
      {isManager && (
        <div className={styles.actions}>
          <Link href="/ag/new" className="btn btn-primary">
            <Plus size={16} style={{ marginRight: 8 }} aria-hidden="true" /> Planifier une AG
          </Link>
        </div>
      )}
    </div>
  );
}
