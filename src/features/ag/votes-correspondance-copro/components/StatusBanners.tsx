'use client';

import { Check } from 'lucide-react';
import styles from '@/app/(dashboard)/ag/[id]/votes-correspondance/[coproId]/votes-correspondance.module.css';

interface StatusBannersProps {
  isValidated: boolean;
  savedMessage: boolean;
}

export function StatusBanners({ isValidated, savedMessage }: StatusBannersProps) {
  return (
    <>
      {isValidated && (
        <div className={styles.valideBanner}>
          <Check size={20} aria-hidden="true" />
          <span>Ce vote par correspondance a ete valide</span>
        </div>
      )}

      {savedMessage && (
        <div className={styles.savedBanner}>
          <Check size={20} aria-hidden="true" />
          <span>Modifications enregistrees</span>
        </div>
      )}
    </>
  );
}
