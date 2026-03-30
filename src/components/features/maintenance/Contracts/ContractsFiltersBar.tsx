'use client';

import { StatutContrat, TypeContrat } from '@/types';
import { TYPES_CONTRAT, CATEGORIES_CONTRAT, type CategorieContrat } from '@/lib/constants/categories-contrat';
import { Search } from 'lucide-react';
import styles from './Contracts.module.css';

interface ContractsFiltersBarProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    statutFilter: StatutContrat | 'TOUS';
    onStatutChange: (statut: StatutContrat | 'TOUS') => void;
    categorieFilter: CategorieContrat | 'TOUS';
    onCategorieChange: (categorie: CategorieContrat | 'TOUS') => void;
    typeFilter: TypeContrat | 'TOUS';
    onTypeChange: (type: TypeContrat | 'TOUS') => void;
    prestataireFilter: string;
    onPrestataireChange: (prestataire: string) => void;
    uniquePrestataires: string[];
}

export default function ContractsFiltersBar({
    searchTerm,
    onSearchChange,
    statutFilter,
    onStatutChange,
    categorieFilter,
    onCategorieChange,
    typeFilter,
    onTypeChange,
    prestataireFilter,
    onPrestataireChange,
    uniquePrestataires
}: ContractsFiltersBarProps) {
    // Filtrer les types selon la catégorie sélectionnée
    const filteredTypes = categorieFilter === 'TOUS'
        ? TYPES_CONTRAT
        : TYPES_CONTRAT.filter(t => t.categorie === categorieFilter);

    return (
        <div className={styles.filtersBar}>
            <div className={styles.searchWrapper}>
                <Search size={18} className={styles.searchIcon} aria-hidden="true" />
                <input type="text" placeholder="Rechercher un contrat..." value={searchTerm} onChange={e => onSearchChange(e.target.value)}
                    className={styles.searchInput}
                />
            </div>

            <div className={styles.filters}>
                <select
                    value={statutFilter}
                    onChange={e => onStatutChange(e.target.value as StatutContrat | 'TOUS')}
                    className={styles.filterSelect}
                >
                    <option value="TOUS">Tous les statuts</option>
                    <option value="ACTIF">Actif</option>
                    <option value="A_RENOUVELER">À renouveler</option>
                    <option value="EXPIRE">Expiré</option>
                    <option value="RESILIE">Résilié</option>
                    <option value="ARCHIVE">Archivé</option>
                    <option value="BROUILLON">Brouillon</option>
                </select>

                <select
                    value={categorieFilter}
                    onChange={e => {
                        onCategorieChange(e.target.value as CategorieContrat | 'TOUS');
                        // Réinitialiser le filtre type si la catégorie change
                        if (e.target.value !== 'TOUS') {
                            onTypeChange('TOUS');
                        }
                    }}
                    className={styles.filterSelect}
                >
                    <option value="TOUS">Toutes les catégories</option>
                    {CATEGORIES_CONTRAT.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                </select>

                <select
                    value={typeFilter}
                    onChange={e => onTypeChange(e.target.value as TypeContrat | 'TOUS')}
                    className={styles.filterSelect}
                >
                    <option value="TOUS">Tous les types</option>
                    {filteredTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                </select>

                <select
                    value={prestataireFilter}
                    onChange={e => onPrestataireChange(e.target.value)}
                    className={styles.filterSelect}
                >
                    <option value="TOUS">Tous les prestataires</option>
                    {uniquePrestataires.map(p => (
                        <option key={p} value={p}>{p}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}
