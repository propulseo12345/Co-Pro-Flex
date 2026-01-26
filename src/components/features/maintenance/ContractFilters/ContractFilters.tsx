'use client';

import { StatutContrat, TypeContrat } from '@/types';
import { Search, Filter } from 'lucide-react';
import styles from './ContractFilters.module.css';
import clsx from 'clsx';

interface ContractFiltersProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    statutFilter: StatutContrat | 'TOUS';
    onStatutChange: (statut: StatutContrat | 'TOUS') => void;
    typeFilter: TypeContrat | 'TOUS';
    onTypeChange: (type: TypeContrat | 'TOUS') => void;
    typesContrat: { value: TypeContrat; label: string }[];
}

export default function ContractFilters({
    searchTerm,
    onSearchChange,
    statutFilter,
    onStatutChange,
    typeFilter,
    onTypeChange,
    typesContrat
}: ContractFiltersProps) {
    const statuts: { value: StatutContrat | 'TOUS'; label: string }[] = [
        { value: 'TOUS', label: 'Tous les statuts' },
        { value: 'ACTIF', label: 'Actif' },
        { value: 'A_RENOUVELER', label: 'À renouveler' },
        { value: 'RESILIE', label: 'Résilié' },
        { value: 'BROUILLON', label: 'Brouillon' },
    ];

    return (
        <div className={styles.container}>
            <div className={styles.searchBox}>
                <Search size={18} className={styles.searchIcon} aria-hidden="true" />
                <input type="text" placeholder="Rechercher un contrat, prestataire, numéro..." value={searchTerm} onChange={(e) => onSearchChange(e.target.value)}
                    className={styles.searchInput}
                />
            </div>

            <div className={styles.filters}>
                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>
                        <Filter size={14} aria-hidden="true" />
                        Statut
                    </label>
                    <select
                        value={statutFilter}
                        onChange={(e) => onStatutChange(e.target.value as StatutContrat | 'TOUS')}
                        className={styles.select}
                    >
                        {statuts.map((statut) => (
                            <option key={statut.value} value={statut.value}>
                                {statut.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>
                        <Filter size={14} aria-hidden="true" />
                        Type
                    </label>
                    <select
                        value={typeFilter}
                        onChange={(e) => onTypeChange(e.target.value as TypeContrat | 'TOUS')}
                        className={styles.select}
                    >
                        <option value="TOUS">Tous les types</option>
                        {typesContrat.map((type) => (
                            <option key={type.value} value={type.value}>
                                {type.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
}
