'use client';

import { CheckCircle, AlertTriangle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import styles from './BlocCard.module.css';

interface DualActions {
  onApprove: () => void;
  onReject: () => void;
  approveLabel?: string;
  rejectLabel?: string;
}

interface BlocCardProps {
  title: string;
  actionType: string;
  status: 'pending' | 'activated' | 'failed' | 'loading';
  error?: string | null;
  children: React.ReactNode;
  onConfirm?: () => void;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  dualActions?: DualActions;
}

export function BlocCard({
  title,
  status,
  error,
  children,
  onConfirm,
  confirmLabel = 'Confirmer',
  confirmDisabled = false,
  dualActions,
}: BlocCardProps) {
  const [collapsed, setCollapsed] = useState(status === 'activated');

  return (
    <div className={clsx(styles.card, styles[status])}>
      <div className={styles.header} onClick={() => setCollapsed(c => !c)}>
        <div className={styles.headerLeft}>
          {status === 'activated' && <CheckCircle size={18} className={styles.iconSuccess} />}
          {status === 'failed' && <AlertTriangle size={18} className={styles.iconFailed} />}
          {status === 'loading' && <Loader2 size={18} className={styles.iconLoading} />}
          {status === 'pending' && <div className={styles.iconPending} />}
          <span className={styles.title}>{title}</span>
        </div>
        <div className={styles.headerRight}>
          <span className={clsx(styles.badge, styles[`badge_${status}`])}>
            {status === 'activated' ? 'Créé' : status === 'failed' ? 'Erreur' : status === 'loading' ? 'En cours…' : 'À confirmer'}
          </span>
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </div>
      </div>

      {!collapsed && (
        <div className={styles.body}>
          {error && (
            <div className={styles.error}>
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className={styles.content}>{children}</div>

          {status !== 'activated' && dualActions && (
            <div className={styles.footerDual}>
              <button
                className={styles.rejectBtn}
                onClick={dualActions.onReject}
                disabled={status === 'loading'}
                type="button"
              >
                {status === 'loading' ? 'En cours…' : dualActions.rejectLabel || 'Refuser'}
              </button>
              <button
                className={styles.approveBtn}
                onClick={dualActions.onApprove}
                disabled={status === 'loading'}
                type="button"
              >
                {status === 'loading' ? 'En cours…' : dualActions.approveLabel || 'Approuver'}
              </button>
            </div>
          )}

          {status !== 'activated' && !dualActions && onConfirm && (
            <div className={styles.footer}>
              <button
                className={styles.confirmBtn}
                onClick={onConfirm}
                disabled={confirmDisabled || status === 'loading'}
                type="button"
              >
                {status === 'loading' ? 'En cours…' : confirmLabel}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
