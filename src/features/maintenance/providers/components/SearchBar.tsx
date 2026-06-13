'use client';

import { Search, X } from 'lucide-react';
import { DOMAINES_ACTIVITE } from '@/lib/constants/domaines-activite';
import clsx from 'clsx';
import styles from './SearchBar.module.css';

interface SearchResult {
    id: string;
    nom: string;
    domaines: string[];
    ville?: string;
    categorie: string;
}

interface SearchBarProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    searchResults: SearchResult[];
    onResultClick: (result: SearchResult) => void;
    onClear: () => void;
}

export function SearchBar({
    searchTerm,
    onSearchChange,
    searchResults,
    onResultClick,
    onClear
}: SearchBarProps) {
    return (
        <div className={styles.searchSection}>
            <div className={styles.searchWrapper}>
                <Search size={20} className={styles.searchIcon} aria-hidden="true" />
                <input
                    type="text"
                    placeholder="Rechercher un prestataire par nom, domaine ou ville..."
                    value={searchTerm}
                    onChange={e => onSearchChange(e.target.value)}
                    className={styles.searchInput}
                />
                {searchTerm && (
                    <button className={styles.searchClear} onClick={onClear}>
                        <X size={18} aria-hidden="true" />
                    </button>
                )}
            </div>

            {searchResults.length > 0 && (
                <div className={styles.searchResults}>
                    {searchResults.map(p => (
                        <button
                            key={p.id}
                            className={styles.searchResultItem}
                            onClick={() => onResultClick(p)}
                        >
                            <div className={styles.resultInfo}>
                                <span className={styles.resultName}>{p.nom}</span>
                                <span className={styles.resultMeta}>
                                    {p.domaines.slice(0, 2).map(d =>
                                        DOMAINES_ACTIVITE.find(da => da.value === d)?.label
                                    ).join(', ')}
                                    {p.ville && ` • ${p.ville}`}
                                </span>
                            </div>
                            <span className={clsx(styles.resultBadge, {
                                [styles.badgeCopro]: p.categorie === 'COPROPRIETE',
                                [styles.badgeSyndic]: p.categorie === 'SYNDIC',
                                [styles.badgeCoproFlex]: p.categorie === 'COPROFLEX'
                            })}>
                                {p.categorie === 'COPROPRIETE' ? 'Copro' : p.categorie === 'SYNDIC' ? 'Syndic' : 'CoproFlex'}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
