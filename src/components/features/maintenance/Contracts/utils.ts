import { ContratDetaille } from '@/types';
import { TypeReconduction } from './types';

/**
 * Extraction des prestataires uniques depuis les contrats
 */
export function getUniquePrestataires(contrats: ContratDetaille[]): string[] {
    const prestataires = new Set<string>();
    contrats.forEach(c => prestataires.add(c.fournisseur));
    return Array.from(prestataires).sort();
}

/**
 * Formatage des dates au format français
 */
export function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR');
}

/**
 * Formatage des montants en euros
 */
export function formatMontant(montant: number): string {
    return montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

/**
 * Génération d'un ID unique pour les nouveaux contrats
 */
export function generateId(): string {
    return 'ct' + Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Calcul du nombre de jours avant échéance d'un contrat
 */
export function getJoursAvantEcheance(dateFin: string): number {
    const today = new Date();
    const echeance = new Date(dateFin);
    const diffTime = echeance.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Vérifie si un contrat est proche de l'échéance (< 90 jours)
 */
export function isContratProchEcheance(dateFin: string, seuilJours: number = 90): boolean {
    const jours = getJoursAvantEcheance(dateFin);
    return jours > 0 && jours <= seuilJours;
}

/**
 * Vérifie si l'échéance d'un contrat est urgente (< délai de résiliation)
 */
export function isEcheanceUrgente(dateFin: string, delaiResiliation: number = 60): boolean {
    const jours = getJoursAvantEcheance(dateFin);
    return jours > 0 && jours <= delaiResiliation;
}

/**
 * Calcul du nombre de jours depuis l'expiration d'un contrat
 * Retourne 0 si le contrat n'est pas encore expiré
 */
export function getJoursDepuisExpiration(dateFin: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const echeance = new Date(dateFin);
    echeance.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - echeance.getTime();
    return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
}

/**
 * Détermine le type de reconduction d'un contrat
 * - TACITE: taciteReconduction = true (renouvellement automatique)
 * - NON_RENOUVELABLE: taciteReconduction = false et delaiResiliation = 0 (fin définitive)
 * - EXPRESS: taciteReconduction = false et delaiResiliation > 0 (renouvellement sur demande)
 */
export function getTypeReconduction(contrat: ContratDetaille): TypeReconduction {
    if (contrat.taciteReconduction) {
        return 'TACITE';
    }
    if (!contrat.delaiResiliation || contrat.delaiResiliation === 0) {
        return 'NON_RENOUVELABLE';
    }
    return 'EXPRESS';
}

/**
 * Calcul de la date limite de résiliation pour un contrat à reconduction tacite
 */
export function getDateLimiteResiliation(dateFin: string, delaiResiliation: number): Date {
    const echeance = new Date(dateFin);
    echeance.setDate(echeance.getDate() - delaiResiliation);
    return echeance;
}

/**
 * Calcul du nombre de jours restants avant la date limite de résiliation
 * Retourne un nombre négatif si le délai est dépassé
 */
export function getJoursAvantDateLimiteResiliation(dateFin: string, delaiResiliation: number): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateLimite = getDateLimiteResiliation(dateFin, delaiResiliation);
    dateLimite.setHours(0, 0, 0, 0);
    const diffTime = dateLimite.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Vérifie si le délai de résiliation est dépassé pour un contrat à reconduction tacite
 */
export function isDelaiResiliationDepasse(contrat: ContratDetaille): boolean {
    if (!contrat.taciteReconduction) return false;
    const delai = contrat.delaiResiliation || 60;
    const joursRestants = getJoursAvantDateLimiteResiliation(contrat.dateFin, delai);
    return joursRestants < 0;
}

/**
 * Vérifie si le délai de résiliation approche (< 30 jours) pour un contrat à reconduction tacite
 */
export function isDelaiResiliationProche(contrat: ContratDetaille): boolean {
    if (!contrat.taciteReconduction) return false;
    const delai = contrat.delaiResiliation || 60;
    const joursRestants = getJoursAvantDateLimiteResiliation(contrat.dateFin, delai);
    return joursRestants >= 0 && joursRestants <= 30;
}

/**
 * Interface pour les informations de reconduction
 */
export interface ReconductionInfo {
    type: TypeReconduction;
    delaiResiliation: number;
    dateLimiteResiliation: Date | null;
    joursAvantDateLimite: number | null;
    delaiDepasse: boolean;
    delaiProche: boolean;
}
