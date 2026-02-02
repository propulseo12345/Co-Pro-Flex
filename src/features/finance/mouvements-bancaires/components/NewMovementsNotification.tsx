'use client';

import { Bell, X } from 'lucide-react';
import styles from '@/app/(dashboard)/finance/mouvements-bancaires/mouvements-bancaires.module.css';

interface NewMovementsNotificationProps {
  count: number;
  onDismiss: () => void;
}

export function NewMovementsNotification({ count, onDismiss }: NewMovementsNotificationProps) {
  return (
    <div className={styles.notificationNouveauxMouvements}>
      <Bell size={18} />
      <span>
        {count} nouveau{count > 1 ? 'x' : ''} mouvement{count > 1 ? 's' : ''} importé{count > 1 ? 's' : ''}
      </span>
      <button onClick={onDismiss}>
        <X size={16} />
      </button>
    </div>
  );
}
