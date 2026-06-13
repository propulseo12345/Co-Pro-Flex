'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Search, AlertCircle, Check, X, User, Briefcase } from 'lucide-react';
import {
    type ResolutionTemplate,
    getVariableDefinition,
    MODALITES_PAIEMENT_OPTIONS,
    generateEcheancesDates
} from '@/lib/constants/resolutions';
import { DatePicker } from '@/components/ui/DatePicker';
import { FinancingScheduleEditor, type FinancingSchedule } from '../FinancingScheduleEditor';
import { isValid, parseISO, format } from 'date-fns';
import styles from './VariableEditor.module.css';

interface Coproprietaire {
    id: string;
    nom: string;
    prenom: string;
    presence?: 'PRESENT' | 'REPRESENTE' | 'ABSENT' | 'VOTE_CORRESPONDANCE';
}

interface VariableEditorProps {
    variableName: string;
    variableValue: string;
    resolution: ResolutionTemplate;
    onChange: (value: string) => void;
    onClose: () => void;
    onSave: () => void;
    // Données externes
    coproprietaires?: Coproprietaire[];
    presences?: Record<string, 'PRESENT' | 'REPRESENTE' | 'ABSENT' | 'VOTE_CORRESPONDANCE'>;
    exercice?: string;
    // Callback optionnel pour générer automatiquement les dates d'échéance
    onModaliteChange?: (modalite: string, echeances: string) => void;
    // Nom du gestionnaire/syndic (pour l'option secrétaire de séance)
    gestionnaireNom?: string;
    // Financing schedule support
    financingSchedule?: FinancingSchedule | null;
    onFinancingScheduleChange?: (schedule: FinancingSchedule) => void;
    totalBudget?: number;
}

export default function VariableEditor({
    variableName,
    variableValue,
    resolution,
    onChange,
    onClose,
    onSave,
    coproprietaires = [],
    presences = {},
    exercice = (new Date().getFullYear() + 1).toString(),
    onModaliteChange,
    gestionnaireNom = '',
    financingSchedule = null,
    onFinancingScheduleChange,
    totalBudget = 0,
}: VariableEditorProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [useGestionnaire, setUseGestionnaire] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Déterminer si c'est un rôle AG (président, secrétaire, scrutateur)
    const isRolePresident = variableName === 'nom_president' && resolution.id === 'ag-01';
    const isRoleSecretaire = variableName === 'nom_secretaire' && resolution.id === 'ag-02';
    const isRoleScrutateur = variableName === 'nom_scrutateur' && resolution.id === 'ag-03';
    const isRoleAG = isRolePresident || isRoleSecretaire || isRoleScrutateur;

    // Obtenir la définition de la variable
    const varDef = getVariableDefinition(resolution, variableName);
    const varType = varDef.type;

    // Focus automatique
    useEffect(() => {
        if (varType === 'textarea') {
            textareaRef.current?.focus();
        } else if (varType !== 'coproprietaire' && varType !== 'coproprietaire_present') {
            inputRef.current?.focus();
        }
    }, [varType]);

    // Fermer le dropdown quand on clique ailleurs
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Gestion des touches clavier
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
    }, [onSave, onClose]);

    // Filtrer les copropriétaires selon les présences si nécessaire
    const getFilteredCoproprietaires = useCallback(() => {
        let filtered = [...coproprietaires];

        // Filtrer par présence si le type est coproprietaire_present
        if (varType === 'coproprietaire_present' || varDef.filterPresents) {
            filtered = filtered.filter(c => {
                const presence = presences[c.id];
                return presence === 'PRESENT' || presence === 'REPRESENTE';
            });
        }

        // Filtrer par recherche
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(c =>
                c.nom.toLowerCase().includes(term) ||
                c.prenom.toLowerCase().includes(term) ||
                `${c.prenom} ${c.nom}`.toLowerCase().includes(term)
            );
        }

        return filtered;
    }, [coproprietaires, presences, varType, varDef.filterPresents, searchTerm]);

    // Sélection d'un copropriétaire
    const handleSelectCoproprietaire = (copro: Coproprietaire) => {
        // Pour les rôles AG (président, secrétaire, scrutateur), inclure le copro_id
        // pour permettre la synchronisation vers ag_meetings
        if (isRoleAG) {
            onChange(`${copro.id}|${copro.prenom} ${copro.nom}`);
        } else {
            onChange(`${copro.prenom} ${copro.nom}`);
        }
        setShowDropdown(false);
        setSearchTerm('');
    };

    // Changement de modalité de paiement
    const handleModaliteChange = (value: string) => {
        onChange(value);
        // Générer automatiquement les dates d'échéance si callback fourni
        if (onModaliteChange) {
            const echeances = generateEcheancesDates(value, exercice);
            onModaliteChange(value, echeances);
        }
    };

    // Vérifier si des copropriétaires sont présents
    const hasPresents = coproprietaires.some(c => {
        const presence = presences[c.id];
        return presence === 'PRESENT' || presence === 'REPRESENTE';
    });

    // Gestion du toggle gestionnaire pour le secrétaire
    const handleToggleGestionnaire = (checked: boolean) => {
        setUseGestionnaire(checked);
        if (checked && gestionnaireNom) {
            // Pré-remplir avec le gestionnaire + qualité
            onChange(`${gestionnaireNom} (Syndic / Gestionnaire)`);
        } else {
            // Vider pour permettre la sélection d'un copropriétaire
            onChange('');
        }
    };

    // Rendu selon le type de variable
    const renderInput = () => {
        switch (varType) {
            // ===== Sélection de copropriétaire =====
            case 'coproprietaire':
            case 'coproprietaire_present':
                const filteredCopros = getFilteredCoproprietaires();
                const needsPresents = varType === 'coproprietaire_present' || varDef.filterPresents || isRoleAG;

                // Afficher le warning si aucun présent ET pas d'option gestionnaire active
                if (needsPresents && !hasPresents && !useGestionnaire) {
                    return (
                        <div className={styles.roleSelectionContainer}>
                            {/* Option gestionnaire pour le secrétaire uniquement */}
                            {isRoleSecretaire && (
                                <div className={styles.gestionnaireOption}>
                                    <label className={styles.gestionnaireCheckbox}>
                                        <input
                                            type="checkbox"
                                            checked={useGestionnaire}
                                            onChange={(e) => handleToggleGestionnaire(e.target.checked)}
                                        />
                                        <Briefcase size={16} aria-hidden="true" />
                                        <span>Désigner le gestionnaire / syndic comme secrétaire de séance</span>
                                    </label>
                                    {!gestionnaireNom && useGestionnaire && (
                                        <p className={styles.gestionnaireHint}>
                                            Le nom du gestionnaire sera utilisé comme secrétaire de séance.
                                        </p>
                                    )}
                                </div>
                            )}
                            <div className={styles.warningMessage}>
                                <AlertCircle size={16} aria-hidden="true" />
                                <span>Veuillez définir les présences avant de sélectionner un {varDef.label?.toLowerCase() || 'participant'}</span>
                            </div>
                        </div>
                    );
                }

                return (
                    <div className={styles.roleSelectionContainer}>
                        {/* Option gestionnaire pour le secrétaire uniquement */}
                        {isRoleSecretaire && (
                            <div className={styles.gestionnaireOption}>
                                <label className={styles.gestionnaireCheckbox}>
                                    <input
                                        type="checkbox"
                                        checked={useGestionnaire}
                                        onChange={(e) => handleToggleGestionnaire(e.target.checked)}
                                    />
                                    <Briefcase size={16} aria-hidden="true" />
                                    <span>Désigner le gestionnaire / syndic comme secrétaire de séance</span>
                                </label>
                            </div>
                        )}

                        {/* Afficher la sélection de copropriétaire si gestionnaire non coché */}
                        {!useGestionnaire && (
                            <div className={styles.dropdownContainer} ref={dropdownRef}>
                                <div className={styles.searchInputWrapper}>
                                    <Search size={16} className={styles.searchIcon} aria-hidden="true" />
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={searchTerm || variableValue}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setShowDropdown(true);
                                        }}
                                        onFocus={() => setShowDropdown(true)}
                                        onKeyDown={handleKeyDown}
                                        className={styles.searchInput}
                                        placeholder={`Rechercher ${varDef.label?.toLowerCase() || 'un copropriétaire'}...`}
                                    />
                                    <ChevronDown size={16} className={styles.chevronIcon} aria-hidden="true" />
                                </div>
                                {showDropdown && (
                                    <div className={styles.dropdown}>
                                        {filteredCopros.length === 0 ? (
                                            <div className={styles.dropdownEmpty}>
                                                {needsPresents && coproprietaires.length > 0
                                                    ? 'Aucun copropriétaire présent ou représenté'
                                                    : 'Aucun résultat'}
                                            </div>
                                        ) : (
                                            filteredCopros.map(copro => (
                                                <button
                                                    key={copro.id}
                                                    type="button"
                                                    className={styles.dropdownItem}
                                                    onClick={() => handleSelectCoproprietaire(copro)}
                                                >
                                                    <User size={14} className={styles.coproIcon} aria-hidden="true" />
                                                    <span className={styles.coproName}>{copro.prenom} {copro.nom}</span>
                                                    {presences[copro.id] && (
                                                        <span className={`${styles.presenceBadge} ${styles[`presence${presences[copro.id]}`]}`}>
                                                            {presences[copro.id] === 'PRESENT' ? 'Présent' :
                                                             presences[copro.id] === 'REPRESENTE' ? 'Représenté' :
                                                             presences[copro.id] === 'VOTE_CORRESPONDANCE' ? 'Vote par correspondance' : 'Absent'}
                                                        </span>
                                                    )}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Affichage quand gestionnaire est sélectionné */}
                        {useGestionnaire && gestionnaireNom && (
                            <div className={styles.gestionnaireSelected}>
                                <Briefcase size={16} aria-hidden="true" />
                                <span>{gestionnaireNom} (Syndic / Gestionnaire)</span>
                            </div>
                        )}
                    </div>
                );

            // ===== Date =====
            case 'date': {
                // Convertir la valeur string (YYYY-MM-DD) en Date
                const parseDateValue = (): Date | null => {
                    if (!variableValue) return null;
                    const parsed = parseISO(variableValue);
                    return isValid(parsed) ? parsed : null;
                };

                return (
                    <div className={styles.datePickerWrapper}>
                        <DatePicker
                            label={varDef.label || 'Date'}
                            value={parseDateValue()}
                            onChange={(date) => {
                                if (date && isValid(date)) {
                                    onChange(format(date, 'yyyy-MM-dd'));
                                } else {
                                    onChange('');
                                }
                            }}
                            required={varDef.required}
                            hint={varDef.placeholder}
                        />
                    </div>
                );
            }

            // ===== Montant =====
            case 'montant':
                return (
                    <div className={styles.montantInputWrapper}>
                        <input
                            ref={inputRef}
                            type="text"
                            inputMode="decimal"
                            value={variableValue}
                            onChange={(e) => {
                                // Autoriser uniquement les chiffres, espaces, virgule et point
                                const cleaned = e.target.value.replace(/[^\d\s,.\-]/g, '');
                                onChange(cleaned);
                            }}
                            onKeyDown={handleKeyDown}
                            className={styles.montantInput}
                            placeholder="0,00"
                        />
                        <span className={styles.montantSuffix}>€</span>
                    </div>
                );

            // ===== Pourcentage =====
            case 'pourcentage':
                return (
                    <div className={styles.pourcentageInputWrapper}>
                        <input
                            ref={inputRef}
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={variableValue}
                            onChange={(e) => onChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className={styles.pourcentageInput}
                            placeholder="0"
                        />
                        <span className={styles.pourcentageSuffix}>%</span>
                    </div>
                );

            // ===== Numéro =====
            case 'numero':
                return (
                    <input
                        ref={inputRef}
                        type="number"
                        min="0"
                        step="1"
                        value={variableValue}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className={styles.numeroInput}
                        placeholder={varDef.placeholder || '0'}
                    />
                );

            // ===== Durée en mois =====
            case 'duree_mois':
                const isMandatDuree = variableName.includes('mandat');
                const maxMois = isMandatDuree ? 36 : undefined;
                return (
                    <div className={styles.dureeInputWrapper}>
                        <input
                            ref={inputRef}
                            type="number"
                            min={1}
                            max={maxMois}
                            step="1"
                            value={variableValue}
                            onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (isMandatDuree && val > 36) {
                                    onChange('36');
                                } else {
                                    onChange(e.target.value);
                                }
                            }}
                            onKeyDown={handleKeyDown}
                            className={styles.dureeInput}
                            placeholder={isMandatDuree ? '12' : '1'}
                            aria-describedby={isMandatDuree ? 'duree-mandat-hint' : undefined}
                        />
                        <span className={styles.dureeSuffix}>mois</span>
                        {isMandatDuree && (
                            <span id="duree-mandat-hint" className={styles.dureeHint}>
                                (max. 36 mois)
                            </span>
                        )}
                    </div>
                );

            // ===== Durée en années =====
            case 'duree_ans':
                return (
                    <div className={styles.dureeInputWrapper}>
                        <input
                            ref={inputRef}
                            type="number"
                            min="1"
                            step="1"
                            value={variableValue}
                            onChange={(e) => onChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className={styles.dureeInput}
                            placeholder="1"
                        />
                        <span className={styles.dureeSuffix}>an(s)</span>
                    </div>
                );

            // ===== Modalités de paiement =====
            case 'modalites_paiement':
                return (
                    <select
                        value={variableValue}
                        onChange={(e) => handleModaliteChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className={styles.selectInput}
                    >
                        <option value="">Sélectionner une modalité...</option>
                        {MODALITES_PAIEMENT_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                );

            // ===== Modalités de paiement budget avec échéancier =====
            case 'modalites_paiement_budget':
                return (
                    <div className={styles.financingEditorWrapper}>
                        <select
                            value={variableValue}
                            onChange={(e) => handleModaliteChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className={styles.selectInput}
                        >
                            <option value="">Sélectionner une modalité...</option>
                            {MODALITES_PAIEMENT_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>

                        {/* Show FinancingScheduleEditor when a frequency is selected */}
                        {variableValue && onFinancingScheduleChange && (
                            <div className={styles.scheduleEditorContainer}>
                                <FinancingScheduleEditor
                                    value={financingSchedule}
                                    onChange={onFinancingScheduleChange}
                                    totalBudget={totalBudget}
                                    exerciceYear={parseInt(exercice) || new Date().getFullYear() + 1}
                                />
                            </div>
                        )}
                    </div>
                );

            // ===== Textarea (texte long) =====
            case 'textarea':
                return (
                    <textarea
                        ref={textareaRef}
                        value={variableValue}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={(e) => {
                            // Pour textarea, Shift+Enter = nouvelle ligne, Enter seul = sauvegarder
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                onSave();
                            } else if (e.key === 'Escape') {
                                e.preventDefault();
                                onClose();
                            }
                        }}
                        className={styles.textareaInput}
                        placeholder={varDef.placeholder || 'Saisissez votre texte...'}
                        rows={4}
                    />
                );

            // ===== Gestionnaire/Syndic =====
            case 'gestionnaire':
                return (
                    <input
                        ref={inputRef}
                        type="text"
                        value={variableValue}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className={styles.textInput}
                        placeholder={varDef.placeholder || 'Nom du syndic ou gestionnaire'}
                    />
                );

            // ===== Texte par défaut =====
            case 'text':
            default:
                return (
                    <input
                        ref={inputRef}
                        type="text"
                        value={variableValue}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className={styles.textInput}
                        placeholder={varDef.placeholder || `Saisissez ${varDef.label?.toLowerCase() || 'une valeur'}...`}
                    />
                );
        }
    };

    return (
        <div className={styles.editorContainer}>
            <div className={styles.editorHeader}>
                <label className={styles.label}>
                    {varDef.label || variableName}
                    {varDef.required && <span className={styles.required}>*</span>}
                </label>
            </div>
            <div className={styles.editorContent}>
                {renderInput()}
            </div>
            <div className={styles.editorActions}>
                <button
                    type="button"
                    onClick={onSave}
                    className={styles.saveButton}
                    title="Valider (Entrée)"
                >
                    <Check size={16} aria-hidden="true" />
                    Valider
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    className={styles.cancelButton}
                    title="Annuler (Échap)"
                >
                    <X size={16} aria-hidden="true" />
                    Annuler
                </button>
            </div>
        </div>
    );
}
