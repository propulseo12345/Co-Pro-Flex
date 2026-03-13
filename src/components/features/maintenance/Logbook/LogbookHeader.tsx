'use client';

import {
    Download,
    Plus,
    FileText,
    Activity,
    Clock,
    TrendingUp,
    CheckCircle2,
    Euro,
    AlertTriangle,
} from 'lucide-react';
import type { LogbookHeaderProps, FiltreKpi, LogbookKpis } from './types';
import styles from '@/app/(dashboard)/maintenance/logbook/logbook.module.css';

/** Configuration des tuiles KPI */
const TUILES_CONFIG: Array<{
    id: FiltreKpi;
    label: string;
    kpiKey: keyof LogbookKpis;
    icon: React.ElementType;
    color: string;
    alert?: boolean;
    format?: 'currency';
}> = [
    { id: 'en_cours', label: 'En cours', kpiKey: 'enCours', icon: Activity, color: '#FBBF24' },
    { id: 'planifiees', label: 'Planifiées', kpiKey: 'planifiees', icon: Clock, color: '#60A5FA' },
    { id: 'travaux_prevus', label: 'Travaux prévus', kpiKey: 'travauxPrevus', icon: TrendingUp, color: '#A78BFA' },
    { id: 'travaux_votes', label: 'Travaux votés', kpiKey: 'travauxVotes', icon: CheckCircle2, color: '#34D399' },
    { id: 'cout_annee', label: 'Coût année', kpiKey: 'coutAnnee', icon: Euro, color: '#2563eb', format: 'currency' },
    { id: 'urgences', label: 'Urgences', kpiKey: 'urgences', icon: AlertTriangle, color: '#EF4444', alert: true },
];

/** Titre + boutons d'action (1ère ligne) */
export function LogbookPageHeader({
    showExportMenu,
    onToggleExportMenu,
    onExport,
    onNewIntervention,
}: Pick<LogbookHeaderProps, 'showExportMenu' | 'onToggleExportMenu' | 'onExport' | 'onNewIntervention'>) {
    return (
        <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Carnet d&apos;entretien</h1>
            <div className={styles.pageActions}>
                <div className={styles.exportDropdown}>
                    <button className={styles.btnSecondary} onClick={onToggleExportMenu}>
                        <Download size={15} aria-hidden="true" /> Exporter
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
                <button className={styles.btnPrimary} onClick={onNewIntervention}>
                    <Plus size={15} aria-hidden="true" /> Nouvelle intervention
                </button>
            </div>
        </div>
    );
}

/** Barre de 6 KPIs (ligne séparée) */
export function LogbookKpiBar({
    kpis,
    filtreActif,
    onFiltreChange,
}: Pick<LogbookHeaderProps, 'kpis' | 'filtreActif' | 'onFiltreChange'>) {
    return (
        <div className={styles.kpiGrid} role="group" aria-label="Filtres du carnet">
            {TUILES_CONFIG.map((tuile) => {
                const estActif = filtreActif === tuile.id;
                const Icon = tuile.icon;
                const rawValue = kpis[tuile.kpiKey];
                const displayValue = tuile.format === 'currency'
                    ? `${rawValue.toLocaleString('fr-FR')} €`
                    : rawValue;
                const hasAlert = tuile.alert && rawValue > 0;

                return (
                    <button
                        key={tuile.id}
                        type="button"
                        className={`${styles.kpiCardClickable} ${estActif ? styles.kpiCardActive : ''} ${hasAlert ? styles.kpiCardAlert : ''}`}
                        onClick={() => onFiltreChange(tuile.id)}
                        title={tuile.label}
                        aria-pressed={estActif}
                        aria-label={`${tuile.label} : ${displayValue}`}
                        style={estActif ? { borderColor: tuile.color } : undefined}
                    >
                        <div
                            className={styles.kpiIcon}
                            style={{ background: tuile.color + '15', color: tuile.color }}
                        >
                            <Icon size={18} aria-hidden="true" />
                        </div>
                        <div className={styles.kpiContent}>
                            <span className={styles.kpiValue}>{displayValue}</span>
                            <span className={styles.kpiLabel}>{tuile.label}</span>
                        </div>
                        {hasAlert && (
                            <span className={styles.kpiPulse} style={{ background: tuile.color }} />
                        )}
                    </button>
                );
            })}
        </div>
    );
}

/** Legacy export — rend les deux sections */
export function LogbookHeader(props: LogbookHeaderProps) {
    return (
        <>
            <LogbookPageHeader
                showExportMenu={props.showExportMenu}
                onToggleExportMenu={props.onToggleExportMenu}
                onExport={props.onExport}
                onNewIntervention={props.onNewIntervention}
            />
            <LogbookKpiBar
                kpis={props.kpis}
                filtreActif={props.filtreActif}
                onFiltreChange={props.onFiltreChange}
            />
        </>
    );
}
