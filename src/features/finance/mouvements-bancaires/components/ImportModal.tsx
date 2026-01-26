'use client';

import {
  Upload,
  X,
  Info,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import styles from '../../../../app/(dashboard)/finance/mouvements-bancaires/mouvements-bancaires.module.css';

type ImportType = 'csv' | 'ofx' | 'qif';

interface ImportModalProps {
  isOpen: boolean;
  importType: ImportType;
  importFile: File | null;
  isImporting: boolean;
  onClose: () => void;
  onImportTypeChange: (type: ImportType) => void;
  onFileChange: (file: File | null) => void;
  onImport: () => void;
}

export function ImportModal({
  isOpen,
  importType,
  importFile,
  isImporting,
  onClose,
  onImportTypeChange,
  onFileChange,
  onImport,
}: ImportModalProps) {
  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
    onFileChange(null);
  };

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <Upload size={24} />
            Import manuel de mouvements
          </h2>
          <button
            className={styles.closeModalButton}
            onClick={handleClose}
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.importInfo}>
            <Info size={18} />
            <p>
              Importez vos relevés bancaires manuellement si la synchronisation automatique
              n&apos;est pas disponible ou en cas de problème de connexion avec votre banque.
            </p>
          </div>

          <div className={styles.importFormatSection}>
            <h3 className={styles.importSectionTitle}>Format du fichier</h3>
            <div className={styles.importFormatOptions}>
              <label className={`${styles.importFormatOption} ${importType === 'csv' ? styles.importFormatSelected : ''}`}>
                <input
                  type="radio"
                  name="importType"
                  value="csv"
                  checked={importType === 'csv'}
                  onChange={() => onImportTypeChange('csv')}
                />
                <FileSpreadsheet size={24} />
                <span className={styles.importFormatName}>CSV</span>
                <span className={styles.importFormatDesc}>Format universel, export Excel</span>
              </label>

              <label className={`${styles.importFormatOption} ${importType === 'ofx' ? styles.importFormatSelected : ''}`}>
                <input
                  type="radio"
                  name="importType"
                  value="ofx"
                  checked={importType === 'ofx'}
                  onChange={() => onImportTypeChange('ofx')}
                />
                <FileText size={24} />
                <span className={styles.importFormatName}>OFX</span>
                <span className={styles.importFormatDesc}>Open Financial Exchange</span>
              </label>

              <label className={`${styles.importFormatOption} ${importType === 'qif' ? styles.importFormatSelected : ''}`}>
                <input
                  type="radio"
                  name="importType"
                  value="qif"
                  checked={importType === 'qif'}
                  onChange={() => onImportTypeChange('qif')}
                />
                <FileText size={24} />
                <span className={styles.importFormatName}>QIF</span>
                <span className={styles.importFormatDesc}>Quicken Interchange Format</span>
              </label>
            </div>
          </div>

          <div className={styles.importFileSection}>
            <h3 className={styles.importSectionTitle}>Sélectionner le fichier</h3>
            <div className={styles.importDropzone}>
              <input
                type="file"
                id="import-file"
                accept={importType === 'csv' ? '.csv' : importType === 'ofx' ? '.ofx' : '.qif'}
                onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                className={styles.importFileInput}
              />
              <label htmlFor="import-file" className={styles.importDropzoneLabel}>
                {importFile ? (
                  <>
                    <CheckCircle size={32} className={styles.importFileSuccess} />
                    <span className={styles.importFileName}>{importFile.name}</span>
                    <span className={styles.importFileSize}>
                      {(importFile.size / 1024).toFixed(1)} Ko
                    </span>
                  </>
                ) : (
                  <>
                    <Upload size={32} />
                    <span>Cliquez ou glissez-déposez votre fichier ici</span>
                    <span className={styles.importFileHint}>
                      Formats acceptés : .{importType.toUpperCase()}
                    </span>
                  </>
                )}
              </label>
            </div>
          </div>

          <div className={styles.importHelpSection}>
            <h4>Comment obtenir ce fichier ?</h4>
            <ol>
              <li>Connectez-vous à votre espace bancaire en ligne</li>
              <li>Accédez à la section &quot;Relevés&quot; ou &quot;Téléchargements&quot;</li>
              <li>Sélectionnez la période souhaitée</li>
              <li>Choisissez le format {importType.toUpperCase()} et téléchargez</li>
            </ol>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            className={styles.cancelButton}
            onClick={handleClose}
          >
            Annuler
          </button>
          <button
            className={styles.saveButton}
            onClick={onImport}
            disabled={!importFile || isImporting}
          >
            {isImporting ? (
              <>
                <RefreshCw size={18} className={styles.spinning} />
                Import en cours...
              </>
            ) : (
              <>
                <Upload size={18} />
                Importer les mouvements
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
