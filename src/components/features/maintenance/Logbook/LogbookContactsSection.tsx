'use client';

import { useState } from 'react';
import {
    Phone,
    Mail,
    MapPin,
    Clock,
    Users,
    Building2,
    Shield,
    AlertTriangle,
    Wrench,
    ChevronDown,
    ChevronUp,
    User,
    Home
} from 'lucide-react';
import clsx from 'clsx';
import type { InformationsCopropriete, MembreConseilSyndicalContact, PrestataireContact, ServiceUrgence } from '@/types';
import styles from '@/app/(dashboard)/maintenance/logbook/logbook.module.css';

interface LogbookContactsSectionProps {
    coproprieteInfo: InformationsCopropriete;
}

// Labels pour les rôles du conseil syndical
const ROLE_LABELS: Record<MembreConseilSyndicalContact['role'], string> = {
    PRESIDENT: 'Président',
    VICE_PRESIDENT: 'Vice-Président',
    TRESORIER: 'Trésorier',
    SECRETAIRE: 'Secrétaire',
    MEMBRE: 'Membre'
};

// Labels pour les types de prestataires
const PRESTATAIRE_LABELS: Record<PrestataireContact['type'], string> = {
    ASCENSEUR: 'Ascenseur',
    CHAUFFAGE: 'Chauffage',
    PLOMBERIE: 'Plomberie',
    ELECTRICITE: 'Électricité',
    ESPACES_VERTS: 'Espaces verts',
    NETTOYAGE: 'Nettoyage',
    AUTRE: 'Autre'
};

// Labels pour les services d'urgence
const URGENCE_LABELS: Record<ServiceUrgence['type'], string> = {
    POMPIERS: 'Pompiers',
    POLICE: 'Police',
    SAMU: 'SAMU',
    URGENCE_GAZ: 'Urgence Gaz',
    URGENCE_EAU: 'Urgence Eau',
    URGENCE_ELECTRICITE: 'Urgence Électricité',
    CENTRE_ANTIPOISON: 'Centre Antipoison'
};

// Composant pour afficher un contact avec actions rapides
function ContactCard({
    title,
    name,
    telephone,
    telephoneUrgence,
    email,
    extra,
    icon: Icon,
    variant = 'default'
}: {
    title: string;
    name: string;
    telephone: string;
    telephoneUrgence?: string;
    email?: string;
    extra?: React.ReactNode;
    icon: typeof Phone;
    variant?: 'default' | 'urgence' | 'gouvernance';
}) {
    return (
        <div className={clsx(styles.contactCard, styles[`contactCard${variant.charAt(0).toUpperCase() + variant.slice(1)}`])}>
            <div className={styles.contactCardHeader}>
                <Icon size={16} className={styles.contactIcon} aria-hidden="true" />
                <span className={styles.contactTitle}>{title}</span>
            </div>
            <div className={styles.contactCardBody}>
                <p className={styles.contactName}>{name}</p>
                <div className={styles.contactActions}>
                    <a href={`tel:${telephone.replace(/\s/g, '')}`} className={styles.contactAction} title="Appeler">
                        <Phone size={14} aria-hidden="true" />
                        <span>{telephone}</span>
                    </a>
                    {telephoneUrgence && (
                        <a href={`tel:${telephoneUrgence.replace(/\s/g, '')}`} className={clsx(styles.contactAction, styles.urgence)} title="Urgence">
                            <AlertTriangle size={14} aria-hidden="true" />
                            <span>{telephoneUrgence}</span>
                        </a>
                    )}
                    {email && (
                        <a href={`mailto:${email}`} className={styles.contactAction} title="Envoyer un email">
                            <Mail size={14} aria-hidden="true" />
                            <span>{email}</span>
                        </a>
                    )}
                </div>
                {extra}
            </div>
        </div>
    );
}

export function LogbookContactsSection({ coproprieteInfo }: LogbookContactsSectionProps) {
    const [expandedSections, setExpandedSections] = useState<string[]>(['gouvernance', 'urgences']);

    const toggleSection = (section: string) => {
        setExpandedSections(prev =>
            prev.includes(section)
                ? prev.filter(s => s !== section)
                : [...prev, section]
        );
    };

    const { syndic, gestionnaire, conseilSyndical, gardien, prestataires, servicesUrgence, assurance } = coproprieteInfo;

    // Obtenir le président du CS
    const president = conseilSyndical?.membres.find(m => m.role === 'PRESIDENT');
    const autresMembres = conseilSyndical?.membres.filter(m => m.role !== 'PRESIDENT') || [];

    return (
        <div className={styles.contactsSection}>
            {/* Section Gouvernance */}
            <div className={styles.contactsCategory}>
                <button
                    className={styles.contactsCategoryHeader}
                    onClick={() => toggleSection('gouvernance')}
                    aria-expanded={expandedSections.includes('gouvernance')}
                >
                    <div className={styles.contactsCategoryTitle}>
                        <Building2 size={18} aria-hidden="true" />
                        <span>Gouvernance</span>
                    </div>
                    {expandedSections.includes('gouvernance') ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>

                {expandedSections.includes('gouvernance') && (
                    <div className={styles.contactsGrid}>
                        {/* Syndic */}
                        <ContactCard
                            title="Syndic"
                            name={syndic.nom}
                            telephone={syndic.telephone}
                            email={syndic.email}
                            icon={Building2}
                            variant="gouvernance"
                            extra={
                                syndic.adresse && (
                                    <p className={styles.contactExtra}>
                                        <MapPin size={12} aria-hidden="true" />
                                        {syndic.adresse}
                                    </p>
                                )
                            }
                        />

                        {/* Gestionnaire */}
                        {gestionnaire && (
                            <ContactCard
                                title="Gestionnaire"
                                name={gestionnaire.nom}
                                telephone={gestionnaire.telephone}
                                email={gestionnaire.email}
                                icon={User}
                                variant="gouvernance"
                            />
                        )}

                        {/* Président du Conseil Syndical */}
                        {president && (
                            <ContactCard
                                title={`CS - ${ROLE_LABELS[president.role]}`}
                                name={president.nom}
                                telephone={president.telephone || ''}
                                email={president.email}
                                icon={Users}
                                variant="gouvernance"
                            />
                        )}

                        {/* Gardien */}
                        {gardien && (
                            <ContactCard
                                title="Gardien / Concierge"
                                name={gardien.nom}
                                telephone={gardien.telephone}
                                email={gardien.email}
                                icon={Home}
                                variant="gouvernance"
                                extra={
                                    <>
                                        {gardien.horaires && (
                                            <p className={styles.contactExtra}>
                                                <Clock size={12} aria-hidden="true" />
                                                {gardien.horaires}
                                            </p>
                                        )}
                                        {gardien.loge && (
                                            <p className={styles.contactExtra}>
                                                <MapPin size={12} aria-hidden="true" />
                                                {gardien.loge}
                                            </p>
                                        )}
                                    </>
                                }
                            />
                        )}
                    </div>
                )}

                {/* Autres membres du CS (collapsible) */}
                {expandedSections.includes('gouvernance') && autresMembres.length > 0 && (
                    <div className={styles.conseilSyndicalMembres}>
                        <button
                            className={styles.conseilSyndicalToggle}
                            onClick={() => toggleSection('cs-membres')}
                            aria-expanded={expandedSections.includes('cs-membres')}
                        >
                            <Users size={14} aria-hidden="true" />
                            <span>Autres membres du Conseil Syndical ({autresMembres.length})</span>
                            {expandedSections.includes('cs-membres') ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>

                        {expandedSections.includes('cs-membres') && (
                            <div className={styles.membresList}>
                                {autresMembres.map((membre, index) => (
                                    <div key={index} className={styles.membreItem}>
                                        <div className={styles.membreInfo}>
                                            <span className={styles.membreNom}>{membre.nom}</span>
                                            <span className={styles.membreRole}>{ROLE_LABELS[membre.role]}</span>
                                        </div>
                                        <div className={styles.membreActions}>
                                            {membre.telephone && (
                                                <a href={`tel:${membre.telephone.replace(/\s/g, '')}`} className={styles.membreAction} title="Appeler">
                                                    <Phone size={12} aria-hidden="true" />
                                                </a>
                                            )}
                                            {membre.email && (
                                                <a href={`mailto:${membre.email}`} className={styles.membreAction} title="Email">
                                                    <Mail size={12} aria-hidden="true" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Section Services d'urgence */}
            {servicesUrgence && servicesUrgence.length > 0 && (
                <div className={styles.contactsCategory}>
                    <button
                        className={clsx(styles.contactsCategoryHeader, styles.urgenceHeader)}
                        onClick={() => toggleSection('urgences')}
                        aria-expanded={expandedSections.includes('urgences')}
                    >
                        <div className={styles.contactsCategoryTitle}>
                            <AlertTriangle size={18} aria-hidden="true" />
                            <span>Services d'urgence</span>
                        </div>
                        {expandedSections.includes('urgences') ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>

                    {expandedSections.includes('urgences') && (
                        <div className={styles.urgencesGrid}>
                            {servicesUrgence.map((service, index) => (
                                <a
                                    key={index}
                                    href={`tel:${service.telephone.replace(/\s/g, '')}`}
                                    className={styles.urgenceCard}
                                >
                                    <div className={styles.urgenceInfo}>
                                        <span className={styles.urgenceType}>{URGENCE_LABELS[service.type]}</span>
                                        <span className={styles.urgenceNom}>{service.nom}</span>
                                    </div>
                                    <div className={styles.urgenceTel}>
                                        <Phone size={14} aria-hidden="true" />
                                        <span>{service.telephone}</span>
                                    </div>
                                    {service.disponibilite && (
                                        <span className={styles.urgenceDispo}>{service.disponibilite}</span>
                                    )}
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Section Prestataires */}
            {prestataires && prestataires.length > 0 && (
                <div className={styles.contactsCategory}>
                    <button
                        className={styles.contactsCategoryHeader}
                        onClick={() => toggleSection('prestataires')}
                        aria-expanded={expandedSections.includes('prestataires')}
                    >
                        <div className={styles.contactsCategoryTitle}>
                            <Wrench size={18} aria-hidden="true" />
                            <span>Prestataires principaux</span>
                        </div>
                        {expandedSections.includes('prestataires') ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>

                    {expandedSections.includes('prestataires') && (
                        <div className={styles.contactsGrid}>
                            {prestataires.map((prestataire, index) => (
                                <ContactCard
                                    key={index}
                                    title={PRESTATAIRE_LABELS[prestataire.type]}
                                    name={prestataire.nom}
                                    telephone={prestataire.telephone}
                                    telephoneUrgence={prestataire.telephoneUrgence}
                                    email={prestataire.email}
                                    icon={Wrench}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Section Assurance */}
            {assurance && (
                <div className={styles.contactsCategory}>
                    <button
                        className={styles.contactsCategoryHeader}
                        onClick={() => toggleSection('assurance')}
                        aria-expanded={expandedSections.includes('assurance')}
                    >
                        <div className={styles.contactsCategoryTitle}>
                            <Shield size={18} aria-hidden="true" />
                            <span>Assurance immeuble</span>
                        </div>
                        {expandedSections.includes('assurance') ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>

                    {expandedSections.includes('assurance') && (
                        <div className={styles.assuranceCard}>
                            <div className={styles.assuranceHeader}>
                                <Shield size={20} aria-hidden="true" />
                                <div>
                                    <p className={styles.assuranceCompagnie}>{assurance.compagnie}</p>
                                    <p className={styles.assuranceContrat}>Contrat n° {assurance.numeroContrat}</p>
                                </div>
                            </div>
                            <div className={styles.assuranceActions}>
                                <a href={`tel:${assurance.telephone.replace(/\s/g, '')}`} className={styles.assuranceAction}>
                                    <Phone size={14} aria-hidden="true" />
                                    <span>Contact: {assurance.telephone}</span>
                                </a>
                                {assurance.telephoneSinistre && (
                                    <a href={`tel:${assurance.telephoneSinistre.replace(/\s/g, '')}`} className={clsx(styles.assuranceAction, styles.sinistre)}>
                                        <AlertTriangle size={14} aria-hidden="true" />
                                        <span>Sinistre: {assurance.telephoneSinistre}</span>
                                    </a>
                                )}
                                {assurance.email && (
                                    <a href={`mailto:${assurance.email}`} className={styles.assuranceAction}>
                                        <Mail size={14} aria-hidden="true" />
                                        <span>{assurance.email}</span>
                                    </a>
                                )}
                            </div>
                            <p className={styles.assuranceNumSinistre}>
                                N° déclaration sinistre: <strong>{assurance.numeroSinistre}</strong>
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
