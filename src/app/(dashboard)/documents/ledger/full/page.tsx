'use client';

import { useMemo } from 'react';
import { FileText, Download, Info } from 'lucide-react';
import Link from 'next/link';
import styles from '../ledger.module.css';
import clsx from 'clsx';

// Import des données et fonctions de Finance/Comptabilité (SOURCE UNIQUE)
import { MOCK_OPERATIONS } from '@/components/features/finance/Comptabilite/data';
import {
    calculateBalance,
    CLASSES_COMPTABLES,
    formatCurrency
} from '@/components/features/finance/Comptabilite/utils';
import { getExerciceActuel } from '@/lib/dates';
import type { LigneBalance } from '@/components/features/finance/Comptabilite/types';

// Année de l'exercice actuel (dynamique via lib/dates)
const ANNEE_EXERCICE = getExerciceActuel().toString();

export default function FullLedgerPage() {
    // Calculer la balance à partir des opérations comptables (SOURCE UNIQUE)
    const balanceData = useMemo(() => {
        return calculateBalance(MOCK_OPERATIONS);
    }, []);

    // Grouper les comptes par classe
    const groupedByClasse = useMemo(() => {
        const groups: Record<string, LigneBalance[]> = {};
        balanceData.forEach(ligne => {
            if (!groups[ligne.classe]) {
                groups[ligne.classe] = [];
            }
            groups[ligne.classe].push(ligne);
        });
        return groups;
    }, [balanceData]);

    // Calculer le solde par classe
    const getClasseSolde = (comptes: LigneBalance[]) => {
        return comptes.reduce((sum, c) => sum + (c.soldeClotureDebit - c.soldeClotureCredit), 0);
    };

    return (
        <div className="container">
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Grand livre - Structure Développée</h1>
                    <p className={styles.subtitle}>
                        Exercice {ANNEE_EXERCICE} - Tous les comptes
                    </p>
                </div>
                <div className={styles.actions}>
                    <button className="btn btn-secondary"><Download size={16} style={{ marginRight: 8 }} aria-hidden="true" /> Export Excel</button>
                    <button className="btn btn-secondary"><FileText size={16} style={{ marginRight: 8 }} aria-hidden="true" /> Export PDF</button>
                </div>
            </div>

            {/* Bandeau d'information sur la source des données */}
            <div className={styles.infoSource}>
                <Info size={16} />
                <span>Ce document est généré automatiquement à partir des écritures comptables du module Finance</span>
            </div>

            <div className="card">
                <div className={styles.tableHeader}>
                    <span>Compte</span>
                    <span>Solde</span>
                </div>
                <div className={styles.treeTable}>
                    {Object.entries(groupedByClasse).sort(([a], [b]) => a.localeCompare(b)).map(([classe, comptes]) => {
                        const classeSolde = getClasseSolde(comptes);

                        return (
                            <div key={classe}>
                                {/* Ligne de classe */}
                                <div className={clsx(styles.row, styles['level-1'])}>
                                    <div className={styles.accountInfo}>
                                        <span className={styles.accountNumber}>{classe}</span>
                                        <span className={styles.accountName}>
                                            {CLASSES_COMPTABLES[classe] || `Classe ${classe}`}
                                        </span>
                                    </div>
                                    <div className={styles.accountBalance}>
                                        {formatCurrency(Math.abs(classeSolde))}
                                        <span className={styles.balanceType}>
                                            {classeSolde >= 0 ? ' D' : ' C'}
                                        </span>
                                    </div>
                                </div>

                                {/* Comptes de la classe */}
                                <div className={styles.children}>
                                    {comptes.map((ligne) => {
                                        const solde = ligne.soldeClotureDebit - ligne.soldeClotureCredit;

                                        return (
                                            <div key={ligne.compte} className={clsx(styles.row, styles['level-2'])}>
                                                <div className={styles.accountInfo}>
                                                    <span className={styles.accountNumber}>{ligne.compte}</span>
                                                    <span className={styles.accountName}>{ligne.compteLabel}</span>
                                                </div>
                                                <div className={styles.accountBalance}>
                                                    {formatCurrency(Math.abs(solde))}
                                                    <span className={styles.balanceType}>
                                                        {solde >= 0 ? ' D' : ' C'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Lien vers Finance/Comptabilité */}
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <Link href="/finance/comptabilite" className="btn btn-secondary">
                    Consulter les écritures détaillées dans Finance &gt; Comptabilité
                </Link>
            </div>
        </div>
    );
}
