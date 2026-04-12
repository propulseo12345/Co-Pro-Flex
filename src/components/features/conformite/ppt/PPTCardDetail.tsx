'use client';

import { X, CheckCircle, Clock, Circle } from 'lucide-react';
import clsx from 'clsx';
import type { ITravauxPPT, IEtapeTravaux } from '@/types';
import { formatEur } from '@/lib/utils/format';
import styles from './PPTCardDetail.module.css';

interface PPTCardDetailProps {
  travail: ITravauxPPT;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function EtapeIcon({ statut }: { statut: IEtapeTravaux['statut'] }) {
  if (statut === 'FAIT') return <CheckCircle size={16} className={styles.iconFait} />;
  if (statut === 'EN_COURS') return <Clock size={16} className={styles.iconEnCours} />;
  return <Circle size={16} className={styles.iconAVenir} />;
}

export function PPTCardDetail({ travail, onClose, onEdit, onDelete }: PPTCardDetailProps) {
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="ppt-modal-title" onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <div id="ppt-modal-title" className={styles.title}>{travail.titre}</div>
            <div className={styles.meta}>
              {travail.type} · Estimation : {formatEur(travail.montantEstime)}
            </div>
          </div>
          <div className={styles.headerActions}>
            <button type="button" className={styles.editBtn} onClick={onEdit} aria-label="Modifier ce travail">
              Modifier
            </button>
            <button type="button" aria-label="Fermer" className={styles.closeBtn} onClick={onClose}>
              <X size={18} />
            </button>
          </div>
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
                  <div className={clsx(styles.connector, etape.statut === 'FAIT' ? styles.connectorFait : styles.connectorAVenir)} />
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
