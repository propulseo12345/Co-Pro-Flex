'use client';

import { Mail, ArrowLeft, Shield } from 'lucide-react';
import Link from 'next/link';
import styles from './messagerie.module.css';

export default function MessageriePriveePage() {
  return (
    <div className="container">
      <div className={styles.disabledContainer}>
        <div className={styles.disabledCard}>
          <div className={styles.disabledIcon}>
            <Shield size={48} />
          </div>
          <h1 className={styles.disabledTitle}>Messagerie privée désactivée</h1>
          <p className={styles.disabledMessage}>
            Les communications passent par email pour garantir traçabilité et qualité.
          </p>
          <p className={styles.disabledSubtext}>
            Pour contacter le syndic ou les copropriétaires, utilisez le module Mail officiel
            qui assure un suivi complet et un archivage conforme.
          </p>
          <div className={styles.disabledActions}>
            <Link href="/communication/mail" className={styles.primaryAction}>
              <Mail size={20} />
              Accéder au Mail officiel
            </Link>
            <Link href="/communication" className={styles.secondaryAction}>
              <ArrowLeft size={20} />
              Retour au hub
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
