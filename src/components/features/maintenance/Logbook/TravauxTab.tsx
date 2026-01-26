'use client';

import {
    Calendar,
    CheckCircle,
    Euro,
    TrendingUp,
    AlertCircle,
    FileText,
    FileCheck,
    Search,
    Activity
} from 'lucide-react';
import clsx from 'clsx';
import type { TravauxTabProps } from './types';
import styles from '@/app/(dashboard)/maintenance/logbook/logbook.module.css';

export function TravauxTab({ travaux }: TravauxTabProps) {
    const travauxVotesEnCours = travaux.filter(t => t.statut === 'VOTE' || t.statut === 'EN_COURS');
    const travauxPrevus = travaux.filter(t => t.statut === 'PREVU');
    const travauxEtude = travaux.filter(t => t.statut === 'A_L_ETUDE');
    const travauxTermines = travaux.filter(t => t.statut === 'TERMINE');
    const travauxPPT = travaux.filter(t => t.issuPPT);

    return (
        <div className={styles.travauxSection}>
            {/* Bannière PPT obligatoire */}
            <div className={styles.pptBanner}>
                <div className={styles.pptBannerIcon}>
                    <FileCheck size={24} aria-hidden="true" />
                </div>
                <div className={styles.pptBannerContent}>
                    <h3>Plan Pluriannuel de Travaux (PPT)</h3>
                    <p>
                        Obligatoire depuis le 1er janvier 2023 pour les copropriétés de plus de 15 ans (loi Climat et Résilience).
                        Le PPT planifie les travaux sur 10 ans pour préserver le bâti et améliorer la performance énergétique.
                    </p>
                    <div className={styles.pptBannerStats}>
                        <div className={styles.pptStat}>
                            <span className={styles.pptStatValue}>{travauxPPT.length}</span>
                            <span className={styles.pptStatLabel}>travaux issus du PPT</span>
                        </div>
                        <div className={styles.pptStat}>
                            <span className={styles.pptStatValue}>
                                {(travauxPPT.reduce((sum, t) => sum + t.montantEstime, 0) / 1000).toFixed(0)}k€
                            </span>
                            <span className={styles.pptStatLabel}>budget prévisionnel PPT</span>
                        </div>
                    </div>
                </div>
                <button className="btn btn-secondary btn-sm">
                    <FileText size={14} aria-hidden="true" /> Consulter le PPT
                </button>
            </div>

            {/* KPIs Travaux */}
            <div className={styles.travauxKpis}>
                <div className={clsx(styles.travauxKpi, styles.kpiVote)}>
                    <div className={styles.kpiIconWrap}><CheckCircle size={20} aria-hidden="true" /></div>
                    <div>
                        <p className={styles.kpiValue}>
                            {travauxVotesEnCours.reduce((sum, t) => sum + (t.montantVote || t.montantEstime), 0).toLocaleString()} €
                        </p>
                        <p className={styles.kpiLabel}>Votés / En cours</p>
                    </div>
                    <span className={styles.kpiCount}>{travauxVotesEnCours.length}</span>
                </div>
                <div className={clsx(styles.travauxKpi, styles.kpiPrevu)}>
                    <div className={styles.kpiIconWrap}><Calendar size={20} aria-hidden="true" /></div>
                    <div>
                        <p className={styles.kpiValue}>
                            {travauxPrevus.reduce((sum, t) => sum + t.montantEstime, 0).toLocaleString()} €
                        </p>
                        <p className={styles.kpiLabel}>Prévus (à voter)</p>
                    </div>
                    <span className={styles.kpiCount}>{travauxPrevus.length}</span>
                </div>
                <div className={clsx(styles.travauxKpi, styles.kpiEtude)}>
                    <div className={styles.kpiIconWrap}><Search size={20} aria-hidden="true" /></div>
                    <div>
                        <p className={styles.kpiValue}>
                            {travauxEtude.reduce((sum, t) => sum + t.montantEstime, 0).toLocaleString()} €
                        </p>
                        <p className={styles.kpiLabel}>À l&apos;étude</p>
                    </div>
                    <span className={styles.kpiCount}>{travauxEtude.length}</span>
                </div>
                <div className={clsx(styles.travauxKpi, styles.kpiTermine)}>
                    <div className={styles.kpiIconWrap}><Activity size={20} aria-hidden="true" /></div>
                    <div>
                        <p className={styles.kpiValue}>
                            {travauxTermines.reduce((sum, t) => sum + (t.montantReel || t.montantVote || t.montantEstime), 0).toLocaleString()} €
                        </p>
                        <p className={styles.kpiLabel}>Réalisés</p>
                    </div>
                    <span className={styles.kpiCount}>{travauxTermines.length}</span>
                </div>
            </div>

            {/* Section Travaux votés et en cours */}
            {travauxVotesEnCours.length > 0 && (
                <TravauxCategory
                    title="Travaux votés & en cours"
                    icon={<CheckCircle size={18} aria-hidden="true" />}
                    count={travauxVotesEnCours.length}
                    travaux={travauxVotesEnCours}
                    cardStyle="vote"
                />
            )}

            {/* Section Travaux prévus (à voter) */}
            {travauxPrevus.length > 0 && (
                <TravauxCategory
                    title="Travaux prévus (en attente de vote)"
                    icon={<Calendar size={18} aria-hidden="true" />}
                    count={travauxPrevus.length}
                    travaux={travauxPrevus}
                    cardStyle="prevu"
                />
            )}

            {/* Section Travaux à l'étude */}
            {travauxEtude.length > 0 && (
                <TravauxCategory
                    title="Travaux à l'étude"
                    icon={<Search size={18} aria-hidden="true" />}
                    count={travauxEtude.length}
                    travaux={travauxEtude}
                    cardStyle="etude"
                    description="Projets en cours d'analyse, non encore soumis au vote de l'assemblée générale"
                />
            )}

            {/* Section Historique (terminés) */}
            {travauxTermines.length > 0 && (
                <TravauxCategory
                    title="Historique des travaux réalisés"
                    icon={<Activity size={18} aria-hidden="true" />}
                    count={travauxTermines.length}
                    travaux={travauxTermines}
                    cardStyle="termine"
                />
            )}
        </div>
    );
}

interface TravauxCategoryProps {
    title: string;
    icon: React.ReactNode;
    count: number;
    travaux: TravauxTabProps['travaux'];
    cardStyle: 'vote' | 'prevu' | 'etude' | 'termine';
    description?: string;
}

function TravauxCategory({ title, icon, count, travaux, cardStyle, description }: TravauxCategoryProps) {
    return (
        <div className={styles.travauxCategory}>
            <div className={styles.categoryHeader}>
                <h3>{icon} {title}</h3>
                <span className={styles.categoryCount}>{count}</span>
            </div>
            {description && <p className={styles.categoryDesc}>{description}</p>}
            <div className={styles.travauxGrid}>
                {travaux.map(t => (
                    <TravauxCard key={t.id} travaux={t} cardStyle={cardStyle} />
                ))}
            </div>
        </div>
    );
}

interface TravauxCardProps {
    travaux: TravauxTabProps['travaux'][0];
    cardStyle: 'vote' | 'prevu' | 'etude' | 'termine';
}

function TravauxCard({ travaux, cardStyle }: TravauxCardProps) {
    const getStatutLabel = () => {
        switch (travaux.statut) {
            case 'VOTE': return 'Voté';
            case 'EN_COURS': return 'En cours';
            case 'PREVU': return 'Prévu';
            case 'A_L_ETUDE': return "À l'étude";
            case 'TERMINE': return 'Terminé';
            default: return travaux.statut;
        }
    };

    return (
        <div className={clsx(
            styles.travauxCard,
            cardStyle === 'vote' && styles.travauxCardVote,
            cardStyle === 'prevu' && styles.travauxCardPrevu,
            cardStyle === 'etude' && styles.travauxCardEtude,
            cardStyle === 'termine' && styles.travauxCardTermine,
            travaux.statut === 'EN_COURS' && styles.travauxCardEnCours,
            travaux.priorite === 'HAUTE' && cardStyle === 'prevu' && styles.prioriteHaute
        )}>
            <div className={styles.travauxHeader}>
                <div className={styles.travauxTitleGroup}>
                    <h3>{travaux.titre}</h3>
                    {travaux.issuPPT && <span className={styles.pptTag}>PPT</span>}
                </div>
                <span className={clsx(styles.badge, styles[travaux.statut.toLowerCase()])}>
                    {getStatutLabel()}
                </span>
            </div>
            <p className={styles.travauxDesc}>{travaux.description}</p>
            <div className={styles.travauxDetails}>
                {cardStyle === 'termine' && travaux.dateRealisation ? (
                    <div className={styles.travauxDetailRow}>
                        <span><CheckCircle size={14} aria-hidden="true" /> Réalisé le</span>
                        <strong>{new Date(travaux.dateRealisation).toLocaleDateString('fr-FR')}</strong>
                    </div>
                ) : cardStyle === 'etude' ? (
                    <div className={styles.travauxDetailRow}>
                        <span><Calendar size={14} aria-hidden="true" /> Horizon</span>
                        <strong>{new Date(travaux.datePrevisionnelle).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })}</strong>
                    </div>
                ) : (
                    <div className={styles.travauxDetailRow}>
                        <span><Calendar size={14} aria-hidden="true" /> {cardStyle === 'vote' ? 'Date prévue' : 'Échéance'}</span>
                        <strong>{new Date(travaux.datePrevisionnelle).toLocaleDateString('fr-FR')}</strong>
                    </div>
                )}

                {cardStyle === 'vote' && travaux.dateVote && (
                    <div className={styles.travauxDetailRow}>
                        <span><CheckCircle size={14} aria-hidden="true" /> Voté le</span>
                        <strong>{new Date(travaux.dateVote).toLocaleDateString('fr-FR')}</strong>
                    </div>
                )}

                <div className={styles.travauxDetailRow}>
                    <span><Euro size={14} aria-hidden="true" /> {cardStyle === 'termine' ? 'Coût final' : cardStyle === 'vote' ? 'Montant voté' : 'Estimation'}</span>
                    <strong className={cardStyle === 'vote' ? styles.montantVote : cardStyle === 'termine' ? styles.montantReel : undefined}>
                        {(cardStyle === 'termine'
                            ? (travaux.montantReel || travaux.montantVote || travaux.montantEstime)
                            : cardStyle === 'vote'
                                ? (travaux.montantVote || travaux.montantEstime)
                                : travaux.montantEstime
                        ).toLocaleString()} €
                    </strong>
                </div>

                {(cardStyle === 'vote' || cardStyle === 'prevu') && (
                    <div className={styles.travauxDetailRow}>
                        <span><TrendingUp size={14} aria-hidden="true" /> Priorité</span>
                        <span className={clsx(styles.prioriteBadge, styles[`priorite${travaux.priorite}`])}>
                            {travaux.priorite === 'HAUTE' ? 'Haute' : travaux.priorite === 'MOYENNE' ? 'Moyenne' : 'Basse'}
                        </span>
                    </div>
                )}
            </div>
            {travaux.observations && (
                <div className={styles.observations}>
                    <AlertCircle size={14} aria-hidden="true" />
                    <span>{travaux.observations}</span>
                </div>
            )}
        </div>
    );
}
