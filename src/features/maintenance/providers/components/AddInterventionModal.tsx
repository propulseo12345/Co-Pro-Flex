'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { MOCK_DOMAINES_ACTIVITE } from '@/data/mock';
import { Prestataire, DomaineActivite, InterventionDetaille } from '@/types';
import styles from './AddInterventionModal.module.css';

interface AddInterventionModalProps {
    prestataire: Prestataire;
    onClose: () => void;
    onAdd: (data: Partial<InterventionDetaille>) => void;
}

export function AddInterventionModal({ prestataire, onClose, onAdd }: AddInterventionModalProps) {
    const [formData, setFormData] = useState({
        titre: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        type: 'ENTRETIEN' as 'ENTRETIEN' | 'REPARATION' | 'AMELIORATION',
        statut: 'PLANIFIEE' as 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE',
        domaine: prestataire.domaines[0] || 'AUTRE',
        montant: '',
        ordreServiceId: '',
        commentaires: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAdd({
            id: `int-new-${Date.now()}`,
            titre: formData.titre,
            description: formData.description,
            date: formData.date,
            type: formData.type,
            statut: formData.statut,
            domaine: formData.domaine as DomaineActivite,
            montant: formData.montant ? parseFloat(formData.montant) : undefined,
            ordreServiceId: formData.ordreServiceId || undefined,
            commentaires: formData.commentaires || undefined,
            intervenant: prestataire.nom,
            prestataireId: prestataire.id
        });
        onClose();
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className={styles.modalHeader}>
                    <h2>Ajouter une intervention</h2>
                    <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className={styles.modalBody}>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label>Titre *</label>
                            <input
                                type="text"
                                value={formData.titre}
                                onChange={e => setFormData({ ...formData, titre: e.target.value })}
                                placeholder="Ex: Maintenance préventive"
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Date *</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Type *</label>
                            <select
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value as 'ENTRETIEN' | 'REPARATION' | 'AMELIORATION' })}
                            >
                                <option value="ENTRETIEN">Entretien</option>
                                <option value="REPARATION">Réparation</option>
                                <option value="AMELIORATION">Amélioration</option>
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Statut *</label>
                            <select
                                value={formData.statut}
                                onChange={e => setFormData({ ...formData, statut: e.target.value as 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE' })}
                            >
                                <option value="PLANIFIEE">Planifiée</option>
                                <option value="EN_COURS">En cours</option>
                                <option value="TERMINEE">Terminée</option>
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Domaine *</label>
                            <select
                                value={formData.domaine}
                                onChange={e => setFormData({ ...formData, domaine: e.target.value as DomaineActivite })}
                            >
                                {MOCK_DOMAINES_ACTIVITE.map(d => (
                                    <option key={d.value} value={d.value}>{d.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Montant (€)</label>
                            <input
                                type="number"
                                value={formData.montant}
                                onChange={e => setFormData({ ...formData, montant: e.target.value })}
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                            />
                        </div>
                    </div>
                    <div className={styles.formGroup}>
                        <label>Description</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Détails de l'intervention..."
                            rows={3}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Ordre de service associé</label>
                        <input
                            type="text"
                            value={formData.ordreServiceId}
                            onChange={e => setFormData({ ...formData, ordreServiceId: e.target.value })}
                            placeholder="ID de l'ordre de service"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Commentaires</label>
                        <textarea
                            value={formData.commentaires}
                            onChange={e => setFormData({ ...formData, commentaires: e.target.value })}
                            placeholder="Notes ou remarques..."
                            rows={2}
                        />
                    </div>
                    <div className={styles.modalFooter}>
                        <button type="button" onClick={onClose}>Annuler</button>
                        <button type="submit">
                            <Plus size={15} aria-hidden="true" /> Ajouter
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
