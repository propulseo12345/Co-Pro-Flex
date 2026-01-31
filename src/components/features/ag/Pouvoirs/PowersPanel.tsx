'use client';

import { QuorumPreviewCard } from './QuorumPreviewCard';
import { PowersStatsCard } from './PowersStatsCard';
import { AddPowerForm } from './AddPowerForm';
import { PowersList } from './PowersList';
import type { IPouvoir, PouvoirsStats, QuorumPrevisionnel, PouvoirValidationResult } from '@/types/models/ag';
import type { CoproprietaireForPouvoir } from '@/hooks/modules/usePouvoirs';
import styles from './Pouvoirs.module.css';

interface PowersPanelProps {
    pouvoirs: IPouvoir[];
    coproprietaires: CoproprietaireForPouvoir[];
    stats: PouvoirsStats;
    quorumPrevisionnel: QuorumPrevisionnel;
    onAddPouvoir: (mandantId: string, mandataireId: string, signedAt?: string) => PouvoirValidationResult | Promise<PouvoirValidationResult>;
    onRemovePouvoir: (pouvoirId: string) => void | Promise<void>;
    onUploadJustificatif: (pouvoirId: string, file: File) => Promise<void>;
    onRemoveJustificatif: (pouvoirId: string) => void;
    validatePouvoir: (mandantId: string, mandataireId: string) => PouvoirValidationResult;
}

export function PowersPanel({
    pouvoirs,
    coproprietaires,
    stats,
    quorumPrevisionnel,
    onAddPouvoir,
    onRemovePouvoir,
    onUploadJustificatif,
    onRemoveJustificatif,
    validatePouvoir,
}: PowersPanelProps) {
    return (
        <div className={styles.powersPanel}>
            {/* Dashboard KPIs */}
            <div className={styles.dashboardRow}>
                <PowersStatsCard stats={stats} />
                <QuorumPreviewCard quorum={quorumPrevisionnel} />
            </div>

            {/* Formulaire d'ajout */}
            <AddPowerForm
                coproprietaires={coproprietaires}
                onAdd={onAddPouvoir}
                validate={validatePouvoir}
            />

            {/* Liste des pouvoirs */}
            <PowersList
                pouvoirs={pouvoirs}
                coproprietaires={coproprietaires}
                onRemove={onRemovePouvoir}
                onUploadJustificatif={onUploadJustificatif}
                onRemoveJustificatif={onRemoveJustificatif}
            />
        </div>
    );
}

export default PowersPanel;
