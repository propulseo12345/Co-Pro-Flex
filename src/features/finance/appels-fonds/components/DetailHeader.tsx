'use client';

import { ArrowLeft } from 'lucide-react';
import styles from '../styles/DetailPage.module.css';

type CallStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'cancelled';

interface DetailHeaderProps {
  title: string;
  subtitle: string;
  onBack: () => void;
  onGeneratePdf: () => void;
  onSend: () => void;
  onRecordPayment: () => void;
  callStatus: CallStatus;
}

export function DetailHeader({
  title,
  subtitle,
  onBack,
  onGeneratePdf,
  onSend,
  onRecordPayment,
  callStatus,
}: DetailHeaderProps) {
  const showPaymentButton = callStatus !== 'draft' && callStatus !== 'cancelled';

  return (
    <div className={styles.detailHeader}>
      <div>
        <button className={styles.backLink} onClick={onBack}>
          <ArrowLeft size={14} />
          Retour aux appels de fonds
        </button>
        <div className={styles.detailTitle}>{title}</div>
        <div className={styles.detailSubtitle}>{subtitle}</div>
      </div>
      <div className={styles.headerActions}>
        <button className={styles.btnSecondary} onClick={onGeneratePdf}>
          Avis PDF
        </button>
        <button className={styles.btnSecondary} onClick={onSend}>
          Envoyer
        </button>
        {showPaymentButton && (
          <button className={styles.btnPrimary} onClick={onRecordPayment}>
            + Enregistrer un paiement
          </button>
        )}
      </div>
    </div>
  );
}
