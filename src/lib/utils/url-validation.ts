/**
 * Utilitaires de validation d'URL
 *
 * Fonctions pures pour valider les URLs, notamment les liens de visioconférence
 */

export interface UrlValidationResult {
    isValid: boolean;
    error?: string;
}

/**
 * Valide qu'une URL est bien formée et utilise HTTPS
 *
 * @param url - L'URL à valider
 * @returns Résultat de validation avec message d'erreur si invalide
 */
export function validateHttpsUrl(url: string): UrlValidationResult {
    // Vérifier si l'URL est vide
    if (!url || !url.trim()) {
        return {
            isValid: false,
            error: 'L\'URL est requise',
        };
    }

    const trimmedUrl = url.trim();

    // Vérifier si l'URL commence par https://
    if (!trimmedUrl.toLowerCase().startsWith('https://')) {
        return {
            isValid: false,
            error: 'L\'URL doit commencer par https://',
        };
    }

    // Vérifier si l'URL est bien formée
    try {
        const parsedUrl = new URL(trimmedUrl);

        // Vérifier le protocole
        if (parsedUrl.protocol !== 'https:') {
            return {
                isValid: false,
                error: 'L\'URL doit utiliser le protocole HTTPS sécurisé',
            };
        }

        // Vérifier qu'il y a un hostname
        if (!parsedUrl.hostname) {
            return {
                isValid: false,
                error: 'L\'URL doit contenir un nom de domaine valide',
            };
        }

        return { isValid: true };
    } catch {
        return {
            isValid: false,
            error: 'L\'URL n\'est pas valide',
        };
    }
}

/**
 * Valide spécifiquement une URL de visioconférence
 *
 * @param url - L'URL de visio à valider
 * @returns Résultat de validation
 */
export function validateVisioUrl(url: string): UrlValidationResult {
    const baseValidation = validateHttpsUrl(url);

    if (!baseValidation.isValid) {
        return baseValidation;
    }

    // Liste des domaines de visio connus (pour information, pas blocant)
    const knownVisDomains = [
        'zoom.us',
        'zoom.com',
        'teams.microsoft.com',
        'teams.live.com',
        'meet.google.com',
        'webex.com',
        'whereby.com',
        'jitsi.org',
        'meet.jit.si',
    ];

    try {
        const parsedUrl = new URL(url.trim());
        const hostname = parsedUrl.hostname.toLowerCase();

        // Vérifier si c'est un domaine de visio connu (optionnel, juste pour info)
        const isKnownProvider = knownVisDomains.some(domain =>
            hostname.includes(domain)
        );

        // On ne bloque pas les domaines inconnus, mais on pourrait logger
        return {
            isValid: true,
        };
    } catch {
        return {
            isValid: false,
            error: 'L\'URL de visioconférence n\'est pas valide',
        };
    }
}

/**
 * Nettoie et normalise une URL
 *
 * @param url - L'URL à nettoyer
 * @returns URL nettoyée
 */
export function sanitizeUrl(url: string): string {
    if (!url) return '';

    let cleaned = url.trim();

    // Ajouter https:// si manquant et que l'URL commence par un domaine
    if (cleaned && !cleaned.match(/^https?:\/\//i)) {
        // Si ça ressemble à une URL sans protocole
        if (cleaned.match(/^[\w-]+\./)) {
            cleaned = 'https://' + cleaned;
        }
    }

    return cleaned;
}
