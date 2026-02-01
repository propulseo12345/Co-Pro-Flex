/**
 * Hook pour gérer les votes par correspondance d'une AG
 *
 * MIGRATION 2026-01-31: Source de vérité = Supabase uniquement
 * - Votes stockés dans ag_votes (vote_source = 'correspondence')
 * - Résolutions chargées depuis ag_resolutions
 * - Copropriétaires chargés depuis coproprietaires
 * - RPCs: save_votes_correspondance, get_votes_correspondance
 */

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
    JustificatifVote,
    VoteChoiceUI,
    VoteCompletionStatus,
} from '@/types/models/ag';

// ============================================================================
// Types
// ============================================================================

interface Resolution {
    id: string;
    titre: string;
    texte?: string;
    majorite?: string;
    numero?: number;
}

interface CoproprietaireDB {
    id: string;
    full_name: string;
    email: string | null;
    tantiemes: number;
    lot_ids: string[];
}

export interface VoteCorrespondanceState {
    coproprietaireId: string;
    tantiemesVotes: number;
    tantiemesMax: number;
    votesByResolutionId: Record<string, VoteChoiceUI>;
    justificatif: JustificatifVote | null;
    statut: 'BROUILLON' | 'VALIDE';
    dateModification: string;
}

export interface VotesCorrespondanceProgress {
    totalCoproprietaires: number;
    coproprietairesComplets: number;
    totalResolutions: number;
    totalVotesSaisis: number;
    totalVotesPossibles: number;
    justificatifsRecus: number;
    pourcentageCompletion: number;
}

export interface CoproprietaireWithVoteStatus {
    id: string;
    nom: string;
    email: string | null;
    tantiemes: number;
    lot: string;
    votesCount: number;
    totalResolutions: number;
    completionStatus: VoteCompletionStatus;
    hasJustificatif: boolean;
    tantiemesVotes: number;
}

export interface UseVotesCorrespondanceOptions {
    agId: string;
}

export interface UseVotesCorrespondanceReturn {
    // Données
    coproprietaires: CoproprietaireWithVoteStatus[];
    resolutions: Resolution[];
    selectedCoproId: string | null;
    selectedCoproState: VoteCorrespondanceState | null;
    progress: VotesCorrespondanceProgress;
    isLoading: boolean;

    // Actions sur la sélection
    selectCopro: (coproId: string | null) => void;

    // Actions sur les votes
    setVote: (coproId: string, resolutionId: string, choice: VoteChoiceUI) => void;
    setAllVotes: (coproId: string, choice: VoteChoiceUI) => void;
    clearVotes: (coproId: string) => void;

    // Actions sur les tantièmes
    setTantiemes: (coproId: string, value: number) => void;
    resetTantiemes: (coproId: string) => void;

    // Actions sur le justificatif
    uploadJustificatif: (coproId: string, file: File) => Promise<void>;
    removeJustificatif: (coproId: string) => void;

    // Actions sur le statut
    markAsComplete: (coproId: string) => void;
    markAsDraft: (coproId: string) => void;

    // Sauvegarde et export
    save: () => Promise<void>;
    exportCsv: () => void;

    // Validation
    getValidationErrors: (coproId: string) => string[];
    canMarkAsComplete: (coproId: string) => boolean;
}

// ============================================================================
// Helpers
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

function isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

function mapVoteFromDB(vote: string): VoteChoiceUI {
    const mapping: Record<string, VoteChoiceUI> = {
        'for': 'POUR',
        'against': 'CONTRE',
        'abstention': 'ABSTENTION',
    };
    return mapping[vote] || null;
}

function mapVoteToDB(choice: VoteChoiceUI): string | null {
    const mapping: Record<string, string> = {
        'POUR': 'for',
        'CONTRE': 'against',
        'ABSTENTION': 'abstention',
    };
    return choice ? mapping[choice] || null : null;
}

function createEmptyVoteState(coproId: string, tantiemes: number): VoteCorrespondanceState {
    return {
        coproprietaireId: coproId,
        tantiemesVotes: tantiemes,
        tantiemesMax: tantiemes,
        votesByResolutionId: {},
        justificatif: null,
        statut: 'BROUILLON',
        dateModification: new Date().toISOString(),
    };
}

function countVotes(state: VoteCorrespondanceState): number {
    return Object.values(state.votesByResolutionId).filter(v => v !== null).length;
}

function isComplete(state: VoteCorrespondanceState, totalResolutions: number): boolean {
    const votesCount = countVotes(state);
    return (
        totalResolutions > 0 &&
        votesCount === totalResolutions &&
        state.tantiemesVotes > 0 &&
        state.tantiemesVotes <= state.tantiemesMax
    );
}

// ============================================================================
// Hook
// ============================================================================

export function useVotesCorrespondance({
    agId,
}: UseVotesCorrespondanceOptions): UseVotesCorrespondanceReturn {
    const [votesState, setVotesState] = useState<Record<string, VoteCorrespondanceState>>({});
    const [resolutions, setResolutions] = useState<Resolution[]>([]);
    const [coproprietairesDB, setCoproprietairesDB] = useState<CoproprietaireDB[]>([]);
    const [selectedCoproId, setSelectedCoproId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [coproId, setCoproId] = useState<string | null>(null);

    // Debounce save
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pendingSavesRef = useRef<Set<string>>(new Set());

    // Load data from Supabase
    useEffect(() => {
        if (!isValidUUID(agId)) {
            setIsLoading(false);
            return;
        }

        const loadData = async () => {
            setIsLoading(true);

            try {
                const supabase = createUntypedClient();

                // 1. Get AG info to get copro_id
                const { data: agData, error: agError } = await supabase
                    .from('ag_meetings')
                    .select('copro_id')
                    .eq('id', agId)
                    .single();

                if (agError || !agData) {
                    console.error('[useVotesCorrespondance] AG not found:', agError);
                    setIsLoading(false);
                    return;
                }

                const coproprieteId = agData.copro_id;
                setCoproId(coproprieteId);

                // 2. Load resolutions for this AG
                const { data: resolutionsData, error: resError } = await supabase
                    .from('ag_resolutions')
                    .select('id, title, description, majority_type, resolution_number')
                    .eq('ag_id', agId)
                    .order('resolution_number', { ascending: true });

                if (resError) {
                    console.error('[useVotesCorrespondance] Error loading resolutions:', resError);
                }

                const mappedResolutions: Resolution[] = (resolutionsData || []).map((r: {
                    id: string;
                    title: string;
                    description: string | null;
                    majority_type: string;
                    resolution_number: number;
                }) => ({
                    id: r.id,
                    titre: r.title,
                    texte: r.description || undefined,
                    majorite: r.majority_type,
                    numero: r.resolution_number,
                }));
                setResolutions(mappedResolutions);

                // 3. Load coproprietaires via secure RPC (derives copro from AG)
                const { data: coprosData, error: coprosError } = await supabase
                    .rpc('rpc_get_ag_coproprietaires', { p_ag_id: agId });

                if (coprosError) {
                    console.error('[useVotesCorrespondance] Error loading coproprietaires:', coprosError);
                }

                // Map RPC result to expected format
                const copros: CoproprietaireDB[] = (coprosData || []).map((c: { id: string; display_name: string; email: string | null; total_tantiemes: number }) => ({
                    id: c.id,
                    full_name: c.display_name,
                    email: c.email,
                    tantiemes: c.total_tantiemes,
                    lot_ids: [],
                }));
                setCoproprietairesDB(copros);

                // 4. Load existing correspondence votes via RPC
                const { data: votesResult, error: votesError } = await supabase
                    .rpc('get_votes_correspondance', { p_ag_id: agId });

                if (votesError) {
                    console.error('[useVotesCorrespondance] Error loading votes:', votesError);
                }

                // 5. Build votes state from loaded data
                const initialState: Record<string, VoteCorrespondanceState> = {};

                copros.forEach((copro: CoproprietaireDB) => {
                    initialState[copro.id] = createEmptyVoteState(copro.id, copro.tantiemes || 0);
                });

                // Merge with loaded votes
                if (votesResult?.success && votesResult.votes_by_coproprietaire) {
                    Object.entries(votesResult.votes_by_coproprietaire).forEach(([coproIdKey, data]: [string, unknown]) => {
                        const coproData = data as {
                            coproprietaire_id: string;
                            tantiemes_max: number;
                            votes: Array<{ resolution_id: string; vote: string; tantiemes: number }>;
                        };

                        if (initialState[coproIdKey]) {
                            const votesByResolution: Record<string, VoteChoiceUI> = {};
                            let maxTantiemes = 0;

                            coproData.votes.forEach((v) => {
                                votesByResolution[v.resolution_id] = mapVoteFromDB(v.vote);
                                if (v.tantiemes > maxTantiemes) maxTantiemes = v.tantiemes;
                            });

                            initialState[coproIdKey] = {
                                ...initialState[coproIdKey],
                                votesByResolutionId: votesByResolution,
                                tantiemesVotes: maxTantiemes || initialState[coproIdKey].tantiemesMax,
                                statut: Object.keys(votesByResolution).length === mappedResolutions.length ? 'VALIDE' : 'BROUILLON',
                            };
                        }
                    });
                }

                setVotesState(initialState);

            } catch (err) {
                console.error('[useVotesCorrespondance] Error:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [agId]);

    // Save votes to Supabase (debounced)
    const saveVotesForCopro = useCallback(async (coproprietaireId: string) => {
        if (!isValidUUID(agId) || !coproprietaireId) return;

        const state = votesState[coproprietaireId];
        if (!state) return;

        try {
            const supabase = createUntypedClient();

            // Build votes array for RPC
            const votes = Object.entries(state.votesByResolutionId)
                .filter(([, choice]) => choice !== null)
                .map(([resolutionId, choice]) => ({
                    resolution_id: resolutionId,
                    vote: mapVoteToDB(choice),
                    tantiemes: state.tantiemesVotes,
                }));

            const { data, error } = await supabase.rpc('save_votes_correspondance', {
                p_ag_id: agId,
                p_coproprietaire_id: coproprietaireId,
                p_votes: votes,
                p_status: state.statut === 'VALIDE' ? 'validated' : 'draft',
            });

            if (error) {
                console.error('[useVotesCorrespondance] Error saving votes:', error);
            } else if (data?.success) {
                console.log('[useVotesCorrespondance] Votes saved:', data.upserted_count);
            }
        } catch (err) {
            console.error('[useVotesCorrespondance] Save error:', err);
        }
    }, [agId, votesState]);

    // Debounced save effect
    useEffect(() => {
        if (pendingSavesRef.current.size === 0) return;

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            const coprosToSave = Array.from(pendingSavesRef.current);
            pendingSavesRef.current.clear();

            coprosToSave.forEach(coproprietaireId => {
                saveVotesForCopro(coproprietaireId);
            });
        }, 1000); // 1 second debounce

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [votesState, saveVotesForCopro]);

    // Mark copro for save
    const markForSave = useCallback((coproprietaireId: string) => {
        pendingSavesRef.current.add(coproprietaireId);
    }, []);

    // Coproprietaires with vote status
    const coproprietaires = useMemo<CoproprietaireWithVoteStatus[]>(() => {
        return coproprietairesDB.map(copro => {
            const state = votesState[copro.id];
            const votesCount = state ? countVotes(state) : 0;
            const complete = state ? isComplete(state, resolutions.length) : false;

            return {
                id: copro.id,
                nom: copro.full_name,
                email: copro.email,
                tantiemes: copro.tantiemes || 0,
                lot: copro.lot_ids?.join(', ') || '',
                votesCount,
                totalResolutions: resolutions.length,
                completionStatus: complete ? 'COMPLET' : 'INCOMPLET',
                hasJustificatif: state?.justificatif !== null,
                tantiemesVotes: state?.tantiemesVotes ?? (copro.tantiemes || 0),
            };
        });
    }, [votesState, resolutions.length, coproprietairesDB]);

    // Selected copro state
    const selectedCoproState = useMemo(() => {
        if (!selectedCoproId) return null;
        return votesState[selectedCoproId] ?? null;
    }, [selectedCoproId, votesState]);

    // Progress
    const progress = useMemo<VotesCorrespondanceProgress>(() => {
        const totalCopros = coproprietairesDB.length;
        const totalRes = resolutions.length;
        const totalPossible = totalCopros * totalRes;

        let completCount = 0;
        let totalVotes = 0;
        let justificatifs = 0;

        Object.values(votesState).forEach(state => {
            const votes = countVotes(state);
            totalVotes += votes;

            if (isComplete(state, totalRes)) {
                completCount++;
            }

            if (state.justificatif) {
                justificatifs++;
            }
        });

        return {
            totalCoproprietaires: totalCopros,
            coproprietairesComplets: completCount,
            totalResolutions: totalRes,
            totalVotesSaisis: totalVotes,
            totalVotesPossibles: totalPossible,
            justificatifsRecus: justificatifs,
            pourcentageCompletion: totalPossible > 0
                ? Math.round((totalVotes / totalPossible) * 100)
                : 0,
        };
    }, [votesState, resolutions.length, coproprietairesDB.length]);

    // Actions
    const selectCopro = useCallback((coproIdParam: string | null) => {
        setSelectedCoproId(coproIdParam);
    }, []);

    const setVote = useCallback((coproprietaireId: string, resolutionId: string, choice: VoteChoiceUI) => {
        setVotesState(prev => {
            const state = prev[coproprietaireId];
            if (!state) return prev;

            const currentChoice = state.votesByResolutionId[resolutionId];
            const newChoice = currentChoice === choice ? null : choice;

            return {
                ...prev,
                [coproprietaireId]: {
                    ...state,
                    votesByResolutionId: {
                        ...state.votesByResolutionId,
                        [resolutionId]: newChoice,
                    },
                    dateModification: new Date().toISOString(),
                    statut: 'BROUILLON',
                },
            };
        });
        markForSave(coproprietaireId);
    }, [markForSave]);

    const setAllVotes = useCallback((coproprietaireId: string, choice: VoteChoiceUI) => {
        setVotesState(prev => {
            const state = prev[coproprietaireId];
            if (!state) return prev;

            const allSame = resolutions.every(
                res => state.votesByResolutionId[res.id] === choice
            );

            const newVotes: Record<string, VoteChoiceUI> = {};
            resolutions.forEach(res => {
                newVotes[res.id] = allSame ? null : choice;
            });

            return {
                ...prev,
                [coproprietaireId]: {
                    ...state,
                    votesByResolutionId: newVotes,
                    dateModification: new Date().toISOString(),
                    statut: 'BROUILLON',
                },
            };
        });
        markForSave(coproprietaireId);
    }, [resolutions, markForSave]);

    const clearVotes = useCallback((coproprietaireId: string) => {
        setVotesState(prev => {
            const state = prev[coproprietaireId];
            if (!state) return prev;

            return {
                ...prev,
                [coproprietaireId]: {
                    ...state,
                    votesByResolutionId: {},
                    dateModification: new Date().toISOString(),
                    statut: 'BROUILLON',
                },
            };
        });
        markForSave(coproprietaireId);
    }, [markForSave]);

    const setTantiemes = useCallback((coproprietaireId: string, value: number) => {
        setVotesState(prev => {
            const state = prev[coproprietaireId];
            if (!state) return prev;

            return {
                ...prev,
                [coproprietaireId]: {
                    ...state,
                    tantiemesVotes: Math.max(0, Math.min(value, state.tantiemesMax)),
                    dateModification: new Date().toISOString(),
                },
            };
        });
        markForSave(coproprietaireId);
    }, [markForSave]);

    const resetTantiemes = useCallback((coproprietaireId: string) => {
        setVotesState(prev => {
            const state = prev[coproprietaireId];
            if (!state) return prev;

            return {
                ...prev,
                [coproprietaireId]: {
                    ...state,
                    tantiemesVotes: state.tantiemesMax,
                    dateModification: new Date().toISOString(),
                },
            };
        });
        markForSave(coproprietaireId);
    }, [markForSave]);

    const uploadJustificatif = useCallback(async (coproprietaireId: string, file: File) => {
        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            throw new Error('Type de fichier non autorisé. Utilisez PDF, JPG ou PNG.');
        }

        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new Error('Fichier trop volumineux. Maximum 10 Mo.');
        }

        // TODO: Upload to Supabase Storage and store reference
        // For now, store as base64 in state (to be migrated to storage)
        return new Promise<void>((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
                const justificatif: JustificatifVote = {
                    fileName: file.name,
                    mimeType: file.type,
                    size: file.size,
                    uploadedAt: new Date().toISOString(),
                    dataUrl: reader.result as string,
                };

                setVotesState(prev => {
                    const state = prev[coproprietaireId];
                    if (!state) return prev;

                    return {
                        ...prev,
                        [coproprietaireId]: {
                            ...state,
                            justificatif,
                            dateModification: new Date().toISOString(),
                        },
                    };
                });

                resolve();
            };

            reader.onerror = () => {
                reject(new Error('Erreur lors de la lecture du fichier.'));
            };

            reader.readAsDataURL(file);
        });
    }, []);

    const removeJustificatif = useCallback((coproprietaireId: string) => {
        setVotesState(prev => {
            const state = prev[coproprietaireId];
            if (!state) return prev;

            return {
                ...prev,
                [coproprietaireId]: {
                    ...state,
                    justificatif: null,
                    dateModification: new Date().toISOString(),
                },
            };
        });
    }, []);

    const getValidationErrors = useCallback((coproprietaireId: string): string[] => {
        const state = votesState[coproprietaireId];
        if (!state) return ['Copropriétaire non trouvé'];

        const errors: string[] = [];

        const votesCount = countVotes(state);
        if (votesCount < resolutions.length) {
            const missing = resolutions.length - votesCount;
            errors.push(`${missing} résolution(s) sans vote`);
        }

        if (state.tantiemesVotes <= 0) {
            errors.push('Les tantièmes votés doivent être supérieurs à 0');
        }

        if (state.tantiemesVotes > state.tantiemesMax) {
            errors.push(`Les tantièmes votés dépassent le maximum (${state.tantiemesMax})`);
        }

        return errors;
    }, [votesState, resolutions.length]);

    const canMarkAsComplete = useCallback((coproprietaireId: string): boolean => {
        const errors = getValidationErrors(coproprietaireId);
        return errors.length === 0;
    }, [getValidationErrors]);

    const markAsComplete = useCallback((coproprietaireId: string) => {
        if (!canMarkAsComplete(coproprietaireId)) return;

        setVotesState(prev => {
            const state = prev[coproprietaireId];
            if (!state) return prev;

            return {
                ...prev,
                [coproprietaireId]: {
                    ...state,
                    statut: 'VALIDE',
                    dateModification: new Date().toISOString(),
                },
            };
        });
        markForSave(coproprietaireId);
    }, [canMarkAsComplete, markForSave]);

    const markAsDraft = useCallback((coproprietaireId: string) => {
        setVotesState(prev => {
            const state = prev[coproprietaireId];
            if (!state) return prev;

            return {
                ...prev,
                [coproprietaireId]: {
                    ...state,
                    statut: 'BROUILLON',
                    dateModification: new Date().toISOString(),
                },
            };
        });
        markForSave(coproprietaireId);
    }, [markForSave]);

    const save = useCallback(async () => {
        // Force save all pending changes
        const coprosToSave = Object.keys(votesState);
        for (const coproprietaireId of coprosToSave) {
            await saveVotesForCopro(coproprietaireId);
        }
    }, [votesState, saveVotesForCopro]);

    const exportCsv = useCallback(() => {
        if (resolutions.length === 0) return;

        const headers = [
            'Copropriétaire',
            'Lot',
            'Tantièmes totaux',
            'Tantièmes votés',
            ...resolutions.map((r, i) => `Résolution ${i + 1}: ${r.titre}`),
            'Statut',
            'Justificatif',
        ];

        const rows = coproprietairesDB.map(copro => {
            const state = votesState[copro.id];
            const votes = resolutions.map(res => {
                const choice = state?.votesByResolutionId[res.id];
                return choice ?? 'Non renseigné';
            });

            return [
                copro.full_name,
                copro.lot_ids?.join(', ') || '',
                (copro.tantiemes || 0).toString(),
                (state?.tantiemesVotes ?? (copro.tantiemes || 0)).toString(),
                ...votes,
                state ? (isComplete(state, resolutions.length) ? 'COMPLET' : 'INCOMPLET') : 'INCOMPLET',
                state?.justificatif ? 'Oui' : 'Non',
            ];
        });

        const csvContent = [
            headers.join(';'),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(';')),
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `votes-correspondance-${agId}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [agId, votesState, resolutions, coproprietairesDB]);

    return {
        coproprietaires,
        resolutions,
        selectedCoproId,
        selectedCoproState,
        progress,
        isLoading,
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
    };
}

export default useVotesCorrespondance;
