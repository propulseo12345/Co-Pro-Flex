'use client';

import { Info } from 'lucide-react';
import { formatCurrency } from '@/hooks/modules/useExpenses';
import styles from './Expenses.module.css';

interface TvaLigne {
    taux: number;
    totalHT: number;
    totalTVA: number;
    totalTTC: number;
    nbEcritures: number;
    tvaDeductible: number;
}

interface TvaRecapProps {
    recapTVA: TvaLigne[];
    totalHT: number;
    totalTVA: number;
    totalCharges: number;
    totalTVADeductible: number;
    nombreEcritures: number;
}

export function TvaRecap({ recapTVA, totalHT, totalTVA, totalCharges, totalTVADeductible, nombreEcritures }: TvaRecapProps) {
    if (recapTVA.length === 0) return null;

    return (
        <div className={styles.tvaRecap}>
            <h3 className={styles.tvaRecapTitle}>Récapitulatif TVA par taux</h3>
            <table className={styles.tvaTable}>
                <thead>
                    <tr>
                        <th>Taux TVA</th>
                        <th className="text-right">Base HT</th>
                        <th className="text-right">Montant TVA</th>
                        <th className="text-right">Total TTC</th>
                        <th className="text-center">Nb écritures</th>
                        <th className="text-right">TVA déductible</th>
                    </tr>
                </thead>
                <tbody>
                    {recapTVA.map(ligne => (
                        <tr key={ligne.taux}>
                            <td>
                                <span className={`${styles.tauxBadge} ${ligne.taux === 0 ? styles.tauxExonere : ''}`}>
                                    {ligne.taux === 0 ? 'Exonéré' : `${ligne.taux}%`}
                                </span>
                            </td>
                            <td className={styles.amount}>{formatCurrency(ligne.totalHT)}</td>
                            <td className={styles.amount}>{formatCurrency(ligne.totalTVA)}</td>
                            <td className={styles.amount}>{formatCurrency(ligne.totalTTC)}</td>
                            <td className="text-center">{ligne.nbEcritures}</td>
                            <td className={styles.amount}>{ligne.tvaDeductible > 0 ? formatCurrency(ligne.tvaDeductible) : '-'}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className={styles.tvaTotalRow}>
                        <td><strong>TOTAL</strong></td>
                        <td className={styles.amount}><strong>{formatCurrency(totalHT)}</strong></td>
                        <td className={styles.amount}><strong>{formatCurrency(totalTVA)}</strong></td>
                        <td className={styles.amount}><strong>{formatCurrency(totalCharges)}</strong></td>
                        <td className="text-center"><strong>{nombreEcritures}</strong></td>
                        <td className={styles.amount}><strong>{formatCurrency(totalTVADeductible)}</strong></td>
                    </tr>
                </tfoot>
            </table>
            {totalTVADeductible > 0 && (
                <div className={styles.tvaNoteDeductible}>
                    <Info size={16} />
                    <span>TVA déductible totale : <strong>{formatCurrency(totalTVADeductible)}</strong> (sur un total TVA de {formatCurrency(totalTVA)})</span>
                </div>
            )}
        </div>
    );
}
