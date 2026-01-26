'use client';

import { X, Printer, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { STATUT_CONFIG } from '../domain/constants';
import styles from '../../../../../app/(dashboard)/ventes-impayes/impayes/impayes.module.css';

interface ExportModalProps {
  isOpen: boolean;
  filteredCount: number;
  montantTotal: number;
  selectedStatut: string;
  isLoading: boolean;
  isSuccess: boolean;
  onClose: () => void;
  onExport: (format: 'pdf' | 'excel') => void;
}

export function ExportModal({
  isOpen,
  filteredCount,
  montantTotal,
  selectedStatut,
  isLoading,
  isSuccess,
  onClose,
  onExport,
}: ExportModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={() => !isLoading && onClose()}>
      <div className={styles.modalSmall} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Exporter les impayés</h2>
          <button className={styles.closeBtn} onClick={onClose} disabled={isLoading}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalContent}>
          {isSuccess ? (
            <div className={styles.exportSuccess}>
              <div className={styles.successIcon}>
                <CheckCircle2 size={48} aria-hidden="true" />
              </div>
              <p>Export réussi !</p>
            </div>
          ) : (
            <>
              <p className={styles.exportInfo}>
                <strong>{filteredCount}</strong> impayés seront exportés
                {selectedStatut !== 'tous' && ` (filtre : ${STATUT_CONFIG[selectedStatut]?.label || selectedStatut})`}
              </p>
              <p className={styles.exportSubInfo}>
                Montant total : <strong>{montantTotal.toLocaleString('fr-FR')} €</strong>
              </p>

              <div className={styles.exportOptions}>
                <button className={styles.exportOption} onClick={() => onExport('pdf')} disabled={isLoading}>
                  <div className={styles.exportIcon}>
                    <Printer size={32} aria-hidden="true" />
                  </div>
                  <div className={styles.exportLabel}>
                    <span>Export PDF</span>
                    <small>Document imprimable</small>
                  </div>
                  {isLoading && <span className={styles.spinner} />}
                </button>

                <button className={styles.exportOption} onClick={() => onExport('excel')} disabled={isLoading}>
                  <div className={styles.exportIcon} style={{ background: '#dcfce7', color: '#16a34a' }}>
                    <FileSpreadsheet size={32} aria-hidden="true" />
                  </div>
                  <div className={styles.exportLabel}>
                    <span>Export Excel</span>
                    <small>Tableur modifiable</small>
                  </div>
                  {isLoading && <span className={styles.spinner} />}
                </button>
              </div>
            </>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
