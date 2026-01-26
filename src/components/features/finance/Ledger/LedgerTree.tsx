'use client';

import { ChevronRight, ChevronDown, List } from 'lucide-react';
import clsx from 'clsx';
import type { LigneBalance } from '@/components/features/finance/Comptabilite/types';
import { formatCurrency } from '@/components/features/finance/Comptabilite/utils';
import styles from './Ledger.module.css';

interface LedgerTreeProps {
    groupedByClasse: Record<string, LigneBalance[]>;
    expandedClasses: Set<string>;
    toggleClasse: (classe: string) => void;
    getClasseSolde: (comptes: LigneBalance[]) => number;
    openEcrituresForCompte: (compte: string) => void;
    classesComptables: Record<string, string>;
}

export function LedgerTree({
    groupedByClasse, expandedClasses, toggleClasse, getClasseSolde, openEcrituresForCompte, classesComptables
}: LedgerTreeProps) {
    return (
        <div className="card">
            <div className={styles.tableHeader}>
                <span>Compte</span>
                <span>Solde</span>
            </div>
            <div className={styles.treeTable}>
                {Object.entries(groupedByClasse).sort(([a], [b]) => a.localeCompare(b)).map(([classe, comptes]) => {
                    const isExpanded = expandedClasses.has(classe);
                    const classeSolde = getClasseSolde(comptes);

                    return (
                        <div key={classe}>
                            <div className={clsx(styles.row, styles['level-1'])} onClick={() => toggleClasse(classe)}>
                                <div className={styles.accountInfo}>
                                    <span className={styles.toggleIcon}>
                                        {isExpanded ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
                                    </span>
                                    <span className={styles.accountNumber}>{classe}</span>
                                    <span className={styles.accountName}>{classesComptables[classe] || `Classe ${classe}`}</span>
                                </div>
                                <div className={styles.accountBalance}>
                                    {formatCurrency(Math.abs(classeSolde))}
                                    <span className={styles.balanceType}>{classeSolde >= 0 ? ' D' : ' C'}</span>
                                </div>
                            </div>

                            {isExpanded && (
                                <div className={styles.children}>
                                    {comptes.map((ligne, idx) => {
                                        const solde = ligne.soldeClotureDebit - ligne.soldeClotureCredit;
                                        const hasMovements = ligne.mouvementDebit > 0 || ligne.mouvementCredit > 0;

                                        return (
                                            <div
                                                key={ligne.compte}
                                                className={clsx(styles.row, styles['level-2'], styles.clickableRow, idx % 2 === 1 && styles.zebraRow)}
                                                onClick={() => openEcrituresForCompte(ligne.compte)}
                                                title="Cliquez pour voir les écritures de ce compte"
                                            >
                                                <div className={styles.accountInfo}>
                                                    <span className={styles.accountNumber}>{ligne.compte}</span>
                                                    <span className={styles.accountName}>{ligne.compteLabel}</span>
                                                    {hasMovements && (
                                                        <span className={styles.movementIndicator} title={`Mouvements: ${formatCurrency(ligne.mouvementDebit)} D / ${formatCurrency(ligne.mouvementCredit)} C`}>
                                                            {ligne.mouvementDebit > 0 && ligne.mouvementCredit > 0 ? '↕' : ligne.mouvementDebit > 0 ? '↓' : '↑'}
                                                        </span>
                                                    )}
                                                    <span className={styles.viewEcritures}><List size={14} /> Voir écritures</span>
                                                </div>
                                                <div className={styles.accountBalance}>
                                                    {formatCurrency(Math.abs(solde))}
                                                    <span className={styles.balanceType}>{solde >= 0 ? ' D' : ' C'}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
