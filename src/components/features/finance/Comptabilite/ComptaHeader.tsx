'use client';

import { Calendar, Download, History, Lock, CheckCircle, XCircle } from 'lucide-react';
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

function getClotureButtonConfig(etatCloture: EtatCloture) {
  const { annee, approvalStatus } = etatCloture;

  switch (approvalStatus) {
    case 'approved':
      return {
        label: `Comptes approuvés ${annee}`,
        icon: <CheckCircle size={18} aria-hidden="true" />,
        className: styles.clotureButtonApproved,
        disabled: true,
      };
    case 'rejected':
      return {
        label: `Comptes refusés ${annee}`,
        icon: <XCircle size={18} aria-hidden="true" />,
        className: styles.clotureButtonRejected,
        disabled: true,
      };
    case 'closed':
      return {
        label: `Comptes clôturés ${annee}`,
        icon: <Lock size={18} aria-hidden="true" />,
        className: styles.clotureButtonClosed,
        disabled: true,
      };
    default:
      return {
        label: `Clôture ${annee}`,
        icon: <Lock size={18} aria-hidden="true" />,
        className: etatCloture.mouvementsNonCategorises > 0 ? styles.clotureButtonWarning : '',
        disabled: false,
      };
  }
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
  const btnConfig = getClotureButtonConfig(etatCloture);

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
          className={`${styles.clotureButton} ${btnConfig.className}`}
          onClick={onShowCloture}
          disabled={btnConfig.disabled}
        >
          {btnConfig.icon}
          {btnConfig.label}
          {etatCloture.mouvementsNonCategorises > 0 && etatCloture.approvalStatus === 'open' && (
            <span className={styles.alertBadge}>{etatCloture.mouvementsNonCategorises}</span>
          )}
        </button>
      </div>
    </div>
  );
}
