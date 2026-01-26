'use client';

import { X, Shield, Star, Euro, Clock, MapPin, Calendar, Award, Building2, Users, Scale } from 'lucide-react';
import { Prestataire } from '@/types';
import clsx from 'clsx';
import styles from './CompareModal.module.css';

interface CompareModalProps {
    prestataires: Prestataire[];
    onClose: () => void;
}

export function CompareModal({ prestataires, onClose }: CompareModalProps) {
    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={clsx(styles.modal, styles.modalLarge)} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2><Scale size={20} aria-hidden="true" /> Comparaison des prestataires</h2>
                    <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>

                <div className={styles.compareTable}>
                    <table>
                        <thead>
                            <tr>
                                <th>Critère</th>
                                {prestataires.map(p => (
                                    <th key={p.id}>
                                        <div className={styles.compareHeader}>
                                            <span>{p.nom}</span>
                                            {p.labelCoproFlex && (
                                                <span className={styles.labelBadge}>
                                                    <Shield size={12} aria-hidden="true" /> Certifié
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><Star size={14} aria-hidden="true" /> Note moyenne</td>
                                {prestataires.map(p => (
                                    <td key={p.id} className={styles.compareValue}>
                                        <span className={styles.noteHighlight}>{p.noteMoyenne?.toFixed(1) || '-'}/5</span>
                                        <span className={styles.avisCount}>({p.nombreAvis} avis)</span>
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td><Euro size={14} aria-hidden="true" /> Tarif indicatif</td>
                                {prestataires.map(p => (
                                    <td key={p.id}>{p.tarifIndicatif || '-'}</td>
                                ))}
                            </tr>
                            <tr>
                                <td><Clock size={14} aria-hidden="true" /> Délai intervention</td>
                                {prestataires.map(p => (
                                    <td key={p.id}>{p.delaiIntervention || '-'}</td>
                                ))}
                            </tr>
                            <tr>
                                <td><MapPin size={14} aria-hidden="true" /> Zone intervention</td>
                                {prestataires.map(p => (
                                    <td key={p.id}>{p.rayonIntervention ? `${p.rayonIntervention} km` : '-'}</td>
                                ))}
                            </tr>
                            <tr>
                                <td><Calendar size={14} aria-hidden="true" /> Disponibilité</td>
                                {prestataires.map(p => (
                                    <td key={p.id}>{p.disponibilite || '-'}</td>
                                ))}
                            </tr>
                            <tr>
                                <td><Award size={14} aria-hidden="true" /> Certifications</td>
                                {prestataires.map(p => (
                                    <td key={p.id}>
                                        {p.certifications?.join(', ') || '-'}
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td><Building2 size={14} aria-hidden="true" /> Année création</td>
                                {prestataires.map(p => (
                                    <td key={p.id}>{p.anneeCreation || '-'}</td>
                                ))}
                            </tr>
                            <tr>
                                <td><Users size={14} aria-hidden="true" /> Effectifs</td>
                                {prestataires.map(p => (
                                    <td key={p.id}>{p.nombreSalaries ? `${p.nombreSalaries} salariés` : '-'}</td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className={styles.modalFooter}>
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
}
