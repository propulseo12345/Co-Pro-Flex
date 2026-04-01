'use client';

import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Receipt,
  PieChart,
  Banknote,
} from 'lucide-react';
import type { IPortefeuilleKPIs } from '@/types/models/portefeuille';
import styles from '../../../app/(dashboard)/portefeuille/portefeuille.module.css';

interface PortefeuilleKpisProps {
  kpis: IPortefeuilleKPIs;
}

function formatMontant(m: number): string {
  return m.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

export function PortefeuilleKpis({ kpis }: PortefeuilleKpisProps) {
  return (
    <div className={styles.kpisGrid}>
      <div className={`${styles.kpiCard} ${kpis.totalImpayes > 0 ? styles.kpiDanger : styles.kpiSuccess}`}>
        <div className={styles.kpiHeader}>
          <span className={styles.kpiLabel}>Impayés totaux</span>
          <div className={styles.kpiIcon}><AlertCircle size={20} /></div>
        </div>
        <div className={styles.kpiValue}>{formatMontant(kpis.totalImpayes)}</div>
        <div className={styles.kpiSub}>
          {kpis.nombreCoproAvecImpayes > 0
            ? <span className={styles.kpiSubHighlight}>{kpis.nombreCoproAvecImpayes} copro. concernée{kpis.nombreCoproAvecImpayes > 1 ? 's' : ''}</span>
            : <span>Aucun impayé</span>}
        </div>
      </div>

      <div className={`${styles.kpiCard} ${kpis.tauxRecouvrementGlobal < 90 ? styles.kpiWarning : styles.kpiSuccess}`}>
        <div className={styles.kpiHeader}>
          <span className={styles.kpiLabel}>Taux recouvrement</span>
          <div className={styles.kpiIcon}><TrendingUp size={20} /></div>
        </div>
        <div className={styles.kpiValue}>{kpis.tauxRecouvrementGlobal.toFixed(1)}%</div>
        <div className={styles.kpiSub}>
          {kpis.tauxRecouvrementGlobal >= 95
            ? <><CheckCircle size={12} /> Excellent</>
            : kpis.tauxRecouvrementGlobal >= 85
              ? <><TrendingUp size={12} /> Bon</>
              : <><TrendingDown size={12} /> À améliorer</>}
        </div>
      </div>

      <div className={`${styles.kpiCard} ${kpis.totalFacturesRetard > 0 ? styles.kpiWarning : styles.kpiSuccess}`}>
        <div className={styles.kpiHeader}>
          <span className={styles.kpiLabel}>Factures en retard</span>
          <div className={styles.kpiIcon}><Receipt size={20} /></div>
        </div>
        <div className={styles.kpiValue}>{kpis.totalFacturesRetard}</div>
        <div className={styles.kpiSub}>
          {kpis.montantFacturesRetard > 0
            ? <span>{formatMontant(kpis.montantFacturesRetard)}</span>
            : <span>Aucune facture en retard</span>}
        </div>
      </div>

      <div className={`${styles.kpiCard} ${kpis.budgetsARisque > 0 ? styles.kpiWarning : styles.kpiSuccess}`}>
        <div className={styles.kpiHeader}>
          <span className={styles.kpiLabel}>Budgets à risque</span>
          <div className={styles.kpiIcon}><PieChart size={20} /></div>
        </div>
        <div className={styles.kpiValue}>{kpis.budgetsARisque}</div>
        <div className={styles.kpiSub}>
          <span>{kpis.budgetGlobalTotal > 0 ? ((kpis.budgetGlobalConsomme / kpis.budgetGlobalTotal) * 100).toFixed(0) : 0}% budget global consommé</span>
        </div>
      </div>

      <div className={`${styles.kpiCard} ${kpis.coproNonRapprochees > 0 ? styles.kpiWarning : styles.kpiSuccess}`}>
        <div className={styles.kpiHeader}>
          <span className={styles.kpiLabel}>Rapprochement</span>
          <div className={styles.kpiIcon}><Banknote size={20} /></div>
        </div>
        <div className={styles.kpiValue}>{kpis.mouvementsNonRapprochesTotal}</div>
        <div className={styles.kpiSub}>
          {kpis.coproNonRapprochees > 0
            ? <span className={styles.kpiSubHighlight}>{kpis.coproNonRapprochees} copro. en attente</span>
            : <><CheckCircle size={12} /> Tout rapproché</>}
        </div>
      </div>
    </div>
  );
}
