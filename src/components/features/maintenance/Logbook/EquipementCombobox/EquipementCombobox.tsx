'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Plus, Package, Loader2, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import type { EquipementComboboxProps, EquipementOption } from '../types';
import styles from './EquipementCombobox.module.css';

/**
 * Combobox avec autocomplétion pour sélectionner ou créer un équipement
 * - Permet de rechercher parmi les équipements existants
 * - Permet de créer un nouvel équipement à la volée
 */
export function EquipementCombobox({
    value,
    equipementsPrincipaux,
    onChange,
    placeholder = 'Rechercher ou créer un équipement...',
    disabled = false,
    error,
}: EquipementComboboxProps) {
    const [recherche, setRecherche] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const rechercheDebounced = useDebounce(recherche, 300);

    // Simulation d'un chargement (pour compatibilité future avec Supabase)
    useEffect(() => {
        if (rechercheDebounced) {
            setIsLoading(true);
            const timer = setTimeout(() => setIsLoading(false), 100);
            return () => clearTimeout(timer);
        }
    }, [rechercheDebounced]);

    // Construction des options avec filtrage et option "Créer"
    const options = useMemo((): EquipementOption[] => {
        const rechercheNormalisee = rechercheDebounced.trim().toLowerCase();

        // Filtrer les équipements existants
        const equipementsFiltres = rechercheNormalisee
            ? equipementsPrincipaux.filter(eq =>
                eq.toLowerCase().includes(rechercheNormalisee)
            )
            : equipementsPrincipaux;

        // Créer les options à partir des équipements filtrés
        const liste: EquipementOption[] = equipementsFiltres.map(eq => ({
            value: eq,
            label: eq,
            equipement: {
                id: eq,
                nom: eq,
                estReference: true, // Équipements existants sont "référencés"
            },
            estNouveau: false,
        }));

        // Ajouter option de création si texte non trouvé exactement
        const existeDeja = equipementsPrincipaux.some(
            eq => eq.toLowerCase() === rechercheNormalisee
        );

        if (recherche.trim() && !existeDeja) {
            liste.push({
                value: '__new__',
                label: `Créer "${recherche.trim()}"`,
                estNouveau: true,
            });
        }

        return liste;
    }, [equipementsPrincipaux, rechercheDebounced, recherche]);

    // Fermer au clic extérieur
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                // Réinitialiser la recherche si aucune sélection
                if (!value) {
                    setRecherche('');
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [value]);

    // Reset highlighted index quand les options changent
    useEffect(() => {
        setHighlightedIndex(-1);
    }, [options.length]);

    // Scroll vers l'élément highlighted
    useEffect(() => {
        if (highlightedIndex >= 0 && listRef.current) {
            const items = listRef.current.querySelectorAll('[role="option"]');
            const item = items[highlightedIndex] as HTMLElement | undefined;
            if (item) {
                item.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex]);

    // Sélection d'une option
    const handleSelect = (option: EquipementOption) => {
        if (option.estNouveau) {
            // Créer le nouvel équipement avec le texte saisi
            onChange(recherche.trim());
        } else {
            onChange(option.value);
        }
        setRecherche('');
        setIsOpen(false);
        setHighlightedIndex(-1);
    };

    // Effacer la sélection
    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setRecherche('');
        inputRef.current?.focus();
    };

    // Navigation clavier
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev < options.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev > 0 ? prev - 1 : options.length - 1
                );
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && options[highlightedIndex]) {
                    handleSelect(options[highlightedIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setHighlightedIndex(-1);
                break;
            case 'Tab':
                setIsOpen(false);
                break;
        }
    };

    // Affichage de la valeur dans l'input
    const displayValue = isOpen ? recherche : value;

    return (
        <div className={styles.container} ref={containerRef}>
            <label className={styles.label}>Équipement concerné</label>

            <div className={`${styles.inputWrapper} ${error ? styles.inputError : ''}`}>
                <Search size={18} className={styles.iconSearch} aria-hidden="true" />

                <input
                    ref={inputRef}
                    type="text"
                    value={displayValue}
                    onChange={(e) => {
                        setRecherche(e.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={styles.input}
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-haspopup="listbox"
                    aria-autocomplete="list"
                    aria-controls="equipement-listbox"
                    aria-activedescendant={
                        highlightedIndex >= 0 ? `equipement-option-${highlightedIndex}` : undefined
                    }
                />

                {isLoading && (
                    <Loader2 size={18} className={styles.iconLoading} aria-hidden="true" />
                )}

                {value && !isOpen && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className={styles.clearBtn}
                        aria-label="Effacer la sélection"
                    >
                        <X size={16} aria-hidden="true" />
                    </button>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && (
                <ul
                    ref={listRef}
                    className={styles.dropdown}
                    role="listbox"
                    id="equipement-listbox"
                    aria-label="Liste des équipements"
                >
                    {options.length === 0 && recherche.trim() && !isLoading && (
                        <li className={styles.noResult}>
                            Aucun équipement trouvé
                        </li>
                    )}

                    {options.length === 0 && !recherche.trim() && (
                        <li className={styles.noResult}>
                            Tapez pour rechercher ou créer un équipement
                        </li>
                    )}

                    {options.map((option, index) => (
                        <li
                            key={option.value}
                            id={`equipement-option-${index}`}
                            role="option"
                            aria-selected={highlightedIndex === index}
                        >
                            <button
                                type="button"
                                onClick={() => handleSelect(option)}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                className={`${styles.option} ${option.estNouveau ? styles.optionNouveau : ''} ${highlightedIndex === index ? styles.optionHighlighted : ''}`}
                            >
                                {option.estNouveau ? (
                                    <Plus size={16} className={styles.iconPlus} aria-hidden="true" />
                                ) : (
                                    <Package size={16} className={styles.iconPackage} aria-hidden="true" />
                                )}
                                <span className={styles.optionLabel}>{option.label}</span>
                                {option.equipement?.estReference && (
                                    <span className={styles.badge}>Référencé</span>
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {error && <p className={styles.errorMessage}>{error}</p>}
        </div>
    );
}

export default EquipementCombobox;
