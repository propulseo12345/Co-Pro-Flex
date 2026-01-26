'use client';

import { CheckCircle, XCircle, MinusCircle, Users, ArrowRight } from 'lucide-react';
import { Resolution, VoteStats, MajorityResult } from '../types';
import { MAJORITES, type MajorityType } from '@/lib/constants/resolutions';
import styles from '../Session.module.css';

interface ResultModalProps {
  resolution: Resolution;
  stats: VoteStats;
  result: MajorityResult;
  pendingNextResolution: boolean;
  onClose: () => void;
  onConfirmNext: () => void;
}

export function ResultModal({
  resolution,
  stats,
  result,
  pendingNextResolution,
  onClose,
  onConfirmNext
}: ResultModalProps) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className={styles.modalTitle}>Résultat du vote</h2>
        <div className={styles.modalResolutionInfo}>
          <h3>{resolution.titre}</h3>
          <div className={styles.modalMajorityInfo}>
            <strong>Majorité requise :</strong> {MAJORITES[resolution.majorite as MajorityType]?.nom || resolution.majorite}
          </div>
        </div>

        <div className={styles.modalStats}>
          <div className={styles.modalStatItem}>
            <CheckCircle size={20} color="var(--success)" aria-hidden="true" />
            <span>Pour : {stats.pour} tantièmes</span>
          </div>
          <div className={styles.modalStatItem}>
            <XCircle size={20} color="var(--danger)" aria-hidden="true" />
            <span>Contre : {stats.contre} tantièmes</span>
          </div>
          <div className={styles.modalStatItem}>
            <MinusCircle size={20} color="var(--warning)" aria-hidden="true" />
            <span>Abstention : {stats.abstention} tantièmes</span>
          </div>
          <div className={styles.modalStatItem}>
            <Users size={20} color="var(--text-secondary)" aria-hidden="true" />
            <span>Non voté : {stats.nonVote} tantièmes</span>
          </div>
        </div>

        <div className={`${styles.modalResult} ${result.adopted ? styles.modalResultAdopted : styles.modalResultRejected}`}>
          {result.adopted ? (
            <>
              <CheckCircle size={32} aria-hidden="true" />
              <h3>Résolution ADOPTÉE</h3>
            </>
          ) : (
            <>
              <XCircle size={32} aria-hidden="true" />
              <h3>Résolution REJETÉE</h3>
            </>
          )}
          <p className={styles.modalResultReason}>
            {result.reason}
          </p>
        </div>

        <div className={styles.modalActions}>
          <button onClick={onClose} className="btn btn-secondary">
            Fermer
          </button>
          {pendingNextResolution && (
            <button onClick={onConfirmNext} className="btn btn-primary">
              Confirmer et passer à la suivante
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
