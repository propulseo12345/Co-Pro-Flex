'use client';

import { Download, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from '../styles/AppelsFondsPage.module.css';

interface AppelsFondsHeaderProps {
  periodLabel: string;
  periodMeta: string;
  onPrev: () => void;
  onNext: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
  onGenerate: () => void;
  onExport: () => void;
}

export function AppelsFondsHeader({
  periodLabel,
  periodMeta,
  onPrev,
  onNext,
  canGoPrev,
  canGoNext,
  onGenerate,
  onExport,
}: AppelsFondsHeaderProps) {
  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.headerTitle}>Appels de fonds</h1>
          <p className={styles.headerSubtitle}>
            Budget courant et travaux — suivi par exercice
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={onExport}>
            <Download size={14} /> Export
          </button>
          <button className={styles.btnPrimary} onClick={onGenerate}>
            <Plus size={14} /> Générer les appels
          </button>
        </div>
      </div>

      <div className={styles.periodBar}>
        <div className={styles.periodNav}>
          <button
            className={styles.periodNavBtn}
            onClick={onPrev}
            disabled={!canGoPrev}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            className={styles.periodNavBtn}
            onClick={onNext}
            disabled={!canGoNext}
          >
            <ChevronRight size={14} />
          </button>
        </div>
        <span className={styles.periodLabel}>{periodLabel}</span>
        <span className={styles.periodMeta}>{periodMeta}</span>
      </div>
    </>
  );
}
