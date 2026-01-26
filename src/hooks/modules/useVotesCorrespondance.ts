/**
 * Hook pour gérer les votes par correspondance d'une AG
 *
 * Fournit un état complet et des helpers pour :
 * - Saisir les votes par copropriétaire et résolution
 * - Gérer les tantièmes votés
 * - Upload et gestion des justificatifs
 * - Calcul de progression temps réel
 * - Export CSV récapitulatif
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { MOCK_COPROPRIETAIRES, type Coproprietaire } from '@/data/mock';
import type {
    VoteCorrespondance,
    JustificatifVote,
    VoteResolution,
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

export interface CoproprietaireWithVoteStatus extends Coproprietaire {
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
    save: () => void;
    exportCsv: () => void;

    // Validation
    getValidationErrors: (coproId: string) => string[];
    canMarkAsComplete: (coproId: string) => boolean;
}

// ============================================================================
// Helpers
// ============================================================================

const STORAGE_KEY_PREFIX = 'ag-votes-correspondance-';
const RESOLUTIONS_KEY_PREFIX = 'ag-resolutions-';

function getStorageKey(agId: string): string {
    return `${STORAGE_KEY_PREFIX}${agId}`;
}

function getResolutionsKey(agId: string): string {
    return `${RESOLUTIONS_KEY_PREFIX}${agId}`;
}

function loadVotesFromStorage(agId: string): Record<string, VoteCorrespondanceState> {
    if (typeof window === 'undefined') return {};

    try {
        const stored = localStorage.getItem(getStorageKey(agId));
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        // Silently fail, return empty
    }
    return {};
}

function saveVotesToStorage(agId: string, votes: Record<string, VoteCorrespondanceState>): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(getStorageKey(agId), JSON.stringify(votes));
    } catch (error) {
        // Silently fail
    }
}

function loadResolutionsFromStorage(agId: string): Resolution[] {
    if (typeof window === 'undefined') return [];

    try {
        const stored = localStorage.getItem(getResolutionsKey(agId));
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        // Silently fail
    }
    return [];
}

function createEmptyVoteState(copro: Coproprietaire): VoteCorrespondanceState {
    return {
        coproprietaireId: copro.id,
        tantiemesVotes: copro.tantiemes,
        tantiemesMax: copro.tantiemes,
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
    const [selectedCoproId, setSelectedCoproId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Charger les données au montage
    useEffect(() => {
        if (typeof window === 'undefined') return;

        setIsLoading(true);

        // Charger les résolutions
        const loadedResolutions = loadResolutionsFromStorage(agId);
        setResolutions(loadedResolutions);

        // Charger les votes existants
        const loadedVotes = loadVotesFromStorage(agId);

        // Initialiser les états manquants pour chaque copropriétaire
        const initialState: Record<string, VoteCorrespondanceState> = {};
        MOCK_COPROPRIETAIRES.forEach(copro => {
            if (loadedVotes[copro.id]) {
                // Mettre à jour tantiemesMax si nécessaire
                initialState[copro.id] = {
                    ...loadedVotes[copro.id],
                    tantiemesMax: copro.tantiemes,
                };
            } else {
                initialState[copro.id] = createEmptyVoteState(copro);
            }
        });

        setVotesState(initialState);
        setIsLoading(false);
    }, [agId]);

    // Sauvegarder automatiquement quand l'état change
    useEffect(() => {
        if (!isLoading && Object.keys(votesState).length > 0) {
            saveVotesToStorage(agId, votesState);
        }
    }, [votesState, agId, isLoading]);

    // Copropriétaires avec statut de vote
    const coproprietaires = useMemo<CoproprietaireWithVoteStatus[]>(() => {
        return MOCK_COPROPRIETAIRES.map(copro => {
            const state = votesState[copro.id];
            const votesCount = state ? countVotes(state) : 0;
            const complete = state ? isComplete(state, resolutions.length) : false;

            return {
                ...copro,
                votesCount,
                totalResolutions: resolutions.length,
                completionStatus: complete ? 'COMPLET' : 'INCOMPLET',
                hasJustificatif: state?.justificatif !== null,
                tantiemesVotes: state?.tantiemesVotes ?? copro.tantiemes,
            };
        });
    }, [votesState, resolutions.length]);

    // État du copropriétaire sélectionné
    const selectedCoproState = useMemo(() => {
        if (!selectedCoproId) return null;
        return votesState[selectedCoproId] ?? null;
    }, [selectedCoproId, votesState]);

    // Progression globale
    const progress = useMemo<VotesCorrespondanceProgress>(() => {
        const totalCopros = MOCK_COPROPRIETAIRES.length;
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
    }, [votesState, resolutions.length]);

    // Actions
    const selectCopro = useCallback((coproId: string | null) => {
        setSelectedCoproId(coproId);
    }, []);

    const setVote = useCallback((coproId: string, resolutionId: string, choice: VoteChoiceUI) => {
        setVotesState(prev => {
            const state = prev[coproId];
            if (!state) return prev;

            const currentChoice = state.votesByResolutionId[resolutionId];
            const newChoice = currentChoice === choice ? null : choice;

            return {
                ...prev,
                [coproId]: {
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
    }, []);

    const setAllVotes = useCallback((coproId: string, choice: VoteChoiceUI) => {
        setVotesState(prev => {
            const state = prev[coproId];
            if (!state) return prev;

            // Vérifier si tous les votes sont déjà sur ce choix
            const allSame = resolutions.every(
                res => state.votesByResolutionId[res.id] === choice
            );

            const newVotes: Record<string, VoteChoiceUI> = {};
            resolutions.forEach(res => {
                newVotes[res.id] = allSame ? null : choice;
            });

            return {
                ...prev,
                [coproId]: {
                    ...state,
                    votesByResolutionId: newVotes,
                    dateModification: new Date().toISOString(),
                    statut: 'BROUILLON',
                },
            };
        });
    }, [resolutions]);

    const clearVotes = useCallback((coproId: string) => {
        setVotesState(prev => {
            const state = prev[coproId];
            if (!state) return prev;

            return {
                ...prev,
                [coproId]: {
                    ...state,
                    votesByResolutionId: {},
                    dateModification: new Date().toISOString(),
                    statut: 'BROUILLON',
                },
            };
        });
    }, []);

    const setTantiemes = useCallback((coproId: string, value: number) => {
        setVotesState(prev => {
            const state = prev[coproId];
            if (!state) return prev;

            return {
                ...prev,
                [coproId]: {
                    ...state,
                    tantiemesVotes: Math.max(0, Math.min(value, state.tantiemesMax)),
                    dateModification: new Date().toISOString(),
                },
            };
        });
    }, []);

    const resetTantiemes = useCallback((coproId: string) => {
        setVotesState(prev => {
            const state = prev[coproId];
            if (!state) return prev;

            return {
                ...prev,
                [coproId]: {
                    ...state,
                    tantiemesVotes: state.tantiemesMax,
                    dateModification: new Date().toISOString(),
                },
            };
        });
    }, []);

    const uploadJustificatif = useCallback(async (coproId: string, file: File) => {
        // Validation du fichier
        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            throw new Error('Type de fichier non autorisé. Utilisez PDF, JPG ou PNG.');
        }

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            throw new Error('Fichier trop volumineux. Maximum 10 Mo.');
        }

        // Lire le fichier en base64 pour stockage local
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
                    const state = prev[coproId];
                    if (!state) return prev;

                    return {
                        ...prev,
                        [coproId]: {
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

    const removeJustificatif = useCallback((coproId: string) => {
        setVotesState(prev => {
            const state = prev[coproId];
            if (!state) return prev;

            return {
                ...prev,
                [coproId]: {
                    ...state,
                    justificatif: null,
                    dateModification: new Date().toISOString(),
                },
            };
        });
    }, []);

    const getValidationErrors = useCallback((coproId: string): string[] => {
        const state = votesState[coproId];
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

    const canMarkAsComplete = useCallback((coproId: string): boolean => {
        const errors = getValidationErrors(coproId);
        return errors.length === 0;
    }, [getValidationErrors]);

    const markAsComplete = useCallback((coproId: string) => {
        if (!canMarkAsComplete(coproId)) return;

        setVotesState(prev => {
            const state = prev[coproId];
            if (!state) return prev;

            return {
                ...prev,
                [coproId]: {
                    ...state,
                    statut: 'VALIDE',
                    dateModification: new Date().toISOString(),
                },
            };
        });
    }, [canMarkAsComplete]);

    const markAsDraft = useCallback((coproId: string) => {
        setVotesState(prev => {
            const state = prev[coproId];
            if (!state) return prev;

            return {
                ...prev,
                [coproId]: {
                    ...state,
                    statut: 'BROUILLON',
                    dateModification: new Date().toISOString(),
                },
            };
        });
    }, []);

    const save = useCallback(() => {
        saveVotesToStorage(agId, votesState);
    }, [agId, votesState]);

    const exportCsv = useCallback(() => {
        if (resolutions.length === 0) return;

        // En-têtes
        const headers = [
            'Copropriétaire',
            'Lot',
            'Tantièmes totaux',
            'Tantièmes votés',
            ...resolutions.map((r, i) => `Résolution ${i + 1}: ${r.titre}`),
            'Statut',
            'Justificatif',
        ];

        // Lignes de données
        const rows = MOCK_COPROPRIETAIRES.map(copro => {
            const state = votesState[copro.id];
            const votes = resolutions.map(res => {
                const choice = state?.votesByResolutionId[res.id];
                return choice ?? 'Non renseigné';
            });

            return [
                copro.nom,
                copro.lot,
                copro.tantiemes.toString(),
                (state?.tantiemesVotes ?? copro.tantiemes).toString(),
                ...votes,
                state ? (isComplete(state, resolutions.length) ? 'COMPLET' : 'INCOMPLET') : 'INCOMPLET',
                state?.justificatif ? 'Oui' : 'Non',
            ];
        });

        // Construire le CSV
        const csvContent = [
            headers.join(';'),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(';')),
        ].join('\n');

        // Télécharger
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `votes-correspondance-${agId}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [agId, votesState, resolutions]);

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
