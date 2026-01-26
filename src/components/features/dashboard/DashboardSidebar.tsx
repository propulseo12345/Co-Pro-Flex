'use client';

import Link from 'next/link';
import { CalendarClock, Wallet, TrendingUp, TrendingDown, CheckCircle, ChevronDown, Shield, AlertCircle, AlertTriangle, Clock } from 'lucide-react';
import { MOCK_CONTRATS_DETAILLES } from '@/data/mock';
import styles from '../../../app/(dashboard)/dashboard/dashboard.module.css';

interface Deadline { id: number; title: string; date: string; category: string; urgent: boolean; daysLeft: number; }
interface Coproprietaire { id: number; nom: string; solde: number; email: string; lots: number; }
interface Activity { id: number; text: string; date: string; type: string; }

interface DashboardSidebarProps {
  deadlines: Deadline[];
  coproprietaires: Coproprietaire[];
  activities: Activity[];
  showAllCopros: boolean;
  showAllActivities: boolean;
  onToggleCopros: () => void;
  onToggleActivities: () => void;
}

export function DashboardSidebar({ deadlines, coproprietaires, activities, showAllCopros, showAllActivities, onToggleCopros, onToggleActivities }: DashboardSidebarProps) {
  const visibleCopros = showAllCopros ? coproprietaires : coproprietaires.slice(0, 3);
  const visibleActivities = showAllActivities ? activities : activities.slice(0, 2);
  const totalDu = coproprietaires.reduce((sum, c) => sum + Math.abs(Math.min(c.solde, 0)), 0);

  const contratsASurveiller = MOCK_CONTRATS_DETAILLES.filter(c => c.statut === 'ACTIF' || c.statut === 'A_RENOUVELER').map(c => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dateFin = new Date(c.dateFin); dateFin.setHours(0, 0, 0, 0);
    const joursRestants = Math.ceil((dateFin.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const delai = c.delaiResiliation || 60;
    const estExpire = joursRestants < 0;
    const estUrgent = estExpire || (joursRestants >= 0 && joursRestants <= delai);
    const estAssurance = c.type === 'ASSURANCE';
    return { ...c, joursRestants, estUrgent, estExpire, estAssurance };
  }).filter(c => c.joursRestants < 0 || c.joursRestants <= 90).sort((a, b) => a.joursRestants - b.joursRestants).slice(0, 6);

  return (
    <div className={styles.sidebar}>
      <div className={`card ${styles.deadlinesWidget}`}>
        <div className={styles.widgetHeader}><h3 className={styles.widgetTitle}><CalendarClock size={16} aria-hidden="true" style={{ marginRight: '8px', verticalAlign: 'middle' }} />Échéances</h3></div>
        <div>{deadlines.map((d) => (<div key={d.id} className={styles.deadlineItem}><span className={`${styles.deadlineDate} ${d.urgent ? styles.urgent : ''}`}>{d.date}</span><div className={styles.deadlineInfo}><div className={styles.deadlineTitle}>{d.title}</div><div className={styles.deadlineCategory}>{d.category}</div></div></div>))}</div>
      </div>

      <div className={`card ${styles.financeSummaryCard}`}>
        <div className={styles.widgetHeader}><h3 className={styles.widgetTitle}><Wallet size={16} aria-hidden="true" style={{ marginRight: '8px', verticalAlign: 'middle' }} />Finance</h3><Link href="/finance" className={styles.widgetLink}>Détails</Link></div>
        <div className={styles.quickStatsRow}><div className={styles.quickStat}><div className={`${styles.quickStatValue} ${styles.positive}`}>10 533 €</div><div className={styles.quickStatLabel}>Disponible</div></div><div className={styles.quickStat}><div className={`${styles.quickStatValue} ${styles.negative}`}>1 572 €</div><div className={styles.quickStatLabel}>Impayés</div></div></div>
        <div className={styles.budgetProgress}><div className={styles.progressBar}><div className={styles.progressFill} style={{ width: '25%' }}></div></div><span className={styles.progressLabel}>25%</span></div>
        <div className={styles.budgetFooter}><span className={styles.budgetFooterText}>Budget consommé</span></div>
      </div>

      <div className={`card ${styles.sidebarCard}`}>
        <div className={styles.coproHeader}><div><h3 className={styles.widgetTitle}>Copropriétaires</h3><p className={styles.widgetSubtitle}>{coproprietaires.length} · {totalDu.toFixed(0)} € dû</p></div></div>
        <div className={styles.coproList}>
          {visibleCopros.map((copro) => (
            <div key={copro.id} className={styles.coproItem}>
              <div className={styles.coproAvatar}>{copro.nom.split(' ').map(n => n.charAt(0)).join('')}</div>
              <div className={styles.coproInfo}><div className={styles.coproName}>{copro.nom}</div><div className={styles.coproDetails}>{copro.lots} lot{copro.lots > 1 ? 's' : ''}</div></div>
              <div className={`${styles.coproSolde} ${copro.solde < 0 ? styles.soldeNegatif : copro.solde > 0 ? styles.soldePositif : styles.soldeNeutral}`}>
                {copro.solde < 0 && <TrendingDown size={14} aria-hidden="true" />}{copro.solde > 0 && <TrendingUp size={14} aria-hidden="true" />}{copro.solde === 0 && <CheckCircle size={14} aria-hidden="true" />}{Math.abs(copro.solde).toFixed(2)} €
              </div>
            </div>
          ))}
        </div>
        {coproprietaires.length > 3 && (<button className={`${styles.seeMoreBtn} ${showAllCopros ? styles.expanded : ''}`} onClick={onToggleCopros}><ChevronDown size={16} aria-hidden="true" />{showAllCopros ? 'Voir moins' : `Voir les ${coproprietaires.length - 3} autres`}</button>)}
        <Link href="/coproprietaires" className={styles.widgetFooterLink}>Gérer les copropriétaires</Link>
      </div>

      <div className={`card ${styles.sidebarCard}`}>
        <h3 className={styles.widgetTitle}>Activités récentes</h3>
        <div className={styles.activityList}>
          {visibleActivities.map((activity) => (<div key={activity.id} className={styles.activityItem}><div className={`${styles.activityDot} ${styles[`activity${activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}`]}`} /><div className={styles.activityContent}><p className={styles.activityText}>{activity.text}</p><p className={styles.activityDate}>{activity.date}</p></div></div>))}
        </div>
        {activities.length > 2 && (<button className={`${styles.seeMoreBtn} ${showAllActivities ? styles.expanded : ''}`} onClick={onToggleActivities}><ChevronDown size={16} aria-hidden="true" />{showAllActivities ? 'Voir moins' : 'Voir plus'}</button>)}
      </div>

      {contratsASurveiller.length > 0 && (
        <div className="card">
          <div className={styles.contractsWidgetHeader}><h3 className={styles.widgetTitle}><Shield size={18} aria-hidden="true" />Contrats à surveiller</h3><span className={`${styles.contractsCount} ${contratsASurveiller.some(c => c.estExpire) ? styles.contractsCountCritical : ''}`}>{contratsASurveiller.length}</span></div>
          <div className={styles.contractsList}>
            {contratsASurveiller.map((contrat) => (
              <Link key={contrat.id} href={`/maintenance/contracts/${contrat.id}`} className={`${styles.contractItem} ${contrat.estExpire ? styles.contractItemExpired : contrat.estUrgent ? styles.contractItemUrgent : ''}`}>
                <div className={styles.contractIcon}>{contrat.estExpire ? <AlertCircle size={16} aria-hidden="true" /> : contrat.estUrgent ? <AlertTriangle size={16} aria-hidden="true" /> : <Clock size={16} aria-hidden="true" />}</div>
                <div className={styles.contractInfo}><span className={styles.contractName}>{contrat.estAssurance && '🛡️ '}{contrat.nom}</span><span className={styles.contractMeta}>{contrat.fournisseur} · {contrat.estExpire ? `Expiré depuis ${Math.abs(contrat.joursRestants)}j` : `${contrat.joursRestants}j restants`}</span></div>
                {contrat.estExpire ? <span className={styles.contractBadgeExpired}>EXPIRÉ</span> : contrat.estUrgent ? <span className={styles.contractBadgeUrgent}>Urgent</span> : null}
              </Link>
            ))}
          </div>
          <Link href="/maintenance/contracts" className={styles.widgetFooterLink}>Voir tous les contrats</Link>
        </div>
      )}
    </div>
  );
}
