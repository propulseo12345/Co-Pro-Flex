'use client';

import { useState } from 'react';
import { ContratSyndic, DocumentSyndic, TypeDocumentSyndic } from '@/types';
import { Check, FileText, Download, Trash2, Plus, Upload, X } from 'lucide-react';
import { DateRangePicker } from '@/components/ui/DatePicker';
import { isValid, parseISO, format } from 'date-fns';
import clsx from 'clsx';
import styles from '../Contracts.module.css';
import { SYNDIC_DOC_LABELS } from '../types';

interface EditSyndicModalProps {
    contrat: ContratSyndic;
    onSave: (updated: ContratSyndic) => void;
    onClose: () => void;
}

const TYPE_OPTIONS: { value: TypeDocumentSyndic; label: string }[] = [
    { value: 'MANDAT', label: 'Mandat' },
    { value: 'PV_DESIGNATION', label: 'PV Désignation' },
    { value: 'AVENANT', label: 'Avenant' },
    { value: 'AUTRE', label: 'Autre' }
];

export default function EditSyndicModal({ contrat, onSave, onClose }: EditSyndicModalProps) {
    const [formData, setFormData] = useState<ContratSyndic>({ ...contrat });
    const [activeTab, setActiveTab] = useState<'infos' | 'documents'>('infos');
    const [showAddDoc, setShowAddDoc] = useState(false);
    const [newDoc, setNewDoc] = useState({
        nom: '',
        type: 'MANDAT' as TypeDocumentSyndic,
        fichier: null as File | null
    });

    const documents = formData.documents || [];

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('fr-FR');
    };

    const handleDownloadDoc = (doc: DocumentSyndic) => {
        const content = `
================================================================================
                    DOCUMENT SYNDIC - ${doc.nom}
================================================================================

Type de document : ${SYNDIC_DOC_LABELS[doc.type]}
Date d'upload : ${formatDate(doc.dateUpload)}
Syndic : ${formData.nomSyndic}

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

    const handleDeleteDoc = (docId: string) => {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
            setFormData({
                ...formData,
                documents: documents.filter(d => d.id !== docId)
            });
        }
    };

    const handleAddDoc = () => {
        if (!newDoc.nom || !newDoc.type) return;

        const newDocument: DocumentSyndic = {
            id: `doc-syndic-${Date.now()}`,
            nom: newDoc.nom,
            type: newDoc.type,
            url: newDoc.fichier?.name || `${newDoc.nom.replace(/\s+/g, '_').toLowerCase()}.pdf`,
            dateUpload: new Date().toISOString().split('T')[0]
        };

        setFormData({
            ...formData,
            documents: [...documents, newDocument]
        });
        setNewDoc({ nom: '', type: 'MANDAT', fichier: null });
        setShowAddDoc(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modal} style={{ maxWidth: '700px' }}>
                <div className={styles.modalHeader}>
                    <h2>Modifier le contrat du syndic</h2>
                    <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>

                {/* Onglets */}
                <div className={styles.syndicTabs} style={{ margin: '0 1.5rem', marginTop: '1rem' }}>
                    <button
                        type="button"
                        className={clsx(styles.syndicTab, activeTab === 'infos' && styles.syndicTabActive)}
                        onClick={() => setActiveTab('infos')}
                    >
                        Informations
                    </button>
                    <button
                        type="button"
                        className={clsx(styles.syndicTab, activeTab === 'documents' && styles.syndicTabActive)}
                        onClick={() => setActiveTab('documents')}
                    >
                        Documents ({documents.length})
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.modalContent}>
                    {/* Onglet Informations */}
                    {activeTab === 'infos' && (
                        <div className={styles.formGrid}>
                            <div className={styles.formGroup}>
                                <label>Nom du syndic *</label>
                                <input
                                    type="text"
                                    value={formData.nomSyndic}
                                    onChange={e => setFormData({ ...formData, nomSyndic: e.target.value })}
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Nom du cabinet</label>
                                <input
                                    type="text"
                                    value={formData.cabinetNom || ''}
                                    onChange={e => setFormData({ ...formData, cabinetNom: e.target.value })}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Numéro de contrat *</label>
                                <input
                                    type="text"
                                    value={formData.numeroContrat}
                                    onChange={e => setFormData({ ...formData, numeroContrat: e.target.value })}
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Statut</label>
                                <select
                                    value={formData.statut}
                                    onChange={e => setFormData({ ...formData, statut: e.target.value as ContratSyndic['statut']})}
                                >
                                    <option value="ACTIF">Actif</option>
                                    <option value="A_RENOUVELER">À renouveler</option>
                                    <option value="RESILIE">Résilié</option>
                                </select>
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
                                    rangeType="mandat"
                                    hintEnd="Maximum 36 mois (3 ans)"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Montant annuel (€) *</label>
                                <input type="number" value={formData.montantAnnuel} onChange={e => setFormData({ ...formData, montantAnnuel: parseFloat(e.target.value) || 0})}
                                    required
                                    min="0"
                                    step="0.01"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Téléphone</label>
                                <input
                                    type="tel"
                                    value={formData.telephone || ''}
                                    onChange={e => setFormData({ ...formData, telephone: e.target.value })}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={formData.email || ''}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Délai de résiliation (jours)</label>
                                <input type="number" value={formData.delaiResiliation || 90} onChange={e => setFormData({ ...formData, delaiResiliation: parseInt(e.target.value) || 90})}
                                    min="0"
                                />
                            </div>

                            <div className={clsx(styles.formGroup, styles.fullWidth)}>
                                <label>Adresse</label>
                                <input
                                    type="text"
                                    value={formData.adresse || ''}
                                    onChange={e => setFormData({ ...formData, adresse: e.target.value })}
                                />
                            </div>

                            <div className={clsx(styles.formGroup, styles.fullWidth)}>
                                <label>Description</label>
                                <textarea
                                    value={formData.description || ''}
                                    onChange={e => setFormData({ ...formData, description: e.target.value})}
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}

                    {/* Onglet Documents */}
                    {activeTab === 'documents' && (
                        <div>
                            {/* Bouton Ajouter */}
                            {!showAddDoc && (
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowAddDoc(true)}
                                    style={{ marginBottom: '1rem' }}
                                >
                                    <Plus size={16} aria-hidden="true" /> Ajouter un document
                                </button>
                            )}

                            {/* Formulaire d'ajout */}
                            {showAddDoc && (
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
                                                id="syndic-edit-doc-file"
                                                className={styles.fileInput}
                                                accept=".pdf,.doc,.docx"
                                                onChange={(e) => setNewDoc({ ...newDoc, fichier: e.target.files?.[0] || null })}
                                            />
                                            <label htmlFor="syndic-edit-doc-file" className={styles.fileUploadLabel}>
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
                                            onClick={() => setShowAddDoc(false)}
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            onClick={handleAddDoc}
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
                                                    onClick={() => handleDownloadDoc(doc)}
                                                    aria-label={`Télécharger ${doc.nom}`}
                                                >
                                                    <Download size={14} aria-hidden="true" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-danger"
                                                    onClick={() => handleDeleteDoc(doc.id)}
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
                    )}

                    <div className={styles.modalActions}>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Annuler
                        </button>
                        <button type="submit" className="btn btn-primary">
                            <Check size={16} aria-hidden="true" /> Enregistrer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
