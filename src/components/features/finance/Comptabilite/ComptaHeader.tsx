'use client';

import { Download, History, Lock } from 'lucide-react';
import { EtatCloture } from './types';
import styles from './Comptabilite.module.css';

interface ComptaHeaderProps {
  etatCloture: EtatCloture;
  onShowHistorique: () => void;
  onShowCloture: () => void;
  onExportPDF: () => void;
  onExportExcel: () => void;
}

export function ComptaHeader({
  etatCloture,
  onShowHistorique,
  onShowCloture,
  onExportPDF,
  onExportExcel
}: ComptaHeaderProps) {
  return (
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>Comptabilité</h1>
        <p className={styles.subtitle}>Vue complète et synthétique de la comptabilité de la copropriété</p>
      </div>
      <div className={styles.headerActions}>
        <button className={styles.exportButton} onClick={onShowHistorique}>
          <History size={18} aria-hidden="true" />
          Historique
        </button>
        <button className={styles.exportButton} onClick={onExportPDF}>
          <Download size={18} aria-hidden="true" />
          Export PDF
        </button>
        <button className={styles.exportButton} onClick={onExportExcel}>
          <Download size={18} aria-hidden="true" />
          Export Excel
        </button>
        <button
          className={`${styles.clotureButton} ${etatCloture.mouvementsNonCategorises > 0 ? styles.clotureButtonWarning : ''}`}
          onClick={onShowCloture}
        >
          <Lock size={18} aria-hidden="true" />
          Clôture {etatCloture.annee}
          {etatCloture.mouvementsNonCategorises > 0 && (
            <span className={styles.alertBadge}>{etatCloture.mouvementsNonCategorises}</span>
          )}
        </button>
      </div>
    </div>
  );
}
