'use client';

import Link from 'next/link';
import { Plus, AlertTriangle, Bell, FileText } from 'lucide-react';
import styles from '@/app/(dashboard)/ventes-impayes/ventes-impayes.module.css';

interface QuickActionsProps {
  onPlanifierRelances: () => void;
}

export function QuickActions({ onPlanifierRelances }: QuickActionsProps) {
  return (
    <div className={styles.quickActions}>
      <h2 className={styles.sectionTitle}>Actions rapides</h2>
      <div className={styles.quickLinksGrid}>
        <Link href="/ventes-impayes/ventes/nouvelle" className={styles.quickLink}>
          <Plus size={20} aria-hidden="true" />
          Nouvelle vente
        </Link>
        <Link href="/contentieux/impayes" className={styles.quickLink}>
          <AlertTriangle size={20} aria-hidden="true" />
          Gérer les impayés
        </Link>
        <button
          className={styles.quickLink}
          onClick={onPlanifierRelances}
        >
          <Bell size={20} aria-hidden="true" />
          Planifier relances
        </button>
        <Link href="/ventes-impayes/ventes" className={styles.quickLink}>
          <FileText size={20} aria-hidden="true" />
          Toutes les ventes
        </Link>
      </div>
    </div>
  );
}
