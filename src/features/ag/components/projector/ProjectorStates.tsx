'use client';

import { Loader2, AlertCircle, Clock, CheckCircle, Users, XCircle } from 'lucide-react';
import type { ProjectorSessionData } from '@/types/projector';
import { MAJORITES } from '@/lib/constants/resolutions';
import styles from '../../../../app/(dashboard)/ag/[id]/projector/projector.module.css';

export function ProjectorLoading() {
  return (
    <div className={styles.waitingContainer}>
      <Loader2 size={64} className={styles.spinner} />
      <h2 className={styles.waitingTitle}>Chargement...</h2>
      <p className={styles.waitingMessage}>Connexion au système de vote</p>
    </div>
  );
}

export function ProjectorInvalidToken() {
  return (
    <div className={styles.waitingContainer}>
      <AlertCircle size={64} className={styles.errorIcon} />
      <h2 className={styles.waitingTitle}>Accès refusé</h2>
      <p className={styles.waitingMessage}>
        Le lien est invalide ou a expiré.<br />
        Demandez un nouveau lien depuis la page de session.
      </p>
    </div>
  );
}

export function ProjectorWaitingSession() {
  return (
    <div className={styles.waitingContainer}>
      <Clock size={64} className={styles.waitingIcon} />
      <h2 className={styles.waitingTitle}>En attente du démarrage</h2>
      <p className={styles.waitingMessage}>
        La session de vote n&apos;a pas encore commencé.<br />
        L&apos;affichage sera mis à jour automatiquement.
      </p>
    </div>
  );
}

interface ProjectorBetweenResolutionsProps {
  data: ProjectorSessionData | null;
}

export function ProjectorBetweenResolutions({ data }: ProjectorBetweenResolutionsProps) {
  return (
    <div className={styles.waitingContainer}>
      <Clock size={64} className={styles.waitingIcon} />
      <h2 className={styles.waitingTitle}>Résolution suivante...</h2>
      <p className={styles.waitingMessage}>En attente de la prochaine résolution</p>
      {data && (
        <div className={styles.progressInfo}>
          <span>{data.completedResolutions.length} / {data.totalResolutions} résolutions traitées</span>
        </div>
      )}
    </div>
  );
}

export function ProjectorSessionEnded() {
  return (
    <div className={styles.waitingContainer}>
      <CheckCircle size={64} className={styles.successIcon} />
      <h2 className={styles.waitingTitle}>Session terminée</h2>
      <p className={styles.waitingMessage}>
        Toutes les résolutions ont été votées.<br />
        Merci de votre participation.
      </p>
    </div>
  );
}

interface ProjectorErrorProps {
  message?: string;
}

export function ProjectorError({ message }: ProjectorErrorProps) {
  return (
    <div className={styles.waitingContainer}>
      <AlertCircle size={64} className={styles.errorIcon} />
      <h2 className={styles.waitingTitle}>Erreur de connexion</h2>
      <p className={styles.waitingMessage}>
        {message || 'Impossible de se connecter au système de vote.'}
      </p>
    </div>
  );
}

interface ProjectorInformationPointProps {
  data: ProjectorSessionData;
}

export function ProjectorInformationPoint({ data }: ProjectorInformationPointProps) {
  const resolution = data.currentResolution;
  if (!resolution) return null;

  return (
    <div className={styles.mainContent}>
      <div className={styles.resolutionHeader}>
        <span className={styles.resolutionNumber}>
          Résolution {resolution.numero} / {data.totalResolutions}
        </span>
        <div className={`${styles.statusBadge} ${styles.statusInformation}`}>
          Point d&apos;information
        </div>
      </div>
      <h1 className={styles.resolutionTitle}>{resolution.titre}</h1>
      <div className={styles.informationBanner}>
        <AlertCircle size={32} />
        <p>Ce point ne nécessite pas de vote.<br />Il s&apos;agit d&apos;une prise d&apos;acte par l&apos;assemblée.</p>
      </div>
    </div>
  );
}

interface ProjectorVoteInProgressProps {
  data: ProjectorSessionData;
}

export function ProjectorVoteInProgress({ data }: ProjectorVoteInProgressProps) {
  const resolution = data.currentResolution;
  if (!resolution) return null;

  const stats = resolution.stats;
  const result = resolution.result;
  const isVoteClosed = resolution.voteStatus === 'closed';

  return (
    <div className={styles.mainContent}>
      <div className={styles.resolutionHeader}>
        <span className={styles.resolutionNumber}>
          Résolution {resolution.numero} / {data.totalResolutions}
        </span>
        <div className={`${styles.statusBadge} ${isVoteClosed ? styles.statusClosed : styles.statusInProgress}`}>
          {isVoteClosed ? 'Vote clôturé' : 'Vote en cours'}
        </div>
      </div>

      <h1 className={styles.resolutionTitle}>{resolution.titre}</h1>

      <div className={styles.majorityInfo}>
        <span className={styles.majorityBadge}>{resolution.majoriteLabel}</span>
        <span className={styles.majorityDescription}>
          {MAJORITES[resolution.majorite]?.seuil || ''}
        </span>
      </div>

      {stats && (
        <div className={styles.voteStatsContainer}>
          <VoteBar label="POUR" tantiemes={stats.pour} percentage={stats.pourcentagePour} type="pour" />
          <VoteBar label="CONTRE" tantiemes={stats.contre} percentage={stats.pourcentageContre} type="contre" />
          <VoteBar label="ABSTENTION" tantiemes={stats.abstention} percentage={stats.pourcentageAbstention} type="abstention" />
        </div>
      )}

      {isVoteClosed && result && (
        <div className={`${styles.voteResult} ${result.adopted ? styles.voteResultAdopted : styles.voteResultRejected}`}>
          {result.adopted ? <CheckCircle size={40} /> : <XCircle size={40} />}
          <span className={styles.voteResultText}>{result.adopted ? 'ADOPTÉE' : 'REJETÉE'}</span>
        </div>
      )}

      <ProjectorQuorum quorum={data.quorum} />
    </div>
  );
}

interface VoteBarProps {
  label: string;
  tantiemes: number;
  percentage: number;
  type: 'pour' | 'contre' | 'abstention';
}

function VoteBar({ label, tantiemes, percentage, type }: VoteBarProps) {
  const barClass = type === 'pour' ? styles.voteBarPour : type === 'contre' ? styles.voteBarContre : styles.voteBarAbstention;
  return (
    <div className={styles.voteBarSection}>
      <div className={styles.voteLabelContainer}>
        <span className={styles.voteLabelName}>{label}</span>
        <span className={styles.voteLabelValue}>
          {tantiemes.toLocaleString('fr-FR')} tantièmes ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className={styles.voteBar}>
        <div className={`${styles.voteBarFill} ${barClass}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
      </div>
    </div>
  );
}

interface ProjectorQuorumProps {
  quorum: ProjectorSessionData['quorum'];
}

function ProjectorQuorum({ quorum }: ProjectorQuorumProps) {
  return (
    <div className={`${styles.quorumContainer} ${quorum.reached ? styles.quorumReached : styles.quorumNotReached}`}>
      <Users size={24} />
      <div className={styles.quorumInfo}>
        <div className={styles.quorumValues}>
          <span className={styles.quorumCurrent}>{quorum.current.toLocaleString('fr-FR')}</span>
          <span className={styles.quorumSeparator}>/</span>
          <span className={styles.quorumRequired}>{quorum.required.toLocaleString('fr-FR')}</span>
          <span className={styles.quorumUnit}>tantièmes</span>
        </div>
        <span className={styles.quorumLabel}>
          {quorum.reached ? 'Quorum atteint' : 'Quorum non atteint'}
          {' • '}
          {quorum.presentCount} présents, {quorum.correspondanceCount} par correspondance
        </span>
      </div>
      <div className={styles.quorumPercentage}>
        {quorum.percentagePresent.toFixed(1)}%
      </div>
    </div>
  );
}
