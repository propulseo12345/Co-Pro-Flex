'use client';

import { ArrowLeft, Save, Calculator, RefreshCw } from 'lucide-react';
import styles from '@/app/(dashboard)/finance/cles-repartition/[id]/cle-detail.module.css';

interface CleDetailHeaderProps {
  cleNom: string;
  showSimulation: boolean;
  isManager: boolean;
  isSaving: boolean;
  hasChanges: boolean;
  onBack: () => void;
  onToggleSimulation: () => void;
  onSave: () => void;
}

export function CleDetailHeader({
  cleNom,
  showSimulation,
  isManager,
  isSaving,
  hasChanges,
  onBack,
  onToggleSimulation,
  onSave,
}: CleDetailHeaderProps) {
  return (
    <div className={styles.header}>
      <button className={styles.backBtn} onClick={onBack}>
        <ArrowLeft size={20} />Retour
      </button>
      <div className={styles.headerContent}>
        <h1 className={styles.title}>Modifier la cle de repartition</h1>
        <p className={styles.subtitle}>{cleNom}</p>
      </div>
      <div className={styles.headerActions}>
        <button className="btn btn-secondary" onClick={onToggleSimulation}>
          <Calculator size={18} />{showSimulation ? 'Masquer simulation' : 'Simuler'}
        </button>
        {isManager && (
          <button
            className="btn btn-primary"
            onClick={onSave}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? <RefreshCw size={18} className={styles.spinning} /> : <Save size={18} />}
            Enregistrer
          </button>
        )}
      </div>
    </div>
  );
}
