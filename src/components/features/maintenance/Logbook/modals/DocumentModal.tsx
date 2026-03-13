'use client';

import {
    FileText,
    X,
    Shield,
    Download
} from 'lucide-react';
import clsx from 'clsx';
import type { DocumentModalProps } from '../types';
import { getTypeDocLabel, isDocumentExpired, isDocumentExpiringSoon } from '../utils';
import { generateDocumentTechniquePDF } from '@/lib/pdf/generateDocumentTechniquePDF';
import styles from '@/app/(dashboard)/maintenance/logbook/logbook.module.css';

export function DocumentModal({ document, onClose }: DocumentModalProps) {
    const expired = isDocumentExpired(document.dateValidite);
    const expiring = isDocumentExpiringSoon(document.dateValidite);

    return (
        <div className={styles.modalOverlay} aria-hidden="true" onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className={styles.modalHeader}>
                    <h3><FileText size={20} aria-hidden="true" /> {document.nom}</h3>
                    <button className={styles.modalClose} onClick={onClose} aria-label="Fermer"><X size={20} aria-hidden="true" /></button>
                </div>
                <div className={styles.modalContent}>
                    <div className={styles.modalSection}>
                        <h4><Shield size={16} aria-hidden="true" /> Informations</h4>
                        <div className={styles.modalList}>
                            <div className={styles.modalListItem}>
                                <div>
                                    <strong>Type de document</strong>
                                    <p>{getTypeDocLabel(document.type)}</p>
                                </div>
                            </div>
                            <div className={styles.modalListItem}>
                                <div>
                                    <strong>Date d&apos;ajout</strong>
                                    <p>{new Date(document.dateAjout).toLocaleDateString('fr-FR')}</p>
                                </div>
                            </div>
                            {document.dateValidite && (
                                <div className={styles.modalListItem}>
                                    <div>
                                        <strong>Date de validité</strong>
                                        <p>{new Date(document.dateValidite).toLocaleDateString('fr-FR')}</p>
                                    </div>
                                    <span className={clsx(
                                        styles.validityBadge,
                                        expired && styles.expired,
                                        expiring && styles.expiring,
                                        !expired && !expiring && styles.valid
                                    )}>
                                        {expired ? 'Expiré' :
                                            expiring ? 'Expire bientôt' : 'Valide'}
                                    </span>
                                </div>
                            )}
                            {document.observations && (
                                <div className={styles.modalListItem}>
                                    <div>
                                        <strong>Observations</strong>
                                        <p>{document.observations}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className={styles.modalFooter}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => {
                            const doc = generateDocumentTechniquePDF({ document });
                            doc.save(`${document.nom.replace(/\s+/g, '_')}.pdf`);
                        }}
                    >
                        <Download size={16} aria-hidden="true" /> Télécharger en PDF
                    </button>
                </div>
            </div>
        </div>
    );
}
