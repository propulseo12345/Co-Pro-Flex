'use client';

import { Loader2 } from 'lucide-react';
import styles from '@/app/(dashboard)/ag/[id]/feuille-presence/feuille-presence.module.css';

export function PresenceLoadingState() {
  return (
    <div className="container">
      <div className={styles.loadingState}>
        <Loader2 size={48} className={styles.spinner} />
        <h2>Chargement de la feuille de présence...</h2>
        <p>Récupération des données depuis Supabase</p>
      </div>
    </div>
  );
}
