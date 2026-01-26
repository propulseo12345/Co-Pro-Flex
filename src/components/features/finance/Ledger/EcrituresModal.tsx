'use client';

import React from 'react';
import { ChevronRight, ChevronDown, Download, X, Search, Calendar, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import { TruncatedText } from '@/shared/ui/TruncatedText';
import { formatCurrency, formatDate } from '@/components/features/finance/Comptabilite/utils';
import type { OperationComptable } from '@/components/features/finance/Comptabilite/types';
import type { SortField, SortOrder, GroupBy } from '@/hooks/modules/useLedger';
import styles from './Ledger.module.css';

interface EcrituresModalProps {
    anneeExercice: string;
    showEcritures: boolean;
    setShowEcritures: (show: boolean) => void;
    ecrituresSearch: string;
    setEcrituresSearch: (value: string) => void;
    ecrituresCompteFilter: string;
    setEcrituresCompteFilter: (value: string) => void;
    ecrituresDateDebut: string;
    setEcrituresDateDebut: (value: string) => void;
    ecrituresDateFin: string;
    setEcrituresDateFin: (value: string) => void;
    sortField: SortField;
    sortOrder: SortOrder;
    handleSort: (field: SortField) => void;
    groupBy: GroupBy;
    setGroupBy: (value: GroupBy) => void;
    expandedGroups: Set<string>;
    toggleGroup: (key: string) => void;
    expandAllGroups: () => void;
    collapseAllGroups: () => void;
    filteredEcritures: OperationComptable[];
    groupedEcritures: Record<string, { entries: OperationComptable[]; totalDebit: number; totalCredit: number; label: string }>;
    ecrituresTotaux: { debit: number; credit: number };
    comptesUniques: string[];
    setQuickDateFilter: (period: 'month' | 'quarter' | 'year') => void;
    resetEcrituresFilters: () => void;
}

function getJustificatifLink(op: OperationComptable) {
    if (op.factureLiee) return { type: 'Facture', id: op.factureLiee, link: `/finance/factures` };
    if (op.numeroPiece?.startsWith('AF-')) return { type: 'Appel de fonds', id: op.numeroPiece, link: `/finance/appels-fonds` };
    if (op.mouvementBancaireLie) return { type: 'Mvt bancaire', id: op.mouvementBancaireLie, link: `/finance/mouvements-bancaires` };
    return null;
}

function getSortIcon(sortField: SortField, sortOrder: SortOrder, field: SortField) {
    if (sortField !== field) return <ArrowUpDown size={14} className={styles.sortIconInactive} />;
    return sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
}

export function EcrituresModal({
    anneeExercice, showEcritures, setShowEcritures,
    ecrituresSearch, setEcrituresSearch,
    ecrituresCompteFilter, setEcrituresCompteFilter,
    ecrituresDateDebut, setEcrituresDateDebut,
    ecrituresDateFin, setEcrituresDateFin,
    sortField, sortOrder, handleSort,
    groupBy, setGroupBy,
    expandedGroups, toggleGroup, expandAllGroups, collapseAllGroups,
    filteredEcritures, groupedEcritures, ecrituresTotaux,
    comptesUniques, setQuickDateFilter, resetEcrituresFilters,
}: EcrituresModalProps) {
    if (!showEcritures) return null;

    const hasFilters = ecrituresSearch || ecrituresCompteFilter !== 'TOUS' || ecrituresDateDebut || ecrituresDateFin;

    return (
        <div className={styles.modalOverlay} onClick={() => setShowEcritures(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <div>
                        <h2 className={styles.modalTitle}>Liste des écritures comptables</h2>
                        <p className={styles.modalSubtitle}>Exercice {anneeExercice} - {filteredEcritures.length} écriture{filteredEcritures.length > 1 ? 's' : ''}</p>
                    </div>
                    <div className={styles.modalActions}>
                        <button className="btn btn-secondary btn-sm"><Download size={14} /> Export Excel</button>
                        <button className={styles.closeButton} onClick={() => setShowEcritures(false)} aria-label="Fermer"><X size={20} /></button>
                    </div>
                </div>

                <div className={styles.modalFilters}>
                    <div className={styles.searchBox}>
                        <Search size={16} />
                        <input type="text" placeholder="Rechercher (libellé, compte, n° pièce...)" value={ecrituresSearch} onChange={(e) => setEcrituresSearch(e.target.value)} />
                    </div>

                    <select value={ecrituresCompteFilter} onChange={(e) => setEcrituresCompteFilter(e.target.value)} className={styles.filterSelect}>
                        <option value="TOUS">Tous les comptes</option>
                        {comptesUniques.map(compte => <option key={compte} value={compte}>{compte}</option>)}
                    </select>

                    <div className={styles.dateFilters}>
                        <input type="date" value={ecrituresDateDebut} onChange={(e) => setEcrituresDateDebut(e.target.value)} className={styles.dateInput} />
                        <span className={styles.dateSeparator}>au</span>
                        <input type="date" value={ecrituresDateFin} onChange={(e) => setEcrituresDateFin(e.target.value)} className={styles.dateInput} />
                    </div>

                    <div className={styles.quickFilters}>
                        <button className={styles.quickFilterBtn} onClick={() => setQuickDateFilter('month')}><Calendar size={12} /> Mois</button>
                        <button className={styles.quickFilterBtn} onClick={() => setQuickDateFilter('quarter')}><Calendar size={12} /> Trimestre</button>
                        <button className={styles.quickFilterBtn} onClick={() => setQuickDateFilter('year')}><Calendar size={12} /> Année</button>
                    </div>

                    {hasFilters && <button className="btn btn-secondary btn-sm" onClick={resetEcrituresFilters}>Réinitialiser</button>}
                </div>

                <div className={styles.groupControls}>
                    <div className={styles.groupBySelector}>
                        <span className={styles.groupByLabel}>Grouper par :</span>
                        <button className={clsx(styles.groupByBtn, groupBy === 'compte' && styles.groupByBtnActive)} onClick={() => setGroupBy('compte')}>Compte</button>
                        <button className={clsx(styles.groupByBtn, groupBy === 'mois' && styles.groupByBtnActive)} onClick={() => setGroupBy('mois')}>Mois</button>
                    </div>
                    <div className={styles.expandControls}>
                        <button className={styles.expandBtn} onClick={expandAllGroups}>Tout déplier</button>
                        <button className={styles.expandBtn} onClick={collapseAllGroups}>Tout replier</button>
                    </div>
                </div>

                <div className={styles.ecrituresTableWrapper}>
                    <table className={styles.ecrituresTable}>
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('date')} className={clsx(styles.sortableHeader, styles.thDate)} style={{ textAlign: 'center' }}><span>Date</span> {getSortIcon(sortField, sortOrder, 'date')}</th>
                                <th onClick={() => handleSort('numeroPiece')} className={clsx(styles.sortableHeader, styles.thPiece)}><span>N° Pièce</span> {getSortIcon(sortField, sortOrder, 'numeroPiece')}</th>
                                <th onClick={() => handleSort('compte')} className={clsx(styles.sortableHeader, styles.thCompte)}><span>Compte</span> {getSortIcon(sortField, sortOrder, 'compte')}</th>
                                <th onClick={() => handleSort('libelle')} className={clsx(styles.sortableHeader, styles.thLibelle)}><span>Libellé</span> {getSortIcon(sortField, sortOrder, 'libelle')}</th>
                                <th onClick={() => handleSort('debit')} className={clsx(styles.sortableHeader, styles.thAmount)} style={{ textAlign: 'right' }}><span>Débit</span> {getSortIcon(sortField, sortOrder, 'debit')}</th>
                                <th onClick={() => handleSort('credit')} className={clsx(styles.sortableHeader, styles.thAmount)} style={{ textAlign: 'right' }}><span>Crédit</span> {getSortIcon(sortField, sortOrder, 'credit')}</th>
                                <th className={styles.thJustificatif} style={{ textAlign: 'center' }}>Justificatif</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(groupedEcritures).sort(([a], [b]) => a.localeCompare(b)).map(([groupKey, group]) => {
                                const isExpanded = expandedGroups.has(groupKey);
                                const solde = group.totalDebit - group.totalCredit;

                                return (
                                    <React.Fragment key={groupKey}>
                                        <tr className={styles.groupHeader} onClick={() => toggleGroup(groupKey)}>
                                            <td colSpan={4} className={styles.groupHeaderCell}>
                                                <span className={styles.groupToggle}>{isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
                                                <span className={styles.groupLabel}>{group.label}</span>
                                                <span className={styles.groupCount}>({group.entries.length} écritures)</span>
                                            </td>
                                            <td className={styles.groupSubtotal}>{formatCurrency(group.totalDebit)}</td>
                                            <td className={styles.groupSubtotal}>{formatCurrency(group.totalCredit)}</td>
                                            <td className={styles.groupSolde}>
                                                <span className={clsx(solde >= 0 ? styles.soldeDebit : styles.soldeCredit)}>{formatCurrency(Math.abs(solde))} {solde >= 0 ? 'D' : 'C'}</span>
                                            </td>
                                        </tr>
                                        {isExpanded && group.entries.map((op, idx) => {
                                            const justificatif = getJustificatifLink(op);
                                            return (
                                                <tr key={op.id} className={clsx(styles.dataRow, idx % 2 === 1 && styles.zebraRow)}>
                                                    <td className={styles.dateCell}>{formatDate(op.date)}</td>
                                                    <td className={styles.pieceCell}>{op.numeroPiece || '-'}</td>
                                                    <td className={styles.compteCell}>
                                                        <span className={styles.compteNumber}>{op.compte}</span>
                                                        <span className={styles.compteLabelSmall}>{op.compteLabel}</span>
                                                    </td>
                                                    <td className={styles.libelleCell}><TruncatedText text={op.libelle} maxWidth={280} /></td>
                                                    <td className={clsx(styles.amountCell, op.debit > 0 && styles.debitAmount)}>{op.debit > 0 ? formatCurrency(op.debit) : '-'}</td>
                                                    <td className={clsx(styles.amountCell, op.credit > 0 && styles.creditAmount)}>{op.credit > 0 ? formatCurrency(op.credit) : '-'}</td>
                                                    <td className={styles.justificatifCell}>
                                                        {justificatif ? (
                                                            <a href={justificatif.link} className={styles.justificatifLink}><ExternalLink size={12} />{justificatif.type}</a>
                                                        ) : <span className={styles.noJustificatif}>-</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className={styles.totalsRow}>
                                <td colSpan={4} className={styles.totalsLabel}><strong>TOTAUX ({filteredEcritures.length} écritures)</strong></td>
                                <td className={clsx(styles.amountCell, styles.totalAmount)}><strong>{formatCurrency(ecrituresTotaux.debit)}</strong></td>
                                <td className={clsx(styles.amountCell, styles.totalAmount)}><strong>{formatCurrency(ecrituresTotaux.credit)}</strong></td>
                                <td></td>
                            </tr>
                            {Math.abs(ecrituresTotaux.debit - ecrituresTotaux.credit) < 0.01 && (
                                <tr className={styles.equilibreRow}><td colSpan={7} className={styles.equilibreOk}>Balance équilibrée (Débit = Crédit)</td></tr>
                            )}
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}
