'use client';

import { ContratDetaille, StatutContrat, TypeContrat } from '@/types';
import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, FileText, Calendar } from 'lucide-react';
import styles from './ContractSelector.module.css';
import clsx from 'clsx';

interface ContractSelectorProps {
    value: string; // ID du contrat sélectionné
    onChange: (contratId: string, contrat: ContratDetaille | null) => void;
    contrats: ContratDetaille[]; // Liste complète des contrats
    placeholder?: string;
    label?: string;
    error?: string;
    required?: boolean;
}

export default function ContractSelector({
    value,
    onChange,
    contrats,
    placeholder = 'Sélectionner un contrat...',
    label,
    error,
    required = false
}: ContractSelectorProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [selectedContrat, setSelectedContrat] = useState<ContratDetaille | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Filtrer les contrats (uniquement ACTIF)
    const filteredContrats = contrats.filter((c) => {
        const isActive = c.statut === 'ACTIF';
        const matchesSearch =
            searchTerm === '' ||
            c.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.fournisseur.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.numeroContrat?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.type.toLowerCase().includes(searchTerm.toLowerCase());
        return isActive && matchesSearch;
    });

    // Initialiser le contrat sélectionné
    useEffect(() => {
        if (value) {
            const contrat = contrats.find(c => c.id === value);
            setSelectedContrat(contrat || null);
            setSearchTerm(contrat?.nom || '');
        } else {
            setSelectedContrat(null);
            setSearchTerm('');
        }
    }, [value, contrats]);

    // Fermer le dropdown au clic extérieur
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                // Restaurer le nom si aucune sélection
                if (selectedContrat) {
                    setSearchTerm(selectedContrat.nom);
                } else {
                    setSearchTerm('');
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [selectedContrat]);

    const handleSelect = (contrat: ContratDetaille) => {
        setSelectedContrat(contrat);
        setSearchTerm(contrat.nom);
        setIsOpen(false);
        onChange(contrat.id, contrat);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setIsOpen(true);
    };

    const handleInputFocus = () => {
        setIsOpen(true);
    };

    const getTypeLabel = (type: TypeContrat): string => {
        const labels: Record<TypeContrat, string> = {
            ASCENSEUR: 'Ascenseur',
            MENAGE: 'Ménage',
            EAU: 'Eau',
            ELECTRICITE: 'Électricité',
            ASSURANCE: 'Assurance',
            ESPACES_VERTS: 'Espaces Verts',
            CHAUFFAGE: 'Chauffage',
            TOITURE: 'Toiture',
            FACADE: 'Façade',
            INTERPHONE: 'Interphone',
            PORTAIL: 'Portail',
            JURIDIQUE: 'Juridique',
            AUTRE: 'Autre'
        };
        return labels[type] || type;
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
                    {filteredContrats.length === 0 ? (
                        <div className={styles.emptyState}>
                            <FileText size={24} aria-hidden="true" />
                            <p>Aucun contrat actif trouvé</p>
                        </div>
                    ) : (
                        <ul className={styles.list}>
                            {filteredContrats.map((contrat) => (
                                <li
                                    key={contrat.id}
                                    className={clsx(
                                        styles.listItem,
                                        value === contrat.id && styles.listItemSelected
                                    )}
                                    onClick={() => handleSelect(contrat)}
                                >
                                    <div className={styles.itemContent}>
                                        <div className={styles.itemHeader}>
                                            <span className={styles.itemName}>{contrat.nom}</span>
                                            <span className={styles.typeBadge}>
                                                {getTypeLabel(contrat.type)}
                                            </span>
                                        </div>
                                        <div className={styles.itemDetails}>
                                            <span className={styles.provider}>
                                                <FileText size={12} aria-hidden="true" />
                                                {contrat.fournisseur}
                                            </span>
                                            <span className={styles.dates}>
                                                <Calendar size={12} aria-hidden="true" />
                                                {formatDate(contrat.dateDebut)} - {formatDate(contrat.dateFin)}
                                            </span>
                                            <span className={styles.cost}>
                                                {contrat.coutAnnuel.toLocaleString('fr-FR')} €/an
                                            </span>
                                        </div>
                                        {contrat.numeroContrat && (
                                            <div className={styles.contractNumber}>
                                                N° {contrat.numeroContrat}
                                            </div>
                                        )}
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
