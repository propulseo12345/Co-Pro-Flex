'use client';

import {
    Plus,
    Edit3,
    X,
    Save
} from 'lucide-react';
import clsx from 'clsx';
import type { InterventionFormModalProps } from '../types';
import { EquipementCombobox } from '../EquipementCombobox';
import styles from '@/app/(dashboard)/maintenance/logbook/logbook.module.css';

export function InterventionFormModal({
    isOpen,
    isEditing,
    formData,
    equipementsPrincipaux,
    onFormDataChange,
    onSubmit,
    onClose
}: InterventionFormModalProps) {
    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} aria-hidden="true" onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className={styles.modalHeader}>
                    <h3>
                        {isEditing ? <Edit3 size={20} aria-hidden="true" /> : <Plus size={20} aria-hidden="true" />}
                        {isEditing ? " Modifier l'intervention" : ' Nouvelle intervention'}
                    </h3>
                    <button className={styles.modalClose} onClick={onClose} aria-label="Fermer"><X size={20} aria-hidden="true" /></button>
                </div>
                <div className={styles.modalContent}>
                    <div className={styles.formGroup}>
                        <label className="required">Titre</label>
                        <input
                            type="text"
                            className={clsx(styles.formInput)}
                            value={formData.titre}
                            onChange={(e) => onFormDataChange({ ...formData, titre: e.target.value })}
                            placeholder="Titre de l'intervention"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Description</label>
                        <textarea
                            className={clsx(styles.formInput, styles.formTextarea)}
                            value={formData.description}
                            onChange={(e) => onFormDataChange({ ...formData, description: e.target.value})}
                            placeholder="Description détaillée de l'intervention"
                        />
                    </div>
                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label>Date</label>
                            <input type="date" className={styles.formInput} value={formData.date} onChange={(e) => onFormDataChange({ ...formData, date: e.target.value})}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Catégorie</label>
                            <select
                                className={clsx(styles.formInput, styles.formSelect)}
                                value={formData.categorie}
                                onChange={(e) => onFormDataChange({ ...formData, categorie: e.target.value as 'COURANTE' | 'TRAVAUX_IMPORTANTS'})}
                            >
                                <option value="COURANTE">Intervention courante</option>
                                <option value="TRAVAUX_IMPORTANTS">Travaux importants</option>
                            </select>
                        </div>
                    </div>
                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label>Type</label>
                            <select
                                className={clsx(styles.formInput, styles.formSelect)}
                                value={formData.type}
                                onChange={(e) => onFormDataChange({ ...formData, type: e.target.value as 'ENTRETIEN' | 'REPARATION' | 'INSPECTION'})}
                            >
                                <option value="ENTRETIEN">Entretien</option>
                                <option value="REPARATION">Réparation</option>
                                <option value="INSPECTION">Inspection</option>
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Statut</label>
                            <select
                                className={clsx(styles.formInput, styles.formSelect)}
                                value={formData.statut}
                                onChange={(e) => onFormDataChange({ ...formData, statut: e.target.value as 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE'})}
                            >
                                <option value="PLANIFIEE">Planifiée</option>
                                <option value="EN_COURS">En cours</option>
                                <option value="TERMINEE">Terminée</option>
                            </select>
                        </div>
                    </div>
                    <div className={styles.formGroup}>
                        <label className="required">Intervenant</label>
                        <input
                            type="text"
                            className={styles.formInput}
                            value={formData.intervenant}
                            onChange={(e) => onFormDataChange({ ...formData, intervenant: e.target.value })}
                            placeholder="Nom de l'intervenant ou de la société"
                        />
                    </div>
                    <div className={styles.formRow}>
                        <EquipementCombobox
                            value={formData.equipementConcerne}
                            equipementsPrincipaux={equipementsPrincipaux}
                            onChange={(equipement) => onFormDataChange({ ...formData, equipementConcerne: equipement })}
                            placeholder="Rechercher ou créer un équipement..."
                        />
                        <div className={styles.formGroup}>
                            <label>Coût (€)</label>
                            <input type="number" className={styles.formInput} value={formData.cout} onChange={(e) => onFormDataChange({ ...formData, cout: e.target.value})}
                                placeholder="0"
                                min="0"
                            />
                        </div>
                    </div>
                </div>
                <div className={styles.modalFooter}>
                    <div className={styles.modalActions}>
                        <button className="btn btn-secondary" onClick={onClose}>
                            Annuler
                        </button>
                        <button className="btn btn-primary" onClick={onSubmit}>
                            {isEditing ? (
                                <><Save size={16} aria-hidden="true" /> Enregistrer</>
                            ) : (
                                <><Plus size={16} aria-hidden="true" /> Créer l&apos;intervention</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
