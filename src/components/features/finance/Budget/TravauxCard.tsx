'use client';

import Link from 'next/link';
import { Plus, History, ArrowRight } from 'lucide-react';
import { BudgetTravaux, getProgressColor, getProgressPercentage, getBudgetAppele, getRestantAAppeler } from './types';
import styles from './TravauxCard.module.css';

interface TravauxCardProps {
  travaux: BudgetTravaux;
  onOpenDetail: (travaux: BudgetTravaux) => void;
  onNewAppelFonds?: (travaux: BudgetTravaux) => void;
}

export function TravauxCard({ travaux, onOpenDetail, onNewAppelFonds }: TravauxCardProps) {
  const percentage = getProgressPercentage(travaux.consomme, travaux.budgetVote);
  const color = getProgressColor(travaux.consomme, travaux.budgetVote);
  const budgetAppele = getBudgetAppele(travaux.appelsDeFonds);
  const restantAAppeler = getRestantAAppeler(travaux.budgetVote, travaux.appelsDeFonds);

  const statutLabel = travaux.statut === 'A_VENIR' ? 'À venir' : travaux.statut === 'EN_COURS' ? 'En cours' : 'Terminé';
  const statutClass = travaux.statut === 'EN_COURS' ? styles.statusActive : travaux.statut === 'TERMINE' ? styles.statusDone : styles.statusPending;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>{travaux.titre}</h3>
          <p className={styles.description}>{travaux.description}</p>
          <span className={styles.date}>Voté le {new Date(travaux.dateVote).toLocaleDateString('fr-FR')}</span>
        </div>
        <span className={`${styles.statusBadge} ${statutClass}`}>{statutLabel}</span>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Budget voté</span>
          <span className={styles.statValue}>{travaux.budgetVote.toLocaleString('fr-FR')} €</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Appelé</span>
          <span className={styles.statValue} style={{ color: '#60a5fa' }}>{budgetAppele.toLocaleString('fr-FR')} €</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Consommé</span>
          <span className={styles.statValue} style={{ color }}>{travaux.consomme.toLocaleString('fr-FR')} €</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Restant à appeler</span>
          <span className={styles.statValue} style={{ color: restantAAppeler > 0 ? '#22c55e' : '#94a3b8' }}>{restantAAppeler.toLocaleString('fr-FR')} €</span>
        </div>
      </div>

      <div className={styles.progressSection}>
        <div className={styles.progressHeader}>
          <span>Progression</span>
          <span style={{ color }}>{percentage.toFixed(1)}%</span>
        </div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${percentage}%`, backgroundColor: color }} />
        </div>
      </div>

      <div className={styles.appels}>
        <div className={styles.appelsHeader}>
          <span className={styles.appelsTitle}>Appels de fonds <span className={styles.appelsCount}>{travaux.appelsDeFonds.length}</span></span>
          <Link href={`/finance/appels-fonds?type=travaux&projet=${travaux.id}`} className={styles.appelsLink}>
            Voir tout <ArrowRight size={12} />
          </Link>
        </div>
        {travaux.appelsDeFonds.length > 0 ? (
          <div className={styles.appelsList}>
            {travaux.appelsDeFonds.map((appel) => (
              <div key={appel.id} className={styles.appelRow}>
                <span className={styles.appelDate}>{new Date(appel.date).toLocaleDateString('fr-FR')}</span>
                <span className={styles.appelMontant}>{appel.montant.toLocaleString('fr-FR')} €</span>
                <span className={`${styles.appelStatut} ${appel.statut === 'PAYE' ? styles.appelPaye : appel.statut === 'ENVOYE' ? styles.appelEnvoye : styles.appelAttente}`}>
                  {appel.statut === 'PAYE' ? 'Payé' : appel.statut === 'ENVOYE' ? 'Envoyé' : 'En attente'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.noAppels}>Aucun appel de fonds programmé</div>
        )}
      </div>

      <div className={styles.actions}>
        <button className={styles.btnSecondary} onClick={() => onOpenDetail(travaux)}>
          <History size={14} /> Historique
        </button>
        <button className={styles.btnPrimary} onClick={() => onNewAppelFonds?.(travaux)} disabled={restantAAppeler <= 0}>
          <Plus size={14} /> Nouvel appel
        </button>
      </div>
    </div>
  );
}
