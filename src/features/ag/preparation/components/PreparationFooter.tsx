'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import styles from '@/app/(dashboard)/ag/[id]/preparation/preparation.module.css';

interface PreparationFooterProps {
  agId: string;
  onGoToEnvoi: () => void;
  onContinue: () => void;
}

export function PreparationFooter({
  onGoToEnvoi,
  onContinue,
}: PreparationFooterProps) {
  return (
    <div className={styles.footer}>
      <button onClick={onGoToEnvoi} className="btn btn-secondary">
        <ArrowLeft size={16} aria-hidden="true" />
        Retour a l&apos;envoi
      </button>
      <button onClick={onContinue} className="btn btn-primary">
        Continuer vers la session
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
