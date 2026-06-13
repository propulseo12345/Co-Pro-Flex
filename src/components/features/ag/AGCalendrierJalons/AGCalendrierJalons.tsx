'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Check,
    AlertTriangle,
    Clock,
    XCircle,
    Info,
} from 'lucide-react';
import { type JalonAG, JALON_STATUS_CONFIG } from '@/lib/constants/ag-delais-legaux';
import styles from './AGCalendrierJalons.module.css';

interface AGCalendrierJalonsProps {
    jalons: JalonAG[];
    dateAG?: Date | null;
    agId?: string;
    mode?: 'timeline' | 'list' | 'compact';
    showLegend?: boolean;
    onJalonClick?: (jalon: JalonAG) => void;
}

export default function AGCalendrierJalons({
    jalons,
    dateAG,
    agId,
    mode = 'timeline',
    showLegend = true,
    onJalonClick,
}: AGCalendrierJalonsProps) {
    const [expandedJalon, setExpandedJalon] = useState<string | null>(null);

    // Grouper les jalons par période
    const jalonsGroupes = useMemo(() => {
        const avant = jalons.filter(j => j.joursRestants > 0 && j.type !== 'date_ag' && j.type !== 'date_pv');
        const jourJ = jalons.filter(j => j.type === 'date_ag');
        const apres = jalons.filter(j => j.type === 'date_pv');

        return { avant, jourJ, apres };
    }, [jalons]);

    // Obtenir l'icône selon le statut
    const getStatusIcon = (status: JalonAG['status']) => {
        switch (status) {
            case 'complete':
                return <Check size={14} strokeWidth={3} />;
            case 'depasse':
                return <XCircle size={14} />;
            case 'urgent':
                return <AlertTriangle size={14} />;
            case 'imminent':
                return <AlertTriangle size={14} />;
            default:
                return <Clock size={14} />;
        }
    };

    // Formater les jours restants
    const formatJoursRestants = (jours: number): string => {
        if (jours === 0) return "Aujourd'hui";
        if (jours === 1) return 'Demain';
        if (jours === -1) return 'Hier';
        if (jours < 0) return `Il y a ${Math.abs(jours)} jours`;
        return `Dans ${jours} jours`;
    };

    // Rendu d'un jalon
    const renderJalon = (jalon: JalonAG, index: number) => {
        const StatusIcon = jalon.icon;
        const isExpanded = expandedJalon === jalon.type;

        const href = jalon.action?.href?.replace('{id}', agId || '');

        return (
            <div
                key={jalon.type}
                className={`${styles.jalon} ${styles[`jalon${jalon.status.charAt(0).toUpperCase() + jalon.status.slice(1)}`]}`}
                onClick={() => {
                    if (onJalonClick) {
                        onJalonClick(jalon);
                    } else {
                        setExpandedJalon(isExpanded ? null : jalon.type);
                    }
                }}
            >
                <div className={styles.jalonIndicator}>
                    <div className={styles.jalonDot}>
                        {getStatusIcon(jalon.status)}
                    </div>
                    {index < jalons.length - 1 && <div className={styles.jalonLine} />}
                </div>

                <div className={styles.jalonContent}>
                    <div className={styles.jalonHeader}>
                        <div className={styles.jalonIcon}>
                            <StatusIcon size={18} />
                        </div>
                        <div className={styles.jalonInfo}>
                            <span className={styles.jalonLabel}>{jalon.label}</span>
                            <span className={styles.jalonDate}>{jalon.dateFormatted}</span>
                        </div>
                        <div className={`${styles.jalonBadge} ${styles[`badge${jalon.status.charAt(0).toUpperCase() + jalon.status.slice(1)}`]}`}>
                            {formatJoursRestants(jalon.joursRestants)}
                        </div>
                    </div>

                    {(isExpanded || mode === 'list') && (
                        <div className={styles.jalonDetails}>
                            <p className={styles.jalonDescription}>{jalon.description}</p>
                            {jalon.articleLoi && (
                                <p className={styles.jalonArticle}>
                                    <Info size={12} />
                                    {jalon.articleLoi}
                                </p>
                            )}
                            {jalon.action && href && agId && (
                                <Link
                                    href={href}
                                    className={styles.jalonAction}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {jalon.action.label}
                                    <ChevronRight size={14} />
                                </Link>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Mode compact
    if (mode === 'compact') {
        const prochainsJalons = jalons
            .filter(j => j.status !== 'complete' && j.status !== 'depasse')
            .slice(0, 3);

        return (
            <div className={styles.compactContainer}>
                <div className={styles.compactHeader}>
                    <Calendar size={16} />
                    <span>Prochaines échéances</span>
                </div>
                <div className={styles.compactList}>
                    {prochainsJalons.map(jalon => (
                        <div
                            key={jalon.type}
                            className={`${styles.compactItem} ${styles[`compact${jalon.status.charAt(0).toUpperCase() + jalon.status.slice(1)}`]}`}
                        >
                            <span className={styles.compactLabel}>{jalon.label}</span>
                            <span className={styles.compactDate}>{jalon.dateFormatted}</span>
                            <span className={styles.compactJours}>
                                {jalon.joursRestants}j
                            </span>
                        </div>
                    ))}
                    {prochainsJalons.length === 0 && (
                        <p className={styles.compactEmpty}>Aucune échéance à venir</p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Légende */}
            {showLegend && (
                <div className={styles.legend}>
                    {Object.entries(JALON_STATUS_CONFIG).map(([status, config]) => (
                        <div key={status} className={styles.legendItem}>
                            <span
                                className={styles.legendDot}
                                style={{ backgroundColor: config.color }}
                            />
                            <span className={styles.legendLabel}>{config.label}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Timeline */}
            <div className={styles.timeline}>
                {/* Section Avant AG */}
                {jalonsGroupes.avant.length > 0 && (
                    <div className={styles.section}>
                        <h4 className={styles.sectionTitle}>
                            <ChevronLeft size={16} />
                            Avant l'AG
                        </h4>
                        <div className={styles.jalonsList}>
                            {jalonsGroupes.avant.map((jalon, idx) => renderJalon(jalon, idx))}
                        </div>
                    </div>
                )}

                {/* Section Jour J */}
                {jalonsGroupes.jourJ.length > 0 && (
                    <div className={`${styles.section} ${styles.sectionHighlight}`}>
                        <h4 className={styles.sectionTitle}>
                            <Calendar size={16} />
                            Jour de l'AG
                        </h4>
                        <div className={styles.jalonsList}>
                            {jalonsGroupes.jourJ.map((jalon, idx) => renderJalon(jalon, idx))}
                        </div>
                    </div>
                )}

                {/* Section Après AG */}
                {jalonsGroupes.apres.length > 0 && (
                    <div className={styles.section}>
                        <h4 className={styles.sectionTitle}>
                            Après l'AG
                            <ChevronRight size={16} />
                        </h4>
                        <div className={styles.jalonsList}>
                            {jalonsGroupes.apres.map((jalon, idx) => renderJalon(jalon, idx))}
                        </div>
                    </div>
                )}
            </div>

            {/* Résumé */}
            {dateAG && (
                <div className={styles.summary}>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Jalons complétés</span>
                        <span className={styles.summaryValue}>
                            {jalons.filter(j => j.status === 'complete').length}/{jalons.length}
                        </span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Alertes actives</span>
                        <span className={`${styles.summaryValue} ${jalons.some(j => j.status === 'urgent' || j.status === 'depasse') ? styles.summaryAlert : ''}`}>
                            {jalons.filter(j => j.status === 'urgent' || j.status === 'depasse').length}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
