'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Maximize2, Minimize2, Wifi, WifiOff, AlertCircle, Loader2 } from 'lucide-react';
import { useAgProjectorPage } from '@/features/ag/hooks/useAgProjectorPage';
import {
  ProjectorLoading,
  ProjectorInvalidToken,
  ProjectorWaitingSession,
  ProjectorBetweenResolutions,
  ProjectorSessionEnded,
  ProjectorError,
  ProjectorInformationPoint,
  ProjectorVoteInProgress,
} from '@/features/ag/components/projector';
import styles from './projector.module.css';

export default function ProjectorPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const agId = params.id as string;
  const token = searchParams.get('token') || '';

  const {
    isFullscreen,
    data,
    syncStatus,
    displayState,
    lastSyncTime,
    toggleFullscreen,
    error,
  } = useAgProjectorPage({ agId, token });

  const renderSyncIndicator = () => {
    const getStatusIcon = () => {
      switch (syncStatus) {
        case 'synced':
          return <Wifi size={16} className={styles.syncDotConnected} />;
        case 'stale':
          return <AlertCircle size={16} className={styles.syncDotStale} />;
        case 'disconnected':
        case 'error':
          return <WifiOff size={16} className={styles.syncDotDisconnected} />;
        default:
          return <Loader2 size={16} className={styles.syncDotConnecting} />;
      }
    };

    const getStatusText = () => {
      switch (syncStatus) {
        case 'synced': return 'Connecté';
        case 'stale': return 'Données anciennes';
        case 'disconnected': return 'Déconnecté';
        case 'error': return 'Erreur';
        case 'connecting': return 'Connexion...';
        default: return 'En attente';
      }
    };

    return (
      <div className={styles.syncIndicator}>
        {getStatusIcon()}
        <span>{getStatusText()}</span>
        {lastSyncTime && syncStatus === 'synced' && (
          <span className={styles.syncTime}>{lastSyncTime.toLocaleTimeString('fr-FR')}</span>
        )}
      </div>
    );
  };

  const renderContent = () => {
    switch (displayState) {
      case 'loading':
        return <ProjectorLoading />;
      case 'invalid_token':
        return <ProjectorInvalidToken />;
      case 'waiting_session':
      case 'session_paused':
        return <ProjectorWaitingSession />;
      case 'between_resolutions':
        return <ProjectorBetweenResolutions data={data} />;
      case 'session_ended':
        return <ProjectorSessionEnded />;
      case 'error':
        return <ProjectorError message={error?.message} />;
      case 'information_point':
        return data ? <ProjectorInformationPoint data={data} /> : <ProjectorLoading />;
      case 'vote_in_progress':
      case 'vote_closed':
        return data ? <ProjectorVoteInProgress data={data} /> : <ProjectorLoading />;
      default:
        return <ProjectorLoading />;
    }
  };

  return (
    <div className={styles.projectorContainer}>
      <div className={styles.projectorHeader}>
        <div className={styles.headerLeft}>
          <h2 className={styles.agTitle}>{data?.agTitle || 'Assemblée Générale'}</h2>
          {data?.coproprieteNom && (
            <span className={styles.coproprieteNom}>{data.coproprieteNom}</span>
          )}
        </div>
        {renderSyncIndicator()}
      </div>

      {renderContent()}

      <div className={styles.controlsBar}>
        <button
          onClick={toggleFullscreen}
          className={styles.controlButton}
          title={isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
        >
          {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
        </button>
      </div>
    </div>
  );
}
