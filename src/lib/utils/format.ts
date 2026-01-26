/**
 * Utilitaires de formatage pour CoProFlex
 */

import { APP_CONFIG } from '@/lib/constants/app'

/**
 * Formate une durée en mois de façon intelligente
 * @param mois - Nombre de mois
 * @returns Chaîne formatée (ex: "18 mois (1 an et 6 mois)")
 */
export function formatDureeMois(mois: number): string {
    if (mois < 1) return '0 mois';

    if (mois < 12) {
        return `${mois} mois`;
    }

    const annees = Math.floor(mois / 12);
    const moisRestants = mois % 12;

    if (moisRestants === 0) {
        return `${mois} mois (${annees} an${annees > 1 ? 's' : ''})`;
    }

    return `${mois} mois (${annees} an${annees > 1 ? 's' : ''} et ${moisRestants} mois)`;
}

/**
 * Formate un montant en euros avec mention TTC optionnelle
 * @param montant - Montant en euros
 * @param showTTC - Afficher la mention TTC (défaut: true)
 * @returns Chaîne formatée (ex: "1 500,00 € TTC")
 */
export function formatMontantTTC(montant: number, showTTC: boolean = true): string {
    const formatted = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(montant);

    return showTTC ? `${formatted} TTC` : formatted;
}

/**
 * Formate un montant en euros (sans TTC)
 * @param montant - Montant en euros
 * @returns Chaîne formatée (ex: "1 500,00 €")
 */
export function formatMontant(montant: number): string {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(montant);
}

/**
 * Parse un montant depuis une chaîne (gère les formats français)
 * @param value - Chaîne à parser (ex: "1 500,00", "1500.00")
 * @returns Montant en nombre ou NaN si invalide
 */
export function parseMontant(value: string): number {
    // Supprimer les espaces et remplacer la virgule par un point
    const cleaned = value.replace(/\s/g, '').replace(',', '.');
    return parseFloat(cleaned);
}

/**
 * Valide une durée de mandat en mois
 * @param mois - Nombre de mois
 * @returns Message d'erreur ou null si valide
 */
export function validateDureeMandat(mois: number): string | null {
    if (mois < 3) return 'La durée minimum est de 3 mois';
    if (mois > 36) return 'La durée maximum est de 36 mois (3 ans)';
    return null;
}

/**
 * Formater un montant en euros avec options avancées
 * @param montant - Montant en euros
 * @param options - Options de formatage
 * @returns Chaîne formatée (ex: "1 500,00 €")
 */
export function formatMontantAvance(
    montant: number | null | undefined,
    options?: {
        showCents?: boolean
        showSign?: boolean
    }
): string {
    if (montant === null || montant === undefined) return '-'

    const { showCents = true, showSign = false } = options || {}

    const formatted = new Intl.NumberFormat(APP_CONFIG.CURRENCY_LOCALE, {
        style: 'currency',
        currency: APP_CONFIG.CURRENCY,
        minimumFractionDigits: showCents ? 2 : 0,
        maximumFractionDigits: showCents ? 2 : 0,
    }).format(Math.abs(montant))

    if (showSign && montant !== 0) {
        return montant > 0 ? `+${formatted}` : `-${formatted}`
    }

    return montant < 0 ? `-${formatted}` : formatted
}

/**
 * Formater un pourcentage
 * @param value - Valeur en pourcentage (ex: 75 pour 75%)
 * @param decimals - Nombre de décimales (défaut: 0)
 * @returns Chaîne formatée (ex: "75 %")
 */
export function formatPourcentage(value: number | null | undefined, decimals: number = 0): string {
    if (value === null || value === undefined) return '-'

    return new Intl.NumberFormat(APP_CONFIG.LOCALE, {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value / 100)
}

/**
 * Formater un nombre avec séparateur de milliers français
 * @param value - Nombre à formater
 * @returns Chaîne formatée (ex: "1 500")
 */
export function formatNumber(value: number | null | undefined): string {
    if (value === null || value === undefined) return '-'

    return new Intl.NumberFormat(APP_CONFIG.LOCALE).format(value)
}
