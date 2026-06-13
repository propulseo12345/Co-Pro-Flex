'use client';

import { AssuranceFormData, SOUS_TYPES_ASSURANCE, TYPE_DOCUMENTS } from '../hooks/useAssuranceDetailPage';
import { SousTypeAssuranceLiteral, DocumentAssurance } from '@/types/models/maintenance';
import { FormulaireGarantiesAssurance } from '@/components/features/maintenance/Logbook';
import { generateAssuranceDocumentPDF } from '@/lib/pdf/generateAssuranceDocumentPDF';
import { useCopro } from '@/providers/CoproContext';
import { autoFileToGED } from '@/lib/services/auto-file-ged.service';
import { FileText, Download, Plus, X, Trash2 } from 'lucide-react';
import styles from './AssuranceFormSections.module.css';

interface MainInfoSectionProps {
    formData: AssuranceFormData;
    isEditing: boolean;
    onFieldChange: <K extends keyof AssuranceFormData>(field: K, value: AssuranceFormData[K]) => void;
}

export function AssuranceMainInfoSection({ formData, isEditing, onFieldChange }: MainInfoSectionProps) {
    return (
        <div className={styles.section}>
            <h2>Informations principales</h2>
            <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                    <label htmlFor="nom">Nom de l'assurance <span className={styles.required}>*</span></label>
                    <input
                        id="nom"
                        type="text"
                        value={formData.nom}
                        onChange={(e) => onFieldChange('nom', e.target.value)}
                        className={styles.formInput}
                        disabled={!isEditing}
                    />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="sousType">Type d'assurance <span className={styles.required}>*</span></label>
                    <select
                        id="sousType"
                        value={formData.sousType}
                        onChange={(e) => onFieldChange('sousType', e.target.value)}
                        className={styles.formInput}
                        disabled={!isEditing}
                    >
                        {SOUS_TYPES_ASSURANCE.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="assureur">Assureur <span className={styles.required}>*</span></label>
                    <input
                        id="assureur"
                        type="text"
                        value={formData.assureur}
                        onChange={(e) => onFieldChange('assureur', e.target.value)}
                        className={styles.formInput}
                        disabled={!isEditing}
                    />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="numeroPolice">N° de police <span className={styles.required}>*</span></label>
                    <input
                        id="numeroPolice"
                        type="text"
                        value={formData.numeroPolice}
                        onChange={(e) => onFieldChange('numeroPolice', e.target.value)}
                        className={styles.formInput}
                        disabled={!isEditing}
                    />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="dateDebut">Date de début <span className={styles.required}>*</span></label>
                    <input
                        id="dateDebut"
                        type="date"
                        value={formData.dateDebut}
                        onChange={(e) => onFieldChange('dateDebut', e.target.value)}
                        className={styles.formInput}
                        disabled={!isEditing}
                    />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="dateFin">Date de fin <span className={styles.required}>*</span></label>
                    <input
                        id="dateFin"
                        type="date"
                        value={formData.dateFin}
                        onChange={(e) => onFieldChange('dateFin', e.target.value)}
                        className={styles.formInput}
                        disabled={!isEditing}
                    />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="primeAnnuelle">Prime annuelle (€) <span className={styles.required}>*</span></label>
                    <input
                        id="primeAnnuelle"
                        type="number"
                        step="0.01"
                        value={formData.primeAnnuelle}
                        onChange={(e) => onFieldChange('primeAnnuelle', e.target.value)}
                        className={styles.formInput}
                        disabled={!isEditing}
                    />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="franchise">Franchise (€)</label>
                    <input
                        id="franchise"
                        type="number"
                        step="0.01"
                        value={formData.franchise}
                        onChange={(e) => onFieldChange('franchise', e.target.value)}
                        className={styles.formInput}
                        disabled={!isEditing}
                    />
                </div>
            </div>
        </div>
    );
}

interface GarantiesSectionProps {
    garanties: string[];
    isEditing: boolean;
    onChange: (garanties: string[]) => void;
}

export function AssuranceGarantiesSection({ garanties, isEditing, onChange }: GarantiesSectionProps) {
    return (
        <div className={styles.section}>
            <h2>Garanties couvertes</h2>
            <FormulaireGarantiesAssurance
                garanties={garanties}
                onChange={onChange}
                disabled={!isEditing}
            />
        </div>
    );
}

interface ComplementaryInfoProps {
    formData: AssuranceFormData;
    isEditing: boolean;
    onFieldChange: <K extends keyof AssuranceFormData>(field: K, value: AssuranceFormData[K]) => void;
}

export function AssuranceComplementaryInfo({ formData, isEditing, onFieldChange }: ComplementaryInfoProps) {
    return (
        <div className={styles.section}>
            <h2>Informations complémentaires</h2>
            <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                    <label htmlFor="travauxConcernes">Travaux concernés</label>
                    <input
                        id="travauxConcernes"
                        type="text"
                        value={formData.travauxConcernes}
                        onChange={(e) => onFieldChange('travauxConcernes', e.target.value)}
                        className={styles.formInput}
                        disabled={!isEditing}
                        placeholder="Ex: Rénovation toiture 2024"
                    />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="dateReceptionTravaux">Date de réception des travaux</label>
                    <input
                        id="dateReceptionTravaux"
                        type="date"
                        value={formData.dateReceptionTravaux}
                        onChange={(e) => onFieldChange('dateReceptionTravaux', e.target.value)}
                        className={styles.formInput}
                        disabled={!isEditing}
                    />
                </div>
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label htmlFor="observations">Observations</label>
                    <textarea
                        id="observations"
                        value={formData.observations}
                        onChange={(e) => onFieldChange('observations', e.target.value)}
                        className={styles.formTextarea}
                        rows={4}
                        disabled={!isEditing}
                        placeholder="Notes et observations sur ce contrat d'assurance"
                    />
                </div>
            </div>
        </div>
    );
}

interface DocumentsSectionProps {
    documents: DocumentAssurance[];
    formData: AssuranceFormData;
    assurance: { nom: string; sousType: string; assureur: string; numeroPolice: string; dateDebut: string; dateFin: string; primeAnnuelle: number; franchise?: number; garanties: string[] };
    isEditing: boolean;
    showAddDocument: boolean;
    newDocument: { nom: string; type: DocumentAssurance['type']; fichier: File | null };
    onToggleAddDocument: () => void;
    onNewDocumentChange: (data: { nom: string; type: DocumentAssurance['type']; fichier: File | null }) => void;
    onAddDocument: () => void;
    onDeleteDocument: (id: string) => void;
}

export function AssuranceDocumentsSection({
    documents,
    formData,
    isEditing,
    showAddDocument,
    newDocument,
    onToggleAddDocument,
    onNewDocumentChange,
    onAddDocument,
    onDeleteDocument
}: DocumentsSectionProps) {
    const { currentCoproId } = useCopro();

    const handleDownloadDocument = (doc: DocumentAssurance) => {
        const pdfDoc = generateAssuranceDocumentPDF({
            document: doc,
            assurance: {
                id: 'temp-id',
                type: 'ASSURANCE',
                nom: formData.nom,
                sousType: formData.sousType as SousTypeAssuranceLiteral,
                assureur: formData.assureur,
                numeroPolice: formData.numeroPolice,
                dateDebut: formData.dateDebut,
                dateFin: formData.dateFin,
                primeAnnuelle: parseFloat(formData.primeAnnuelle) || 0,
                franchise: formData.franchise ? parseFloat(formData.franchise) : undefined,
                garanties: formData.garanties,
            },
        });
        const fileName = `${doc.nom.replace(/\s+/g, '_')}.pdf`;
        pdfDoc.save(fileName);

        if (currentCoproId) {
            const blob = pdfDoc.output('blob');
            autoFileToGED({
                blob,
                fileName,
                coproId: currentCoproId,
                category: 'assurance',
                sourceModule: 'maintenance',
                subFolderName: 'Assurances',
                year: new Date().getFullYear(),
            });
        }
    };

    return (
        <div className={styles.section}>
            <div className={styles.sectionHeader}>
                <h2>Documents ({documents.length})</h2>
                {isEditing && (
                    <button className="btn btn-secondary btn-sm" onClick={onToggleAddDocument}>
                        {showAddDocument ? (
                            <><X size={14} aria-hidden="true" /> Annuler</>
                        ) : (
                            <><Plus size={14} aria-hidden="true" /> Ajouter</>
                        )}
                    </button>
                )}
            </div>

            {showAddDocument && isEditing && (
                <div className={styles.addDocumentForm}>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label>Nom du document *</label>
                            <input
                                type="text"
                                value={newDocument.nom}
                                onChange={(e) => onNewDocumentChange({ ...newDocument, nom: e.target.value })}
                                placeholder="Ex: Contrat 2024"
                                className={styles.formInput}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Type *</label>
                            <select
                                value={newDocument.type}
                                onChange={(e) => onNewDocumentChange({ ...newDocument, type: e.target.value as DocumentAssurance['type'] })}
                                className={styles.formInput}
                            >
                                {TYPE_DOCUMENTS.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className={styles.formGroup}>
                        <label>Fichier (optionnel)</label>
                        <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => onNewDocumentChange({ ...newDocument, fichier: e.target.files?.[0] || null })}
                            className={styles.formInput}
                        />
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={onAddDocument} disabled={!newDocument.nom}>
                        <Plus size={14} aria-hidden="true" /> Ajouter le document
                    </button>
                </div>
            )}

            {documents.length > 0 ? (
                <div className={styles.documentsList}>
                    {documents.map(doc => (
                        <div key={doc.id} className={styles.documentItem}>
                            <FileText size={20} aria-hidden="true" />
                            <div className={styles.documentInfo}>
                                <span className={styles.documentName}>{doc.nom}</span>
                                <span className={styles.documentMeta}>
                                    {TYPE_DOCUMENTS.find(t => t.value === doc.type)?.label || doc.type} • {new Date(doc.dateUpload).toLocaleDateString('fr-FR')}
                                </span>
                            </div>
                            <div className={styles.documentActions}>
                                <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => handleDownloadDocument(doc)}
                                    aria-label={`Télécharger ${doc.nom}`}
                                >
                                    <Download size={14} aria-hidden="true" />
                                </button>
                                {isEditing && (
                                    <button
                                        className="btn btn-sm btn-danger"
                                        onClick={() => onDeleteDocument(doc.id)}
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
                <p className={styles.emptyText}>Aucun document associé</p>
            )}
        </div>
    );
}
