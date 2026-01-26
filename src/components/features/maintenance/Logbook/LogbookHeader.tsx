'use client';

import {
    Download,
    Plus,
    FileText,
    Briefcase,
    TrendingUp,
    Activity,
    ShieldCheck,
    FileCheck,
    ClipboardList
} from 'lucide-react';
import type { LogbookHeaderProps, FiltreKpi } from './types';
import styles from '@/app/(dashboard)/maintenance/logbook/logbook.module.css';

/** Configuration des tuiles KPI */
const TUILES_CONFIG: Array<{
    id: FiltreKpi;
    label: string;
    kpiKey: keyof LogbookHeaderProps['kpis'];
    icon: React.ElementType;
    couleur: { bg: string; color: string };
    title: string;
}> = [
    {
        id: 'contrats',
        label: 'Contrats actifs',
        kpiKey: 'contratsActifs',
        icon: Briefcase,
        couleur: { bg: 'var(--primary-light)', color: 'var(--primary)' },
        title: 'Filtrer les contrats actifs',
    },
    {
        id: 'en_cours',
        label: 'En cours',
        kpiKey: 'interventionsEnCours',
        icon: Activity,
        couleur: { bg: 'var(--warning-light)', color: 'var(--warning)' },
        title: 'Filtrer les interventions en cours',
    },
    {
        id: 'travaux_prevus',
        label: 'Travaux prévus',
        kpiKey: 'travauxPrevus',
        icon: TrendingUp,
        couleur: { bg: 'var(--info-light)', color: 'var(--info)' },
        title: 'Filtrer les travaux prévisionnels',
    },
    {
        id: 'assurances',
        label: 'Assurances',
        kpiKey: 'assurancesActives',
        icon: ShieldCheck,
        couleur: { bg: 'var(--success-light)', color: 'var(--success)' },
        title: 'Filtrer les assurances actives',
    },
    {
        id: 'documents_valides',
        label: 'Documents valides',
        kpiKey: 'documentsValides',
        icon: FileCheck,
        couleur: { bg: 'var(--secondary-light)', color: 'var(--secondary)' },
        title: 'Filtrer les documents valides',
    },
    {
        id: 'tous',
        label: 'Total interventions',
        kpiKey: 'totalInterventions',
        icon: ClipboardList,
        couleur: { bg: '#f3e8ff', color: '#9333ea' },
        title: 'Afficher toutes les interventions',
    },
];

export function LogbookHeader({
    formData,
    kpis,
    showExportMenu,
    filtreActif,
    onToggleExportMenu,
    onExport,
    onNewIntervention,
    onFiltreChange,
}: LogbookHeaderProps) {
    return (
        <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
                <div className={styles.headerMain}>
                    <div className={styles.titleRow}>
                        <h1 className={styles.title}>Carnet d&apos;entretien</h1>
                        <span className={styles.headerBadge}>Obligatoire</span>
                    </div>
                    <p className={styles.subtitle}>
                        {formData.nom} - {formData.adresse}, {formData.codePostal} {formData.ville}
                    </p>
                </div>
                <div className={styles.headerActions}>
                    <div className={styles.exportDropdown}>
                        <button
                            className={styles.exportBtn}
                            onClick={onToggleExportMenu}
                        >
                            <Download size={16} aria-hidden="true" /> Exporter
                        </button>
                        {showExportMenu && (
                            <div className={styles.exportMenu}>
                                <button onClick={() => onExport('PDF_COMPLET')}>
                                    <FileText size={16} aria-hidden="true" /> PDF Complet
                                </button>
                                <button onClick={() => onExport('EXCEL')}>
                                    <FileText size={16} aria-hidden="true" /> Excel (interventions)
                                </button>
                                <button onClick={() => onExport('PDF_ACQUEREURS')}>
                                    <FileText size={16} aria-hidden="true" /> PDF Acquéreurs
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        className={styles.primaryBtn}
                        onClick={onNewIntervention}
                    >
                        <Plus size={16} aria-hidden="true" /> Nouvelle intervention
                    </button>
                </div>
            </div>

            {/* Tuiles KPI interactives */}
            <div className={styles.kpiGrid} role="group" aria-label="Filtres du carnet">
                {TUILES_CONFIG.map((tuile) => {
                    const estActif = filtreActif === tuile.id;
                    const Icon = tuile.icon;
                    const valeur = kpis[tuile.kpiKey];

                    return (
                        <button
                            key={tuile.id}
                            type="button"
                            className={`${styles.kpiCardClickable} ${estActif ? styles.kpiCardActive : ''}`}
                            onClick={() => onFiltreChange(tuile.id)}
                            title={tuile.title}
                            aria-pressed={estActif}
                            aria-label={`${tuile.label} : ${valeur} éléments`}
                        >
                            {/* Indicateur actif */}
                            {estActif && (
                                <span
                                    className={styles.kpiActiveIndicator}
                                    style={{ backgroundColor: tuile.couleur.color }}
                                />
                            )}

                            <div
                                className={styles.kpiIcon}
                                style={{ background: tuile.couleur.bg, color: tuile.couleur.color }}
                            >
                                <Icon size={20} aria-hidden="true" />
                            </div>
                            <div className={styles.kpiContent}>
                                <span className={styles.kpiValue}>{valeur}</span>
                                <span className={styles.kpiLabel}>{tuile.label}</span>
                            </div>

                            {/* Badge alerte pour contrats à renouveler */}
                            {tuile.id === 'contrats' && kpis.contratsARenouveler > 0 && (
                                <span className={styles.kpiAlert}>
                                    {kpis.contratsARenouveler} à renouveler
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
