'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { MOCK_DOMAINES_ACTIVITE } from '@/data/mock';
import { Prestataire, DomaineActivite, CategoriePrestataire } from '@/types';
import clsx from 'clsx';
import styles from './AddProviderModal.module.css';

interface FormData {
    nom: string;
    categorie: CategoriePrestataire;
    domaines: DomaineActivite[];
    telephone: string;
    email: string;
    adresse: string;
    codePostal: string;
    ville: string;
    siren: string;
    certifications: string;
    siteWeb: string;
    noteMoyenne: string;
    nombreAvis: string;
    notesInternes: string;
}

const initialFormData: FormData = {
    nom: '',
    categorie: 'COPROPRIETE',
    domaines: [],
    telephone: '',
    email: '',
    adresse: '',
    codePostal: '',
    ville: '',
    siren: '',
    certifications: '',
    siteWeb: '',
    noteMoyenne: '',
    nombreAvis: '',
    notesInternes: ''
};

interface AddProviderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (prestataire: Prestataire) => void;
}

export function AddProviderModal({ isOpen, onClose, onAdd }: AddProviderModalProps) {
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [errors, setErrors] = useState<Record<string, string>>({});

    if (!isOpen) return null;

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!formData.nom.trim()) newErrors.nom = 'Le nom est requis';
        if (!formData.telephone.trim()) newErrors.telephone = 'Le téléphone est requis';
        if (!formData.email.trim()) newErrors.email = "L'email est requis";
        if (formData.domaines.length === 0) newErrors.domaines = 'Au moins un domaine est requis';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        const newPrestataire: Prestataire = {
            id: 'p' + Date.now().toString(36),
            nom: formData.nom,
            categorie: formData.categorie,
            domaines: formData.domaines,
            telephone: formData.telephone,
            email: formData.email,
            adresse: formData.adresse,
            codePostal: formData.codePostal,
            ville: formData.ville,
            siren: formData.siren || undefined,
            certifications: formData.certifications ? formData.certifications.split(',').map(c => c.trim()) : undefined,
            noteMoyenne: formData.categorie === 'COPROFLEX' && formData.noteMoyenne ? parseFloat(formData.noteMoyenne) : undefined,
            nombreAvis: formData.categorie === 'COPROFLEX' && formData.nombreAvis ? parseInt(formData.nombreAvis) : undefined,
            dateAjout: new Date().toISOString().split('T')[0],
            nombreInterventions: 0,
            notesInternes: formData.notesInternes || undefined
        };

        onAdd(newPrestataire);
        setFormData(initialFormData);
        setErrors({});
        onClose();
    };

    const toggleDomaine = (domaine: DomaineActivite) => {
        setFormData(prev => ({
            ...prev,
            domaines: prev.domaines.includes(domaine)
                ? prev.domaines.filter(d => d !== domaine)
                : [...prev.domaines, domaine]
        }));
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modal}>
                <div className={styles.modalHeader}>
                    <h2>Ajouter un prestataire</h2>
                    <button className={styles.modalClose} onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit} className={styles.modalContent}>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label>Nom du prestataire *</label>
                            <input
                                type="text"
                                value={formData.nom}
                                onChange={e => setFormData({ ...formData, nom: e.target.value })}
                                placeholder="Ex: Plomberie Express"
                                className={errors.nom ? styles.inputError : ''}
                            />
                            {errors.nom && <span className={styles.errorText}>{errors.nom}</span>}
                        </div>

                        <div className={styles.formGroup}>
                            <label>Catégorie *</label>
                            <select
                                value={formData.categorie}
                                onChange={e => setFormData({ ...formData, categorie: e.target.value as CategoriePrestataire })}
                            >
                                <option value="COPROPRIETE">Prestataire de la copropriété</option>
                                <option value="SYNDIC">Prestataire du syndic</option>
                                <option value="COPROFLEX">Base CoproFlex</option>
                            </select>
                        </div>

                        <div className={clsx(styles.formGroup, styles.fullWidth)}>
                            <label>Domaines d'activité *</label>
                            <div className={styles.domainesGrid}>
                                {MOCK_DOMAINES_ACTIVITE.map(d => (
                                    <label key={d.value} className={styles.domaineCheckbox}>
                                        <input
                                            type="checkbox"
                                            checked={formData.domaines.includes(d.value as DomaineActivite)}
                                            onChange={() => toggleDomaine(d.value as DomaineActivite)}
                                        />
                                        <span>{d.label}</span>
                                    </label>
                                ))}
                            </div>
                            {errors.domaines && <span className={styles.errorText}>{errors.domaines}</span>}
                        </div>

                        <div className={styles.formGroup}>
                            <label>Téléphone *</label>
                            <input
                                type="tel"
                                value={formData.telephone}
                                onChange={e => setFormData({ ...formData, telephone: e.target.value })}
                                placeholder="01 23 45 67 89"
                                className={errors.telephone ? styles.inputError : ''}
                            />
                            {errors.telephone && <span className={styles.errorText}>{errors.telephone}</span>}
                        </div>

                        <div className={styles.formGroup}>
                            <label>Email *</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                placeholder="contact@exemple.fr"
                                className={errors.email ? styles.inputError : ''}
                            />
                            {errors.email && <span className={styles.errorText}>{errors.email}</span>}
                        </div>

                        <div className={clsx(styles.formGroup, styles.fullWidth)}>
                            <label>Adresse</label>
                            <input
                                type="text"
                                value={formData.adresse}
                                onChange={e => setFormData({ ...formData, adresse: e.target.value })}
                                placeholder="123 rue Example"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Code postal</label>
                            <input
                                type="text"
                                value={formData.codePostal}
                                onChange={e => setFormData({ ...formData, codePostal: e.target.value })}
                                placeholder="69000"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Ville</label>
                            <input
                                type="text"
                                value={formData.ville}
                                onChange={e => setFormData({ ...formData, ville: e.target.value })}
                                placeholder="Lyon"
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

                        <div className={clsx(styles.formGroup, styles.fullWidth)}>
                            <label>Certifications / Labels</label>
                            <input
                                type="text"
                                value={formData.certifications}
                                onChange={e => setFormData({ ...formData, certifications: e.target.value })}
                                placeholder="Qualibat, RGE, ISO 9001... (séparés par virgule)"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Site web</label>
                            <input
                                type="url"
                                value={formData.siteWeb}
                                onChange={e => setFormData({ ...formData, siteWeb: e.target.value })}
                                placeholder="https://www.exemple.fr"
                            />
                        </div>

                        {formData.categorie === 'COPROFLEX' && (
                            <>
                                <div className={styles.formGroup}>
                                    <label>Note moyenne (sur 5)</label>
                                    <input
                                        type="number"
                                        value={formData.noteMoyenne}
                                        onChange={e => setFormData({ ...formData, noteMoyenne: e.target.value })}
                                        placeholder="4.5"
                                        min="0"
                                        max="5"
                                        step="0.1"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Nombre d'avis</label>
                                    <input
                                        type="number"
                                        value={formData.nombreAvis}
                                        onChange={e => setFormData({ ...formData, nombreAvis: e.target.value })}
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                            </>
                        )}

                        <div className={clsx(styles.formGroup, styles.fullWidth)}>
                            <label>Notes internes</label>
                            <textarea
                                value={formData.notesInternes}
                                onChange={e => setFormData({ ...formData, notesInternes: e.target.value })}
                                rows={3}
                                placeholder="Informations utiles sur ce prestataire..."
                            />
                        </div>
                    </div>

                    <div className={styles.modalActions}>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Annuler
                        </button>
                        <button type="submit" className="btn btn-primary">
                            <Plus size={16} aria-hidden="true" /> Ajouter le prestataire
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
