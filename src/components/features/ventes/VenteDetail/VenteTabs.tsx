'use client';

import { FileText, Clock } from 'lucide-react';
import clsx from 'clsx';
import type { ActiveTab, VenteDocument, HistoriqueItem } from './types';
import styles from './VenteDetail.module.css';

interface VenteTabsProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  documentsCount: number;
  historiqueCount: number;
}

export function VenteTabs({
  activeTab,
  onTabChange,
  documentsCount,
  historiqueCount
}: VenteTabsProps) {
  return (
    <div className={styles.tabs}>
      <button
        className={clsx(styles.tab, activeTab === 'workflow' && styles.tabActive)}
        onClick={() => onTabChange('workflow')}
      >
        <FileText size={16} aria-hidden="true" />
        Workflow
      </button>
      <button
        className={clsx(styles.tab, activeTab === 'documents' && styles.tabActive)}
        onClick={() => onTabChange('documents')}
      >
        <FileText size={16} aria-hidden="true" />
        Documents ({documentsCount})
      </button>
      <button
        className={clsx(styles.tab, activeTab === 'historique' && styles.tabActive)}
        onClick={() => onTabChange('historique')}
      >
        <Clock size={16} aria-hidden="true" />
        Historique ({historiqueCount})
      </button>
    </div>
  );
}
