'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DollarSign, TrendingUp, Receipt, AlertTriangle, CreditCard, ArrowLeftRight, PieChart, ChevronRight, ChevronDown, Clock, Calendar } from 'lucide-react';
import { getAllAlerts, Alert } from '@/lib/utils/alerts';
import { FinanceAnnexeStats } from '@/components/features/finance/FinanceAnnexeStats';
import styles from './finance.module.css';

export default function FinancePage() {
    const [showSecondary, setShowSecondary] = useState(false);

    const alerts = getAllAlerts();
    const criticalAlerts = alerts.filter(a => a.severity === 'error');
    const warningAlerts = alerts.filter(a => a.severity === 'warning');

    // Sections prioritaires (actions urgentes)
    const prioritySections = [
        {
            title: 'Impayés',
            description: '1 571,64 € · 3 copropriétaires en retard',
            icon: AlertTriangle,
            href: '/finance/unpaid',
            urgent: true,
            badge: 'Urgent'
        },
        {
            title: 'Mouvements bancaires',
            description: '2 mouvements à catégoriser',
            icon: ArrowLeftRight,
            href: '/finance/bank-movements',
            urgent: true,
            badge: 'À traiter'
        },
        {
            title: 'Appels de fonds',
            description: 'Appel Q4 à envoyer avant le 1er oct.',
            icon: CreditCard,
            href: '/finance/calls',
            urgent: false,
            badge: 'Cette semaine'
        },
        {
            title: 'Factures',
            description: '3 factures en attente de validation',
            icon: Receipt,
            href: '/finance/invoices',
            urgent: false,
            badge: 'À valider'
        }
    ];

    // Sections secondaires (gestion courante)
    const secondarySections = [
        {
            title: 'Budgets',
            description: 'Vue d\'ensemble des budgets',
            icon: DollarSign,
            href: '/finance/budgets'
        },
        {
            title: 'Budget fonctionnement',
            description: 'Budget de fonctionnement courant · 25% consommé',
            icon: TrendingUp,
            href: '/finance/budget-current'
        },
        {
            title: 'Budget travaux',
            description: 'Budget des travaux',
            icon: TrendingUp,
            href: '/finance/budget-works'
        },
        {
            title: 'Tantièmes et clés de répartition',
            description: 'Gérez la répartition des charges',
            icon: PieChart,
            href: '/finance/tantiemes'
        }
    ];

    // Deadlines proches
    const deadlinesCount = 2; // Appel de fonds + factures

    return (
        <div className="container">
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Finance & Comptabilité</h1>
                    <p className={styles.subtitle}>Gestion financière de la copropriété</p>
                </div>
                {deadlinesCount > 0 && (
                    <div className={styles.deadlineCounter}>
                        <Calendar size={16} aria-hidden="true" />
                        <span>{deadlinesCount} deadline{deadlinesCount > 1 ? 's' : ''} cette semaine</span>
                    </div>
                )}
            </div>

            <FinanceAnnexeStats />

            {/* Section Alertes */}
            {alerts.length > 0 && (
                <div className={styles.alertsSection}>
                    <h2 className={styles.alertsSectionTitle}>
                        <AlertTriangle size={20} aria-hidden="true" />
                        Alertes en cours ({alerts.length})
                    </h2>

                    {criticalAlerts.length > 0 && (
                        <div className={styles.alertGroup}>
                            <h3 className={styles.alertGroupTitle}>
                                <span className={styles.alertDotError}></span>
                                Critiques ({criticalAlerts.length})
                            </h3>
                            <div className={styles.alertCards}>
                                {criticalAlerts.map(alert => (
                                    <Link key={alert.id}
                                        href={alert.link}
                                        className={`${styles.alertCard} ${styles.alertCardError}`} aria-hidden="true">
                                        <div className={styles.alertCardContent}>
                                            <span className={styles.alertCardTitle}>{alert.title}</span>
                                            <span className={styles.alertCardMessage}>{alert.message}</span>
                                        </div>
                                        <ChevronRight size={20} className={styles.alertCardArrow} aria-hidden="true" />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {warningAlerts.length > 0 && (
                        <div className={styles.alertGroup}>
                            <h3 className={styles.alertGroupTitle}>
                                <span className={styles.alertDotWarning}></span>
                                Attention ({warningAlerts.length})
                            </h3>
                            <div className={styles.alertCards}>
                                {warningAlerts.map(alert => (
                                    <Link key={alert.id}
                                        href={alert.link}
                                        className={`${styles.alertCard} ${styles.alertCardWarning}`} aria-hidden="true">
                                        <div className={styles.alertCardContent}>
                                            <span className={styles.alertCardTitle}>{alert.title}</span>
                                            <span className={styles.alertCardMessage}>{alert.message}</span>
                                        </div>
                                        <ChevronRight size={20} className={styles.alertCardArrow} aria-hidden="true" />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Section Prioritaire - Actions urgentes */}
            <div className={styles.prioritySection}>
                <h2 className={styles.prioritySectionTitle}>
                    <Clock size={20} aria-hidden="true" />
                    Actions prioritaires
                </h2>
                <div className={styles.priorityGrid}>
                    {prioritySections.map((section, idx) => {
                        const Icon = section.icon;
                        return (
                            <Link key={idx} href={section.href} className={`${styles.priorityCard} ${section.urgent ? styles.priorityCardUrgent : ''}`}>
                                <div className={styles.priorityCardHeader}>
                                    <div className={`${styles.priorityIconWrapper} ${section.urgent ? styles.iconUrgent : styles.iconWarning}`}>
                                        <Icon size={24} aria-hidden="true" />
                                    </div>
                                    {section.badge && (
                                        <span className={`${styles.priorityBadge} ${section.urgent ? styles.badgeUrgent : styles.badgeWeek}`}>
                                            {section.badge}
                                        </span>
                                    )}
                                </div>
                                <h3 className={styles.priorityCardTitle}>{section.title}</h3>
                                <p className={styles.priorityCardDesc}>{section.description}</p>
                                <ChevronRight size={18} className={styles.priorityCardArrow} aria-hidden="true" />
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Toggle sections secondaires */}
            <button
                className={`${styles.toggleSecondary} ${showSecondary ? styles.expanded : ''}`}
                onClick={() => setShowSecondary(!showSecondary)}
            >
                <ChevronDown size={18} aria-hidden="true" />
                {showSecondary ? 'Masquer la gestion courante' : `Afficher la gestion courante (${secondarySections.length} sections)`}
            </button>

            {/* Sections secondaires */}
            <div className={`${styles.secondarySection} ${!showSecondary ? styles.collapsed : ''}`}>
                <div className={styles.grid}>
                    {secondarySections.map((section, idx) => {
                        const Icon = section.icon;
                        return (
                            <Link key={idx} href={section.href} className={styles.card} aria-hidden="true">
                                <div className={styles.iconWrapper}>
                                    <Icon size={32} aria-hidden="true" />
                                </div>
                                <h2 className={styles.cardTitle}>{section.title}</h2>
                                <p className={styles.cardDesc}>{section.description}</p>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
