'use client';

import { useRouter } from 'next/navigation';
import { Check, Calendar, ListChecks, Mail, Send, Vote, Users, FileText, ClipboardCheck, CheckCircle } from 'lucide-react';
import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { StepGroupCard } from './StepGroupCard';
import type { StepConfig, StepStatus, StepItemModel, StepGroupModel } from './types';
import styles from './Stepper.module.css';

interface StepperProps {
    currentStep: number;
    agId?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================
const STEPS_CONFIG: StepConfig[] = [
    { id: 'planification', numero: 1, titre: 'Planification', path: 'edit', icon: Calendar },
    { id: 'ordre-jour', numero: 2, titre: 'Ordre du jour', path: 'agenda', icon: ListChecks },
    { id: 'preparation-convoc', numero: 3, titre: 'Préparation convocations', path: 'convocation', icon: Mail },
    { id: 'envoi-convoc', numero: 4, titre: 'Envoi convocations', path: 'envoi', icon: Send },
    { id: 'votes-corresp', numero: 5, titre: 'Votes par correspondance', path: 'votes-correspondance', icon: Vote, optional: true },
    { id: 'feuille-presence', numero: 6, titre: 'Feuille de présence', path: 'feuille-presence', icon: ClipboardCheck },
    { id: 'tenue-ag', numero: 7, titre: 'Tenue de l\'AG', path: 'session', icon: Users },
    { id: 'pv', numero: 8, titre: 'Procès-verbal', path: 'pv', icon: FileText },
    { id: 'finalisation', numero: 9, titre: 'Finalisation', path: 'finalisation', icon: CheckCircle, optional: true },
];

// Retry config
const FETCH_RETRY_ATTEMPTS = 2;
const FETCH_RETRY_DELAYS = [300, 800]; // ms

// ============================================================================
// CACHE HELPERS (sessionStorage - UX fallback, synchronized with DB)
// ============================================================================
function getCacheKey(agId: string): string {
    return `ag:${agId}:maxStepReached`;
}

function getCachedMaxStep(agId: string): number | null {
    if (typeof window === 'undefined') return null;
    try {
        const cached = sessionStorage.getItem(getCacheKey(agId));
        if (cached) {
            const value = parseInt(cached, 10);
            if (!isNaN(value) && value >= 1 && value <= 8) {
                return value;
            }
        }
    } catch {
        // sessionStorage may be unavailable
    }
    return null;
}

function setCachedMaxStep(agId: string, value: number): void {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.setItem(getCacheKey(agId), String(value));
        // Cache updated
    } catch {
        // ignore
    }
}

// ============================================================================
// HELPERS
// ============================================================================
function getStepUrl(agId: string, stepConfig: StepConfig): string {
    return stepConfig.numero === 1
        ? `/ag/${agId}/edit`
        : `/ag/${agId}/${stepConfig.path}`;
}

function isStepClickable(stepNumber: number, maxStepReached: number, hasAgId: boolean): boolean {
    if (!hasAgId) return false;
    return stepNumber <= maxStepReached;
}

function getStepStatus(stepNumber: number, currentStep: number, maxStepReached: number): StepStatus {
    if (stepNumber === currentStep) return 'current';
    if (stepNumber <= maxStepReached) return 'completed';
    return 'pending';
}

// ============================================================================
// COMPUTE INITIAL MAX STEP (sticky: never goes down)
// CRITICAL: Cache is the primary source for initial render to avoid flash
// ============================================================================
function computeInitialMaxStep(currentStep: number, agId?: string): number {
    // Start with currentStep as minimum
    let initial = Math.max(1, currentStep);

    // Check cache for potentially higher value
    if (agId) {
        const cached = getCachedMaxStep(agId);
        if (cached !== null && cached >= 1 && cached <= 9) {
            initial = Math.max(initial, cached);
        }
    }

    return initial;
}

// ============================================================================
// COMPONENT
// ============================================================================
export default function Stepper({ currentStep, agId }: StepperProps) {
    const router = useRouter();

    // ========================================================================
    // STATE: maxStepReached - STICKY (never decreases)
    // Initialized with max(currentStep, cache) to avoid showing steps as locked
    // ========================================================================
    const [maxStepReached, setMaxStepReached] = useState<number>(() =>
        computeInitialMaxStep(currentStep, agId)
    );
    const [isLoading, setIsLoading] = useState(true);
    const [fetchFailed, setFetchFailed] = useState(false);

    // Track if component is mounted for async safety
    const isMountedRef = useRef(true);

    // Track maxStepReached for logging in effects without adding as dependency
    const maxStepReachedRef = useRef(maxStepReached);
    useEffect(() => {
        maxStepReachedRef.current = maxStepReached;
    }, [maxStepReached]);

    // ========================================================================
    // STICKY UPDATER: maxStepReached can only increase, never decrease
    // CRITICAL: This is the core of the fix - value can ONLY go UP
    // ========================================================================
    const updateMaxStepReached = useCallback((newValue: number, _source: string = 'unknown') => {
        setMaxStepReached(prev => {
            // STICKY: Always take the maximum of all known values
            const updated = Math.max(prev, newValue);

            // CRITICAL FIX: Always sync cache if updated > cached value
            // This ensures cache is written even on first visit to a step
            if (agId) {
                const cached = getCachedMaxStep(agId);
                if (cached === null || updated > cached) {
                    setCachedMaxStep(agId, updated);
                }
            }

            return updated;
        });
    }, [agId, currentStep]);

    // ========================================================================
    // FETCH with retry logic - DB is source of truth for max_step_reached
    // ========================================================================
    useEffect(() => {
        isMountedRef.current = true;

        if (!agId) {
            setIsLoading(false);
            return;
        }

        const fetchWithRetry = async (attempt: number = 0): Promise<void> => {
            try {
                const supabase = createClient();
                const { data, error } = await supabase
                    .from('ag_meetings')
                    .select('max_step_reached, current_step')
                    .eq('id', agId)
                    .single();

                if (!isMountedRef.current) return;

                if (!error && data) {
                    // SUCCESS: Compute dbMax from DB values
                    const dbMaxStepReached = data.max_step_reached || 1;
                    const dbCurrentStep = data.current_step || 1;
                    const dbMax = Math.max(dbMaxStepReached, dbCurrentStep);

                    // Get current values for comparison
                    const currentCached = getCachedMaxStep(agId);
                    const currentState = maxStepReachedRef.current;

                    // CRITICAL: Compute the TRUE max from ALL sources
                    // Never let any value go DOWN
                    const trueMax = Math.max(dbMax, currentCached ?? 1, currentState, currentStep);

                    // CRITICAL: Write to cache with TRUE MAX (never decrease)
                    if (currentCached === null || trueMax > currentCached) {
                        setCachedMaxStep(agId, trueMax);
                    }

                    // Update state with TRUE MAX (sticky - only increases)
                    updateMaxStepReached(trueMax, 'fetch');
                    setFetchFailed(false);
                } else {
                    // ERROR: Retry or fallback
                    if (attempt < FETCH_RETRY_ATTEMPTS) {
                        const delay = FETCH_RETRY_DELAYS[attempt] || 500;
                        await new Promise(resolve => setTimeout(resolve, delay));
                        if (isMountedRef.current) {
                            return fetchWithRetry(attempt + 1);
                        }
                    } else {
                        // All retries exhausted: keep current state (don't downgrade)
                        // DON'T call updateMaxStepReached with currentStep - keep existing state
                        setFetchFailed(true);
                    }
                }
            } catch {
                if (!isMountedRef.current) return;

                // Exception: Retry or fallback
                if (attempt < FETCH_RETRY_ATTEMPTS) {
                    const delay = FETCH_RETRY_DELAYS[attempt] || 500;
                    await new Promise(resolve => setTimeout(resolve, delay));
                    if (isMountedRef.current) {
                        return fetchWithRetry(attempt + 1);
                    }
                } else {
                    // DON'T downgrade - keep existing state
                    setFetchFailed(true);
                }
            } finally {
                if (isMountedRef.current) {
                    setIsLoading(false);
                }
            }
        };

        fetchWithRetry();

        return () => {
            isMountedRef.current = false;
        };
    }, [agId]); // CRITICAL: Remove currentStep from deps to avoid re-fetch on navigation

    // ========================================================================
    // CRITICAL: Sync state with cache when component updates (not just mounts)
    // This handles the case where Next.js doesn't remount the component
    // ========================================================================
    useEffect(() => {
        if (!agId) return;

        const cached = getCachedMaxStep(agId);
        const currentMax = maxStepReachedRef.current;

        // Compute the true max from all sources
        const trueMax = Math.max(currentStep, cached ?? 1, currentMax);

        // If true max is higher than current state, update
        if (trueMax > currentMax) {
            setMaxStepReached(trueMax);
            // Also update cache
            setCachedMaxStep(agId, trueMax);
        }
    }, [agId, currentStep]); // Runs on every navigation - uses ref for current state

    // ========================================================================
    // NAVIGATION HANDLER
    // ========================================================================
    const handleStepClick = useCallback((stepConfig: StepConfig) => {
        if (!agId) return;

        const targetUrl = getStepUrl(agId, stepConfig);
        const clickable = isStepClickable(stepConfig.numero, maxStepReached, true);

        if (clickable) {
            router.push(targetUrl);
        }
    }, [agId, maxStepReached, router]);

    // ========================================================================
    // COMPUTED VALUES
    // ========================================================================
    const isPreparationModule = currentStep <= 4;

    const { preparationGroup, deroulementGroup } = useMemo(() => {
        const hasAgId = !!agId;

        const buildStepItems = (configs: StepConfig[]): StepItemModel[] => {
            return configs.map(config => {
                const status = getStepStatus(config.numero, currentStep, maxStepReached);
                const clickable = isStepClickable(config.numero, maxStepReached, hasAgId);

                return {
                    id: config.id,
                    numero: config.numero,
                    titre: config.titre,
                    icon: config.icon,
                    status,
                    optional: config.optional,
                    isClickable: clickable,
                    onClick: clickable ? () => handleStepClick(config) : undefined,
                };
            });
        };

        // Préparation (1-4)
        const prepConfigs = STEPS_CONFIG.filter(s => s.numero <= 4);
        const prepItems = buildStepItems(prepConfigs);
        const prepCompletedCount = prepItems.filter(s => s.status === 'completed').length;

        const preparation: StepGroupModel = {
            id: 'preparation',
            titre: 'Préparation AG',
            subtitle: 'Étapes 1-4',
            icon: Calendar,
            steps: prepItems,
            completedCount: prepCompletedCount,
            totalCount: 4,
            isActive: isPreparationModule,
            isCompleted: maxStepReached > 4,
        };

        // Déroulement (5-8)
        const deroulConfigs = STEPS_CONFIG.filter(s => s.numero >= 5);
        const deroulItems = buildStepItems(deroulConfigs);
        const deroulCompletedCount = deroulItems.filter(s => s.status === 'completed').length;

        const deroulement: StepGroupModel = {
            id: 'deroulement',
            titre: 'Déroulement + PV',
            subtitle: 'Étapes 5-9',
            icon: Users,
            steps: deroulItems,
            completedCount: deroulCompletedCount,
            totalCount: 5,
            isActive: !isPreparationModule,
            isCompleted: maxStepReached > 8,
        };

        return { preparationGroup: preparation, deroulementGroup: deroulement };
    }, [currentStep, maxStepReached, agId, isPreparationModule, handleStepClick]);

    const globalProgress = Math.round(((maxStepReached - 1) / 9) * 100);

    // ========================================================================
    // RENDER: Loading
    // ========================================================================
    if (isLoading) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <div className={styles.globalProgress}>
                        <span className={styles.progressLabel}>Chargement...</span>
                        <div className={styles.progressBar}>
                            <div className={styles.progressFill} style={{ width: '0%' }} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ========================================================================
    // RENDER: Main
    // ========================================================================
    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.globalProgress}>
                    <span className={styles.progressLabel}>
                        Progression
                        {fetchFailed && <span title="Mode hors-ligne"> ⚠️</span>}
                    </span>
                    <div className={styles.progressBar}>
                        <div
                            className={styles.progressFill}
                            style={{ width: `${globalProgress}%` }}
                        />
                    </div>
                    <span className={styles.progressValue}>{globalProgress}%</span>
                </div>
            </div>

            {/* Groupes d'étapes */}
            <div className={styles.groups}>
                <StepGroupCard
                    group={preparationGroup}
                    maxStepReached={maxStepReached}
                />

                <div className={styles.groupSeparator}>
                    <div className={styles.separatorLine} />
                    <div className={styles.separatorIcon}>
                        <Send size={14} />
                    </div>
                    <div className={styles.separatorLine} />
                </div>

                <StepGroupCard
                    group={deroulementGroup}
                    maxStepReached={maxStepReached}
                />
            </div>

            {/* Vue mobile */}
            <div className={styles.mobileView}>
                <div className={styles.mobileHeader}>
                    <span className={styles.mobileModule}>
                        {isPreparationModule ? 'Préparation AG' : 'Déroulement + PV'}
                    </span>
                    <span className={styles.mobileStep}>
                        Étape {currentStep}/9
                    </span>
                </div>
                <div className={styles.mobileTitle}>
                    {STEPS_CONFIG[currentStep - 1]?.titre}
                </div>
                <div className={styles.mobileProgressBar}>
                    <div
                        className={styles.mobileProgressFill}
                        style={{ width: `${globalProgress}%` }}
                    />
                </div>
                <div className={styles.mobileDots}>
                    {STEPS_CONFIG.map((stepConfig) => {
                        const status = getStepStatus(stepConfig.numero, currentStep, maxStepReached);
                        const clickable = isStepClickable(stepConfig.numero, maxStepReached, !!agId);
                        const statusClass = styles[`mobileDot${status.charAt(0).toUpperCase() + status.slice(1)}`];

                        return (
                            <button
                                key={stepConfig.id}
                                className={`${styles.mobileDot} ${statusClass}`}
                                onClick={() => clickable && handleStepClick(stepConfig)}
                                disabled={!clickable}
                                title={stepConfig.titre}
                            >
                                {status === 'completed' ? (
                                    <Check size={10} strokeWidth={3} />
                                ) : (
                                    stepConfig.numero
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
