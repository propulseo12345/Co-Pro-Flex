'use client';

import { User, Briefcase } from 'lucide-react';
import styles from '@/app/(dashboard)/ventes-impayes/ventes/[id]/detail-vente.module.css';

interface MutationPartiesProps {
  sellerName: string;
  sellerEmail: string | null;
  buyerName: string | null;
  buyerEmail: string | null;
  notaryName: string | null;
  notaryEmail: string | null;
  notaryReference: string | null;
}

export function MutationParties({
  sellerName,
  sellerEmail,
  buyerName,
  buyerEmail,
  notaryName,
  notaryEmail,
  notaryReference,
}: MutationPartiesProps) {
  return (
    <>
      <div className={styles.mainCard}>
        <h3 className={styles.cardTitle}>
          <User size={16} />
          Parties
        </h3>
        <div className={styles.partiesGrid}>
          <div className={styles.partyCard}>
            <span className={styles.partyLabel}>Vendeur</span>
            <span className={styles.partyName}>{sellerName}</span>
            {sellerEmail && (
              <span className={styles.partyEmail}>{sellerEmail}</span>
            )}
          </div>
          <div className={styles.partyArrow}>→</div>
          <div className={styles.partyCard}>
            <span className={styles.partyLabel}>Acquéreur</span>
            <span className={styles.partyName}>
              {buyerName || 'Non renseigné'}
            </span>
            {buyerEmail && (
              <span className={styles.partyEmail}>{buyerEmail}</span>
            )}
          </div>
        </div>
      </div>

      {(notaryName || notaryEmail) && (
        <div className={styles.mainCard}>
          <h3 className={styles.cardTitle}>
            <Briefcase size={16} />
            Notaire
          </h3>
          <div className={styles.infoGrid}>
            {notaryName && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Nom</span>
                <span className={styles.infoValue}>{notaryName}</span>
              </div>
            )}
            {notaryEmail && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Email</span>
                <span className={styles.infoValue}>{notaryEmail}</span>
              </div>
            )}
            {notaryReference && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Référence</span>
                <span className={styles.infoValue}>{notaryReference}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
