'use client';

import { Download, FileSpreadsheet, Copy, Lock } from 'lucide-react';
import type { TabCompta } from './types';
import styles from './ComptaTopBar.module.css';

interface ComptaTopBarProps {
  activeTab: TabCompta;
  periodName?: string;
  periodStart?: string;
  periodEnd?: string;
  periodStatus?: string;
  onExportPDF: () => void;
  onExportExcel: () => void;
  onShowCloture?: () => void;
  isReadOnly?: boolean;
}

const TAB_TITLES: Record<TabCompta, string> = {
  'grand-livre': 'Grand Livre',
  'livre-comptable': 'Livre comptable',
  'balance': 'Balance',
  'compte-gestion': 'Compte de gestion',
  'annexe-1': 'Annexe 1 — État financier',
  'annexe-2': 'Annexe 2 — Gestion courante',
  'annexe-3': 'Annexe 3 — Clés de répartition',
  'annexe-4': 'Annexe 4 — Travaux',
  'annexe-5': 'Annexe 5 — Non clôturés',
};

function formatPeriodLabel(start?: string, end?: string): string {
  if (!start || !end) return '';
  const startDate = new Date(start);
  const endDate = new Date(end);
  const year = startDate.getFullYear();
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `Exercice ${year} — ${fmt(startDate)} au ${fmt(endDate)}`;
}

export function ComptaTopBar({
  activeTab,
  periodStart,
  periodEnd,
  periodStatus,
  onExportPDF,
  onExportExcel,
  onShowCloture,
  isReadOnly,
}: ComptaTopBarProps) {
  const title = TAB_TITLES[activeTab] || 'Comptabilité';
  const periodLabel = formatPeriodLabel(periodStart, periodEnd);
  const isOpen = periodStatus === 'open';

  return (
    <div className={styles.topbar}>
      <div className={styles.left}>
        <h1 className={styles.title}>{title}</h1>
        {periodLabel && (
          <div className={styles.periodPill}>
            <span className={`${styles.dot} ${isOpen ? styles.dotOpen : styles.dotClosed}`} />
            {periodLabel}
          </div>
        )}
      </div>
      <div className={styles.actions}>
        <button className={styles.btnIcon} onClick={onExportPDF} title="Export PDF">
          <Download size={16} />
        </button>
        <button className={styles.btnIcon} onClick={onExportExcel} title="Export Excel">
          <FileSpreadsheet size={16} />
        </button>
        <button className={styles.btnIcon} title="Copier">
          <Copy size={16} />
        </button>
        {!isReadOnly && onShowCloture && (
          <button className={styles.btnPrimary} onClick={onShowCloture}>
            <Lock size={14} />
            Clôturer {periodStart ? new Date(periodStart).getFullYear() : ''}
          </button>
        )}
      </div>
    </div>
  );
}
