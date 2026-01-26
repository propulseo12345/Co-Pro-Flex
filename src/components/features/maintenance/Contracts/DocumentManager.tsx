'use client';

import { useState } from 'react';
import { FileText, Download, Trash2, Plus, Upload, X } from 'lucide-react';
import styles from './Contracts.module.css';

export interface BaseDocument {
    id: string;
    nom: string;
    type: string;
    url: string;
    dateUpload: string;
}

interface DocumentManagerProps<T extends BaseDocument> {
    documents: T[];
    typeLabels: Record<string, string>;
    typeOptions: { value: string; label: string }[];
    onAdd?: (doc: Omit<T, 'id'>) => void;
    onDelete?: (docId: string) => void;
    onDownload: (doc: T) => void;
    readOnly?: boolean;
    title?: string;
    emptyMessage?: string;
}

export function DocumentManager<T extends BaseDocument>({
    documents,
    typeLabels,
    typeOptions,
    onAdd,
    onDelete,
    onDownload,
    readOnly = false,
    title = 'Documents',
    emptyMessage = 'Aucun document'
}: DocumentManagerProps<T>) {
    const [showAddForm, setShowAddForm] = useState(false);
    const [newDoc, setNewDoc] = useState({
        nom: '',
        type: typeOptions[0]?.value || '',
        fichier: null as File | null
    });

    const handleAddSubmit = () => {
        if (!newDoc.nom || !newDoc.type || !onAdd) return;

        const docToAdd = {
            nom: newDoc.nom,
            type: newDoc.type,
            url: newDoc.fichier?.name || `${newDoc.nom.replace(/\s+/g, '_').toLowerCase()}.pdf`,
            dateUpload: new Date().toISOString().split('T')[0]
        } as Omit<T, 'id'>;

        onAdd(docToAdd);
        setNewDoc({ nom: '', type: typeOptions[0]?.value || '', fichier: null });
        setShowAddForm(false);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('fr-FR');
    };

    return (
        <div className={styles.documentManager}>
            <div className={styles.documentManagerHeader}>
                <h4 className={styles.documentManagerTitle}>
                    <FileText size={16} aria-hidden="true" /> {title} ({documents.length})
                </h4>
                {!readOnly && onAdd && (
                    <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => setShowAddForm(!showAddForm)}
                    >
                        {showAddForm ? (
                            <>
                                <X size={14} aria-hidden="true" /> Annuler
                            </>
                        ) : (
                            <>
                                <Plus size={14} aria-hidden="true" /> Ajouter
                            </>
                        )}
                    </button>
                )}
            </div>

            {showAddForm && (
                <div className={styles.documentAddForm}>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label>Nom du document *</label>
                            <input
                                type="text"
                                value={newDoc.nom}
                                onChange={(e) => setNewDoc({ ...newDoc, nom: e.target.value })}
                                placeholder="Ex: Contrat 2024"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Type *</label>
                            <select
                                value={newDoc.type}
                                onChange={(e) => setNewDoc({ ...newDoc, type: e.target.value })}
                            >
                                {typeOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className={styles.formGroup}>
                        <label>Fichier (optionnel)</label>
                        <div className={styles.fileUpload}>
                            <input
                                type="file"
                                id="doc-file-upload"
                                className={styles.fileInput}
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                onChange={(e) => setNewDoc({ ...newDoc, fichier: e.target.files?.[0] || null })}
                            />
                            <label htmlFor="doc-file-upload" className={styles.fileUploadLabel}>
                                <Upload size={16} aria-hidden="true" />
                                {newDoc.fichier ? newDoc.fichier.name : 'Choisir un fichier'}
                            </label>
                            {newDoc.fichier && (
                                <button
                                    type="button"
                                    className={styles.fileClear}
                                    onClick={() => setNewDoc({ ...newDoc, fichier: null })}
                                    aria-label="Supprimer le fichier"
                                >
                                    <X size={14} aria-hidden="true" />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className={styles.documentAddActions}>
                        <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={handleAddSubmit}
                            disabled={!newDoc.nom || !newDoc.type}
                        >
                            <Plus size={14} aria-hidden="true" /> Ajouter le document
                        </button>
                    </div>
                </div>
            )}

            {documents.length > 0 ? (
                <div className={styles.documentList}>
                    {documents.map(doc => (
                        <div key={doc.id} className={styles.documentItem}>
                            <FileText size={18} aria-hidden="true" className={styles.documentIcon} />
                            <div className={styles.documentInfo}>
                                <span className={styles.documentName}>{doc.nom}</span>
                                <span className={styles.documentMeta}>
                                    {typeLabels[doc.type] || doc.type} • {formatDate(doc.dateUpload)}
                                </span>
                            </div>
                            <div className={styles.documentActions}>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => onDownload(doc)}
                                    aria-label={`Télécharger ${doc.nom}`}
                                >
                                    <Download size={14} aria-hidden="true" />
                                </button>
                                {!readOnly && onDelete && (
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-danger"
                                        onClick={() => onDelete(doc.id)}
                                        aria-label={`Supprimer ${doc.nom}`}
                                    >
                                        <Trash2 size={14} aria-hidden="true" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className={styles.documentEmpty}>{emptyMessage}</p>
            )}
        </div>
    );
}

/**
 * Helper function to create a simulated document download
 */
export function createDocumentDownload(doc: BaseDocument, contextInfo?: string) {
    const content = `
================================================================================
                          DOCUMENT - ${doc.nom}
================================================================================

Type de document : ${doc.type}
Date d'upload : ${new Date(doc.dateUpload).toLocaleDateString('fr-FR')}
${contextInfo ? `\n${contextInfo}` : ''}

--------------------------------------------------------------------------------
CONTENU
--------------------------------------------------------------------------------
Ce document est une simulation. Dans un environnement de production,
le fichier original serait téléchargé depuis le serveur.

================================================================================
Document simulé généré le ${new Date().toLocaleDateString('fr-FR')}
CoProFlex - Gestion de copropriété
================================================================================
`.trim();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.nom.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
