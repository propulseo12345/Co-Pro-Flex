'use client';

import { FileText, Download, List, Info, RefreshCw, AlertCircle } from 'lucide-react';
import { useLedger } from '@/hooks/modules/useLedger';
import { LedgerFilters, LedgerTree, EcrituresModal } from '@/components/features/finance/Ledger';
import { getExerciceActuel } from '@/lib/dates';
import styles from '@/components/features/finance/Ledger/Ledger.module.css';

const ANNEE_EXERCICE = getExerciceActuel().toString();

export default function LedgerPage() {
    const {
        isLoading, error, refresh, currentCoproId, hasData,
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

    // Mode Single Copro: si pas encore chargé ou en cours de chargement, afficher loading
    if (!currentCoproId || isLoading) {
        return (
            <div className="container">
                <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                    <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
                    <p style={{ marginTop: '1rem' }}>Chargement du grand livre...</p>
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
    if (!hasData) {
        return (
            <div className="container">
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Grand livre de l&apos;exercice {ANNEE_EXERCICE}</h1>
                        <p className={styles.subtitle}>Période : 01/01/{ANNEE_EXERCICE} au 31/12/{ANNEE_EXERCICE}</p>
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
                        Il n&apos;y a pas encore d&apos;écritures comptables pour cette copropriété.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Grand livre de l&apos;exercice {ANNEE_EXERCICE}</h1>
                    <p className={styles.subtitle}>Période : 01/01/{ANNEE_EXERCICE} au 31/12/{ANNEE_EXERCICE}</p>
                </div>
                <div className={styles.actions}>
                    <button className="btn btn-secondary" onClick={refresh} title="Actualiser les données">
                        <RefreshCw size={16} style={{ marginRight: 8 }} aria-hidden="true" /> Actualiser
                    </button>
                    <button className="btn btn-secondary"><Download size={16} style={{ marginRight: 8 }} aria-hidden="true" /> Export Excel</button>
                    <button className="btn btn-secondary"><FileText size={16} style={{ marginRight: 8 }} aria-hidden="true" /> Export PDF</button>
                    <button className="btn btn-primary" onClick={() => { setEcrituresCompteFilter('TOUS'); expandAllGroups(); setShowEcritures(true); }}>
                        <List size={16} style={{ marginRight: 8 }} aria-hidden="true" /> Liste des écritures
                    </button>
                </div>
            </div>

            <div className={styles.infoSource}>
                <Info size={16} />
                <span>Ce document est généré automatiquement à partir des écritures comptables de Supabase</span>
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
