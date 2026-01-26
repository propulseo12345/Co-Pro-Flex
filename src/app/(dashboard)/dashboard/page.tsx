'use client';

import Link from 'next/link';
import { Bell, CalendarClock, Clock } from 'lucide-react';
import { useDashboardPage } from '@/hooks/modules/useDashboardPage';
import { DashboardKpis, DashboardAlerts, DashboardTasks, DashboardSidebar } from '@/components/features/dashboard';
import {
  DASHBOARD_KPIS,
  DASHBOARD_TASKS,
  DASHBOARD_COPROPRIETAIRES,
  DASHBOARD_ACTIVITIES,
  DASHBOARD_QUICK_ACTIONS,
  DASHBOARD_DEADLINES,
} from '@/data/mock/dashboard.mock';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const {
    showSecondaryTasks,
    setShowSecondaryTasks,
    showAllCopros,
    setShowAllCopros,
    showAllActivities,
    setShowAllActivities,
    activeAlerts,
    handleDismissAlert,
    handleBellClick,
  } = useDashboardPage();

  const urgentDeadlinesCount = DASHBOARD_DEADLINES.filter(d => d.daysLeft <= 7).length;
  const thisWeekCount = DASHBOARD_TASKS.filter(t => t.dueDate === 'Aujourd\'hui' || t.dueDate === 'Cette semaine' || t.dueDate?.includes('oct.')).length;

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.dashboardHeader}>
        <div>
          <h1 className={styles.title}>Tableau de bord</h1>
          <p className={styles.subtitle}>
            Vue d'ensemble de votre copropriété · Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
          </p>
        </div>
        <div className={styles.headerActions}>
          {urgentDeadlinesCount > 0 && (
            <div className={styles.deadlineCounterBadge}>
              <CalendarClock size={16} aria-hidden="true" />
              <span>{urgentDeadlinesCount} deadline{urgentDeadlinesCount > 1 ? 's' : ''} proche{urgentDeadlinesCount > 1 ? 's' : ''}</span>
            </div>
          )}
          {thisWeekCount > 0 && (
            <div className={styles.weekBadge}>
              <Clock size={16} aria-hidden="true" />
              <span>{thisWeekCount} à faire cette semaine</span>
            </div>
          )}
          <button className="btn btn-secondary" aria-label="Notifications" onClick={handleBellClick}>
            <Bell size={18} aria-hidden="true" />
            <span className={styles.notifBadge}>3</span>
          </button>
          <Link href="/settings" className="btn btn-secondary">Paramètres</Link>
        </div>
      </div>

      <DashboardKpis kpis={DASHBOARD_KPIS} />

      <DashboardAlerts alerts={activeAlerts} onDismiss={handleDismissAlert} />

      <div className={styles.quickActionsBar}>
        <h3 className={styles.quickActionsTitle}>Actions rapides</h3>
        <div className={styles.quickActions}>
          {DASHBOARD_QUICK_ACTIONS.map((action, idx) => {
            const Icon = action.icon;
            return (
              <Link key={idx} href={action.href} className={styles.quickActionBtn} aria-hidden="true">
                <Icon size={18} aria-hidden="true" />
                <span>{action.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className={styles.layout}>
        <DashboardTasks
          tasks={DASHBOARD_TASKS}
          showSecondaryTasks={showSecondaryTasks}
          onToggleSecondary={() => setShowSecondaryTasks(!showSecondaryTasks)}
        />

        <DashboardSidebar
          deadlines={DASHBOARD_DEADLINES}
          coproprietaires={DASHBOARD_COPROPRIETAIRES}
          activities={DASHBOARD_ACTIVITIES}
          showAllCopros={showAllCopros}
          showAllActivities={showAllActivities}
          onToggleCopros={() => setShowAllCopros(!showAllCopros)}
          onToggleActivities={() => setShowAllActivities(!showAllActivities)}
        />
      </div>
    </div>
  );
}
