'use client';

import { Building2 } from 'lucide-react';
import type { TypeCompte, CompteBancaire } from '../domain/types';
import styles from '../../../../app/(dashboard)/finance/mouvements-bancaires/mouvements-bancaires.module.css';

interface AccountCardsProps {
  compteActif: TypeCompte;
  soldeActuel: number;
  compteCourant: CompteBancaire;
  compteTravaux: CompteBancaire;
  onCompteChange: (compte: TypeCompte) => void;
}

export function AccountCards({
  compteActif,
  soldeActuel,
  compteCourant,
  compteTravaux,
  onCompteChange,
}: AccountCardsProps) {
  return (
    <div className={styles.comptesGrid}>
      <div
        className={`${styles.compteCard} ${compteActif === 'courant' ? styles.compteCardActive : ''}`}
        onClick={() => onCompteChange('courant')}
      >
        <div className={styles.compteHeader}>
          <Building2 size={24} aria-hidden="true" />
          <span className={styles.compteType}>Compte courant</span>
        </div>
        <div className={styles.compteSolde}>
          {compteActif === 'courant'
            ? soldeActuel.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
            : compteCourant.soldeInitial.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
          }
        </div>
        <div className={styles.compteIban}>{compteCourant.iban}</div>
        <div className={styles.compteMaj}>
          Solde initial : {compteCourant.soldeInitial.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        </div>
      </div>

      <div
        className={`${styles.compteCard} ${compteActif === 'travaux' ? styles.compteCardActive : ''}`}
        onClick={() => onCompteChange('travaux')}
      >
        <div className={styles.compteHeader}>
          <Building2 size={24} aria-hidden="true" />
          <span className={styles.compteType}>Fonds de travaux</span>
        </div>
        <div className={styles.compteSolde}>
          {compteActif === 'travaux'
            ? soldeActuel.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
            : compteTravaux.soldeInitial.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
          }
        </div>
        <div className={styles.compteIban}>{compteTravaux.iban}</div>
        <div className={styles.compteMaj}>
          Solde initial : {compteTravaux.soldeInitial.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        </div>
      </div>
    </div>
  );
}
