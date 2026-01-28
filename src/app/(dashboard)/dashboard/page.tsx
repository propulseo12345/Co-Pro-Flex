'use client';

import Link from 'next/link';
import {
  Wallet,
  AlertTriangle,
  Calendar,
  ChevronRight,
  FileText,
  DollarSign,
  Wrench,
  Users,
  CheckCircle2,
  RefreshCw,
  Inbox,
  AlertCircle,
} from 'lucide-react';
import styles from './dashboard.module.css';
import { getCurrentBusinessYear, formatDateFR } from '@/lib/time/period';
import { useDashboardData, type DashboardTodo, type DashboardActivity } from '@/hooks/modules/useDashboardData';
import { DASHBOARD_MAX_PRIORITIES, DASHBOARD_MAX_ACTIVITIES } from '@/lib/features/flags';

// ============================================================================
// TYPES
// ============================================================================

interface QuickAction {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number }>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BUSINESS_YEAR = getCurrentBusinessYear();

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Créer AG', href: '/ag/new', icon: Users },
  { label: 'Appel de fonds', href: '/finance/calls', icon: DollarSign },
  { label: 'Ajouter facture', href: '/finance/invoices', icon: FileText },
  { label: 'Ordre de service', href: '/maintenance/service-orders', icon: Wrench },
];

// ============================================================================
// HELPERS
// ============================================================================

function getPriorityIcon(priority: number): string {
  switch (priority) {
    case 1:
      return '🔴';
    case 2:
      return '🟠';
    case 3:
      return '🟡';
    default:
      return '🔵';
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'À l\'instant';
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return formatDateFR(date);
}

// ============================================================================
// SKELETON COMPONENTS
// ============================================================================

function MetricsSkeleton() {
  return (
    <section className={styles.metricsRow}>
      {[1, 2, 3].map((i) => (
        <div key={i} className={`${styles.metricCard} ${styles.skeleton} ${styles.skeletonMetric}`} />
      ))}
    </section>
  );
}

function PrioritiesSkeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <div key={i} className={`${styles.skeleton} ${styles.skeletonPriority}`} />
      ))}
    </>
  );
}

function ActivitySkeleton() {
  return (
    <div className={styles.activityList}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className={`${styles.skeleton} ${styles.skeletonActivity}`} />
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DashboardPage() {
  const { data, isLoading, isRefreshing, error, isEmpty, refresh } = useDashboardData();

  // Handle loading state
  if (isLoading) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Tableau de bord</h1>
          <p className={styles.subtitle}>Chargement...</p>
        </header>
        <MetricsSkeleton />
        <div className={styles.mainGrid}>
          <section className={styles.prioritiesSection}>
            <h2 className={styles.sectionTitle}>À faire maintenant</h2>
            <PrioritiesSkeleton />
          </section>
          <section className={styles.activitySection}>
            <h2 className={styles.sectionTitle}>Activité récente</h2>
            <ActivitySkeleton />
          </section>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Tableau de bord</h1>
        </header>
        <div className={styles.errorState}>
          <AlertCircle size={48} className={styles.errorIcon} />
          <p className={styles.errorText}>Erreur lors du chargement : {error}</p>
          <button onClick={refresh} className={styles.retryBtn}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // Handle empty state (no data at all)
  if (isEmpty || !data) {
    return (
      <div className={styles.container}>
        <header className={styles.headerActions}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>Tableau de bord</h1>
            <p className={styles.subtitle}>Exercice {BUSINESS_YEAR}</p>
          </div>
          <button onClick={refresh} disabled={isRefreshing} className={styles.refreshBtn}>
            <RefreshCw size={16} className={isRefreshing ? styles.spinning : ''} />
            Actualiser
          </button>
        </header>
        <div className={styles.emptyState}>
          <Inbox size={48} className={styles.emptyIcon} />
          <h2 className={styles.emptyTitle}>Bienvenue sur CoProFlex</h2>
          <p className={styles.emptySubtitle}>
            Commencez par créer une AG, un appel de fonds ou importer vos données.
          </p>
        </div>
        <section className={styles.shortcutsSection}>
          <h2 className={styles.sectionTitle}>Raccourcis</h2>
          <div className={styles.shortcutsGrid}>
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.label} href={action.href} className={styles.shortcutBtn}>
                  <Icon size={18} />
                  <span>{action.label}</span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  // Normal render with data
  const { kpis, todos, activities } = data;
  const displayedTodos = todos.slice(0, DASHBOARD_MAX_PRIORITIES);
  const displayedActivities = activities.slice(0, DASHBOARD_MAX_ACTIVITIES);
  const hasMoreTodos = todos.length > DASHBOARD_MAX_PRIORITIES;
  const hasTodos = todos.length > 0;
  const hasActivities = activities.length > 0;

  return (
    <div className={styles.container}>
      {/* Header with refresh */}
      <header className={styles.headerActions}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Tableau de bord</h1>
          <p className={styles.subtitle}>
            Exercice {BUSINESS_YEAR} — Mis à jour le {formatDateFR(new Date())}
          </p>
        </div>
        <button onClick={refresh} disabled={isRefreshing} className={styles.refreshBtn}>
          <RefreshCw size={16} className={isRefreshing ? styles.spinning : ''} />
          {isRefreshing ? 'Actualisation...' : 'Actualiser'}
        </button>
      </header>

      {/* KPI Cards */}
      <section className={styles.metricsRow}>
        {/* Solde global */}
        <Link href="/finance/treasury" className={styles.metricCard}>
          <div className={styles.metricIcon}>
            <Wallet size={20} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Solde global</span>
            <span className={styles.metricValue}>{formatCurrency(kpis.current_balance)}</span>
          </div>
        </Link>

        {/* Impayés */}
        <Link
          href="/finance/unpaid"
          className={`${styles.metricCard} ${kpis.unpaid_total > 0 ? styles.metricDanger : ''}`}
        >
          <div className={styles.metricIcon}>
            <AlertTriangle size={20} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Impayés en cours</span>
            <span className={styles.metricValue}>
              {kpis.unpaid_total > 0 ? formatCurrency(kpis.unpaid_total) : 'Aucun'}
            </span>
          </div>
          {kpis.unpaid_total > 0 && <AlertTriangle size={20} />}
        </Link>

        {/* Prochaine AG */}
        <Link href={kpis.next_ag_id ? `/ag/${kpis.next_ag_id}` : '/ag/dashboard'} className={styles.metricCard}>
          <div className={styles.metricIcon}>
            <Calendar size={20} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Prochaine AG</span>
            <span className={styles.metricValue}>
              {kpis.next_ag_date ? formatDateFR(kpis.next_ag_date) : 'Aucune prévue'}
            </span>
          </div>
        </Link>
      </section>

      {/* Main grid: Todos + Activity */}
      <div className={styles.mainGrid}>
        {/* Priorities / Todos */}
        <section className={styles.prioritiesSection}>
          <h2 className={styles.sectionTitle}>À faire maintenant</h2>

          {hasTodos ? (
            <>
              <ul className={styles.prioritiesList}>
                {displayedTodos.map((todo: DashboardTodo, index: number) => (
                  <li key={`${todo.todo_type}-${index}`}>
                    <Link href={todo.deep_link} className={styles.priorityItem}>
                      <span className={styles.priorityIcon}>{getPriorityIcon(todo.priority)}</span>
                      <span className={styles.priorityLabel}>{todo.label}</span>
                      <ChevronRight size={16} className={styles.priorityArrow} />
                    </Link>
                  </li>
                ))}
              </ul>
              {hasMoreTodos && (
                <Link href="/tasks" className={styles.viewAllLink}>
                  Voir toutes les tâches ({todos.length})
                </Link>
              )}
            </>
          ) : (
            <div className={styles.noPriorities}>
              <CheckCircle2 size={32} className={styles.checkIcon} />
              <p>Aucune action urgente. Tout est sous contrôle.</p>
            </div>
          )}
        </section>

        {/* Recent Activity */}
        <section className={styles.activitySection}>
          <h2 className={styles.sectionTitle}>Activité récente</h2>

          {hasActivities ? (
            <ul className={styles.activityList}>
              {displayedActivities.map((activity: DashboardActivity, index: number) => (
                <li key={`${activity.activity_type}-${index}`} className={styles.activityItem}>
                  <span className={styles.activityAction}>{activity.label}</span>
                  <span className={styles.activityTime}>{formatRelativeTime(activity.event_date)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.activityEmpty}>
              <p>Aucune activité récente</p>
            </div>
          )}
        </section>
      </div>

      {/* Quick Actions */}
      <section className={styles.shortcutsSection}>
        <h2 className={styles.sectionTitle}>Raccourcis</h2>
        <div className={styles.shortcutsGrid}>
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.label} href={action.href} className={styles.shortcutBtn}>
                <Icon size={18} />
                <span>{action.label}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
