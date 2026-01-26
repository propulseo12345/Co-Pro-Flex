'use client';

import { FileText, Users, AlertTriangle, FileWarning } from 'lucide-react';
import type { PouvoirsStats } from '@/types/models/ag';
import styles from './Pouvoirs.module.css';

interface PowersStatsCardProps {
    stats: PouvoirsStats;
}

export function PowersStatsCard({ stats }: PowersStatsCardProps) {
    const {
        totalPouvoirs,
        mandatairesCount,
        mandatairesOverLimit,
        incohérences,
        justificatifsManquants,
    } = stats;

    const hasIssues = mandatairesOverLimit > 0 || incohérences > 0;

    return (
        <div className={styles.statsCard}>
            <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                    <div className={styles.statIcon}>
                        <FileText size={20} aria-hidden="true" />
                    </div>
                    <div className={styles.statContent}>
                        <span className={styles.statValue}>{totalPouvoirs}</span>
                        <span className={styles.statLabel}>Pouvoirs</span>
                    </div>
                </div>

                <div className={styles.statItem}>
                    <div className={styles.statIcon}>
                        <Users size={20} aria-hidden="true" />
                    </div>
                    <div className={styles.statContent}>
                        <span className={styles.statValue}>{mandatairesCount}</span>
                        <span className={styles.statLabel}>Mandataires</span>
                    </div>
                </div>

                <div className={`${styles.statItem} ${mandatairesOverLimit > 0 ? styles.statItemError : ''}`}>
                    <div className={styles.statIcon}>
                        <AlertTriangle size={20} aria-hidden="true" />
                    </div>
                    <div className={styles.statContent}>
                        <span className={styles.statValue}>{mandatairesOverLimit}</span>
                        <span className={styles.statLabel}>Dépassements</span>
                    </div>
                </div>

                <div className={`${styles.statItem} ${justificatifsManquants > 0 ? styles.statItemWarning : ''}`}>
                    <div className={styles.statIcon}>
                        <FileWarning size={20} aria-hidden="true" />
                    </div>
                    <div className={styles.statContent}>
                        <span className={styles.statValue}>{justificatifsManquants}</span>
                        <span className={styles.statLabel}>Sans justificatif</span>
                    </div>
                </div>
            </div>

            {hasIssues && (
                <div className={styles.statsWarning}>
                    <AlertTriangle size={16} aria-hidden="true" />
                    {mandatairesOverLimit > 0 && (
                        <span>
                            {mandatairesOverLimit} mandataire(s) dépasse(nt) la limite de 3 pouvoirs.
                        </span>
                    )}
                    {incohérences > 0 && (
                        <span>{incohérences} incohérence(s) détectée(s).</span>
                    )}
                </div>
            )}
        </div>
    );
}

export default PowersStatsCard;
