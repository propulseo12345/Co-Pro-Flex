'use client';

import { useState } from 'react';
import { DocumentSyndic, TypeDocumentSyndic } from '@/types';
import { X, FileText, Download, Trash2, Plus, Upload } from 'lucide-react';
import styles from '../Contracts.module.css';
import { SYNDIC_DOC_LABELS } from '../types';

interface ManageSyndicDocumentsModalProps {
    documents: DocumentSyndic[];
    syndicName: string;
    onSave: (documents: DocumentSyndic[]) => void;
    onClose: () => void;
}

const TYPE_OPTIONS: { value: TypeDocumentSyndic; label: string }[] = [
    { value: 'MANDAT', label: 'Mandat' },
    { value: 'PV_DESIGNATION', label: 'PV Désignation' },
    { value: 'AVENANT', label: 'Avenant' },
    { value: 'AUTRE', label: 'Autre' }
];

export default function ManageSyndicDocumentsModal({
    documents: initialDocuments,
    syndicName,
    onSave,
    onClose
}: ManageSyndicDocumentsModalProps) {
    const [documents, setDocuments] = useState<DocumentSyndic[]>(initialDocuments);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newDoc, setNewDoc] = useState({
        nom: '',
        type: 'MANDAT' as TypeDocumentSyndic,
        fichier: null as File | null
    });

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('fr-FR');
    };

    const handleDownload = (doc: DocumentSyndic) => {
        const content = `
================================================================================
                    DOCUMENT SYNDIC - ${doc.nom}
================================================================================

Type de document : ${SYNDIC_DOC_LABELS[doc.type]}
Date d'upload : ${formatDate(doc.dateUpload)}
Syndic : ${syndicName}

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
    };

    const handleDelete = (docId: string) => {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
            setDocuments(documents.filter(d => d.id !== docId));
        }
    };

    const handleAdd = () => {
        if (!newDoc.nom || !newDoc.type) return;

        const newDocument: DocumentSyndic = {
            id: `doc-syndic-${Date.now()}`,
            nom: newDoc.nom,
            type: newDoc.type,
            url: newDoc.fichier?.name || `${newDoc.nom.replace(/\s+/g, '_').toLowerCase()}.pdf`,
            dateUpload: new Date().toISOString().split('T')[0]
        };

        setDocuments([...documents, newDocument]);
        setNewDoc({ nom: '', type: 'MANDAT', fichier: null });
        setShowAddForm(false);
    };

    const handleSave = () => {
        onSave(documents);
        onClose();
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className={styles.modalHeader}>
                    <h2>Gérer les documents du syndic</h2>
                    <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>
                <div className={styles.modalContent}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                        Syndic : <strong>{syndicName}</strong>
                    </p>

                    {/* Bouton Ajouter */}
                    {!showAddForm && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => setShowAddForm(true)}
                            style={{ marginBottom: '1rem' }}
                        >
                            <Plus size={16} aria-hidden="true" /> Ajouter un document
                        </button>
                    )}

                    {/* Formulaire d'ajout */}
                    {showAddForm && (
                        <div className={styles.documentAddForm}>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>Nom du document *</label>
                                    <input
                                        type="text"
                                        value={newDoc.nom}
                                        onChange={(e) => setNewDoc({ ...newDoc, nom: e.target.value })}
                                        placeholder="Ex: Mandat de gestion 2024"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Type de document *</label>
                                    <select
                                        value={newDoc.type}
                                        onChange={(e) => setNewDoc({ ...newDoc, type: e.target.value as TypeDocumentSyndic })}
                                    >
                                        {TYPE_OPTIONS.map(opt => (
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
                                        id="syndic-doc-file"
                                        className={styles.fileInput}
                                        accept=".pdf,.doc,.docx"
                                        onChange={(e) => setNewDoc({ ...newDoc, fichier: e.target.files?.[0] || null })}
                                    />
                                    <label htmlFor="syndic-doc-file" className={styles.fileUploadLabel}>
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
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setShowAddForm(false)}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={handleAdd}
                                    disabled={!newDoc.nom}
                                >
                                    <Plus size={14} aria-hidden="true" /> Ajouter
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Liste des documents */}
                    {documents.length > 0 ? (
                        <div className={styles.documentList}>
                            {documents.map(doc => (
                                <div key={doc.id} className={styles.documentItem}>
                                    <FileText size={18} aria-hidden="true" className={styles.documentIcon} />
                                    <div className={styles.documentInfo}>
                                        <span className={styles.documentName}>{doc.nom}</span>
                                        <span className={styles.documentMeta}>
                                            {SYNDIC_DOC_LABELS[doc.type]} • {formatDate(doc.dateUpload)}
                                        </span>
                                    </div>
                                    <div className={styles.documentActions}>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-secondary"
                                            onClick={() => handleDownload(doc)}
                                            aria-label={`Télécharger ${doc.nom}`}
                                        >
                                            <Download size={14} aria-hidden="true" />
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-danger"
                                            onClick={() => handleDelete(doc.id)}
                                            aria-label={`Supprimer ${doc.nom}`}
                                        >
                                            <Trash2 size={14} aria-hidden="true" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className={styles.documentEmpty}>Aucun document associé au contrat du syndic</p>
                    )}
                </div>
                <div className={styles.modalActions}>
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Annuler
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleSave}>
                        Enregistrer
                    </button>
                </div>
            </div>
        </div>
    );
}
