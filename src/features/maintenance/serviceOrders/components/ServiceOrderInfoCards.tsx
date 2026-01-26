'use client';

import { OrdreService } from '@/types';
import { getTypeLabel, formatDateTime } from '@/lib/utils/service-order';
import { FileText, Calendar, Euro, Mail } from 'lucide-react';
import styles from './ServiceOrderInfoCards.module.css';

interface InfoCardProps {
    currentData: OrdreService;
    editMode: boolean;
    editedDescription?: string;
    onDescriptionChange: (value: string) => void;
}

export function ServiceOrderInfoCard({ currentData, editMode, editedDescription, onDescriptionChange }: InfoCardProps) {
    return (
        <div className={styles.card}>
            <h2 className={styles.cardTitle}>
                <FileText size={18} aria-hidden="true" />
                Informations générales
            </h2>
            <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Type d'ordre</span>
                    <span className={styles.infoValue}>{getTypeLabel(currentData.typeOrdre)}</span>
                </div>
                <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Prestataire</span>
                    <span className={styles.infoValue}>{currentData.fournisseurNom}</span>
                </div>
                {currentData.fournisseurEmail && (
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Email prestataire</span>
                        <span className={styles.infoValue}>{currentData.fournisseurEmail}</span>
                    </div>
                )}
                {currentData.fournisseurTelephone && (
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Téléphone</span>
                        <span className={styles.infoValue}>{currentData.fournisseurTelephone}</span>
                    </div>
                )}
                {currentData.contratNom && (
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Contrat</span>
                        <span className={styles.infoValue}>{currentData.contratNom}</span>
                    </div>
                )}
                <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Description</span>
                    {editMode ? (
                        <textarea
                            className="input"
                            rows={4}
                            value={editedDescription ?? currentData.description}
                            onChange={(e) => onDescriptionChange(e.target.value)}
                        />
                    ) : (
                        <span className={styles.infoValueText}>{currentData.description}</span>
                    )}
                </div>
            </div>
        </div>
    );
}

export function ServiceOrderDatesCard({ currentData }: { currentData: OrdreService }) {
    return (
        <div className={styles.card}>
            <h2 className={styles.cardTitle}>
                <Calendar size={18} aria-hidden="true" />
                Dates
            </h2>
            <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Création</span>
                    <span className={styles.infoValue}>{formatDateTime(currentData.dateCreation)}</span>
                </div>
                {currentData.dateEnvoi && (
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Envoi</span>
                        <span className={styles.infoValue}>{formatDateTime(currentData.dateEnvoi)}</span>
                    </div>
                )}
                {currentData.dateInterventionProgrammee && (
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Intervention programmée</span>
                        <span className={styles.infoValue}>{formatDateTime(currentData.dateInterventionProgrammee)}</span>
                    </div>
                )}
                {currentData.dateInterventionRealisee && (
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Intervention réalisée</span>
                        <span className={styles.infoValue}>{formatDateTime(currentData.dateInterventionRealisee)}</span>
                    </div>
                )}
                {currentData.dateCloture && (
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Clôture</span>
                        <span className={styles.infoValue}>{formatDateTime(currentData.dateCloture)}</span>
                    </div>
                )}
                <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Dernière modification</span>
                    <span className={styles.infoValue}>{formatDateTime(currentData.dateModification)}</span>
                </div>
            </div>
        </div>
    );
}

export function ServiceOrderMontantsCard({ currentData }: { currentData: OrdreService }) {
    return (
        <div className={styles.card}>
            <h2 className={styles.cardTitle}>
                <Euro size={18} aria-hidden="true" />
                Montants
            </h2>
            <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Montant estimé</span>
                    <span className={styles.infoValue}>
                        {currentData.montantEstime
                            ? currentData.montantEstime.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
                            : 'Non renseigné'}
                    </span>
                </div>
                <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Montant final</span>
                    <span className={styles.infoValue}>
                        {currentData.montantFinal
                            ? currentData.montantFinal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
                            : 'Non renseigné'}
                    </span>
                </div>
                <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Devis requis</span>
                    <span className={styles.infoValue}>{currentData.devisRequis ? 'Oui' : 'Non'}</span>
                </div>
            </div>
        </div>
    );
}

export function ServiceOrderEmailCard({ currentData }: { currentData: OrdreService }) {
    return (
        <div className={styles.card}>
            <h2 className={styles.cardTitle}>
                <Mail size={18} aria-hidden="true" />
                Email envoyé
            </h2>
            <div className={styles.emailContent}>
                <div className={styles.emailField}>
                    <strong>Objet :</strong>
                    <p>{currentData.emailObjet}</p>
                </div>
                <div className={styles.emailField}>
                    <strong>Corps :</strong>
                    <pre className={styles.emailBody}>{currentData.emailCorps}</pre>
                </div>
                {currentData.dateEnvoi && (
                    <div className={styles.emailField}>
                        <strong>Envoyé le :</strong>
                        <p>{formatDateTime(currentData.dateEnvoi)}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export function ServiceOrderArchiveCard({ currentData }: { currentData: OrdreService }) {
    if (!currentData.archiveGedId) return null;
    return (
        <div className={styles.card}>
            <h2 className={styles.cardTitle}>
                <FileText size={18} aria-hidden="true" />
                Archivage GED
            </h2>
            <div className={styles.archiveInfo}>
                <p><strong>ID GED :</strong> {currentData.archiveGedId}</p>
                <p><strong>URL :</strong> {currentData.archiveGedUrl}</p>
            </div>
        </div>
    );
}
