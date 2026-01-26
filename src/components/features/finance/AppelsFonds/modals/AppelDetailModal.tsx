'use client';

import { X, Vote } from 'lucide-react';
import { useId } from 'react';
import type { AppelFonds } from '../types';
import { StatutAppelBadge } from '../StatutAppelBadge';
import { BandeauVerrouillage } from '../BandeauVerrouillage';
import { ActionsAppelGenere } from '../ActionsAppelGenere';
import { CalendrierAppel } from '../CalendrierAppel';
import { useReglesModificationAppel } from '@/hooks/useReglesModificationAppel';
import {
  getTypeAppelLabel,
  getTypeAppelClass,
  formatCurrency,
  formatDate
} from '../utils';
import { MOCK_RESOLUTIONS_AG } from '../mock-data';
import styles from '../appels-fonds.module.css';

interface AppelDetailModalProps {
  appel: AppelFonds;
  onClose: () => void;
  /** Callback pour ouvrir le suivi des envois */
  onSuivreEnvois?: () => void;
  /** Callback pour gérer les relances */
  onGererRelances?: () => void;
  /** Callback pour demander une annulation */
  onDemanderAnnulation?: () => void;
}

export function AppelDetailModal({
  appel,
  onClose,
  onSuivreEnvois,
  onGererRelances,
  onDemanderAnnulation,
}: AppelDetailModalProps) {
  const resolution = MOCK_RESOLUTIONS_AG.find(r => r.id === appel.resolutionAGId);
  const titleId = useId();

  // Vérifier si l'appel est généré (verrouillé)
  const {
    estGenere,
    messageVerrouillage,
    peutSuivre,
    peutRelancer,
  } = useReglesModificationAppel(appel);

  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.modalHeader}>
          <div>
            <h2 id={titleId} className={styles.modalTitle}>Détails de l&apos;appel de fonds</h2>
            <p className={styles.modalSubtitle}>{appel.description}</p>
          </div>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Bandeau de verrouillage si appel généré */}
          {estGenere && messageVerrouillage && (
            <BandeauVerrouillage
              message={messageVerrouillage}
              dateGeneration={appel.dateEmission}
              onDemanderAnnulation={onDemanderAnnulation}
              variant="info"
            />
          )}
          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Date d'émission</span>
              <span className={styles.detailValue}>
                {appel.dateEmission ? formatDate(appel.dateEmission) : 'Non définie'}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Date d'exigibilité</span>
              <span className={styles.detailValue}>
                {formatDate(appel.dateExigibilite)}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Période</span>
              <span className={styles.detailValue}>{appel.periode}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Type</span>
              <span className={styles.detailValue}>
                <span className={`${styles.typeBadge} ${getTypeAppelClass(appel.type)}`}>
                  {getTypeAppelLabel(appel.type)}
                </span>
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Statut</span>
              <span className={styles.detailValue}>
                <StatutAppelBadge statut={appel.statut} />
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Montant total</span>
              <span className={styles.detailValue}>
                {formatCurrency(appel.montantTotal)}
              </span>
            </div>
            {appel.montantEncaisse !== undefined && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Montant encaissé</span>
                <span className={styles.detailValue}>
                  {formatCurrency(appel.montantEncaisse)}
                </span>
              </div>
            )}
            {appel.projetNom && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Projet</span>
                <span className={styles.detailValue}>{appel.projetNom}</span>
              </div>
            )}
            {appel.budgetTravauxId && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Budget travaux ID</span>
                <span className={styles.detailValue}>{appel.budgetTravauxId}</span>
              </div>
            )}
            {appel.resolutionAGNumero && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Résolution AG</span>
                <span className={styles.detailValue}>
                  <span className={styles.resolutionBadgeLarge}>
                    <Vote size={16} aria-hidden="true" />
                    {appel.resolutionAGNumero}
                    {resolution && (
                      <span className={styles.resolutionTitle}>
                        - {resolution.titre}
                      </span>
                    )}
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Calendrier prévisionnel */}
          <CalendrierAppel appel={appel} showLegende={true} />

          {/* Actions disponibles pour un appel généré */}
          {estGenere && (onSuivreEnvois || onGererRelances || onDemanderAnnulation) && (
            <ActionsAppelGenere
              appelId={appel.id}
              peutSuivre={peutSuivre}
              peutRelancer={peutRelancer}
              onSuivreEnvois={onSuivreEnvois}
              onGererRelances={onGererRelances}
              onDemanderAnnulation={onDemanderAnnulation}
            />
          )}
        </div>
      </div>
    </div>
  );
}
