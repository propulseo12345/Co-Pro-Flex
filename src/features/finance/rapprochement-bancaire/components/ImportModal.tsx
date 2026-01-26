'use client';

import { RefObject } from 'react';
import { FileUp, RefreshCw, ArrowLeftRight, HelpCircle } from 'lucide-react';
import { MOIS_FR } from '../domain/constants';
import styles from '../../../../app/(dashboard)/finance/rapprochement-bancaire/rapprochement-bancaire.module.css';

interface ImportModalProps {
  isOpen: boolean;
  isImporting: boolean;
  moisSelectionne: number;
  anneeSelectionnee: number;
  soldeReleveDebut: number;
  soldeReleveFin: number;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onMoisChange: (mois: number) => void;
  onAnneeChange: (annee: number) => void;
  onSoldeDebutChange: (solde: number) => void;
  onSoldeFinChange: (solde: number) => void;
  onImport: () => void;
}

export function ImportModal({
  isOpen,
  isImporting,
  moisSelectionne,
  anneeSelectionnee,
  soldeReleveDebut,
  soldeReleveFin,
  fileInputRef,
  onClose,
  onMoisChange,
  onAnneeChange,
  onSoldeDebutChange,
  onSoldeFinChange,
  onImport,
}: ImportModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={() => !isImporting && onClose()}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Nouveau rapprochement bancaire</h2>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label>Période à rapprocher</label>
            <div className={styles.periodeSelector}>
              <select
                value={moisSelectionne}
                onChange={(e) => onMoisChange(parseInt(e.target.value))}
              >
                {MOIS_FR.map((mois, index) => (
                  <option key={index} value={index}>{mois}</option>
                ))}
              </select>
              <select
                value={anneeSelectionnee}
                onChange={(e) => onAnneeChange(parseInt(e.target.value))}
              >
                {[2024, 2025, 2026].map(annee => (
                  <option key={annee} value={annee}>{annee}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Soldes du relevé bancaire</label>
            <div className={styles.soldesInputs}>
              <div>
                <span className={styles.inputLabel}>Solde début de mois</span>
                <input
                  type="number"
                  step="0.01"
                  value={soldeReleveDebut}
                  onChange={(e) => onSoldeDebutChange(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <span className={styles.inputLabel}>Solde fin de mois</span>
                <input
                  type="number"
                  step="0.01"
                  value={soldeReleveFin}
                  onChange={(e) => onSoldeFinChange(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Importer le relevé bancaire</label>
            <div className={styles.uploadZone}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.pdf"
                className={styles.hiddenInput}
              />
              <FileUp size={32} />
              <p>Glissez-déposez votre fichier ici ou</p>
              <button className={styles.uploadButton} onClick={() => fileInputRef.current?.click()}>
                Parcourir les fichiers
              </button>
              <span className={styles.uploadHint}>Formats acceptés: CSV, Excel, PDF</span>
            </div>
          </div>

          <div className={styles.infoBox}>
            <HelpCircle size={18} />
            <div>
              <strong>Mode démonstration</strong>
              <p>Pour cette démo, cliquez sur &quot;Lancer le rapprochement&quot; pour utiliser des données d&apos;exemple.</p>
            </div>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button
            className={styles.cancelButton}
            onClick={onClose}
            disabled={isImporting}
          >
            Annuler
          </button>
          <button
            className={styles.primaryButton}
            onClick={onImport}
            disabled={isImporting}
          >
            {isImporting ? (
              <>
                <RefreshCw size={18} className={styles.spinning} />
                Analyse en cours...
              </>
            ) : (
              <>
                <ArrowLeftRight size={18} />
                Lancer le rapprochement
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
