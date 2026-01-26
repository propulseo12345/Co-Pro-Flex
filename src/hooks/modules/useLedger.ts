'use client';

import { useState, useMemo } from 'react';
import { MOCK_OPERATIONS } from '@/components/features/finance/Comptabilite/data';
import { calculateBalance, filterBalance, CLASSES_COMPTABLES } from '@/components/features/finance/Comptabilite/utils';
import type { LigneBalance, OperationComptable } from '@/components/features/finance/Comptabilite/types';

export type SortField = 'date' | 'compte' | 'libelle' | 'debit' | 'credit' | 'numeroPiece';
export type SortOrder = 'asc' | 'desc';
export type GroupBy = 'compte' | 'mois';

export function useLedger() {
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

    const balanceData = useMemo(() => calculateBalance(MOCK_OPERATIONS), []);

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
        MOCK_OPERATIONS.forEach(op => comptes.add(op.compte));
        return Array.from(comptes).sort();
    }, []);

    const filteredEcritures = useMemo(() => {
        let result = [...MOCK_OPERATIONS];

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
    }, [ecrituresSearch, ecrituresCompteFilter, ecrituresDateDebut, ecrituresDateFin, sortField, sortOrder]);

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

    const toggleClasse = (classe: string) => {
        const newExpanded = new Set(expandedClasses);
        if (newExpanded.has(classe)) newExpanded.delete(classe);
        else newExpanded.add(classe);
        setExpandedClasses(newExpanded);
    };

    const toggleGroup = (groupKey: string) => {
        const newExpanded = new Set(expandedGroups);
        if (newExpanded.has(groupKey)) newExpanded.delete(groupKey);
        else newExpanded.add(groupKey);
        setExpandedGroups(newExpanded);
    };

    const expandAllGroups = () => setExpandedGroups(new Set(Object.keys(groupedEcritures)));
    const collapseAllGroups = () => setExpandedGroups(new Set());

    const getClasseSolde = (comptes: LigneBalance[]) => {
        return comptes.reduce((sum, c) => sum + (c.soldeClotureDebit - c.soldeClotureCredit), 0);
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortOrder('asc'); }
    };

    const openEcrituresForCompte = (compte: string) => {
        setEcrituresCompteFilter(compte);
        setExpandedGroups(new Set([compte]));
        setShowEcritures(true);
    };

    const setQuickDateFilter = (period: 'month' | 'quarter' | 'year') => {
        const now = new Date();
        let start: Date;
        switch (period) {
            case 'month': start = new Date(now.getFullYear(), now.getMonth(), 1); break;
            case 'quarter': const quarterStart = Math.floor(now.getMonth() / 3) * 3; start = new Date(now.getFullYear(), quarterStart, 1); break;
            case 'year': start = new Date(now.getFullYear(), 0, 1); break;
        }
        setEcrituresDateDebut(start.toISOString().split('T')[0]);
        setEcrituresDateFin(now.toISOString().split('T')[0]);
    };

    const resetEcrituresFilters = () => {
        setEcrituresSearch('');
        setEcrituresCompteFilter('TOUS');
        setEcrituresDateDebut('');
        setEcrituresDateFin('');
    };

    return {
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
