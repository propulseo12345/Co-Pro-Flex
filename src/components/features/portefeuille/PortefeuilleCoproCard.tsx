'use client';

import { Building2, AlertCircle, AlertTriangle, Calendar } from 'lucide-react';
import type { ICoproprietePortefeuille, AlerteType } from '@/types/models/portefeuille';
import styles from '../../../app/(dashboard)/portefeuille/portefeuille.module.css';

const alerteTypeLabels: Record<AlerteType, string> = {
  IMPAYE: 'Impayés',
  FACTURE: 'Factures',
  BUDGET: 'Budgets',
  RAPPROCHEMENT: 'Rapprochement',
  CONTRAT: 'Contrats',
  AG: 'AG',
};

interface PortefeuilleCoproCardProps {
  copro: ICoproprietePortefeuille;
  onSelect: (copro: ICoproprietePortefeuille) => void;
}

function formatMontant(m: number): string {
  return m.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getSeverityClass(score: number): string {
  if (score === 0) return styles.cardBorderSuccess;
  if (score <= 30) return styles.cardBorderWarning;
  return styles.cardBorderDanger;
}

export function PortefeuilleCoproCard({ copro, onSelect }: PortefeuilleCoproCardProps) {
  return (
    <button
      className={`${styles.coproCard} ${getSeverityClass(copro.criticalityScore)}`}
      onClick={() => onSelect(copro)}
      type="button"
    >
      <div className={styles.cardHeader}>
        <Building2 size={18} className={styles.cardIcon} />
        <h3 className={styles.cardName}>{copro.nom}</h3>
      </div>

      <p className={styles.cardAddress}>{copro.adresse}</p>

      <div className={styles.cardStats}>
        <span className={styles.cardLots}>{copro.nombreLots} lots</span>
        <span className={styles.cardSeparator}>·</span>
        <span className={copro.soldeDisponible >= 0 ? styles.cardSoldePositive : styles.cardSoldeNegative}>
          {formatMontant(copro.soldeDisponible)}
        </span>
      </div>

      <div className={styles.cardDetails}>
        {copro.totalImpayes > 0 && (
          <span className={styles.cardImpayes}>
            {copro.nombreImpayes} impayé{copro.nombreImpayes > 1 ? 's' : ''} ({formatMontant(copro.totalImpayes)})
          </span>
        )}
        {copro.prochaineAG && (
          <span className={styles.cardAG}>
            <Calendar size={12} />
            AG : {formatDate(copro.prochaineAG)}
          </span>
        )}
      </div>

      {copro.alertes.length > 0 && (
        <div className={styles.cardAlertes}>
          {copro.alertes.slice(0, 3).map((alerte) => (
            <span
              key={alerte.id}
              className={`${styles.cardAlerteBadge} ${alerte.severite === 'critique' ? styles.alerteCritique : styles.alerteWarning}`}
            >
              {alerte.severite === 'critique' ? <AlertCircle size={10} /> : <AlertTriangle size={10} />}
              {alerteTypeLabels[alerte.type]}
            </span>
          ))}
          {copro.alertes.length > 3 && (
            <span className={styles.cardAlerteBadge}>+{copro.alertes.length - 3}</span>
          )}
        </div>
      )}
    </button>
  );
}
