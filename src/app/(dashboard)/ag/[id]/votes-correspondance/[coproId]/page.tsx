'use client';

/**
 * Page de saisie des votes par correspondance pour un coproprietaire specifique
 * MIGRATION 2026-01-31: Source de verite = Supabase uniquement
 */

import { useVotesCorrespondanceCoproPage } from '@/features/ag/votes-correspondance-copro/hooks';
import {
  PageHeader,
  ProgressCard,
  StatusBanners,
  ResolutionsList,
  ActionsFooter,
} from '@/features/ag/votes-correspondance-copro/components';

export default function VotesCorrespondanceCoproPage() {
  const {
    copro,
    resolutions,
    votes,
    isLoading,
    isSaving,
    isValidated,
    savedMessage,
    votesComplets,
    totalVotes,
    progression,
    handleVoteChange,
    handleSave,
    handleValider,
    handleBack,
  } = useVotesCorrespondanceCoproPage();

  if (isLoading) {
    return (
      <div className="container">
        <p>Chargement...</p>
      </div>
    );
  }

  if (!copro) {
    return (
      <div className="container">
        <p>Coproprietaire non trouve</p>
      </div>
    );
  }

  return (
    <div className="container">
      <PageHeader copro={copro} onBack={handleBack} />

      <ProgressCard
        votesComplets={votesComplets}
        totalVotes={totalVotes}
        progression={progression}
      />

      <StatusBanners isValidated={isValidated} savedMessage={savedMessage} />

      <ResolutionsList
        resolutions={resolutions}
        votes={votes}
        isValidated={isValidated}
        isSaving={isSaving}
        onVoteChange={handleVoteChange}
      />

      {!isValidated && (
        <ActionsFooter
          isSaving={isSaving}
          onSave={handleSave}
          onValidate={handleValider}
        />
      )}
    </div>
  );
}
