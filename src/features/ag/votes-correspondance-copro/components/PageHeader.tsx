'use client';

import { ArrowLeft } from 'lucide-react';
import type { CoproprietaireData } from '../hooks/useVotesCorrespondanceCoproPage';
import styles from '@/app/(dashboard)/ag/[id]/votes-correspondance/[coproId]/votes-correspondance.module.css';

interface PageHeaderProps {
  copro: CoproprietaireData;
  onBack: () => void;
}

export function PageHeader({ copro, onBack }: PageHeaderProps) {
  return (
    <div className={styles.header}>
      <button onClick={onBack} className={styles.backButton}>
        <ArrowLeft size={20} aria-hidden="true" />
        Retour
      </button>
      <div>
        <h1 className={styles.title}>Vote par correspondance</h1>
        <p className={styles.subtitle}>
          {copro.full_name} - {copro.tantiemes} tantiemes
        </p>
      </div>
    </div>
  );
}
