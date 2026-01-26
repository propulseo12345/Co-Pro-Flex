'use client';

import { Search, Filter } from 'lucide-react';
import styles from './Ledger.module.css';

interface LedgerFiltersProps {
    searchTerm: string;
    setSearchTerm: (value: string) => void;
    classeFilter: string;
    setClasseFilter: (value: string) => void;
    classesComptables: Record<string, string>;
}

export function LedgerFilters({
    searchTerm, setSearchTerm, classeFilter, setClasseFilter, classesComptables
}: LedgerFiltersProps) {
    return (
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
                    {Object.entries(classesComptables).map(([classe, label]) => (
                        <option key={classe} value={classe}>{label}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}
