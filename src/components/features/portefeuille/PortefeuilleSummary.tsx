'use client';

import {
  TrendingUp, AlertCircle, Percent, ArrowLeftRight, Wrench,
  Calendar, ClipboardList, PieChart,
} from 'lucide-react';
import type { IPortefeuilleKPIs, ICoproprietePortefeuille } from '@/types/models/portefeuille';
import styles from '../../../app/(gestionnaire)/portefeuille/portefeuille.module.css';

interface PortefeuilleSummaryProps {
  kpis: IPortefeuilleKPIs;
  coproprietes: ICoproprietePortefeuille[];
}

function formatMontant(m: number): string {
  return m.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export function PortefeuilleSummary({ kpis, coproprietes }: PortefeuilleSummaryProps) {
  const encaisseTotale = coproprietes.reduce((sum, c) => sum + c.soldeDisponible, 0);
  const taux = kpis.tauxRecouvrementGlobal;

  const prochaines = coproprietes
    .filter(c => c.prochaineAG)
    .sort((a, b) => new Date(a.prochaineAG!).getTime() - new Date(b.prochaineAG!).getTime())
    .slice(0, 3);

  return (
    <>
      {/* KPI Strip — 4 cards */}
      <div className={styles.kpiStrip}>
        {/* Encaisse Totale */}
        <div className={`${styles.kpiCard} ${styles.kpiPrimary}`}>
          <div className={styles.kpiHeader}>
            <p className={styles.kpiLabel}>Encaisse Totale</p>
            <div className={styles.kpiIcon}><TrendingUp size={18} /></div>
          </div>
          <div className={styles.kpiValue}>{formatMontant(encaisseTotale)}&euro;</div>
          <div className={styles.kpiTrend}>
            <TrendingUp size={14} />
            +4.2%
          </div>
        </div>

        {/* Taux Recouvrement */}
        <div className={`${styles.kpiCard} ${taux < 90 ? styles.kpiWarning : styles.kpiSuccess}`}>
          <div className={styles.kpiHeader}>
            <p className={styles.kpiLabel}>Taux Recouvrement</p>
            <div className={styles.kpiIcon}><Percent size={18} /></div>
          </div>
          <div className={styles.kpiValue}>{taux.toFixed(1)}%</div>
          <div className={styles.kpiSub}>
            {taux >= 95 ? 'Excellent' : taux >= 85 ? 'Bon' : 'A ameliorer'}
          </div>
        </div>

        {/* Impayes */}
        <div className={`${styles.kpiCard} ${kpis.totalImpayes > 0 ? styles.kpiDanger : styles.kpiSuccess}`}>
          <div className={styles.kpiHeader}>
            <p className={styles.kpiLabel}>Impayes Totaux</p>
            <div className={styles.kpiIcon}><AlertCircle size={18} /></div>
          </div>
          <div className={styles.kpiValue}>{formatMontant(kpis.totalImpayes)}&euro;</div>
          <div className={styles.kpiSub}>
            {kpis.nombreCoproAvecImpayes > 0
              ? `${kpis.nombreCoproAvecImpayes} copro. concernee${kpis.nombreCoproAvecImpayes > 1 ? 's' : ''}`
              : 'Aucun impaye'}
          </div>
        </div>

        {/* Rapprochement */}
        <div className={`${styles.kpiCard} ${kpis.mouvementsNonRapprochesTotal > 0 ? styles.kpiWarning : styles.kpiSuccess}`}>
          <div className={styles.kpiHeader}>
            <p className={styles.kpiLabel}>Rapprochement</p>
            <div className={styles.kpiIcon}><ArrowLeftRight size={18} /></div>
          </div>
          <div className={styles.kpiValue}>{kpis.mouvementsNonRapprochesTotal}</div>
          <div className={styles.kpiSub}>mvts non rapproches</div>
        </div>
      </div>

      {/* Bottom Band — 3 columns */}
      <div className={styles.bottomBand}>
        {/* Actions Critiques */}
        <div className={styles.actionsPanel}>
          <h4 className={styles.actionsTitle}>
            <ClipboardList size={18} className={styles.actionsTitleIcon} />
            Actions Critiques
          </h4>
          <ul className={styles.actionsList}>
            {kpis.totalImpayes > 0 && (
              <li className={styles.actionItem}>
                <span className={`${styles.actionDot} ${styles.actionDotDanger}`} />
                <div>
                  <p className={styles.actionLabel}>{kpis.nombreCoproAvecImpayes} copro. avec impayes</p>
                  <p className={styles.actionSub}>Montant total: {formatMontant(kpis.totalImpayes)}&euro;</p>
                </div>
              </li>
            )}
            {kpis.totalFacturesRetard > 0 && (
              <li className={styles.actionItem}>
                <span className={`${styles.actionDot} ${styles.actionDotWarning}`} />
                <div>
                  <p className={styles.actionLabel}>{kpis.totalFacturesRetard} factures en retard</p>
                  <p className={styles.actionSub}>{formatMontant(kpis.montantFacturesRetard)}&euro; a traiter</p>
                </div>
              </li>
            )}
            {kpis.mouvementsNonRapprochesTotal > 0 && (
              <li className={styles.actionItem}>
                <span className={`${styles.actionDot} ${styles.actionDotInfo}`} />
                <div>
                  <p className={styles.actionLabel}>{kpis.mouvementsNonRapprochesTotal} mouvements non rapproches</p>
                  <p className={styles.actionSub}>{kpis.coproNonRapprochees} copro. en attente</p>
                </div>
              </li>
            )}
            {kpis.budgetsARisque > 0 && (
              <li className={styles.actionItem}>
                <span className={`${styles.actionDot} ${styles.actionDotWarning}`} />
                <div>
                  <p className={styles.actionLabel}>{kpis.budgetsARisque} budget(s) a risque</p>
                  <p className={styles.actionSub}>{((kpis.budgetGlobalConsomme / kpis.budgetGlobalTotal) * 100).toFixed(0)}% consomme</p>
                </div>
              </li>
            )}
          </ul>
          <button className={styles.actionsBtn} type="button">Voir tout le flux</button>
        </div>

        {/* Maintenance */}
        <div className={styles.maintenanceCard}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <Wrench size={28} className={styles.maintenanceIcon} />
            <h4 className={styles.maintenanceTitle}>Maintenance</h4>
            <p className={styles.maintenanceSub}>
              {kpis.totalFacturesRetard} intervention{kpis.totalFacturesRetard > 1 ? 's' : ''} en cours sur l&apos;ensemble du parc immobilier.
            </p>
            <div className={styles.maintenanceAvatars}>
              <div className={styles.maintenanceAvatar} style={{ background: 'rgba(173, 198, 255, 0.2)', color: '#adc6ff' }}>JD</div>
              <div className={styles.maintenanceAvatar} style={{ background: 'rgba(255, 183, 134, 0.2)', color: '#ffb786' }}>ML</div>
              <div className={styles.maintenanceAvatar} style={{ background: '#33343b', color: '#94a3b8' }}>+4</div>
            </div>
          </div>
          <Wrench size={64} className={styles.maintenanceBg} />
        </div>

        {/* Prochaines AG */}
        <div className={styles.agCard}>
          <div className={styles.agCardHeader}>
            <h4 className={styles.agCardTitle}>Prochaines AG</h4>
            <Calendar size={18} className={styles.agCardIcon} />
          </div>
          <div className={styles.agList}>
            {prochaines.map((copro, i) => (
              <div key={copro.id} className={styles.agListItem}>
                <span className={styles.agListName}>{copro.nom}</span>
                <span className={`${styles.agListDate} ${i === 0 ? styles.agListDateSoon : styles.agListDateLater}`}>
                  {formatDate(copro.prochaineAG!)}
                </span>
              </div>
            ))}
            {prochaines.length === 0 && (
              <p style={{ fontSize: 12, color: '#64748b' }}>Aucune AG programmee</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
