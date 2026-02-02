'use client';

import { ArrowLeft } from 'lucide-react';
import Stepper from '@/components/features/ag/Stepper';
import styles from '@/app/(dashboard)/ag/[id]/agenda/agenda.module.css';

interface AgendaHeaderProps {
  agId: string;
  onGoBack: () => void;
}

export function AgendaHeader({ agId, onGoBack }: AgendaHeaderProps) {
  return (
    <>
      <div className={styles.header}>
        <button onClick={onGoBack} className={styles.backButton}>
          <ArrowLeft size={20} /> Retour
        </button>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Construction de l&apos;ordre du jour</h1>
          <p className={styles.subtitle}>Ajoutez et organisez les resolutions de votre AG</p>
        </div>
      </div>
      <Stepper currentStep={2} agId={agId} />
    </>
  );
}
