'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2, Vote, Users } from 'lucide-react';
import Stepper from '@/components/features/ag/Stepper';
import {
    StepUnavailable,
    VotesProgressSummary,
    CoproList,
    CoproVoteEditor,
    VotesEmptyState,
    PowersPanel,
    QuorumPreviewCard,
} from '@/components/features/ag';
import { useAGStepGuard } from '@/hooks/modules/useAGStepGuard';
import { useVotesCorrespondance } from '@/hooks/modules/useVotesCorrespondance';
import { usePouvoirs } from '@/hooks/modules/usePouvoirs';
import { MOCK_COPROPRIETAIRES } from '@/data/mock';
import styles from './preparation.module.css';

type TabType = 'votes' | 'pouvoirs';

export default function PreparationPage() {
    const router = useRouter();
    const params = useParams();
    const agId = params.id as string;

    // Onglet actif
    const [activeTab, setActiveTab] = useState<TabType>('votes');

    // Guard de workflow
    const {
        state: guardState,
        blockReason,
        redirectUrl,
    } = useAGStepGuard({
        agId,
        stepId: 'votes_correspondance',
        autoRedirect: true,
        redirectDelay: 100,
    });

    // Hook de gestion des votes par correspondance
    const {
        coproprietaires,
        resolutions,
        selectedCoproId,
        selectedCoproState,
        progress,
        isLoading: isLoadingVotes,
        selectCopro,
        setVote,
        setAllVotes,
        clearVotes,
        setTantiemes,
        resetTantiemes,
        uploadJustificatif,
        removeJustificatif,
        markAsComplete,
        markAsDraft,
        save,
        exportCsv,
        getValidationErrors,
        canMarkAsComplete,
    } = useVotesCorrespondance({ agId });

    // Hook de gestion des pouvoirs
    const {
        pouvoirs,
        coproprietaires: coproprietairesWithPouvoirs,
        stats: pouvoirsStats,
        quorumPrevisionnel,
        isLoading: isLoadingPouvoirs,
        addPouvoir,
        removePouvoir,
        uploadJustificatif: uploadPouvoirJustificatif,
        removeJustificatif: removePouvoirJustificatif,
        validatePouvoir,
        save: savePouvoirs,
    } = usePouvoirs({ agId });

    const isLoading = isLoadingVotes || isLoadingPouvoirs;

    // Sélection copropriétaire pour votes
    const selectedCopro = useMemo(() => {
        if (!selectedCoproId) return null;
        return coproprietaires.find(c => c.id === selectedCoproId) ?? null;
    }, [selectedCoproId, coproprietaires]);

    const selectedCoproIndex = useMemo(() => {
        if (!selectedCoproId) return -1;
        return coproprietaires.findIndex(c => c.id === selectedCoproId);
    }, [selectedCoproId, coproprietaires]);

    // Navigation copropriétaires
    const handlePrevCopro = useCallback(() => {
        if (selectedCoproIndex > 0) {
            selectCopro(coproprietaires[selectedCoproIndex - 1].id);
        }
    }, [selectedCoproIndex, coproprietaires, selectCopro]);

    const handleNextCopro = useCallback(() => {
        if (selectedCoproIndex < coproprietaires.length - 1) {
            selectCopro(coproprietaires[selectedCoproIndex + 1].id);
        }
    }, [selectedCoproIndex, coproprietaires, selectCopro]);

    // Handlers votes
    const handleVote = useCallback(
        (resolutionId: string, choice: 'POUR' | 'CONTRE' | 'ABSTENTION' | null) => {
            if (selectedCoproId) setVote(selectedCoproId, resolutionId, choice);
        },
        [selectedCoproId, setVote]
    );

    const handleVoteAll = useCallback(
        (choice: 'POUR' | 'CONTRE' | 'ABSTENTION' | null) => {
            if (selectedCoproId) setAllVotes(selectedCoproId, choice);
        },
        [selectedCoproId, setAllVotes]
    );

    const handleClearVotes = useCallback(() => {
        if (selectedCoproId) clearVotes(selectedCoproId);
    }, [selectedCoproId, clearVotes]);

    const handleSetTantiemes = useCallback(
        (value: number) => {
            if (selectedCoproId) setTantiemes(selectedCoproId, value);
        },
        [selectedCoproId, setTantiemes]
    );

    const handleResetTantiemes = useCallback(() => {
        if (selectedCoproId) resetTantiemes(selectedCoproId);
    }, [selectedCoproId, resetTantiemes]);

    const handleUploadJustificatif = useCallback(
        async (file: File) => {
            if (selectedCoproId) await uploadJustificatif(selectedCoproId, file);
        },
        [selectedCoproId, uploadJustificatif]
    );

    const handleRemoveJustificatif = useCallback(() => {
        if (selectedCoproId) removeJustificatif(selectedCoproId);
    }, [selectedCoproId, removeJustificatif]);

    const handleMarkAsComplete = useCallback(() => {
        if (selectedCoproId) markAsComplete(selectedCoproId);
    }, [selectedCoproId, markAsComplete]);

    const handleMarkAsDraft = useCallback(() => {
        if (selectedCoproId) markAsDraft(selectedCoproId);
    }, [selectedCoproId, markAsDraft]);

    const validationErrors = useMemo(() => {
        if (!selectedCoproId) return [];
        return getValidationErrors(selectedCoproId);
    }, [selectedCoproId, getValidationErrors]);

    const canComplete = useMemo(() => {
        if (!selectedCoproId) return false;
        return canMarkAsComplete(selectedCoproId);
    }, [selectedCoproId, canMarkAsComplete]);

    // Sauvegarde et navigation
    const handleSaveAll = useCallback(() => {
        save();
        savePouvoirs();
    }, [save, savePouvoirs]);

    const handleContinue = useCallback(() => {
        handleSaveAll();
        router.push(`/ag/${agId}/session`);
    }, [handleSaveAll, router, agId]);

    // États du guard
    if (guardState === 'loading' || isLoading) {
        return (
            <div className="container">
                <div className={styles.loadingContainer}>
                    <Loader2 size={32} className={styles.spinner} aria-hidden="true" />
                    <p>Vérification des prérequis...</p>
                </div>
            </div>
        );
    }

    if (guardState === 'redirecting') {
        return (
            <div className="container">
                <StepUnavailable
                    reason={blockReason || 'Prérequis non satisfaits'}
                    redirectUrl={redirectUrl || undefined}
                    redirectLabel="Accéder à l'ordre du jour"
                    backUrl={`/ag/${agId}/envoi`}
                    backLabel="Retour à l'envoi"
                    isRedirecting
                />
            </div>
        );
    }

    if (guardState === 'blocked' || guardState === 'error') {
        return (
            <div className="container">
                <StepUnavailable
                    reason={blockReason || 'Cette étape n\'est pas accessible.'}
                    redirectUrl={redirectUrl || `/ag/${agId}/agenda`}
                    redirectLabel="Accéder à l'ordre du jour"
                    backUrl={`/ag/${agId}/envoi`}
                    backLabel="Retour à l'envoi"
                />
            </div>
        );
    }

    return (
        <div className="container">
            <div className={styles.header}>
                <button onClick={() => router.push(`/ag/${agId}/envoi`)} className={styles.backButton}>
                    <ArrowLeft size={20} aria-hidden="true" />
                    Retour
                </button>
                <div className={styles.headerContent}>
                    <h1 className={styles.title}>Votes par correspondance &amp; Pouvoirs</h1>
                    <p className={styles.subtitle}>
                        Saisissez les votes par correspondance et enregistrez les pouvoirs avant la séance
                    </p>
                </div>
            </div>

            <Stepper currentStep={5} agId={agId} />

            {/* Quorum prévisionnel global */}
            <div className={styles.quorumBanner}>
                <QuorumPreviewCard quorum={quorumPrevisionnel} />
            </div>

            {/* Onglets */}
            <div className={styles.tabs}>
                <button
                    onClick={() => setActiveTab('votes')}
                    className={`${styles.tab} ${activeTab === 'votes' ? styles.tabActive : ''}`}
                >
                    <Vote size={18} aria-hidden="true" />
                    Votes par correspondance
                    <span className={styles.tabBadge}>
                        {progress.coproprietairesComplets}/{progress.totalCoproprietaires}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('pouvoirs')}
                    className={`${styles.tab} ${activeTab === 'pouvoirs' ? styles.tabActive : ''}`}
                >
                    <Users size={18} aria-hidden="true" />
                    Pouvoirs (mandats)
                    <span className={styles.tabBadge}>{pouvoirsStats.totalPouvoirs}</span>
                    {pouvoirsStats.mandatairesOverLimit > 0 && (
                        <span className={styles.tabBadgeError}>!</span>
                    )}
                </button>
            </div>

            {/* Contenu des onglets */}
            {activeTab === 'votes' && (
                <>
                    <VotesProgressSummary progress={progress} onExport={exportCsv} />

                    <div className={styles.layout}>
                        <div className={styles.sidebar}>
                            <CoproList
                                coproprietaires={coproprietaires}
                                selectedCoproId={selectedCoproId}
                                onSelectCopro={selectCopro}
                            />
                            <button onClick={handleSaveAll} className="btn btn-secondary w-full">
                                Sauvegarder
                            </button>
                        </div>

                        <div className={styles.mainContent}>
                            {selectedCopro && selectedCoproState ? (
                                <CoproVoteEditor
                                    copro={selectedCopro}
                                    voteState={selectedCoproState}
                                    resolutions={resolutions}
                                    currentIndex={selectedCoproIndex}
                                    totalCopros={MOCK_COPROPRIETAIRES.length}
                                    validationErrors={validationErrors}
                                    canMarkAsComplete={canComplete}
                                    onVote={handleVote}
                                    onVoteAll={handleVoteAll}
                                    onClearVotes={handleClearVotes}
                                    onSetTantiemes={handleSetTantiemes}
                                    onResetTantiemes={handleResetTantiemes}
                                    onUploadJustificatif={handleUploadJustificatif}
                                    onRemoveJustificatif={handleRemoveJustificatif}
                                    onMarkAsComplete={handleMarkAsComplete}
                                    onMarkAsDraft={handleMarkAsDraft}
                                    onPrevCopro={handlePrevCopro}
                                    onNextCopro={handleNextCopro}
                                    onSave={handleSaveAll}
                                />
                            ) : (
                                <VotesEmptyState hasResolutions={resolutions.length > 0} />
                            )}
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'pouvoirs' && (
                <PowersPanel
                    pouvoirs={pouvoirs}
                    coproprietaires={coproprietairesWithPouvoirs}
                    stats={pouvoirsStats}
                    quorumPrevisionnel={quorumPrevisionnel}
                    onAddPouvoir={addPouvoir}
                    onRemovePouvoir={removePouvoir}
                    onUploadJustificatif={uploadPouvoirJustificatif}
                    onRemoveJustificatif={removePouvoirJustificatif}
                    validatePouvoir={validatePouvoir}
                />
            )}

            <div className={styles.footer}>
                <button
                    onClick={() => router.push(`/ag/${agId}/envoi`)}
                    className="btn btn-secondary"
                >
                    <ArrowLeft size={16} aria-hidden="true" />
                    Retour à l&apos;envoi
                </button>
                <button
                    onClick={handleContinue}
                    className="btn btn-primary"
                >
                    Continuer vers la session
                    <ArrowRight size={16} aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}
