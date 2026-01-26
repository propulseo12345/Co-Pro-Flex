'use client';

import { BarChart3, TrendingUp, PieChart, Download, Calendar } from 'lucide-react';
import styles from './analytics.module.css';
import Link from 'next/link';

export default function AnalyticsPage() {
    return (
        <div className="container">
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Tableau de bord analytique</h1>
                    <p className={styles.subtitle}>
                        Vue d'ensemble des indicateurs clés de la copropriété
                    </p>
                </div>
                <button className="btn btn-primary">
                    <Download size={16} style={{ marginRight: 8 }} aria-hidden="true" />
                    Exporter rapport
                </button>
            </div>

            <div className={styles.periodSelector}>
                <button className="btn btn-secondary btn-sm">Mois</button>
                <button className="btn btn-primary btn-sm">Trimestre</button>
                <button className="btn btn-secondary btn-sm">Année</button>
                <button className="btn btn-secondary btn-sm">
                    <Calendar size={14} style={{ marginRight: 4 }} aria-hidden="true" />
                    Personnalisé
                </button>
            </div>

            <div className={styles.metricsGrid}>
                <div className={styles.metricCard}>
                    <div className={styles.metricHeader}>
                        <span className={styles.metricLabel}>Trésorerie</span>
                        <TrendingUp size={20} className={styles.iconSuccess} aria-hidden="true" />
                    </div>
                    <div className={styles.metricValue}>45 280 €</div>
                    <div className={styles.metricChange}>
                        <span className={styles.changePositive}>+12.5%</span>
                        <span className={styles.changeLabel}>vs mois dernier</span>
                    </div>
                </div>

                <div className={styles.metricCard}>
                    <div className={styles.metricHeader}>
                        <span className={styles.metricLabel}>Taux de recouvrement</span>
                        <PieChart size={20} className={styles.iconPrimary} aria-hidden="true" />
                    </div>
                    <div className={styles.metricValue}>94.2%</div>
                    <div className={styles.metricChange}>
                        <span className={styles.changePositive}>+2.1%</span>
                        <span className={styles.changeLabel}>vs mois dernier</span>
                    </div>
                </div>

                <div className={styles.metricCard}>
                    <div className={styles.metricHeader}>
                        <span className={styles.metricLabel}>Impayés</span>
                        <BarChart3 size={20} className={styles.iconError} aria-hidden="true" />
                    </div>
                    <div className={styles.metricValue}>7 600 €</div>
                    <div className={styles.metricChange}>
                        <span className={styles.changeNegative}>-5.3%</span>
                        <span className={styles.changeLabel}>vs mois dernier</span>
                    </div>
                </div>

                <div className={styles.metricCard}>
                    <div className={styles.metricHeader}>
                        <span className={styles.metricLabel}>Dépenses</span>
                        <TrendingUp size={20} className={styles.iconWarning} aria-hidden="true" />
                    </div>
                    <div className={styles.metricValue}>32 150 €</div>
                    <div className={styles.metricChange}>
                        <span className={styles.changeNegative}>+8.7%</span>
                        <span className={styles.changeLabel}>vs mois dernier</span>
                    </div>
                </div>
            </div>

            <div className={styles.chartsGrid}>
                <div className="card">
                    <h3 className={styles.chartTitle}>Évolution trésorerie</h3>
                    <div className={styles.chartPlaceholder}>
                        <BarChart3 size={48} aria-hidden="true" />
                        <p>Graphique d'évolution de la trésorerie</p>
                    </div>
                </div>

                <div className="card">
                    <h3 className={styles.chartTitle}>Répartition des dépenses</h3>
                    <div className={styles.chartPlaceholder}>
                        <PieChart size={48} aria-hidden="true" />
                        <p>Graphique de répartition par catégorie</p>
                    </div>
                </div>
            </div>

            <div className="card">
                <h3 className={styles.chartTitle}>Indicateurs mensuels</h3>
                <div className={styles.chartPlaceholder + ' ' + styles.chartLarge}>
                    <TrendingUp size={48} aria-hidden="true" />
                    <p>Graphique d'évolution des indicateurs clés</p>
                </div>
            </div>

            <div className={styles.quickLinks}>
                <h2 className={styles.quickLinksTitle}>Rapports disponibles</h2>
                <div className={styles.linksGrid}>
                    <Link href="/analytics/reports/financial" className={styles.linkCard}>
                        <BarChart3 size={24} aria-hidden="true" />
                        <div>
                            <div className={styles.linkTitle}>Rapport financier</div>
                            <div className={styles.linkDesc}>Analyse complète des finances</div>
                        </div>
                    </Link>
                    <Link href="/analytics/reports/technical" className={styles.linkCard}>
                        <PieChart size={24} aria-hidden="true" />
                        <div>
                            <div className={styles.linkTitle}>Rapport technique</div>
                            <div className={styles.linkDesc}>État du patrimoine</div>
                        </div>
                    </Link>
                    <Link href="/analytics/reports/custom" className={styles.linkCard}>
                        <TrendingUp size={24} aria-hidden="true" />
                        <div>
                            <div className={styles.linkTitle}>Rapport personnalisé</div>
                            <div className={styles.linkDesc}>Créer un rapport sur mesure</div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
