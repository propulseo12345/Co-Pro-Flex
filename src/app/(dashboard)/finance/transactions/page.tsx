'use client';

import { MOCK_MOUVEMENTS_BANCAIRES } from '@/data/mock';
import { Download, Search, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import styles from './transactions.module.css';
import clsx from 'clsx';

export default function TransactionsPage() {
    // Add some mock categorized transactions for display
    const allTransactions = [
        ...MOCK_MOUVEMENTS_BANCAIRES,
        { id: '4', date: '2025-11-15', libelle: 'PRLV URSSAF', montant: -450.00, statut: 'CATEGORISE', compteId: '431' },
        { id: '5', date: '2025-11-10', libelle: 'VIR MME MARTIN CHARGES T4', montant: 280.00, statut: 'CATEGORISE', compteId: '411' }
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="container">
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Suivi du compte bancaire</h1>
                    <p className={styles.subtitle}>
                        Historique de toutes les transactions sur le compte de la copropriété.
                    </p>
                </div>
                <div className={styles.actions}>
                    <button className="btn btn-secondary"><Download size={16} style={{ marginRight: 8 }} aria-hidden="true" /> Relevé bancaire</button>
                </div>
            </div>

            <div className={styles.balanceCard}>
                <div className={styles.balanceItem}>
                    <span className={styles.balanceLabel}>Solde actuel</span>
                    <span className={styles.balanceValue}>12 450,00 €</span>
                </div>
                <div className={styles.balanceItem}>
                    <span className={styles.balanceLabel}>Solde comptable</span>
                    <span className={styles.balanceValue}>12 450,00 €</span>
                </div>
            </div>

            <div className="card">
                <div className={styles.filters}>
                    <div className={styles.searchWrapper}>
                        <Search size={16} className={styles.searchIcon} aria-hidden="true" />
                        <input type="text" placeholder="Rechercher une transaction..." className={styles.searchInput} aria-label="Rechercher une transaction..."/>
                    </div>
                </div>

                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Libellé</th>
                            <th>Catégorie</th>
                            <th className="text-right">Montant</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allTransactions.map((tx) => (
                            <tr key={tx.id}>
                                <td className={styles.dateCell}>{new Date(tx.date).toLocaleDateString('fr-FR')}</td>
                                <td className={styles.libelleCell}>
                                    <div className={styles.iconWrapper}>
                                        {tx.montant > 0 ? (
                                            <ArrowDownLeft size={16} className="text-green-600" aria-hidden="true" />
                                        ) : (
                                            <ArrowUpRight size={16} className="text-red-600" aria-hidden="true" />
                                        )}
                                    </div>
                                    {tx.libelle}
                                </td>
                                <td>
                                    {tx.statut === 'A_CATEGORISER' ? (
                                        <span className={styles.uncategorized}>À catégoriser</span>
                                    ) : (
                                        <span className={styles.categorized}>Catégorisé</span>
                                    )}
                                </td>
                                <td className={clsx(styles.amount, tx.montant > 0 ? styles.positive : styles.negative)}>
                                    {tx.montant > 0 ? '+' : ''}{tx.montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
