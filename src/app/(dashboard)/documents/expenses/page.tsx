'use client';

import { FileText, Download, AlertTriangle } from 'lucide-react';
import { useExpenses, formatCurrency } from '@/hooks/modules/useExpenses';
import {
    ExpensesSummary,
    ExpensesFilters,
    CoherenceReport,
    AccountGroupTable,
    TvaRecap,
    ResultatSection,
    SyntheseSection,
} from '@/components/features/finance/Expenses';
import styles from '@/components/features/finance/Expenses/Expenses.module.css';

const DONNEES_N1 = { totalRecuperable: 42000, nombreEcritures: 38 };

export default function ExpensesPage() {
    const {
        statutFilter, setStatutFilter,
        showCoherenceReport, setShowCoherenceReport,
        charges, filteredExpenses,
        expensesByAccount, produitsByAccount,
        accountIds, produitAccountIds,
        coherenceData, stats, hasDataWarning, exercice,
    } = useExpenses();

    return (
        <div className="container">
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Relevé général des dépenses</h1>
                    <p className={styles.subtitle}>
                        Exercice du {new Date(exercice.dateDebut).toLocaleDateString('fr-FR')} au {new Date(exercice.dateFin).toLocaleDateString('fr-FR')}
                    </p>
                </div>
                <div className={styles.actions}>
                    <button className="btn btn-secondary"><Download size={16} style={{ marginRight: 8 }} aria-hidden="true" /> Export Excel</button>
                    <button className="btn btn-secondary"><FileText size={16} style={{ marginRight: 8 }} aria-hidden="true" /> Export PDF</button>
                </div>
            </div>

            <ExpensesSummary
                totalCharges={stats.totalCharges}
                nombreLignes={stats.nombreLignes}
                totalProduits={stats.totalProduits}
                nombreProduits={stats.nombreProduits}
                resultat={stats.resultat}
                totalRecuperable={stats.totalRecuperable}
            />

            <CoherenceReport show={showCoherenceReport} onToggle={() => setShowCoherenceReport(!showCoherenceReport)} data={coherenceData} />

            {hasDataWarning && (
                <div className={styles.alertWarning}>
                    <AlertTriangle size={20} />
                    <div>
                        <strong>Données potentiellement incomplètes</strong>
                        <p>Seulement {charges.length} charges enregistrées pour l&apos;exercice. Vérifiez que toutes les factures payées ont bien été saisies.</p>
                    </div>
                </div>
            )}

            <ExpensesFilters
                statutFilter={statutFilter}
                setStatutFilter={setStatutFilter}
                nombreTotal={stats.nombreTotal}
                nbValidees={stats.nbValidees}
                nbEnAttente={stats.nbEnAttente}
                nbNonValidees={stats.nbNonValidees}
            />

            <div className="card">
                <h2 className={styles.sectionTitle}>
                    <span className={styles.sectionTitleBadge}>Classe 6</span>
                    Charges de l&apos;exercice
                    <span className={styles.sectionSubtitle}>{stats.nombreLignes} écriture{stats.nombreLignes > 1 ? 's' : ''} • {formatCurrency(stats.totalCharges)}</span>
                </h2>

                {accountIds.length === 0 ? (
                    <div className={styles.emptyState}>Aucune charge ne correspond aux critères sélectionnés.</div>
                ) : (
                    accountIds.map(accountId => (
                        <AccountGroupTable key={accountId} accountId={accountId} expenses={expensesByAccount[accountId]} variant="charges" />
                    ))
                )}

                {accountIds.length > 0 && (
                    <div className={styles.grandTotal}>
                        <table className={styles.table}>
                            <tfoot>
                                <tr className={styles.grandTotalRow}>
                                    <td colSpan={3}>TOTAL CHARGES (CLASSE 6)</td>
                                    <td className={styles.amount}>{formatCurrency(filteredExpenses.reduce((sum, e) => sum + (e.montantHT || 0), 0))}</td>
                                    <td></td>
                                    <td className={styles.amount}>{formatCurrency(filteredExpenses.reduce((sum, e) => sum + (e.montantTVA || 0), 0))}</td>
                                    <td className={styles.amount}>{formatCurrency(stats.totalCharges)}</td>
                                    <td className={styles.amount}>{formatCurrency(stats.totalRecuperable)}</td>
                                    <td className={styles.amount}>{formatCurrency(stats.totalDeductible)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}

                <TvaRecap
                    recapTVA={stats.recapTVA}
                    totalHT={stats.totalHT}
                    totalTVA={stats.totalTVA}
                    totalCharges={stats.totalCharges}
                    totalTVADeductible={stats.totalTVADeductible}
                    nombreEcritures={filteredExpenses.length}
                />
            </div>

            {produitAccountIds.length > 0 && (
                <div className="card" style={{ marginTop: '1.5rem' }}>
                    <h2 className={styles.sectionTitle}>
                        <span className={styles.sectionTitleBadgeProduits}>Classe 7</span>
                        Produits de l&apos;exercice
                        <span className={styles.sectionSubtitle}>{stats.nombreProduits} écriture{stats.nombreProduits > 1 ? 's' : ''} • {formatCurrency(stats.totalProduits)}</span>
                    </h2>

                    {produitAccountIds.map(accountId => (
                        <AccountGroupTable key={accountId} accountId={accountId} expenses={produitsByAccount[accountId]} variant="produits" />
                    ))}

                    <div className={styles.grandTotal}>
                        <table className={styles.table}>
                            <tfoot>
                                <tr className={`${styles.grandTotalRow} ${styles.grandTotalRowProduits}`}>
                                    <td colSpan={3}>TOTAL PRODUITS (CLASSE 7)</td>
                                    <td className={`${styles.amount} ${styles.amountPositive}`}>+{formatCurrency(stats.totalProduits)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            <ResultatSection totalProduits={stats.totalProduits} totalCharges={stats.totalCharges} resultat={stats.resultat} />

            <SyntheseSection stats={stats} donneesN1={DONNEES_N1} />
        </div>
    );
}
