/**
 * Configuration des délais légaux pour les Assemblées Générales
 * Basé sur la loi du 10 juillet 1965 et le décret du 17 mars 1967
 */

import {
    Calendar,
    Send,
    FileText,
    Clock,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Users,
    Vote,
    FileCheck,
    type LucideIcon
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type JalonType =
    | 'date_ag'
    | 'date_limite_convocation'
    | 'date_limite_questions'
    | 'date_limite_mandats'
    | 'date_limite_votes_correspondance'
    | 'date_envoi_documents'
    | 'date_limite_ordre_jour'
    | 'date_rappel'
    | 'date_pv';

export type JalonStatus = 'a_venir' | 'imminent' | 'urgent' | 'depasse' | 'complete';

export interface JalonAG {
    type: JalonType;
    label: string;
    description: string;
    date: Date;
    dateFormatted: string;
    joursRestants: number;
    status: JalonStatus;
    obligatoire: boolean;
    icon: LucideIcon;
    articleLoi?: string;
    action?: {
        label: string;
        href: string;
    };
}

export interface DelaisConfig {
    // Délais obligatoires (en jours calendaires AVANT l'AG)
    convocation_min: number;           // 21 jours minimum
    convocation_recommande: number;    // 30 jours recommandé
    documents_comptables: number;      // 21 jours
    ordre_jour_fige: number;           // 21 jours (avec convocation)
    questions_coproprietaires: number; // Jusqu'à J-6 (variable selon règlement)
    mandats_reception: number;         // Généralement J-1 ou J
    votes_correspondance: number;      // Généralement J-3

    // Délais après l'AG
    pv_redaction_max: number;          // 30 jours pour envoi du PV (recommandé)
    pv_contestation: number;           // 2 mois pour contester

    // Seuils d'alerte
    seuil_urgent: number;              // Jours restants pour passer en "urgent"
    seuil_imminent: number;            // Jours restants pour passer en "imminent"
}

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION DES DÉLAIS LÉGAUX
// ═══════════════════════════════════════════════════════════════

export const DELAIS_LEGAUX: DelaisConfig = {
    // Délais avant AG
    convocation_min: 21,              // Article 9 décret 17 mars 1967
    convocation_recommande: 30,       // Recommandation pratique
    documents_comptables: 21,         // Avec la convocation
    ordre_jour_fige: 21,              // Figé avec la convocation
    questions_coproprietaires: 6,     // J-6 minimum selon règlements types
    mandats_reception: 1,             // Veille de l'AG ou jour J
    votes_correspondance: 3,          // J-3 généralement

    // Délais après AG
    pv_redaction_max: 30,             // Recommandation (pas de délai légal strict)
    pv_contestation: 60,              // 2 mois (article 42 loi 1965)

    // Seuils d'alerte
    seuil_urgent: 3,                  // Moins de 3 jours = urgent
    seuil_imminent: 7,                // Moins de 7 jours = imminent
};

// ═══════════════════════════════════════════════════════════════
// FONCTIONS UTILITAIRES DE DATE
// ═══════════════════════════════════════════════════════════════

/**
 * Ajouter des jours à une date
 */
function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Soustraire des jours à une date
 */
function subDays(date: Date, days: number): Date {
    return addDays(date, -days);
}

/**
 * Calculer la différence en jours entre deux dates
 */
function differenceInDays(dateA: Date, dateB: Date): number {
    const diffTime = dateA.getTime() - dateB.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Formater une date en français
 */
function formatDateFr(date: Date, includeTime: boolean = false): string {
    const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    };

    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }

    return date.toLocaleDateString('fr-FR', options);
}

/**
 * Formater une date en format court (dd/MM/yyyy)
 */
function formatDateShort(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

// ═══════════════════════════════════════════════════════════════
// FONCTIONS DE CALCUL DES JALONS
// ═══════════════════════════════════════════════════════════════

/**
 * Calculer tous les jalons à partir de la date d'AG
 */
export function calculerJalonsAG(dateAG: Date, now: Date = new Date()): JalonAG[] {
    const jalons: JalonAG[] = [];

    // 1. Date limite d'envoi des convocations (J-21 minimum)
    const dateLimiteConvocation = subDays(dateAG, DELAIS_LEGAUX.convocation_min);
    jalons.push({
        type: 'date_limite_convocation',
        label: 'Date limite convocation',
        description: `Les convocations doivent être envoyées au plus tard le ${formatDateFr(dateLimiteConvocation)} (21 jours avant l'AG)`,
        date: dateLimiteConvocation,
        dateFormatted: formatDateShort(dateLimiteConvocation),
        joursRestants: differenceInDays(dateLimiteConvocation, now),
        status: getJalonStatus(dateLimiteConvocation, now),
        obligatoire: true,
        icon: Send,
        articleLoi: 'Article 9 décret du 17 mars 1967',
        action: {
            label: 'Envoyer les convocations',
            href: '/ag/{id}/convocation',
        },
    });

    // 2. Date recommandée d'envoi (J-30 pour confort)
    const dateRecommandeeConvocation = subDays(dateAG, DELAIS_LEGAUX.convocation_recommande);
    jalons.push({
        type: 'date_envoi_documents',
        label: 'Date recommandée d\'envoi',
        description: 'Date recommandée pour envoyer les convocations (30 jours avant)',
        date: dateRecommandeeConvocation,
        dateFormatted: formatDateShort(dateRecommandeeConvocation),
        joursRestants: differenceInDays(dateRecommandeeConvocation, now),
        status: getJalonStatus(dateRecommandeeConvocation, now),
        obligatoire: false,
        icon: Calendar,
    });

    // 3. Date limite pour l'ordre du jour (figé avec convocation)
    const dateLimiteODJ = subDays(dateAG, DELAIS_LEGAUX.ordre_jour_fige);
    jalons.push({
        type: 'date_limite_ordre_jour',
        label: 'Ordre du jour figé',
        description: 'L\'ordre du jour doit être définitif pour l\'envoi des convocations',
        date: dateLimiteODJ,
        dateFormatted: formatDateShort(dateLimiteODJ),
        joursRestants: differenceInDays(dateLimiteODJ, now),
        status: getJalonStatus(dateLimiteODJ, now),
        obligatoire: true,
        icon: FileText,
        action: {
            label: 'Finaliser l\'ordre du jour',
            href: '/ag/{id}/agenda',
        },
    });

    // 4. Date limite questions copropriétaires (J-6)
    const dateLimiteQuestions = subDays(dateAG, DELAIS_LEGAUX.questions_coproprietaires);
    jalons.push({
        type: 'date_limite_questions',
        label: 'Date limite questions',
        description: 'Dernier jour pour les copropriétaires pour soumettre des questions',
        date: dateLimiteQuestions,
        dateFormatted: formatDateShort(dateLimiteQuestions),
        joursRestants: differenceInDays(dateLimiteQuestions, now),
        status: getJalonStatus(dateLimiteQuestions, now),
        obligatoire: false,
        icon: Users,
    });

    // 5. Date limite votes par correspondance (J-3)
    const dateLimiteVotes = subDays(dateAG, DELAIS_LEGAUX.votes_correspondance);
    jalons.push({
        type: 'date_limite_votes_correspondance',
        label: 'Date limite votes correspondance',
        description: 'Dernier jour pour recevoir les votes par correspondance',
        date: dateLimiteVotes,
        dateFormatted: formatDateShort(dateLimiteVotes),
        joursRestants: differenceInDays(dateLimiteVotes, now),
        status: getJalonStatus(dateLimiteVotes, now),
        obligatoire: false,
        icon: Vote,
    });

    // 6. Date limite réception mandats (J-1)
    const dateLimiteMandats = subDays(dateAG, DELAIS_LEGAUX.mandats_reception);
    jalons.push({
        type: 'date_limite_mandats',
        label: 'Date limite mandats',
        description: 'Dernier jour pour recevoir les procurations',
        date: dateLimiteMandats,
        dateFormatted: formatDateShort(dateLimiteMandats),
        joursRestants: differenceInDays(dateLimiteMandats, now),
        status: getJalonStatus(dateLimiteMandats, now),
        obligatoire: false,
        icon: FileCheck,
    });

    // 7. Date de l'AG
    jalons.push({
        type: 'date_ag',
        label: 'Assemblée Générale',
        description: `AG prévue le ${formatDateFr(dateAG, true)}`,
        date: dateAG,
        dateFormatted: formatDateShort(dateAG),
        joursRestants: differenceInDays(dateAG, now),
        status: getJalonStatus(dateAG, now),
        obligatoire: true,
        icon: Calendar,
    });

    // 8. Date limite PV (J+30)
    const dateLimitePV = addDays(dateAG, DELAIS_LEGAUX.pv_redaction_max);
    jalons.push({
        type: 'date_pv',
        label: 'Date limite envoi PV',
        description: 'Le procès-verbal doit être envoyé dans un délai raisonnable (recommandé : 1 mois)',
        date: dateLimitePV,
        dateFormatted: formatDateShort(dateLimitePV),
        joursRestants: differenceInDays(dateLimitePV, now),
        status: getJalonStatus(dateLimitePV, now),
        obligatoire: false,
        icon: FileText,
        action: {
            label: 'Rédiger le PV',
            href: '/ag/{id}/pv',
        },
    });

    // Trier par date
    return jalons.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Déterminer le statut d'un jalon
 */
function getJalonStatus(dateJalon: Date, now: Date): JalonStatus {
    const joursRestants = differenceInDays(dateJalon, now);

    if (joursRestants < 0) return 'depasse';
    if (joursRestants <= DELAIS_LEGAUX.seuil_urgent) return 'urgent';
    if (joursRestants <= DELAIS_LEGAUX.seuil_imminent) return 'imminent';
    return 'a_venir';
}

/**
 * Vérifier si une date d'AG est valide (assez de temps pour convoquer)
 */
export function verifierDateAGValide(dateAG: Date, now: Date = new Date()): {
    valide: boolean;
    joursDisponibles: number;
    joursMinimum: number;
    message: string;
    niveau: 'ok' | 'warning' | 'error';
} {
    const joursDisponibles = differenceInDays(dateAG, now);
    const joursMinimum = DELAIS_LEGAUX.convocation_min;

    if (joursDisponibles < joursMinimum) {
        return {
            valide: false,
            joursDisponibles,
            joursMinimum,
            message: `Date trop proche ! Il faut minimum ${joursMinimum} jours pour convoquer légalement. Vous n'avez que ${joursDisponibles} jours.`,
            niveau: 'error',
        };
    }

    if (joursDisponibles < DELAIS_LEGAUX.convocation_recommande) {
        return {
            valide: true,
            joursDisponibles,
            joursMinimum,
            message: `Délai court. Il est recommandé de prévoir au moins ${DELAIS_LEGAUX.convocation_recommande} jours. Vous avez ${joursDisponibles} jours.`,
            niveau: 'warning',
        };
    }

    return {
        valide: true,
        joursDisponibles,
        joursMinimum,
        message: `Délai suffisant (${joursDisponibles} jours disponibles).`,
        niveau: 'ok',
    };
}

/**
 * Vérifier si l'envoi des convocations est possible
 */
export function verifierEnvoiConvocationPossible(
    dateAG: Date,
    dateEnvoiPrevue: Date = new Date()
): {
    possible: boolean;
    joursAvantAG: number;
    message: string;
    niveau: 'ok' | 'warning' | 'error' | 'blocked';
    peutForcer: boolean;
} {
    const joursAvantAG = differenceInDays(dateAG, dateEnvoiPrevue);

    if (joursAvantAG < DELAIS_LEGAUX.convocation_min) {
        return {
            possible: false,
            joursAvantAG,
            message: `ENVOI BLOQUÉ : Les convocations doivent être envoyées au minimum ${DELAIS_LEGAUX.convocation_min} jours avant l'AG. Actuellement ${joursAvantAG} jours. L'AG risque d'être annulable.`,
            niveau: 'blocked',
            peutForcer: true,
        };
    }

    if (joursAvantAG < DELAIS_LEGAUX.convocation_recommande) {
        return {
            possible: true,
            joursAvantAG,
            message: `Délai légal respecté (${joursAvantAG} jours) mais inférieur aux ${DELAIS_LEGAUX.convocation_recommande} jours recommandés.`,
            niveau: 'warning',
            peutForcer: true,
        };
    }

    return {
        possible: true,
        joursAvantAG,
        message: `Délai conforme : ${joursAvantAG} jours avant l'AG.`,
        niveau: 'ok',
        peutForcer: false,
    };
}

/**
 * Calculer la date d'AG minimum recommandée à partir d'aujourd'hui
 */
export function calculerDateAGMinimum(now: Date = new Date()): {
    minimum: Date;
    recommandee: Date;
    ideale: Date;
} {
    return {
        minimum: addDays(now, DELAIS_LEGAUX.convocation_min + 1),
        recommandee: addDays(now, DELAIS_LEGAUX.convocation_recommande + 7),
        ideale: addDays(now, 45), // 45 jours pour être confortable
    };
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTES UI
// ═══════════════════════════════════════════════════════════════

export const JALON_STATUS_CONFIG: Record<JalonStatus, {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: LucideIcon;
}> = {
    a_venir: {
        label: 'À venir',
        color: 'var(--primary)',
        bgColor: 'var(--primary-light)',
        borderColor: 'var(--primary)',
        icon: Clock,
    },
    imminent: {
        label: 'Imminent',
        color: 'var(--warning)',
        bgColor: 'var(--warning-light)',
        borderColor: 'var(--warning)',
        icon: AlertTriangle,
    },
    urgent: {
        label: 'Urgent',
        color: 'var(--danger)',
        bgColor: 'var(--danger-light)',
        borderColor: 'var(--danger)',
        icon: AlertTriangle,
    },
    depasse: {
        label: 'Dépassé',
        color: 'var(--danger)',
        bgColor: 'var(--danger-light)',
        borderColor: 'var(--danger)',
        icon: XCircle,
    },
    complete: {
        label: 'Complété',
        color: 'var(--success)',
        bgColor: 'var(--success-light)',
        borderColor: 'var(--success)',
        icon: CheckCircle,
    },
};

/**
 * Obtenir la couleur CSS pour un statut
 */
export function getStatusColorClass(status: JalonStatus): string {
    const config = JALON_STATUS_CONFIG[status];
    return config.color;
}

/**
 * Obtenir la classe de fond pour un statut
 */
export function getStatusBgClass(status: JalonStatus): string {
    const config = JALON_STATUS_CONFIG[status];
    return config.bgColor;
}
