'use client';

import { useState, useCallback } from 'react';
import { Paperclip, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { PJFacture } from '../types';
import { useFacturePJ } from '@/hooks/useFacturePJ';
import { UploadZone } from './UploadZone';
import { PJList } from './PJList';
import { LienExterneModal } from './LienExterneModal';
import styles from './FacturePJSection.module.css';

interface FacturePJSectionProps {
  factureId?: string;
  initialPJ?: PJFacture[];
  onChange?: (pj: PJFacture[]) => void;
  readOnly?: boolean;
  required?: boolean;
}

/**
 * Section complète de gestion des pièces jointes d'une facture
 */
export function FacturePJSection({
  factureId,
  initialPJ = [],
  onChange,
  readOnly = false,
  required = true,
}: FacturePJSectionProps) {
  const [showLienModal, setShowLienModal] = useState(false);

  const {
    piecesJointes,
    isLoading,
    error,
    uploadFichier,
    ajouterLienExterne,
    supprimerPJ,
    definirPrincipale,
    clearError,
  } = useFacturePJ({
    factureId,
    initialPJ,
  });

  // Notifier le parent des changements
  const notifyChange = useCallback(
    (newPJ: PJFacture[]) => {
      if (onChange) {
        onChange(newPJ);
      }
    },
    [onChange]
  );

  // Gérer l'upload de fichiers
  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      clearError();

      for (const file of files) {
        // Le premier fichier sera marqué comme principal s'il n'y en a pas encore
        const estPrincipale = piecesJointes.length === 0 && files.indexOf(file) === 0;
        await uploadFichier(file, estPrincipale);
      }

      // Notifier après tous les uploads
      notifyChange([...piecesJointes]);
    },
    [clearError, piecesJointes, uploadFichier, notifyChange]
  );

  // Gérer l'ajout d'un lien externe
  const handleLienExterne = useCallback(
    async (url: string, nom?: string) => {
      const estPrincipale = piecesJointes.length === 0;
      await ajouterLienExterne(url, nom, estPrincipale);
      notifyChange([...piecesJointes]);
    },
    [ajouterLienExterne, piecesJointes, notifyChange]
  );

  // Gérer la suppression
  const handleSupprimer = useCallback(
    async (pjId: string) => {
      await supprimerPJ(pjId);
      notifyChange(piecesJointes.filter((p) => p.id !== pjId));
    },
    [supprimerPJ, piecesJointes, notifyChange]
  );

  // Gérer le changement de principale
  const handleDefinirPrincipale = useCallback(
    async (pjId: string) => {
      await definirPrincipale(pjId);
      notifyChange(
        piecesJointes.map((p) => ({
          ...p,
          estPrincipale: p.id === pjId,
        }))
      );
    },
    [definirPrincipale, piecesJointes, notifyChange]
  );

  const hasNoPJ = piecesJointes.length === 0;
  const showError = required && hasNoPJ && error;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <Paperclip size={18} aria-hidden="true" />
          <h3 className={styles.title}>
            Pièces jointes
            {required && <span className={styles.required}>*</span>}
          </h3>
        </div>
        {!readOnly && (
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => setShowLienModal(true)}
          >
            <LinkIcon size={16} aria-hidden="true" />
            Ajouter un lien
          </button>
        )}
      </div>

      {!readOnly && (
        <UploadZone
          onFilesSelected={handleFilesSelected}
          disabled={isLoading}
          error={error}
        />
      )}

      {piecesJointes.length > 0 && (
        <div className={styles.listContainer}>
          <PJList
            piecesJointes={piecesJointes}
            onSupprimer={!readOnly ? handleSupprimer : undefined}
            onDefinirPrincipale={!readOnly ? handleDefinirPrincipale : undefined}
            readOnly={readOnly}
          />
        </div>
      )}

      {showError && (
        <div className={styles.requiredError}>
          <AlertCircle size={14} aria-hidden="true" />
          <span>Une facture doit être accompagnée d'un justificatif pour être enregistrée</span>
        </div>
      )}

      {isLoading && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Upload en cours...</span>
        </div>
      )}

      <LienExterneModal
        isOpen={showLienModal}
        onClose={() => setShowLienModal(false)}
        onConfirm={handleLienExterne}
      />
    </div>
  );
}
