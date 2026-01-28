'use client';

import { Info, RefreshCw } from 'lucide-react';

interface ComptaInfoBannerProps {
  periodName: string;
  onRefresh: () => void;
}

export function ComptaInfoBanner({ periodName, onRefresh }: ComptaInfoBannerProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.75rem 1rem',
        backgroundColor: 'var(--color-info-bg, #e0f2fe)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '1rem',
        fontSize: '0.875rem',
        color: 'var(--color-info-text, #0369a1)',
      }}
    >
      <Info size={16} />
      <span>
        Données issues de Supabase (v_general_ledger, v_trial_balance) - Période: {periodName}
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
