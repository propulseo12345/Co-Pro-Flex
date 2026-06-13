'use client';

import { User, RefreshCw, X, Mail, Phone, FileSignature, Check, CheckCircle, PenTool, Trash2, Send } from 'lucide-react';
import type { Signataire } from '../domain/types';
import type { ModeSignature } from '@/types/models/pv-signature';
import styles from '../../../../app/(dashboard)/ag/[id]/pv/pv.module.css';

interface ModeConfig {
  boutonAction: string;
  emailObligatoire: boolean;
}

interface SignatairesModalProps {
  isOpen: boolean;
  signataires: Signataire[];
  modeSignature: ModeSignature;
  modeConfig: ModeConfig;
  isEmailObligatoire: boolean;
  autoFillSuccess: string | null;
  onClose: () => void;
  onAutoFill: () => void;
  onUpdateSignataire: (id: string, field: keyof Signataire, value: string) => void;
  onOpenSignaturePad: (signataire: Signataire) => void;
  onClearSignature: (signataireId: string) => void;
  onSetModeSignature: (mode: ModeSignature) => void;
  onSendSignatureRequests: () => void;
}

export function SignatairesModal({
  isOpen,
  signataires,
  modeSignature,
  modeConfig,
  isEmailObligatoire,
  autoFillSuccess,
  onClose,
  onAutoFill,
  onUpdateSignataire,
  onOpenSignaturePad,
  onClearSignature,
  onSetModeSignature,
  onSendSignatureRequests,
}: SignatairesModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <User size={24} aria-hidden="true" />
            Signataires du procès-verbal
          </h2>
          <div className={styles.modalHeaderActions}>
            <button onClick={onAutoFill} className={styles.autoFillBtn} title="Pré-remplir avec les données des résolutions de l'AG">
              <RefreshCw size={16} aria-hidden="true" />
              Pré-remplir depuis l'AG
            </button>
            <button onClick={onClose} className={styles.closeButton}>
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        </div>

        <p className={styles.modalDescription}>
          Renseignez les informations des personnes devant signer le PV. Choisissez le mode de signature ci-dessous.
        </p>

        {/* Mode signature selector */}
        <div className={styles.modeSignatureSelector}>
          <label className={styles.modeLabel}>Mode de signature</label>
          <div className={styles.modeOptions}>
            <button
              type="button"
              className={`${styles.modeOption} ${modeSignature === 'sur_place' ? styles.modeSelected : ''}`}
              onClick={() => onSetModeSignature('sur_place')}
            >
              <div className={styles.modeOptionHeader}>
                <FileSignature size={20} aria-hidden="true" />
                {modeSignature === 'sur_place' && <Check size={14} className={styles.modeCheck} aria-hidden="true" />}
              </div>
              <span className={styles.modeOptionLabel}>Signature sur place</span>
              <span className={styles.modeOptionHint}>Email facultatif</span>
            </button>
            <button
              type="button"
              className={`${styles.modeOption} ${modeSignature === 'electronique' ? styles.modeSelected : ''}`}
              onClick={() => onSetModeSignature('electronique')}
            >
              <div className={styles.modeOptionHeader}>
                <Mail size={20} aria-hidden="true" />
                {modeSignature === 'electronique' && <Check size={14} className={styles.modeCheck} aria-hidden="true" />}
              </div>
              <span className={styles.modeOptionLabel}>Signature électronique</span>
              <span className={styles.modeOptionHint}>Email obligatoire</span>
            </button>
          </div>
        </div>

        {/* Success message */}
        {autoFillSuccess && (
          <div className={styles.autoFillSuccessBanner}>
            <CheckCircle size={16} aria-hidden="true" />
            <span>{autoFillSuccess}</span>
          </div>
        )}

        {/* Signataires list */}
        <div className={styles.signatairesList}>
          {signataires.map((signataire) => (
            <div key={signataire.id} className={styles.signataireCard}>
              <div className={styles.signataireHeader}>
                <span className={styles.signataireRole}>{signataire.roleLabel}</span>
                {signataire.signature && (
                  <span className={styles.signedBadge}>
                    <CheckCircle size={14} aria-hidden="true" />
                    Signé
                  </span>
                )}
              </div>

              <div className={styles.signataireForm}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Prénom</label>
                    <input
                      type="text"
                      value={signataire.prenom}
                      onChange={(e) => onUpdateSignataire(signataire.id, 'prenom', e.target.value)}
                      placeholder="Prénom"
                      className={styles.formInput}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Nom</label>
                    <input
                      type="text"
                      value={signataire.nom}
                      onChange={(e) => onUpdateSignataire(signataire.id, 'nom', e.target.value)}
                      placeholder="Nom"
                      className={styles.formInput}
                    />
                  </div>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>
                      <Mail size={14} aria-hidden="true" />
                      Email {isEmailObligatoire ? '*' : <span className={styles.optionalLabel}>(facultatif)</span>}
                    </label>
                    <input
                      type="email"
                      value={signataire.email}
                      onChange={(e) => onUpdateSignataire(signataire.id, 'email', e.target.value)}
                      placeholder={isEmailObligatoire ? 'email@exemple.fr (obligatoire)' : 'email@exemple.fr (facultatif)'}
                      className={styles.formInput}
                      required={isEmailObligatoire}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>
                      <Phone size={14} aria-hidden="true" />
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={signataire.telephone}
                      onChange={(e) => onUpdateSignataire(signataire.id, 'telephone', e.target.value)}
                      placeholder="06 00 00 00 00"
                      className={styles.formInput}
                    />
                  </div>
                </div>
              </div>

              {signataire.signature ? (
                <div className={styles.signaturePreview}>
                  {/* Signature = data-URI dynamique issue du pad de signature, dimensions inconnues → next/image inadapté */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={signataire.signature} alt="Signature" />
                  <button onClick={() => onClearSignature(signataire.id)} className={styles.removeSignatureBtn}>
                    <Trash2 size={14} aria-hidden="true" />
                    Supprimer
                  </button>
                </div>
              ) : (
                <button onClick={() => onOpenSignaturePad(signataire)} className={styles.signOnPlaceBtn}>
                  <PenTool size={16} aria-hidden="true" />
                  Signer sur place
                </button>
              )}
            </div>
          ))}
        </div>

        <div className={styles.modalActions}>
          <button onClick={onClose} className="btn btn-secondary">
            Annuler
          </button>
          <button onClick={onSendSignatureRequests} className={`btn ${modeSignature === 'sur_place' ? 'btn-success' : 'btn-primary'}`}>
            {modeSignature === 'sur_place' ? (
              <>
                <FileSignature size={16} aria-hidden="true" />
                {modeConfig.boutonAction}
              </>
            ) : (
              <>
                <Send size={16} aria-hidden="true" />
                {modeConfig.boutonAction}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
