'use client';

import Link from 'next/link';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { BudgetTravaux, getBudgetAppele, getRestantAAppeler } from './types';
import styles from './TravauxCard.module.css';

interface TravauxCardProps {
  travaux: BudgetTravaux;
  onOpenDetail: (travaux: BudgetTravaux) => void;
  onNewAppelFonds?: (travaux: BudgetTravaux) => void;
}

export function TravauxCard({ travaux, onOpenDetail, onNewAppelFonds }: TravauxCardProps) {
  const budgetAppele = getBudgetAppele(travaux.appelsDeFonds);
  const totalCollecte = travaux.appelsDeFonds.reduce((s, a) => s + (a.totalPaid ?? 0), 0);
  const restantAAppeler = getRestantAAppeler(travaux.budgetVote, travaux.appelsDeFonds);

  const appelePct = travaux.budgetVote > 0 ? (budgetAppele / travaux.budgetVote) * 100 : 0;
  const collectePct = budgetAppele > 0 ? (totalCollecte / budgetAppele) * 100 : 0;

  const statutLabel = travaux.statut === 'A_VENIR' ? 'Brouillon' : travaux.statut === 'EN_COURS' ? 'En cours' : 'Terminé';
  const statutClass = travaux.statut === 'EN_COURS' ? styles.statusActive : travaux.statut === 'TERMINE' ? styles.statusDone : styles.statusPending;

  // Source badge
  const sourceLabel = (travaux as unknown as Record<string, unknown>).sourceAG ? 'AG' : 'Manuel';

  return (
    <div className={styles.card}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.titleRow}>
            <h3 className={styles.title}>{travaux.titre}</h3>
            <span className={styles.sourceBadge}>{sourceLabel}</span>
          </div>
          {travaux.description && <p className={styles.description}>{travaux.description}</p>}
          <span className={styles.date}>
            Créé le {new Date(travaux.dateVote).toLocaleDateString('fr-FR')}
          </span>
        </div>
        <span className={`${styles.statusBadge} ${statutClass}`}>{statutLabel}</span>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Budget voté</span>
          <span className={styles.statValue}>{travaux.budgetVote.toLocaleString('fr-FR')} €</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Appelé</span>
          <span className={styles.statValue} style={{ color: '#f59e0b' }}>
            {budgetAppele.toLocaleString('fr-FR')} €
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Collecté</span>
          <span className={styles.statValue} style={{ color: '#22c55e' }}>
            {totalCollecte.toLocaleString('fr-FR')} €
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Reste à appeler</span>
          <span className={styles.statValue} style={{ color: restantAAppeler > 0 ? '#60a5fa' : '#94a3b8' }}>
            {restantAAppeler.toLocaleString('fr-FR')} €
          </span>
        </div>
      </div>

      {/* Double progress bar: appelé (orange) + collecté (green) */}
      <div className={styles.progressSection}>
        <div className={styles.progressHeader}>
          <span>Appelé {appelePct.toFixed(0)}%</span>
          <span>Collecté {collectePct.toFixed(0)}%</span>
        </div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${appelePct}%`, background: '#f59e0b' }} />
        </div>
        <div className={styles.progressBar} style={{ marginTop: 4 }}>
          <div className={styles.progressFill} style={{ width: `${collectePct}%`, background: '#22c55e' }} />
        </div>
      </div>

      {/* Suivi appels de fonds */}
      <div className={styles.appels}>
        <div className={styles.appelsHeader}>
          <span className={styles.appelsTitle}>
            Suivi appels de fonds
            <span className={styles.appelsCount}>{travaux.appelsDeFonds.length}</span>
          </span>
          <Link href={`/finance/appels-fonds`} className={styles.appelsLink}>
            Gérer <ExternalLink size={11} />
          </Link>
        </div>

        {travaux.appelsDeFonds.length > 0 ? (
          <div className={styles.appelsTable}>
            <div className={styles.appelsTableHeader}>
              <span>Libellé</span>
              <span className={styles.right}>Montant</span>
              <span className={styles.right}>Collecté</span>
              <span>Statut</span>
            </div>
            {travaux.appelsDeFonds.map((appel) => {
              const paid = appel.totalPaid ?? 0;
              const paidPct = appel.montant > 0 ? (paid / appel.montant) * 100 : 0;
              const statusLabel = appel.callStatus === 'paid' ? 'Payé'
                : appel.callStatus === 'partially_paid' ? `${paidPct.toFixed(0)}% payé`
                : appel.callStatus === 'issued' ? 'Émis'
                : 'Brouillon';
              const statusClass = appel.callStatus === 'paid' ? styles.appelPaye
                : appel.callStatus === 'issued' || appel.callStatus === 'partially_paid' ? styles.appelEnvoye
                : styles.appelAttente;

              return (
                <div key={appel.id} className={styles.appelRow}>
                  <span className={styles.appelLabel}>
                    {appel.label || `Appel #${appel.numero}`}
                    <span className={styles.appelDate}>
                      {new Date(appel.date).toLocaleDateString('fr-FR')}
                    </span>
                  </span>
                  <span className={`${styles.appelMontant} ${styles.right}`}>
                    {appel.montant.toLocaleString('fr-FR')} €
                  </span>
                  <span className={`${styles.appelCollecte} ${styles.right}`}>
                    {paid.toLocaleString('fr-FR')} €
                  </span>
                  <span>
                    <span className={`${styles.appelStatut} ${statusClass}`}>{statusLabel}</span>
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.noAppels}>
            Aucun appel de fonds lié à ce projet.
            <Link href="/finance/appels-fonds" className={styles.appelsLinkInline}>
              Créer un appel <ArrowRight size={12} />
            </Link>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles.btnSecondary} onClick={() => onOpenDetail(travaux)}>
          Détail du projet
        </button>
        <Link href="/finance/appels-fonds" className={styles.btnPrimary}>
          Voir les appels de fonds <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
