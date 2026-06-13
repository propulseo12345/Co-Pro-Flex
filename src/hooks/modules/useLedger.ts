'use client';

import { useState, useMemo, useCallback } from 'react';
import { useCopro } from '@/providers/CoproContext';
import { useGeneralLedger, useOpenPeriod } from '@/hooks/modules/useFinanceData';
import { filterBalance, CLASSES_COMPTABLES } from '@/components/features/finance/Comptabilite/utils';
import type { LigneBalance, OperationComptable } from '@/components/features/finance/Comptabilite/types';
import type { GeneralLedgerEntry } from '@/lib/finance/api';

export type SortField = 'date' | 'compte' | 'libelle' | 'debit' | 'credit' | 'numeroPiece';
export type SortOrder = 'asc' | 'desc';
export type GroupBy = 'compte' | 'mois';

// Map Supabase account_type to local TypeCompte for operations
function mapAccountTypeToTypeCompte(accountType: string): TypeCompte {
    switch (accountType) {
        case 'asset': return 'ACTIF';
        case 'liability': return 'PASSIF';
        case 'equity': return 'PASSIF';
        case 'revenue': return 'PRODUIT';
        case 'expense': return 'CHARGE';
        default: return 'ACTIF';
    }
}

// Transform Supabase data to local format
function transformToOperations(entries: GeneralLedgerEntry[]): OperationComptable[] {
    return entries.map(entry => ({
        id: entry.entry_id,
        date: entry.tx_date,
        compte: entry.account_code,
        compteLabel: entry.account_name,
        typeCompte: mapAccountTypeToTypeCompte(entry.account_type),
        libelle: entry.tx_label + (entry.entry_label ? ` - ${entry.entry_label}` : ''),
        debit: entry.direction === 'debit' ? Number(entry.amount) : 0,
        credit: entry.direction === 'credit' ? Number(entry.amount) : 0,
        numeroPiece: entry.source_id?.slice(0, 8) || undefined,
    }));
}

// Map account class to TypeCompte
type TypeCompte = 'ACTIF' | 'PASSIF' | 'CHARGE' | 'PRODUIT';
function getTypeCompteFromClasse(classe: string): TypeCompte {
    switch (classe) {
        case '1': return 'PASSIF';  // Capitaux
        case '2': return 'ACTIF';   // Immobilisations
        case '3': return 'ACTIF';   // Stocks
        case '4': return 'ACTIF';   // Tiers (créances par défaut)
        case '5': return 'ACTIF';   // Trésorerie
        case '6': return 'CHARGE';  // Charges
        case '7': return 'PRODUIT'; // Produits
        default: return 'ACTIF';
    }
}

// Calculate balance from operations
function calculateBalanceFromOperations(operations: OperationComptable[]): LigneBalance[] {
    const compteMap = new Map<string, {
        compte: string;
        compteLabel: string;
        classe: string;
        mouvementDebit: number;
        mouvementCredit: number;
    }>();

    operations.forEach(op => {
        const existing = compteMap.get(op.compte);
        if (existing) {
            existing.mouvementDebit += op.debit;
            existing.mouvementCredit += op.credit;
        } else {
            compteMap.set(op.compte, {
                compte: op.compte,
                compteLabel: op.compteLabel,
                classe: op.compte.charAt(0),
                mouvementDebit: op.debit,
                mouvementCredit: op.credit,
            });
        }
    });

    return Array.from(compteMap.values()).map(c => ({
        compte: c.compte,
        compteLabel: c.compteLabel,
        typeCompte: getTypeCompteFromClasse(c.classe),
        classe: c.classe,
        soldeOuvertureDebit: 0,
        soldeOuvertureCredit: 0,
        mouvementDebit: c.mouvementDebit,
        mouvementCredit: c.mouvementCredit,
        soldeClotureDebit: Math.max(0, c.mouvementDebit - c.mouvementCredit),
        soldeClotureCredit: Math.max(0, c.mouvementCredit - c.mouvementDebit),
        variationPourcent: undefined,
    })).sort((a, b) => a.compte.localeCompare(b.compte));
}

export function useLedger() {
    const { currentCoproId } = useCopro();
    useOpenPeriod();
    const { data: ledgerEntries, isLoading, error, refresh } = useGeneralLedger({ status: 'posted' });

    // Transform Supabase data to operations
    const operations = useMemo(() => {
        if (!ledgerEntries || ledgerEntries.length === 0) return [];
        return transformToOperations(ledgerEntries);
    }, [ledgerEntries]);

    const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set(['1', '4', '5', '6', '7']));
    const [searchTerm, setSearchTerm] = useState('');
    const [classeFilter, setClasseFilter] = useState('TOUTES');

    const [showEcritures, setShowEcritures] = useState(false);
    const [ecrituresSearch, setEcrituresSearch] = useState('');
    const [ecrituresCompteFilter, setEcrituresCompteFilter] = useState('TOUS');
    const [ecrituresDateDebut, setEcrituresDateDebut] = useState('');
    const [ecrituresDateFin, setEcrituresDateFin] = useState('');
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [groupBy, setGroupBy] = useState<GroupBy>('compte');
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    const balanceData = useMemo(() => calculateBalanceFromOperations(operations), [operations]);

    const filteredBalance = useMemo(() => {
        return filterBalance(balanceData, { masquerSoldesNuls: false, classeFilter, searchTerm });
    }, [balanceData, classeFilter, searchTerm]);

    const groupedByClasse = useMemo(() => {
        const groups: Record<string, LigneBalance[]> = {};
        filteredBalance.forEach(ligne => {
            if (!groups[ligne.classe]) groups[ligne.classe] = [];
            groups[ligne.classe].push(ligne);
        });
        return groups;
    }, [filteredBalance]);

    const comptesUniques = useMemo(() => {
        const comptes = new Set<string>();
        operations.forEach(op => comptes.add(op.compte));
        return Array.from(comptes).sort();
    }, [operations]);

    const filteredEcritures = useMemo(() => {
        let result = [...operations];

        if (ecrituresSearch) {
            const search = ecrituresSearch.toLowerCase();
            result = result.filter(op =>
                op.libelle.toLowerCase().includes(search) ||
                op.compte.includes(search) ||
                op.compteLabel.toLowerCase().includes(search) ||
                (op.numeroPiece && op.numeroPiece.toLowerCase().includes(search))
            );
        }

        if (ecrituresCompteFilter !== 'TOUS') {
            result = result.filter(op => op.compte === ecrituresCompteFilter);
        }

        if (ecrituresDateDebut) result = result.filter(op => op.date >= ecrituresDateDebut);
        if (ecrituresDateFin) result = result.filter(op => op.date <= ecrituresDateFin);

        result.sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case 'date': comparison = a.date.localeCompare(b.date); break;
                case 'compte': comparison = a.compte.localeCompare(b.compte); break;
                case 'libelle': comparison = a.libelle.localeCompare(b.libelle); break;
                case 'debit': comparison = a.debit - b.debit; break;
                case 'credit': comparison = a.credit - b.credit; break;
                case 'numeroPiece': comparison = (a.numeroPiece || '').localeCompare(b.numeroPiece || ''); break;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [operations, ecrituresSearch, ecrituresCompteFilter, ecrituresDateDebut, ecrituresDateFin, sortField, sortOrder]);

    const groupedEcritures = useMemo(() => {
        const groups: Record<string, { entries: OperationComptable[]; totalDebit: number; totalCredit: number; label: string }> = {};
        const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

        filteredEcritures.forEach(op => {
            let key: string, label: string;
            if (groupBy === 'compte') {
                key = op.compte;
                label = `${op.compte} - ${op.compteLabel}`;
            } else {
                const date = new Date(op.date);
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
            }

            if (!groups[key]) groups[key] = { entries: [], totalDebit: 0, totalCredit: 0, label };
            groups[key].entries.push(op);
            groups[key].totalDebit += op.debit;
            groups[key].totalCredit += op.credit;
        });

        return groups;
    }, [filteredEcritures, groupBy]);

    const ecrituresTotaux = useMemo(() => {
        return filteredEcritures.reduce((acc, op) => ({ debit: acc.debit + op.debit, credit: acc.credit + op.credit }), { debit: 0, credit: 0 });
    }, [filteredEcritures]);

    const toggleClasse = useCallback((classe: string) => {
        setExpandedClasses(prev => {
            const newExpanded = new Set(prev);
            if (newExpanded.has(classe)) newExpanded.delete(classe);
            else newExpanded.add(classe);
            return newExpanded;
        });
    }, []);

    const toggleGroup = useCallback((groupKey: string) => {
        setExpandedGroups(prev => {
            const newExpanded = new Set(prev);
            if (newExpanded.has(groupKey)) newExpanded.delete(groupKey);
            else newExpanded.add(groupKey);
            return newExpanded;
        });
    }, []);

    const expandAllGroups = useCallback(() => setExpandedGroups(new Set(Object.keys(groupedEcritures))), [groupedEcritures]);
    const collapseAllGroups = useCallback(() => setExpandedGroups(new Set()), []);

    const getClasseSolde = useCallback((comptes: LigneBalance[]) => {
        return comptes.reduce((sum, c) => sum + (c.soldeClotureDebit - c.soldeClotureCredit), 0);
    }, []);

    const handleSort = useCallback((field: SortField) => {
        if (sortField === field) setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortOrder('asc'); }
    }, [sortField]);

    const openEcrituresForCompte = useCallback((compte: string) => {
        setEcrituresCompteFilter(compte);
        setExpandedGroups(new Set([compte]));
        setShowEcritures(true);
    }, []);

    const setQuickDateFilter = useCallback((period: 'month' | 'quarter' | 'year') => {
        const now = new Date();
        let start: Date;
        switch (period) {
            case 'month': start = new Date(now.getFullYear(), now.getMonth(), 1); break;
            case 'quarter': const quarterStart = Math.floor(now.getMonth() / 3) * 3; start = new Date(now.getFullYear(), quarterStart, 1); break;
            case 'year': start = new Date(now.getFullYear(), 0, 1); break;
        }
        setEcrituresDateDebut(start.toISOString().split('T')[0]);
        setEcrituresDateFin(now.toISOString().split('T')[0]);
    }, []);

    const resetEcrituresFilters = useCallback(() => {
        setEcrituresSearch('');
        setEcrituresCompteFilter('TOUS');
        setEcrituresDateDebut('');
        setEcrituresDateFin('');
    }, []);

    return {
        // Data loading state
        isLoading,
        error,
        refresh,
        currentCoproId,
        hasData: operations.length > 0,

        // Balance state
        expandedClasses, searchTerm, setSearchTerm, classeFilter, setClasseFilter,
        groupedByClasse, toggleClasse, getClasseSolde,
        // Ecritures state
        showEcritures, setShowEcritures,
        ecrituresSearch, setEcrituresSearch,
        ecrituresCompteFilter, setEcrituresCompteFilter,
        ecrituresDateDebut, setEcrituresDateDebut,
        ecrituresDateFin, setEcrituresDateFin,
        sortField, sortOrder, handleSort,
        groupBy, setGroupBy,
        expandedGroups, toggleGroup, expandAllGroups, collapseAllGroups,
        filteredEcritures, groupedEcritures, ecrituresTotaux,
        comptesUniques, openEcrituresForCompte,
        setQuickDateFilter, resetEcrituresFilters,
        CLASSES_COMPTABLES,
    };
}
