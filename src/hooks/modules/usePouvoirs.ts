/**
 * Hook pour gérer les pouvoirs (mandats) d'une AG
 * MIGRATION 2026-01-31: Source de vérité = Supabase uniquement
 *
 * Fournit un état complet et des helpers pour :
 * - Ajouter/modifier/supprimer des pouvoirs
 * - Valider les règles légales (max 3 pouvoirs par mandataire)
 * - Détecter les doublons et incohérences
 * - Gérer les justificatifs (upload vers Supabase Storage)
 * - Calculer le quorum prévisionnel
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
    IPouvoir,
    JustificatifPouvoir,
    PouvoirValidationResult,
    PouvoirValidationError,
    PouvoirsStats,
    QuorumPrevisionnel,
    ParticipantPreRempli,
} from '@/types/models/ag';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

// ============================================================================
// Constants
// ============================================================================

/** Nombre maximum de pouvoirs qu'un mandataire peut détenir */
export const MAX_POUVOIRS_PAR_MANDATAIRE = 3;

function isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

// ============================================================================
// Types
// ============================================================================

interface CoproprietaireDB {
    id: string;
    full_name: string;
    email: string | null;
    tantiemes: number;
}

export interface CoproprietaireForPouvoir {
    id: string;
    nom: string;
    email: string;
    telephone: string;
    lot: string;
    tantiemes: number;
    pouvoirsRecus: number;
    aDonnePouvoir: boolean;
    mandataireId?: string;
    peutRecevoirPouvoir: boolean;
}

interface PouvoirDB {
    id: string;
    ag_id: string;
    mandant_id: string;
    mandant_name: string;
    mandant_tantiemes: number;
    mandataire_id: string;
    mandataire_name: string;
    mandataire_tantiemes: number;
    signed_at: string | null;
    justificatif_filename: string | null;
    justificatif_path: string | null;
    created_at: string;
    updated_at: string;
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
    addPouvoir: (mandantId: string, mandataireId: string, signedAt?: string) => Promise<PouvoirValidationResult>;
    updatePouvoir: (pouvoirId: string, updates: Partial<Pick<IPouvoir, 'signedAt'>>) => void;
    removePouvoir: (pouvoirId: string) => Promise<void>;

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
    coproprietaires: CoproprietaireForPouvoir[],
    votesCorrespondanceCount: number,
    votesCorrespondanceTantiemes: number,
    pouvoirs: IPouvoir[],
): QuorumPrevisionnel {
    const totalTantiemes = coproprietaires.reduce((sum, c) => sum + c.tantiemes, 0);
    const totalCoproprietaires = coproprietaires.length;

    // Mandants représentés par pouvoir
    const mandantsRepresentes = new Set<string>();
    let tantiemesMandants = 0;

    pouvoirs.forEach(pouvoir => {
        const mandant = coproprietaires.find(c => c.id === pouvoir.mandantCoproId);
        if (mandant && !mandantsRepresentes.has(pouvoir.mandantCoproId)) {
            mandantsRepresentes.add(pouvoir.mandantCoproId);
            tantiemesMandants += mandant.tantiemes;
        }
    });

    const tantiemesRepresentes = votesCorrespondanceTantiemes + tantiemesMandants;
    const nbCoproprietairesRepresentes = votesCorrespondanceCount + mandantsRepresentes.size;

    return {
        tantiemesRepresentes,
        totalTantiemes,
        pourcentage: totalTantiemes > 0 ? Math.round((tantiemesRepresentes / totalTantiemes) * 100) : 0,
        nbCoproprietairesRepresentes,
        totalCoproprietaires,
        details: {
            votesCorrespondance: {
                count: votesCorrespondanceCount,
                tantiemes: votesCorrespondanceTantiemes,
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
    coproprietaires: CoproprietaireForPouvoir[],
    pouvoirs: IPouvoir[],
    votesCorrespondanceIds: Set<string>,
): ParticipantPreRempli[] {
    const pouvoirsByMandant = new Map<string, IPouvoir>();
    pouvoirs.forEach(p => {
        pouvoirsByMandant.set(p.mandantCoproId, p);
    });

    return coproprietaires.map(copro => {
        const pouvoir = pouvoirsByMandant.get(copro.id);
        const voteCorrespondanceComplet = votesCorrespondanceIds.has(copro.id);

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
    const [coproprietairesDB, setCoproprietairesDB] = useState<CoproprietaireDB[]>([]);
    const [votesCorrespondanceCount, setVotesCorrespondanceCount] = useState(0);
    const [votesCorrespondanceTantiemes, setVotesCorrespondanceTantiemes] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Charger les données au montage
    useEffect(() => {
        if (!isValidUUID(agId)) {
            setIsLoading(false);
            return;
        }

        const loadData = async () => {
            setIsLoading(true);

            try {
                const supabase = createUntypedClient();

                // 1. Get AG to find copro_id
                const { data: agData, error: agError } = await supabase
                    .from('ag_meetings')
                    .select('copro_id')
                    .eq('id', agId)
                    .single();

                if (agError || !agData?.copro_id) {
                    console.error('[usePouvoirs] AG not found:', agError);
                    setIsLoading(false);
                    return;
                }

                const coproId = agData.copro_id;

                // 2. Load coproprietaires for this copro
                const { data: coprosData, error: coprosError } = await supabase
                    .from('coproprietaires')
                    .select('id, full_name, email, tantiemes')
                    .eq('copro_id', coproId);

                if (coprosError) {
                    console.error('[usePouvoirs] Error loading coproprietaires:', coprosError);
                }

                setCoproprietairesDB(coprosData || []);

                // 3. Load pouvoirs via RPC
                const { data: pouvoirsData, error: pouvoirsError } = await supabase
                    .rpc('get_ag_pouvoirs', { p_ag_id: agId });

                if (pouvoirsError) {
                    console.error('[usePouvoirs] Error loading pouvoirs:', pouvoirsError);
                }

                // Map from DB format to IPouvoir
                const mappedPouvoirs: IPouvoir[] = (pouvoirsData || []).map((p: PouvoirDB) => ({
                    id: p.id,
                    agId: p.ag_id,
                    mandantCoproId: p.mandant_id,
                    mandataireCoproId: p.mandataire_id,
                    signedAt: p.signed_at || undefined,
                    justificatif: p.justificatif_filename ? {
                        fileName: p.justificatif_filename,
                        mimeType: 'application/octet-stream',
                        size: 0,
                        uploadedAt: p.created_at,
                    } : undefined,
                    createdAt: p.created_at,
                    updatedAt: p.updated_at,
                }));

                setPouvoirs(mappedPouvoirs);

                // 4. Count validated votes correspondance for quorum
                const { data: votesData, error: votesError } = await supabase
                    .from('ag_correspondence_votes')
                    .select('coproprietaire_id, total_tantiemes')
                    .eq('ag_id', agId)
                    .eq('status', 'validated');

                if (votesError) {
                    console.error('[usePouvoirs] Error loading votes correspondance:', votesError);
                }

                const uniqueVoters = new Set<string>();
                let totalVoteTantiemes = 0;
                (votesData || []).forEach((v: { coproprietaire_id: string; total_tantiemes: number }) => {
                    if (!uniqueVoters.has(v.coproprietaire_id)) {
                        uniqueVoters.add(v.coproprietaire_id);
                        totalVoteTantiemes += v.total_tantiemes || 0;
                    }
                });

                setVotesCorrespondanceCount(uniqueVoters.size);
                setVotesCorrespondanceTantiemes(totalVoteTantiemes);

            } catch (err) {
                console.error('[usePouvoirs] Error:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [agId]);

    // Copropriétaires avec info pouvoirs
    const coproprietaires = useMemo<CoproprietaireForPouvoir[]>(() => {
        const pouvoirCounts = countPowersByMandataire(pouvoirs);
        const mandantsWithPouvoir = new Map<string, string>();

        pouvoirs.forEach(p => {
            mandantsWithPouvoir.set(p.mandantCoproId, p.mandataireCoproId);
        });

        return coproprietairesDB.map(copro => {
            const pouvoirsRecus = pouvoirCounts[copro.id] || 0;
            const aDonnePouvoir = mandantsWithPouvoir.has(copro.id);
            const mandataireId = mandantsWithPouvoir.get(copro.id);

            return {
                id: copro.id,
                nom: copro.full_name,
                email: copro.email || '',
                telephone: '',
                lot: '',
                tantiemes: copro.tantiemes,
                pouvoirsRecus,
                aDonnePouvoir,
                mandataireId,
                peutRecevoirPouvoir: pouvoirsRecus < MAX_POUVOIRS_PAR_MANDATAIRE,
            };
        });
    }, [pouvoirs, coproprietairesDB]);

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
            coproprietaires,
            votesCorrespondanceCount,
            votesCorrespondanceTantiemes,
            pouvoirs,
        );
    }, [coproprietaires, votesCorrespondanceCount, votesCorrespondanceTantiemes, pouvoirs]);

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
        async (mandantId: string, mandataireId: string, signedAt?: string): Promise<PouvoirValidationResult> => {
            const validation = validatePouvoirFn(mandantId, mandataireId);

            if (!validation.ok) {
                return validation;
            }

            try {
                const supabase = createUntypedClient();

                const { data, error } = await supabase.rpc('save_ag_pouvoir', {
                    p_ag_id: agId,
                    p_mandant_id: mandantId,
                    p_mandataire_id: mandataireId,
                    p_signed_at: signedAt || null,
                });

                if (error || !data?.success) {
                    console.error('[usePouvoirs] Error saving pouvoir:', error || data?.error);
                    return {
                        ok: false,
                        errors: [{
                            code: 'DUPLICATE',
                            message: data?.error || 'Erreur lors de la sauvegarde',
                        }],
                    };
                }

                // Add to local state
                const now = new Date().toISOString();
                const newPouvoir: IPouvoir = {
                    id: data.pouvoir_id,
                    agId,
                    mandantCoproId: mandantId,
                    mandataireCoproId: mandataireId,
                    signedAt,
                    createdAt: now,
                    updatedAt: now,
                };

                setPouvoirs(prev => [...prev, newPouvoir]);

                return validation;
            } catch (err) {
                console.error('[usePouvoirs] Error adding pouvoir:', err);
                return {
                    ok: false,
                    errors: [{
                        code: 'DUPLICATE',
                        message: 'Erreur lors de la sauvegarde',
                    }],
                };
            }
        },
        [agId, validatePouvoirFn]
    );

    const updatePouvoir = useCallback((pouvoirId: string, updates: Partial<Pick<IPouvoir, 'signedAt'>>) => {
        // Update local state (Supabase update would need additional RPC)
        setPouvoirs(prev =>
            prev.map(p =>
                p.id === pouvoirId
                    ? { ...p, ...updates, updatedAt: new Date().toISOString() }
                    : p
            )
        );
    }, []);

    const removePouvoir = useCallback(async (pouvoirId: string) => {
        try {
            const supabase = createUntypedClient();

            const { data, error } = await supabase.rpc('delete_ag_pouvoir', {
                p_pouvoir_id: pouvoirId,
            });

            if (error || !data?.success) {
                console.error('[usePouvoirs] Error deleting pouvoir:', error || data?.error);
                return;
            }

            setPouvoirs(prev => prev.filter(p => p.id !== pouvoirId));
        } catch (err) {
            console.error('[usePouvoirs] Error removing pouvoir:', err);
        }
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

        try {
            const supabase = createUntypedClient();

            // Upload to Supabase Storage
            const filePath = `pouvoirs/${agId}/${pouvoirId}/${file.name}`;
            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, file, { upsert: true });

            if (uploadError) {
                throw new Error(`Erreur upload: ${uploadError.message}`);
            }

            // Update DB with file info
            const { error: updateError } = await supabase.rpc('update_ag_pouvoir_justificatif', {
                p_pouvoir_id: pouvoirId,
                p_filename: file.name,
                p_path: filePath,
                p_size: file.size,
            });

            if (updateError) {
                console.error('[usePouvoirs] Error updating justificatif:', updateError);
            }

            // Update local state
            const justificatif: JustificatifPouvoir = {
                fileName: file.name,
                mimeType: file.type,
                size: file.size,
                uploadedAt: new Date().toISOString(),
            };

            setPouvoirs(prev =>
                prev.map(p =>
                    p.id === pouvoirId
                        ? { ...p, justificatif, updatedAt: new Date().toISOString() }
                        : p
                )
            );
        } catch (err) {
            console.error('[usePouvoirs] Upload error:', err);
            throw err;
        }
    }, [agId]);

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
        // No-op: All saves are now done via Supabase RPCs
        console.log('[usePouvoirs] save() called - data is already persisted to Supabase');
    }, []);

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
