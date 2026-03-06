'use client';

import { Info, Lock, RefreshCw } from 'lucide-react';

interface ComptaInfoBannerProps {
  periodName: string;
  onRefresh: () => void;
  isReadOnly?: boolean;
}

export function ComptaInfoBanner({ periodName, onRefresh, isReadOnly }: ComptaInfoBannerProps) {
  const bgColor = isReadOnly ? 'var(--color-warning-bg, #fef3c7)' : 'var(--color-info-bg, #e0f2fe)';
  const textColor = isReadOnly ? 'var(--color-warning-text, #92400e)' : 'var(--color-info-text, #0369a1)';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.75rem 1rem',
        backgroundColor: bgColor,
        borderRadius: 'var(--radius-md)',
        marginBottom: '1rem',
        fontSize: '0.875rem',
        color: textColor,
      }}
    >
      {isReadOnly ? <Lock size={16} /> : <Info size={16} />}
      <span>
        {isReadOnly
          ? `Exercice clôturé — Consultation en lecture seule - Période: ${periodName}`
          : `Données issues de Supabase (v_general_ledger, v_trial_balance) - Période: ${periodName}`
        }
      </span>
      <button
        onClick={onRefresh}
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.25rem 0.5rem',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: 'inherit',
        }}
        title="Actualiser les données"
      >
        <RefreshCw size={14} /> Actualiser
      </button>
    </div>
  );
}
