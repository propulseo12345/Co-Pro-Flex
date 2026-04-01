'use client';

import { useState } from 'react';
import { Phone, Mail, Eye, Star, Award, MapPin, Clock, Euro, Calendar, Shield, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import { DOMAINES_ACTIVITE } from '@/lib/constants/domaines-activite';
import { Prestataire, AvisPrestataire } from '@/types';
import clsx from 'clsx';
import styles from './CoproFlexProviderCard.module.css';

interface CoproFlexProviderCardProps {
    prestataire: Prestataire;
    isSelected: boolean;
    onSelect: (id: string) => void;
    onViewDetails: (id: string) => void;
    avis: AvisPrestataire[];
}

export function CoproFlexProviderCard({
    prestataire,
    isSelected,
    onSelect,
    onViewDetails,
    avis
}: CoproFlexProviderCardProps) {
    const [showAvis, setShowAvis] = useState(false);

    return (
        <div className={clsx(styles.card, isSelected && styles.cardSelected)}>
            <div className={styles.checkbox}>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onSelect(prestataire.id)}
                    id={`select-${prestataire.id}`}
                />
                <label htmlFor={`select-${prestataire.id}`}>Sélectionner</label>
            </div>

            <div className={styles.header}>
                <div className={styles.avatar}>{prestataire.nom.charAt(0)}</div>
                <div className={styles.titleWrapper}>
                    <h3>
                        {prestataire.nom}
                        {prestataire.labelCoproFlex && (
                            <span className={styles.labelBadge} title="Prestataire certifié CoproFlex">
                                <Shield size={14} aria-hidden="true" /> Certifié
                            </span>
                        )}
                    </h3>
                    <div className={styles.domaines}>
                        {prestataire.domaines.map((d, i) => (
                            <span key={i} className={styles.domaineBadge}>
                                {DOMAINES_ACTIVITE.find(da => da.value === d)?.label || d}
                            </span>
                        ))}
                    </div>
                </div>
                <div className={styles.rating}>
                    <div className={styles.ratingStars}>
                        <Star size={18} fill="#F59E0B" color="#F59E0B" aria-hidden="true" />
                        <span className={styles.ratingValue}>{prestataire.noteMoyenne?.toFixed(1)}</span>
                    </div>
                    <span className={styles.ratingCount}>{prestataire.nombreAvis} avis</span>
                </div>
            </div>

            <p className={styles.description}>{prestataire.description}</p>

            <div className={styles.infoGrid}>
                <div className={styles.info}>
                    <MapPin size={14} aria-hidden="true" />
                    <span>{prestataire.ville} ({prestataire.rayonIntervention}km)</span>
                </div>
                <div className={styles.info}>
                    <Euro size={14} aria-hidden="true" />
                    <span>{prestataire.tarifIndicatif}</span>
                </div>
                <div className={styles.info}>
                    <Clock size={14} aria-hidden="true" />
                    <span>{prestataire.delaiIntervention}</span>
                </div>
                <div className={styles.info}>
                    <Calendar size={14} aria-hidden="true" />
                    <span>{prestataire.disponibilite}</span>
                </div>
            </div>

            {prestataire.certifications && prestataire.certifications.length > 0 && (
                <div className={styles.certifs}>
                    <Award size={14} aria-hidden="true" />
                    <span>{prestataire.certifications.slice(0, 3).join(' • ')}</span>
                    {prestataire.certifications.length > 3 && (
                        <span className={styles.more}>+{prestataire.certifications.length - 3}</span>
                    )}
                </div>
            )}

            {avis.length > 0 && (
                <div className={styles.avisSection}>
                    <button className={styles.avisToggle} onClick={() => setShowAvis(!showAvis)}>
                        {showAvis ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
                        {showAvis ? 'Masquer les avis' : `Voir ${avis.length} avis`}
                    </button>
                    {showAvis && (
                        <div className={styles.avisList}>
                            {avis.slice(0, 3).map(a => (
                                <div key={a.id} className={styles.avisItem}>
                                    <div className={styles.avisHeader}>
                                        <div className={styles.avisStars}>
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    size={12}
                                                    fill={i < a.note ? '#F59E0B' : 'none'}
                                                    color={i < a.note ? '#F59E0B' : '#D1D5DB'}
                                                    aria-hidden="true"
                                                />
                                            ))}
                                        </div>
                                        <span className={styles.avisDate}>
                                            {new Date(a.dateAvis).toLocaleDateString('fr-FR')}
                                        </span>
                                    </div>
                                    <p className={styles.avisComment}>{a.commentaire}</p>
                                    <span className={styles.avisAuteur}>— {a.auteur}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className={styles.actions}>
                <a href={`tel:${prestataire.telephone}`} className={styles.actionLink}>
                    <Phone size={14} aria-hidden="true" /> Appeler
                </a>
                <a href={`mailto:${prestataire.email}`} className={styles.actionLink}>
                    <Mail size={14} aria-hidden="true" /> Email
                </a>
                {prestataire.siteWeb && (
                    <a
                        href={`https://${prestataire.siteWeb}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.actionLink}
                    >
                        <Globe size={14} aria-hidden="true" /> Site web
                    </a>
                )}
                <button className={styles.actionBtn} onClick={() => onViewDetails(prestataire.id)}>
                    <Eye size={14} aria-hidden="true" /> Fiche complète
                </button>
            </div>
        </div>
    );
}
