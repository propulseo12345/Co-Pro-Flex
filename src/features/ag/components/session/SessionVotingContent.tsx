'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, AlertCircle, Edit3, ChevronDown } from 'lucide-react';
import { SessionStats, SessionVotingTable } from '@/components/features/ag/Session';
import { MAJORITES, type MajorityType } from '@/lib/constants/resolutions';
import { isRoleVariable } from '@/components/features/ag/Session/utils';
import type { Resolution, VoteData, VoteChoice, VoteStats } from '../../types';
import styles from '../../../../app/(dashboard)/ag/[id]/session/session.module.css';

interface Coproprietaire {
  id: string;
  nom: string;
  tantiemes: number;
}

interface SessionVotingContentProps {
  coproprietaires: Coproprietaire[];
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
  coproprietaires,
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
  const [prefillFilter, setPrefillFilter] = useState('');

  const renderTextWithVariables = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\{[^}]+\})/g);
    let cursor = 0;

    return parts.map((part) => {
      const partKey = `${cursor}-${part}`;
      cursor += part.length;

      const match = part.match(/^\{(.+)\}$/);
      if (match) {
        const variableName = match[1];
        // Priority: resolution's own variables (per-resolution, updated on edit) > global allVariables
        const value = currentResolution.variables?.[variableName] || allVariables[variableName] || '';
        const hasValue = Boolean(value?.trim());
        const isRole = isRoleVariable(variableName);
        const isGlobalPrefilled = prefillVariables[variableName] && !variableValues[variableName];
        const displayValue = hasValue ? value : `{${variableName}}`;
        const variableHint = hasValue ? 'Valeur renseignée (cliquer pour modifier)' : 'Champ à renseigner';
        const variableTitle = isGlobalPrefilled
          ? `Pré-remplissage disponible pour : ${variableName}`
          : hasValue
            ? `Modifier la valeur : ${variableName}`
            : `Renseigner le champ : ${variableName}`;
        const isSelectMenuOpen = showPrefillDropdown === variableName;
        const normalizedFilter = prefillFilter.trim().toLowerCase();
        const filteredCoproprietaires = normalizedFilter.length > 0
          ? coproprietaires.filter(copro => copro.nom.toLowerCase().includes(normalizedFilter))
          : coproprietaires;

        const handleSelectMenuToggle = () => {
          const nextValue = isSelectMenuOpen ? null : variableName;
          onPrefillDropdownToggle(nextValue);
          setPrefillFilter('');
        };

        const handlePrefillSelect = (coproId: string) => {
          onPrefillFromCopro(variableName, coproId);
          setPrefillFilter('');
        };

        return (
          <span key={partKey} className={styles.variableWrapper}>
            {isRole ? (
              <div className={styles.selectMenuWrapper}>
                <button
                  type="button"
                  onClick={handleSelectMenuToggle}
                  className={`${styles.selectMenuTrigger} ${!hasValue ? styles.variableButtonMissing : ''} ${hasValue ? styles.variableButtonFilled : ''} ${isGlobalPrefilled ? styles.variableButtonPrefilled : ''}`}
                  title={variableTitle}
                  aria-label={`${variableName} - ${variableHint}`}
                  aria-expanded={isSelectMenuOpen}
                  aria-haspopup="listbox"
                >
                  <span className={styles.selectMenuTriggerLabel}>{displayValue}</span>
                  <ChevronDown
                    size={14}
                    aria-hidden="true"
                    className={`${styles.selectMenuTriggerChevron} ${isSelectMenuOpen ? styles.selectMenuTriggerChevronOpen : ''}`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => onVariableClick(variableName)}
                  className={styles.variableEditButton}
                  title={`Éditer manuellement ${variableName}`}
                  aria-label={`Éditer manuellement ${variableName}`}
                >
                  <Edit3 size={12} aria-hidden="true" />
                </button>
                {isSelectMenuOpen && (
                  <div className={styles.selectMenuPopover} role="listbox" aria-label={`Pré-remplissage ${variableName}`}>
                    <div className={styles.selectMenuFilterRow}>
                      <input
                        type="text"
                        value={prefillFilter}
                        onChange={(event) => setPrefillFilter(event.target.value)}
                        className={styles.selectMenuFilterInput}
                        placeholder="Rechercher un copropriétaire..."
                        aria-label="Rechercher un copropriétaire"
                      />
                    </div>
                    <div className={styles.selectMenuOptions}>
                      {filteredCoproprietaires.length === 0 ? (
                        <div className={styles.selectMenuEmpty}>Aucun copropriétaire disponible</div>
                      ) : (
                        filteredCoproprietaires.map(copro => (
                          <button
                            key={copro.id}
                            type="button"
                            onClick={() => handlePrefillSelect(copro.id)}
                            className={styles.selectMenuOption}
                            role="option"
                            aria-selected="false"
                          >
                            {copro.nom}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onVariableClick(variableName)}
                className={`${styles.variableButton} ${!hasValue ? styles.variableButtonMissing : ''} ${hasValue ? styles.variableButtonFilled : ''} ${isGlobalPrefilled ? styles.variableButtonPrefilled : ''}`}
                title={variableTitle}
                aria-label={`${variableName} - ${variableHint}`}
              >
                <span className={styles.variablePlaceholderLabel}>{displayValue}</span>
                <ChevronDown size={14} aria-hidden="true" />
              </button>
            )}
          </span>
        );
      }
      return <span key={partKey}>{part}</span>;
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

      <SessionNavigation
        isFirstResolution={currentResolutionIndex === 0}
        isLastResolution={isLastResolution}
        isSecondVote={isSecondVote}
        isInfoPoint={isCurrentResolutionInfo}
        onPrev={onPrevResolution}
        onValidate={isCurrentResolutionInfo ? undefined : (isSecondVote ? onValidateSecondVote : onValidateVote)}
        onNext={onNextWithValidation}
        onFinish={onGoToPV}
      />

      {isSecondVote && (
        <div className={styles.secondVoteBanner}>
          <AlertCircle size={20} aria-hidden="true" />
          <div>
            <strong>Second vote en cours (Passerelle Article 25-1)</strong>
            <p>Majorité requise : Article 24 (majorité simple des voix exprimées)</p>
          </div>
        </div>
      )}

      <div className={styles.resolutionText}>
        {renderTextWithVariables(currentResolution.texte)}
      </div>

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
            coproprietaires={coproprietaires}
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
