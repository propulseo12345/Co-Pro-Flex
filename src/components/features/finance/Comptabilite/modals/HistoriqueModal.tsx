'use client';

import { History, X, Download, FileText, Edit, AlertTriangle, CheckCircle, DollarSign, User } from 'lucide-react';
import { HistoriqueModification } from '../types';
import { getActionLabel, getActionColor, formatDateTime } from '../utils';
import styles from '../Comptabilite.module.css';

interface HistoriqueModalProps {
  isOpen: boolean;
  onClose: () => void;
  historique: HistoriqueModification[];
}

const getActionIcon = (action: HistoriqueModification['action']) => {
  switch (action) {
    case 'CREATION': return <FileText size={16} color="var(--success)" aria-hidden="true" />;
    case 'MODIFICATION': return <Edit size={16} color="var(--warning)" aria-hidden="true" />;
    case 'SUPPRESSION': return <AlertTriangle size={16} color="var(--danger)" aria-hidden="true" />;
    case 'VALIDATION': return <CheckCircle size={16} color="var(--success)" aria-hidden="true" />;
    case 'CATEGORISATION': return <DollarSign size={16} color="var(--primary)" aria-hidden="true" />;
  }
};

export function HistoriqueModal({
  isOpen,
  onClose,
  historique
}: HistoriqueModalProps) {
  if (!isOpen) return null;

  const handleExport = () => {
    alert('Export de l\'historique en PDF...');
  };

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
            <History size={24} style={{ marginRight: 'var(--space-sm)' }} aria-hidden="true" />
            Historique des modifications
          </h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalBody}>
          <p className={styles.historiqueDescription}>
            Traçabilité complète de toutes les modifications effectuées sur les opérations et dépenses comptables.
          </p>

          <div className={styles.historiqueTimeline}>
            {historique.map((item) => (
              <div key={item.id} className={styles.historiqueItem}>
                <div className={styles.historiqueIcon}>
                  {getActionIcon(item.action)}
                </div>
                <div className={styles.historiqueContent}>
                  <div className={styles.historiqueHeader}>
                    <span className={styles.historiqueAction}>{getActionLabel(item.action)}</span>
                    <span className={styles.historiqueDate}>
                      {formatDateTime(item.date)}
                    </span>
                  </div>
                  <div className={styles.historiqueDescription}>
                    {item.description}
                  </div>
                  <div className={styles.historiqueUser}>
                    <User size={14} aria-hidden="true" />
                    <span>{item.utilisateur}</span>
                  </div>
                  {(item.ancienneValeur || item.nouvelleValeur) && (
                    <div className={styles.historiqueChanges}>
                      {item.ancienneValeur && (
                        <div className={styles.historiqueOld}>
                          <span className={styles.historiqueLabel}>Avant :</span>
                          <span>{item.ancienneValeur}</span>
                        </div>
                      )}
                      {item.nouvelleValeur && (
                        <div className={styles.historiqueNew}>
                          <span className={styles.historiqueLabel}>Après :</span>
                          <span>{item.nouvelleValeur}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.exportButton} onClick={handleExport}>
            <Download size={16} aria-hidden="true" />
            Exporter
          </button>
          <button className={styles.closeButton} onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
