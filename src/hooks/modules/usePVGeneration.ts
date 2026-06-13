/**
 * Hook pour la génération du Procès-Verbal avec progression en temps réel
 *
 * Ce hook fournit :
 * - La génération asynchrone du PV
 * - Le polling du statut avec mise à jour live
 * - La gestion des erreurs et retry
 * - L'accès au document généré
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    pvGenerationService,
    type PVJob,
    type PVDocument,
    type PVJobProgress,
    type GeneratePVOptions,
    type PVJobStatus,
    type PVDocumentStatus,
} from '@/lib/services/pv-generation.service';
import { useCopro } from '@/providers/CoproContext';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface UsePVGenerationOptions {
    agId: string;
    /** ID de la copropriété (optionnel, utilise le contexte si non fourni) */
    coproId?: string;
    /** Intervalle de polling en ms (défaut: 1000) */
    pollingInterval?: number;
    /** Activer le polling automatique (défaut: true) */
    autoPolling?: boolean;
}

export interface UsePVGenerationReturn {
    // État
    job: PVJob | null;
    document: PVDocument | null;
    progress: PVJobProgress | null;
    status: PVJobStatus | null;
    documentStatus: PVDocumentStatus | null;
    isGenerating: boolean;
    isCompleted: boolean;
    isFailed: boolean;
    error: string | null;

    // Actions
    startGeneration: (options: Omit<GeneratePVOptions, 'agId'>) => Promise<void>;
    retryGeneration: () => Promise<void>;
    downloadPdf: () => void;
    archiveToGED: () => Promise<string | null>;
    sendToCoproprietaires: (recipientIds: string[]) => Promise<{ sent: number; errors: string[] }>;

    // Contrôle du polling
    startPolling: () => void;
    stopPolling: () => void;

    // Utilitaires
    resetState: () => void;
}

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

export function usePVGeneration({
    agId,
    coproId: coproIdProp,
    pollingInterval = 1000,
    autoPolling = true,
}: UsePVGenerationOptions): UsePVGenerationReturn {
    const { currentCoproId } = useCopro();
    const coproId = coproIdProp || currentCoproId || '';

    const [job, setJob] = useState<PVJob | null>(null);
    const [document, setDocument] = useState<PVDocument | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [, setIsPolling] = useState(false);

    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const lastGenerationOptionsRef = useRef<Omit<GeneratePVOptions, 'agId'> | null>(null);

    // Calculer les états dérivés
    const progress = job?.progress || null;
    const status = job?.status || null;
    const documentStatus = document?.status || null;
    const isGenerating = status === 'queued' || status === 'running';
    const isCompleted = status === 'succeeded';
    const isFailed = status === 'failed';

    // Charger le job et document existants au montage
    useEffect(() => {
        const loadInitialState = async () => {
            const existingJob = pvGenerationService.getLatestJobForAG(agId);
            const existingDoc = coproId
                ? await pvGenerationService.getDocumentForAG(agId, coproId)
                : null;

            if (existingJob) {
                setJob(existingJob);
                if (existingJob.error) {
                    setError(existingJob.error);
                }
            }

            if (existingDoc) {
                setDocument(existingDoc);
            }
        };
        loadInitialState();
    }, [agId, coproId]);

    // Fonction de polling
    const pollJobStatus = useCallback(async () => {
        if (!job?.id) return;

        const updatedJob = pvGenerationService.getJob(job.id);
        if (updatedJob) {
            setJob(updatedJob);

            if (updatedJob.status === 'succeeded' && updatedJob.pvDocumentId) {
                const doc = await pvGenerationService.getDocument(updatedJob.pvDocumentId);
                if (doc) {
                    setDocument(doc);
                }
            }

            if (updatedJob.status === 'failed') {
                setError(updatedJob.error || 'Erreur lors de la génération');
            }

            // Arrêter le polling si terminé
            if (updatedJob.status === 'succeeded' || updatedJob.status === 'failed' || updatedJob.status === 'cancelled') {
                stopPolling();
            }
        }
    }, [job?.id]);

    // Démarrer le polling
    const startPolling = useCallback(() => {
        if (pollingRef.current) return;

        setIsPolling(true);
        pollingRef.current = setInterval(pollJobStatus, pollingInterval);
    }, [pollJobStatus, pollingInterval]);

    // Arrêter le polling
    const stopPolling = useCallback(() => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
        setIsPolling(false);
    }, []);

    // Auto-polling quand un job est en cours
    useEffect(() => {
        if (autoPolling && job && (job.status === 'queued' || job.status === 'running')) {
            startPolling();
        }

        return () => {
            stopPolling();
        };
    }, [autoPolling, job?.status, startPolling, stopPolling]);

    // Démarrer la génération
    const startGeneration = useCallback(async (options: Omit<GeneratePVOptions, 'agId'>) => {
        try {
            setError(null);
            lastGenerationOptionsRef.current = options;

            const newJob = await pvGenerationService.startGeneration({
                ...options,
                agId,
            });

            setJob(newJob);

            // Si le job est déjà terminé (document existant), charger le document
            if (newJob.status === 'succeeded' && newJob.pvDocumentId) {
                const doc = await pvGenerationService.getDocument(newJob.pvDocumentId);
                if (doc) {
                    setDocument(doc);
                }
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur lors du démarrage de la génération';
            setError(errorMessage);
            console.error('[usePVGeneration] Erreur:', err);
        }
    }, [agId]);

    // Retry la génération
    const retryGeneration = useCallback(async () => {
        if (!lastGenerationOptionsRef.current) {
            setError('Impossible de relancer la génération : options manquantes');
            return;
        }

        await startGeneration({
            ...lastGenerationOptionsRef.current,
            forceRegenerate: true,
        });
    }, [startGeneration]);

    // Télécharger le PDF
    const downloadPdf = useCallback(() => {
        if (!document?.id) {
            setError('Document non disponible');
            return;
        }
        pvGenerationService.downloadDocument(document.id);
    }, [document?.id]);

    // Archiver dans la GED
    const archiveToGED = useCallback(async (): Promise<string | null> => {
        if (!document?.id) {
            setError('Document non disponible');
            return null;
        }

        try {
            const gedId = await pvGenerationService.archiveToGED(document.id);

            // Recharger le document mis à jour
            const updatedDoc = await pvGenerationService.getDocument(document.id);
            if (updatedDoc) {
                setDocument(updatedDoc);
            }

            return gedId;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'archivage';
            setError(errorMessage);
            return null;
        }
    }, [document?.id]);

    // Envoyer aux copropriétaires
    const sendToCoproprietaires = useCallback(async (recipientIds: string[]) => {
        if (!document?.id) {
            return { sent: 0, errors: ['Document non disponible'] };
        }

        try {
            const result = await pvGenerationService.sendToCoproprietaires(document.id, recipientIds);

            // Recharger le document mis à jour
            const updatedDoc = await pvGenerationService.getDocument(document.id);
            if (updatedDoc) {
                setDocument(updatedDoc);
            }

            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'envoi';
            return { sent: 0, errors: [errorMessage] };
        }
    }, [document?.id]);

    // Réinitialiser l'état
    const resetState = useCallback(() => {
        stopPolling();
        setJob(null);
        setDocument(null);
        setError(null);
        lastGenerationOptionsRef.current = null;
    }, [stopPolling]);

    // Cleanup au démontage
    useEffect(() => {
        return () => {
            stopPolling();
        };
    }, [stopPolling]);

    return {
        job,
        document,
        progress,
        status,
        documentStatus,
        isGenerating,
        isCompleted,
        isFailed,
        error,
        startGeneration,
        retryGeneration,
        downloadPdf,
        archiveToGED,
        sendToCoproprietaires,
        startPolling,
        stopPolling,
        resetState,
    };
}

export default usePVGeneration;
