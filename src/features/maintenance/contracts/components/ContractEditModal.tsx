'use client';

import { ContractEditForm } from '../hooks/useContractDetailPage';
import type { ContractType } from '@/types/supabase';
import { Prestataire } from '@/types';
import ProviderSelector from '@/components/features/maintenance/ProviderSelector';
import { X, Save } from 'lucide-react';
import styles from './ContractEditModal.module.css';

const CONTRACT_TYPE_OPTIONS: { value: ContractType; label: string }[] = [
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'ascenseur', label: 'Ascenseur' },
    { value: 'chauffage', label: 'Chauffage' },
    { value: 'nettoyage', label: 'Nettoyage' },
    { value: 'espaces_verts', label: 'Espaces verts' },
    { value: 'securite', label: 'Sécurité' },
    { value: 'assurance', label: 'Assurance' },
    { value: 'autre', label: 'Autre' },
];

interface ContractEditModalProps {
    editForm: ContractEditForm;
    prestataires: Prestataire[];
    onFormChange: (form: ContractEditForm) => void;
    onSave: () => void;
    onCancel: () => void;
}

export function ContractEditModal({ editForm, prestataires, onFormChange, onSave, onCancel }: ContractEditModalProps) {
    return (
        <div className={styles.modalOverlay} aria-hidden="true" onClick={onCancel}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className={styles.modalHeader}>
                    <h2>Modifier le contrat</h2>
                    <button className={styles.closeButton} onClick={onCancel} aria-label="Fermer">
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>
                <div className={styles.modalContent}>
                    <div className={styles.formSection}>
                        <h3>Informations générales</h3>
                        <div className={styles.formGrid}>
                            <div className={styles.formGroup}>
                                <label>Libellé du contrat *</label>
                                <input
                                    type="text"
                                    value={editForm.nom}
                                    onChange={(e) => onFormChange({ ...editForm, nom: e.target.value })}
                                    className={styles.formInput}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Numéro de contrat</label>
                                <input
                                    type="text"
                                    value={editForm.numeroContrat}
                                    onChange={(e) => onFormChange({ ...editForm, numeroContrat: e.target.value })}
                                    className={styles.formInput}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Type de contrat *</label>
                                <select
                                    value={editForm.type}
                                    onChange={(e) => onFormChange({ ...editForm, type: e.target.value as ContractType | '' })}
                                    className={styles.formInput}
                                >
                                    <option value="">Sélectionner...</option>
                                    {CONTRACT_TYPE_OPTIONS.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <ProviderSelector
                                    value={editForm.prestataireId}
                                    onChange={(id) => onFormChange({ ...editForm, prestataireId: id })}
                                    prestataires={prestataires}
                                    label="Prestataire"
                                />
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Description</label>
                            <textarea
                                value={editForm.description}
                                onChange={(e) => onFormChange({ ...editForm, description: e.target.value })}
                                className={styles.formTextarea}
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className={styles.formSection}>
                        <h3>Dates et montants</h3>
                        <div className={styles.formGrid}>
                            <div className={styles.formGroup}>
                                <label>Date de début *</label>
                                <input
                                    type="date"
                                    value={editForm.dateDebut}
                                    onChange={(e) => onFormChange({ ...editForm, dateDebut: e.target.value })}
                                    className={styles.formInput}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Date de fin *</label>
                                <input
                                    type="date"
                                    value={editForm.dateFin}
                                    onChange={(e) => onFormChange({ ...editForm, dateFin: e.target.value })}
                                    className={styles.formInput}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Coût annuel (€) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editForm.coutAnnuel}
                                    onChange={(e) => onFormChange({ ...editForm, coutAnnuel: e.target.value })}
                                    className={styles.formInput}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Délai de résiliation (jours)</label>
                                <input
                                    type="number"
                                    value={editForm.delaiResiliation}
                                    onChange={(e) => onFormChange({ ...editForm, delaiResiliation: parseInt(e.target.value) })}
                                    className={styles.formInput}
                                />
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={editForm.taciteReconduction}
                                    onChange={(e) => onFormChange({ ...editForm, taciteReconduction: e.target.checked })}
                                />
                                Tacite reconduction
                            </label>
                        </div>
                    </div>
                </div>
                <div className={styles.modalActions}>
                    <button className="btn btn-secondary" onClick={onCancel}>
                        <X size={16} aria-hidden="true" /> Annuler
                    </button>
                    <button className="btn btn-primary" onClick={onSave}>
                        <Save size={16} aria-hidden="true" /> Enregistrer
                    </button>
                </div>
            </div>
        </div>
    );
}
