'use client';

import { useState } from 'react';
import { X, Send, Shield } from 'lucide-react';
import { Prestataire } from '@/types';
import clsx from 'clsx';
import styles from './DevisModal.module.css';

interface DevisModalProps {
    prestataires: Prestataire[];
    onClose: () => void;
    onSubmit: () => void;
}

export function DevisModal({ prestataires, onClose, onSubmit }: DevisModalProps) {
    const [formData, setFormData] = useState({
        objet: '',
        description: '',
        urgence: 'NORMAL' as 'URGENT' | 'NORMAL' | 'PLANIFIE',
        dateIntervention: '',
        budget: '',
        contact: '',
        telephone: '',
        email: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit();
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2><Send size={20} aria-hidden="true" /> Demande de devis</h2>
                    <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>

                <div className={styles.modalBody}>
                    <div className={styles.recipients}>
                        <h4>Prestataires sélectionnés ({prestataires.length})</h4>
                        <div className={styles.recipientsList}>
                            {prestataires.map(p => (
                                <div key={p.id} className={styles.recipientChip}>
                                    <span>{p.nom}</span>
                                    {p.labelCoproFlex && <Shield size={12} aria-hidden="true" />}
                                </div>
                            ))}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className={styles.formGrid}>
                            <div className={styles.formGroup}>
                                <label>Objet de la demande *</label>
                                <input
                                    type="text"
                                    value={formData.objet}
                                    onChange={e => setFormData({...formData, objet: e.target.value})}
                                    placeholder="Ex: Réparation ascenseur, Ravalement façade..."
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Niveau d'urgence</label>
                                <select
                                    value={formData.urgence}
                                    onChange={e => setFormData({...formData, urgence: e.target.value as 'URGENT' | 'NORMAL' | 'PLANIFIE'})}
                                >
                                    <option value="URGENT">Urgent (sous 48h)</option>
                                    <option value="NORMAL">Normal (1-2 semaines)</option>
                                    <option value="PLANIFIE">Planifié (date à définir)</option>
                                </select>
                            </div>

                            <div className={clsx(styles.formGroup, styles.fullWidth)}>
                                <label>Description des travaux *</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                    placeholder="Décrivez précisément les travaux souhaités..."
                                    rows={4}
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Date souhaitée d'intervention</label>
                                <input
                                    type="date"
                                    value={formData.dateIntervention}
                                    onChange={e => setFormData({...formData, dateIntervention: e.target.value})}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Budget indicatif</label>
                                <input
                                    type="text"
                                    value={formData.budget}
                                    onChange={e => setFormData({...formData, budget: e.target.value})}
                                    placeholder="Ex: 5 000 - 10 000€"
                                />
                            </div>

                            <div className={styles.divider}><span>Vos coordonnées</span></div>

                            <div className={styles.formGroup}>
                                <label>Nom de la copropriété *</label>
                                <input
                                    type="text"
                                    value={formData.contact}
                                    onChange={e => setFormData({...formData, contact: e.target.value})}
                                    placeholder="Résidence Les Jardins"
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Téléphone *</label>
                                <input
                                    type="tel"
                                    value={formData.telephone}
                                    onChange={e => setFormData({...formData, telephone: e.target.value})}
                                    placeholder="04 XX XX XX XX"
                                    required
                                />
                            </div>

                            <div className={clsx(styles.formGroup, styles.fullWidth)}>
                                <label>Email *</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                    placeholder="syndic@copropriete.fr"
                                    required
                                />
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            <button type="button" className="btn btn-secondary" onClick={onClose}>
                                Annuler
                            </button>
                            <button type="submit" className="btn btn-primary">
                                <Send size={16} aria-hidden="true" /> Envoyer la demande
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
