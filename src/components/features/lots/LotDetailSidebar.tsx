'use client';

import { User, Landmark, PiggyBank } from 'lucide-react';
import type { LotWithOwner } from '@/lib/lots/api';
import type { LotLoanShare, LotAdvance } from '@/hooks/modules/useLotDetailPage';
import styles from './LotDetailSidebar.module.css';

const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

const ADVANCE_TYPE_LABELS: Record<string, string> = {
  permanent: 'Fonds de roulement',
  special: 'Avance spéciale',
  work_fund: 'Fonds travaux ALUR',
};

interface LotDetailSidebarProps {
  lot: LotWithOwner;
  loanShares: LotLoanShare[];
  advances: LotAdvance[];
}

export function LotDetailSidebar({ lot, loanShares, advances }: LotDetailSidebarProps) {
  const totalLoanRemaining = loanShares.reduce((s, l) => s + l.remaining_amount, 0);
  const workFund = advances.filter(a => a.advance_type === 'work_fund');
  const otherAdvances = advances.filter(a => a.advance_type !== 'work_fund');

  return (
    <div className={styles.sidebar}>
      <div className={styles.card}>
        <h3 className={styles.cardTitle}><User size={16} /> Propriétaire</h3>
        {lot.owner_display_name ? (
          <>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Nom</span>
              <span className={styles.fieldValue}>{lot.owner_display_name}</span>
            </div>
            {lot.owner_email && (
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Email</span>
                <span className={styles.fieldValue}>{lot.owner_email}</span>
              </div>
            )}
          </>
        ) : (
          <p className={styles.emptyNote}>Aucun propriétaire attribué</p>
        )}
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}><Landmark size={16} /> Emprunts collectifs</h3>
        {loanShares.length > 0 ? (
          <>
            {loanShares.map(ls => (
              <div key={ls.loan_id} className={styles.loanItem}>
                <div className={styles.loanLabel}>{ls.label}</div>
                <div className={styles.loanMeta}>
                  Restant : {fmt(ls.remaining_amount)} / {fmt(ls.share_amount)}
                </div>
              </div>
            ))}
            <div className={styles.field} style={{ marginTop: 12 }}>
              <span className={styles.fieldLabel}>Total restant</span>
              <span className={styles.fieldValueDanger}>{fmt(totalLoanRemaining)}</span>
            </div>
          </>
        ) : (
          <p className={styles.emptyNote}>Aucun emprunt collectif</p>
        )}
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}><PiggyBank size={16} /> Avances &amp; Fonds</h3>
        {advances.length > 0 ? (
          <>
            {workFund.map(a => (
              <div key={a.id} className={styles.field}>
                <span className={styles.fieldLabel}>Fonds travaux ALUR</span>
                <span className={styles.fieldValueSuccess}>{fmt(a.amount_paid)}</span>
              </div>
            ))}
            {otherAdvances.map(a => (
              <div key={a.id} className={styles.field}>
                <span className={styles.fieldLabel}>{ADVANCE_TYPE_LABELS[a.advance_type] || a.label}</span>
                <span className={styles.fieldValueMono}>
                  {fmt(a.amount_paid)} / {fmt(a.amount_due)}
                </span>
              </div>
            ))}
          </>
        ) : (
          <p className={styles.emptyNote}>Aucune avance enregistrée</p>
        )}
      </div>
    </div>
  );
}
