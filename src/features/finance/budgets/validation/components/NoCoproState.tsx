'use client';

import { AlertCircle } from 'lucide-react';
import styles from '@/app/(dashboard)/finance/budgets/validation/validation.module.css';

export function NoCoproState() {
  return (
    <div className={styles.content}>
      <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
        <AlertCircle
          size={48}
          style={{ color: 'var(--color-warning)', marginBottom: '1rem' }}
          aria-hidden="true"
        />
        <h2>Aucune copropriété sélectionnée</h2>
        <p>Veuillez sélectionner une copropriété pour créer un budget.</p>
      </div>
    </div>
  );
}
