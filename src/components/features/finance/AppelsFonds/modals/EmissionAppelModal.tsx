'use client';

import { useState, useEffect, useId, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Send,
  FileText,
  Calculator,
  Mail,
  AlertCircle,
  CheckCircle,
  Loader2,
  Users,
  Calendar,
  Euro,
} from 'lucide-react';
import { useEmissionAppel } from '@/hooks/useEmissionAppel';
import * as financeApi from '@/lib/finance/api';
import type { AppelFondsEmission } from '@/lib/services/emission-appel.service';
import styles from './EmissionAppelModal.module.css';

interface EmissionAppelModalProps {
  isOpen: boolean;
  onClose: () => void;
  appel: AppelFondsEmission;
}

type EtapeEmission = 'options' | 'validation';

export function EmissionAppelModal({
  isOpen,
  onClose,
  appel,
}: EmissionAppelModalProps) {
  const titleId = useId();
  const router = useRouter();

  const {
    isValidating,
    validationResult,
    validerPourEmission,
    resetState,
    getRecapitulatif,
  } = useEmissionAppel();

  // État local
  const [etape, setEtape] = useState<EtapeEmission>('options');
  const [options, setOptions] = useState({
    genererEcritures: true,
    genererPDF: true,
    envoyerEmails: false,
    commentaire: '',
  });

  // Récapitulatif de l'appel
  const recap = getRecapitulatif(appel);

  // Réinitialiser à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setEtape('options');
      setOptions({
        genererEcritures: true,
        genererPDF: true,
        envoyerEmails: false,
        commentaire: '',
      });
      resetState();
    }
  }, [isOpen, resetState]);

  // Formater le montant
  const formatMontant = (montant: number): string => {
    return montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  };

  // Lancer la validation
  const handleValider = useCallback(async () => {
    setEtape('validation');
    await validerPourEmission(appel);
  }, [appel, validerPourEmission]);

  // Émettre l'appel (statut → issued) puis naviguer vers la page copropriétaires
  const handleNavigateToDetail = useCallback(async () => {
    // Load the call to get period_id + trimester, then update ALL sibling calls
    const callResult = await financeApi.getCallById(appel.id);
    if (callResult.data) {
      const mainCall = callResult.data;
      let callIds = [mainCall.id];

      // Load siblings (same period + trimester = all keys)
      if (mainCall.trimester != null) {
        const siblingsResult = await financeApi.getCallsForTrimester(
          mainCall.copro_id,
          mainCall.period_id,
          mainCall.trimester
        );
        if (siblingsResult.data && siblingsResult.data.length > 0) {
          callIds = siblingsResult.data.map(c => c.id);
        }
      }

      // Update all to 'issued'
      await Promise.all(
        callIds.map(id => financeApi.updateCallStatus(id, 'issued'))
      );
    }

    resetState();
    onClose();
    router.push(`/finance/appels-fonds/${appel.id}`);
  }, [appel.id, resetState, onClose, router]);

  // Fermer et réinitialiser
  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  // Empêcher la propagation du clic
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={handleContentClick}
      >
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerIcon}>
            <Send size={24} aria-hidden="true" />
          </div>
          <h2 id={titleId}>Émettre l&apos;appel de fonds</h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={handleClose}
            aria-label="Fermer"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        {/* Contenu selon l'étape */}
        <div className={styles.content}>
          {/* ÉTAPE 1 : Options */}
          {etape === 'options' && (
            <>
              {/* Récapitulatif de l'appel */}
              <div className={styles.recap}>
                <h3>Récapitulatif</h3>
                <div className={styles.recapGrid}>
                  <div className={styles.recapItem}>
                    <FileText size={16} aria-hidden="true" />
                    <span>Appel n°{appel.numero}</span>
                  </div>
                  <div className={styles.recapItem}>
                    <Euro size={16} aria-hidden="true" />
                    <span>{formatMontant(recap.montantTotal)}</span>
                  </div>
                  <div className={styles.recapItem}>
                    <Users size={16} aria-hidden="true" />
                    <span>{recap.nbCoproprietaires} copropriétaire{recap.nbCoproprietaires > 1 ? 's' : ''}</span>
                  </div>
                  <div className={styles.recapItem}>
                    <Calendar size={16} aria-hidden="true" />
                    <span>Échéance : {recap.dateEcheanceFormatee}</span>
                  </div>
                </div>
                <p className={styles.recapDescription}>{appel.description}</p>
              </div>

              {/* Options d'émission */}
              <div className={styles.optionsSection}>
                <h3>Options d&apos;émission</h3>

                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={options.genererEcritures}
                    onChange={(e) =>
                      setOptions((o) => ({ ...o, genererEcritures: e.target.checked }))
                    }
                  />
                  <Calculator size={16} aria-hidden="true" />
                  <span>Créer les écritures comptables</span>
                </label>
                <p className={styles.optionHint}>
                  Génère automatiquement les écritures débit/crédit dans le journal comptable
                </p>

                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={options.genererPDF}
                    onChange={(e) =>
                      setOptions((o) => ({ ...o, genererPDF: e.target.checked }))
                    }
                  />
                  <FileText size={16} aria-hidden="true" />
                  <span>Générer les documents PDF</span>
                </label>
                <p className={styles.optionHint}>
                  Crée un document PDF personnalisé pour chaque copropriétaire
                </p>

                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={options.envoyerEmails}
                    onChange={(e) =>
                      setOptions((o) => ({ ...o, envoyerEmails: e.target.checked }))
                    }
                  />
                  <Mail size={16} aria-hidden="true" />
                  <span>Envoyer par email aux copropriétaires</span>
                </label>
                <p className={styles.optionHint}>
                  Envoie automatiquement l&apos;appel de fonds par email
                </p>

                <div className={styles.commentaire}>
                  <label htmlFor="commentaire">Commentaire (optionnel)</label>
                  <textarea
                    id="commentaire"
                    value={options.commentaire}
                    onChange={(e) =>
                      setOptions((o) => ({ ...o, commentaire: e.target.value }))
                    }
                    placeholder="Ajoutez un commentaire interne..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Avertissement */}
              <div className={styles.warning}>
                <AlertCircle size={16} aria-hidden="true" />
                <span>
                  Cette action va faire passer l&apos;appel en statut &quot;Émis&quot;. Les modifications
                  seront limitées après cette opération.
                </span>
              </div>
            </>
          )}

          {/* ÉTAPE 2 : Validation */}
          {etape === 'validation' && (
            <div className={styles.validationSection}>
              {isValidating ? (
                <div className={styles.loading}>
                  <Loader2 size={32} className={styles.spinner} aria-hidden="true" />
                  <p>Validation en cours...</p>
                </div>
              ) : validationResult ? (
                validationResult.valide ? (
                  <div className={styles.validationSuccess}>
                    <CheckCircle size={48} className={styles.successIcon} aria-hidden="true" />
                    <h3>Validation réussie</h3>
                    <p>L&apos;appel de fonds peut être émis.</p>
                  </div>
                ) : (
                  <div className={styles.validationError}>
                    <AlertCircle size={48} className={styles.errorIcon} aria-hidden="true" />
                    <h3>Validation échouée</h3>
                    <ul>
                      {validationResult.erreurs.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )
              ) : null}
            </div>
          )}
        </div>

        {/* Footer avec actions */}
        <footer className={styles.footer}>
          {etape === 'options' && (
            <>
              <button type="button" className={styles.cancelBtn} onClick={handleClose}>
                Annuler
              </button>
              <button type="button" className={styles.validateBtn} onClick={handleValider}>
                Vérifier et continuer
              </button>
            </>
          )}

          {etape === 'validation' && validationResult?.valide && (
            <>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setEtape('options')}
              >
                Retour aux options
              </button>
              <button
                type="button"
                className={styles.emitBtn}
                onClick={handleNavigateToDetail}
              >
                <Send size={16} aria-hidden="true" />
                Émettre l&apos;appel
              </button>
            </>
          )}

          {etape === 'validation' && validationResult && !validationResult.valide && (
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => setEtape('options')}
            >
              Retour aux options
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
