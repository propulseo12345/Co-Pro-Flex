'use client';

import { Play, Users, Mail, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { SyntheseTantiemes } from './SyntheseTantiemes';
import type { PresenceData } from '@/lib/utils/ag-session';
import styles from './Session.module.css';

interface Coproprietaire {
  id: string;
  nom: string;
  tantiemes: number;
  lot?: string;
  lotRefs?: string[];
}

interface SessionReadyScreenProps {
  agId: string;
  coproprietaires: Coproprietaire[];
  presences: Record<string, boolean>;
  presencesEnrichies?: Record<string, PresenceData>;
  votesCorrespondanceCount?: number;
  onStart: () => void;
  onBackToPresences: () => void;
}

export function SessionReadyScreen({
  agId,
  coproprietaires,
  presences,
  presencesEnrichies,
  votesCorrespondanceCount = 0,
  onStart,
  onBackToPresences,
}: SessionReadyScreenProps) {
  // Calculer le total des tantiemes
  const totalTantiemes = coproprietaires.reduce((sum, c) => sum + c.tantiemes, 0);

  // Calculer tantiemes presents et correspondance
  let tantièmesPresents = 0;
  let tantièmesCorrespondance = 0;
  let presentCount = 0;
  let representeCount = 0;
  let correspondanceCount = 0;

  if (presencesEnrichies) {
    for (const copro of coproprietaires) {
      const presence = presencesEnrichies[copro.id];
      if (presence?.mode === 'present') {
        tantièmesPresents += copro.tantiemes;
        presentCount++;
      } else if (presence?.mode === 'represente') {
        tantièmesPresents += copro.tantiemes;
        representeCount++;
      } else if (presence?.mode === 'correspondance' && !presence.voteCorrespondanceNeutralise) {
        tantièmesCorrespondance += copro.tantiemes;
        correspondanceCount++;
      }
    }
  } else {
    for (const copro of coproprietaires) {
      if (presences[copro.id]) {
        tantièmesPresents += copro.tantiemes;
        presentCount++;
      }
    }
  }

  const tantièmesTotalParticipants = tantièmesPresents + tantièmesCorrespondance;
  const pourcentageParticipants = totalTantiemes > 0 ? (tantièmesTotalParticipants / totalTantiemes) * 100 : 0;
  const totalParticipants = presentCount + representeCount + correspondanceCount;
  const hasQuorum = pourcentageParticipants >= 50;

  return (
    <div className={styles.startScreen}>
      <div className="card">
        <h2 className={styles.sectionTitle}>Session prete a demarrer</h2>
        <p className={styles.sectionDescription}>
          Les presences ont ete enregistrees a l&apos;etape precedente. Vous pouvez maintenant demarrer la session de vote.
        </p>

        {/* Resume des presences */}
        <div className={styles.presenceSummary}>
          <div className={styles.presenceSummaryHeader}>
            <Users size={20} aria-hidden="true" />
            <h3>Resume des presences</h3>
          </div>

          <div className={styles.presenceStats}>
            <div className={styles.presenceStat}>
              <span className={styles.presenceStatValue}>{presentCount}</span>
              <span className={styles.presenceStatLabel}>Present{presentCount > 1 ? 's' : ''}</span>
            </div>
            {representeCount > 0 && (
              <div className={styles.presenceStat}>
                <span className={styles.presenceStatValue}>{representeCount}</span>
                <span className={styles.presenceStatLabel}>Represente{representeCount > 1 ? 's' : ''}</span>
              </div>
            )}
            {correspondanceCount > 0 && (
              <div className={styles.presenceStat}>
                <span className={styles.presenceStatValue}>{correspondanceCount}</span>
                <span className={styles.presenceStatLabel}>Correspondance</span>
              </div>
            )}
            <div className={styles.presenceStatTotal}>
              <span className={styles.presenceStatValue}>{totalParticipants}</span>
              <span className={styles.presenceStatLabel}>Total participants</span>
            </div>
          </div>
        </div>

        {/* Banniere votes par correspondance */}
        {votesCorrespondanceCount > 0 && (
          <div className={styles.correspondanceBanner}>
            <Mail size={20} aria-hidden="true" />
            <div>
              <strong>{votesCorrespondanceCount} vote{votesCorrespondanceCount > 1 ? 's' : ''} par correspondance</strong>
              <p>
                Ces coproprietaires sont automatiquement integres comme participants.
                Leurs tantiemes sont comptabilises dans le quorum et les majorites.
              </p>
            </div>
          </div>
        )}

        {/* Synthese des tantiemes */}
        <SyntheseTantiemes
          coproprietaires={coproprietaires}
          presences={presences}
          presencesEnrichies={presencesEnrichies}
          totalTantiemes={totalTantiemes}
        />

        {/* Indicateur de quorum */}
        <div className={`${styles.quorumIndicator} ${hasQuorum ? styles.quorumOk : styles.quorumWarning}`}>
          {hasQuorum ? (
            <>
              <CheckCircle size={20} aria-hidden="true" />
              <span>Quorum atteint ({pourcentageParticipants.toFixed(1)}% des tantiemes representes)</span>
            </>
          ) : (
            <>
              <AlertCircle size={20} aria-hidden="true" />
              <span>Attention : quorum insuffisant ({pourcentageParticipants.toFixed(1)}% des tantiemes). Certaines decisions pourraient ne pas pouvoir etre votees.</span>
            </>
          )}
        </div>

        {/* Boutons d'action */}
        <div className={styles.startButtonContainer}>
          <button
            type="button"
            onClick={onBackToPresences}
            className="btn btn-secondary"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Modifier les presences
          </button>

          <button
            type="button"
            onClick={onStart}
            className="btn btn-primary btn-lg"
            disabled={totalParticipants === 0}
          >
            <Play size={20} aria-hidden="true" />
            Demarrer la session
          </button>
        </div>
      </div>
    </div>
  );
}
