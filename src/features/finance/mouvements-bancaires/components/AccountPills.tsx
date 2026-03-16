'use client';

import clsx from 'clsx';
import type { TypeCompte, CompteBancaire } from '../domain/types';
import styles from './AccountPills.module.css';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

interface AccountPillsProps {
  compteActif: TypeCompte;
  soldeActuel: number;
  totalEntrees: number;
  totalSorties: number;
  compteCourant: CompteBancaire;
  compteTravaux: CompteBancaire;
  onCompteChange: (compte: TypeCompte) => void;
}

export function AccountPills({
  compteActif,
  soldeActuel,
  totalEntrees,
  totalSorties,
  compteCourant,
  compteTravaux,
  onCompteChange,
}: AccountPillsProps) {
  return (
    <div className={styles.pillsContainer}>
      <button
        className={clsx(styles.pill, compteActif === 'courant' && styles.pillActive)}
        onClick={() => onCompteChange('courant')}
        type="button"
      >
        <div className={styles.pillAvatar}>CC</div>
        <div className={styles.pillInfo}>
          <div className={styles.pillLabel}>Compte courant</div>
          <div className={styles.pillSolde}>
            {compteActif === 'courant'
              ? formatCurrency(soldeActuel)
              : formatCurrency(compteCourant.soldeInitial)
            }
          </div>
        </div>
        {compteActif === 'courant' && (
          <div className={styles.pillStats}>
            <div className={styles.pillStatEntree}>↑ {formatCurrency(totalEntrees)}</div>
            <div className={styles.pillStatSortie}>↓ {formatCurrency(totalSorties)}</div>
          </div>
        )}
      </button>

      <button
        className={clsx(styles.pill, compteActif === 'travaux' && styles.pillActive)}
        onClick={() => onCompteChange('travaux')}
        type="button"
      >
        <div className={styles.pillAvatar}>FT</div>
        <div className={styles.pillInfo}>
          <div className={styles.pillLabel}>Fonds de travaux</div>
          <div className={styles.pillSolde}>
            {compteActif === 'travaux'
              ? formatCurrency(soldeActuel)
              : formatCurrency(compteTravaux.soldeInitial)
            }
          </div>
        </div>
        {compteActif === 'travaux' && (
          <div className={styles.pillStats}>
            <div className={styles.pillStatEntree}>↑ {formatCurrency(totalEntrees)}</div>
            <div className={styles.pillStatSortie}>↓ {formatCurrency(totalSorties)}</div>
          </div>
        )}
      </button>
    </div>
  );
}
