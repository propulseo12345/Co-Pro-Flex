'use client';

import { useState, useMemo } from 'react';
import { ContratDetaille, ContratSyndic, DocumentSyndic } from '@/types';
import { Building2, Phone, Mail, Calendar, Euro, RefreshCw, Clock, Check, XCircle, TrendingUp, Edit2, FileText, Download, Plus, AlertTriangle, CalendarClock, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import styles from './Contracts.module.css';
import { formatDate, formatMontant, getJoursAvantEcheance } from './utils';
import { SYNDIC_DOC_LABELS } from './types';

// Helper pour calculer l'avancement d'un contrat multi-années
interface ContratProgress {
    anneeEnCours: number;
    anneesTotales: number;
    pourcentageTotal: number;
    pourcentageAnneeEnCours: number;
    estDerniereAnnee: boolean;
    dateRenouvellement: string;
    moisRenouvellement: string;
}

function getContratProgress(dateDebut: string, dateFin: string): ContratProgress {
    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);
    const aujourdhui = new Date();

    // Calculer la durée totale en années
    const anneesTotales = Math.max(1, Math.round((fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24 * 365)));

    // Calculer l'année en cours (basé sur les années civiles ou anniversaires)
    const anneeDebut = debut.getFullYear();
    const anneeFin = fin.getFullYear();
    const anneeActuelle = aujourdhui.getFullYear();

    // Nombre d'années écoulées depuis le début
    let anneeEnCours = anneeActuelle - anneeDebut + 1;
    if (aujourdhui < debut) anneeEnCours = 1;
    if (anneeEnCours > anneesTotales) anneeEnCours = anneesTotales;
    if (anneeEnCours < 1) anneeEnCours = 1;

    // Pourcentage total écoulé
    const dureeTotal = fin.getTime() - debut.getTime();
    const dureeEcoulee = aujourdhui.getTime() - debut.getTime();
    let pourcentageTotal = Math.round((dureeEcoulee / dureeTotal) * 100);
    if (pourcentageTotal < 0) pourcentageTotal = 0;
    if (pourcentageTotal > 100) pourcentageTotal = 100;

    // Pourcentage de l'année en cours
    const debutAnneeContrat = new Date(anneeDebut + anneeEnCours - 1, debut.getMonth(), debut.getDate());
    const finAnneeContrat = new Date(anneeDebut + anneeEnCours, debut.getMonth(), debut.getDate());
    const dureeAnnee = finAnneeContrat.getTime() - debutAnneeContrat.getTime();
    const ecouleeAnnee = aujourdhui.getTime() - debutAnneeContrat.getTime();
    let pourcentageAnneeEnCours = Math.round((ecouleeAnnee / dureeAnnee) * 100);
    if (pourcentageAnneeEnCours < 0) pourcentageAnneeEnCours = 0;
    if (pourcentageAnneeEnCours > 100) pourcentageAnneeEnCours = 100;

    // Mois de renouvellement
    const moisNoms = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const moisRenouvellement = moisNoms[fin.getMonth()];
    const dateRenouvellement = `${moisRenouvellement} ${fin.getFullYear()}`;

    return {
        anneeEnCours,
        anneesTotales,
        pourcentageTotal,
        pourcentageAnneeEnCours,
        estDerniereAnnee: anneeEnCours === anneesTotales,
        dateRenouvellement,
        moisRenouvellement: `${moisRenouvellement.charAt(0).toUpperCase()}${moisRenouvellement.slice(1)}`
    };
}

interface ContractsStatsProps {
    contrats: ContratDetaille[];
    contratSyndic: ContratSyndic | null;
    onSyndicAction: () => void;
    onEditSyndic: () => void;
    onManageSyndicDocuments?: () => void;
}

export default function ContractsStats({
    contrats,
    contratSyndic,
    onSyndicAction,
    onEditSyndic,
    onManageSyndicDocuments
}: ContractsStatsProps) {
    const [syndicTab, setSyndicTab] = useState<'infos' | 'documents' | 'historique'>('infos');
    const [showMontantDetail, setShowMontantDetail] = useState(false);

    // Documents du syndic (depuis le contrat ou tableau vide)
    const syndicDocuments = contratSyndic?.documents || [];

    // Handler pour télécharger un document syndic
    const handleDownloadSyndicDoc = (doc: DocumentSyndic) => {
        const content = `
================================================================================
                    DOCUMENT SYNDIC - ${doc.nom}
================================================================================

Type de document : ${SYNDIC_DOC_LABELS[doc.type] || doc.type}
Date d'upload : ${formatDate(doc.dateUpload)}
Syndic : ${contratSyndic?.nomSyndic || 'N/A'}
Cabinet : ${contratSyndic?.cabinetNom || 'N/A'}
Numéro de contrat : ${contratSyndic?.numeroContrat || 'N/A'}

--------------------------------------------------------------------------------
INFORMATIONS CONTRAT SYNDIC
--------------------------------------------------------------------------------
Période : Du ${formatDate(contratSyndic?.dateDebut || '')} au ${formatDate(contratSyndic?.dateFin || '')}
Montant annuel : ${formatMontant(contratSyndic?.montantAnnuel || 0)}
Tacite reconduction : ${contratSyndic?.taciteReconduction ? 'Oui' : 'Non'}

--------------------------------------------------------------------------------
CONTENU
--------------------------------------------------------------------------------
Ce document est une simulation. Dans un environnement de production,
le fichier original serait téléchargé depuis le serveur.

================================================================================
Document simulé généré le ${new Date().toLocaleDateString('fr-FR')}
CoProFlex - Gestion de copropriété
================================================================================
`.trim();

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${doc.nom.replace(/\s+/g, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const stats = useMemo(() => {
        const actifs = contrats.filter(c => c.statut === 'ACTIF').length;
        const aRenouveler = contrats.filter(c => c.statut === 'A_RENOUVELER').length;
        const expires = contrats.filter(c => c.statut === 'EXPIRE').length;
        const resilies = contrats.filter(c => c.statut === 'RESILIE').length;

        // Liste des contrats actifs et à renouveler (pour le drill-down)
        const contratsInclus = contrats.filter(c => c.statut === 'ACTIF' || c.statut === 'A_RENOUVELER');

        // Montant total des contrats actifs et à renouveler (excluant expirés)
        const montantTotal = contratsInclus.reduce((sum, c) => sum + c.coutAnnuel, 0);
        const montantSyndic = contratSyndic?.montantAnnuel || 0;
        const montantTotalAvecSyndic = montantTotal + montantSyndic;

        // Compter les assurances expirées (critique)
        const assurancesExpirees = contrats.filter(c => c.statut === 'EXPIRE' && c.type === 'ASSURANCE').length;

        return {
            actifs,
            aRenouveler,
            expires,
            resilies,
            montantTotal,
            montantSyndic,
            montantTotalAvecSyndic,
            assurancesExpirees,
            contratsInclus
        };
    }, [contrats, contratSyndic]);

    const syndicJoursRestants = contratSyndic ? getJoursAvantEcheance(contratSyndic.dateFin) : 0;
    const syndicAlerte = syndicJoursRestants <= 180 && syndicJoursRestants > 0;
    const syndicProgress = contratSyndic ? getContratProgress(contratSyndic.dateDebut, contratSyndic.dateFin) : null;

    const getSyndicStatusConfig = () => {
        if (!contratSyndic) {
            return { label: 'Non configuré', className: styles.kpiSyndicResilie, icon: XCircle };
        }
        if (contratSyndic.statut === 'RESILIE') {
            return { label: 'Résilié', className: styles.kpiSyndicResilie, icon: XCircle };
        }
        if (contratSyndic.statut === 'A_RENOUVELER' || syndicAlerte) {
            return { label: syndicJoursRestants <= 90 ? 'Renouvellement urgent' : 'À renouveler bientôt', className: styles.kpiSyndicWarning, icon: Clock };
        }
        return { label: 'Actif', className: styles.kpiSyndicActif, icon: Check };
    };

    const syndicConfig = getSyndicStatusConfig();
    const SyndicIcon = syndicConfig.icon;

    return (
        <div className={styles.kpiContainer}>
            {/* Alerte contrats expirés */}
            {stats.expires > 0 && (
                <div className={styles.alertBanner}>
                    <AlertTriangle size={20} aria-hidden="true" />
                    <span>
                        <strong>{stats.expires} contrat{stats.expires > 1 ? 's' : ''} expiré{stats.expires > 1 ? 's' : ''}</strong>
                        {stats.assurancesExpirees > 0 && (
                            <> dont <strong>{stats.assurancesExpirees} assurance{stats.assurancesExpirees > 1 ? 's' : ''}</strong> - Risque juridique !</>
                        )}
                    </span>
                </div>
            )}

            {/* KPI Contrats */}
            <div className={styles.kpiGrid}>
                <div className={styles.kpiCard}>
                    <div className={clsx(styles.kpiIcon, styles.kpiIconSuccess)}>
                        <Check size={24} aria-hidden="true" />
                    </div>
                    <div className={styles.kpiContent}>
                        <span className={styles.kpiValue}>{stats.actifs}</span>
                        <span className={styles.kpiLabel}>Contrats actifs</span>
                    </div>
                </div>

                <div className={styles.kpiCard}>
                    <div className={clsx(styles.kpiIcon, styles.kpiIconWarning)}>
                        <RefreshCw size={24} aria-hidden="true" />
                    </div>
                    <div className={styles.kpiContent}>
                        <span className={styles.kpiValue}>{stats.aRenouveler}</span>
                        <span className={styles.kpiLabel}>À renouveler</span>
                    </div>
                </div>

                {stats.expires > 0 && (
                    <div className={clsx(styles.kpiCard, styles.kpiCardDanger)}>
                        <div className={clsx(styles.kpiIcon, styles.kpiIconDanger)}>
                            <XCircle size={24} aria-hidden="true" />
                        </div>
                        <div className={styles.kpiContent}>
                            <span className={styles.kpiValue}>{stats.expires}</span>
                            <span className={styles.kpiLabel}>Expirés</span>
                        </div>
                    </div>
                )}

                <div
                    className={clsx(styles.kpiCard, styles.kpiCardClickable)}
                    onClick={() => setShowMontantDetail(!showMontantDetail)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setShowMontantDetail(!showMontantDetail)}
                >
                    <div className={clsx(styles.kpiIcon, styles.kpiIconPrimary)}>
                        <TrendingUp size={24} aria-hidden="true" />
                    </div>
                    <div className={styles.kpiContent}>
                        <span className={styles.kpiValue}>{formatMontant(stats.montantTotalAvecSyndic)}</span>
                        <span className={styles.kpiLabel}>Montant total annuel</span>
                        <span className={styles.kpiBreakdown}>
                            Contrats {formatMontant(stats.montantTotal)} + Syndic {formatMontant(stats.montantSyndic)}
                        </span>
                    </div>
                    <div className={styles.kpiExpandIcon}>
                        {showMontantDetail ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                </div>
            </div>

            {/* Drill-down du montant total */}
            {showMontantDetail && (
                <div className={styles.montantDetailPanel}>
                    <div className={styles.montantDetailHeader}>
                        <h3>Détail du montant total annuel</h3>
                        <span className={styles.montantDetailTotal}>{formatMontant(stats.montantTotalAvecSyndic)}</span>
                    </div>
                    <div className={styles.montantDetailList}>
                        {/* Syndic */}
                        <div className={styles.montantDetailItem}>
                            <div className={styles.montantDetailItemIcon}>
                                <Building2 size={16} />
                            </div>
                            <div className={styles.montantDetailItemInfo}>
                                <span className={styles.montantDetailItemName}>
                                    Contrat Syndic - {contratSyndic?.nomSyndic || 'Non configuré'}
                                </span>
                                <span className={styles.montantDetailItemMeta}>
                                    Mandat de gestion
                                </span>
                            </div>
                            <span className={styles.montantDetailItemAmount}>
                                {formatMontant(stats.montantSyndic)}
                            </span>
                        </div>

                        {/* Contrats actifs/à renouveler */}
                        {stats.contratsInclus.map(contrat => (
                            <div key={contrat.id} className={styles.montantDetailItem}>
                                <div className={clsx(
                                    styles.montantDetailItemIcon,
                                    contrat.statut === 'A_RENOUVELER' && styles.montantDetailItemIconWarning
                                )}>
                                    <FileText size={16} />
                                </div>
                                <div className={styles.montantDetailItemInfo}>
                                    <span className={styles.montantDetailItemName}>
                                        {contrat.nom}
                                        {contrat.statut === 'A_RENOUVELER' && (
                                            <span className={styles.montantDetailBadgeWarning}>À renouveler</span>
                                        )}
                                    </span>
                                    <span className={styles.montantDetailItemMeta}>
                                        {contrat.fournisseur} • {contrat.type}
                                    </span>
                                </div>
                                <span className={styles.montantDetailItemAmount}>
                                    {formatMontant(contrat.coutAnnuel)}
                                </span>
                            </div>
                        ))}

                        {stats.contratsInclus.length === 0 && (
                            <div className={styles.montantDetailEmpty}>
                                Aucun autre contrat actif
                            </div>
                        )}
                    </div>
                    <div className={styles.montantDetailFooter}>
                        <span>Total ({stats.contratsInclus.length + 1} contrats)</span>
                        <span className={styles.montantDetailFooterTotal}>{formatMontant(stats.montantTotalAvecSyndic)}</span>
                    </div>
                </div>
            )}

            {/* Section Syndic avec onglets */}
            <div className={clsx(styles.kpiSyndicCard, syndicConfig.className)}>
                <div className={styles.kpiSyndicMain}>
                    <div className={styles.kpiSyndicIcon}>
                        <Building2 size={28} aria-hidden="true" />
                    </div>
                    <div className={styles.kpiSyndicInfo}>
                        <div className={styles.kpiSyndicHeader}>
                            <h3>Contrat du Syndic</h3>
                            <div className={styles.kpiSyndicStatus}>
                                <SyndicIcon size={14} />
                                <span>{syndicConfig.label}</span>
                            </div>
                        </div>
                        <p className={styles.kpiSyndicName}>{contratSyndic?.nomSyndic || 'Non configuré'}</p>

                        {/* Onglets */}
                        <div className={styles.syndicTabs}>
                            <button
                                className={clsx(styles.syndicTab, syndicTab === 'infos' && styles.syndicTabActive)}
                                onClick={() => setSyndicTab('infos')}
                            >
                                Informations
                            </button>
                            <button
                                className={clsx(styles.syndicTab, syndicTab === 'documents' && styles.syndicTabActive)}
                                onClick={() => setSyndicTab('documents')}
                            >
                                Documents ({syndicDocuments.length})
                            </button>
                            <button
                                className={clsx(styles.syndicTab, syndicTab === 'historique' && styles.syndicTabActive)}
                                onClick={() => setSyndicTab('historique')}
                            >
                                Historique
                            </button>
                        </div>

                        {/* Contenu des onglets */}
                        {syndicTab === 'infos' && contratSyndic && (
                            <div className={styles.kpiSyndicMeta}>
                                <span><Euro size={14} aria-hidden="true" /> {formatMontant(contratSyndic.montantAnnuel)}/an</span>
                                <span><Calendar size={14} aria-hidden="true" /> Du {formatDate(contratSyndic.dateDebut)} au {formatDate(contratSyndic.dateFin)}</span>

                                {/* Année en cours et progression */}
                                {syndicProgress && syndicProgress.anneesTotales > 1 && (
                                    <div className={styles.contratProgressSection}>
                                        <div className={styles.contratProgressHeader}>
                                            <span className={styles.contratProgressLabel}>
                                                <CalendarClock size={14} aria-hidden="true" />
                                                <strong>Année {syndicProgress.anneeEnCours}/{syndicProgress.anneesTotales}</strong>
                                                {syndicProgress.estDerniereAnnee && (
                                                    <span className={styles.derniereAnneeBadge}>Dernière année</span>
                                                )}
                                            </span>
                                            {syndicJoursRestants > 0 && (
                                                <span className={styles.joursRestantsCompact}>
                                                    {syndicJoursRestants} jours restants
                                                </span>
                                            )}
                                        </div>
                                        <div className={styles.contratProgressBar}>
                                            <div
                                                className={clsx(
                                                    styles.contratProgressFill,
                                                    syndicProgress.estDerniereAnnee && styles.contratProgressFillWarning
                                                )}
                                                style={{ width: `${syndicProgress.pourcentageTotal}%` }}
                                            />
                                        </div>
                                        <div className={styles.contratProgressInfo}>
                                            <span>{syndicProgress.pourcentageTotal}% du contrat écoulé</span>
                                            <span className={styles.renouvellementInfo}>
                                                <RefreshCw size={12} aria-hidden="true" />
                                                Renouvellement en {syndicProgress.dateRenouvellement}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Si contrat d'1 an, afficher simplement les jours restants */}
                                {syndicProgress && syndicProgress.anneesTotales === 1 && syndicJoursRestants > 0 && (
                                    <span className={styles.kpiSyndicDays}>
                                        <Clock size={14} aria-hidden="true" /> {syndicJoursRestants} jours restants
                                    </span>
                                )}

                                {contratSyndic.taciteReconduction && (
                                    <span><RefreshCw size={14} aria-hidden="true" /> Tacite reconduction</span>
                                )}
                                {contratSyndic.telephone && (
                                    <span><Phone size={14} aria-hidden="true" /> {contratSyndic.telephone}</span>
                                )}
                                {contratSyndic.email && (
                                    <span><Mail size={14} aria-hidden="true" /> {contratSyndic.email}</span>
                                )}
                            </div>
                        )}
                        {syndicTab === 'infos' && !contratSyndic && (
                            <div className={styles.kpiSyndicMeta}>
                                <span>Aucun contrat syndic configuré</span>
                            </div>
                        )}

                        {syndicTab === 'documents' && (
                            <div className={styles.syndicDocuments}>
                                {syndicDocuments.length > 0 ? (
                                    syndicDocuments.map(doc => (
                                        <div key={doc.id} className={styles.syndicDocument}>
                                            <FileText size={16} aria-hidden="true" />
                                            <div className={styles.syndicDocInfo}>
                                                <span className={styles.syndicDocName}>{doc.nom}</span>
                                                <span className={styles.syndicDocMeta}>
                                                    {SYNDIC_DOC_LABELS[doc.type]} • {formatDate(doc.dateUpload)}
                                                </span>
                                            </div>
                                            <button
                                                className="btn btn-sm btn-secondary"
                                                aria-label={`Télécharger ${doc.nom}`}
                                                onClick={() => handleDownloadSyndicDoc(doc)}
                                            >
                                                <Download size={14} aria-hidden="true" />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p className={styles.documentEmpty}>Aucun document</p>
                                )}
                                {onManageSyndicDocuments && (
                                    <button
                                        className="btn btn-sm btn-secondary"
                                        onClick={onManageSyndicDocuments}
                                        style={{ marginTop: '0.5rem' }}
                                    >
                                        <Plus size={14} aria-hidden="true" /> Gérer les documents
                                    </button>
                                )}
                            </div>
                        )}

                        {syndicTab === 'historique' && (
                            <div className={styles.syndicHistorique}>
                                <div className={styles.historiqueItem}>
                                    <div className={styles.historiqueDate}>15/01/2024</div>
                                    <div className={styles.historiqueContent}>
                                        <strong>Renouvellement du mandat</strong>
                                        <span>Mandat renouvelé pour 3 ans (2024-2027)</span>
                                    </div>
                                </div>
                                <div className={styles.historiqueItem}>
                                    <div className={styles.historiqueDate}>10/01/2024</div>
                                    <div className={styles.historiqueContent}>
                                        <strong>AG de désignation</strong>
                                        <span>Vote favorable à 87% pour le renouvellement</span>
                                    </div>
                                </div>
                                <div className={styles.historiqueItem}>
                                    <div className={styles.historiqueDate}>20/03/2024</div>
                                    <div className={styles.historiqueContent}>
                                        <strong>Avenant tarification</strong>
                                        <span>Ajustement des honoraires suite à l&apos;inflation</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className={styles.kpiSyndicActions}>
                    {contratSyndic && contratSyndic.statut !== 'RESILIE' && syndicAlerte && (
                        <button className="btn btn-warning" onClick={onSyndicAction}>
                            <RefreshCw size={16} aria-hidden="true" /> Préparer le renouvellement
                        </button>
                    )}
                    <button className="btn btn-secondary" onClick={onEditSyndic}>
                        <Edit2 size={16} aria-hidden="true" /> Gérer
                    </button>
                </div>
            </div>
        </div>
    );
}
