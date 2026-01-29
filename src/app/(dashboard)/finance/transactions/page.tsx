'use client';

import { useState, useMemo } from 'react';
import { useBankMovements } from '@/hooks/modules/useFinanceData';
import { Download, Search, ArrowUpRight, ArrowDownLeft, Loader2 } from 'lucide-react';
import styles from './transactions.module.css';
import clsx from 'clsx';

export default function TransactionsPage() {
    const { data: movements, isLoading, error } = useBankMovements();
    const [searchTerm, setSearchTerm] = useState('');

    // Filter and sort transactions
    const filteredTransactions = useMemo(() => {
        if (!movements) return [];
        return movements
            .filter(tx =>
                tx.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                tx.bank_ref?.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => new Date(b.bank_date).getTime() - new Date(a.bank_date).getTime());
    }, [movements, searchTerm]);

    // Calculate balances
    const { soldeActuel, soldeComptable } = useMemo(() => {
        if (!movements) return { soldeActuel: 0, soldeComptable: 0 };

        const total = movements.reduce((sum, tx) => sum + tx.amount_signed, 0);
        const matchedTotal = movements
            .filter(tx => tx.status === 'matched')
            .reduce((sum, tx) => sum + tx.amount_signed, 0);

        return {
            soldeActuel: total,
            soldeComptable: matchedTotal,
        };
    }, [movements]);

    if (isLoading) {
        return (
            <div className="container">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '2rem' }}>
                    <Loader2 size={24} className="animate-spin" />
                    <span>Chargement des transactions...</span>
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
                    <span className={styles.balanceValue}>{soldeActuel.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                </div>
                <div className={styles.balanceItem}>
                    <span className={styles.balanceLabel}>Solde comptable</span>
                    <span className={styles.balanceValue}>{soldeComptable.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                </div>
            </div>

            <div className="card">
                <div className={styles.filters}>
                    <div className={styles.searchWrapper}>
                        <Search size={16} className={styles.searchIcon} aria-hidden="true" />
                        <input
                            type="text"
                            placeholder="Rechercher une transaction..."
                            className={styles.searchInput}
                            aria-label="Rechercher une transaction..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Libellé</th>
                            <th>Statut</th>
                            <th className="text-right">Montant</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransactions.length === 0 ? (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                                    {movements?.length === 0 ? 'Aucune transaction' : 'Aucun résultat'}
                                </td>
                            </tr>
                        ) : (
                            filteredTransactions.map((tx) => (
                                <tr key={tx.id}>
                                    <td className={styles.dateCell}>{new Date(tx.bank_date).toLocaleDateString('fr-FR')}</td>
                                    <td className={styles.libelleCell}>
                                        <div className={styles.iconWrapper}>
                                            {tx.direction === 'credit' ? (
                                                <ArrowDownLeft size={16} className="text-green-600" aria-hidden="true" />
                                            ) : (
                                                <ArrowUpRight size={16} className="text-red-600" aria-hidden="true" />
                                            )}
                                        </div>
                                        {tx.label}
                                    </td>
                                    <td>
                                        {tx.status === 'unmatched' ? (
                                            <span className={styles.uncategorized}>Non rapproché</span>
                                        ) : tx.status === 'matched' ? (
                                            <span className={styles.categorized}>Rapproché</span>
                                        ) : (
                                            <span className={styles.ignored}>Ignoré</span>
                                        )}
                                    </td>
                                    <td className={clsx(styles.amount, tx.direction === 'credit' ? styles.positive : styles.negative)}>
                                        {tx.direction === 'credit' ? '+' : '-'}{tx.amount_abs.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
