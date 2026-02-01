'use client';

import { useState, useCallback } from 'react';
import { Paperclip, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { PJFacture } from '../types';
import { useFacturePJ } from '@/hooks/useFacturePJ';
import { facturePJService } from '@/lib/services/facture-pj.service';
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
  required = false,
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
    onChange, // Le hook notifie directement le parent quand l'état change
  });

  // Gérer l'upload de fichiers
  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      clearError();
      let currentCount = piecesJointes.length;

      for (const file of files) {
        // Le premier fichier sera marqué comme principal s'il n'y en a pas encore
        const estPrincipale = currentCount === 0;
        await uploadFichier(file, estPrincipale);
        currentCount++;
      }
      // La notification est automatique via useEffect dans le hook
    },
    [clearError, piecesJointes.length, uploadFichier]
  );

  // Gérer l'ajout d'un lien externe
  const handleLienExterne = useCallback(
    async (url: string, nom?: string) => {
      const estPrincipale = piecesJointes.length === 0;
      await ajouterLienExterne(url, nom, estPrincipale);
      // La notification est automatique via useEffect dans le hook
    },
    [ajouterLienExterne, piecesJointes.length]
  );

  // Gérer la suppression
  const handleSupprimer = useCallback(
    async (pjId: string) => {
      await supprimerPJ(pjId);
      // La notification est automatique via useEffect dans le hook
    },
    [supprimerPJ]
  );

  // Gérer le changement de principale
  const handleDefinirPrincipale = useCallback(
    async (pjId: string) => {
      await definirPrincipale(pjId);
      // La notification est automatique via useEffect dans le hook
    },
    [definirPrincipale]
  );

  // Gérer la visualisation - obtient une URL signée pour les fichiers Supabase
  const handleVoir = useCallback(
    async (pj: PJFacture) => {
      try {
        // Si c'est un lien externe ou un blob local, ouvrir directement
        if (pj.type === 'LIEN_EXTERNE' || pj.url.startsWith('blob:') || pj.url.startsWith('http')) {
          window.open(pj.url, '_blank', 'noopener,noreferrer');
          return;
        }
        // Sinon, obtenir une URL signée depuis Supabase
        const signedUrl = await facturePJService.getUrlDocument(pj.url);
        window.open(signedUrl, '_blank', 'noopener,noreferrer');
      } catch (err) {
        console.error('[FacturePJSection] Erreur visualisation:', err);
        // Fallback: essayer d'ouvrir l'URL directement
        window.open(pj.url, '_blank', 'noopener,noreferrer');
      }
    },
    []
  );

  // Gérer le téléchargement - obtient une URL signée pour les fichiers Supabase
  const handleTelecharger = useCallback(
    async (pj: PJFacture) => {
      try {
        let downloadUrl = pj.url;

        // Si ce n'est pas un blob local ou un lien http, obtenir URL signée
        if (!pj.url.startsWith('blob:') && !pj.url.startsWith('http')) {
          downloadUrl = await facturePJService.getUrlDocument(pj.url);
        }

        // Télécharger via un lien
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = pj.nom;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error('[FacturePJSection] Erreur téléchargement:', err);
      }
    },
    []
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
            onVoir={handleVoir}
            onTelecharger={handleTelecharger}
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
