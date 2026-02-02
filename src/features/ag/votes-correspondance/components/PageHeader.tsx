'use client';

import { ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';
import styles from '@/app/(dashboard)/ag/[id]/votes-correspondance/votes-correspondance.module.css';

interface PageHeaderProps {
  agId: string;
}

export function PageHeader({ agId }: PageHeaderProps) {
  return (
    <div className={styles.header}>
      <Link href={`/ag/${agId}/preparation`} className={styles.backButton}>
        <ArrowLeft size={20} />
        <span>Retour a la preparation</span>
      </Link>
      <h1 className={styles.title}>
        <Mail size={24} />
        Votes par correspondance
      </h1>
      <p className={styles.subtitle}>
        Art. 17-1 A loi 65-557 - Enregistrez les votes recus avant l'AG
      </p>
    </div>
  );
}
