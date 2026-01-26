'use client';

import { Users, CheckCircle, FileText, TrendingUp } from 'lucide-react';
import type { VotesCorrespondanceProgress } from '@/hooks/modules/useVotesCorrespondance';
import styles from './VotesCorrespondance.module.css';

interface VotesProgressSummaryProps {
    progress: VotesCorrespondanceProgress;
    onExport?: () => void;
}

export function VotesProgressSummary({ progress, onExport }: VotesProgressSummaryProps) {
    const {
        totalCoproprietaires,
        coproprietairesComplets,
        totalResolutions,
        totalVotesSaisis,
        totalVotesPossibles,
        justificatifsRecus,
        pourcentageCompletion,
    } = progress;

    return (
        <div className={styles.progressSummary}>
            <div className={styles.progressCards}>
                <div className={styles.progressCard}>
                    <div className={styles.progressCardIcon}>
                        <Users size={24} aria-hidden="true" />
                    </div>
                    <div className={styles.progressCardContent}>
                        <span className={styles.progressCardValue}>
                            {coproprietairesComplets}
                            <span className={styles.progressCardTotal}>/{totalCoproprietaires}</span>
                        </span>
                        <span className={styles.progressCardLabel}>
                            Copropriétaires complets
                        </span>
                    </div>
                </div>

                <div className={styles.progressCard}>
                    <div className={styles.progressCardIcon}>
                        <CheckCircle size={24} aria-hidden="true" />
                    </div>
                    <div className={styles.progressCardContent}>
                        <span className={styles.progressCardValue}>
                            {totalVotesSaisis}
                            <span className={styles.progressCardTotal}>/{totalVotesPossibles}</span>
                        </span>
                        <span className={styles.progressCardLabel}>
                            Votes saisis
                        </span>
                    </div>
                </div>

                <div className={styles.progressCard}>
                    <div className={styles.progressCardIcon}>
                        <FileText size={24} aria-hidden="true" />
                    </div>
                    <div className={styles.progressCardContent}>
                        <span className={styles.progressCardValue}>
                            {justificatifsRecus}
                            <span className={styles.progressCardTotal}>/{totalCoproprietaires}</span>
                        </span>
                        <span className={styles.progressCardLabel}>
                            Justificatifs reçus
                        </span>
                    </div>
                </div>

                <div className={styles.progressCard}>
                    <div className={styles.progressCardIcon}>
                        <TrendingUp size={24} aria-hidden="true" />
                    </div>
                    <div className={styles.progressCardContent}>
                        <span className={styles.progressCardValue}>
                            {pourcentageCompletion}%
                        </span>
                        <span className={styles.progressCardLabel}>
                            Progression
                        </span>
                    </div>
                    <div className={styles.progressMiniBar}>
                        <div
                            className={styles.progressMiniFill}
                            style={{ width: `${pourcentageCompletion}%` }}
                        />
                    </div>
                </div>
            </div>

            {onExport && totalResolutions > 0 && (
                <button
                    onClick={onExport}
                    className={`btn btn-secondary ${styles.exportButton}`}
                    disabled={totalVotesSaisis === 0}
                >
                    <FileText size={18} aria-hidden="true" />
                    Exporter CSV
                </button>
            )}
        </div>
    );
}

export default VotesProgressSummary;
