'use client';

import { FileText, Download, List, Info } from 'lucide-react';
import { useLedger } from '@/hooks/modules/useLedger';
import { LedgerFilters, LedgerTree, EcrituresModal } from '@/components/features/finance/Ledger';
import styles from '@/components/features/finance/Ledger/Ledger.module.css';

const ANNEE_EXERCICE = '2024';

export default function LedgerPage() {
    const {
        expandedClasses, searchTerm, setSearchTerm, classeFilter, setClasseFilter,
        groupedByClasse, toggleClasse, getClasseSolde,
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
    } = useLedger();

    return (
        <div className="container">
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Grand livre de l&apos;exercice {ANNEE_EXERCICE}</h1>
                    <p className={styles.subtitle}>Période : 01/01/{ANNEE_EXERCICE} au 31/12/{ANNEE_EXERCICE}</p>
                </div>
                <div className={styles.actions}>
                    <button className="btn btn-secondary"><Download size={16} style={{ marginRight: 8 }} aria-hidden="true" /> Export Excel</button>
                    <button className="btn btn-secondary"><FileText size={16} style={{ marginRight: 8 }} aria-hidden="true" /> Export PDF</button>
                    <button className="btn btn-primary" onClick={() => { setEcrituresCompteFilter('TOUS'); expandAllGroups(); setShowEcritures(true); }}>
                        <List size={16} style={{ marginRight: 8 }} aria-hidden="true" /> Liste des écritures
                    </button>
                </div>
            </div>

            <div className={styles.infoSource}>
                <Info size={16} />
                <span>Ce document est généré automatiquement à partir des écritures comptables du module Finance</span>
            </div>

            <LedgerFilters
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                classeFilter={classeFilter}
                setClasseFilter={setClasseFilter}
                classesComptables={CLASSES_COMPTABLES}
            />

            <LedgerTree
                groupedByClasse={groupedByClasse}
                expandedClasses={expandedClasses}
                toggleClasse={toggleClasse}
                getClasseSolde={getClasseSolde}
                openEcrituresForCompte={openEcrituresForCompte}
                classesComptables={CLASSES_COMPTABLES}
            />

            <EcrituresModal
                anneeExercice={ANNEE_EXERCICE}
                showEcritures={showEcritures}
                setShowEcritures={setShowEcritures}
                ecrituresSearch={ecrituresSearch}
                setEcrituresSearch={setEcrituresSearch}
                ecrituresCompteFilter={ecrituresCompteFilter}
                setEcrituresCompteFilter={setEcrituresCompteFilter}
                ecrituresDateDebut={ecrituresDateDebut}
                setEcrituresDateDebut={setEcrituresDateDebut}
                ecrituresDateFin={ecrituresDateFin}
                setEcrituresDateFin={setEcrituresDateFin}
                sortField={sortField}
                sortOrder={sortOrder}
                handleSort={handleSort}
                groupBy={groupBy}
                setGroupBy={setGroupBy}
                expandedGroups={expandedGroups}
                toggleGroup={toggleGroup}
                expandAllGroups={expandAllGroups}
                collapseAllGroups={collapseAllGroups}
                filteredEcritures={filteredEcritures}
                groupedEcritures={groupedEcritures}
                ecrituresTotaux={ecrituresTotaux}
                comptesUniques={comptesUniques}
                setQuickDateFilter={setQuickDateFilter}
                resetEcrituresFilters={resetEcrituresFilters}
            />
        </div>
    );
}
