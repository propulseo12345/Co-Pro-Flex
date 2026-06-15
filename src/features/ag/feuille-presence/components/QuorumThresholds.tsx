'use client';

import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import styles from '@/app/(dashboard)/ag/[id]/feuille-presence/feuille-presence.module.css';

interface ThresholdData {
  label: string;
  threshold: number;
  reached: boolean;
}

// Art. 24 n'a pas de seuil en tantièmes : adoption décidée au vote (pour > contre).
interface InfoThresholdData {
  label: string;
  note: string;
}

interface QuorumThresholdsData {
  art24: InfoThresholdData;
  art25: ThresholdData;
  art26: ThresholdData;
}

interface QuorumThresholdsProps {
  thresholds: QuorumThresholdsData;
}

export function QuorumThresholds({ thresholds }: QuorumThresholdsProps) {
  const renderThresholdCard = (data: ThresholdData) => (
    <div className={`${styles.thresholdCard} ${data.reached ? styles.thresholdReached : styles.thresholdNotReached}`}>
      {data.reached ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
      <div>
        <div className={styles.thresholdLabel}>{data.label}</div>
        <div className={styles.thresholdValue}>
          Seuil: {data.threshold} tantièmes
        </div>
      </div>
    </div>
  );

  const renderInfoCard = (data: InfoThresholdData) => (
    <div className={styles.thresholdCard}>
      <Info size={20} />
      <div>
        <div className={styles.thresholdLabel}>{data.label}</div>
        <div className={styles.thresholdValue}>{data.note}</div>
      </div>
    </div>
  );

  return (
    <div className={styles.thresholdsGrid}>
      {renderInfoCard(thresholds.art24)}
      {renderThresholdCard(thresholds.art25)}
      {renderThresholdCard(thresholds.art26)}
    </div>
  );
}
