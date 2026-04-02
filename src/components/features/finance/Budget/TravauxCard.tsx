'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ArrowRight, ExternalLink } from 'lucide-react';
import { BudgetTravaux, getBudgetAppele, getRestantAAppeler } from './types';
import styles from './TravauxCard.module.css';

interface TravauxCardProps {
  travaux: BudgetTravaux;
  onOpenDetail: (travaux: BudgetTravaux) => void;
  onNewAppelFonds?: (travaux: BudgetTravaux) => void;
}

export function TravauxCard({ travaux, onOpenDetail }: TravauxCardProps) {
  const [expanded, setExpanded] = useState(false);
  const budgetAppele = getBudgetAppele(travaux.appelsDeFonds);
  const totalCollecte = travaux.appelsDeFonds.reduce((s, a) => s + (a.totalPaid ?? 0), 0);
  const restantAAppeler = getRestantAAppeler(travaux.budgetVote, travaux.appelsDeFonds);
  const appelePct = travaux.budgetVote > 0 ? (budgetAppele / travaux.budgetVote) * 100 : 0;
  const sourceLabel = (travaux as unknown as Record<string, unknown>).sourceAG ? 'AG' : 'Manuel';

  return (
    <div className={styles.card}>
      {/* Compact row */}
      <div className={styles.row} onClick={() => setExpanded(v => !v)}>
        <ChevronDown size={14} className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`} />
        <span className={styles.rowTitle}>{travaux.titre}</span>
        <span className={styles.rowSource}>{sourceLabel}</span>
        <span className={styles.rowStat}>{travaux.budgetVote.toLocaleString('fr-FR')} €</span>
        <span className={styles.rowStat} style={{ color: 'var(--warning)' }}>{budgetAppele.toLocaleString('fr-FR')} €</span>
        <span className={styles.rowStat} style={{ color: 'var(--success)' }}>{totalCollecte.toLocaleString('fr-FR')} €</span>
        <span className={styles.rowProgress}>
          <span className={styles.miniBar}>
            <span className={styles.miniFill} style={{ width: `${appelePct}%`, background: 'var(--warning)' }} />
          </span>
        </span>
        <span className={styles.rowAppels}>{travaux.appelsDeFonds.length} appel{travaux.appelsDeFonds.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className={styles.detail}>
          <div className={styles.detailStats}>
            <div className={styles.detailStat}>
              <span className={styles.detailLabel}>Budget voté</span>
              <span className={styles.detailValue}>{travaux.budgetVote.toLocaleString('fr-FR')} €</span>
            </div>
            <div className={styles.detailStat}>
              <span className={styles.detailLabel}>Appelé</span>
              <span className={styles.detailValue} style={{ color: 'var(--warning)' }}>{budgetAppele.toLocaleString('fr-FR')} €</span>
            </div>
            <div className={styles.detailStat}>
              <span className={styles.detailLabel}>Collecté</span>
              <span className={styles.detailValue} style={{ color: 'var(--success)' }}>{totalCollecte.toLocaleString('fr-FR')} €</span>
            </div>
            <div className={styles.detailStat}>
              <span className={styles.detailLabel}>Reste à appeler</span>
              <span className={styles.detailValue} style={{ color: restantAAppeler > 0 ? 'var(--secondary)' : 'var(--text-secondary)' }}>{restantAAppeler.toLocaleString('fr-FR')} €</span>
            </div>
          </div>

          {/* Appels de fonds */}
          {travaux.appelsDeFonds.length > 0 && (
            <div className={styles.appelsSection}>
              <div className={styles.appelsHeader}>
                <span className={styles.appelsTitle}>Appels de fonds</span>
                <Link href="/finance/appels-fonds" className={styles.appelsLink}>Gérer <ExternalLink size={10} /></Link>
              </div>
              {travaux.appelsDeFonds.map((appel) => {
                const paid = appel.totalPaid ?? 0;
                const statusLabel = appel.callStatus === 'paid' ? 'Payé' : appel.callStatus === 'issued' ? 'Émis' : 'Brouillon';
                const statusClass = appel.callStatus === 'paid' ? styles.appelPaye : appel.callStatus === 'issued' ? styles.appelEmis : styles.appelBrouillon;
                return (
                  <div key={appel.id} className={styles.appelRow}>
                    <span className={styles.appelLabel}>{appel.label || `Appel #${appel.numero}`}</span>
                    <span className={styles.appelMontant}>{appel.montant.toLocaleString('fr-FR')} €</span>
                    <span className={styles.appelCollecte}>{paid.toLocaleString('fr-FR')} €</span>
                    <span className={`${styles.appelStatut} ${statusClass}`}>{statusLabel}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className={styles.detailActions}>
            <button className={styles.btnSmall} onClick={() => onOpenDetail(travaux)}>Détail</button>
            <Link href="/finance/appels-fonds" className={styles.btnSmallPrimary}>Appels de fonds <ArrowRight size={12} /></Link>
          </div>
        </div>
      )}
    </div>
  );
}
