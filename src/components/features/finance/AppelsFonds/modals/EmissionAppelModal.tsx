'use client';

import { useState, useEffect, useId, useCallback } from 'react';
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
import { AppelFondsEmission, ResultatEmissionAppel } from '@/lib/services/emission-appel.service';
import styles from './EmissionAppelModal.module.css';

interface EmissionAppelModalProps {
  isOpen: boolean;
  onClose: () => void;
  appel: AppelFondsEmission;
  onEmissionSuccess: (result: ResultatEmissionAppel) => void;
}

type EtapeEmission = 'options' | 'validation' | 'progression' | 'resultat';

export function EmissionAppelModal({
  isOpen,
  onClose,
  appel,
  onEmissionSuccess,
}: EmissionAppelModalProps) {
  const titleId = useId();

  const {
    isValidating,
    isEmitting,
    validationResult,
    emissionResult,
    error,
    progression,
    validerPourEmission,
    emettreAppel,
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

  // Lancer l'émission
  const handleEmettre = useCallback(async () => {
    setEtape('progression');

    const result = await emettreAppel(appel, options);

    setEtape('resultat');

    if (result.success) {
      onEmissionSuccess(result);
    }
  }, [appel, options, emettreAppel, onEmissionSuccess]);

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
          <h2 id={titleId}>Émettre l'appel de fonds</h2>
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
                <h3>Options d'émission</h3>

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
                  Envoie automatiquement l'appel de fonds par email
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
                  Cette action va faire passer l'appel en statut "Émis". Les modifications
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
                    <p>L'appel de fonds peut être émis.</p>
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

          {/* ÉTAPE 3 : Progression */}
          {etape === 'progression' && (
            <div className={styles.progressionSection}>
              <Loader2 size={48} className={styles.spinner} aria-hidden="true" />
              <h3>Émission en cours</h3>
              <p className={styles.progressionText}>{progression}</p>
              <div className={styles.progressBar}>
                <div className={styles.progressBarFill} />
              </div>
              <p className={styles.progressionHint}>
                Veuillez patienter, ne fermez pas cette fenêtre...
              </p>
            </div>
          )}

          {/* ÉTAPE 4 : Résultat */}
          {etape === 'resultat' && (
            <div className={styles.resultatSection}>
              {emissionResult?.success ? (
                <>
                  <CheckCircle size={64} className={styles.successIcon} aria-hidden="true" />
                  <h3>Appel émis avec succès !</h3>
                  <div className={styles.resultatStats}>
                    <div className={styles.resultatStat}>
                      <span className={styles.statValue}>{emissionResult.ecrituresCreees}</span>
                      <span className={styles.statLabel}>écritures créées</span>
                    </div>
                    <div className={styles.resultatStat}>
                      <span className={styles.statValue}>{emissionResult.documentsGeneres}</span>
                      <span className={styles.statLabel}>documents générés</span>
                    </div>
                  </div>
                  <p>L'appel de fonds n°{appel.numero} est maintenant en statut "Émis".</p>
                </>
              ) : (
                <>
                  <AlertCircle size={64} className={styles.errorIcon} aria-hidden="true" />
                  <h3>Erreur lors de l'émission</h3>
                  {emissionResult?.erreurs && (
                    <ul className={styles.erreursList}>
                      {emissionResult.erreurs.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  )}
                  {error && <p className={styles.errorMessage}>{error.message}</p>}
                </>
              )}
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
                onClick={handleEmettre}
                disabled={isEmitting}
              >
                <Send size={16} aria-hidden="true" />
                Émettre l'appel
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

          {etape === 'resultat' && (
            <button type="button" className={styles.closeResultBtn} onClick={handleClose}>
              {emissionResult?.success ? 'Fermer' : 'Retour'}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
