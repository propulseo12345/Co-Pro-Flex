'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Mail,
  FileText,
  Check,
  X,
  AlertCircle,
  Search,
  Users,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import Stepper from '@/components/features/ag/Stepper';
import { DataState } from '@/components/ui/DataState/DataState';
import { useCopro } from '@/providers/CoproContext';
import { useCorrespondenceVotes } from '@/hooks/modules/useCorrespondenceVotes';
import type { EligibleOwner } from '@/lib/ag/correspondence';
import type { VoteDirection } from '@/lib/ag/types';
import styles from './votes-correspondance.module.css';

// Vote button component
function VoteButton({
  vote,
  selected,
  onClick,
  disabled,
}: {
  vote: VoteDirection;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const labels: Record<VoteDirection, string> = {
    for: 'Pour',
    against: 'Contre',
    abstention: 'Abstention',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        styles.voteButton,
        styles[`vote${vote.charAt(0).toUpperCase() + vote.slice(1)}`],
        selected && styles.voteSelected
      )}
    >
      {selected && <Check size={14} />}
      {labels[vote]}
    </button>
  );
}

// Owner card in the list
function OwnerCard({
  owner,
  selected,
  onClick,
}: {
  owner: EligibleOwner;
  selected: boolean;
  onClick: () => void;
}) {
  const hasCorrespondence = owner.correspondence?.form_id;
  const hasVoted = (owner.voted_resolutions?.length || 0) > 0;
  const isPresent = owner.attendance?.presence_type === 'present';
  const isProxy = owner.attendance?.presence_type === 'proxy';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPresent || isProxy}
      className={clsx(
        styles.ownerCard,
        selected && styles.ownerSelected,
        (isPresent || isProxy) && styles.ownerDisabled
      )}
    >
      <div className={styles.ownerInfo}>
        <span className={styles.ownerName}>{owner.name}</span>
        <span className={styles.ownerTantiemes}>{owner.total_tantiemes} tantièmes</span>
        {owner.email && (
          <span className={styles.ownerEmail}>{owner.email}</span>
        )}
      </div>

      <div className={styles.ownerStatus}>
        {isPresent && (
          <span className={clsx(styles.statusBadge, styles.statusPresent)}>
            <Users size={12} /> Présent
          </span>
        )}
        {isProxy && (
          <span className={clsx(styles.statusBadge, styles.statusProxy)}>
            <FileText size={12} /> Représenté
          </span>
        )}
        {hasCorrespondence && (
          <span className={clsx(styles.statusBadge, styles.statusCorrespondence)}>
            <CheckCircle2 size={12} /> Formulaire reçu
          </span>
        )}
        {hasVoted && !isPresent && !isProxy && (
          <span className={clsx(styles.statusBadge, styles.statusVoted)}>
            <Check size={12} /> {owner.voted_resolutions?.length} vote(s)
          </span>
        )}
      </div>
    </button>
  );
}

export default function VotesCorrespondancePage() {
  const params = useParams();
  const router = useRouter();
  const agId = params.id as string;
  const { currentCoproId } = useCopro();

  const [searchTerm, setSearchTerm] = useState('');
  const [modeReception, setModeReception] = useState<'postal' | 'email' | 'remise_main'>('postal');
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);

  const {
    owners,
    resolutions,
    status,
    selectedOwner,
    pendingVotes,
    isLoading,
    isSubmitting,
    error,
    selectOwner,
    setVote,
    clearVotes,
    submitVotes,
    refresh,
    canSubmit,
    votedCount,
    totalResolutions,
  } = useCorrespondenceVotes({ agId });

  // Filter owners by search term
  const filteredOwners = useMemo(() => {
    if (!searchTerm.trim()) return owners;
    const term = searchTerm.toLowerCase();
    return owners.filter(
      (o) =>
        o.name.toLowerCase().includes(term) ||
        o.email?.toLowerCase().includes(term)
    );
  }, [owners, searchTerm]);

  // Handle vote submission
  const handleSubmit = async () => {
    const result = await submitVotes(modeReception);
    if (result.success) {
      setSubmitResult({
        success: true,
        message: `${result.votes_registered} vote(s) enregistré(s) avec succès`,
      });
    } else {
      setSubmitResult({
        success: false,
        message: result.error || 'Erreur lors de l\'enregistrement',
      });
    }

    // Clear message after 5s
    setTimeout(() => setSubmitResult(null), 5000);
  };

  // Check if owner already voted for a resolution
  const getExistingVote = (resolutionId: string): VoteDirection | null => {
    const existingVote = selectedOwner?.voted_resolutions?.find(
      (v) => v.resolution_id === resolutionId
    );
    return existingVote?.vote || null;
  };

  if (!currentCoproId) {
    return (
      <div className="container">
        <div className={styles.emptyState}>
          <AlertCircle size={48} />
          <h3>Aucune copropriété sélectionnée</h3>
          <p>Veuillez sélectionner une copropriété pour accéder aux votes par correspondance.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className={styles.header}>
        <Link href={`/ag/${agId}/preparation`} className={styles.backButton}>
          <ArrowLeft size={20} />
          <span>Retour à la préparation</span>
        </Link>
        <h1 className={styles.title}>
          <Mail size={24} />
          Votes par correspondance
        </h1>
        <p className={styles.subtitle}>
          Art. 17-1 A loi 65-557 - Enregistrez les votes reçus avant l'AG
        </p>
      </div>

      <Stepper currentStep={4} agId={agId} />

      {/* Status summary */}
      {status && (
        <div className={styles.statusBar}>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>Formulaires reçus</span>
            <span className={styles.statusValue}>{status.forms_received}</span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>Validés</span>
            <span className={styles.statusValue}>{status.forms_validated}</span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>Intégrés</span>
            <span className={styles.statusValue}>{status.forms_integrated}</span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>Tantièmes correspondance</span>
            <span className={styles.statusValue}>
              {status.correspondence_tantiemes} / {status.total_tantiemes}
              <span className={styles.statusPercent}>({status.correspondence_ratio}%)</span>
            </span>
          </div>
          <button onClick={refresh} className={styles.refreshButton} title="Rafraîchir">
            <RefreshCw size={16} />
          </button>
        </div>
      )}

      <DataState
        isLoading={isLoading}
        error={error}
        isEmpty={owners.length === 0}
        loadingMessage="Chargement des copropriétaires..."
        emptyMessage="Aucun copropriétaire trouvé"
        onRetry={refresh}
      >
        <div className={styles.layout}>
          {/* Left panel: Owner list */}
          <div className={styles.ownersPanel}>
            <div className={styles.panelHeader}>
              <h2>Copropriétaires</h2>
              <span className={styles.ownerCount}>{filteredOwners.length}</span>
            </div>

            <div className={styles.searchBox}>
              <Search size={16} />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className={styles.ownersList}>
              {filteredOwners.map((owner) => (
                <OwnerCard
                  key={owner.id}
                  owner={owner}
                  selected={selectedOwner?.id === owner.id}
                  onClick={() => selectOwner(owner)}
                />
              ))}
            </div>
          </div>

          {/* Right panel: Vote form */}
          <div className={styles.votesPanel}>
            {!selectedOwner ? (
              <div className={styles.emptySelection}>
                <Users size={48} />
                <h3>Sélectionnez un copropriétaire</h3>
                <p>Choisissez un copropriétaire dans la liste pour enregistrer ses votes par correspondance.</p>
              </div>
            ) : (
              <>
                <div className={styles.selectedOwnerHeader}>
                  <div>
                    <h2>{selectedOwner.name}</h2>
                    <p>{selectedOwner.total_tantiemes} tantièmes</p>
                  </div>
                  <button
                    onClick={() => selectOwner(null)}
                    className={styles.clearSelection}
                  >
                    <X size={16} /> Annuler
                  </button>
                </div>

                {/* Mode de réception */}
                <div className={styles.receptionMode}>
                  <label>Mode de réception :</label>
                  <select
                    value={modeReception}
                    onChange={(e) => setModeReception(e.target.value as typeof modeReception)}
                  >
                    <option value="postal">Courrier postal</option>
                    <option value="email">Email</option>
                    <option value="remise_main">Remise en main propre</option>
                  </select>
                </div>

                {/* Resolutions list */}
                <div className={styles.resolutionsList}>
                  {resolutions.map((resolution) => {
                    const existingVote = getExistingVote(resolution.id);
                    const pendingVote = pendingVotes.get(resolution.id);
                    const hasExistingVote = existingVote !== null;

                    return (
                      <div
                        key={resolution.id}
                        className={clsx(
                          styles.resolutionItem,
                          hasExistingVote && styles.resolutionVoted
                        )}
                      >
                        <div className={styles.resolutionHeader}>
                          <span className={styles.resolutionNumber}>
                            Résolution {resolution.resolution_number}
                          </span>
                          <span className={styles.majorityBadge}>
                            {resolution.majority_type}
                          </span>
                        </div>
                        <h4 className={styles.resolutionTitle}>{resolution.title}</h4>

                        {hasExistingVote ? (
                          <div className={styles.existingVote}>
                            <CheckCircle2 size={16} />
                            <span>
                              Déjà voté : <strong>{existingVote}</strong>
                            </span>
                          </div>
                        ) : (
                          <div className={styles.voteButtons}>
                            <VoteButton
                              vote="for"
                              selected={pendingVote === 'for'}
                              onClick={() => setVote(resolution.id, 'for')}
                            />
                            <VoteButton
                              vote="against"
                              selected={pendingVote === 'against'}
                              onClick={() => setVote(resolution.id, 'against')}
                            />
                            <VoteButton
                              vote="abstention"
                              selected={pendingVote === 'abstention'}
                              onClick={() => setVote(resolution.id, 'abstention')}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Submit section */}
                <div className={styles.submitSection}>
                  <div className={styles.submitInfo}>
                    <Clock size={16} />
                    <span>
                      {votedCount} / {totalResolutions} résolution(s) sélectionnée(s)
                    </span>
                  </div>

                  {submitResult && (
                    <div
                      className={clsx(
                        styles.submitResult,
                        submitResult.success ? styles.submitSuccess : styles.submitError
                      )}
                    >
                      {submitResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                      {submitResult.message}
                    </div>
                  )}

                  <div className={styles.submitActions}>
                    <button
                      onClick={clearVotes}
                      className={styles.clearButton}
                      disabled={votedCount === 0}
                    >
                      Réinitialiser
                    </button>
                    <button
                      onClick={handleSubmit}
                      className={styles.submitButton}
                      disabled={!canSubmit}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={16} className={styles.spinner} />
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <Check size={16} />
                          Enregistrer les votes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </DataState>
    </div>
  );
}
