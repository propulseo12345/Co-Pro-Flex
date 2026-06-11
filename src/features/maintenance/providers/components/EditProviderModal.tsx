'use client';

import { useState } from 'react';
import { Save, X } from 'lucide-react';
import { DOMAINES_ACTIVITE } from '@/lib/constants/domaines-activite';
import { Prestataire, DomaineActivite } from '@/types';
import styles from './EditProviderModal.module.css';

interface EditProviderModalProps {
    prestataire: Prestataire;
    onClose: () => void;
    onSave: (data: Partial<Prestataire>) => void;
}

export function EditProviderModal({ prestataire, onClose, onSave }: EditProviderModalProps) {
    const [formData, setFormData] = useState({
        nom: prestataire.nom,
        telephone: prestataire.telephone,
        email: prestataire.email,
        adresse: prestataire.adresse,
        codePostal: prestataire.codePostal || '',
        ville: prestataire.ville || '',
        siren: prestataire.siren || '',
        domaines: [...prestataire.domaines],
        certifications: prestataire.certifications?.join(', ') || '',
        notesInternes: prestataire.notesInternes || '',
        siteWeb: ''
    });

    const toggleDomaine = (domaine: string) => {
        setFormData(prev => ({
            ...prev,
            domaines: (prev.domaines as string[]).includes(domaine)
                ? prev.domaines.filter(d => d !== domaine) as DomaineActivite[]
                : [...prev.domaines, domaine as DomaineActivite]
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formData,
            certifications: formData.certifications ? formData.certifications.split(',').map(c => c.trim()) : undefined
        });
        onClose();
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className={styles.modalHeader}>
                    <h2>Modifier le prestataire</h2>
                    <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className={styles.modalBody}>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label>Nom *</label>
                            <input
                                type="text"
                                value={formData.nom}
                                onChange={e => setFormData({ ...formData, nom: e.target.value })}
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>SIREN</label>
                            <input
                                type="text"
                                value={formData.siren}
                                onChange={e => setFormData({ ...formData, siren: e.target.value })}
                                placeholder="123456789"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Téléphone *</label>
                            <input
                                type="tel"
                                value={formData.telephone}
                                onChange={e => setFormData({ ...formData, telephone: e.target.value })}
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Email *</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>
                        <div className={styles.formGroupFull}>
                            <label>Adresse</label>
                            <input
                                type="text"
                                value={formData.adresse}
                                onChange={e => setFormData({ ...formData, adresse: e.target.value })}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Code postal</label>
                            <input
                                type="text"
                                value={formData.codePostal}
                                onChange={e => setFormData({ ...formData, codePostal: e.target.value })}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Ville</label>
                            <input
                                type="text"
                                value={formData.ville}
                                onChange={e => setFormData({ ...formData, ville: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Domaines d'intervention *</label>
                        <div className={styles.domainesGrid}>
                            {DOMAINES_ACTIVITE.map(d => (
                                <label key={d.value} className={styles.domaineCheckbox}>
                                    <input
                                        type="checkbox"
                                        // dbValue (slug minuscule) : les domaines chargés depuis la
                                        // vue sont des slugs — comparer sur value (MAJUSCULE) laissait
                                        // tout décoché et rendait le retrait impossible.
                                        checked={(formData.domaines as string[]).includes(d.dbValue)}
                                        onChange={() => toggleDomaine(d.dbValue)}
                                    />
                                    <span>{d.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Certifications / Labels</label>
                        <input
                            type="text"
                            value={formData.certifications}
                            onChange={e => setFormData({ ...formData, certifications: e.target.value })}
                            placeholder="Qualibat, RGE, ISO 9001..."
                        />
                        <small>Séparez par des virgules</small>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Notes internes</label>
                        <textarea
                            value={formData.notesInternes}
                            onChange={e => setFormData({ ...formData, notesInternes: e.target.value })}
                            placeholder="Remarques internes..."
                            rows={3}
                        />
                    </div>

                    <div className={styles.modalFooter}>
                        <button type="button" onClick={onClose}>Annuler</button>
                        <button type="submit">
                            <Save size={15} aria-hidden="true" /> Enregistrer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
