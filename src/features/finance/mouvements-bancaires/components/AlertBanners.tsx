'use client';

import clsx from 'clsx';
import type { StatutConnexionBancaire, StatsNonCategorises, EcartSoldes } from '../domain/types';
import styles from './AlertBanners.module.css';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

interface AlertBannersProps {
  statsNonCategorises: StatsNonCategorises;
  ecartSoldes: EcartSoldes;
  totalMouvements: number;
  statutConnexion: StatutConnexionBancaire;
  getTempsDepuisDerniereSync: () => string;
  onFilterNonCategorises: () => void;
  onFilterNonRapproches: () => void;
}

export function AlertBanners({
  statsNonCategorises,
  ecartSoldes,
  totalMouvements,
  statutConnexion,
  getTempsDepuisDerniereSync,
  onFilterNonCategorises,
  onFilterNonRapproches,
}: AlertBannersProps) {
  const rapproches = totalMouvements - ecartSoldes.mouvementsNonRapproches;
  const progressPct = totalMouvements > 0 ? (rapproches / totalMouvements) * 100 : 100;
  const isSyncing = statutConnexion.statut === 'en_cours';

  return (
    <div className={styles.bannersContainer}>
      <button
        type="button"
        className={clsx(styles.banner, styles.bannerNonCat, styles.bannerClickable)}
        onClick={onFilterNonCategorises}
      >
        <span className={styles.bannerIcon}>⚠</span>
        <span className={styles.bannerLabel}>{statsNonCategorises.total} non catégorisés</span>
        <span className={styles.bannerDetail}>({formatCurrency(statsNonCategorises.montantTotal)})</span>
        <span className={styles.bannerAction}>Filtrer →</span>
      </button>

      <button
        type="button"
        className={clsx(styles.banner, styles.bannerNonRappr, styles.bannerClickable)}
        onClick={onFilterNonRapproches}
      >
        <span className={styles.bannerIcon}>⚡</span>
        <span className={styles.bannerLabel}>{ecartSoldes.mouvementsNonRapproches} non rapprochés</span>
        {Math.abs(ecartSoldes.ecart) > 0.01 && (
          <span className={styles.bannerDetail}>(écart {formatCurrency(ecartSoldes.ecart)})</span>
        )}
        <div className={styles.progressBar}>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
          </div>
          <span className={styles.progressLabel}>{rapproches}/{totalMouvements}</span>
        </div>
      </button>

      <div className={clsx(styles.banner, styles.bannerSync)}>
        <span className={clsx(
          styles.syncDot,
          isSyncing ? styles.syncDotSyncing
            : statutConnexion.statut === 'erreur' ? styles.syncDotError
            : styles.syncDotOk
        )} />
        <span className={styles.syncLabel}>
          {isSyncing ? 'Synchronisation...' : `Sync ${getTempsDepuisDerniereSync()}`}
        </span>
      </div>
    </div>
  );
}
