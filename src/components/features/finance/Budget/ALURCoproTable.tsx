'use client';

import { Home, History, CheckCircle, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import { CoproprietaireALUR } from './types';
import styles from './ALURCoproTable.module.css';

interface ALURCoproTableProps {
  coproprietairesALUR: CoproprietaireALUR[];
  onSelectCoproprietaire: (copro: CoproprietaireALUR) => void;
}

export function ALURCoproTable({ coproprietairesALUR, onSelectCoproprietaire }: ALURCoproTableProps) {
  return (
    <div className={styles.container}>
      <div className={styles.titleRow}>
        <h3 className={styles.title}>Suivi par lot et copropriétaire</h3>
      </div>
      <div className={styles.header}>
        <span>Lot</span>
        <span>Copropriétaire</span>
        <span className={styles.right}>Tantièmes</span>
        <span className={styles.right}>Cotisation ann.</span>
        <span className={styles.right}>Total cumulé</span>
        <span>Statut</span>
        <span></span>
      </div>
      {coproprietairesALUR.map((copro) => {
        const dernierPaiement = copro.historiqueContributions[copro.historiqueContributions.length - 1];
        const aChangement = copro.historiqueProprietaires.length > 1;
        const statutLabel = dernierPaiement.statut === 'PAYEE' ? 'À jour' : dernierPaiement.statut === 'EN_ATTENTE' ? 'En attente' : 'En retard';
        const statutClass = dernierPaiement.statut === 'PAYEE' ? styles.statutPaye : dernierPaiement.statut === 'EN_ATTENTE' ? styles.statutAttente : styles.statutRetard;

        return (
          <div key={copro.id} className={styles.row} onClick={() => onSelectCoproprietaire(copro)}>
            <span className={styles.lot}><Home size={14} /> {copro.lot}</span>
            <span className={styles.nom}>
              {copro.nom}
              {aChangement && <span className={styles.histBadge}><History size={10} /></span>}
            </span>
            <span className={styles.right}>{copro.tantiemes}</span>
            <span className={styles.right}>{copro.cotisationAnnuelle.toLocaleString('fr-FR')} €</span>
            <span className={`${styles.right} ${styles.total}`}>{copro.totalContributions.toLocaleString('fr-FR')} €</span>
            <span>
              <span className={`${styles.statutBadge} ${statutClass}`}>
                {dernierPaiement.statut === 'PAYEE' && <CheckCircle size={10} />}
                {dernierPaiement.statut === 'EN_ATTENTE' && <Clock size={10} />}
                {dernierPaiement.statut === 'EN_RETARD' && <AlertTriangle size={10} />}
                {statutLabel}
              </span>
            </span>
            <span><ChevronRight size={14} className={styles.chevron} /></span>
          </div>
        );
      })}
    </div>
  );
}
