'use client';

import { Calendar, Download, History, Lock } from 'lucide-react';
import { EtatCloture } from './types';
import styles from './Comptabilite.module.css';

interface ComptaHeaderProps {
  etatCloture: EtatCloture;
  startDate?: string;
  endDate?: string;
  onShowHistorique: () => void;
  onShowCloture: () => void;
  onExportPDF: () => void;
  onExportExcel: () => void;
}

function formatDateFr(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function ComptaHeader({
  etatCloture,
  startDate,
  endDate,
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
        {startDate && endDate && (
          <p className={styles.exercicePeriod}>
            <Calendar size={16} aria-hidden="true" />
            Exercice du {formatDateFr(startDate)} au {formatDateFr(endDate)}
          </p>
        )}
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
          className={`${styles.clotureButton} ${etatCloture.mouvementsNonCategorises > 0 ? styles.clotureButtonWarning : ''} ${etatCloture.estCloturee ? styles.clotureButtonClosed : ''}`}
          onClick={onShowCloture}
          disabled={etatCloture.estCloturee}
        >
          <Lock size={18} aria-hidden="true" />
          {etatCloture.estCloturee ? `Comptes clôturés ${etatCloture.annee}` : `Clôture ${etatCloture.annee}`}
          {etatCloture.mouvementsNonCategorises > 0 && (
            <span className={styles.alertBadge}>{etatCloture.mouvementsNonCategorises}</span>
          )}
        </button>
      </div>
    </div>
  );
}
