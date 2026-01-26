'use client';

import { useState } from 'react';
import {
  Send,
  FileSignature,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { ModeSignature, LABELS_MODE_SIGNATURE, SignatairePV } from '@/types/models/pv-signature';
import { ValidationSignatureSurPlaceModal } from './modals/ValidationSignatureSurPlaceModal';
import styles from './SignatureActionButton.module.css';

interface SignatureActionButtonProps {
  modeSignature: ModeSignature;
  signataires: SignatairePV[];
  onValiderSurPlace: (options?: { lieuSignature?: string; dateSignature?: Date }) => Promise<void>;
  onEnvoyerElectronique: () => Promise<{ envoyes: number; erreurs: { signataireId: string; erreur: string }[] }>;
  isSaving: boolean;
}

export function SignatureActionButton({
  modeSignature,
  signataires,
  onValiderSurPlace,
  onEnvoyerElectronique,
  isSaving,
}: SignatureActionButtonProps) {
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const config = LABELS_MODE_SIGNATURE[modeSignature];
  const signatairesEnAttente = signataires.filter(s => s.statut === 'en_attente');
  const hasSignatairesEnAttente = signatairesEnAttente.length > 0;

  // Vérifier si tous les signataires ont un email (mode électronique)
  const signatairesRequièrentEmail = modeSignature === 'electronique';
  const signatairesManquantEmail = signataires.filter(
    s => s.statut === 'en_attente' && !s.email
  );
  const canProceed = !signatairesRequièrentEmail || signatairesManquantEmail.length === 0;

  const handleClick = async () => {
    setResult(null);

    if (modeSignature === 'sur_place') {
      // Ouvrir le modal de validation
      setShowValidationModal(true);
    } else {
      // Envoyer les demandes électroniques
      try {
        const res = await onEnvoyerElectronique();
        if (res.erreurs.length > 0) {
          setResult({
            success: false,
            message: `${res.envoyes} demande(s) envoyée(s), ${res.erreurs.length} erreur(s)`,
          });
        } else {
          setResult({
            success: true,
            message: `${res.envoyes} demande(s) de signature envoyée(s) avec succès`,
          });
        }
      } catch (err) {
        setResult({
          success: false,
          message: (err as Error).message,
        });
      }
    }
  };

  const handleValiderSurPlace = async (options: { lieuSignature?: string; dateSignature?: Date }) => {
    try {
      await onValiderSurPlace(options);
      setShowValidationModal(false);
      setResult({
        success: true,
        message: `${signatairesEnAttente.length} signature(s) validée(s) avec succès`,
      });
    } catch (err) {
      setResult({
        success: false,
        message: (err as Error).message,
      });
    }
  };

  return (
    <div className={styles.container}>
      {/* Erreur emails manquants */}
      {signatairesRequièrentEmail && signatairesManquantEmail.length > 0 && (
        <div className={styles.warning}>
          <AlertCircle size={16} aria-hidden="true" />
          <span>
            {signatairesManquantEmail.length} signataire(s) sans email.
            Ajoutez leur email ou passez en mode &quot;Sur place&quot;.
          </span>
        </div>
      )}

      {/* Résultat de l'action */}
      {result && (
        <div className={`${styles.result} ${result.success ? styles.success : styles.error}`}>
          {result.success ? (
            <CheckCircle size={16} aria-hidden="true" />
          ) : (
            <AlertCircle size={16} aria-hidden="true" />
          )}
          <span>{result.message}</span>
        </div>
      )}

      {/* BOUTON ADAPTATIF SELON LE MODE */}
      <button
        type="button"
        className={`${styles.actionBtn} ${modeSignature === 'sur_place' ? styles.surPlace : styles.electronique}`}
        onClick={handleClick}
        disabled={isSaving || !hasSignatairesEnAttente || !canProceed}
      >
        {isSaving ? (
          <>
            <Loader2 size={18} className={styles.spinner} aria-hidden="true" />
            Traitement en cours...
          </>
        ) : modeSignature === 'sur_place' ? (
          <>
            <FileSignature size={18} aria-hidden="true" />
            {config.boutonAction}
          </>
        ) : (
          <>
            <Send size={18} aria-hidden="true" />
            {config.boutonAction}
          </>
        )}
      </button>

      {!hasSignatairesEnAttente && signataires.length > 0 && (
        <p className={styles.noAction}>
          Tous les signataires ont déjà un statut (signé, refusé ou absent).
        </p>
      )}

      {signataires.length === 0 && (
        <p className={styles.noAction}>
          Aucun signataire défini. Ajoutez des signataires ou pré-remplissez depuis l&apos;AG.
        </p>
      )}

      {/* Modal validation sur place */}
      <ValidationSignatureSurPlaceModal
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        onValider={handleValiderSurPlace}
        signataires={signatairesEnAttente}
      />
    </div>
  );
}
