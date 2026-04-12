'use client';

import { X, CheckCircle, Clock, Circle } from 'lucide-react';
import type { ITravauxPPT, IEtapeTravaux } from '@/types';
import styles from './PPTCardDetail.module.css';

interface PPTCardDetailProps {
  travail: ITravauxPPT;
  onClose: () => void;
}

function EtapeIcon({ statut }: { statut: IEtapeTravaux['statut'] }) {
  if (statut === 'FAIT') return <CheckCircle size={16} style={{ color: '#22c55e' }} />;
  if (statut === 'EN_COURS') return <Clock size={16} style={{ color: '#3b82f6' }} />;
  return <Circle size={16} style={{ color: '#475569' }} />;
}

function formatEur(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

export function PPTCardDetail({ travail, onClose }: PPTCardDetailProps) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <div className={styles.title}>{travail.titre}</div>
            <div className={styles.meta}>
              {travail.type} · Estimation : {formatEur(travail.montantEstime)}
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        {travail.description && (
          <p className={styles.desc}>{travail.description}</p>
        )}

        <div className={styles.timelineLabel}>Étapes</div>
        <div className={styles.timeline}>
          {travail.etapes.map((etape, i) => (
            <div key={etape.id} className={styles.etape}>
              <div className={styles.etapeLeft}>
                <EtapeIcon statut={etape.statut} />
                {i < travail.etapes.length - 1 && (
                  <div className={styles.connector} style={{ background: etape.statut === 'FAIT' ? '#22c55e' : '#1e293b' }} />
                )}
              </div>
              <div className={styles.etapeContent}>
                <div className={styles.etapeLabel}>{etape.label}</div>
                {etape.date && (
                  <div className={styles.etapeDate}>
                    {new Date(etape.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                )}
                {etape.montant !== undefined && (
                  <div className={styles.etapeMontant}>{formatEur(etape.montant)}</div>
                )}
                {etape.commentaire && (
                  <div className={styles.etapeComment}>{etape.commentaire}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
