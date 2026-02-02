'use client';

import { Check } from 'lucide-react';
import clsx from 'clsx';
import type { VoteDirection } from '@/lib/ag/types';
import styles from '@/app/(dashboard)/ag/[id]/votes-correspondance/votes-correspondance.module.css';

interface VoteButtonProps {
  vote: VoteDirection;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const labels: Record<VoteDirection, string> = {
  for: 'Pour',
  against: 'Contre',
  abstention: 'Abstention',
};

export function VoteButton({ vote, selected, onClick, disabled }: VoteButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        styles.voteButton,
        styles[`vote${vote.charAt(0).toUpperCase() + vote.slice(1)}`],
        selected && styles.voteSelected
      )}
    >
      {selected && <Check size={14} />}
      {labels[vote]}
    </button>
  );
}
