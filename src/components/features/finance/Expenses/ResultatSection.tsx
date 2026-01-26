'use client';

import { formatCurrency } from '@/hooks/modules/useExpenses';
import styles from './Expenses.module.css';

interface ResultatSectionProps {
    totalProduits: number;
    totalCharges: number;
    resultat: number;
}

export function ResultatSection({ totalProduits, totalCharges, resultat }: ResultatSectionProps) {
    return (
        <div className={`card ${styles.resultatCard}`} style={{ marginTop: '1.5rem' }}>
            <h2 className={styles.sectionTitle}>Résultat de l&apos;exercice</h2>
            <div className={styles.resultatGrid}>
                <div className={styles.resultatRow}>
                    <span>Total des produits (Classe 7)</span>
                    <span className={`${styles.amount} ${styles.amountPositive}`}>+{formatCurrency(totalProduits)}</span>
                </div>
                <div className={styles.resultatRow}>
                    <span>Total des charges (Classe 6)</span>
                    <span className={`${styles.amount} ${styles.amountNegative}`}>-{formatCurrency(totalCharges)}</span>
                </div>
                <div className={`${styles.resultatRow} ${styles.resultatFinal} ${resultat >= 0 ? styles.resultatPositif : styles.resultatNegatif}`}>
                    <span><strong>RÉSULTAT DE L&apos;EXERCICE</strong></span>
                    <span className={styles.amount}><strong>{resultat >= 0 ? '+' : ''}{formatCurrency(resultat)}</strong></span>
                </div>
            </div>
            <p className={styles.resultatNote}>
                {resultat >= 0
                    ? "L'excédent sera reporté sur l'exercice suivant ou redistribué aux copropriétaires selon décision de l'AG."
                    : "Le déficit devra être comblé par un appel de fonds complémentaire ou reporté sur l'exercice suivant."}
            </p>
        </div>
    );
}
