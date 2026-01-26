'use client';

import { DocumentContrat } from '@/types';
import { FileText, Download, Plus, X, Trash2, Upload, AlertTriangle, Settings, Mail } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import { ATTACHMENT_TYPES } from '../hooks/useContractDetailPage';
import styles from './ContractInfoSections.module.css';

// Flexible contract interface that works with both legacy and Supabase formats
// All fields are nullable to accommodate Supabase view types
interface ContractInfoData {
    id: string | null;
    nom: string | null;
    numeroContrat?: string | null;
    type: string | null;
    prestataireId: string | null;
    fournisseur: string | null;
    description?: string | null;
    dateDebut: string | null;
    dateFin?: string | null;
    taciteReconduction: boolean | null;
    delaiResiliation?: number | null;
    coutAnnuel: number | null;
    statut: string | null;
    estReglementaire?: boolean | null;
    equipementConcerne?: string | null;
    conditionsParticulieres?: string | null;
}

interface AlertBoxProps {
    joursRestants: number;
    alerteUrgente: boolean;
    taciteReconduction: boolean;
}

export function ContractAlertBox({ joursRestants, alerteUrgente, taciteReconduction }: AlertBoxProps) {
    return (
        <div className={clsx(styles.alertBox, alerteUrgente ? styles.alertUrgent : styles.alertWarning)}>
            <AlertTriangle size={20} aria-hidden="true" />
            <div>
                <strong>{alerteUrgente ? 'Renouvellement urgent' : 'Échéance proche'}</strong>
                <p>
                    {joursRestants} jours avant l&apos;échéance du contrat.
                    {taciteReconduction
                        ? ' Le contrat sera renouvelé automatiquement.'
                        : ' Pensez à renouveler ou résilier ce contrat.'}
                </p>
            </div>
        </div>
    );
}

interface InfoGridProps {
    contrat: ContractInfoData;
    typeLabel: string;
    joursRestants: number;
    alerteRenouvellement: boolean;
    alerteUrgente: boolean;
    onContactProvider: () => void;
}

export function ContractInfoGrid({ contrat, typeLabel, joursRestants, alerteRenouvellement, alerteUrgente, onContactProvider }: InfoGridProps) {
    return (
        <div className={styles.section}>
            <h2>Informations principales</h2>
            <div className={styles.infoGrid}>
                <div>
                    <span>Prestataire</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        {contrat.prestataireId ? (
                            <Link href={`/maintenance/providers/${contrat.prestataireId}`}>{contrat.fournisseur ?? 'Non renseigné'}</Link>
                        ) : (
                            <span>{contrat.fournisseur ?? 'Non renseigné'}</span>
                        )}
                        <button
                            className="btn btn-sm btn-secondary"
                            onClick={onContactProvider}
                            aria-label="Contacter le prestataire"
                            title="Contacter le prestataire"
                        >
                            <Mail size={14} aria-hidden="true" />
                        </button>
                    </div>
                </div>
                <div>
                    <span>Type</span>
                    <strong>{typeLabel}</strong>
                </div>
                <div>
                    <span>Date de début</span>
                    <strong>{contrat.dateDebut ? new Date(contrat.dateDebut).toLocaleDateString('fr-FR') : 'Non définie'}</strong>
                </div>
                <div>
                    <span>Date de fin</span>
                    <strong className={alerteUrgente ? styles.textDanger : alerteRenouvellement ? styles.textWarning : ''}>
                        {contrat.dateFin ? new Date(contrat.dateFin).toLocaleDateString('fr-FR') : 'Non définie'}
                        {contrat.dateFin && joursRestants > 0 && joursRestants <= 365 && (
                            <span className={styles.joursRestants}> ({joursRestants}j)</span>
                        )}
                    </strong>
                </div>
                <div>
                    <span>Coût annuel</span>
                    <strong className={styles.amount}>{(contrat.coutAnnuel ?? 0).toLocaleString('fr-FR')} €</strong>
                </div>
                <div>
                    <span>Tacite reconduction</span>
                    <strong>{contrat.taciteReconduction ? 'Oui' : 'Non'}</strong>
                </div>
                <div>
                    <span>Délai de résiliation</span>
                    <strong>{contrat.delaiResiliation || '-'} jours</strong>
                </div>
                {contrat.equipementConcerne && (
                    <div>
                        <span>Équipement concerné</span>
                        <strong><Settings size={14} className={styles.inlineIcon} aria-hidden="true" /> {contrat.equipementConcerne}</strong>
                    </div>
                )}
            </div>

            {contrat.description && (
                <div className={styles.description}>
                    <h3>Description</h3>
                    <p>{contrat.description}</p>
                </div>
            )}

            {contrat.conditionsParticulieres && (
                <div className={styles.description}>
                    <h3>Conditions particulières</h3>
                    <p>{contrat.conditionsParticulieres}</p>
                </div>
            )}
        </div>
    );
}

interface AttachmentsSectionProps {
    pieceJointes: DocumentContrat[];
    showAddAttachment: boolean;
    newAttachment: { nom: string; type: DocumentContrat['type']; fichier: File | null };
    onToggleAddAttachment: () => void;
    onNewAttachmentChange: (data: { nom: string; type: DocumentContrat['type']; fichier: File | null }) => void;
    onAddAttachment: () => void;
    onDeleteAttachment: (id: string) => void;
    onDownloadAttachment: (doc: DocumentContrat) => void;
}

export function ContractAttachmentsSection({
    pieceJointes,
    showAddAttachment,
    newAttachment,
    onToggleAddAttachment,
    onNewAttachmentChange,
    onAddAttachment,
    onDeleteAttachment,
    onDownloadAttachment
}: AttachmentsSectionProps) {
    return (
        <div className={styles.section}>
            <div className={styles.sectionHeader}>
                <h2>Pièces jointes ({pieceJointes.length})</h2>
                <button className="btn btn-secondary btn-sm" onClick={onToggleAddAttachment}>
                    {showAddAttachment ? (
                        <><X size={14} aria-hidden="true" /> Annuler</>
                    ) : (
                        <><Plus size={14} aria-hidden="true" /> Ajouter</>
                    )}
                </button>
            </div>

            {showAddAttachment && (
                <div className={styles.addAttachmentForm}>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label>Nom du document *</label>
                            <input
                                type="text"
                                value={newAttachment.nom}
                                onChange={(e) => onNewAttachmentChange({ ...newAttachment, nom: e.target.value })}
                                placeholder="Ex: Avenant 2024"
                                className={styles.formInput}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Type *</label>
                            <select
                                value={newAttachment.type}
                                onChange={(e) => onNewAttachmentChange({ ...newAttachment, type: e.target.value as DocumentContrat['type'] })}
                                className={styles.formInput}
                            >
                                {ATTACHMENT_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className={styles.formGroup}>
                        <label>Fichier (optionnel)</label>
                        <div className={styles.fileUpload}>
                            <input
                                type="file"
                                id="attachment-file-upload"
                                className={styles.fileInput}
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                onChange={(e) => onNewAttachmentChange({ ...newAttachment, fichier: e.target.files?.[0] || null })}
                            />
                            <label htmlFor="attachment-file-upload" className={styles.fileUploadLabel}>
                                <Upload size={16} aria-hidden="true" />
                                {newAttachment.fichier ? newAttachment.fichier.name : 'Choisir un fichier'}
                            </label>
                            {newAttachment.fichier && (
                                <button
                                    type="button"
                                    className={styles.fileClear}
                                    onClick={() => onNewAttachmentChange({ ...newAttachment, fichier: null })}
                                    aria-label="Supprimer le fichier"
                                >
                                    <X size={14} aria-hidden="true" />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className={styles.addAttachmentActions}>
                        <button className="btn btn-primary btn-sm" onClick={onAddAttachment} disabled={!newAttachment.nom}>
                            <Plus size={14} aria-hidden="true" /> Ajouter le document
                        </button>
                    </div>
                </div>
            )}

            {pieceJointes.length > 0 ? (
                <div className={styles.documents}>
                    {pieceJointes.map(doc => (
                        <div key={doc.id} className={styles.document}>
                            <FileText size={20} aria-hidden="true" />
                            <div>
                                <h4>{doc.nom}</h4>
                                <p>{new Date(doc.dateUpload).toLocaleDateString('fr-FR')}</p>
                            </div>
                            <div className={styles.documentActions}>
                                <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => onDownloadAttachment(doc)}
                                    aria-label={`Télécharger ${doc.nom}`}
                                >
                                    <Download size={14} aria-hidden="true" />
                                </button>
                                <button
                                    className="btn btn-sm btn-danger"
                                    onClick={() => onDeleteAttachment(doc.id)}
                                    aria-label={`Supprimer ${doc.nom}`}
                                >
                                    <Trash2 size={14} aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className={styles.emptyDocuments}>Aucune pièce jointe</p>
            )}
        </div>
    );
}
