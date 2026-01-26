'use client';

import {
    Settings,
    X,
    Briefcase,
    Wrench,
    FileText,
    Download
} from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import type { EquipementModalProps } from '../types';
import styles from '@/app/(dashboard)/maintenance/logbook/logbook.module.css';

export function EquipementModal({
    equipement,
    contrats,
    interventions,
    documents,
    onClose,
    onFilterByEquipement
}: EquipementModalProps) {
    return (
        <div className={styles.modalOverlay} aria-hidden="true" onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className={styles.modalHeader}>
                    <h3><Settings size={20} aria-hidden="true" /> {equipement}</h3>
                    <button className={styles.modalClose} onClick={onClose} aria-label="Fermer"><X size={20} aria-hidden="true" /></button>
                </div>
                <div className={styles.modalContent}>
                    {/* Contrats liés */}
                    <div className={styles.modalSection}>
                        <h4><Briefcase size={16} /> Contrats liés</h4>
                        {contrats.length > 0 ? (
                            <div className={styles.modalList}>
                                {contrats.map(contrat => (
                                    <Link
                                        key={contrat.id}
                                        href={`/maintenance/contracts/${contrat.id}`}
                                        className={styles.modalListItem}
                                    >
                                        <div>
                                            <strong>{contrat.nom}</strong>
                                            <p>{contrat.fournisseur}</p>
                                        </div>
                                        <span className={clsx(styles.badge, styles[contrat.statut.toLowerCase()])}>
                                            {contrat.statut === 'ACTIF' ? 'Actif' : contrat.statut}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p className={styles.emptyState}>Aucun contrat associé</p>
                        )}
                    </div>

                    {/* Interventions liées */}
                    <div className={styles.modalSection}>
                        <h4><Wrench size={16} aria-hidden="true" /> Interventions récentes</h4>
                        {interventions.length > 0 ? (
                            <div className={styles.modalList}>
                                {interventions.slice(0, 5).map(intervention => (
                                    <div key={intervention.id} className={styles.modalListItem}>
                                        <div>
                                            <strong>{intervention.titre}</strong>
                                            <p>{new Date(intervention.date).toLocaleDateString('fr-FR')}</p>
                                        </div>
                                        <span className={clsx(styles.badge, styles[intervention.statut.toLowerCase()])}>
                                            {intervention.statut === 'TERMINEE' ? 'Terminée' : intervention.statut}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className={styles.emptyState}>Aucune intervention associée</p>
                        )}
                    </div>

                    {/* Documents liés */}
                    <div className={styles.modalSection}>
                        <h4><FileText size={16} aria-hidden="true" /> Documents techniques</h4>
                        {documents.length > 0 ? (
                            <div className={styles.modalList}>
                                {documents.map(doc => (
                                    <div key={doc.id} className={styles.modalListItem}>
                                        <div>
                                            <strong>{doc.nom}</strong>
                                            <p>Ajouté le {new Date(doc.dateAjout).toLocaleDateString('fr-FR')}</p>
                                        </div>
                                        <button className="btn btn-sm btn-secondary" aria-label="Télécharger"><Download size={14} aria-hidden="true" /></button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className={styles.emptyState}>Aucun document associé</p>
                        )}
                    </div>
                </div>
                <div className={styles.modalFooter}>
                    <button
                        className="btn btn-secondary"
                        onClick={onFilterByEquipement}
                    >
                        Voir toutes les interventions
                    </button>
                </div>
            </div>
        </div>
    );
}
