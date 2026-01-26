'use client';

import Link from 'next/link';
import { Phone, Mail, MapPin, Building, User, Award, Wrench, FileText, Calendar, Plus, ExternalLink, Download, CheckCircle, Clock, Star } from 'lucide-react';
import { MOCK_DOMAINES_ACTIVITE } from '@/data/mock';
import { Prestataire, InterventionDetaille, AvisPrestataire } from '@/types';
import clsx from 'clsx';
import styles from './ProviderInfoSections.module.css';

interface CoordonneesSectionProps {
    prestataire: Prestataire;
}

export function CoordonneesSection({ prestataire }: CoordonneesSectionProps) {
    return (
        <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
                <User size={20} aria-hidden="true" /> Coordonnées
            </h2>
            <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                    <Phone size={18} aria-hidden="true" />
                    <div>
                        <span className={styles.infoLabel}>Téléphone</span>
                        <a href={`tel:${prestataire.telephone}`}>{prestataire.telephone}</a>
                    </div>
                </div>
                <div className={styles.infoItem}>
                    <Mail size={18} aria-hidden="true" />
                    <div>
                        <span className={styles.infoLabel}>Email</span>
                        <a href={`mailto:${prestataire.email}`}>{prestataire.email}</a>
                    </div>
                </div>
                <div className={styles.infoItem}>
                    <MapPin size={18} aria-hidden="true" />
                    <div>
                        <span className={styles.infoLabel}>Adresse</span>
                        <span>{prestataire.adresse}{prestataire.codePostal && `, ${prestataire.codePostal}`} {prestataire.ville}</span>
                    </div>
                </div>
                {prestataire.siren && (
                    <div className={styles.infoItem}>
                        <Building size={18} aria-hidden="true" />
                        <div>
                            <span className={styles.infoLabel}>SIREN</span>
                            <span>{prestataire.siren}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

interface CertificationsSectionProps {
    certifications: string[];
}

export function CertificationsSection({ certifications }: CertificationsSectionProps) {
    if (!certifications || certifications.length === 0) return null;

    return (
        <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
                <Award size={20} aria-hidden="true" /> Certifications & Labels
            </h2>
            <div className={styles.certifications}>
                {certifications.map((cert, i) => (
                    <div key={i} className={styles.certifBadge}>
                        <Award size={16} aria-hidden="true" />
                        <span>{cert}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

interface StatsSectionProps {
    prestataire: Prestataire;
}

export function StatsSection({ prestataire }: StatsSectionProps) {
    return (
        <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
                <Wrench size={20} aria-hidden="true" /> Statistiques
            </h2>
            <div className={styles.stats}>
                <div className={styles.stat}>
                    <span className={styles.statValue}>{prestataire.nombreInterventions}</span>
                    <span className={styles.statLabel}>Interventions</span>
                </div>
                <div className={styles.stat}>
                    <span className={styles.statValue}>
                        {prestataire.derniereIntervention
                            ? new Date(prestataire.derniereIntervention).toLocaleDateString('fr-FR')
                            : '-'}
                    </span>
                    <span className={styles.statLabel}>Dernière intervention</span>
                </div>
                <div className={styles.stat}>
                    <span className={styles.statValue}>
                        {new Date(prestataire.dateAjout).toLocaleDateString('fr-FR')}
                    </span>
                    <span className={styles.statLabel}>Ajouté le</span>
                </div>
            </div>
        </div>
    );
}

interface ContratsSectionProps {
    contrats: Array<{
        id: string;
        nom: string;
        type: string;
        coutAnnuel: number;
        statut: string;
    }>;
}

export function ContratsSection({ contrats }: ContratsSectionProps) {
    if (contrats.length === 0) return null;

    return (
        <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
                <FileText size={20} aria-hidden="true" /> Contrats associés ({contrats.length})
            </h2>
            <div className={styles.contrats}>
                {contrats.map(c => (
                    <Link key={c.id} href={`/maintenance/contracts`} className={styles.contratCard}>
                        <FileText size={20} aria-hidden="true" />
                        <div className={styles.contratInfo}>
                            <h4>{c.nom}</h4>
                            <p>{MOCK_DOMAINES_ACTIVITE.find(d => d.value === c.type)?.label || c.type} - {c.coutAnnuel.toLocaleString()} €/an</p>
                        </div>
                        <span className={clsx(
                            styles.contratStatus,
                            c.statut === 'ACTIF' && styles.contratActif,
                            c.statut === 'A_RENOUVELER' && styles.contratRenouveler,
                            c.statut === 'RESILIE' && styles.contratResilie
                        )}>
                            {c.statut === 'ACTIF' ? 'Actif' : c.statut === 'A_RENOUVELER' ? 'À renouveler' : 'Résilié'}
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    );
}

interface InterventionsListProps {
    interventions: InterventionDetaille[];
    onAddIntervention: () => void;
}

export function InterventionsList({ interventions, onAddIntervention }: InterventionsListProps) {
    const getStatusBadge = (statut: string) => {
        switch (statut) {
            case 'TERMINEE':
                return <span className={clsx(styles.statusBadge, styles.statusCompleted)}><CheckCircle size={14} aria-hidden="true" /> Terminée</span>;
            case 'EN_COURS':
                return <span className={clsx(styles.statusBadge, styles.statusInProgress)}><Clock size={14} aria-hidden="true" /> En cours</span>;
            case 'PLANIFIEE':
                return <span className={clsx(styles.statusBadge, styles.statusPlanned)}><Calendar size={14} aria-hidden="true" /> Planifiée</span>;
            default:
                return null;
        }
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'ENTRETIEN':
                return <span className={clsx(styles.typeBadge, styles.typeEntretien)}>Entretien</span>;
            case 'REPARATION':
                return <span className={clsx(styles.typeBadge, styles.typeReparation)}>Réparation</span>;
            case 'AMELIORATION':
                return <span className={clsx(styles.typeBadge, styles.typeAmelioration)}>Amélioration</span>;
            default:
                return null;
        }
    };

    return (
        <div className={styles.sectionFull}>
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                    <Calendar size={20} aria-hidden="true" /> Historique des interventions ({interventions.length})
                </h2>
                <button className="btn btn-sm btn-primary" onClick={onAddIntervention}>
                    <Plus size={16} aria-hidden="true" /> Ajouter
                </button>
            </div>

            {interventions.length > 0 ? (
                <div className={styles.interventionsList}>
                    {interventions.map(intervention => (
                        <div key={intervention.id} className={styles.interventionCard}>
                            <div className={styles.interventionHeader}>
                                <div className={styles.interventionDate}>
                                    <Calendar size={14} aria-hidden="true" />
                                    {new Date(intervention.date).toLocaleDateString('fr-FR', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                </div>
                                <div className={styles.interventionBadges}>
                                    {getTypeBadge(intervention.type)}
                                    {getStatusBadge(intervention.statut)}
                                </div>
                            </div>
                            <h4 className={styles.interventionTitle}>{intervention.titre}</h4>
                            <p className={styles.interventionDesc}>{intervention.description}</p>
                            <div className={styles.interventionFooter}>
                                <div className={styles.interventionMeta}>
                                    {intervention.montant !== undefined && intervention.montant > 0 && (
                                        <span className={styles.interventionMontant}>
                                            {intervention.montant.toLocaleString()} €
                                        </span>
                                    )}
                                    {intervention.domaine && (
                                        <span className={styles.interventionDomaine}>
                                            {MOCK_DOMAINES_ACTIVITE.find(d => d.value === intervention.domaine)?.label || intervention.domaine}
                                        </span>
                                    )}
                                </div>
                                <div className={styles.interventionActions}>
                                    {intervention.ordreServiceId && (
                                        <Link
                                            href={`/maintenance/service-orders/${intervention.ordreServiceId}`}
                                            className={styles.interventionLink}
                                        >
                                            <ExternalLink size={14} aria-hidden="true" /> Voir l'OS
                                        </Link>
                                    )}
                                    {intervention.pieceJointes && intervention.pieceJointes.length > 0 && (
                                        <button className={styles.interventionLink}>
                                            <Download size={14} aria-hidden="true" /> {intervention.pieceJointes.length} pièce(s)
                                        </button>
                                    )}
                                </div>
                            </div>
                            {intervention.commentaires && (
                                <div className={styles.interventionComments}>
                                    <strong>Note :</strong> {intervention.commentaires}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className={styles.emptyState}>
                    <Calendar size={48} aria-hidden="true" />
                    <p>Aucune intervention enregistrée</p>
                    <button className="btn btn-primary" onClick={onAddIntervention}>
                        <Plus size={18} aria-hidden="true" /> Ajouter une intervention
                    </button>
                </div>
            )}
        </div>
    );
}

interface AvisListProps {
    avis: AvisPrestataire[];
}

export function AvisList({ avis }: AvisListProps) {
    if (avis.length === 0) return null;

    return (
        <div className={styles.sectionFull}>
            <h2 className={styles.sectionTitle}>
                <Star size={20} aria-hidden="true" /> Avis des copropriétés ({avis.length})
            </h2>
            <div className={styles.avisList}>
                {avis.map(a => (
                    <div key={a.id} className={styles.avisCard}>
                        <div className={styles.avisHeader}>
                            <div className={styles.avisNote}>
                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        size={16}
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
        </div>
    );
}

interface NotesSectionProps {
    notes: string;
}

export function NotesSection({ notes }: NotesSectionProps) {
    if (!notes) return null;

    return (
        <div className={styles.sectionFull}>
            <h2 className={styles.sectionTitle}>
                <FileText size={20} aria-hidden="true" /> Notes internes
            </h2>
            <p className={styles.notes}>{notes}</p>
        </div>
    );
}
