'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import styles from '@/app/(dashboard)/settings/info/info.module.css';

export function PageHeader() {
  return (
    <div className={styles.header}>
      <Link href="/settings" className={styles.backLink}>
        <ArrowLeft size={20} aria-hidden="true" />
        <span>Retour aux parametres</span>
      </Link>
      <div>
        <h1 className={styles.title}>Parametrage des lots</h1>
        <p className={styles.subtitle}>
          Renseignez la liste complete des lots de la copropriete avec toutes les informations necessaires
        </p>
      </div>
    </div>
  );
}
