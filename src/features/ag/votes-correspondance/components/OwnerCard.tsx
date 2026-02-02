'use client';

import { FileText, Check, Users, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import type { EligibleOwner } from '@/lib/ag/correspondence';
import styles from '@/app/(dashboard)/ag/[id]/votes-correspondance/votes-correspondance.module.css';

interface OwnerCardProps {
  owner: EligibleOwner;
  selected: boolean;
  onClick: () => void;
}

export function OwnerCard({ owner, selected, onClick }: OwnerCardProps) {
  const hasCorrespondence = owner.correspondence?.form_id;
  const hasVoted = (owner.voted_resolutions?.length || 0) > 0;
  const isPresent = owner.attendance?.presence_type === 'present';
  const isProxy = owner.attendance?.presence_type === 'proxy';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPresent || isProxy}
      className={clsx(
        styles.ownerCard,
        selected && styles.ownerSelected,
        (isPresent || isProxy) && styles.ownerDisabled
      )}
    >
      <div className={styles.ownerInfo}>
        <span className={styles.ownerName}>{owner.name}</span>
        <span className={styles.ownerTantiemes}>{owner.total_tantiemes} tantiemes</span>
        {owner.email && (
          <span className={styles.ownerEmail}>{owner.email}</span>
        )}
      </div>

      <div className={styles.ownerStatus}>
        {isPresent && (
          <span className={clsx(styles.statusBadge, styles.statusPresent)}>
            <Users size={12} /> Present
          </span>
        )}
        {isProxy && (
          <span className={clsx(styles.statusBadge, styles.statusProxy)}>
            <FileText size={12} /> Represente
          </span>
        )}
        {hasCorrespondence && (
          <span className={clsx(styles.statusBadge, styles.statusCorrespondence)}>
            <CheckCircle2 size={12} /> Formulaire recu
          </span>
        )}
        {hasVoted && !isPresent && !isProxy && (
          <span className={clsx(styles.statusBadge, styles.statusVoted)}>
            <Check size={12} /> {owner.voted_resolutions?.length} vote(s)
          </span>
        )}
      </div>
    </button>
  );
}
