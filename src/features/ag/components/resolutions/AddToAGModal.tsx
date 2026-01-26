'use client';

import Link from 'next/link';
import { X, Calendar, PlusCircle, Check, Plus } from 'lucide-react';
import type { ResolutionTemplate } from '@/lib/constants/resolutions';
import styles from '../../../../app/(dashboard)/ag/resolutions/resolutions.module.css';

interface AvailableAG {
  id: string;
  type: 'ORDINAIRE' | 'EXTRAORDINAIRE';
  date: string;
  lieu: string;
}

interface AddToAGModalProps {
  resolution: ResolutionTemplate;
  availableAGs: AvailableAG[];
  addedToAGId: string | null;
  onAddToAG: (agId: string) => void;
  onClose: () => void;
}

export function AddToAGModal({ resolution, availableAGs, addedToAGId, onAddToAG, onClose }: AddToAGModalProps) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContentSmall}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>
          <h2>Ajouter à une AG</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <p className={styles.modalDescription}>
          <strong>{resolution.titre}</strong>
        </p>

        {availableAGs.length > 0 ? (
          <div className={styles.agList}>
            {availableAGs.map(ag => (
              <button
                key={ag.id}
                className={`${styles.agListItem} ${addedToAGId === ag.id ? styles.agListItemSuccess : ''}`}
                onClick={() => onAddToAG(ag.id)}
              >
                <div className={styles.agListItemContent}>
                  <Calendar size={18} />
                  <div className={styles.agListItemInfo}>
                    <span className={styles.agListItemType}>
                      AG {ag.type === 'ORDINAIRE' ? 'Ordinaire' : 'Extraordinaire'}
                    </span>
                    <span className={styles.agListItemDate}>
                      {new Date(ag.date).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
                {addedToAGId === ag.id ? (
                  <Check size={18} className={styles.successIcon} />
                ) : (
                  <PlusCircle size={18} />
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.noAGMessage}>
            <Calendar size={32} />
            <p>Aucune AG en préparation</p>
            <Link href="/ag/new" className="btn btn-primary">
              <Plus size={16} />
              Créer une AG
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
