'use client';

import { AlertTriangle, CheckCircle } from 'lucide-react';
import { PosteBudgetData } from './types';
import styles from './Budget.module.css';

interface BudgetAlertsProps {
  postesEnAlerte: PosteBudgetData[];
}

// États du budget : alerte (90-99%), consommé (100%), dépassé (> 100%)
type AlertStatus = 'alerte' | 'consomme' | 'depasse';

function getAlertStatus(percentage: number): AlertStatus {
  if (percentage > 100) return 'depasse';
  if (percentage === 100) return 'consomme';
  return 'alerte';
}

export function BudgetAlerts({ postesEnAlerte }: BudgetAlertsProps) {
  if (postesEnAlerte.length === 0) return null;

  // Séparer les postes par état pour un titre plus précis
  const postesDepasses = postesEnAlerte.filter(p => (p.consomme / p.budgetVote) * 100 > 100);
  const postesConsommes = postesEnAlerte.filter(p => (p.consomme / p.budgetVote) * 100 === 100);
  const postesEnAlerteSimple = postesEnAlerte.filter(p => {
    const pct = (p.consomme / p.budgetVote) * 100;
    return pct >= 90 && pct < 100;
  });

  // Construire le titre dynamiquement
  const getTitre = () => {
    const parts: string[] = [];
    if (postesDepasses.length > 0) parts.push(`${postesDepasses.length} dépassé${postesDepasses.length > 1 ? 's' : ''}`);
    if (postesConsommes.length > 0) parts.push(`${postesConsommes.length} consommé${postesConsommes.length > 1 ? 's' : ''}`);
    if (postesEnAlerteSimple.length > 0) parts.push(`${postesEnAlerteSimple.length} en alerte`);
    return parts.join(', ');
  };

  return (
    <div className={styles.alertSection}>
      <div className={styles.alertCard}>
        <div className={styles.alertHeader}>
          <AlertTriangle size={24} className={styles.alertIcon} aria-hidden="true" />
          <h3 className={styles.alertTitle}>
            {postesEnAlerte.length} poste{postesEnAlerte.length > 1 ? 's' : ''} à surveiller ({getTitre()})
          </h3>
        </div>
        <div className={styles.alertList}>
          {postesEnAlerte.map(poste => {
            const percentage = (poste.consomme / poste.budgetVote) * 100;
            const status = getAlertStatus(percentage);
            const restant = poste.budgetVote - poste.consomme;

            // Message selon l'état
            const getRestantMessage = () => {
              if (status === 'depasse') return `Dépassé de ${Math.abs(restant).toLocaleString()} €`;
              if (status === 'consomme') return 'Budget entièrement consommé';
              return `Reste ${restant.toLocaleString()} €`;
            };

            // Couleur selon l'état
            const getColor = () => {
              if (status === 'depasse') return 'var(--danger)';
              if (status === 'consomme') return 'var(--success)';
              return 'var(--warning)';
            };

            return (
              <div key={poste.poste} className={styles.alertItem}>
                <span className={styles.alertPoste}>
                  {status === 'consomme' && <CheckCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />}
                  {poste.label}
                </span>
                <span className={styles.alertPercentage} style={{ color: getColor() }}>
                  {percentage.toFixed(1)}% {status === 'consomme' ? 'consommé' : 'consommé'}
                </span>
                <span className={styles.alertRestant} style={{ color: status === 'consomme' ? 'var(--success)' : undefined }}>
                  {getRestantMessage()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
