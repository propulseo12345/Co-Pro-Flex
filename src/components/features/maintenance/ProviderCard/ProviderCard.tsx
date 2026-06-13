'use client';

import { Prestataire } from '@/types';
import { Phone, Mail, MapPin, Star, Calendar } from 'lucide-react';
import Link from 'next/link';
import styles from './ProviderCard.module.css';

interface ProviderCardProps {
    prestataire: Prestataire;
}

export default function ProviderCard({ prestataire }: ProviderCardProps) {
    return (
        <Link href={`/maintenance/providers/${prestataire.id}`} className={styles.card}>
            <div className={styles.header}>
                <div className={styles.avatar}>
                    {prestataire.nom.charAt(0).toUpperCase()}
                </div>
                <div className={styles.headerInfo}>
                    <h3 className={styles.nom}>{prestataire.nom}</h3>
                    <div className={styles.domaines}>
                        {prestataire.domaines.slice(0, 2).map((domaine) => (
                            <span key={domaine} className={styles.domaineBadge}>
                                {domaine}
                            </span>
                        ))}
                        {prestataire.domaines.length > 2 && (
                            <span className={styles.domaineMore}>
                                +{prestataire.domaines.length - 2}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className={styles.contact}>
                <div className={styles.contactItem}>
                    <Phone size={14} aria-hidden="true" />
                    <span>{prestataire.telephone}</span>
                </div>
                <div className={styles.contactItem}>
                    <Mail size={14} aria-hidden="true" />
                    <span>{prestataire.email}</span>
                </div>
                {prestataire.ville && (
                    <div className={styles.contactItem}>
                        <MapPin size={14} aria-hidden="true" />
                        <span>{prestataire.ville}</span>
                    </div>
                )}
            </div>

            <div className={styles.footer}>
                {prestataire.noteMoyenne && (
                    <div className={styles.note}>
                        <Star size={14} fill="currentColor" aria-hidden="true" />
                        <span>{prestataire.noteMoyenne.toFixed(1)}</span>
                        {prestataire.nombreAvis && (
                            <span className={styles.nombreAvis}>({prestataire.nombreAvis})</span>
                        )}
                    </div>
                )}
                {prestataire.nombreInterventions > 0 && (
                    <div className={styles.interventions}>
                        <Calendar size={14} aria-hidden="true" />
                        <span>{prestataire.nombreInterventions} intervention{prestataire.nombreInterventions > 1 ? 's' : ''}</span>
                    </div>
                )}
            </div>
        </Link>
    );
}
