'use client';

import { X, FileText, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import styles from '../../../app/(dashboard)/ventes-impayes/ventes/ventes.module.css';

interface ExportOptions {
  includeDetails: boolean;
  includeHistorique: boolean;
  onlyEnCours: boolean;
}

interface VentesExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'pdf' | 'excel') => void;
  exportLoading: boolean;
  exportSuccess: string | null;
  exportOptions: ExportOptions;
  onOptionsChange: (options: ExportOptions) => void;
  filteredCount: number;
}

export function VentesExportModal({
  isOpen,
  onClose,
  onExport,
  exportLoading,
  exportSuccess,
  exportOptions,
  onOptionsChange,
  filteredCount,
}: VentesExportModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={() => !exportLoading && onClose()}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <h3>Exporter les ventes</h3>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            disabled={exportLoading}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.modalContent}>
          {exportSuccess ? (
            <div className={styles.exportSuccess}>
              <CheckCircle2 size={48} className={styles.successIcon} aria-hidden="true" />
              <h4>Export réussi</h4>
              <p>Fichier généré : <strong>{exportSuccess}</strong></p>
              <p className={styles.downloadHint}>Le téléchargement va démarrer automatiquement...</p>
            </div>
          ) : (
            <>
              <p className={styles.exportDescription}>
                Exportez la liste des ventes ({filteredCount} vente{filteredCount > 1 ? 's' : ''} sélectionnée{filteredCount > 1 ? 's' : ''}) au format de votre choix.
              </p>
              <div className={styles.exportOptions}>
                <button
                  className={styles.exportOption}
                  onClick={() => onExport('pdf')}
                  disabled={exportLoading}
                >
                  <div className={styles.exportIcon} style={{ background: 'var(--badge-danger-bg)' }}>
                    <FileText size={24} style={{ color: 'var(--danger)' }} aria-hidden="true" />
                  </div>
                  <div className={styles.exportInfo}>
                    <h4>Export PDF</h4>
                    <p>Document formaté prêt à imprimer</p>
                  </div>
                  {exportLoading && <span className={styles.loadingSpinner} />}
                </button>
                <button
                  className={styles.exportOption}
                  onClick={() => onExport('excel')}
                  disabled={exportLoading}
                >
                  <div className={styles.exportIcon} style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                    <FileSpreadsheet size={24} style={{ color: 'var(--success)' }} aria-hidden="true" />
                  </div>
                  <div className={styles.exportInfo}>
                    <h4>Export Excel</h4>
                    <p>Tableur modifiable (.xlsx)</p>
                  </div>
                  {exportLoading && <span className={styles.loadingSpinner} />}
                </button>
              </div>
              <div className={styles.exportFilters}>
                <h5>Options d'export</h5>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={exportOptions.includeDetails}
                    onChange={(e) => onOptionsChange({ ...exportOptions, includeDetails: e.target.checked })}
                  />
                  <span>Inclure les détails des vendeurs/acquéreurs</span>
                </label>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={exportOptions.includeHistorique}
                    onChange={(e) => onOptionsChange({ ...exportOptions, includeHistorique: e.target.checked })}
                  />
                  <span>Inclure l'historique des actions</span>
                </label>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={exportOptions.onlyEnCours}
                    onChange={(e) => onOptionsChange({ ...exportOptions, onlyEnCours: e.target.checked })}
                  />
                  <span>Uniquement les ventes en cours</span>
                </label>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
