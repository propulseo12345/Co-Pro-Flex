'use client';

import { useId, useCallback } from 'react';
import { X, Coins, AlertCircle, CalendarDays, CheckCircle, Info } from 'lucide-react';
import {
  BudgetTravaux,
  getProchainAppelPrevu,
  tousAppelsGeneres,
  getModeEcheancierLabel,
  getBudgetAppele,
} from '../types';
import styles from './CreateBudgetModal.module.css';

interface NouvelAppelFondsTravauxModalProps {
  travaux: BudgetTravaux;
  onGenerateAppel: (travauxId: string) => void;
  onClose: () => void;
}

export function NouvelAppelFondsTravauxModal({
  travaux,
  onGenerateAppel,
  onClose,
}: NouvelAppelFondsTravauxModalProps) {
  const titleId = useId();

  const prochainAppel = getProchainAppelPrevu(travaux);
  const tousGeneres = tousAppelsGeneres(travaux);
  const budgetAppele = getBudgetAppele(travaux.appelsDeFonds);
  const appelsGeneres = travaux.appelsDeFonds.length;
  const totalAppelsPrevus = travaux.echeancier?.nombreAppels || 0;

  const handleConfirm = useCallback(() => {
    onGenerateAppel(travaux.id);
  }, [onGenerateAppel, travaux.id]);

  // Pas d'échéancier défini
  if (!travaux.echeancier) {
    return (
      <div className={styles.modalOverlay} onClick={onClose}>
        <div
          className={styles.modalContent}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className={styles.modalHeader}>
            <h2 id={titleId} className={styles.modalTitle}>
              Appels de fonds
            </h2>
            <button
              onClick={onClose}
              className={styles.closeButton}
              aria-label="Fermer"
            >
              <X size={24} aria-hidden="true" />
            </button>
          </div>

          <div className={styles.modalBody}>
            <div className={styles.warningBox}>
              <AlertCircle size={20} aria-hidden="true" />
              <div className={styles.warningContent}>
                <p className={styles.warningTitle}>
                  Aucun échéancier défini
                </p>
                <p className={styles.warningText}>
                  Ce budget travaux n&apos;a pas d&apos;échéancier d&apos;appels de fonds.
                  L&apos;échéancier doit être défini lors du vote en Assemblée Générale.
                </p>
              </div>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button onClick={onClose} className="btn btn-secondary">
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Tous les appels ont été générés
  if (tousGeneres) {
    return (
      <div className={styles.modalOverlay} onClick={onClose}>
        <div
          className={styles.modalContent}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className={styles.modalHeader}>
            <h2 id={titleId} className={styles.modalTitle}>
              Appels de fonds
            </h2>
            <button
              onClick={onClose}
              className={styles.closeButton}
              aria-label="Fermer"
            >
              <X size={24} aria-hidden="true" />
            </button>
          </div>

          <div className={styles.modalBody}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-lg)',
              padding: 'var(--space-xl)',
              textAlign: 'center',
            }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'var(--success-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <CheckCircle size={32} style={{ color: 'var(--success)' }} aria-hidden="true" />
              </div>
              <div>
                <h3 style={{ margin: '0 0 var(--space-sm) 0', fontSize: 'var(--text-lg)' }}>
                  Tous les appels ont été générés
                </h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  Les {totalAppelsPrevus} appels de fonds prévus pour ce budget travaux ont été générés.
                </p>
              </div>
            </div>

            {/* Récapitulatif */}
            <div className={styles.configSection} style={{ marginTop: 'var(--space-lg)' }}>
              <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, margin: '0 0 var(--space-md) 0' }}>
                Récapitulatif des appels
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {travaux.appelsDeFonds.map((appel) => (
                  <div
                    key={appel.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: 'var(--space-sm) var(--space-md)',
                      background: 'var(--surface)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 500 }}>Appel n°{appel.numero}</span>
                      <span style={{ color: 'var(--text-secondary)', marginLeft: 'var(--space-sm)', fontSize: 'var(--text-sm)' }}>
                        {appel.description}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                      <span style={{ fontWeight: 600 }}>{appel.montant.toLocaleString('fr-FR')} €</span>
                      <span style={{
                        padding: 'var(--space-xs) var(--space-sm)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 500,
                        background: appel.statut === 'PAYE' ? 'var(--success-light)' : appel.statut === 'ENVOYE' ? 'var(--info-light)' : 'var(--bg-secondary)',
                        color: appel.statut === 'PAYE' ? 'var(--success)' : appel.statut === 'ENVOYE' ? 'var(--info)' : 'var(--text-secondary)',
                      }}>
                        {appel.statut === 'PAYE' ? 'Payé' : appel.statut === 'ENVOYE' ? 'Envoyé' : 'En attente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button onClick={onClose} className="btn btn-secondary">
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Prochain appel à générer
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.modalHeader}>
          <h2 id={titleId} className={styles.modalTitle}>
            Générer le prochain appel de fonds
          </h2>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Fermer"
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalBody}>
          <p className={styles.subtitle}>
            Budget travaux « {travaux.titre} »
          </p>

          {/* Résumé de l'échéancier */}
          <div className={styles.configSection}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
              <Info size={16} style={{ color: 'var(--info)' }} aria-hidden="true" />
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                Échéancier : {getModeEcheancierLabel(travaux.echeancier.mode)}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)', textAlign: 'center' }}>
              <div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: '0 0 var(--space-xs) 0' }}>
                  Budget voté
                </p>
                <p style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                  {travaux.budgetVote.toLocaleString('fr-FR')} €
                </p>
              </div>
              <div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: '0 0 var(--space-xs) 0' }}>
                  Déjà appelé
                </p>
                <p style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--info)', margin: 0 }}>
                  {budgetAppele.toLocaleString('fr-FR')} €
                </p>
              </div>
              <div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: '0 0 var(--space-xs) 0' }}>
                  Appels générés
                </p>
                <p style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                  {appelsGeneres} / {totalAppelsPrevus}
                </p>
              </div>
            </div>
          </div>

          {/* Détails du prochain appel */}
          {prochainAppel && (
            <div style={{
              marginTop: 'var(--space-xl)',
              padding: 'var(--space-lg)',
              background: 'var(--primary-light)',
              borderRadius: 'var(--radius-lg)',
              border: '2px solid var(--primary)',
            }}>
              <h4 style={{ margin: '0 0 var(--space-md) 0', color: 'var(--primary)', fontSize: 'var(--text-md)' }}>
                Appel n°{prochainAppel.numero} à générer
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <Coins size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
                  <span style={{ fontWeight: 500 }}>Montant :</span>
                  <span style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--primary)' }}>
                    {prochainAppel.montant.toLocaleString('fr-FR')} €
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <CalendarDays size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
                  <span style={{ fontWeight: 500 }}>Échéance :</span>
                  <span>
                    {new Date(prochainAppel.dateEcheance).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                {prochainAppel.description && (
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    {prochainAppel.description}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className={styles.infoBox} style={{ marginTop: 'var(--space-lg)' }}>
            <p className={styles.infoText}>
              L&apos;appel de fonds sera généré avec le statut « En attente ».
              Vous pourrez ensuite l&apos;envoyer aux copropriétaires depuis la liste des appels.
            </p>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button onClick={onClose} className="btn btn-secondary">
            Annuler
          </button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
          >
            <Coins size={16} aria-hidden="true" />
            Générer l&apos;appel n°{prochainAppel?.numero}
          </button>
        </div>
      </div>
    </div>
  );
}
