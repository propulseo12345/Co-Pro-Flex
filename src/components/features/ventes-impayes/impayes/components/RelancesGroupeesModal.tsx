'use client';

import { X, Users, Eye, Send, ChevronLeft, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import type { Impaye, RelanceGroupeeStep } from '../domain/types';
import { WORKFLOW_STEPS, MODE_ENVOI_CONFIG } from '../domain/constants';
import { getModeleByType, formatPreviewContent, formatPreviewObjet } from '@/types/models/impaye';
import styles from '../../../../../app/(dashboard)/ventes-impayes/impayes/impayes.module.css';

interface RelancesGroupeesModalProps {
  isOpen: boolean;
  selectedImpayes: Impaye[];
  relanceGroupeeType: string;
  relanceGroupeeStep: RelanceGroupeeStep;
  isProcessing: boolean;
  getEligibleForType: (type: string) => Impaye[];
  onClose: () => void;
  onTypeChange: (type: string) => void;
  onStepChange: (step: RelanceGroupeeStep) => void;
  onSend: () => void;
}

export function RelancesGroupeesModal({
  isOpen,
  selectedImpayes,
  relanceGroupeeType,
  relanceGroupeeStep,
  isProcessing,
  getEligibleForType,
  onClose,
  onTypeChange,
  onStepChange,
  onSend,
}: RelancesGroupeesModalProps) {
  if (!isOpen) return null;

  const eligibleImpayes = getEligibleForType(relanceGroupeeType);

  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={() => !isProcessing && onClose()}>
      <div className={styles.modalLarge} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <h2>
            <Users size={20} aria-hidden="true" style={{ marginRight: 8 }} />
            Relances groupées
          </h2>
          <button className={styles.closeBtn} onClick={onClose} disabled={isProcessing}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalContent}>
          {relanceGroupeeStep === 'select' && (
            <>
              <div className={styles.groupeeIntro}>
                <p>
                  <strong>{selectedImpayes.length} dossier(s)</strong> sélectionné(s) pour relance groupée.
                  <br />
                  Sélectionnez le type de relance à envoyer :
                </p>
              </div>

              <div className={styles.groupeeTypesList}>
                {WORKFLOW_STEPS.map((step) => {
                  const eligible = getEligibleForType(step.id);
                  const Icon = step.icon;
                  const isDisabled = eligible.length === 0;

                  return (
                    <button
                      key={step.id}
                      className={clsx(
                        styles.groupeeTypeCard,
                        relanceGroupeeType === step.id && styles.selected,
                        isDisabled && styles.disabled
                      )}
                      onClick={() => !isDisabled && onTypeChange(step.id)}
                      disabled={isDisabled}
                      style={{
                        borderColor: relanceGroupeeType === step.id ? step.color : undefined,
                        background: relanceGroupeeType === step.id ? `${step.color}10` : undefined,
                      }}
                    >
                      <div className={styles.groupeeTypeIcon} style={{ background: `${step.color}20`, color: step.color }}>
                        <Icon size={24} aria-hidden="true" />
                      </div>
                      <div className={styles.groupeeTypeContent}>
                        <h4>{step.label}</h4>
                        <p>{eligible.length > 0 ? `${eligible.length} dossier(s) éligible(s)` : 'Aucun dossier éligible'}</p>
                      </div>
                      {eligible.length > 0 && (
                        <div className={styles.groupeeTypeBadge} style={{ background: step.color }}>
                          {eligible.length}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {relanceGroupeeType && (
                <div className={styles.groupeePreview}>
                  <h4>Aperçu des dossiers à relancer :</h4>
                  <div className={styles.groupeePreviewList}>
                    {eligibleImpayes.map((imp) => (
                      <div key={imp.id} className={styles.groupeePreviewItem}>
                        <div className={styles.groupeePreviewInfo}>
                          <strong>{imp.coproprietaire.nom}</strong>
                          <span>
                            {imp.lot} - {imp.batiment}
                          </span>
                        </div>
                        <div className={styles.groupeePreviewMontant}>{imp.montant.toLocaleString('fr-FR')} €</div>
                      </div>
                    ))}
                  </div>

                  <div className={styles.groupeeTotal}>
                    <span>Montant total :</span>
                    <strong>{eligibleImpayes.reduce((sum, imp) => sum + imp.montant, 0).toLocaleString('fr-FR')} €</strong>
                  </div>
                </div>
              )}

              <div className={styles.warningBox}>
                <AlertCircle size={16} aria-hidden="true" />
                <p>Les relances seront envoyées individuellement à chaque copropriétaire avec un courrier/email personnalisé.</p>
              </div>
            </>
          )}

          {relanceGroupeeStep === 'preview' && (() => {
            const modele = getModeleByType(relanceGroupeeType as 'relance_amiable_1' | 'relance_amiable_2' | 'mise_en_demeure');
            const ModeIcon = modele ? MODE_ENVOI_CONFIG[modele.modeEnvoi].icon : Users;
            const hasEmailMissing = modele?.modeEnvoi === 'email' && eligibleImpayes.some((imp) => !imp.coproprietaire.email);

            if (!modele) return null;

            return (
              <>
                <div className={styles.previewNavigation}>
                  <button className={styles.previewBackBtn} onClick={() => onStepChange('select')} disabled={isProcessing}>
                    <ChevronLeft size={16} aria-hidden="true" />
                    Retour
                  </button>
                  <div className={styles.previewStepIndicator}>
                    <span className={styles.previewStepBadge}>2</span>
                    <span>Récapitulatif avant envoi</span>
                  </div>
                </div>

                <div className={styles.previewHeader}>
                  <div className={styles.previewInfoItem}>
                    <Users size={18} aria-hidden="true" />
                    <span>
                      <strong>{eligibleImpayes.length}</strong> destinataire(s)
                    </span>
                  </div>
                  <div className={styles.previewInfoItem}>
                    <ModeIcon size={18} aria-hidden="true" />
                    <span>
                      Mode : <strong>{MODE_ENVOI_CONFIG[modele.modeEnvoi].label}</strong>
                    </span>
                  </div>
                  <div className={styles.previewInfoItem}>
                    <span>
                      Modèle : <strong>{modele.libelle}</strong> (étape {modele.etape})
                    </span>
                  </div>
                </div>

                <div className={styles.previewContent}>
                  <div className={styles.previewContentHeader}>
                    <Eye size={16} aria-hidden="true" />
                    Aperçu du message
                  </div>
                  <div className={styles.previewObjet}>
                    <strong>Objet :</strong> {formatPreviewObjet(modele.objet)}
                  </div>
                  <div className={styles.previewBody}>{formatPreviewContent(modele.contenu)}</div>
                  <p className={styles.previewNote}>
                    Les variables entre crochets seront remplacées par les données de chaque destinataire.
                  </p>
                </div>

                <details className={styles.previewDestinataires}>
                  <summary>
                    <Users size={16} aria-hidden="true" />
                    Voir les {eligibleImpayes.length} destinataires
                  </summary>
                  <ul className={styles.previewDestinatairesList}>
                    {eligibleImpayes.map((imp) => (
                      <li key={imp.id}>
                        <div>
                          <span className={styles.previewDestinataireNom}>{imp.coproprietaire.nom}</span>
                          <span className={styles.previewDestinataireLot}>
                            {imp.lot} - {imp.batiment}
                          </span>
                          {modele.modeEnvoi === 'email' && !imp.coproprietaire.email && (
                            <span className={styles.previewWarning}>
                              <AlertTriangle size={12} aria-hidden="true" />
                              Pas d'email
                            </span>
                          )}
                        </div>
                        <span className={styles.previewDestinataireMontant}>{imp.montant.toLocaleString('fr-FR')} €</span>
                      </li>
                    ))}
                  </ul>
                </details>

                {hasEmailMissing && (
                  <div className={styles.previewAlerte}>
                    <AlertTriangle size={16} aria-hidden="true" />
                    <span>Certains destinataires n'ont pas d'adresse email. Ils ne recevront pas la relance par email.</span>
                  </div>
                )}
              </>
            );
          })()}

          {relanceGroupeeStep === 'success' && (
            <div className={styles.groupeeSuccess}>
              <div className={styles.successIcon}>
                <CheckCircle2 size={64} aria-hidden="true" />
              </div>
              <h3>Relances envoyées avec succès !</h3>
              <p>
                {eligibleImpayes.length} relance(s) ont été envoyées.
                <br />
                Les dossiers ont été mis à jour.
              </p>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          {relanceGroupeeStep === 'select' && (
            <>
              <button className="btn btn-secondary" onClick={onClose} disabled={isProcessing}>
                Annuler
              </button>
              <button
                className="btn btn-primary"
                onClick={() => onStepChange('preview')}
                disabled={!relanceGroupeeType || eligibleImpayes.length === 0}
              >
                <Eye size={16} aria-hidden="true" />
                Prévisualiser ({eligibleImpayes.length})
              </button>
            </>
          )}

          {relanceGroupeeStep === 'preview' && (
            <>
              <button className="btn btn-secondary" onClick={() => onStepChange('select')} disabled={isProcessing}>
                Retour
              </button>
              <button className="btn btn-primary" onClick={onSend} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <span className={styles.spinner} />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send size={16} aria-hidden="true" />
                    Envoyer à {eligibleImpayes.length} destinataire(s)
                  </>
                )}
              </button>
            </>
          )}

          {relanceGroupeeStep === 'success' && (
            <button className="btn btn-primary" onClick={onClose}>
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
