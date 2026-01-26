'use client';

import {
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  Building2,
  Zap,
  Timer,
  History,
  ChevronUp,
  ChevronDown,
  Clock,
  RotateCcw,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import type { StatutConnexionBancaire, HistoriqueSynchronisation } from '../domain/types';
import styles from '../../../../app/(dashboard)/finance/mouvements-bancaires/mouvements-bancaires.module.css';

interface SyncSectionProps {
  statutConnexion: StatutConnexionBancaire;
  historiqueSync: HistoriqueSynchronisation[];
  showHistoriqueSync: boolean;
  onToggleHistorique: () => void;
  onToggleModeSync: () => void;
  onRefresh: () => void;
  getTempsDepuisDerniereSync: () => string;
  getTempsJusquaProchaineSync: () => string | null;
}

export function SyncSection({
  statutConnexion,
  historiqueSync,
  showHistoriqueSync,
  onToggleHistorique,
  onToggleModeSync,
  onRefresh,
  getTempsDepuisDerniereSync,
  getTempsJusquaProchaineSync,
}: SyncSectionProps) {
  return (
    <div className={styles.syncSection}>
      <div className={styles.syncHeader}>
        <div className={styles.syncTitleArea}>
          <div className={`${styles.syncStatusIndicator} ${styles[`syncStatus${statutConnexion.statut.charAt(0).toUpperCase() + statutConnexion.statut.slice(1).replace('_', '')}`]}`}>
            {statutConnexion.statut === 'connecte' && <Wifi size={18} />}
            {statutConnexion.statut === 'deconnecte' && <WifiOff size={18} />}
            {statutConnexion.statut === 'erreur' && <AlertTriangle size={18} />}
            {statutConnexion.statut === 'en_cours' && <RefreshCw size={18} className={styles.spinning} />}
          </div>
          <div className={styles.syncTitleContent}>
            <h3 className={styles.syncTitle}>Synchronisation bancaire</h3>
            <span className={styles.syncBanque}>
              <Building2 size={14} />
              {statutConnexion.banque} ({statutConnexion.comptesConnectes}/{statutConnexion.comptesTotal} comptes)
            </span>
          </div>
        </div>

        <div className={styles.syncActions}>
          <button
            className={`${styles.syncModeToggle} ${statutConnexion.modeActif === 'automatique' ? styles.syncModeAuto : styles.syncModeManuel}`}
            onClick={onToggleModeSync}
            title={statutConnexion.modeActif === 'automatique' ? 'Sync automatique activée' : 'Sync manuelle uniquement'}
          >
            {statutConnexion.modeActif === 'automatique' ? (
              <>
                <Zap size={14} />
                Auto (J+1)
              </>
            ) : (
              <>
                <Timer size={14} />
                Manuel
              </>
            )}
          </button>
          <button
            className={styles.syncHistoryButton}
            onClick={onToggleHistorique}
          >
            <History size={16} />
            Historique
            {showHistoriqueSync ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      <div className={styles.syncStatusRow}>
        <div className={styles.syncStatusItem}>
          <span className={styles.syncStatusLabel}>Dernière sync</span>
          <span className={styles.syncStatusValue}>
            <Clock size={14} />
            {getTempsDepuisDerniereSync()}
          </span>
        </div>

        {statutConnexion.modeActif === 'automatique' && (
          <div className={styles.syncStatusItem}>
            <span className={styles.syncStatusLabel}>Prochaine sync</span>
            <span className={styles.syncStatusValue}>
              <RotateCcw size={14} />
              {getTempsJusquaProchaineSync() || 'Non planifiée'}
            </span>
          </div>
        )}

        <div className={styles.syncStatusItem}>
          <span className={styles.syncStatusLabel}>Statut</span>
          <span className={`${styles.syncStatusBadge} ${styles[`syncStatusBadge${statutConnexion.statut.charAt(0).toUpperCase() + statutConnexion.statut.slice(1).replace('_', '')}`]}`}>
            {statutConnexion.statut === 'connecte' && 'Connecté'}
            {statutConnexion.statut === 'deconnecte' && 'Déconnecté'}
            {statutConnexion.statut === 'erreur' && 'Erreur'}
            {statutConnexion.statut === 'en_cours' && 'En cours...'}
          </span>
        </div>
      </div>

      {statutConnexion.statut === 'erreur' && statutConnexion.messageErreur && (
        <div className={styles.syncErrorMessage}>
          <AlertTriangle size={16} />
          <span>{statutConnexion.messageErreur}</span>
          <button onClick={onRefresh} className={styles.syncRetryButton}>
            <RotateCcw size={14} />
            Réessayer
          </button>
        </div>
      )}

      {showHistoriqueSync && (
        <div className={styles.syncHistorySection}>
          <h4 className={styles.syncHistoryTitle}>
            <History size={16} />
            Historique des synchronisations
          </h4>
          <div className={styles.syncHistoryList}>
            {historiqueSync.map(sync => (
              <div key={sync.id} className={`${styles.syncHistoryItem} ${styles[`syncHistory${sync.statut.charAt(0).toUpperCase() + sync.statut.slice(1)}`]}`}>
                <div className={styles.syncHistoryDate}>
                  <span className={styles.syncHistoryDateValue}>
                    {new Date(sync.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                  </span>
                  <span className={styles.syncHistoryTime}>{sync.heure}</span>
                </div>
                <div className={styles.syncHistoryContent}>
                  <div className={styles.syncHistoryHeader}>
                    <span className={`${styles.syncHistoryBadge} ${styles[`syncHistoryBadge${sync.statut.charAt(0).toUpperCase() + sync.statut.slice(1)}`]}`}>
                      {sync.statut === 'succes' && <CheckCircle size={12} />}
                      {sync.statut === 'echec' && <XCircle size={12} />}
                      {sync.statut === 'partiel' && <AlertCircle size={12} />}
                      {sync.statut === 'succes' ? 'Succès' : sync.statut === 'echec' ? 'Échec' : 'Partiel'}
                    </span>
                    <span className={styles.syncHistoryMode}>
                      {sync.mode === 'automatique' ? <Zap size={12} /> : <Timer size={12} />}
                      {sync.mode === 'automatique' ? 'Auto' : 'Manuel'}
                    </span>
                  </div>
                  <p className={styles.syncHistoryMessage}>{sync.message}</p>
                  {sync.details && (
                    <div className={styles.syncHistoryDetails}>
                      <span>+{sync.details.nouveauxMouvements} nouveaux</span>
                      <span>{sync.details.mouvementsMisAJour} mis à jour</span>
                      {sync.details.erreurs > 0 && (
                        <span className={styles.syncHistoryError}>{sync.details.erreurs} erreur{sync.details.erreurs > 1 ? 's' : ''}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
