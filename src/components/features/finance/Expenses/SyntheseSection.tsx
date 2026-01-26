'use client';

import { PieChart, Users, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/hooks/modules/useExpenses';
import styles from './Expenses.module.css';

interface RepartitionItem {
    poste: string;
    label: string;
    montant: number;
    pourcentage: number;
    budget: number;
}

interface SyntheseSectionProps {
    stats: {
        moyenneParCoproprietaire: number;
        moyenneN1: number;
        tauxRecuperable: number;
        totalRecuperable: number;
        totalCharges: number;
        tauxConsommationBudget: number;
        ecartBudget: number;
        evolutionCharges: number;
        chargesN1: number;
        evolutionRecuperable: number;
        totalProduits: number;
        produitsN1: number;
        evolutionProduits: number;
        nombreLignes: number;
        nombreProduits: number;
        resultat: number;
        repartitionCharges: RepartitionItem[];
    };
    donneesN1: {
        totalRecuperable: number;
        nombreEcritures: number;
    };
}

export function SyntheseSection({ stats, donneesN1 }: SyntheseSectionProps) {
    return (
        <div className={`card ${styles.syntheseCard}`} style={{ marginTop: '1.5rem' }}>
            <h2 className={styles.sectionTitle}>
                <PieChart size={20} style={{ marginRight: '0.5rem' }} />
                Synthèse et indicateurs clés
            </h2>

            <div className={styles.kpiGrid}>
                <div className={styles.kpiCard}>
                    <div className={styles.kpiHeader}><Users size={18} /><span>Moyenne par copropriétaire</span></div>
                    <div className={styles.kpiValue}>{formatCurrency(stats.moyenneParCoproprietaire)}</div>
                    <div className={styles.kpiComparison}>
                        <span className={styles.kpiLabel}>N-1 : {formatCurrency(stats.moyenneN1)}</span>
                        {stats.moyenneParCoproprietaire > stats.moyenneN1 ? (
                            <span className={styles.kpiTrendUp}><TrendingUp size={14} />+{((stats.moyenneParCoproprietaire - stats.moyenneN1) / stats.moyenneN1 * 100).toFixed(1)}%</span>
                        ) : (
                            <span className={styles.kpiTrendDown}><TrendingDown size={14} />{((stats.moyenneParCoproprietaire - stats.moyenneN1) / stats.moyenneN1 * 100).toFixed(1)}%</span>
                        )}
                    </div>
                </div>

                <div className={styles.kpiCard}>
                    <div className={styles.kpiHeader}><span>Taux charges récupérables</span></div>
                    <div className={styles.kpiValue}>{stats.tauxRecuperable.toFixed(1)}%</div>
                    <div className={styles.kpiDetail}>{formatCurrency(stats.totalRecuperable)} sur {formatCurrency(stats.totalCharges)}</div>
                </div>

                <div className={styles.kpiCard}>
                    <div className={styles.kpiHeader}><span>Consommation budget</span></div>
                    <div className={`${styles.kpiValue} ${stats.tauxConsommationBudget > 100 ? styles.kpiValueWarning : ''}`}>{stats.tauxConsommationBudget.toFixed(1)}%</div>
                    <div className={styles.kpiDetail}>
                        {stats.ecartBudget > 0 ? (
                            <span className={styles.kpiTrendUp}>Dépassement : +{formatCurrency(stats.ecartBudget)}</span>
                        ) : (
                            <span className={styles.kpiTrendDown}>Économie : {formatCurrency(Math.abs(stats.ecartBudget))}</span>
                        )}
                    </div>
                </div>

                <div className={styles.kpiCard}>
                    <div className={styles.kpiHeader}><span>Évolution N/N-1</span></div>
                    <div className={`${styles.kpiValue} ${stats.evolutionCharges > 0 ? styles.kpiValueWarning : styles.kpiValueSuccess}`}>
                        {stats.evolutionCharges > 0 ? '+' : ''}{stats.evolutionCharges.toFixed(1)}%
                    </div>
                    <div className={styles.kpiDetail}>Charges N : {formatCurrency(stats.totalCharges)} vs N-1 : {formatCurrency(stats.chargesN1)}</div>
                </div>
            </div>

            <h3 className={styles.syntheseSubtitle}>Comparaison exercice N vs N-1</h3>
            <table className={styles.syntheseTable}>
                <thead>
                    <tr>
                        <th>Indicateur</th>
                        <th className="text-right">Exercice N</th>
                        <th className="text-right">Exercice N-1</th>
                        <th className="text-right">Évolution</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Total des charges</td>
                        <td className={styles.amount}>{formatCurrency(stats.totalCharges)}</td>
                        <td className={styles.amount}>{formatCurrency(stats.chargesN1)}</td>
                        <td className={`${styles.amount} ${stats.evolutionCharges > 0 ? styles.amountNegative : styles.amountPositive}`}>
                            {stats.evolutionCharges > 0 ? '+' : ''}{stats.evolutionCharges.toFixed(1)}%
                            {stats.evolutionCharges > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        </td>
                    </tr>
                    <tr>
                        <td>Charges récupérables</td>
                        <td className={styles.amount}>{formatCurrency(stats.totalRecuperable)}</td>
                        <td className={styles.amount}>{formatCurrency(donneesN1.totalRecuperable)}</td>
                        <td className={`${styles.amount} ${stats.evolutionRecuperable > 0 ? styles.amountNegative : styles.amountPositive}`}>
                            {stats.evolutionRecuperable > 0 ? '+' : ''}{stats.evolutionRecuperable.toFixed(1)}%
                        </td>
                    </tr>
                    <tr>
                        <td>Charges non récupérables</td>
                        <td className={styles.amount}>{formatCurrency(stats.totalCharges - stats.totalRecuperable)}</td>
                        <td className={styles.amount}>{formatCurrency(stats.chargesN1 - donneesN1.totalRecuperable)}</td>
                        <td className={styles.amount}>-</td>
                    </tr>
                    <tr>
                        <td>Total des produits</td>
                        <td className={styles.amount}>{formatCurrency(stats.totalProduits)}</td>
                        <td className={styles.amount}>{formatCurrency(stats.produitsN1)}</td>
                        <td className={`${styles.amount} ${stats.evolutionProduits > 0 ? styles.amountPositive : styles.amountNegative}`}>
                            {stats.evolutionProduits > 0 ? '+' : ''}{stats.evolutionProduits.toFixed(1)}%
                        </td>
                    </tr>
                    <tr>
                        <td>Nombre d&apos;écritures</td>
                        <td className={styles.amount}>{stats.nombreLignes + stats.nombreProduits}</td>
                        <td className={styles.amount}>{donneesN1.nombreEcritures}</td>
                        <td className={styles.amount}>-</td>
                    </tr>
                </tbody>
            </table>

            <h3 className={styles.syntheseSubtitle}>Répartition des charges par poste</h3>
            <div className={styles.repartitionContainer}>
                {stats.repartitionCharges.map((item) => (
                    <div key={item.poste} className={styles.repartitionItem}>
                        <div className={styles.repartitionHeader}>
                            <span className={styles.repartitionLabel}>{item.label}</span>
                            <span className={styles.repartitionValue}>
                                {formatCurrency(item.montant)}
                                <span className={styles.repartitionPercent}>({item.pourcentage.toFixed(1)}%)</span>
                            </span>
                        </div>
                        <div className={styles.repartitionBarContainer}>
                            <div className={styles.repartitionBar} style={{ width: `${Math.min(item.pourcentage, 100)}%` }} />
                            <div className={styles.repartitionBarBudget} style={{ left: `${Math.min((item.budget / stats.totalCharges) * 100, 100)}%` }} title={`Budget: ${formatCurrency(item.budget)}`} />
                        </div>
                        <div className={styles.repartitionBudget}>
                            Budget : {formatCurrency(item.budget)}
                            {item.montant > item.budget && (<span className={styles.repartitionDepassement}>Dépassement +{formatCurrency(item.montant - item.budget)}</span>)}
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.totauxGeneraux}>
                <h3 className={styles.syntheseSubtitle}>Totaux généraux</h3>
                <div className={styles.totauxGrid}>
                    <div className={styles.totauxItem}>
                        <span className={styles.totauxLabel}>Total des charges (Classe 6)</span>
                        <span className={styles.totauxValue}>{formatCurrency(stats.totalCharges)}</span>
                    </div>
                    <div className={styles.totauxItem}>
                        <span className={styles.totauxLabel}>dont récupérables</span>
                        <span className={styles.totauxValue}>{formatCurrency(stats.totalRecuperable)}</span>
                    </div>
                    <div className={styles.totauxItem}>
                        <span className={styles.totauxLabel}>dont non récupérables</span>
                        <span className={styles.totauxValue}>{formatCurrency(stats.totalCharges - stats.totalRecuperable)}</span>
                    </div>
                    <div className={styles.totauxItem}>
                        <span className={styles.totauxLabel}>Total des produits (Classe 7)</span>
                        <span className={`${styles.totauxValue} ${styles.amountPositive}`}>+{formatCurrency(stats.totalProduits)}</span>
                    </div>
                    <div className={`${styles.totauxItem} ${styles.totauxItemFinal}`}>
                        <span className={styles.totauxLabel}><strong>RÉSULTAT NET</strong></span>
                        <span className={`${styles.totauxValue} ${stats.resultat >= 0 ? styles.amountPositive : styles.amountNegative}`}>
                            <strong>{stats.resultat >= 0 ? '+' : ''}{formatCurrency(stats.resultat)}</strong>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
