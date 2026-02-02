'use client';

import { CreditCard, Link as LinkIcon } from 'lucide-react';
import type { OngletActif } from '../domain/types';
import styles from '@/app/(dashboard)/finance/mouvements-bancaires/mouvements-bancaires.module.css';

interface TabsNavigationProps {
  activeTab: OngletActif;
  onTabChange: (tab: OngletActif) => void;
  unreconciliedCount: number;
  hasDiscrepancy: boolean;
}

export function TabsNavigation({
  activeTab,
  onTabChange,
  unreconciliedCount,
  hasDiscrepancy,
}: TabsNavigationProps) {
  return (
    <div className={styles.tabs}>
      <button
        className={`${styles.tab} ${activeTab === 'mouvements' ? styles.tabActive : ''}`}
        onClick={() => onTabChange('mouvements')}
      >
        <CreditCard size={18} />
        Mouvements bancaires
      </button>
      <button
        className={`${styles.tab} ${activeTab === 'rapprochement' ? styles.tabActive : ''}`}
        onClick={() => onTabChange('rapprochement')}
      >
        <LinkIcon size={18} />
        Rapprochement bancaire
        {hasDiscrepancy && (
          <span className={styles.tabBadgeWarning}>{unreconciliedCount}</span>
        )}
      </button>
    </div>
  );
}
