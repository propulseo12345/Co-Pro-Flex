'use client';

import { ArrowLeft } from 'lucide-react';
import styles from '../../../../app/(dashboard)/ag/[id]/pv/pv.module.css';

interface HeaderProps {
  onBack: () => void;
}

export function Header({ onBack }: HeaderProps) {
  return (
    <div className={styles.header}>
      <button onClick={onBack} className={styles.backButton}>
        <ArrowLeft size={20} aria-hidden="true" />
        Retour
      </button>
      <div className={styles.headerContent}>
        <h1 className={styles.title}>Procès-verbal de l'AG</h1>
        <p className={styles.subtitle}>Générez et signez le procès-verbal officiel</p>
      </div>
    </div>
  );
}
