'use client';

import { formatCurrency } from '@/hooks/modules/useExpenses';
import styles from './Expenses.module.css';

interface ExpensesSummaryProps {
    totalCharges: number;
    nombreLignes: number;
    totalProduits: number;
    nombreProduits: number;
    resultat: number;
    totalRecuperable: number;
}

export function ExpensesSummary({
    totalCharges, nombreLignes, totalProduits, nombreProduits, resultat, totalRecuperable
}: ExpensesSummaryProps) {
    return (
        <div className={styles.summaryGrid}>
            <div className={`${styles.summaryCard} ${styles.summaryCardCharges}`}>
                <div className={styles.summaryLabel}>Total Charges (Classe 6)</div>
                <div className={styles.summaryValue}>{formatCurrency(totalCharges)}</div>
                <div className={styles.summaryDetail}>{nombreLignes} écritures</div>
            </div>
            <div className={`${styles.summaryCard} ${styles.summaryCardProduits}`}>
                <div className={styles.summaryLabel}>Total Produits (Classe 7)</div>
                <div className={styles.summaryValue}>{formatCurrency(totalProduits)}</div>
                <div className={styles.summaryDetail}>{nombreProduits} écriture{nombreProduits > 1 ? 's' : ''}</div>
            </div>
            <div className={`${styles.summaryCard} ${resultat >= 0 ? styles.summaryCardPositive : styles.summaryCardNegative}`}>
                <div className={styles.summaryLabel}>Résultat</div>
                <div className={styles.summaryValue}>
                    {resultat >= 0 ? '+' : ''}{formatCurrency(resultat)}
                </div>
                <div className={styles.summaryDetail}>{resultat >= 0 ? 'Excédent' : 'Déficit'}</div>
            </div>
            <div className={styles.summaryCard}>
                <div className={styles.summaryLabel}>Charges récupérables</div>
                <div className={styles.summaryValue}>{formatCurrency(totalRecuperable)}</div>
                <div className={styles.summaryDetail}>Sur locataires</div>
            </div>
        </div>
    );
}
