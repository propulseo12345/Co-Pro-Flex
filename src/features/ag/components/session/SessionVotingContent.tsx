'use client';

import { ArrowLeft, ArrowRight, AlertCircle, Edit3, ChevronDown } from 'lucide-react';
import { SessionStats, SessionVotingTable } from '@/components/features/ag/Session';
import { MAJORITES, type MajorityType } from '@/lib/constants/resolutions';
import { isRoleVariable } from '@/components/features/ag/Session/utils';
import { MOCK_COPROPRIETAIRES } from '@/data/mock';
import type { Resolution, VoteData, VoteChoice, VoteStats } from '../../types';
import styles from '../../../../app/(dashboard)/ag/[id]/session/session.module.css';

interface SessionVotingContentProps {
  currentResolution: Resolution;
  currentResolutionIndex: number;
  totalResolutions: number;
  stats: VoteStats | null;
  votes: VoteData[];
  presences: Record<string, boolean>;
  isSecondVote: boolean;
  isCurrentResolutionInfo: boolean;
  allVariables: Record<string, string>;
  prefillVariables: Record<string, string>;
  variableValues: Record<string, string>;
  showPrefillDropdown: string | null;
  onVote: (resolutionId: string, coproId: string, vote: VoteChoice) => void;
  onSelectAllVotes: (resolutionId: string, voteType: VoteChoice) => void;
  onVariableClick: (variableName: string) => void;
  onPrefillDropdownToggle: (variableName: string | null) => void;
  onPrefillFromCopro: (variableName: string, coproId: string) => void;
  onValidateVote: () => void;
  onValidateSecondVote: () => void;
  onNextWithValidation: () => void;
  onPrevResolution: () => void;
  onGoToPV: () => void;
}

export function SessionVotingContent({
  currentResolution,
  currentResolutionIndex,
  totalResolutions,
  stats,
  votes,
  presences,
  isSecondVote,
  isCurrentResolutionInfo,
  allVariables,
  prefillVariables,
  variableValues,
  showPrefillDropdown,
  onVote,
  onSelectAllVotes,
  onVariableClick,
  onPrefillDropdownToggle,
  onPrefillFromCopro,
  onValidateVote,
  onValidateSecondVote,
  onNextWithValidation,
  onPrevResolution,
  onGoToPV,
}: SessionVotingContentProps) {
  const renderTextWithVariables = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\{[^}]+\})/g);
    return parts.map((part, index) => {
      const match = part.match(/^\{(.+)\}$/);
      if (match) {
        const variableName = match[1];
        const value = allVariables[variableName];
        const isRole = isRoleVariable(variableName);
        const isGlobalPrefilled = prefillVariables[variableName] && !variableValues[variableName];
        return (
          <span key={index} className={styles.variableWrapper}>
            <button
              type="button"
              onClick={() => onVariableClick(variableName)}
              className={`${styles.variableButton} ${value ? styles.variableButtonFilled : ''} ${isGlobalPrefilled ? styles.variableButtonPrefilled : ''}`}
              title={isGlobalPrefilled ? `Pré-rempli automatiquement : ${variableName}` : `Cliquez pour définir : ${variableName}`}
            >
              <Edit3 size={12} aria-hidden="true" />
              {value || variableName}
            </button>
            {isRole && !value && (
              <div className={styles.prefillDropdownWrapper}>
                <button
                  type="button"
                  onClick={() => onPrefillDropdownToggle(showPrefillDropdown === variableName ? null : variableName)}
                  className={styles.prefillButton}
                  title="Sélectionner un copropriétaire"
                >
                  <ChevronDown size={14} aria-hidden="true" />
                </button>
                {showPrefillDropdown === variableName && (
                  <div className={styles.prefillDropdown}>
                    <div className={styles.prefillDropdownHeader}>Sélectionner :</div>
                    {MOCK_COPROPRIETAIRES.map(copro => (
                      <button
                        key={copro.id}
                        type="button"
                        onClick={() => onPrefillFromCopro(variableName, copro.id)}
                        className={styles.prefillDropdownItem}
                      >
                        {copro.nom}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const isLastResolution = currentResolutionIndex >= totalResolutions - 1;

  return (
    <div className="card">
      <div className={styles.resolutionHeader}>
        <div>
          <span className={styles.resolutionNumber}>
            Résolution {currentResolutionIndex + 1} / {totalResolutions}
          </span>
          <h2 className={styles.resolutionTitle}>{currentResolution.titre}</h2>
        </div>
        <div className={styles.majorityBadge}>
          {MAJORITES[currentResolution.majorite as MajorityType]?.nom || currentResolution.majorite}
        </div>
      </div>

      {isSecondVote && (
        <div className={styles.secondVoteBanner}>
          <AlertCircle size={20} aria-hidden="true" />
          <div>
            <strong>Second vote en cours (Passerelle Article 25-1)</strong>
            <p>Majorité requise : Article 24 (majorité simple des voix exprimées)</p>
          </div>
        </div>
      )}

      <p className={styles.resolutionText}>
        {renderTextWithVariables(currentResolution.texte)}
      </p>

      {isCurrentResolutionInfo ? (
        <div className={styles.informationSection}>
          <div className={styles.informationBanner}>
            <AlertCircle size={20} aria-hidden="true" />
            <div>
              <strong>Point d&apos;information</strong>
              <p>Cette résolution ne nécessite pas de vote. Il s&apos;agit d&apos;une prise d&apos;acte par l&apos;assemblée.</p>
            </div>
          </div>
          <SessionNavigation
            isFirstResolution={currentResolutionIndex === 0}
            isLastResolution={isLastResolution}
            isSecondVote={false}
            isInfoPoint
            onPrev={onPrevResolution}
            onNext={onNextWithValidation}
            onFinish={onGoToPV}
          />
        </div>
      ) : (
        <>
          {stats && <SessionStats stats={stats} />}
          <SessionVotingTable
            resolutionId={currentResolution.id}
            votes={votes}
            presences={presences}
            onVote={onVote}
            onSelectAllVotes={onSelectAllVotes}
          />
          <SessionNavigation
            isFirstResolution={currentResolutionIndex === 0}
            isLastResolution={isLastResolution}
            isSecondVote={isSecondVote}
            isInfoPoint={false}
            onPrev={onPrevResolution}
            onValidate={isSecondVote ? onValidateSecondVote : onValidateVote}
            onNext={onNextWithValidation}
            onFinish={onGoToPV}
          />
        </>
      )}
    </div>
  );
}

interface SessionNavigationProps {
  isFirstResolution: boolean;
  isLastResolution: boolean;
  isSecondVote: boolean;
  isInfoPoint: boolean;
  onPrev: () => void;
  onValidate?: () => void;
  onNext: () => void;
  onFinish: () => void;
}

function SessionNavigation({
  isFirstResolution,
  isLastResolution,
  isSecondVote,
  isInfoPoint,
  onPrev,
  onValidate,
  onNext,
  onFinish,
}: SessionNavigationProps) {
  return (
    <div className={styles.navigation}>
      <button
        onClick={onPrev}
        className="btn btn-secondary"
        disabled={isFirstResolution || isSecondVote}
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Résolution précédente
      </button>
      <div className={styles.navigationRight}>
        {!isInfoPoint && onValidate && (
          <button onClick={onValidate} className="btn btn-secondary">
            {isSecondVote ? 'Valider le second vote' : 'Valider le vote'}
          </button>
        )}
        {!isLastResolution ? (
          <button
            onClick={onNext}
            className="btn btn-primary"
            disabled={isSecondVote}
          >
            {isInfoPoint ? 'Passer au point suivant' : 'Résolution suivante'}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        ) : (
          <button
            onClick={onFinish}
            className="btn btn-primary"
            disabled={isSecondVote}
          >
            Terminer la session
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
