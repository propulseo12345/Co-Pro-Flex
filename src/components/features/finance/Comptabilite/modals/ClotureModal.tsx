'use client';

import { Lock, X, AlertTriangle, AlertCircle } from 'lucide-react';
import { EtatCloture, MouvementNonCategorise } from '../types';
import { formatCurrency, formatDate } from '../utils';
import styles from '../Comptabilite.module.css';

interface ClotureModalProps {
  isOpen: boolean;
  onClose: () => void;
  etatCloture: EtatCloture;
  mouvementsNonCategorises: MouvementNonCategorise[];
  totalDebit: number;
  totalCredit: number;
  isBalanced?: boolean;
  ecart?: number;
  onValiderCloture: () => void;
}

export function ClotureModal({
  isOpen,
  onClose,
  etatCloture,
  mouvementsNonCategorises,
  totalDebit,
  totalCredit,
  isBalanced = true,
  ecart = 0,
  onValiderCloture
}: ClotureModalProps) {
  if (!isOpen) return null;

  // La clôture est bloquée si mouvements non catégorisés OU si déséquilibre comptable
  const canValidate = etatCloture.mouvementsNonCategorises === 0 && isBalanced;

  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={onClose}>
      <div
        className={styles.modalContentLarge}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <Lock size={24} style={{ marginRight: 'var(--space-sm)' }} aria-hidden="true" />
            Clôture de l'exercice {etatCloture.annee}
          </h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* BLOQUANT : Déséquilibre comptable */}
          {!isBalanced && (
            <div className={styles.clotureBlockSection}>
              <div className={styles.clotureBlockHeader}>
                <AlertCircle size={20} color="var(--danger)" aria-hidden="true" />
                <span>Erreur comptable critique : Déséquilibre détecté</span>
              </div>
              <p className={styles.clotureBlockText}>
                En comptabilité en partie double, <strong>Total Débits doit TOUJOURS égaler Total Crédits</strong>.
                <br />
                Écart constaté : <strong style={{ color: 'var(--danger)' }}>{formatCurrency(ecart)}</strong>
                <br /><br />
                La clôture est <strong>impossible</strong> tant que les écritures comptables ne sont pas équilibrées.
                Veuillez vérifier et corriger les écritures avant de procéder à la clôture.
              </p>
            </div>
          )}

          {/* Alertes */}
          {etatCloture.alertes.length > 0 && (
            <div className={styles.clotureAlertSection}>
              <div className={styles.clotureAlertHeader}>
                <AlertTriangle size={20} color="var(--warning)" aria-hidden="true" />
                <span>Points de vigilance avant clôture</span>
              </div>
              <ul className={styles.clotureAlertList}>
                {etatCloture.alertes.map((alerte) => (
                  <li key={alerte}>{alerte}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Mouvements non catégorisés */}
          {mouvementsNonCategorises.length > 0 && (
            <div className={styles.clotureBlockSection}>
              <div className={styles.clotureBlockHeader}>
                <AlertCircle size={20} color="var(--danger)" aria-hidden="true" />
                <span>Mouvements bancaires non catégorisés ({mouvementsNonCategorises.length})</span>
              </div>
              <p className={styles.clotureBlockText}>
                La catégorisation de tous les mouvements est <strong>obligatoire</strong> avant de procéder à la clôture.
              </p>
              <div className={styles.mouvementsNonCategList}>
                {mouvementsNonCategorises.map((mvt) => (
                  <div key={mvt.id} className={styles.mouvementNonCategItem}>
                    <div className={styles.mouvementNonCategInfo}>
                      <span className={styles.mouvementNonCategDate}>
                        {formatDate(mvt.date)}
                      </span>
                      <span className={styles.mouvementNonCategLibelle}>{mvt.libelle}</span>
                    </div>
                    <div className={styles.mouvementNonCategMontant}>
                      <span className={mvt.type === 'ENTREE' ? styles.credit : styles.debit}>
                        {mvt.type === 'ENTREE' ? '+' : '-'}
                        {formatCurrency(mvt.montant)}
                      </span>
                      <button className={styles.categoriserButton}>
                        Catégoriser
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Récapitulatif */}
          <div className={styles.clotureRecap}>
            <h4>Récapitulatif de l'exercice {etatCloture.annee}</h4>
            <div className={styles.clotureRecapGrid}>
              <div className={styles.clotureRecapItem}>
                <span className={styles.clotureRecapLabel}>Total des débits</span>
                <span className={styles.clotureRecapValue} style={{ color: 'var(--danger)' }}>
                  {formatCurrency(totalDebit)}
                </span>
              </div>
              <div className={styles.clotureRecapItem}>
                <span className={styles.clotureRecapLabel}>Total des crédits</span>
                <span className={styles.clotureRecapValue} style={{ color: 'var(--success)' }}>
                  {formatCurrency(totalCredit)}
                </span>
              </div>
              <div className={styles.clotureRecapItem}>
                <span className={styles.clotureRecapLabel}>Équilibre partie double</span>
                <span
                  className={styles.clotureRecapValue}
                  style={{ color: isBalanced ? 'var(--success)' : 'var(--danger)' }}
                >
                  {isBalanced ? 'Équilibré' : `Écart: ${formatCurrency(ecart)}`}
                </span>
              </div>
            </div>
          </div>

          {/* Confirmation */}
          <div className={styles.clotureConfirm}>
            <p>
              <strong>Attention :</strong> La clôture de l'exercice est une opération irréversible. Une fois validée,
              les écritures comptables de l'exercice {etatCloture.annee} seront figées et ne pourront plus être modifiées.
            </p>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.closeButton} onClick={onClose}>
            Annuler
          </button>
          <button
            className={`${styles.validateButton} ${!canValidate ? styles.validateButtonDisabled : ''}`}
            onClick={onValiderCloture}
            disabled={!canValidate}
            title={!canValidate ? 'La clôture nécessite un équilibre comptable et que tous les mouvements soient catégorisés' : ''}
          >
            <Lock size={18} aria-hidden="true" />
            Valider la clôture
          </button>
        </div>
      </div>
    </div>
  );
}
