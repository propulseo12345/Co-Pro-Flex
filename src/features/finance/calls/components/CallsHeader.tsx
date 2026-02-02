'use client';

import { CheckCircle } from 'lucide-react';
import styles from '@/app/(dashboard)/finance/calls/calls.module.css';

interface CallsHeaderProps {
  periodName: string;
  periodStart: string | undefined;
  periodEnd: string | undefined;
  isManager: boolean;
  isAutomationEnabled: boolean;
  onToggleAutomation: () => void;
}

export function CallsHeader({
  periodName,
  periodStart,
  periodEnd,
  isManager,
  isAutomationEnabled,
  onToggleAutomation,
}: CallsHeaderProps) {
  return (
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>Appels de fonds de l'exercice {periodName}</h1>
        {periodStart && periodEnd && (
          <p className={styles.subtitle}>
            Exercice du {new Date(periodStart).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} au {new Date(periodEnd).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}
      </div>
      {isManager && (
        <button
          className="btn btn-primary"
          onClick={onToggleAutomation}
        >
          <CheckCircle size={16} style={{ marginRight: 8 }} aria-hidden="true" />
          {isAutomationEnabled ? 'Désactiver la génération' : 'Autoriser la génération'}
        </button>
      )}
    </div>
  );
}
