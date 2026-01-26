'use client';

import { X, Download } from 'lucide-react';
import type { AppelFonds, CoproprietaireAppel } from '../types';
import { formatCurrency } from '../utils';
import styles from '../appels-fonds.module.css';

interface RepartitionModalProps {
  appel: AppelFonds;
  coproprietaires: CoproprietaireAppel[];
  onClose: () => void;
  onExportPDF: () => void;
  onExportExcel: () => void;
}

export function RepartitionModal({
  appel,
  coproprietaires,
  onClose,
  onExportPDF,
  onExportExcel,
}: RepartitionModalProps) {
  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Répartition détaillée</h2>
            <p className={styles.modalSubtitle}>{appel.description}</p>
          </div>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fermer"><X size={20} aria-hidden="true" /></button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.exportActions}>
            <button className={styles.exportButton} onClick={onExportPDF}>
              <Download size={16} aria-hidden="true" />
              Export PDF
            </button>
            <button className={styles.exportButton} onClick={onExportExcel}>
              <Download size={16} aria-hidden="true" />
              Export Excel
            </button>
          </div>

          <div className={styles.montantTotal}>
            <span>Montant total de l'appel</span>
            <span className={styles.montantTotalValue}>
              {formatCurrency(appel.montantTotal)}
            </span>
          </div>

          <div className={styles.repartitionList}>
            {coproprietaires.map((copro) => (
              <div key={copro.id} className={styles.repartitionItem}>
                <div className={styles.repartitionInfo}>
                  <span className={styles.repartitionNom}>{copro.nom}</span>
                  <span className={styles.repartitionLot}>Lot {copro.lot}</span>
                  <span className={styles.repartitionTantiemes}>{copro.tantiemes} tantièmes</span>
                </div>
                <div className={styles.repartitionMontant}>
                  {formatCurrency(copro.montantIndividuel)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
