'use client';

import { EmailTemplateOS, TypeOrdreService } from '@/types';
import { useState, useEffect } from 'react';
import { substituteVariables } from '@/lib/utils/service-order';
import { Mail, Eye, EyeOff } from 'lucide-react';
import styles from './EmailEditor.module.css';
import clsx from 'clsx';

interface EmailEditorProps {
    typeOrdre: TypeOrdreService;
    templates: EmailTemplateOS[];
    onEmailChange: (objet: string, corps: string) => void;
    formData: {
        titre: string;
        description: string;
        fournisseurNom: string;
        contratNom?: string;
    };
    initialObjet?: string;
    initialCorps?: string;
}

export default function EmailEditor({
    typeOrdre,
    templates,
    onEmailChange,
    formData,
    initialObjet = '',
    initialCorps = ''
}: EmailEditorProps) {
    const [emailObjet, setEmailObjet] = useState(initialObjet);
    const [emailCorps, setEmailCorps] = useState(initialCorps);
    const [showPreview, setShowPreview] = useState(false);

    // Charger le template quand le type change
    useEffect(() => {
        const template = templates.find(t => t.type === typeOrdre);
        if (template && !initialObjet && !initialCorps) {
            setEmailObjet(template.objet);
            setEmailCorps(template.corps);
        }
    }, [typeOrdre, templates, initialObjet, initialCorps]);

    // Notifier le parent du changement
    useEffect(() => {
        onEmailChange(emailObjet, emailCorps);
    }, [emailObjet, emailCorps, onEmailChange]);

    // Variables de substitution
    const variablesData = {
        titre: formData.titre || '[Titre de l\'intervention]',
        description: formData.description || '[Description]',
        copropriete: '50 Route La Carrière au Loup, 75002 Paris',
        fournisseur: formData.fournisseurNom || '[Prestataire]',
        contrat: formData.contratNom || '[Contrat]'
    };

    // Générer la prévisualisation
    const previewObjet = substituteVariables(emailObjet, variablesData);
    const previewCorps = substituteVariables(emailCorps, variablesData);

    const insertVariable = (variable: string, field: 'objet' | 'corps') => {
        if (field === 'objet') {
            const cursorPos = (document.getElementById('email-objet') as HTMLInputElement)?.selectionStart || emailObjet.length;
            const newObjet = emailObjet.slice(0, cursorPos) + variable + emailObjet.slice(cursorPos);
            setEmailObjet(newObjet);
        } else {
            const cursorPos = (document.getElementById('email-corps') as HTMLTextAreaElement)?.selectionStart || emailCorps.length;
            const newCorps = emailCorps.slice(0, cursorPos) + variable + emailCorps.slice(cursorPos);
            setEmailCorps(newCorps);
        }
    };

    const variablesAvailables = [
        { key: '{{titre}}', label: 'Titre' },
        { key: '{{description}}', label: 'Description' },
        { key: '{{copropriete}}', label: 'Copropriété' },
        { key: '{{fournisseur}}', label: 'Fournisseur' }
    ];

    if (typeOrdre === 'CONTRACTUEL') {
        variablesAvailables.push({ key: '{{contrat}}', label: 'Contrat' });
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <Mail size={18} aria-hidden="true" />
                    <h3 className={styles.title}>Email au prestataire</h3>
                </div>
                <button
                    type="button"
                    className={styles.previewToggle}
                    onClick={() => setShowPreview(!showPreview)}
                >
                    {showPreview ? (
                        <>
                            <EyeOff size={16} aria-hidden="true" />
                            Masquer l'aperçu
                        </>
                    ) : (
                        <>
                            <Eye size={16} aria-hidden="true" />
                            Afficher l'aperçu
                        </>
                    )}
                </button>
            </div>

            {/* Variables disponibles */}
            <div className={styles.variablesSection}>
                <label className={styles.variablesLabel}>Variables disponibles :</label>
                <div className={styles.variablesList}>
                    {variablesAvailables.map((variable) => (
                        <button
                            key={variable.key}
                            type="button"
                            className={styles.variableButton}
                            onClick={() => insertVariable(variable.key, 'corps')}
                            title={`Insérer ${variable.label}`}
                        >
                            {variable.key}
                        </button>
                    ))}
                </div>
            </div>

            {/* Éditeur */}
            <div className={styles.editorSection}>
                <div className={styles.formGroup}>
                    <label htmlFor="email-objet" className={styles.label}>
                        Objet du mail *
                    </label>
                    <input
                        id="email-objet"
                        type="text"
                        className={styles.input}
                        value={emailObjet}
                        onChange={(e) => setEmailObjet(e.target.value)}
                        placeholder="Ex: Ordre de service - {{titre}}"
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="email-corps" className={styles.label}>
                        Corps du mail *
                    </label>
                    <textarea
                        id="email-corps"
                        className={styles.textarea}
                        rows={12}
                        value={emailCorps}
                        onChange={(e) => setEmailCorps(e.target.value)}
                        placeholder="Saisissez le contenu de l'email..."
                    />
                    <div className={styles.charCount}>
                        {emailCorps.length} caractères
                    </div>
                </div>
            </div>

            {/* Prévisualisation */}
            {showPreview && (
                <div className={styles.previewSection}>
                    <div className={styles.previewHeader}>
                        <Eye size={16} aria-hidden="true" />
                        <h4 className={styles.previewTitle}>Aperçu de l'email</h4>
                    </div>
                    <div className={styles.previewContent}>
                        <div className={styles.previewField}>
                            <strong>Objet :</strong> {previewObjet}
                        </div>
                        <div className={styles.previewField}>
                            <strong>Corps :</strong>
                            <div className={styles.previewBody}>
                                {previewCorps}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
