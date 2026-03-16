'use client';

import { Download, Plus } from 'lucide-react';
import clsx from 'clsx';
import type { FacturesViewMode } from '../types';
import type { FacturesKPIData } from '@/components/features/finance/Factures/types';
import { FacturesViewToggle } from './FacturesViewToggle';
import styles from './FacturesPageHeader.module.css';

interface FacturesPageHeaderProps {
  kpiData: FacturesKPIData;
  montantPaye: number;
  viewMode: FacturesViewMode;
  onViewModeChange: (mode: FacturesViewMode) => void;
  onNewFacture: () => void;
  onExport: () => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

export function FacturesPageHeader({
  kpiData,
  montantPaye,
  viewMode,
  onViewModeChange,
  onNewFacture,
  onExport,
}: FacturesPageHeaderProps) {
  return (
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>Factures fournisseurs</h1>
        <p className={styles.subtitle}>Suivi et gestion des factures prestataires</p>
        <div className={styles.kpis}>
          <div className={styles.kpiItem}>
            <span className={styles.kpiLabel}>Factures</span>
            <span className={clsx(styles.kpiNum, styles.blue)}>{kpiData.nombreFactures}</span>
          </div>
          <div className={styles.kpiItem}>
            <span className={styles.kpiLabel}>Total payé</span>
            <span className={clsx(styles.kpiNum, styles.green)}>{formatCurrency(montantPaye)}</span>
          </div>
          <div className={styles.kpiItem}>
            <span className={styles.kpiLabel}>En retard</span>
            <span className={clsx(styles.kpiNum, styles.red)}>{formatCurrency(kpiData.montantEchu)}</span>
          </div>
          <div className={styles.kpiItem}>
            <span className={styles.kpiLabel}>Cette semaine</span>
            <span className={clsx(styles.kpiNum)}>{kpiData.echeancesSemaine} éch.</span>
          </div>
        </div>
      </div>
      <div className={styles.actions}>
        <FacturesViewToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
        <button className={styles.btnGhost} onClick={onExport}>
          <Download size={14} /> Export
        </button>
        <button className={styles.btnPrimary} onClick={onNewFacture}>
          <Plus size={14} /> Nouvelle facture
        </button>
      </div>
    </div>
  );
}
