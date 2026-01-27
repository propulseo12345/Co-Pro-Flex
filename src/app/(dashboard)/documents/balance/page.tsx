'use client';

import { useMemo, useState } from 'react';
import { FileText, Download, AlertTriangle, CheckCircle, Eye, EyeOff, Search, Filter, TrendingUp, TrendingDown, Minus, Info, RefreshCw, Building2, AlertCircle } from 'lucide-react';
import styles from './balance.module.css';

import { useCopro } from '@/providers/CoproContext';
import { useTrialBalance, useOpenPeriod } from '@/hooks/modules/useFinanceData';
import {
    filterBalance,
    calculateBalanceTotals,
    CLASSES_COMPTABLES,
    formatCurrency
} from '@/components/features/finance/Comptabilite/utils';
import { getExerciceActuel } from '@/lib/dates';
import type { LigneBalance } from '@/components/features/finance/Comptabilite/types';
import type { TrialBalanceEntry } from '@/lib/finance/api';

// Année de l'exercice actuel (dynamique via lib/dates)
const ANNEE_EXERCICE = getExerciceActuel().toString();

// Map Supabase account_type to local TypeCompte
type TypeCompte = 'ACTIF' | 'PASSIF' | 'CHARGE' | 'PRODUIT';
function mapAccountType(accountType: string): TypeCompte {
    switch (accountType) {
        case 'asset': return 'ACTIF';
        case 'liability': return 'PASSIF';
        case 'equity': return 'PASSIF';
        case 'revenue': return 'PRODUIT';
        case 'expense': return 'CHARGE';
        default: return 'ACTIF';
    }
}

// Transform Supabase trial balance to local format
function transformToLigneBalance(entries: TrialBalanceEntry[]): LigneBalance[] {
    return entries.map(entry => ({
        compte: entry.account_code,
        compteLabel: entry.account_name,
        typeCompte: mapAccountType(entry.account_type),
        classe: entry.account_code.charAt(0),
        soldeOuvertureDebit: 0,
        soldeOuvertureCredit: 0,
        mouvementDebit: Number(entry.total_debit),
        mouvementCredit: Number(entry.total_credit),
        soldeClotureDebit: Number(entry.balance) > 0 ? Number(entry.balance) : 0,
        soldeClotureCredit: Number(entry.balance) < 0 ? -Number(entry.balance) : 0,
        variationPourcent: undefined,
    }));
}

export default function BalancePage() {
    const { currentCoproId } = useCopro();
    const { data: openPeriod, isLoading: periodLoading } = useOpenPeriod();
    const { data: trialBalanceData, isLoading, error, refresh } = useTrialBalance(openPeriod?.id || null);

    // Par défaut, masquer les comptes à solde nul pour une lecture allégée
    const [masquerSoldesNuls, setMasquerSoldesNuls] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [classeFilter, setClasseFilter] = useState('TOUTES');
    const [showComparison, setShowComparison] = useState(true);

    const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

    // Transform Supabase data to local format
    const balanceData = useMemo(() => {
        if (!trialBalanceData || trialBalanceData.length === 0) return [];
        return transformToLigneBalance(trialBalanceData);
    }, [trialBalanceData]);

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

    // Mode Single Copro: si pas encore chargé ou en cours de chargement
    if (!currentCoproId || isLoading || periodLoading) {
        return (
            <div className="container">
                <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                    <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
                    <p style={{ marginTop: '1rem' }}>Chargement de la balance comptable...</p>
                </div>
            </div>
        );
    }

    // No period found
    if (!openPeriod) {
        return (
            <div className="container">
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Balance Comptable</h1>
                        <p className={styles.subtitle}>Exercice {ANNEE_EXERCICE} - Vue au {today}</p>
                    </div>
                </div>
                <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                    <AlertCircle size={48} style={{ color: 'var(--color-warning)', marginBottom: '1rem' }} />
                    <h2>Aucune période comptable ouverte</h2>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                        Veuillez créer ou ouvrir une période comptable pour afficher la balance.
                    </p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="container">
                <div className="card" style={{ padding: '2rem', textAlign: 'center', borderColor: 'var(--color-error)' }}>
                    <AlertCircle size={32} style={{ color: 'var(--color-error)', marginBottom: '1rem' }} />
                    <h2>Erreur de chargement</h2>
                    <p style={{ color: 'var(--color-text-secondary)' }}>{error}</p>
                    <button className="btn btn-primary" onClick={refresh} style={{ marginTop: '1rem' }}>
                        <RefreshCw size={16} style={{ marginRight: 8 }} /> Réessayer
                    </button>
                </div>
            </div>
        );
    }

    // Empty state
    if (balanceData.length === 0) {
        return (
            <div className="container">
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Balance Comptable</h1>
                        <p className={styles.subtitle}>Exercice {ANNEE_EXERCICE} - Vue au {today}</p>
                    </div>
                    <div className={styles.actions}>
                        <button className="btn btn-secondary" onClick={refresh}>
                            <RefreshCw size={16} style={{ marginRight: 8 }} /> Actualiser
                        </button>
                    </div>
                </div>
                <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                    <FileText size={48} style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }} />
                    <h2>Aucune écriture comptable</h2>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                        Il n&apos;y a pas encore d&apos;écritures comptables pour cette période.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Balance Comptable</h1>
                    <p className={styles.subtitle}>
                        {openPeriod?.name || `Exercice ${ANNEE_EXERCICE}`} - Vue au {today}
                    </p>
                </div>
                <div className={styles.actions}>
                    <button className="btn btn-secondary" onClick={refresh} title="Actualiser les données">
                        <RefreshCw size={16} style={{ marginRight: 8 }} aria-hidden="true" /> Actualiser
                    </button>
                    <button className="btn btn-secondary"><Download size={16} aria-hidden="true" /> Export Excel</button>
                    <button className="btn btn-secondary"><FileText size={16} aria-hidden="true" /> Export PDF</button>
                </div>
            </div>

            {/* Bandeau d'information sur la source des données */}
            <div className={styles.infoSource}>
                <Info size={16} />
                <span>Ce document est généré automatiquement à partir des écritures comptables de Supabase</span>
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
