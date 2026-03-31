'use client';

import { Building2, User, FileText } from 'lucide-react';
import type { EtatDatePayloadV2 } from '../../domain/types';
import styles from './etat-date.module.css';

const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';

interface EtatDateHeaderProps {
  payload: EtatDatePayloadV2;
  snapshotDate: string;
}

export function EtatDateHeader({ payload, snapshotDate }: EtatDateHeaderProps) {
  return (
    <div className={styles.headerSection}>
      <h3 className={styles.headerSectionTitle}><Building2 size={14} /> Copropriété &amp; Lot</h3>
      <div className={styles.headerGrid}>
        <div className={styles.headerField}>
          <span className={styles.headerLabel}>Copropriété</span>
          <span className={styles.headerValue}>{payload.copro.name}</span>
        </div>
        <div className={styles.headerField}>
          <span className={styles.headerLabel}>Adresse</span>
          <span className={styles.headerValue}>{payload.copro.address}</span>
        </div>
        <div className={styles.headerField}>
          <span className={styles.headerLabel}>Syndic</span>
          <span className={styles.headerValue}>{payload.copro.syndic_name}</span>
        </div>
        <div className={styles.headerField}>
          <span className={styles.headerLabel}>Lot</span>
          <span className={styles.headerValue}>{payload.lot.ref} ({payload.lot.type})</span>
        </div>
        <div className={styles.headerField}>
          <span className={styles.headerLabel}>Tantièmes</span>
          <span className={styles.headerValue}>{payload.lot.tantiemes_generaux} / {payload.lot.total_tantiemes}</span>
        </div>
      </div>

      <h3 className={styles.headerSectionTitle}><User size={14} /> Vendeur</h3>
      <div className={styles.headerGrid}>
        <div className={styles.headerField}>
          <span className={styles.headerLabel}>Nom</span>
          <span className={styles.headerValue}>{payload.seller.name}</span>
        </div>
        {payload.seller.email && (
          <div className={styles.headerField}>
            <span className={styles.headerLabel}>Email</span>
            <span className={styles.headerValue}>{payload.seller.email}</span>
          </div>
        )}
      </div>

      <h3 className={styles.headerSectionTitle}><FileText size={14} /> Mutation</h3>
      <div className={styles.headerGrid}>
        <div className={styles.headerField}>
          <span className={styles.headerLabel}>Demandée le</span>
          <span className={styles.headerValue}>{fmtDate(payload.mutation.requested_at)}</span>
        </div>
        {payload.mutation.notary_name && (
          <div className={styles.headerField}>
            <span className={styles.headerLabel}>Notaire</span>
            <span className={styles.headerValue}>{payload.mutation.notary_name}</span>
          </div>
        )}
        <div className={styles.headerField}>
          <span className={styles.headerLabel}>Date état</span>
          <span className={styles.headerValue}>{fmtDate(snapshotDate)}</span>
        </div>
      </div>
    </div>
  );
}
