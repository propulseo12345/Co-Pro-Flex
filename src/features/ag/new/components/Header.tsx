'use client';

import { ArrowLeft } from 'lucide-react';
import styles from '../../../../app/(dashboard)/ag/new/new-ag.module.css';

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
        <h1 className={styles.title}>Planifier une Assemblée Générale</h1>
        <p className={styles.subtitle}>Définissez les informations de base de votre AG</p>
      </div>
    </div>
  );
}
