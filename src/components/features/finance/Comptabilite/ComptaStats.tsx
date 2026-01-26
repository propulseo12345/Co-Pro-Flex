'use client';

import { TrendingDown, TrendingUp, FileText, AlertTriangle, CheckCircle, Scale, List } from 'lucide-react';
import { TabCompta } from './types';
import { formatCurrency } from './utils';
import styles from './Comptabilite.module.css';

interface BalanceStats {
  nombreComptes: number;
  totalMouvementDebit: number;
  totalMouvementCredit: number;
  totalClotureDebit: number;
  totalClotureCredit: number;
}

interface ComptaStatsProps {
  activeTab: TabCompta;
  totalDebit: number;
  totalCredit: number;
  totalDepenses: number;
  totalBudgetPrevu: number;
  isBalanced?: boolean;
  ecart?: number;
  balanceStats?: BalanceStats;
}

export function ComptaStats({
  activeTab,
  totalDebit,
  totalCredit,
  totalDepenses,
  totalBudgetPrevu,
  isBalanced = true,
  ecart = 0,
  balanceStats
}: ComptaStatsProps) {
  // Onglet Balance
  if (activeTab === 'balance' && balanceStats) {
    const balanceEquilibree = Math.abs(balanceStats.totalClotureDebit - balanceStats.totalClotureCredit) < 0.01;

    return (
      <div className={styles.balanceStatsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <List size={24} aria-hidden="true" />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Comptes utilisés</span>
            <span className={styles.statValue}>
              {balanceStats.nombreComptes}
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
            <TrendingDown size={24} aria-hidden="true" />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Total mouvements débit</span>
            <span className={styles.statValue} style={{ color: 'var(--danger)' }}>
              {formatCurrency(balanceStats.totalMouvementDebit)}
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
            <TrendingUp size={24} aria-hidden="true" />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Total mouvements crédit</span>
            <span className={styles.statValue} style={{ color: 'var(--success)' }}>
              {formatCurrency(balanceStats.totalMouvementCredit)}
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div
            className={styles.statIcon}
            style={{
              background: balanceEquilibree ? 'var(--success-light)' : 'var(--danger-light)',
              color: balanceEquilibree ? 'var(--success)' : 'var(--danger)'
            }}
          >
            <Scale size={24} aria-hidden="true" />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>État de la balance</span>
            <span
              className={styles.statValue}
              style={{ color: balanceEquilibree ? 'var(--success)' : 'var(--danger)' }}
            >
              {balanceEquilibree ? 'Équilibrée' : 'Déséquilibrée'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Pas de stats pour les annexes
  if (activeTab.startsWith('annexe-')) {
    return null;
  }

  // Onglet Grand Livre
  if (activeTab === 'grand-livre') {
    return (
      <>
        {/* Alerte si déséquilibre comptable */}
        {!isBalanced && (
          <div className={styles.alertDesequilibre}>
            <AlertTriangle size={20} />
            <div>
              <strong>Erreur comptable : Déséquilibre détecté</strong>
              <p>
                En comptabilité en partie double, Total Débits doit TOUJOURS égaler Total Crédits.
                Écart constaté : {formatCurrency(ecart)}
              </p>
            </div>
          </div>
        )}

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
              <TrendingDown size={24} aria-hidden="true" />
            </div>
            <div className={styles.statContent}>
              <span className={styles.statLabel}>Total débits</span>
              <span className={styles.statValue} style={{ color: 'var(--danger)' }}>
                {formatCurrency(totalDebit)}
              </span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
              <TrendingUp size={24} aria-hidden="true" />
            </div>
            <div className={styles.statContent}>
              <span className={styles.statLabel}>Total crédits</span>
              <span className={styles.statValue} style={{ color: 'var(--success)' }}>
                {formatCurrency(totalCredit)}
              </span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div
              className={styles.statIcon}
              style={{
                background: isBalanced ? 'var(--success-light)' : 'var(--danger-light)',
                color: isBalanced ? 'var(--success)' : 'var(--danger)'
              }}
            >
              {isBalanced ? <CheckCircle size={24} aria-hidden="true" /> : <AlertTriangle size={24} aria-hidden="true" />}
            </div>
            <div className={styles.statContent}>
              <span className={styles.statLabel}>Équilibre partie double</span>
              <span
                className={styles.statValue}
                style={{ color: isBalanced ? 'var(--success)' : 'var(--danger)' }}
              >
                {isBalanced ? 'Équilibré' : `Écart: ${formatCurrency(ecart)}`}
              </span>
            </div>
          </div>
        </div>
      </>
    );
  }

  const ecartBudget = totalBudgetPrevu - totalDepenses;

  return (
    <div className={styles.statsGrid}>
      <div className={styles.statCard}>
        <div className={styles.statIcon} style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
          <TrendingDown size={24} aria-hidden="true" />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statLabel}>Total dépenses</span>
          <span className={styles.statValue} style={{ color: 'var(--danger)' }}>
            {formatCurrency(totalDepenses)}
          </span>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statIcon} style={{ background: 'var(--info-light)', color: 'var(--info)' }}>
          <FileText size={24} aria-hidden="true" />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statLabel}>Budget prévu</span>
          <span className={styles.statValue}>
            {formatCurrency(totalBudgetPrevu)}
          </span>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statIcon} style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
          <TrendingUp size={24} aria-hidden="true" />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statLabel}>Écart</span>
          <span className={styles.statValue} style={{ color: ecartBudget < 0 ? 'var(--danger)' : 'var(--success)' }}>
            {formatCurrency(ecartBudget)}
          </span>
        </div>
      </div>
    </div>
  );
}
