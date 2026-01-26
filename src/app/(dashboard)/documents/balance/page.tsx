'use client';

import { useMemo, useState } from 'react';
import { FileText, Download, AlertTriangle, CheckCircle, Eye, EyeOff, Search, Filter, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import styles from './balance.module.css';

// Import des données et fonctions de Finance/Comptabilité (SOURCE UNIQUE)
import { MOCK_OPERATIONS } from '@/components/features/finance/Comptabilite/data';
import {
    calculateBalance,
    filterBalance,
    calculateBalanceTotals,
    CLASSES_COMPTABLES,
    formatCurrency
} from '@/components/features/finance/Comptabilite/utils';
import type { LigneBalance } from '@/components/features/finance/Comptabilite/types';

// Année de l'exercice actuel (à synchroniser avec les données)
const ANNEE_EXERCICE = '2024';
const ANNEE_N1 = 2023;

export default function BalancePage() {
    // Par défaut, masquer les comptes à solde nul pour une lecture allégée
    const [masquerSoldesNuls, setMasquerSoldesNuls] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [classeFilter, setClasseFilter] = useState('TOUTES');
    const [showComparison, setShowComparison] = useState(true);

    const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

    // Calculer la balance à partir des opérations comptables (SOURCE UNIQUE)
    const balanceData = useMemo(() => {
        return calculateBalance(MOCK_OPERATIONS);
    }, []);

    // Appliquer les filtres
    const filteredBalance = useMemo(() => {
        return filterBalance(balanceData, {
            masquerSoldesNuls,
            classeFilter,
            searchTerm
        });
    }, [balanceData, masquerSoldesNuls, classeFilter, searchTerm]);

    // Calculer les totaux
    const totaux = useMemo(() => {
        return calculateBalanceTotals(filteredBalance);
    }, [filteredBalance]);

    // Vérifier l'équilibre de la balance (tolérance de 0.01€ pour les arrondis)
    const isEquilibre = Math.abs(totaux.totalClotureDebit - totaux.totalClotureCredit) < 0.01;
    const ecart = Math.abs(totaux.totalClotureDebit - totaux.totalClotureCredit);

    // Stats
    const comptesAvecSolde = balanceData.filter(l => l.soldeClotureDebit !== 0 || l.soldeClotureCredit !== 0).length;

    return (
        <div className="container">
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Balance Comptable</h1>
                    <p className={styles.subtitle}>
                        Exercice {ANNEE_EXERCICE} - Vue au {today}
                    </p>
                </div>
                <div className={styles.actions}>
                    <button className="btn btn-secondary"><Download size={16} aria-hidden="true" /> Export Excel</button>
                    <button className="btn btn-secondary"><FileText size={16} aria-hidden="true" /> Export PDF</button>
                </div>
            </div>

            {/* Bandeau d'information sur la source des données */}
            <div className={styles.infoSource}>
                <Info size={16} />
                <span>Ce document est généré automatiquement à partir des écritures comptables du module Finance</span>
            </div>

            {/* Filtres */}
            <div className={styles.filters}>
                <div className={styles.searchBox}>
                    <Search size={18} aria-hidden="true" />
                    <input
                        type="text"
                        placeholder="Rechercher un compte..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className={styles.filterGroup}>
                    <Filter size={16} aria-hidden="true" />
                    <select
                        value={classeFilter}
                        onChange={(e) => setClasseFilter(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="TOUTES">Toutes les classes</option>
                        {Object.entries(CLASSES_COMPTABLES).map(([classe, label]) => (
                            <option key={classe} value={classe}>{label}</option>
                        ))}
                    </select>
                </div>

                <button
                    className={`${styles.toggleButton} ${masquerSoldesNuls ? styles.active : ''}`}
                    onClick={() => setMasquerSoldesNuls(!masquerSoldesNuls)}
                    title={masquerSoldesNuls ? 'Afficher tous les comptes' : 'Masquer les comptes à solde nul'}
                >
                    {masquerSoldesNuls ? <Eye size={16} /> : <EyeOff size={16} />}
                    {masquerSoldesNuls ? 'Afficher soldes nuls' : 'Masquer soldes nuls'}
                </button>

                <button
                    className={`${styles.toggleButton} ${showComparison ? styles.active : ''}`}
                    onClick={() => setShowComparison(!showComparison)}
                    title={showComparison ? 'Masquer la comparaison N-1' : 'Afficher la comparaison N-1'}
                >
                    <TrendingUp size={16} />
                    {showComparison ? 'Masquer N-1' : 'Afficher N-1'}
                </button>
            </div>

            {/* Info comptes */}
            <div className={styles.infoBar}>
                <span>{filteredBalance.length} compte{filteredBalance.length > 1 ? 's' : ''} affiché{filteredBalance.length > 1 ? 's' : ''}</span>
                <span className={styles.infoSeparator}>|</span>
                <span>{comptesAvecSolde} compte{comptesAvecSolde > 1 ? 's' : ''} avec solde sur {balanceData.length} au total</span>
            </div>

            <div className={`card ${styles.tableWrapper}`}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th rowSpan={2}>Compte</th>
                            <th rowSpan={2}>Libellé</th>
                            {showComparison && (
                                <th colSpan={2} className={styles.headerGroup}>Ouverture</th>
                            )}
                            <th colSpan={2} className={styles.headerGroup}>Mouvements {ANNEE_EXERCICE}</th>
                            <th colSpan={2} className={styles.headerGroup}>Clôture {ANNEE_EXERCICE}</th>
                            {showComparison && (
                                <th rowSpan={2} className={styles.headerEvolution}>Évol.</th>
                            )}
                        </tr>
                        <tr>
                            {showComparison && <th className={styles.subHeader}>Débit</th>}
                            {showComparison && <th className={styles.subHeader}>Crédit</th>}
                            <th className={styles.subHeader}>Débit</th>
                            <th className={styles.subHeader}>Crédit</th>
                            <th className={styles.subHeader}>Débit</th>
                            <th className={styles.subHeader}>Crédit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredBalance.map((ligne: LigneBalance) => {
                            const evolution = ligne.variationPourcent;

                            return (
                                <tr key={ligne.compte} className={styles[`level-${ligne.classe.length}`]}>
                                    <td className={styles.accountNumber}>{ligne.compte}</td>
                                    <td className={styles.accountName}>{ligne.compteLabel}</td>
                                    {showComparison && (
                                        <td className={styles.amount}>
                                            {ligne.soldeOuvertureDebit > 0 ? formatCurrency(ligne.soldeOuvertureDebit) : '-'}
                                        </td>
                                    )}
                                    {showComparison && (
                                        <td className={styles.amount}>
                                            {ligne.soldeOuvertureCredit > 0 ? formatCurrency(ligne.soldeOuvertureCredit) : '-'}
                                        </td>
                                    )}
                                    <td className={styles.amount}>
                                        {ligne.mouvementDebit > 0 ? formatCurrency(ligne.mouvementDebit) : '-'}
                                    </td>
                                    <td className={styles.amount}>
                                        {ligne.mouvementCredit > 0 ? formatCurrency(ligne.mouvementCredit) : '-'}
                                    </td>
                                    <td className={styles.amountMain}>
                                        {ligne.soldeClotureDebit > 0 ? formatCurrency(ligne.soldeClotureDebit) : '-'}
                                    </td>
                                    <td className={styles.amountMain}>
                                        {ligne.soldeClotureCredit > 0 ? formatCurrency(ligne.soldeClotureCredit) : '-'}
                                    </td>
                                    {showComparison && (
                                        <td className={styles.evolution}>
                                            {evolution !== undefined ? (
                                                <span className={
                                                    evolution > 5 ? styles.evolutionUp :
                                                    evolution < -5 ? styles.evolutionDown :
                                                    styles.evolutionNeutral
                                                }>
                                                    {evolution > 5 && <TrendingUp size={14} />}
                                                    {evolution < -5 && <TrendingDown size={14} />}
                                                    {evolution >= -5 && evolution <= 5 && <Minus size={14} />}
                                                    {evolution > 0 ? '+' : ''}{evolution.toFixed(1)}%
                                                </span>
                                            ) : (
                                                <span className={styles.evolutionNew}>-</span>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr className={styles.totalRow}>
                            <td colSpan={2}><strong>TOTAUX</strong></td>
                            {showComparison && (
                                <td className={styles.amount}>
                                    <strong>{totaux.totalOuvertureDebit > 0 ? formatCurrency(totaux.totalOuvertureDebit) : '-'}</strong>
                                </td>
                            )}
                            {showComparison && (
                                <td className={styles.amount}>
                                    <strong>{totaux.totalOuvertureCredit > 0 ? formatCurrency(totaux.totalOuvertureCredit) : '-'}</strong>
                                </td>
                            )}
                            <td className={styles.amount}>
                                <strong>{formatCurrency(totaux.totalMouvementDebit)}</strong>
                            </td>
                            <td className={styles.amount}>
                                <strong>{formatCurrency(totaux.totalMouvementCredit)}</strong>
                            </td>
                            <td className={styles.amountMain}>
                                <strong>{formatCurrency(totaux.totalClotureDebit)}</strong>
                            </td>
                            <td className={styles.amountMain}>
                                <strong>{formatCurrency(totaux.totalClotureCredit)}</strong>
                            </td>
                            {showComparison && <td></td>}
                        </tr>
                        <tr className={styles.equilibreRow}>
                            <td colSpan={showComparison ? 9 : 6}>
                                {isEquilibre ? (
                                    <span className={styles.equilibreOk}>
                                        <CheckCircle size={16} aria-hidden="true" />
                                        Balance équilibrée - Total mouvements: {formatCurrency(totaux.totalMouvementDebit)}
                                    </span>
                                ) : (
                                    <span className={styles.equilibreError}>
                                        <AlertTriangle size={16} aria-hidden="true" />
                                        Balance déséquilibrée - Écart : {formatCurrency(ecart)}
                                    </span>
                                )}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
