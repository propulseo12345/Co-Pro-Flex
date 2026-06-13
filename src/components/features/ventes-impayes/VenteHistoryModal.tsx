'use client';

import { X, Calendar, User, Printer } from 'lucide-react';
import type { Vente } from '@/types/models/vente';
import styles from '../../../app/(dashboard)/ventes-impayes/ventes/ventes.module.css';

interface VenteHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  vente: Vente | null;
}

export function VenteHistoryModal({ isOpen, onClose, vente }: VenteHistoryModalProps) {
  if (!isOpen || !vente) return null;

  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <h3>Historique - {vente.lotIds.join(', ')}</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.modalContent}>
          <div className={styles.historyList}>
            {vente.historique?.map((entry) => (
              <div key={entry.id} className={styles.historyItem}>
                <div className={styles.historyDot} />
                <div className={styles.historyContent}>
                  <p className={styles.historyAction}>{entry.action}</p>
                  <div className={styles.historyMeta}>
                    <span>
                      <Calendar size={12} aria-hidden="true" />
                      {new Date(entry.date).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <span>
                      <User size={12} aria-hidden="true" />
                      {entry.utilisateur}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.historyFooter}>
            <button className="btn btn-secondary" onClick={onClose}>
              Fermer
            </button>
            <button className="btn btn-primary">
              <Printer size={16} style={{ marginRight: 8 }} aria-hidden="true" />
              Imprimer l'historique
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
