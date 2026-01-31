'use client';

import { useState, useMemo } from 'react';
import { Plus, AlertCircle, Search, X } from 'lucide-react';
import type { CoproprietaireForPouvoir } from '@/hooks/modules/usePouvoirs';
import type { PouvoirValidationResult } from '@/types/models/ag';
import styles from './Pouvoirs.module.css';

interface AddPowerFormProps {
    coproprietaires: CoproprietaireForPouvoir[];
    onAdd: (mandantId: string, mandataireId: string, signedAt?: string) => PouvoirValidationResult | Promise<PouvoirValidationResult>;
    validate: (mandantId: string, mandataireId: string) => PouvoirValidationResult;
}

export function AddPowerForm({ coproprietaires, onAdd, validate }: AddPowerFormProps) {
    const [mandantId, setMandantId] = useState('');
    const [mandataireId, setMandataireId] = useState('');
    const [signedAt, setSignedAt] = useState('');
    const [mandantSearch, setMandantSearch] = useState('');
    const [mandataireSearch, setMandataireSearch] = useState('');
    const [showMandantDropdown, setShowMandantDropdown] = useState(false);
    const [showMandataireDropdown, setShowMandataireDropdown] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Copropriétaires disponibles comme mandants (n'ont pas encore donné de pouvoir)
    const availableMandants = useMemo(() => {
        return coproprietaires.filter(c => !c.aDonnePouvoir);
    }, [coproprietaires]);

    // Copropriétaires disponibles comme mandataires (peuvent encore recevoir)
    const availableMandataires = useMemo(() => {
        return coproprietaires.filter(c => c.peutRecevoirPouvoir && c.id !== mandantId);
    }, [coproprietaires, mandantId]);

    // Filtrer par recherche
    const filteredMandants = useMemo(() => {
        if (!mandantSearch) return availableMandants;
        const search = mandantSearch.toLowerCase();
        return availableMandants.filter(
            c => c.nom.toLowerCase().includes(search) || c.lot.toLowerCase().includes(search)
        );
    }, [availableMandants, mandantSearch]);

    const filteredMandataires = useMemo(() => {
        if (!mandataireSearch) return availableMandataires;
        const search = mandataireSearch.toLowerCase();
        return availableMandataires.filter(
            c => c.nom.toLowerCase().includes(search) || c.lot.toLowerCase().includes(search)
        );
    }, [availableMandataires, mandataireSearch]);

    // Copropriétaire sélectionné
    const selectedMandant = coproprietaires.find(c => c.id === mandantId);
    const selectedMandataire = coproprietaires.find(c => c.id === mandataireId);

    // Validation en temps réel
    const liveValidation = useMemo(() => {
        if (!mandantId || !mandataireId) return null;
        return validate(mandantId, mandataireId);
    }, [mandantId, mandataireId, validate]);

    const handleSelectMandant = (id: string) => {
        setMandantId(id);
        setMandantSearch('');
        setShowMandantDropdown(false);
        setErrors([]);

        // Si le mandataire actuel n'est plus valide, le réinitialiser
        if (id === mandataireId) {
            setMandataireId('');
        }
    };

    const handleSelectMandataire = (id: string) => {
        setMandataireId(id);
        setMandataireSearch('');
        setShowMandataireDropdown(false);
        setErrors([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!mandantId || !mandataireId) {
            setErrors(['Veuillez sélectionner un mandant et un mandataire']);
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await onAdd(mandantId, mandataireId, signedAt || undefined);

            if (!result.ok) {
                setErrors(result.errors.map(err => err.message));
            } else {
                // Reset form
                setMandantId('');
                setMandataireId('');
                setSignedAt('');
                setMandantSearch('');
                setMandataireSearch('');
                setErrors([]);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const clearMandant = () => {
        setMandantId('');
        setMandantSearch('');
        setErrors([]);
    };

    const clearMandataire = () => {
        setMandataireId('');
        setMandataireSearch('');
        setErrors([]);
    };

    return (
        <form onSubmit={handleSubmit} className={styles.addForm}>
            <h4 className={styles.addFormTitle}>
                <Plus size={18} aria-hidden="true" />
                Ajouter un pouvoir
            </h4>

            <div className={styles.addFormFields}>
                {/* Mandant */}
                <div className={styles.formField}>
                    <label className={styles.formLabel}>
                        Mandant <span className={styles.formLabelHint}>(donne le pouvoir)</span>
                    </label>
                    <div className={styles.searchSelectWrapper}>
                        {selectedMandant ? (
                            <div className={styles.selectedValue}>
                                <span>{selectedMandant.nom} (Lot {selectedMandant.lot})</span>
                                <button
                                    type="button"
                                    onClick={clearMandant}
                                    className={styles.clearButton}
                                    aria-label="Effacer"
                                >
                                    <X size={16} aria-hidden="true" />
                                </button>
                            </div>
                        ) : (
                            <div className={styles.searchInputWrapper}>
                                <Search size={16} className={styles.searchIcon} aria-hidden="true" />
                                <input
                                    type="text"
                                    placeholder="Rechercher un copropriétaire..."
                                    value={mandantSearch}
                                    onChange={e => {
                                        setMandantSearch(e.target.value);
                                        setShowMandantDropdown(true);
                                    }}
                                    onFocus={() => setShowMandantDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowMandantDropdown(false), 200)}
                                    className={styles.searchInput}
                                />
                            </div>
                        )}
                        {showMandantDropdown && !selectedMandant && (
                            <div className={styles.dropdown}>
                                {filteredMandants.length === 0 ? (
                                    <div className={styles.dropdownEmpty}>
                                        {availableMandants.length === 0
                                            ? 'Tous les copropriétaires ont déjà donné leur pouvoir'
                                            : 'Aucun résultat'}
                                    </div>
                                ) : (
                                    filteredMandants.map(c => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => handleSelectMandant(c.id)}
                                            className={styles.dropdownItem}
                                        >
                                            <span className={styles.dropdownItemName}>{c.nom}</span>
                                            <span className={styles.dropdownItemMeta}>
                                                Lot {c.lot} • {c.tantiemes} t.
                                            </span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Mandataire */}
                <div className={styles.formField}>
                    <label className={styles.formLabel}>
                        Mandataire <span className={styles.formLabelHint}>(reçoit le pouvoir)</span>
                    </label>
                    <div className={styles.searchSelectWrapper}>
                        {selectedMandataire ? (
                            <div className={styles.selectedValue}>
                                <span>
                                    {selectedMandataire.nom} (Lot {selectedMandataire.lot})
                                    <span className={styles.pouvoirCount}>
                                        {selectedMandataire.pouvoirsRecus}/3 pouvoirs
                                    </span>
                                </span>
                                <button
                                    type="button"
                                    onClick={clearMandataire}
                                    className={styles.clearButton}
                                    aria-label="Effacer"
                                >
                                    <X size={16} aria-hidden="true" />
                                </button>
                            </div>
                        ) : (
                            <div className={styles.searchInputWrapper}>
                                <Search size={16} className={styles.searchIcon} aria-hidden="true" />
                                <input
                                    type="text"
                                    placeholder="Rechercher un copropriétaire..."
                                    value={mandataireSearch}
                                    onChange={e => {
                                        setMandataireSearch(e.target.value);
                                        setShowMandataireDropdown(true);
                                    }}
                                    onFocus={() => setShowMandataireDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowMandataireDropdown(false), 200)}
                                    className={styles.searchInput}
                                    disabled={!mandantId}
                                />
                            </div>
                        )}
                        {showMandataireDropdown && !selectedMandataire && mandantId && (
                            <div className={styles.dropdown}>
                                {filteredMandataires.length === 0 ? (
                                    <div className={styles.dropdownEmpty}>
                                        {availableMandataires.length === 0
                                            ? 'Aucun mandataire disponible'
                                            : 'Aucun résultat'}
                                    </div>
                                ) : (
                                    filteredMandataires.map(c => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => handleSelectMandataire(c.id)}
                                            className={`${styles.dropdownItem} ${c.pouvoirsRecus >= 2 ? styles.dropdownItemWarning : ''}`}
                                        >
                                            <span className={styles.dropdownItemName}>{c.nom}</span>
                                            <span className={styles.dropdownItemMeta}>
                                                Lot {c.lot} • {c.pouvoirsRecus}/3 pouvoirs
                                            </span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Date de signature (optionnel) */}
                <div className={styles.formField}>
                    <label className={styles.formLabel}>
                        Date de signature <span className={styles.formLabelHint}>(optionnel)</span>
                    </label>
                    <input
                        type="date"
                        value={signedAt}
                        onChange={e => setSignedAt(e.target.value)}
                        className={styles.dateInput}
                    />
                </div>
            </div>

            {/* Erreurs de validation */}
            {(errors.length > 0 || (liveValidation && !liveValidation.ok)) && (
                <div className={styles.formErrors}>
                    <AlertCircle size={16} aria-hidden="true" />
                    <div className={styles.formErrorsList}>
                        {errors.length > 0
                            ? errors.map((err, i) => <span key={i}>{err}</span>)
                            : liveValidation?.errors.map((err, i) => <span key={i}>{err.message}</span>)}
                    </div>
                </div>
            )}

            <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || !mandantId || !mandataireId || (liveValidation !== null && !liveValidation.ok)}
            >
                <Plus size={18} aria-hidden="true" />
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer le pouvoir'}
            </button>
        </form>
    );
}

export default AddPowerForm;
