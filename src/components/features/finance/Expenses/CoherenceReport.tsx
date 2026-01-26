'use client';

import { Link2, CheckCircle, XCircle } from 'lucide-react';
import { formatCurrency } from '@/hooks/modules/useExpenses';
import styles from './Expenses.module.css';

interface CoherencePoste {
    poste: string;
    label: string;
    budget: number;
    consomme: number;
    ecart: number;
    pourcentage: number;
    nbFactures: number;
}

interface CoherenceReportProps {
    show: boolean;
    onToggle: () => void;
    data: {
        budgetVote: number;
        totalConsomme: number;
        ecartTotal: number;
        pourcentageGlobal: number;
        consommeParPoste: CoherencePoste[];
        depensesSansPoste: { montant: number }[];
        isCoherent: boolean;
    };
}

export function CoherenceReport({ show, onToggle, data }: CoherenceReportProps) {
    return (
        <>
            <div className={styles.coherenceToggle}>
                <button className={`${styles.coherenceBtn} ${show ? styles.coherenceBtnActive : ''}`} onClick={onToggle}>
                    <Link2 size={16} />
                    Rapport de cohérence Budget / Dépenses
                    {data.isCoherent ? (
                        <span className={styles.coherenceStatusOk}><CheckCircle size={14} /> OK</span>
                    ) : (
                        <span className={styles.coherenceStatusError}><XCircle size={14} /> Écart détecté</span>
                    )}
                </button>
            </div>

            {show && (
                <div className={styles.coherenceReport}>
                    <h3 className={styles.coherenceTitle}><Link2 size={18} />Rapprochement Budget Prévisionnel / Dépenses Validées</h3>
                    <div className={styles.coherenceSummary}>
                        <div className={styles.coherenceBox}>
                            <span className={styles.coherenceBoxLabel}>Budget voté</span>
                            <span className={styles.coherenceBoxValue}>{formatCurrency(data.budgetVote)}</span>
                        </div>
                        <div className={styles.coherenceBox}>
                            <span className={styles.coherenceBoxLabel}>Consommé (validé)</span>
                            <span className={styles.coherenceBoxValue}>{formatCurrency(data.totalConsomme)}</span>
                        </div>
                        <div className={`${styles.coherenceBox} ${data.ecartTotal > 0 ? styles.coherenceBoxWarning : styles.coherenceBoxSuccess}`}>
                            <span className={styles.coherenceBoxLabel}>Écart</span>
                            <span className={styles.coherenceBoxValue}>{data.ecartTotal > 0 ? '+' : ''}{formatCurrency(data.ecartTotal)}</span>
                        </div>
                        <div className={styles.coherenceBox}>
                            <span className={styles.coherenceBoxLabel}>Consommation</span>
                            <span className={styles.coherenceBoxValue}>{data.pourcentageGlobal.toFixed(1)}%</span>
                        </div>
                    </div>

                    <table className={styles.coherenceTable}>
                        <thead>
                            <tr>
                                <th>Poste budgétaire</th>
                                <th className="text-right">Budget voté</th>
                                <th className="text-right">Consommé</th>
                                <th className="text-right">Écart</th>
                                <th className="text-right">%</th>
                                <th className="text-center">Factures</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.consommeParPoste.map(poste => (
                                <tr key={poste.poste} className={poste.pourcentage > 100 ? styles.coherenceRowWarning : ''}>
                                    <td>{poste.label}</td>
                                    <td className={styles.amount}>{formatCurrency(poste.budget)}</td>
                                    <td className={styles.amount}>{formatCurrency(poste.consomme)}</td>
                                    <td className={`${styles.amount} ${poste.ecart > 0 ? styles.amountNegative : styles.amountPositive}`}>
                                        {poste.ecart > 0 ? '+' : ''}{formatCurrency(poste.ecart)}
                                    </td>
                                    <td className={`${styles.amount} ${poste.pourcentage > 100 ? styles.amountNegative : ''}`}>{poste.pourcentage.toFixed(1)}%</td>
                                    <td className="text-center">{poste.nbFactures}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className={styles.coherenceTotalRow}>
                                <td><strong>TOTAL</strong></td>
                                <td className={styles.amount}><strong>{formatCurrency(data.budgetVote)}</strong></td>
                                <td className={styles.amount}><strong>{formatCurrency(data.totalConsomme)}</strong></td>
                                <td className={`${styles.amount} ${data.ecartTotal > 0 ? styles.amountNegative : styles.amountPositive}`}>
                                    <strong>{data.ecartTotal > 0 ? '+' : ''}{formatCurrency(data.ecartTotal)}</strong>
                                </td>
                                <td className={styles.amount}><strong>{data.pourcentageGlobal.toFixed(1)}%</strong></td>
                                <td className="text-center"><strong>{data.consommeParPoste.reduce((s, p) => s + p.nbFactures, 0)}</strong></td>
                            </tr>
                        </tfoot>
                    </table>

                    {data.depensesSansPoste.length > 0 && (
                        <div className={styles.alertError}>
                            <XCircle size={18} />
                            <div>
                                <strong>Dépenses non affectées à un poste budgétaire</strong>
                                <p>{data.depensesSansPoste.length} dépense(s) pour un total de {formatCurrency(data.depensesSansPoste.reduce((s, d) => s + d.montant, 0))} ne sont pas liées à un poste budgétaire.</p>
                            </div>
                        </div>
                    )}

                    {data.isCoherent && (
                        <div className={styles.alertSuccess}>
                            <CheckCircle size={18} />
                            <div>
                                <strong>Données cohérentes</strong>
                                <p>Toutes les dépenses validées sont correctement rattachées aux postes budgétaires.</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
