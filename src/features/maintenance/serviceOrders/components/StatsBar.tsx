'use client';

import { StatutOrdreService } from '@/types';
import clsx from 'clsx';
import styles from './StatsBar.module.css';

interface Stats {
    total: number;
    brouillons: number;
    enAttentePrestataire: number;
    interventionProgrammee: number;
    interventionRealisee: number;
    clotures: number;
}

interface StatsBarProps {
    stats: Stats;
    statutFilter: StatutOrdreService | 'TOUS';
    onStatutFilterChange: (statut: StatutOrdreService | 'TOUS') => void;
}

export function StatsBar({ stats, statutFilter, onStatutFilterChange }: StatsBarProps) {
    return (
        <div className={styles.stats}>
            <div
                className={clsx(styles.statCard, styles.clickable, statutFilter === 'TOUS' && styles.active)}
                onClick={() => onStatutFilterChange('TOUS')}
                title="Afficher tous les ordres"
            >
                <span className={styles.value}>{stats.total}</span>
                <span className={styles.label}>Total</span>
            </div>
            <div
                className={clsx(styles.statCard, styles.clickable, styles.brouillon, statutFilter === 'BROUILLON' && styles.active)}
                onClick={() => onStatutFilterChange('BROUILLON')}
                title="Filtrer par Brouillons"
            >
                <span className={styles.value}>{stats.brouillons}</span>
                <span className={styles.label}>Brouillons</span>
            </div>
            <div
                className={clsx(styles.statCard, styles.clickable, styles.enAttente, statutFilter === 'EN_ATTENTE_PRESTATAIRE' && styles.active)}
                onClick={() => onStatutFilterChange('EN_ATTENTE_PRESTATAIRE')}
                title="Filtrer par En attente prestataire"
            >
                <span className={styles.value}>{stats.enAttentePrestataire}</span>
                <span className={styles.label}>En attente prestataire</span>
            </div>
            <div
                className={clsx(styles.statCard, styles.clickable, styles.programmee, statutFilter === 'INTERVENTION_PROGRAMMEE' && styles.active)}
                onClick={() => onStatutFilterChange('INTERVENTION_PROGRAMMEE')}
                title="Filtrer par Intervention programmée"
            >
                <span className={styles.value}>{stats.interventionProgrammee}</span>
                <span className={styles.label}>Programmées</span>
            </div>
            <div
                className={clsx(styles.statCard, styles.clickable, styles.realisee, statutFilter === 'INTERVENTION_REALISEE' && styles.active)}
                onClick={() => onStatutFilterChange('INTERVENTION_REALISEE')}
                title="Filtrer par Intervention réalisée"
            >
                <span className={styles.value}>{stats.interventionRealisee}</span>
                <span className={styles.label}>Réalisées</span>
            </div>
            <div
                className={clsx(styles.statCard, styles.clickable, styles.cloture, statutFilter === 'CLOTURE' && styles.active)}
                onClick={() => onStatutFilterChange('CLOTURE')}
                title="Filtrer par Clôturés"
            >
                <span className={styles.value}>{stats.clotures}</span>
                <span className={styles.label}>Clôturés</span>
            </div>
        </div>
    );
}
