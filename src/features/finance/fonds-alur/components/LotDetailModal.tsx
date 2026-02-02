'use client';

import { X, Building2, Users, Percent, TrendingUp, PiggyBank, ArrowRightLeft, Info } from 'lucide-react';
import type { ALURLotContribution, ALURTransfer } from '@/hooks/modules/useALURData';
import styles from '@/app/(dashboard)/finance/fonds-alur/fonds-alur.module.css';

interface LotDetailModalProps {
  lot: ALURLotContribution;
  transfers: ALURTransfer[];
  onClose: () => void;
}

export function LotDetailModal({ lot, transfers, onClose }: LotDetailModalProps) {
  const recentTransfers = transfers.slice(0, 5);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Détail du lot {lot.lotRef}</h2>
            <p className={styles.modalSubtitle}>Contribution au fonds ALUR</p>
          </div>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <Building2 size={16} className={styles.detailIcon} />
              <div>
                <span className={styles.detailLabel}>Lot</span>
                <span className={styles.detailValue}>{lot.lotRef}</span>
              </div>
            </div>
            <div className={styles.detailItem}>
              <Users size={16} className={styles.detailIcon} />
              <div>
                <span className={styles.detailLabel}>Copropriétaire</span>
                <span className={styles.detailValue}>{lot.ownerName}</span>
              </div>
            </div>
            <div className={styles.detailItem}>
              <Percent size={16} className={styles.detailIcon} />
              <div>
                <span className={styles.detailLabel}>Tantièmes</span>
                <span className={styles.detailValue}>{lot.tantiemesGeneraux.toLocaleString('fr-FR')}</span>
              </div>
            </div>
            <div className={styles.detailItem}>
              <TrendingUp size={16} className={styles.detailIcon} />
              <div>
                <span className={styles.detailLabel}>Quote-part</span>
                <span className={styles.detailValue}>{lot.sharePercent.toFixed(2)}%</span>
              </div>
            </div>
          </div>

          <div className={styles.alurBalanceCard}>
            <div className={styles.alurBalanceHeader}>
              <PiggyBank size={24} />
              <span>Solde ALUR du lot</span>
            </div>
            <div className={styles.alurBalanceValue}>
              {lot.lotSoldeAlur.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </div>
            <div className={styles.alurBalanceSubtext}>
              Cotisation annuelle : {lot.lotCotisationAnnuelle.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </div>
          </div>

          {recentTransfers.length > 0 && (
            <div className={styles.transfersSection}>
              <h3 className={styles.sectionTitle}>
                <ArrowRightLeft size={16} />
                Derniers transferts du fonds
              </h3>
              <div className={styles.transfersList}>
                {recentTransfers.map((t) => (
                  <div key={t.id} className={styles.transferItem}>
                    <div className={styles.transferInfo}>
                      <span className={styles.transferDate}>
                        {new Date(t.transferDate).toLocaleDateString('fr-FR')}
                      </span>
                      <span className={styles.transferDesc}>{t.description}</span>
                    </div>
                    <span className={styles.transferAmount}>
                      -{t.amount.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.infoNote}>
            <Info size={16} />
            <p>
              Le solde ALUR de ce lot représente sa quote-part du fonds commun,
              calculée proportionnellement à ses tantièmes de copropriété.
            </p>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className="btn btn-secondary" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
