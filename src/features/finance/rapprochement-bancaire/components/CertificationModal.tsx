'use client';

import { Shield, Lock } from 'lucide-react';
import type { RapprochementStats } from '../domain/types';
import { MOIS_FR } from '../domain/constants';
import styles from '../../../../app/(dashboard)/finance/rapprochement-bancaire/rapprochement-bancaire.module.css';

interface CertificationModalProps {
  isOpen: boolean;
  moisSelectionne: number;
  anneeSelectionnee: number;
  stats: RapprochementStats;
  onClose: () => void;
  onCertifier: () => void;
}

export function CertificationModal({
  isOpen,
  moisSelectionne,
  anneeSelectionnee,
  stats,
  onClose,
  onCertifier,
}: CertificationModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Certifier le rapprochement</h2>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.certificationSummary}>
            <div className={styles.certificationIcon}>
              <Shield size={48} />
            </div>
            <h3>Rapprochement de {MOIS_FR[moisSelectionne]} {anneeSelectionnee}</h3>
            <div className={styles.certificationStats}>
              <div className={styles.certificationStat}>
                <span className={styles.certificationStatValue}>{stats.rapprochees}</span>
                <span className={styles.certificationStatLabel}>Lignes rapprochées</span>
              </div>
              <div className={styles.certificationStat}>
                <span className={styles.certificationStatValue}>{stats.ecarts}</span>
                <span className={styles.certificationStatLabel}>Écarts résolus</span>
              </div>
              <div className={styles.certificationStat}>
                <span className={styles.certificationStatValue}>
                  {stats.ecartSolde.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </span>
                <span className={styles.certificationStatLabel}>Écart de solde</span>
              </div>
            </div>
          </div>

          <div className={styles.certificationWarning}>
            <Lock size={18} />
            <p>
              En certifiant ce rapprochement, vous confirmez que tous les mouvements ont été vérifiés
              et que le solde bancaire correspond au solde comptable. Cette action est irréversible.
            </p>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            Annuler
          </button>
          <button className={styles.successButton} onClick={onCertifier}>
            <Shield size={18} />
            Certifier définitivement
          </button>
        </div>
      </div>
    </div>
  );
}
