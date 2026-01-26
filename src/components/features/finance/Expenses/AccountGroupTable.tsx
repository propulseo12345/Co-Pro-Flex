'use client';

import { Info, CheckCircle, Clock } from 'lucide-react';
import { DepenseEtendue } from '@/data/mock';
import { getCompteLibelle, getCompteDetails } from '@/lib/constants/plan-comptable';
import { formatCurrency } from '@/hooks/modules/useExpenses';
import styles from './Expenses.module.css';

interface AccountGroupTableProps {
    accountId: string;
    expenses: DepenseEtendue[];
    variant?: 'charges' | 'produits';
}

function getStatutBadge(statut?: string) {
    switch (statut) {
        case 'VALIDEE':
            return <span className={styles.badgeValidee}><CheckCircle size={12} /> Validée</span>;
        case 'EN_ATTENTE_VALIDATION':
            return <span className={styles.badgeEnAttente}><Clock size={12} /> En attente</span>;
        default:
            return <span className={styles.badgeNonValidee}>Non validée</span>;
    }
}

export function AccountGroupTable({ accountId, expenses, variant = 'charges' }: AccountGroupTableProps) {
    const accountName = getCompteLibelle(accountId);
    const accountDetails = getCompteDetails(accountId);
    const total = variant === 'produits'
        ? Math.abs(expenses.reduce((sum, e) => sum + e.montant, 0))
        : expenses.reduce((sum, e) => sum + e.montant, 0);
    const totalRecup = expenses.reduce((sum, e) => sum + e.recuperable, 0);
    const totalDeduc = expenses.reduce((sum, e) => sum + e.deductible, 0);

    if (variant === 'produits') {
        return (
            <div className={styles.accountGroup}>
                <h3 className={`${styles.accountTitle} ${styles.accountTitleProduits}`}>
                    {accountId} - {accountName}
                    {accountDetails?.description && (
                        <span className={styles.accountTooltip} title={accountDetails.description}><Info size={14} aria-hidden="true" /></span>
                    )}
                    <span className={styles.accountCount}>{expenses.length} écriture{expenses.length > 1 ? 's' : ''}</span>
                </h3>
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
                        {expenses.map(item => (
                            <tr key={item.id}>
                                <td className={styles.dateCell}>{new Date(item.date).toLocaleDateString('fr-FR')}</td>
                                <td>
                                    <div className={styles.expenseLabel}>
                                        <span className={styles.fournisseur}>{item.fournisseur}</span>
                                        <span className={styles.libelle}>{item.libelle}</span>
                                    </div>
                                </td>
                                <td>{getStatutBadge(item.statut)}</td>
                                <td className={`${styles.amount} ${styles.amountPositive}`}>+{formatCurrency(Math.abs(item.montant))}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className={styles.totalRow}>
                            <td colSpan={3}>Total {accountId} - {accountName}</td>
                            <td className={`${styles.amount} ${styles.amountPositive}`}>+{formatCurrency(total)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        );
    }

    return (
        <div className={styles.accountGroup}>
            <h3 className={styles.accountTitle}>
                {accountId} - {accountName}
                {accountDetails?.description && (
                    <span className={styles.accountTooltip} title={accountDetails.description}><Info size={14} aria-hidden="true" /></span>
                )}
                <span className={styles.accountCount}>{expenses.length} facture{expenses.length > 1 ? 's' : ''}</span>
            </h3>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Libellé</th>
                        <th>Statut</th>
                        <th className="text-right">Montant HT</th>
                        <th className="text-right">Taux TVA</th>
                        <th className="text-right">Montant TVA</th>
                        <th className="text-right">Montant TTC</th>
                        <th className="text-right">Récupérable</th>
                        <th className="text-right">Déductible</th>
                    </tr>
                </thead>
                <tbody>
                    {expenses.map(expense => (
                        <tr key={expense.id}>
                            <td className={styles.dateCell}>{new Date(expense.date).toLocaleDateString('fr-FR')}</td>
                            <td>
                                <div className={styles.expenseLabel}>
                                    <span className={styles.fournisseur}>{expense.fournisseur}</span>
                                    <span className={styles.libelle}>{expense.libelle}</span>
                                </div>
                            </td>
                            <td>{getStatutBadge(expense.statut)}</td>
                            <td className={styles.amount}>{expense.montantHT ? formatCurrency(expense.montantHT) : '-'}</td>
                            <td className={styles.amountTva}>{expense.tauxTVA !== undefined ? <span className={styles.tauxBadge}>{expense.tauxTVA}%</span> : '-'}</td>
                            <td className={styles.amount}>{expense.montantTVA !== undefined ? formatCurrency(expense.montantTVA) : '-'}</td>
                            <td className={styles.amount}>{formatCurrency(expense.montant)}</td>
                            <td className={styles.amount}>{formatCurrency(expense.recuperable)}</td>
                            <td className={styles.amount}>{formatCurrency(expense.deductible)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className={styles.totalRow}>
                        <td colSpan={3}>Total {accountId} - {accountName}</td>
                        <td className={styles.amount}>{formatCurrency(expenses.reduce((sum, e) => sum + (e.montantHT || 0), 0))}</td>
                        <td></td>
                        <td className={styles.amount}>{formatCurrency(expenses.reduce((sum, e) => sum + (e.montantTVA || 0), 0))}</td>
                        <td className={styles.amount}>{formatCurrency(total)}</td>
                        <td className={styles.amount}>{formatCurrency(totalRecup)}</td>
                        <td className={styles.amount}>{formatCurrency(totalDeduc)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}
