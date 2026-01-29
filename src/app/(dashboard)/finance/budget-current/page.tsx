'use client';

import { useBudget } from '@/hooks/modules/useBudget';
import { Download, PieChart, Loader2 } from 'lucide-react';
import styles from './budget-current.module.css';

export default function CurrentBudgetPage() {
    const {
        postesBudget,
        totals,
        selectedYear,
        isLoading,
        error,
    } = useBudget();

    const totalBudget = totals.totalBudget;
    const totalRealise = totals.totalConsomme;
    const percentage = totalBudget > 0 ? Math.round((totalRealise / totalBudget) * 100) : 0;

    if (isLoading) {
        return (
            <div className="container">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '2rem' }}>
                    <Loader2 size={24} className="animate-spin" />
                    <span>Chargement du budget...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container">
                <div className="card" style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)' }}>
                    Erreur: {error}
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Suivi du budget courant {selectedYear}</h1>
                    <p className={styles.subtitle}>
                        État des dépenses par rapport au budget voté.
                    </p>
                </div>
                <div className={styles.actions}>
                    <button className="btn btn-secondary"><Download size={16} style={{ marginRight: 8 }} aria-hidden="true" /> Exporter</button>
                </div>
            </div>

            <div className={styles.summaryCard}>
                <div className={styles.chartContainer}>
                    <div className={styles.pieChart}>
                        <PieChart size={64} className={styles.chartIcon} aria-hidden="true" />
                        <span className={styles.percentage}>{percentage}%</span>
                    </div>
                    <div>
                        <h3>Consommation globale</h3>
                        <p className={styles.budgetFigures}>
                            <span className={styles.realise}>{totalRealise.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                            <span className={styles.separator}>/</span>
                            <span className={styles.total}>{totalBudget.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="card">
                <h2 className={styles.sectionTitle}>Détail par poste</h2>
                <div className={styles.list}>
                    {postesBudget.length === 0 ? (
                        <p style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                            Aucun poste budgétaire défini
                        </p>
                    ) : (
                        postesBudget.map((poste) => {
                            const percent = poste.budgetVote > 0
                                ? Math.min(100, Math.round((poste.consomme / poste.budgetVote) * 100))
                                : 0;
                            return (
                                <div key={poste.poste} className={styles.item}>
                                    <div className={styles.itemHeader}>
                                        <span className={styles.poste}>{poste.label}</span>
                                        <span className={styles.values}>
                                            {poste.consomme.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} / {poste.budgetVote.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                        </span>
                                    </div>
                                    <div className={styles.progressBarBg}>
                                        <div
                                            className={styles.progressBarFill}
                                            style={{ width: `${percent}%`, backgroundColor: percent > 100 ? '#EF4444' : '#10B981' }}
                                        />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
