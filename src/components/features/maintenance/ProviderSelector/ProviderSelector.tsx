'use client';

import { Prestataire, CategoriePrestataire } from '@/types';
import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Building2, Users, Star } from 'lucide-react';
import styles from './ProviderSelector.module.css';
import clsx from 'clsx';

interface ProviderSelectorProps {
    value: string; // ID du prestataire sélectionné
    onChange: (prestataireId: string, prestataire: Prestataire | null) => void;
    prestataires: Prestataire[]; // Liste complète des prestataires
    categories?: CategoriePrestataire[]; // Filtrer par catégories
    placeholder?: string;
    label?: string;
    error?: string;
    required?: boolean;
}

export default function ProviderSelector({
    value,
    onChange,
    prestataires,
    categories,
    placeholder = 'Sélectionner un prestataire...',
    label,
    error,
    required = false
}: ProviderSelectorProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [selectedPrestataire, setSelectedPrestataire] = useState<Prestataire | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Filtrer les prestataires
    const filteredPrestataires = prestataires.filter((p) => {
        const matchesCategory = !categories || categories.includes(p.categorie);
        const matchesSearch =
            searchTerm === '' ||
            p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.domaines.some(d => d.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    // Initialiser le prestataire sélectionné
    useEffect(() => {
        if (value) {
            const prestataire = prestataires.find(p => p.id === value);
            setSelectedPrestataire(prestataire || null);
            setSearchTerm(prestataire?.nom || '');
        } else {
            setSelectedPrestataire(null);
            setSearchTerm('');
        }
    }, [value, prestataires]);

    // Fermer le dropdown au clic extérieur
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                // Restaurer le nom si aucune sélection
                if (selectedPrestataire) {
                    setSearchTerm(selectedPrestataire.nom);
                } else {
                    setSearchTerm('');
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [selectedPrestataire]);

    const handleSelect = (prestataire: Prestataire) => {
        setSelectedPrestataire(prestataire);
        setSearchTerm(prestataire.nom);
        setIsOpen(false);
        onChange(prestataire.id, prestataire);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setIsOpen(true);
    };

    const handleInputFocus = () => {
        setIsOpen(true);
    };

    const getCategorieIcon = (categorie: CategoriePrestataire) => {
        switch (categorie) {
            case 'SYNDIC':
                return <Building2 size={14} aria-hidden="true" />;
            case 'COPROPRIETE':
                return <Users size={14} aria-hidden="true" />;
            case 'COPROFLEX':
                return <Star size={14} aria-hidden="true" />;
        }
    };

    const getCategorieLabel = (categorie: CategoriePrestataire) => {
        switch (categorie) {
            case 'SYNDIC':
                return 'Syndic';
            case 'COPROPRIETE':
                return 'Copro';
            case 'COPROFLEX':
                return 'CoproFlex';
        }
    };

    return (
        <div className={styles.container} ref={dropdownRef}>
            {label && (
                <label className={styles.label}>
                    {label}
                    {required && <span className={styles.required}>*</span>}
                </label>
            )}

            <div className={styles.inputWrapper}>
                <Search size={18} className={styles.searchIcon} aria-hidden="true" />
                <input
                    type="text"
                    className={clsx(styles.input, error && styles.inputError)}
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    placeholder={placeholder}
                />
                <ChevronDown size={18}
                    className={clsx(styles.chevron, isOpen && styles.chevronOpen)} aria-hidden="true" />
            </div>

            {error && <span className={styles.errorText}>{error}</span>}

            {isOpen && (
                <div className={styles.dropdown}>
                    {filteredPrestataires.length === 0 ? (
                        <div className={styles.emptyState}>
                            <Search size={24} aria-hidden="true" />
                            <p>Aucun prestataire trouvé</p>
                        </div>
                    ) : (
                        <ul className={styles.list}>
                            {filteredPrestataires.map((prestataire) => (
                                <li
                                    key={prestataire.id}
                                    className={clsx(
                                        styles.listItem,
                                        value === prestataire.id && styles.listItemSelected
                                    )}
                                    onClick={() => handleSelect(prestataire)}
                                >
                                    <div className={styles.itemContent}>
                                        <div className={styles.itemHeader}>
                                            <span className={styles.itemName}>{prestataire.nom}</span>
                                            <span className={clsx(
                                                styles.categorieBadge,
                                                styles[`categorie${prestataire.categorie}`]
                                            )}>
                                                {getCategorieIcon(prestataire.categorie)}
                                                {getCategorieLabel(prestataire.categorie)}
                                            </span>
                                        </div>
                                        <div className={styles.itemDetails}>
                                            <span className={styles.domaines}>
                                                {prestataire.domaines.slice(0, 2).join(', ')}
                                                {prestataire.domaines.length > 2 && ` +${prestataire.domaines.length - 2}`}
                                            </span>
                                            {prestataire.noteMoyenne && (
                                                <span className={styles.note}>
                                                    <Star size={12} fill="currentColor" aria-hidden="true" />
                                                    {prestataire.noteMoyenne.toFixed(1)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
