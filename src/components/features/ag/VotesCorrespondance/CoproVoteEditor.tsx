'use client';

import { useState } from 'react';
import {
    User,
    ChevronLeft,
    ChevronRight,
    CheckCircle,
    XCircle,
    MinusCircle,
    AlertTriangle,
    RotateCcw,
    Save,
} from 'lucide-react';
import type { CoproprietaireWithVoteStatus } from '@/hooks/modules/useVotesCorrespondance';
import type { VoteCorrespondanceState } from '@/hooks/modules/useVotesCorrespondance';
import type { VoteChoiceUI } from '@/types/models/ag';
import { UploadJustificatif } from './UploadJustificatif';
import styles from './VotesCorrespondance.module.css';

interface Resolution {
    id: string;
    titre: string;
    texte?: string;
    majorite?: string;
    numero?: number;
}

interface CoproVoteEditorProps {
    copro: CoproprietaireWithVoteStatus;
    voteState: VoteCorrespondanceState;
    resolutions: Resolution[];
    currentIndex: number;
    totalCopros: number;
    validationErrors: string[];
    canMarkAsComplete: boolean;
    onVote: (resolutionId: string, choice: VoteChoiceUI) => void;
    onVoteAll: (choice: VoteChoiceUI) => void;
    onClearVotes: () => void;
    onSetTantiemes: (value: number) => void;
    onResetTantiemes: () => void;
    onUploadJustificatif: (file: File) => Promise<void>;
    onRemoveJustificatif: () => void;
    onMarkAsComplete: () => void;
    onMarkAsDraft: () => void;
    onPrevCopro: () => void;
    onNextCopro: () => void;
    onSave: () => void;
}

export function CoproVoteEditor({
    copro,
    voteState,
    resolutions,
    currentIndex,
    totalCopros,
    validationErrors,
    canMarkAsComplete,
    onVote,
    onVoteAll,
    onClearVotes,
    onSetTantiemes,
    onResetTantiemes,
    onUploadJustificatif,
    onRemoveJustificatif,
    onMarkAsComplete,
    onMarkAsDraft,
    onPrevCopro,
    onNextCopro,
    onSave,
}: CoproVoteEditorProps) {
    const [showErrors, setShowErrors] = useState(false);

    const votesCount = Object.values(voteState.votesByResolutionId).filter(v => v !== null).length;
    const progressPercent = resolutions.length > 0
        ? (votesCount / resolutions.length) * 100
        : 0;

    const isComplete = voteState.statut === 'VALIDE';
    const tantiemesError = voteState.tantiemesVotes <= 0 || voteState.tantiemesVotes > voteState.tantiemesMax;

    return (
        <div className={`card ${styles.editorCard}`}>
            {/* En-tête copropriétaire */}
            <div className={styles.editorHeader}>
                <div className={styles.editorHeaderMain}>
                    <div className={styles.editorCoproInfo}>
                        <User size={28} className={styles.editorUserIcon} aria-hidden="true" />
                        <div>
                            <h2 className={styles.editorCoproName}>{copro.nom}</h2>
                            <span className={styles.editorCoproDetails}>
                                Lot {copro.lot} • {copro.tantiemes} tantièmes
                            </span>
                        </div>
                        {isComplete && (
                            <span className={styles.editorStatusBadge}>
                                <CheckCircle size={14} aria-hidden="true" />
                                Validé
                            </span>
                        )}
                    </div>
                    <div className={styles.editorNav}>
                        <button
                            onClick={onPrevCopro}
                            disabled={currentIndex === 0}
                            className="btn btn-secondary btn-sm"
                            aria-label="Copropriétaire précédent"
                        >
                            <ChevronLeft size={18} aria-hidden="true" />
                        </button>
                        <span className={styles.editorNavText}>
                            {currentIndex + 1} / {totalCopros}
                        </span>
                        <button
                            onClick={onNextCopro}
                            disabled={currentIndex === totalCopros - 1}
                            className="btn btn-secondary btn-sm"
                            aria-label="Copropriétaire suivant"
                        >
                            <ChevronRight size={18} aria-hidden="true" />
                        </button>
                    </div>
                </div>

                {/* Barre de progression */}
                <div className={styles.editorProgress}>
                    <div className={styles.editorProgressBar}>
                        <div
                            className={styles.editorProgressFill}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <span className={styles.editorProgressText}>
                        {votesCount} / {resolutions.length} résolutions votées
                    </span>
                </div>
            </div>

            {/* Section Tantièmes */}
            <div className={styles.editorSection}>
                <div className={styles.tantiemesRow}>
                    <label className={styles.tantiemesLabel}>
                        Tantièmes votés :
                    </label>
                    <div className={styles.tantiemesInputWrapper}>
                        <input
                            type="number"
                            min={1}
                            max={voteState.tantiemesMax}
                            value={voteState.tantiemesVotes}
                            onChange={(e) => onSetTantiemes(parseInt(e.target.value, 10) || 0)}
                            className={`${styles.tantiemesInput} ${tantiemesError ? styles.tantiemesInputError : ''}`}
                        />
                        <span className={styles.tantiemesMax}>/ {voteState.tantiemesMax}</span>
                        {voteState.tantiemesVotes !== voteState.tantiemesMax && (
                            <button
                                onClick={onResetTantiemes}
                                className={styles.tantiemesReset}
                                title="Réinitialiser aux tantièmes totaux"
                            >
                                <RotateCcw size={14} aria-hidden="true" />
                            </button>
                        )}
                    </div>
                </div>
                {tantiemesError && (
                    <div className={styles.tantiemesErrorMsg}>
                        <AlertTriangle size={14} aria-hidden="true" />
                        Les tantièmes doivent être entre 1 et {voteState.tantiemesMax}
                    </div>
                )}
            </div>

            {/* Actions de vote global */}
            <div className={styles.editorSection}>
                <div className={styles.globalVoteActions}>
                    <span className={styles.globalVoteLabel}>Vote global :</span>
                    <div className={styles.globalVoteButtons}>
                        <button
                            onClick={() => onVoteAll('POUR')}
                            className={`${styles.globalVoteBtn} ${styles.globalVoteBtnPour}`}
                        >
                            <CheckCircle size={16} aria-hidden="true" />
                            Tout pour
                        </button>
                        <button
                            onClick={() => onVoteAll('CONTRE')}
                            className={`${styles.globalVoteBtn} ${styles.globalVoteBtnContre}`}
                        >
                            <XCircle size={16} aria-hidden="true" />
                            Tout contre
                        </button>
                        <button
                            onClick={() => onVoteAll('ABSTENTION')}
                            className={`${styles.globalVoteBtn} ${styles.globalVoteBtnAbstention}`}
                        >
                            <MinusCircle size={16} aria-hidden="true" />
                            Tout abstention
                        </button>
                        <button
                            onClick={onClearVotes}
                            className={styles.globalVoteBtnClear}
                            title="Effacer tous les votes"
                        >
                            <RotateCcw size={16} aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Liste des résolutions */}
            <div className={styles.resolutionsList}>
                {resolutions.map((resolution, index) => {
                    const vote = voteState.votesByResolutionId[resolution.id] ?? null;
                    const hasVoted = vote !== null;

                    return (
                        <div
                            key={resolution.id}
                            className={`${styles.resolutionCard} ${hasVoted ? styles.resolutionCardVoted : ''}`}
                        >
                            <div className={styles.resolutionInfo}>
                                <span className={styles.resolutionNumber}>{index + 1}</span>
                                <div className={styles.resolutionContent}>
                                    <h4 className={styles.resolutionTitle}>{resolution.titre}</h4>
                                    {resolution.majorite && (
                                        <span className={styles.resolutionMajority}>
                                            {resolution.majorite}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div
                                className={styles.voteButtonsGroup}
                                role="radiogroup"
                                aria-label={`Vote pour ${resolution.titre}`}
                            >
                                <button
                                    onClick={() => onVote(resolution.id, 'POUR')}
                                    className={`${styles.voteBtn} ${styles.voteBtnPour} ${vote === 'POUR' ? styles.voteBtnActive : ''}`}
                                    aria-pressed={vote === 'POUR'}
                                    title="Pour"
                                >
                                    <CheckCircle size={18} aria-hidden="true" />
                                </button>
                                <button
                                    onClick={() => onVote(resolution.id, 'CONTRE')}
                                    className={`${styles.voteBtn} ${styles.voteBtnContre} ${vote === 'CONTRE' ? styles.voteBtnActive : ''}`}
                                    aria-pressed={vote === 'CONTRE'}
                                    title="Contre"
                                >
                                    <XCircle size={18} aria-hidden="true" />
                                </button>
                                <button
                                    onClick={() => onVote(resolution.id, 'ABSTENTION')}
                                    className={`${styles.voteBtn} ${styles.voteBtnAbstention} ${vote === 'ABSTENTION' ? styles.voteBtnActive : ''}`}
                                    aria-pressed={vote === 'ABSTENTION'}
                                    title="Abstention"
                                >
                                    <MinusCircle size={18} aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Upload justificatif */}
            <UploadJustificatif
                justificatif={voteState.justificatif}
                onUpload={onUploadJustificatif}
                onRemove={onRemoveJustificatif}
            />

            {/* Erreurs de validation */}
            {validationErrors.length > 0 && showErrors && (
                <div className={styles.validationErrors}>
                    <AlertTriangle size={18} aria-hidden="true" />
                    <div className={styles.validationErrorsList}>
                        {validationErrors.map((error) => (
                            <span key={error}>{error}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className={styles.editorActions}>
                <button
                    onClick={onSave}
                    className="btn btn-secondary"
                >
                    <Save size={18} aria-hidden="true" />
                    Enregistrer
                </button>

                {isComplete ? (
                    <button
                        onClick={onMarkAsDraft}
                        className="btn btn-secondary"
                    >
                        Repasser en brouillon
                    </button>
                ) : (
                    <button
                        onClick={() => {
                            if (canMarkAsComplete) {
                                onMarkAsComplete();
                            } else {
                                setShowErrors(true);
                            }
                        }}
                        className={`btn ${canMarkAsComplete ? 'btn-primary' : 'btn-secondary'}`}
                        disabled={!canMarkAsComplete && showErrors}
                    >
                        <CheckCircle size={18} aria-hidden="true" />
                        Marquer comme complet
                    </button>
                )}
            </div>

            {/* Navigation bas de page */}
            <div className={styles.editorFooterNav}>
                <button
                    onClick={onPrevCopro}
                    disabled={currentIndex === 0}
                    className="btn btn-secondary"
                >
                    <ChevronLeft size={18} aria-hidden="true" />
                    Précédent
                </button>
                <span className={styles.editorFooterNavText}>
                    Copropriétaire {currentIndex + 1} / {totalCopros}
                </span>
                <button
                    onClick={onNextCopro}
                    disabled={currentIndex === totalCopros - 1}
                    className="btn btn-primary"
                >
                    Suivant
                    <ChevronRight size={18} aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}

export default CoproVoteEditor;
