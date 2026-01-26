'use client';

import Link from 'next/link';
import { Building2, User, Calendar, FileText, AlertTriangle, ChevronRight } from 'lucide-react';
import { MutationStatusBadge } from './MutationStatusBadge';
import { MUTATION_TYPE_LABELS } from '../domain/types';
import type { MutationOverview } from '../domain/types';
import styles from './MutationCard.module.css';

interface MutationCardProps {
  mutation: MutationOverview;
}

export function MutationCard({ mutation }: MutationCardProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Alertes
  const hasDeadlineAlert =
    mutation.days_until_pre_etat_deadline !== null &&
    mutation.days_until_pre_etat_deadline <= 5 &&
    mutation.days_until_pre_etat_deadline >= 0 &&
    !mutation.has_pre_etat;

  const isOverdue =
    mutation.days_until_pre_etat_deadline !== null &&
    mutation.days_until_pre_etat_deadline < 0 &&
    !mutation.has_pre_etat;

  const docsMissing = !mutation.has_pre_etat || !mutation.has_final_etat;

  return (
    <Link href={`/ventes-impayes/ventes/${mutation.id}`} className={styles.card}>
      <div className={styles.header}>
        <div className={styles.lotInfo}>
          <Building2 size={18} className={styles.lotIcon} />
          <div>
            <span className={styles.lotRef}>{mutation.lot_ref}</span>
            <span className={styles.lotType}>{mutation.lot_type}</span>
          </div>
        </div>
        <MutationStatusBadge status={mutation.status} />
      </div>

      <div className={styles.body}>
        <div className={styles.parties}>
          <div className={styles.party}>
            <span className={styles.partyLabel}>Vendeur</span>
            <span className={styles.partyName}>
              <User size={14} />
              {mutation.seller_name}
            </span>
          </div>
          <div className={styles.arrow}>→</div>
          <div className={styles.party}>
            <span className={styles.partyLabel}>Acquéreur</span>
            <span className={styles.partyName}>
              <User size={14} />
              {mutation.buyer_name || 'Non renseigné'}
            </span>
          </div>
        </div>

        <div className={styles.meta}>
          <div className={styles.metaItem}>
            <Calendar size={14} />
            <span>Notifiée le {formatDate(mutation.requested_at)}</span>
          </div>
          <div className={styles.metaItem}>
            <FileText size={14} />
            <span>{MUTATION_TYPE_LABELS[mutation.mutation_type]}</span>
          </div>
        </div>

        {/* Alertes */}
        {(hasDeadlineAlert || isOverdue || (docsMissing && mutation.status !== 'draft' && mutation.status !== 'validated' && mutation.status !== 'cancelled')) && (
          <div className={styles.alerts}>
            {isOverdue && (
              <div className={`${styles.alert} ${styles.alertError}`}>
                <AlertTriangle size={14} />
                <span>Délai pré-état daté dépassé</span>
              </div>
            )}
            {hasDeadlineAlert && !isOverdue && (
              <div className={`${styles.alert} ${styles.alertWarning}`}>
                <AlertTriangle size={14} />
                <span>
                  {mutation.days_until_pre_etat_deadline}j restants pour le pré-état daté
                </span>
              </div>
            )}
            {docsMissing && !mutation.has_pre_etat && mutation.status !== 'draft' && (
              <div className={`${styles.alert} ${styles.alertInfo}`}>
                <FileText size={14} />
                <span>Pré-état daté manquant</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <span className={styles.viewLink}>
          Voir le détail
          <ChevronRight size={16} />
        </span>
      </div>
    </Link>
  );
}
