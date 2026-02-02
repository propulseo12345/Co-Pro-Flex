'use client';

import { Users } from 'lucide-react';
import styles from '@/app/(dashboard)/ag/[id]/feuille-presence/feuille-presence.module.css';

export function PresenceEmptyState() {
  return (
    <div className={styles.emptyState}>
      <Users size={48} />
      <p>Aucun copropriétaire trouvé pour cette AG</p>
      <p className={styles.emptyHint}>Vérifiez que des copropriétaires sont associés à la copropriété.</p>
    </div>
  );
}
