'use client';

import { CheckCircle, XCircle, MinusCircle, Users, ArrowRight } from 'lucide-react';
import { Resolution, VoteStats, MajorityResult } from '../types';
import { MAJORITES, type MajorityType } from '@/lib/constants/resolutions';
import modalsStyles from '../styles/modals.module.css';

interface ResultModalProps {
  resolution: Resolution;
  stats: VoteStats;
  result: MajorityResult;
  pendingNextResolution: boolean;
  isLastResolution?: boolean;
  onClose: () => void;
  onConfirmNext: () => void;
}

export function ResultModal({
  resolution,
  stats,
  result,
  pendingNextResolution,
  isLastResolution = false,
  onClose,
  onConfirmNext
}: ResultModalProps) {
  return (
    <div className={modalsStyles.modalOverlay} onClick={onClose}>
      <div
        className={modalsStyles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className={modalsStyles.modalTitle}>Résultat du vote</h2>
        <div className={modalsStyles.modalResolutionInfo}>
          <h3>{resolution.titre}</h3>
          <div className={modalsStyles.modalMajorityInfo}>
            <strong>Majorité requise :</strong> {MAJORITES[resolution.majorite as MajorityType]?.nom || resolution.majorite}
          </div>
        </div>

        <div className={modalsStyles.modalStats}>
          <div className={modalsStyles.modalStatItem}>
            <CheckCircle size={20} color="var(--success)" aria-hidden="true" />
            <span>Pour : {stats.pour} tantièmes</span>
          </div>
          <div className={modalsStyles.modalStatItem}>
            <XCircle size={20} color="var(--danger)" aria-hidden="true" />
            <span>Contre : {stats.contre} tantièmes</span>
          </div>
          <div className={modalsStyles.modalStatItem}>
            <MinusCircle size={20} color="var(--warning)" aria-hidden="true" />
            <span>Abstention : {stats.abstention} tantièmes</span>
          </div>
          <div className={modalsStyles.modalStatItem}>
            <Users size={20} color="var(--text-secondary)" aria-hidden="true" />
            <span>Non voté : {stats.nonVote} tantièmes</span>
          </div>
        </div>

        <div className={`${modalsStyles.modalResult} ${result.adopted ? modalsStyles.modalResultAdopted : modalsStyles.modalResultRejected}`}>
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
          <p className={modalsStyles.modalResultReason}>
            {result.reason}
          </p>
        </div>

        <div className={modalsStyles.modalActions}>
          <button onClick={onClose} className="btn btn-secondary">
            Fermer
          </button>
          {pendingNextResolution && (
            <button onClick={onConfirmNext} className="btn btn-primary">
              {isLastResolution ? 'Confirmer et terminer la session' : 'Confirmer et passer à la suivante'}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
