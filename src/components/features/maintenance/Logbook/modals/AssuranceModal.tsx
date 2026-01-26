'use client';

import {
    ShieldCheck,
    X,
    Shield,
    CheckCircle,
    AlertCircle,
    Edit3,
    FileText,
    Download
} from 'lucide-react';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import type { AssuranceModalProps } from '../types';
import { getAssuranceTypeLabel, isEcheanceProche, isGarantieEnCours } from '../utils';
import styles from '@/app/(dashboard)/maintenance/logbook/logbook.module.css';
import { ASSURANCE_DOC_LABELS } from '@/components/features/maintenance/Contracts/types';
import { DocumentAssurance } from '@/types';
import { generateAssuranceDocumentPDF } from '@/lib/pdf/generateAssuranceDocumentPDF';

export function AssuranceModal({ assurance, onClose }: AssuranceModalProps) {
    const router = useRouter();
    const expired = !isGarantieEnCours(assurance.dateFin);
    const expiring = isEcheanceProche(assurance.dateFin);
    const documents = assurance.documents || [];

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('fr-FR');
    };

    const handleDownloadDoc = (doc: DocumentAssurance) => {
        // Génération d'un vrai PDF au lieu d'un fichier texte
        generateAssuranceDocumentPDF({
            document: doc,
            assurance: assurance,
        });
    };

    return (
        <div className={styles.modalOverlay} aria-hidden="true" onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className={styles.modalHeader}>
                    <h3><ShieldCheck size={20} aria-hidden="true" /> {assurance.nom}</h3>
                    <button className={styles.modalClose} onClick={onClose} aria-label="Fermer"><X size={20} aria-hidden="true" /></button>
                </div>
                <div className={styles.modalContent}>
                    <div className={styles.modalSection}>
                        <h4><Shield size={16} aria-hidden="true" /> Informations générales</h4>
                        <div className={styles.modalList}>
                            <div className={styles.modalListItem}>
                                <div>
                                    <strong>Type d&apos;assurance</strong>
                                    <p>{getAssuranceTypeLabel(assurance.sousType)}</p>
                                </div>
                            </div>
                            <div className={styles.modalListItem}>
                                <div>
                                    <strong>Assureur</strong>
                                    <p>{assurance.assureur}</p>
                                </div>
                            </div>
                            <div className={styles.modalListItem}>
                                <div>
                                    <strong>N° de police</strong>
                                    <p>{assurance.numeroPolice}</p>
                                </div>
                            </div>
                            <div className={styles.modalListItem}>
                                <div>
                                    <strong>Date d&apos;échéance</strong>
                                    <p>{new Date(assurance.dateFin).toLocaleDateString('fr-FR')}</p>
                                </div>
                                <span className={clsx(
                                    styles.validityBadge,
                                    expired && styles.expired,
                                    expiring && styles.expiring,
                                    !expired && !expiring && styles.valid
                                )}>
                                    {expired ? 'Expirée' :
                                        expiring ? 'Échéance proche' : 'Active'}
                                </span>
                            </div>
                            {assurance.primeAnnuelle > 0 && (
                                <div className={styles.modalListItem}>
                                    <div>
                                        <strong>Prime annuelle</strong>
                                        <p>{assurance.primeAnnuelle.toLocaleString()} €</p>
                                    </div>
                                </div>
                            )}
                            {assurance.franchise && (
                                <div className={styles.modalListItem}>
                                    <div>
                                        <strong>Franchise</strong>
                                        <p>{assurance.franchise.toLocaleString()} €</p>
                                    </div>
                                </div>
                            )}
                            {assurance.travauxConcernes && (
                                <div className={styles.modalListItem}>
                                    <div>
                                        <strong>Travaux concernés</strong>
                                        <p>{assurance.travauxConcernes}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    {assurance.garanties.length > 0 && (
                        <div className={styles.modalSection}>
                            <h4><CheckCircle size={16} aria-hidden="true" /> Garanties couvertes</h4>
                            <div className={styles.garantiesList}>
                                {assurance.garanties.map((garantie, idx) => (
                                    <span key={idx} className={styles.garantieTag}>{garantie}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    {assurance.observations && (
                        <div className={styles.modalSection}>
                            <h4><AlertCircle size={16} aria-hidden="true" /> Observations</h4>
                            <p>{assurance.observations}</p>
                        </div>
                    )}

                    {/* Section Documents */}
                    <div className={styles.modalSection}>
                        <h4><FileText size={16} aria-hidden="true" /> Documents ({documents.length})</h4>
                        {documents.length > 0 ? (
                            <div className={styles.documentsList}>
                                {documents.map(doc => (
                                    <div key={doc.id} className={styles.documentItem}>
                                        <FileText size={16} aria-hidden="true" />
                                        <div className={styles.documentInfo}>
                                            <span className={styles.documentName}>{doc.nom}</span>
                                            <span className={styles.documentMeta}>
                                                {ASSURANCE_DOC_LABELS[doc.type] || doc.type} • {formatDate(doc.dateUpload)}
                                            </span>
                                        </div>
                                        <button
                                            className="btn btn-sm btn-secondary"
                                            onClick={() => handleDownloadDoc(doc)}
                                            aria-label={`Télécharger ${doc.nom}`}
                                        >
                                            <Download size={14} aria-hidden="true" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className={styles.emptyDocuments}>Aucun document associé à cette assurance</p>
                        )}
                    </div>
                </div>
                <div className={styles.modalFooter}>
                    <div className={styles.modalActions}>
                        <button className="btn btn-secondary" onClick={onClose}>
                            Fermer
                        </button>
                        <button 
                            className="btn btn-primary" 
                            onClick={() => {
                                onClose();
                                router.push(`/maintenance/logbook/assurances/${assurance.id}`);
                            }}
                        >
                            <Edit3 size={16} aria-hidden="true" /> Modifier
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
