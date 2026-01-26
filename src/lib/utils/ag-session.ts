/**
 * Utilitaires pour la gestion de la session AG
 * Gère l'intégration automatique des votes par correspondance
 */

import type { VoteData } from '@/components/features/ag/Session/types';

/**
 * Modes de participation possibles pour un copropriétaire
 */
export type ModeParticipation = 'present' | 'represente' | 'correspondance' | 'absent';

/**
 * Interface pour les présences enrichies avec mode de participation
 */
export interface PresenceData {
    coproprietaireId: string;
    mode: ModeParticipation;
    voteCorrespondanceNeutralise: boolean;
    heureArrivee?: string;
    mandataireId?: string;
}

/**
 * Interface pour les stats de participation
 */
export interface ParticipationStats {
    total: number;
    presents: number;
    representes: number;
    correspondance: number;
    absents: number;
    detail: {
        presentsCount: number;
        representesCount: number;
        correspondanceCount: number;
        absentsCount: number;
    };
}

/**
 * Identifie les copropriétaires ayant voté par correspondance
 * @param votes - Liste de tous les votes
 * @returns Set des IDs des copropriétaires ayant voté par correspondance
 */
export function getCoproprietairesAvecVoteCorrespondance(votes: VoteData[]): Set<string> {
    const coproIds = new Set<string>();

    for (const vote of votes) {
        if (vote.source === 'CORRESPONDANCE' && vote.vote !== null) {
            coproIds.add(vote.coproprietaireId);
        }
    }

    return coproIds;
}

/**
 * Intègre automatiquement les votes par correspondance dans les présences
 * @param currentPresences - Présences actuelles (Record<coproId, boolean>)
 * @param votes - Liste des votes (incluant ceux par correspondance)
 * @returns Nouvelles présences enrichies avec les modes de participation
 */
export function integrerVotesCorrespondance(
    currentPresences: Record<string, boolean>,
    votes: VoteData[]
): Record<string, PresenceData> {
    const presencesEnrichies: Record<string, PresenceData> = {};
    const coproAvecCorrespondance = getCoproprietairesAvecVoteCorrespondance(votes);

    // Initialiser avec les présences existantes
    for (const [coproId, isPresent] of Object.entries(currentPresences)) {
        const aVoteParCorrespondance = coproAvecCorrespondance.has(coproId);

        if (isPresent) {
            // Présent physiquement
            presencesEnrichies[coproId] = {
                coproprietaireId: coproId,
                mode: 'present',
                voteCorrespondanceNeutralise: aVoteParCorrespondance, // Neutraliser si avait voté par correspondance
            };
        } else if (aVoteParCorrespondance) {
            // Pas présent mais a voté par correspondance -> auto-intégré
            presencesEnrichies[coproId] = {
                coproprietaireId: coproId,
                mode: 'correspondance',
                voteCorrespondanceNeutralise: false,
            };
        } else {
            // Absent
            presencesEnrichies[coproId] = {
                coproprietaireId: coproId,
                mode: 'absent',
                voteCorrespondanceNeutralise: false,
            };
        }
    }

    return presencesEnrichies;
}

/**
 * Convertit les présences enrichies vers le format simplifié (pour compatibilité)
 * Un copropriétaire est considéré "présent" s'il est présent, représenté ou a voté par correspondance
 */
export function presencesEnrichiesVersSimple(
    presencesEnrichies: Record<string, PresenceData>
): Record<string, boolean> {
    const simple: Record<string, boolean> = {};

    for (const [coproId, data] of Object.entries(presencesEnrichies)) {
        simple[coproId] = data.mode === 'present' ||
                          data.mode === 'represente' ||
                          (data.mode === 'correspondance' && !data.voteCorrespondanceNeutralise);
    }

    return simple;
}

/**
 * Bascule un copropriétaire de "correspondance" vers "présent"
 * Règle : La présence physique prime sur le vote par correspondance
 * Le vote par correspondance est alors neutralisé
 */
export function basculerEnPresent(
    presences: Record<string, PresenceData>,
    coproId: string
): Record<string, PresenceData> {
    const current = presences[coproId];
    if (!current || current.mode !== 'correspondance') {
        return presences;
    }

    return {
        ...presences,
        [coproId]: {
            ...current,
            mode: 'present',
            voteCorrespondanceNeutralise: true,
            heureArrivee: new Date().toISOString(),
        }
    };
}

/**
 * Annule la bascule et remet en "correspondance"
 * (si erreur de manipulation)
 */
export function annulerBasculePresent(
    presences: Record<string, PresenceData>,
    coproId: string,
    votes: VoteData[]
): Record<string, PresenceData> {
    const current = presences[coproId];
    if (!current) return presences;

    // Vérifier si le copropriétaire avait bien voté par correspondance
    const coproAvecCorrespondance = getCoproprietairesAvecVoteCorrespondance(votes);
    if (!coproAvecCorrespondance.has(coproId)) {
        return presences;
    }

    return {
        ...presences,
        [coproId]: {
            ...current,
            mode: 'correspondance',
            voteCorrespondanceNeutralise: false,
            heureArrivee: undefined,
        }
    };
}

/**
 * Calcule les statistiques de participation incluant les votes par correspondance
 */
export function calculerStatsParticipation(
    presencesEnrichies: Record<string, PresenceData>,
    coproprietaires: Array<{ id: string; tantiemes: number }>
): ParticipationStats {
    let presents = 0;
    let representes = 0;
    let correspondance = 0;
    let absents = 0;

    let presentsCount = 0;
    let representesCount = 0;
    let correspondanceCount = 0;
    let absentsCount = 0;

    for (const copro of coproprietaires) {
        const presence = presencesEnrichies[copro.id];
        if (!presence) {
            absents += copro.tantiemes;
            absentsCount++;
            continue;
        }

        switch (presence.mode) {
            case 'present':
                presents += copro.tantiemes;
                presentsCount++;
                break;
            case 'represente':
                representes += copro.tantiemes;
                representesCount++;
                break;
            case 'correspondance':
                // Inclure SEULEMENT si le vote n'est pas neutralisé
                if (!presence.voteCorrespondanceNeutralise) {
                    correspondance += copro.tantiemes;
                    correspondanceCount++;
                }
                break;
            case 'absent':
            default:
                absents += copro.tantiemes;
                absentsCount++;
                break;
        }
    }

    return {
        total: presents + representes + correspondance,
        presents,
        representes,
        correspondance,
        absents,
        detail: {
            presentsCount,
            representesCount,
            correspondanceCount,
            absentsCount,
        },
    };
}

/**
 * Vérifie si un vote par correspondance doit être pris en compte
 * (non neutralisé par une présence physique)
 */
export function isVoteCorrespondanceActif(
    coproId: string,
    presencesEnrichies: Record<string, PresenceData>
): boolean {
    const presence = presencesEnrichies[coproId];
    if (!presence) return false;

    return presence.mode === 'correspondance' && !presence.voteCorrespondanceNeutralise;
}

/**
 * Formate le mode de participation pour l'affichage
 */
export function formatModeParticipation(mode: ModeParticipation): string {
    switch (mode) {
        case 'present': return 'Présent';
        case 'represente': return 'Représenté';
        case 'correspondance': return 'Correspondance';
        case 'absent': return 'Absent';
        default: return '-';
    }
}
