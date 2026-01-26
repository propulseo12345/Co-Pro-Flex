/**
 * Hook pour gérer les pouvoirs (mandats) d'une AG
 *
 * Fournit un état complet et des helpers pour :
 * - Ajouter/modifier/supprimer des pouvoirs
 * - Valider les règles légales (max 3 pouvoirs par mandataire)
 * - Détecter les doublons et incohérences
 * - Gérer les justificatifs
 * - Calculer le quorum prévisionnel
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { MOCK_COPROPRIETAIRES, type Coproprietaire } from '@/data/mock';
import type {
    IPouvoir,
    JustificatifPouvoir,
    PouvoirValidationResult,
    PouvoirValidationError,
    PouvoirsStats,
    QuorumPrevisionnel,
    ParticipantPreRempli,
} from '@/types/models/ag';
import type { VoteCorrespondanceState } from './useVotesCorrespondance';

// ============================================================================
// Constants
// ============================================================================

/** Nombre maximum de pouvoirs qu'un mandataire peut détenir */
export const MAX_POUVOIRS_PAR_MANDATAIRE = 3;

const STORAGE_KEY_PREFIX = 'ag-pouvoirs-';
const VOTES_STORAGE_KEY_PREFIX = 'ag-votes-correspondance-';

// ============================================================================
// Types
// ============================================================================

export interface CoproprietaireForPouvoir extends Coproprietaire {
    /** Nombre de pouvoirs reçus (en tant que mandataire) */
    pouvoirsRecus: number;
    /** A donné son pouvoir (en tant que mandant) */
    aDonnePouvoir: boolean;
    /** ID du mandataire si a donné pouvoir */
    mandataireId?: string;
    /** Peut encore recevoir des pouvoirs */
    peutRecevoirPouvoir: boolean;
}

export interface UsePouvoirsOptions {
    agId: string;
}

export interface UsePouvoirsReturn {
    // Données
    pouvoirs: IPouvoir[];
    coproprietaires: CoproprietaireForPouvoir[];
    stats: PouvoirsStats;
    quorumPrevisionnel: QuorumPrevisionnel;
    isLoading: boolean;

    // Actions CRUD
    addPouvoir: (mandantId: string, mandataireId: string, signedAt?: string) => PouvoirValidationResult;
    updatePouvoir: (pouvoirId: string, updates: Partial<Pick<IPouvoir, 'signedAt'>>) => void;
    removePouvoir: (pouvoirId: string) => void;

    // Actions sur les justificatifs
    uploadJustificatif: (pouvoirId: string, file: File) => Promise<void>;
    removeJustificatif: (pouvoirId: string) => void;

    // Validation
    validatePouvoir: (mandantId: string, mandataireId: string, excludePouvoirId?: string) => PouvoirValidationResult;
    canAddPouvoir: (mandantId: string, mandataireId: string) => boolean;

    // Helpers
    getPouvoirsByMandataire: (mandataireId: string) => IPouvoir[];
    getMandataireForMandant: (mandantId: string) => string | null;
    countPouvoirsByMandataire: () => Record<string, number>;

    // Sauvegarde
    save: () => void;
}

// ============================================================================
// Helpers
// ============================================================================

function getStorageKey(agId: string): string {
    return `${STORAGE_KEY_PREFIX}${agId}`;
}

function getVotesStorageKey(agId: string): string {
    return `${VOTES_STORAGE_KEY_PREFIX}${agId}`;
}

function loadPouvoirsFromStorage(agId: string): IPouvoir[] {
    if (typeof window === 'undefined') return [];

    try {
        const stored = localStorage.getItem(getStorageKey(agId));
        if (stored) {
            return JSON.parse(stored);
        }
    } catch {
        // Silently fail, return empty
    }
    return [];
}

function savePouvoirsToStorage(agId: string, pouvoirs: IPouvoir[]): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(getStorageKey(agId), JSON.stringify(pouvoirs));
    } catch {
        // Silently fail
    }
}

function loadVotesCorrespondanceFromStorage(agId: string): Record<string, VoteCorrespondanceState> {
    if (typeof window === 'undefined') return {};

    try {
        const stored = localStorage.getItem(getVotesStorageKey(agId));
        if (stored) {
            return JSON.parse(stored);
        }
    } catch {
        // Silently fail
    }
    return {};
}

function generateId(): string {
    return `pouvoir-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Compte le nombre de pouvoirs par mandataire
 */
export function countPowersByMandataire(pouvoirs: IPouvoir[]): Record<string, number> {
    const counts: Record<string, number> = {};
    pouvoirs.forEach(p => {
        counts[p.mandataireCoproId] = (counts[p.mandataireCoproId] || 0) + 1;
    });
    return counts;
}

/**
 * Valide un pouvoir selon les règles métier
 */
export function validatePouvoir(
    mandantId: string,
    mandataireId: string,
    existingPouvoirs: IPouvoir[],
    excludePouvoirId?: string
): PouvoirValidationResult {
    const errors: PouvoirValidationError[] = [];
    const pouvoirsToCheck = excludePouvoirId
        ? existingPouvoirs.filter(p => p.id !== excludePouvoirId)
        : existingPouvoirs;

    // Règle 1: Mandant et mandataire ne peuvent pas être la même personne
    if (mandantId === mandataireId) {
        errors.push({
            code: 'SAME_PERSON',
            message: 'Le mandant et le mandataire ne peuvent pas être la même personne',
        });
    }

    // Règle 2: Un mandant ne peut donner qu'un seul pouvoir
    const existingMandant = pouvoirsToCheck.find(p => p.mandantCoproId === mandantId);
    if (existingMandant) {
        errors.push({
            code: 'MANDANT_ALREADY_GAVE',
            message: 'Ce copropriétaire a déjà donné son pouvoir',
        });
    }

    // Règle 3: Un mandataire ne peut pas détenir plus de 3 pouvoirs
    const mandataireCount = pouvoirsToCheck.filter(p => p.mandataireCoproId === mandataireId).length;
    if (mandataireCount >= MAX_POUVOIRS_PAR_MANDATAIRE) {
        errors.push({
            code: 'MANDATAIRE_LIMIT_EXCEEDED',
            message: `Ce mandataire a déjà ${MAX_POUVOIRS_PAR_MANDATAIRE} pouvoirs (limite légale)`,
        });
    }

    // Règle 4: Pas de doublon exact
    const duplicate = pouvoirsToCheck.find(
        p => p.mandantCoproId === mandantId && p.mandataireCoproId === mandataireId
    );
    if (duplicate) {
        errors.push({
            code: 'DUPLICATE',
            message: 'Ce pouvoir existe déjà',
        });
    }

    return {
        ok: errors.length === 0,
        errors,
    };
}

/**
 * Calcule le quorum prévisionnel
 */
export function computeQuorumPrevisionnel(
    coproprietaires: Coproprietaire[],
    votesCorrespondance: Record<string, VoteCorrespondanceState>,
    pouvoirs: IPouvoir[],
    resolutionsCount: number
): QuorumPrevisionnel {
    const totalTantiemes = coproprietaires.reduce((sum, c) => sum + c.tantiemes, 0);
    const totalCoproprietaires = coproprietaires.length;

    // Copropriétaires avec votes par correspondance complets
    const coproWithCompleteVotes = new Set<string>();
    let tantiemesVotesCorrespondance = 0;

    Object.entries(votesCorrespondance).forEach(([coproId, state]) => {
        const votesCount = Object.values(state.votesByResolutionId).filter(v => v !== null).length;
        const isComplete = resolutionsCount > 0 && votesCount === resolutionsCount;

        if (isComplete && state.tantiemesVotes > 0) {
            coproWithCompleteVotes.add(coproId);
            tantiemesVotesCorrespondance += state.tantiemesVotes;
        }
    });

    // Mandants représentés par pouvoir
    const mandantsRepresentes = new Set<string>();
    let tantiemesMandants = 0;

    pouvoirs.forEach(pouvoir => {
        // Ne pas compter les mandants qui ont déjà voté par correspondance
        if (!coproWithCompleteVotes.has(pouvoir.mandantCoproId)) {
            const mandant = coproprietaires.find(c => c.id === pouvoir.mandantCoproId);
            if (mandant && !mandantsRepresentes.has(pouvoir.mandantCoproId)) {
                mandantsRepresentes.add(pouvoir.mandantCoproId);
                tantiemesMandants += mandant.tantiemes;
            }
        }
    });

    const tantiemesRepresentes = tantiemesVotesCorrespondance + tantiemesMandants;
    const nbCoproprietairesRepresentes = coproWithCompleteVotes.size + mandantsRepresentes.size;

    return {
        tantiemesRepresentes,
        totalTantiemes,
        pourcentage: totalTantiemes > 0 ? Math.round((tantiemesRepresentes / totalTantiemes) * 100) : 0,
        nbCoproprietairesRepresentes,
        totalCoproprietaires,
        details: {
            votesCorrespondance: {
                count: coproWithCompleteVotes.size,
                tantiemes: tantiemesVotesCorrespondance,
            },
            mandantsRepresentes: {
                count: mandantsRepresentes.size,
                tantiemes: tantiemesMandants,
            },
        },
    };
}

/**
 * Construit la liste des participants pré-remplie pour la feuille de présence
 */
export function buildAttendanceList(
    coproprietaires: Coproprietaire[],
    pouvoirs: IPouvoir[],
    votesCorrespondance: Record<string, VoteCorrespondanceState>,
    resolutionsCount: number
): ParticipantPreRempli[] {
    const pouvoirsByMandant = new Map<string, IPouvoir>();
    pouvoirs.forEach(p => {
        pouvoirsByMandant.set(p.mandantCoproId, p);
    });

    return coproprietaires.map(copro => {
        const voteState = votesCorrespondance[copro.id];
        const pouvoir = pouvoirsByMandant.get(copro.id);

        // Déterminer si vote correspondance complet
        let voteCorrespondanceComplet = false;
        if (voteState) {
            const votesCount = Object.values(voteState.votesByResolutionId).filter(v => v !== null).length;
            voteCorrespondanceComplet = resolutionsCount > 0 && votesCount === resolutionsCount;
        }

        // Déterminer le mode de participation
        let modeParticipation: 'VOTE_CORRESPONDANCE' | 'REPRESENTE' | 'NON_DETERMINE' = 'NON_DETERMINE';
        let mandataireId: string | undefined;
        let mandataireNom: string | undefined;

        if (voteCorrespondanceComplet) {
            modeParticipation = 'VOTE_CORRESPONDANCE';
        } else if (pouvoir) {
            modeParticipation = 'REPRESENTE';
            mandataireId = pouvoir.mandataireCoproId;
            const mandataire = coproprietaires.find(c => c.id === pouvoir.mandataireCoproId);
            mandataireNom = mandataire?.nom;
        }

        return {
            coproprietaireId: copro.id,
            nom: copro.nom,
            lot: copro.lot,
            tantiemes: copro.tantiemes,
            modeParticipation,
            mandataireId,
            mandataireNom,
            voteCorrespondanceComplet,
        };
    });
}

// ============================================================================
// Hook
// ============================================================================

export function usePouvoirs({ agId }: UsePouvoirsOptions): UsePouvoirsReturn {
    const [pouvoirs, setPouvoirs] = useState<IPouvoir[]>([]);
    const [votesCorrespondance, setVotesCorrespondance] = useState<Record<string, VoteCorrespondanceState>>({});
    const [resolutionsCount, setResolutionsCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Charger les données au montage
    useEffect(() => {
        if (typeof window === 'undefined') return;

        setIsLoading(true);

        // Charger les pouvoirs
        const loadedPouvoirs = loadPouvoirsFromStorage(agId);
        setPouvoirs(loadedPouvoirs);

        // Charger les votes correspondance pour le calcul du quorum
        const loadedVotes = loadVotesCorrespondanceFromStorage(agId);
        setVotesCorrespondance(loadedVotes);

        // Charger le nombre de résolutions
        try {
            const resolutions = localStorage.getItem(`ag-resolutions-${agId}`);
            if (resolutions) {
                const parsed = JSON.parse(resolutions);
                setResolutionsCount(Array.isArray(parsed) ? parsed.length : 0);
            }
        } catch {
            setResolutionsCount(0);
        }

        setIsLoading(false);
    }, [agId]);

    // Sauvegarder automatiquement quand les pouvoirs changent
    useEffect(() => {
        if (!isLoading) {
            savePouvoirsToStorage(agId, pouvoirs);
        }
    }, [pouvoirs, agId, isLoading]);

    // Recharger les votes correspondance périodiquement (pour synchronisation)
    useEffect(() => {
        const interval = setInterval(() => {
            const loadedVotes = loadVotesCorrespondanceFromStorage(agId);
            setVotesCorrespondance(loadedVotes);
        }, 2000);

        return () => clearInterval(interval);
    }, [agId]);

    // Copropriétaires avec info pouvoirs
    const coproprietaires = useMemo<CoproprietaireForPouvoir[]>(() => {
        const pouvoirCounts = countPowersByMandataire(pouvoirs);
        const mandantsWithPouvoir = new Map<string, string>();

        pouvoirs.forEach(p => {
            mandantsWithPouvoir.set(p.mandantCoproId, p.mandataireCoproId);
        });

        return MOCK_COPROPRIETAIRES.map(copro => {
            const pouvoirsRecus = pouvoirCounts[copro.id] || 0;
            const aDonnePouvoir = mandantsWithPouvoir.has(copro.id);
            const mandataireId = mandantsWithPouvoir.get(copro.id);

            return {
                ...copro,
                pouvoirsRecus,
                aDonnePouvoir,
                mandataireId,
                peutRecevoirPouvoir: pouvoirsRecus < MAX_POUVOIRS_PAR_MANDATAIRE,
            };
        });
    }, [pouvoirs]);

    // Statistiques
    const stats = useMemo<PouvoirsStats>(() => {
        const pouvoirCounts = countPowersByMandataire(pouvoirs);
        const mandatairesOverLimit = Object.values(pouvoirCounts).filter(
            count => count > MAX_POUVOIRS_PAR_MANDATAIRE
        ).length;

        const justificatifsManquants = pouvoirs.filter(p => !p.justificatif).length;

        // Détection d'incohérences
        let incoherences = 0;
        const mandantsSeen = new Set<string>();
        pouvoirs.forEach(p => {
            if (mandantsSeen.has(p.mandantCoproId)) {
                incoherences++;
            }
            mandantsSeen.add(p.mandantCoproId);

            if (p.mandantCoproId === p.mandataireCoproId) {
                incoherences++;
            }
        });

        return {
            totalPouvoirs: pouvoirs.length,
            mandatairesCount: Object.keys(pouvoirCounts).length,
            mandatairesOverLimit,
            incohérences: incoherences,
            justificatifsManquants,
        };
    }, [pouvoirs]);

    // Quorum prévisionnel
    const quorumPrevisionnel = useMemo<QuorumPrevisionnel>(() => {
        return computeQuorumPrevisionnel(
            MOCK_COPROPRIETAIRES,
            votesCorrespondance,
            pouvoirs,
            resolutionsCount
        );
    }, [votesCorrespondance, pouvoirs, resolutionsCount]);

    // Actions
    const validatePouvoirFn = useCallback(
        (mandantId: string, mandataireId: string, excludePouvoirId?: string): PouvoirValidationResult => {
            return validatePouvoir(mandantId, mandataireId, pouvoirs, excludePouvoirId);
        },
        [pouvoirs]
    );

    const canAddPouvoir = useCallback(
        (mandantId: string, mandataireId: string): boolean => {
            return validatePouvoirFn(mandantId, mandataireId).ok;
        },
        [validatePouvoirFn]
    );

    const addPouvoir = useCallback(
        (mandantId: string, mandataireId: string, signedAt?: string): PouvoirValidationResult => {
            const validation = validatePouvoirFn(mandantId, mandataireId);

            if (!validation.ok) {
                return validation;
            }

            const now = new Date().toISOString();
            const newPouvoir: IPouvoir = {
                id: generateId(),
                agId,
                mandantCoproId: mandantId,
                mandataireCoproId: mandataireId,
                signedAt,
                createdAt: now,
                updatedAt: now,
            };

            setPouvoirs(prev => [...prev, newPouvoir]);

            return validation;
        },
        [agId, validatePouvoirFn]
    );

    const updatePouvoir = useCallback((pouvoirId: string, updates: Partial<Pick<IPouvoir, 'signedAt'>>) => {
        setPouvoirs(prev =>
            prev.map(p =>
                p.id === pouvoirId
                    ? { ...p, ...updates, updatedAt: new Date().toISOString() }
                    : p
            )
        );
    }, []);

    const removePouvoir = useCallback((pouvoirId: string) => {
        setPouvoirs(prev => prev.filter(p => p.id !== pouvoirId));
    }, []);

    const uploadJustificatif = useCallback(async (pouvoirId: string, file: File) => {
        // Validation du fichier
        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            throw new Error('Type de fichier non autorisé. Utilisez PDF, JPG ou PNG.');
        }

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            throw new Error('Fichier trop volumineux. Maximum 10 Mo.');
        }

        return new Promise<void>((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
                const justificatif: JustificatifPouvoir = {
                    fileName: file.name,
                    mimeType: file.type,
                    size: file.size,
                    uploadedAt: new Date().toISOString(),
                    dataUrl: reader.result as string,
                };

                setPouvoirs(prev =>
                    prev.map(p =>
                        p.id === pouvoirId
                            ? { ...p, justificatif, updatedAt: new Date().toISOString() }
                            : p
                    )
                );

                resolve();
            };

            reader.onerror = () => {
                reject(new Error('Erreur lors de la lecture du fichier.'));
            };

            reader.readAsDataURL(file);
        });
    }, []);

    const removeJustificatif = useCallback((pouvoirId: string) => {
        setPouvoirs(prev =>
            prev.map(p =>
                p.id === pouvoirId
                    ? { ...p, justificatif: undefined, updatedAt: new Date().toISOString() }
                    : p
            )
        );
    }, []);

    const getPouvoirsByMandataire = useCallback(
        (mandataireId: string): IPouvoir[] => {
            return pouvoirs.filter(p => p.mandataireCoproId === mandataireId);
        },
        [pouvoirs]
    );

    const getMandataireForMandant = useCallback(
        (mandantId: string): string | null => {
            const pouvoir = pouvoirs.find(p => p.mandantCoproId === mandantId);
            return pouvoir?.mandataireCoproId ?? null;
        },
        [pouvoirs]
    );

    const countPouvoirsByMandataireFn = useCallback((): Record<string, number> => {
        return countPowersByMandataire(pouvoirs);
    }, [pouvoirs]);

    const save = useCallback(() => {
        savePouvoirsToStorage(agId, pouvoirs);
    }, [agId, pouvoirs]);

    return {
        pouvoirs,
        coproprietaires,
        stats,
        quorumPrevisionnel,
        isLoading,
        addPouvoir,
        updatePouvoir,
        removePouvoir,
        uploadJustificatif,
        removeJustificatif,
        validatePouvoir: validatePouvoirFn,
        canAddPouvoir,
        getPouvoirsByMandataire,
        getMandataireForMandant,
        countPouvoirsByMandataire: countPouvoirsByMandataireFn,
        save,
    };
}

export default usePouvoirs;
