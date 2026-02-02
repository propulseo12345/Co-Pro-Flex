'use client';

import { Info } from 'lucide-react';
import styles from '@/app/(dashboard)/documents/balance/balance.module.css';

interface BalanceInfoBarProps {
  filteredCount: number;
  comptesAvecSolde: number;
  totalCount: number;
}

export function BalanceInfoBar({ filteredCount, comptesAvecSolde, totalCount }: BalanceInfoBarProps) {
  return (
    <>
      <div className={styles.infoSource}>
        <Info size={16} />
        <span>Ce document est généré automatiquement à partir des écritures comptables de Supabase</span>
      </div>

      <div className={styles.infoBar}>
        <span>{filteredCount} compte{filteredCount > 1 ? 's' : ''} affiché{filteredCount > 1 ? 's' : ''}</span>
        <span className={styles.infoSeparator}>|</span>
        <span>{comptesAvecSolde} compte{comptesAvecSolde > 1 ? 's' : ''} avec solde sur {totalCount} au total</span>
      </div>
    </>
  );
}
