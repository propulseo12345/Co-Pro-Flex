'use client';

import { ArrowLeft } from 'lucide-react';
import styles from '@/app/(dashboard)/finance/factures/new/new-facture.module.css';

interface HeaderProps {
  onBack: () => void;
}

export function Header({ onBack }: HeaderProps) {
  return (
    <div className={styles.header}>
      <button className={styles.backButton} onClick={onBack}>
        <ArrowLeft size={20} aria-hidden="true" />
        Retour
      </button>
      <div>
        <h1 className={styles.title}>Nouvelle Facture</h1>
        <p className={styles.subtitle}>Ajouter une nouvelle facture fournisseur</p>
      </div>
    </div>
  );
}
