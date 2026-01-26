/**
 * Format d'Assemblée Générale
 *
 * Conformément à la réglementation française, une AG doit toujours disposer
 * d'un lieu physique de réunion. La visioconférence (loi ELAN 2018) est
 * un complément permettant la participation à distance, mais ne peut
 * se substituer au présentiel.
 *
 * Formats disponibles :
 * - Présentiel : réunion physique uniquement
 * - Mixte : réunion physique + possibilité de participation à distance
 *
 * Note: VISIO est conservé pour la rétrocompatibilité des AG existantes
 * mais n'est plus proposé à la création (mappé vers MIXTE).
 */
export enum AGFormat {
    PRESENTIEL = 'PRESENTIEL',
    /** @deprecated Utilisé uniquement pour rétrocompatibilité - mappé vers MIXTE */
    VISIO = 'VISIO',
    MIXTE = 'MIXTE',
}

/**
 * Labels pour l'affichage des formats
 */
export const AG_FORMAT_LABELS: Record<AGFormat, string> = {
    [AGFormat.PRESENTIEL]: 'Présentiel uniquement',
    [AGFormat.VISIO]: 'Mixte (présentiel + visio)', // Rétrocompat: affiché comme Mixte
    [AGFormat.MIXTE]: 'Mixte (présentiel + visio)',
};

/**
 * Descriptions des formats
 */
export const AG_FORMAT_DESCRIPTIONS: Record<AGFormat, string> = {
    [AGFormat.PRESENTIEL]: 'Les copropriétaires se réunissent exclusivement sur place. Un lieu physique est obligatoire.',
    [AGFormat.VISIO]: 'Les copropriétaires peuvent participer sur place ou à distance via visioconférence.', // Rétrocompat
    [AGFormat.MIXTE]: 'Les copropriétaires peuvent participer sur place ou à distance via visioconférence.',
};

/**
 * Provider de visioconférence détecté
 */
export type VisioProvider = 'ZOOM' | 'TEAMS' | 'MEET' | 'WEBEX' | 'AUTRE';

/**
 * Labels pour les providers de visio
 */
export const VISIO_PROVIDER_LABELS: Record<VisioProvider, string> = {
    ZOOM: 'Zoom',
    TEAMS: 'Microsoft Teams',
    MEET: 'Google Meet',
    WEBEX: 'Webex',
    AUTRE: 'Visioconférence',
};

/**
 * Détecte le provider de visio à partir d'une URL
 * @param url - URL de visioconférence
 * @returns Le provider détecté ou 'AUTRE'
 */
export function detectVisioProvider(url: string): VisioProvider {
    if (!url) return 'AUTRE';

    const urlLower = url.toLowerCase();

    if (urlLower.includes('zoom.us') || urlLower.includes('zoom.com')) {
        return 'ZOOM';
    }
    if (urlLower.includes('teams.microsoft.com') || urlLower.includes('teams.live.com')) {
        return 'TEAMS';
    }
    if (urlLower.includes('meet.google.com')) {
        return 'MEET';
    }
    if (urlLower.includes('webex.com')) {
        return 'WEBEX';
    }

    return 'AUTRE';
}

/**
 * Vérifie si le format nécessite une adresse physique.
 * Conformément à la loi, une AG doit TOUJOURS avoir un lieu physique.
 */
export function requiresAdresse(format: AGFormat): boolean {
    // Toujours true - un lieu physique est obligatoire quelle que soit la modalité
    return true;
}

/**
 * Vérifie si le format permet/nécessite un lien visio.
 * Le lien est optionnel pour le format MIXTE, requis pour rétrocompat VISIO.
 */
export function requiresVisioUrl(format: AGFormat): boolean {
    return format === AGFormat.VISIO || format === AGFormat.MIXTE;
}

/**
 * Vérifie si le lien visio est obligatoire (rétrocompat uniquement)
 */
export function isVisioUrlMandatory(format: AGFormat): boolean {
    // Seul l'ancien format VISIO rendait le lien obligatoire
    // Pour MIXTE, le lien est optionnel
    return format === AGFormat.VISIO;
}

/**
 * Migre un format obsolète vers le format actuel.
 * Utilisé pour les AG existantes créées avec l'ancien format VISIO.
 */
export function migrateFormat(format: AGFormat | string): AGFormat {
    if (format === AGFormat.VISIO || format === 'VISIO') {
        // L'ancien format "visio seule" est mappé vers MIXTE
        // car une AG doit toujours avoir un lieu physique
        return AGFormat.MIXTE;
    }
    return format as AGFormat;
}

/**
 * Obtient les instructions par défaut pour la visioconférence
 */
export function getVisioInstructions(provider: VisioProvider): string {
    switch (provider) {
        case 'ZOOM':
            return 'Cliquez sur le lien ci-dessous pour rejoindre la réunion Zoom. Vous pouvez également composer le numéro de téléphone indiqué dans l\'invitation.';
        case 'TEAMS':
            return 'Cliquez sur le lien ci-dessous pour rejoindre la réunion Microsoft Teams. Vous pouvez utiliser l\'application Teams ou rejoindre depuis votre navigateur.';
        case 'MEET':
            return 'Cliquez sur le lien ci-dessous pour rejoindre la réunion Google Meet. Un compte Google n\'est pas requis pour participer.';
        case 'WEBEX':
            return 'Cliquez sur le lien ci-dessous pour rejoindre la réunion Webex.';
        default:
            return 'Cliquez sur le lien ci-dessous pour rejoindre la réunion en visioconférence.';
    }
}
