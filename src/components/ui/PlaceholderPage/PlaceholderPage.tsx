'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import styles from './PlaceholderPage.module.css';

interface PlaceholderPageProps {
  icon: LucideIcon;
  title: string;
}

export function PlaceholderPage({ icon: Icon, title }: PlaceholderPageProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <Icon size={48} className={styles.icon} />
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>Cette fonctionnalité arrive prochainement.</p>
        <Link href="/portefeuille" className={styles.backLink}>
          ← Retour au portefeuille
        </Link>
      </div>
    </div>
  );
}
