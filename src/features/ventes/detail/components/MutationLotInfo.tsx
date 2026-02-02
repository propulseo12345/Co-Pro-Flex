'use client';

import { Building2 } from 'lucide-react';
import styles from '@/app/(dashboard)/ventes-impayes/ventes/[id]/detail-vente.module.css';

interface MutationLotInfoProps {
  lotRef: string;
  lotType: string;
  tantiemes: number;
}

export function MutationLotInfo({ lotRef, lotType, tantiemes }: MutationLotInfoProps) {
  return (
    <div className={styles.sidebarCard}>
      <h3 className={styles.cardTitle}>
        <Building2 size={16} />
        Lot
      </h3>
      <div className={styles.infoList}>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Référence</span>
          <span className={styles.infoValue}>{lotRef}</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Type</span>
          <span className={styles.infoValue}>{lotType}</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Tantièmes</span>
          <span className={styles.infoValue}>{tantiemes}</span>
        </div>
      </div>
    </div>
  );
}
