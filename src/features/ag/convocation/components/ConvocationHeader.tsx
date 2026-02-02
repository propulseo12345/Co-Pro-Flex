'use client';

import { ArrowLeft } from 'lucide-react';
import { ConvocationVersionBadge } from '@/components/features/ag/Convocation';
import type { ConvocationVersion } from '@/hooks/modules/useConvocationPreview';
import styles from '@/app/(dashboard)/ag/[id]/convocation/convocation.module.css';

interface ConvocationHeaderProps {
  currentVersion: number;
  versions: ConvocationVersion[];
  onViewVersion: (version: number) => void;
  onBack: () => void;
}

export function ConvocationHeader({
  currentVersion,
  versions,
  onViewVersion,
  onBack,
}: ConvocationHeaderProps) {
  return (
    <div className={styles.header}>
      <button onClick={onBack} className={styles.backButton}>
        <ArrowLeft size={20} aria-hidden="true" /> Retour
      </button>
      <div className={styles.headerContent}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Convocations</h1>
          <ConvocationVersionBadge
            currentVersion={currentVersion}
            versions={versions}
            onViewVersion={onViewVersion}
          />
        </div>
        <p className={styles.subtitle}>Préparez et envoyez les convocations aux copropriétaires</p>
      </div>
    </div>
  );
}
