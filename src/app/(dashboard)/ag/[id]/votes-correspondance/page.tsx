'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, ArrowRight, ChevronDown, Info, Loader2,
  ClipboardList, HelpCircle, Vote, Play,
} from 'lucide-react';
import Stepper from '@/components/features/ag/Stepper';
import { updateAgCurrentStep } from '@/lib/ag/api';
import { createClient } from '@/lib/supabase/client';
import { useCorrespondenceVotes } from '@/hooks/modules/useCorrespondenceVotes';
import type { VoteDirection } from '@/lib/ag/types';
import type { EligibleOwner } from '@/lib/ag/correspondence';
import styles from './votes-correspondance.module.css';

// ============================================================================
// HELPERS
// ============================================================================

function formatDateFr(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getDaysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getVotingDeadline(meetingDate: string): string {
  const date = new Date(meetingDate);
  date.setDate(date.getDate() - 3);
  return date.toISOString();
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function VotesCorrespondancePage() {
  const params = useParams();
  const router = useRouter();
  const agId = params.id as string;

  // AG data (meeting date)
  const [meetingDate, setMeetingDate] = useState<string | null>(null);
  const [agTitle, setAgTitle] = useState('');
  const [isPageLoading, setIsPageLoading] = useState(true);

  // Accordion states
  const [onlineOpen, setOnlineOpen] = useState(false);
  const [paperOpen, setPaperOpen] = useState(false);

  // Online voting toggle
  const [onlineVotingEnabled, setOnlineVotingEnabled] = useState(false);

  // Paper form state
  const [selectedCoproId, setSelectedCoproId] = useState('');

  // Votes detail toggle
  const [showVotesDetail, setShowVotesDetail] = useState(false);

  // Correspondence votes hook (for paper form + tracking)
  const {
    owners,
    resolutions,
    status,
    selectedOwner,
    pendingVotes,
    isLoading: isVotesLoading,
    isSubmitting,
    selectOwner,
    setVote,
    submitVotes,
    refresh,
    votedCount,
    totalResolutions,
    canSubmit,
  } = useCorrespondenceVotes({ agId });

  // ========================================
  // Fetch AG data
  // ========================================
  useEffect(() => {
    if (!agId) return;
    const fetchAg = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('ag_meetings')
        .select('meeting_date, title')
        .eq('id', agId)
        .single();
      if (data) {
        setMeetingDate(data.meeting_date);
        setAgTitle(data.title || '');
      }
      setIsPageLoading(false);
    };
    fetchAg();
  }, [agId]);

  // Update step in DB
  const stepUpdatedRef = useRef(false);
  useEffect(() => {
    if (agId && !isPageLoading && !stepUpdatedRef.current) {
      stepUpdatedRef.current = true;
      updateAgCurrentStep(agId, 5);
    }
  }, [agId, isPageLoading]);

  // ========================================
  // Computed
  // ========================================
  const daysUntilAG = useMemo(() => {
    if (!meetingDate) return null;
    return getDaysUntil(meetingDate);
  }, [meetingDate]);

  const votingDeadline = useMemo(() => {
    if (!meetingDate) return null;
    return getVotingDeadline(meetingDate);
  }, [meetingDate]);

  const totalVotesReceived = useMemo(() => {
    return status?.forms_received ?? 0;
  }, [status]);

  const ownersWithCorrespondance = useMemo(() => {
    return owners.filter((o: EligibleOwner) =>
      o.correspondence ||
      (o.voted_resolutions && o.voted_resolutions.some(v => v.vote_source === 'correspondence'))
    );
  }, [owners]);

  const handleShowVotes = useCallback(async () => {
    if (!showVotesDetail) {
      await refresh();
    }
    setShowVotesDetail(prev => !prev);
  }, [showVotesDetail, refresh]);

  // ========================================
  // Paper form handlers
  // ========================================
  const handleCoproSelect = useCallback((coproId: string) => {
    setSelectedCoproId(coproId);
    if (coproId) {
      const owner = owners.find((o: EligibleOwner) => o.id === coproId);
      if (owner) selectOwner(owner);
    } else {
      selectOwner(null);
    }
  }, [owners, selectOwner]);

  const handlePaperSubmit = useCallback(async () => {
    const result = await submitVotes('postal');
    if (result.success) {
      alert(`${result.votes_registered} vote(s) enregistre(s) avec succes`);
      setSelectedCoproId('');
      selectOwner(null);
      refresh();
    } else {
      alert(result.error || 'Erreur lors de l\'enregistrement');
    }
  }, [submitVotes, selectOwner, refresh]);

  // ========================================
  // Navigation
  // ========================================
  const goBack = useCallback(() => {
    router.push(`/ag/${agId}/envoi`);
  }, [router, agId]);

  const startAG = useCallback(() => {
    router.push(`/ag/${agId}/feuille-presence`);
  }, [router, agId]);

  // ========================================
  // Loading
  // ========================================
  if (isPageLoading) {
    return (
      <div className="container">
        <div className={styles.loadingState}>
          <Loader2 size={48} className={styles.spinner} />
          <h2>Chargement...</h2>
        </div>
      </div>
    );
  }

  const countdownText = daysUntilAG !== null
    ? daysUntilAG > 0
      ? `Plus que ${daysUntilAG} jour${daysUntilAG > 1 ? 's' : ''} avant l'AG`
      : daysUntilAG === 0
        ? "C'est le jour J !"
        : "L'AG est passee"
    : 'AG programmee';

  return (
    <div className="container">
      {/* Header */}
      <div className={styles.header}>
        <button onClick={goBack} className={styles.backButton}>
          <ArrowLeft size={20} aria-hidden="true" />
          Retour
        </button>
        <h1 className={styles.title}>Votes par correspondance</h1>
        <p className={styles.subtitle}>
          Gerez les votes par correspondance et a distance avant l&apos;AG
        </p>
      </div>

      <Stepper currentStep={5} agId={agId} />

      {/* ================================================
          Countdown Banner
          ================================================ */}
      <div className={styles.countdownBanner}>
        <h2 className={styles.countdownTitle}>{countdownText}</h2>
        <p className={styles.countdownSubtitle}>En attendant le jour J :</p>
        <ul className={styles.countdownLinks}>
          <li>
            <button className={styles.linkButton} onClick={() => router.push(`/ag/${agId}/session`)}>
              Tester le deroulement de l&apos;assemblee
            </button>
            . Vous pourrez ainsi vous familiariser avec l&apos;outil.
          </li>
          <li>
            Le jour de l&apos;assemblee, vous devrez faire signer une feuille de presence
            a chaque coproprietaire present, pensez a l&apos;imprimer :&nbsp;
            <button className={styles.linkButton}>
              Telecharger une feuille de presence vierge
            </button>.
          </li>
          <li>
            Si besoin, vous pouvez{' '}
            <button className={styles.linkButton} onClick={startAG}>
              demarrer l&apos;assemblee generale des aujourd&apos;hui
            </button>.
          </li>
          <li>
            Si necessaire,{' '}
            <button className={styles.linkButton}>
              telecharger le formulaire de vote par correspondance
            </button>{' '}
            ou{' '}
            <button className={styles.linkButton}>
              le formulaire de pouvoirs
            </button>.
          </li>
        </ul>
      </div>

      {/* ================================================
          Section: Vote par correspondance
          ================================================ */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Le vote par correspondance</h2>
        <button className={styles.helpLink}>
          <HelpCircle size={16} />
          Tout savoir sur le vote par correspondance
        </button>
      </div>

      {/* ---- Accordion 1: Vote en ligne ---- */}
      <div className={styles.accordion}>
        <button
          className={styles.accordionHeader}
          onClick={() => setOnlineOpen(!onlineOpen)}
        >
          <div className={styles.accordionHeaderLeft}>
            Ouvrir le vote par correspondance en ligne aux coproprietaires
            <span className={styles.optionalBadge}>Optionnel</span>
          </div>
          <ChevronDown
            size={20}
            className={`${styles.accordionChevron} ${onlineOpen ? styles.accordionChevronOpen : ''}`}
          />
        </button>

        {onlineOpen && (
          <div className={styles.accordionBody}>
            <p className={styles.accordionDescription}>
              Permettez a vos coproprietaires ne pouvant pas se presenter a l&apos;AG
              de voter par correspondance depuis leur compte CoProFlex.
              {votingDeadline && (
                <>
                  <br />
                  Les coproprietaires auront jusqu&apos;au{' '}
                  <strong>{formatDateFr(votingDeadline)}</strong>{' '}
                  (delai legal de 3 jours avant le debut de l&apos;AG) pour soumettre leur vote sur CoProFlex.
                </>
              )}
            </p>

            <div className={styles.votingStatus}>
              {onlineVotingEnabled ? (
                <>
                  <span className={`${styles.statusIndicator} ${styles.statusOpen}`}>
                    Votes ouverts
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setOnlineVotingEnabled(false)}
                  >
                    Fermer les votes
                  </button>
                </>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={() => setOnlineVotingEnabled(true)}
                >
                  Ouvrir les votes
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ---- Accordion 2: Formulaires papier ---- */}
      <div className={styles.accordion}>
        <button
          className={styles.accordionHeader}
          onClick={() => setPaperOpen(!paperOpen)}
        >
          <div className={styles.accordionHeaderLeft}>
            Saisir les votes par correspondance des formulaires papier
            <span className={styles.optionalBadge}>Optionnel</span>
          </div>
          <ChevronDown
            size={20}
            className={`${styles.accordionChevron} ${paperOpen ? styles.accordionChevronOpen : ''}`}
          />
        </button>

        {paperOpen && (
          <div className={styles.accordionBody}>
            <p className={styles.accordionDescription}>
              Un coproprietaire vous a transmis un formulaire de vote par correspondance
              au format papier complete ?<br />
              Vous pouvez des a present renseigner ses votes dans CoProFlex.
            </p>

            {votingDeadline && (
              <p className={styles.warningText}>
                Attention, vous n&apos;etes plus cense accepter de votes par correspondance
                de coproprietaires <strong>apres le {formatDateFr(votingDeadline)}</strong>
              </p>
            )}

            {/* Step 1: Select copro */}
            <div className={styles.coproSelector}>
              <div className={styles.stepRow}>
                <span className={styles.stepNumber}>1</span>
                <div className={styles.stepContent}>
                  <p className={styles.stepLabel}>Choisissez le coproprietaire</p>
                  <div className={styles.selectWrapper}>
                    <select
                      value={selectedCoproId}
                      onChange={(e) => handleCoproSelect(e.target.value)}
                      disabled={isVotesLoading}
                    >
                      <option value="">Selectionner</option>
                      {owners.map((owner: EligibleOwner) => (
                        <option key={owner.id} value={owner.id}>
                          {owner.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className={styles.selectChevron} />
                  </div>
                </div>
              </div>

              {/* Step 2: Vote on resolutions */}
              <div className={styles.stepRow}>
                <span className={`${styles.stepNumber} ${!selectedOwner ? styles.stepNumberInactive : ''}`}>
                  2
                </span>
                <div className={styles.stepContent}>
                  <p className={styles.stepLabel}>Saisir les votes</p>

                  {!selectedOwner ? (
                    <div className={styles.infoBox}>
                      <Info size={16} />
                      <span>La liste des resolutions sera affichee apres avoir selectionne le coproprietaire.</span>
                    </div>
                  ) : (
                    <>
                      <div className={styles.resolutionsList}>
                        {resolutions.map((res) => {
                          const vote = pendingVotes.get(res.id);
                          const hasVote = !!vote;
                          const existingVote = selectedOwner?.voted_resolutions?.find(
                            (v) => v.resolution_id === res.id
                          )?.vote;
                          const currentVote = vote || existingVote;

                          return (
                            <div
                              key={res.id}
                              className={`${styles.resolutionItem} ${hasVote || existingVote ? styles.resolutionVoted : ''}`}
                            >
                              <span className={styles.resolutionLabel}>
                                <span className={styles.resolutionNumber}>
                                  {res.resolution_number}
                                </span>
                                {' - '}{res.title}
                              </span>
                              <div className={styles.voteButtons}>
                                <button
                                  className={`${styles.voteButton} ${styles.voteFor} ${currentVote === 'for' ? styles.voteSelected : ''}`}
                                  onClick={() => setVote(res.id, 'for')}
                                  disabled={isSubmitting}
                                >
                                  Pour
                                </button>
                                <button
                                  className={`${styles.voteButton} ${styles.voteAgainst} ${currentVote === 'against' ? styles.voteSelected : ''}`}
                                  onClick={() => setVote(res.id, 'against')}
                                  disabled={isSubmitting}
                                >
                                  Contre
                                </button>
                                <button
                                  className={`${styles.voteButton} ${styles.voteAbstention} ${currentVote === 'abstention' ? styles.voteSelected : ''}`}
                                  onClick={() => setVote(res.id, 'abstention')}
                                  disabled={isSubmitting}
                                >
                                  Abstention
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className={styles.submitBar}>
                        <span className={styles.voteCount}>
                          <strong>{votedCount}</strong> / {totalResolutions} votes saisis
                        </span>
                        <button
                          className="btn btn-primary"
                          onClick={handlePaperSubmit}
                          disabled={!canSubmit || isSubmitting}
                        >
                          {isSubmitting ? (
                            <><Loader2 size={16} className={styles.spinner} /> Enregistrement...</>
                          ) : (
                            'Enregistrer les votes'
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================================================
          Tracking Card
          ================================================ */}
      <div className={styles.trackingCard}>
        <div className={styles.trackingIcon}>
          <ClipboardList size={28} />
        </div>
        <div className={styles.trackingInfo}>
          <h3>Suivi des votes par correspondance avant l&apos;AG</h3>
          <p>Retrouvez ici :</p>
          <ul>
            <li>Les votes renseignes en ligne directement par les coproprietaires</li>
            <li>Les votes que vous avez enregistres a partir des formulaires papier</li>
          </ul>
        </div>
        <div className={styles.trackingRight}>
          <span className={styles.trackingCount}>
            {totalVotesReceived} vote{totalVotesReceived !== 1 ? 's' : ''}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={handleShowVotes}>
            {showVotesDetail ? 'Masquer' : 'Voir les votes'}
          </button>
        </div>
      </div>

      {/* ================================================
          Votes Detail Section
          ================================================ */}
      {showVotesDetail && (
        <div className={styles.votesDetailSection}>
          {ownersWithCorrespondance.length === 0 ? (
            <div className={styles.votesDetailEmpty}>
              <Vote size={32} />
              <p>Aucun vote par correspondance recu pour le moment.</p>
            </div>
          ) : (
            ownersWithCorrespondance.map((owner: EligibleOwner) => {
              const corrVotes = owner.voted_resolutions?.filter(v => v.vote_source === 'correspondence') || [];
              const formStatus = owner.correspondence?.integration_status;
              const formStatusLabel = formStatus === 'integrated' ? 'Integre'
                : formStatus === 'rejected' ? 'Rejete'
                : formStatus === 'partial' ? 'Partiel'
                : 'En attente';
              const formStatusClass = formStatus === 'integrated' ? styles.voteTagFor
                : formStatus === 'rejected' ? styles.voteTagAgainst
                : styles.voteTagPending;

              return (
                <div key={owner.id} className={styles.votesDetailOwner}>
                  <div className={styles.votesDetailOwnerHeader}>
                    <div className={styles.votesDetailOwnerLeft}>
                      <span className={styles.votesDetailOwnerName}>{owner.name}</span>
                      <span className={styles.votesDetailOwnerMeta}>
                        {owner.total_tantiemes} tantiemes
                      </span>
                    </div>
                    <div className={styles.votesDetailOwnerRight}>
                      {owner.correspondence && (
                        <span className={`${styles.voteTag} ${formStatusClass}`}>
                          Formulaire : {formStatusLabel}
                        </span>
                      )}
                      {corrVotes.length > 0 && (
                        <span className={styles.votesDetailOwnerMeta}>
                          {corrVotes.length} vote{corrVotes.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  {corrVotes.length > 0 ? (
                    <div className={styles.votesDetailList}>
                      {corrVotes.map((v) => {
                        const res = resolutions.find(r => r.id === v.resolution_id);
                        const voteLabel = v.vote === 'for' ? 'Pour' : v.vote === 'against' ? 'Contre' : 'Abstention';
                        const voteClass = v.vote === 'for' ? styles.voteTagFor : v.vote === 'against' ? styles.voteTagAgainst : styles.voteTagAbstention;
                        return (
                          <div key={v.resolution_id} className={styles.votesDetailItem}>
                            <span className={styles.votesDetailResolution}>
                              {res ? `${res.resolution_number}. ${res.title}` : v.resolution_id}
                            </span>
                            <span className={`${styles.voteTag} ${voteClass}`}>{voteLabel}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={styles.votesDetailNoVotes}>
                      Formulaire recu mais aucun vote enregistre
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ================================================
          Footer
          ================================================ */}
      <div className={styles.footer}>
        <button onClick={goBack} className="btn btn-secondary">
          <ArrowLeft size={16} aria-hidden="true" />
          Retour
        </button>
        <button onClick={startAG} className="btn btn-primary">
          <Play size={16} aria-hidden="true" />
          Demarrer l&apos;AG
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
