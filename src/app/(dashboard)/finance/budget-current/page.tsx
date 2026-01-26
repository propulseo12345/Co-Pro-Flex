'use client';

import { MOCK_BUDGETS, MOCK_EXERCICE_ACTUEL } from '@/data/mock';
import { Download, PieChart } from 'lucide-react';
import styles from './budget-current.module.css';

export default function CurrentBudgetPage() {
    const totalBudget = MOCK_BUDGETS.reduce((sum, b) => sum + b.montantN, 0);
    const totalRealise = MOCK_BUDGETS.reduce((sum, b) => sum + b.montantN1, 0); // Using N-1 as "Realized" mock for now, or I should add a "Realized N" field. 
    // Let's assume N1 is realized for demo purposes or add a random factor.
    // Actually, let's just use N1 as "Realized so far" for the demo.

    const percentage = Math.round((totalRealise / totalBudget) * 100);

    return (
        <div className="container">
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Suivi du budget courant {MOCK_EXERCICE_ACTUEL.annee}</h1>
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
                    {MOCK_BUDGETS.map((budget) => {
                        const percent = Math.min(100, Math.round((budget.montantN1 / budget.montantN) * 100));
                        return (
                            <div key={budget.id} className={styles.item}>
                                <div className={styles.itemHeader}>
                                    <span className={styles.poste}>{budget.poste}</span>
                                    <span className={styles.values}>
                                        {budget.montantN1.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} / {budget.montantN.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
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
                    })}
                </div>
            </div>
        </div>
    );
}
