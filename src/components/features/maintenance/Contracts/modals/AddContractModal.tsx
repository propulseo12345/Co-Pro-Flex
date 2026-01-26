'use client';

import { useState } from 'react';
import { ContratDetaille, TypeContrat } from '@/types';
import { MOCK_TYPES_CONTRAT } from '@/data/mock';
import { Plus, Upload, X } from 'lucide-react';
import { DateRangePicker } from '@/components/ui/DatePicker';
import { isValid, parseISO, format } from 'date-fns';
import clsx from 'clsx';
import styles from '../Contracts.module.css';
import { generateId } from '../utils';

interface AddContractModalProps {
    isOpen: boolean;
    onClose: () => void;
    prestataires: { id: string; nom: string }[];
    onAdd: (contrat: ContratDetaille) => void;
}

export default function AddContractModal({ isOpen, onClose, prestataires, onAdd }: AddContractModalProps) {
    const [formData, setFormData] = useState({
        libelle: '',
        numeroContrat: '',
        type: '' as TypeContrat | '',
        prestataireId: '',
        description: '',
        conditionsParticulieres: '',
        dateDebut: '',
        dateFin: '',
        taciteReconduction: false,
        delaiResiliation: 30,
        coutAnnuel: '',
        fichierPDF: '',
        estReglementaire: false
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    if (!isOpen) return null;

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!formData.libelle.trim()) newErrors.libelle = 'Le libellé est requis';
        if (!formData.type) newErrors.type = 'Le type est requis';
        if (!formData.prestataireId) newErrors.prestataireId = 'Le prestataire est requis';
        if (!formData.dateDebut) newErrors.dateDebut = 'La date de début est requise';
        if (!formData.dateFin) newErrors.dateFin = 'La date de fin est requise';
        if (!formData.coutAnnuel || parseFloat(formData.coutAnnuel) <= 0) {
            newErrors.coutAnnuel = 'Le coût annuel est requis';
        }
        if (formData.dateDebut && formData.dateFin && formData.dateDebut > formData.dateFin) {
            newErrors.dateFin = 'La date de fin doit être après la date de début';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        const prestataire = prestataires.find(p => p.id === formData.prestataireId);

        const newContrat: ContratDetaille = {
            id: generateId(),
            nom: formData.libelle,
            numeroContrat: formData.numeroContrat || undefined,
            prestataireId: formData.prestataireId,
            fournisseur: prestataire?.nom || '',
            type: formData.type as TypeContrat,
            dateDebut: formData.dateDebut,
            dateFin: formData.dateFin,
            coutAnnuel: parseFloat(formData.coutAnnuel),
            statut: 'ACTIF',
            description: formData.description || undefined,
            conditionsParticulieres: formData.conditionsParticulieres || undefined,
            taciteReconduction: formData.taciteReconduction,
            delaiResiliation: formData.delaiResiliation,
            fichierPDF: formData.fichierPDF || undefined,
            dateUploadPDF: formData.fichierPDF ? new Date().toISOString() : undefined,
            interventionIds: [],
            pieceJointes: [],
            estReglementaire: formData.estReglementaire
        };

        onAdd(newContrat);

        // Reset form
        setFormData({
            libelle: '',
            numeroContrat: '',
            type: '',
            prestataireId: '',
            description: '',
            conditionsParticulieres: '',
            dateDebut: '',
            dateFin: '',
            taciteReconduction: false,
            delaiResiliation: 30,
            coutAnnuel: '',
            fichierPDF: '',
            estReglementaire: false
        });
        setErrors({});
        onClose();
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modal}>
                <div className={styles.modalHeader}>
                    <h2>Ajouter un contrat</h2>
                    <button className={styles.modalClose} onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit} className={styles.modalContent}>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label>Libellé du contrat *</label>
                            <input
                                type="text"
                                value={formData.libelle}
                                onChange={e => setFormData({ ...formData, libelle: e.target.value })}
                                placeholder="Ex: Maintenance Ascenseur"
                                className={errors.libelle ? styles.inputError : ''}
                            />
                            {errors.libelle && <span className={styles.errorText}>{errors.libelle}</span>}
                        </div>

                        <div className={styles.formGroup}>
                            <label>Numéro de contrat</label>
                            <input
                                type="text"
                                value={formData.numeroContrat}
                                onChange={e => setFormData({ ...formData, numeroContrat: e.target.value })}
                                placeholder="Ex: CT-2024-001"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Type *</label>
                            <select
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value as TypeContrat})}
                                className={errors.type ? styles.inputError : ''}
                            >
                                <option value="">Sélectionner un type</option>
                                {MOCK_TYPES_CONTRAT.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                            {errors.type && <span className={styles.errorText}>{errors.type}</span>}
                        </div>

                        <div className={styles.formGroup}>
                            <label>Prestataire *</label>
                            <select
                                value={formData.prestataireId}
                                onChange={e => setFormData({ ...formData, prestataireId: e.target.value})}
                                className={errors.prestataireId ? styles.inputError : ''}
                            >
                                <option value="">Sélectionner un prestataire</option>
                                {prestataires.map(p => (
                                    <option key={p.id} value={p.id}>{p.nom}</option>
                                ))}
                            </select>
                            {errors.prestataireId && <span className={styles.errorText}>{errors.prestataireId}</span>}
                        </div>

                        <div className={clsx(styles.formGroup, styles.fullWidth)}>
                            <label>Description / Informations supplémentaires</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value})}
                                rows={3}
                                placeholder="Informations complémentaires sur le contrat..."
                            />
                        </div>

                        <div className={clsx(styles.formGroup, styles.fullWidth)}>
                            <label>Conditions particulières</label>
                            <textarea
                                value={formData.conditionsParticulieres}
                                onChange={e => setFormData({ ...formData, conditionsParticulieres: e.target.value})}
                                rows={3}
                                placeholder="Clauses spécifiques, conditions de renouvellement, exclusions..."
                            />
                        </div>

                        <div className={clsx(styles.formGroup, styles.fullWidth)}>
                            <DateRangePicker
                                labelStart="Date de début"
                                labelEnd="Date de fin"
                                valueStart={formData.dateDebut ? parseISO(formData.dateDebut) : null}
                                valueEnd={formData.dateFin ? parseISO(formData.dateFin) : null}
                                onChangeStart={(date) => {
                                    if (date && isValid(date)) {
                                        setFormData({ ...formData, dateDebut: format(date, 'yyyy-MM-dd') });
                                    } else {
                                        setFormData({ ...formData, dateDebut: '' });
                                    }
                                }}
                                onChangeEnd={(date) => {
                                    if (date && isValid(date)) {
                                        setFormData({ ...formData, dateFin: format(date, 'yyyy-MM-dd') });
                                    } else {
                                        setFormData({ ...formData, dateFin: '' });
                                    }
                                }}
                                required
                                errorStart={errors.dateDebut}
                                errorEnd={errors.dateFin}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={formData.taciteReconduction}
                                    onChange={e => setFormData({ ...formData, taciteReconduction: e.target.checked })}
                                />
                                Tacite reconduction
                            </label>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Délai de résiliation (jours)</label>
                            <input type="number" value={formData.delaiResiliation} onChange={e => setFormData({ ...formData, delaiResiliation: parseInt(e.target.value) || 0})}
                                min="0"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Coût annuel (€) *</label>
                            <input type="number" value={formData.coutAnnuel} onChange={e => setFormData({ ...formData, coutAnnuel: e.target.value})}
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className={errors.coutAnnuel ? styles.inputError : ''}
                            />
                            {errors.coutAnnuel && <span className={styles.errorText}>{errors.coutAnnuel}</span>}
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={formData.estReglementaire}
                                    onChange={e => setFormData({ ...formData, estReglementaire: e.target.checked })}
                                />
                                Contrat réglementaire
                            </label>
                        </div>

                        <div className={clsx(styles.formGroup, styles.fullWidth)}>
                            <label>Document PDF du contrat</label>
                            <div className={styles.fileUpload}>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    id="contrat-pdf-upload"
                                    onChange={e => setFormData({ ...formData, fichierPDF: e.target.files?.[0]?.name || '' })}
                                    className={styles.fileInput}
                                />
                                <label htmlFor="contrat-pdf-upload" className={styles.fileUploadLabel}>
                                    <Upload size={18} aria-hidden="true" />
                                    <span>{formData.fichierPDF || 'Choisir un fichier PDF'}</span>
                                </label>
                                {formData.fichierPDF && (
                                    <button
                                        type="button"
                                        className={styles.fileClear}
                                        onClick={() => setFormData({ ...formData, fichierPDF: '' })}
                                    >
                                        <X size={14} aria-hidden="true" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={styles.modalActions}>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Annuler
                        </button>
                        <button type="submit" className="btn btn-primary">
                            <Plus size={16} aria-hidden="true" /> Créer le contrat
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
