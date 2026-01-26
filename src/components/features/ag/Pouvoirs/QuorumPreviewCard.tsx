'use client';

import { TrendingUp, Users, Vote, UserCheck } from 'lucide-react';
import type { QuorumPrevisionnel } from '@/types/models/ag';
import styles from './Pouvoirs.module.css';

interface QuorumPreviewCardProps {
    quorum: QuorumPrevisionnel;
}

export function QuorumPreviewCard({ quorum }: QuorumPreviewCardProps) {
    const {
        tantiemesRepresentes,
        totalTantiemes,
        pourcentage,
        nbCoproprietairesRepresentes,
        totalCoproprietaires,
        details,
    } = quorum;

    const isQuorumAtteint = pourcentage >= 50;

    return (
        <div className={styles.quorumCard}>
            <div className={styles.quorumHeader}>
                <TrendingUp size={20} aria-hidden="true" />
                <h3 className={styles.quorumTitle}>Quorum prévisionnel</h3>
            </div>

            <div className={styles.quorumMainStat}>
                <div className={styles.quorumProgress}>
                    <div
                        className={`${styles.quorumProgressFill} ${isQuorumAtteint ? styles.quorumProgressSuccess : ''}`}
                        style={{ width: `${Math.min(pourcentage, 100)}%` }}
                    />
                </div>
                <div className={styles.quorumValues}>
                    <span className={styles.quorumPercentage}>{pourcentage}%</span>
                    <span className={styles.quorumTantiemes}>
                        {tantiemesRepresentes} / {totalTantiemes} tantièmes
                    </span>
                </div>
            </div>

            <div className={styles.quorumDetails}>
                <div className={styles.quorumDetailItem}>
                    <Users size={16} aria-hidden="true" />
                    <span className={styles.quorumDetailLabel}>Copropriétaires représentés</span>
                    <span className={styles.quorumDetailValue}>
                        {nbCoproprietairesRepresentes} / {totalCoproprietaires}
                    </span>
                </div>

                <div className={styles.quorumDetailItem}>
                    <Vote size={16} aria-hidden="true" />
                    <span className={styles.quorumDetailLabel}>Votes par correspondance</span>
                    <span className={styles.quorumDetailValue}>
                        {details.votesCorrespondance.count} ({details.votesCorrespondance.tantiemes} t.)
                    </span>
                </div>

                <div className={styles.quorumDetailItem}>
                    <UserCheck size={16} aria-hidden="true" />
                    <span className={styles.quorumDetailLabel}>Représentés par pouvoir</span>
                    <span className={styles.quorumDetailValue}>
                        {details.mandantsRepresentes.count} ({details.mandantsRepresentes.tantiemes} t.)
                    </span>
                </div>
            </div>

            {isQuorumAtteint && (
                <div className={styles.quorumSuccess}>
                    Le quorum de 50% est atteint (prévisionnel)
                </div>
            )}
        </div>
    );
}

export default QuorumPreviewCard;
