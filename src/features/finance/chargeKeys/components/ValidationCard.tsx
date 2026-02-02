'use client';

import { CheckCircle, AlertTriangle } from 'lucide-react';
import styles from '@/app/(dashboard)/finance/cles-repartition/[id]/cle-detail.module.css';

interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  totalCalcule: number;
  totalAttendu: number;
  ecart: number;
}

interface ValidationCardProps {
  validation: ValidationResult | null;
}

export function ValidationCard({ validation }: ValidationCardProps) {
  if (!validation) return null;

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Validation</h2>
      <div className={styles.validationContent}>
        <div className={`${styles.validationStatus} ${validation.isValid ? styles.valid : styles.invalid}`}>
          {validation.isValid ? (
            <><CheckCircle size={24} /><span>Cle valide</span></>
          ) : (
            <><AlertTriangle size={24} /><span>{validation.warnings.length} alerte(s)</span></>
          )}
        </div>
        {validation.warnings.length > 0 && (
          <div className={styles.warningsList}>
            {validation.warnings.map((warning, idx) => (
              <div key={idx} className={styles.warningItem}>
                <AlertTriangle size={14} />{warning}
              </div>
            ))}
          </div>
        )}
        <div className={styles.validationStats}>
          <div className={styles.validationStat}>
            <span className={styles.validationLabel}>Calcule</span>
            <span className={styles.validationValue}>{validation.totalCalcule.toLocaleString('fr-FR')}</span>
          </div>
          <div className={styles.validationStat}>
            <span className={styles.validationLabel}>Attendu</span>
            <span className={styles.validationValue}>{validation.totalAttendu.toLocaleString('fr-FR')}</span>
          </div>
          {validation.ecart !== 0 && (
            <div className={`${styles.validationStat} ${styles.ecart}`}>
              <span className={styles.validationLabel}>Ecart</span>
              <span className={styles.validationValue}>{validation.ecart > 0 ? '+' : ''}{validation.ecart}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
