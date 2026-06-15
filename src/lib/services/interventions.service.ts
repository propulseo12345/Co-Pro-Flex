'use client';

/**
 * Service de gestion des interventions du carnet d'entretien
 * Gère la mise à jour automatique des statuts selon les dates
 *
 * Note: En production, ce sera remplacé par des appels Supabase
 */

import { InterventionCarnet } from '@/types';

// TODO: Replace with Supabase query (useMaintenanceData / v_logbook_overview).
const MOCK_INTERVENTIONS_CARNET: InterventionCarnet[] = [];

// Types pour les alertes d'interventions
export type AlerteInterventionType =
    | 'INTERVENTION_AUJOURDHUI'      // J : intervention prévue aujourd'hui
    | 'INTERVENTION_DANS_7J'         // J-7 : intervention dans 7 jours
    | 'INTERVENTION_NON_REALISEE'    // J+1 : intervention non réalisée/clôturée
    | 'INTERVENTION_EN_RETARD';      // Planifiée avec date dépassée

export interface AlerteIntervention {
    id: string;
    type: AlerteInterventionType;
    severity: 'info' | 'warning' | 'error';
    titre: string;
    message: string;
    intervention: InterventionCarnet;
    joursDepuis: number; // Négatif = dans le futur, Positif = passé
}

// Calculer le nombre de jours entre aujourd'hui et une date
function getJoursDepuis(dateStr: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - date.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Mettre à jour automatiquement le statut des interventions selon leur date
 * Règles :
 * - PLANIFIEE + date du jour → EN_COURS (suggestion, pas automatique)
 * - PLANIFIEE + date passée → reste PLANIFIEE mais génère une alerte
 * - EN_COURS reste EN_COURS (doit être clôturé manuellement)
 * - TERMINEE reste TERMINEE
 */
function updateInterventionStatuts(interventions: InterventionCarnet[]): InterventionCarnet[] {
    // Le statut est contrôlé manuellement par l'utilisateur via la modale.
    // Pas de changement automatique PLANIFIEE → EN_COURS basé sur la date.
    return interventions;
}

/**
 * Générer les alertes pour les interventions
 */
export function getInterventionAlerts(interventions: InterventionCarnet[]): AlerteIntervention[] {
    const alerts: AlerteIntervention[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    interventions.forEach(intervention => {
        const joursDepuis = getJoursDepuis(intervention.date);

        // Intervention terminée : pas d'alerte
        if (intervention.statut === 'TERMINEE') {
            return;
        }

        // Intervention en cours depuis plus de 1 jour : alerte non clôturée
        if (intervention.statut === 'EN_COURS' && joursDepuis > 1) {
            alerts.push({
                id: `intervention-non-cloturee-${intervention.id}`,
                type: 'INTERVENTION_NON_REALISEE',
                severity: 'warning',
                titre: 'Intervention non clôturée',
                message: `"${intervention.titre}" devait être réalisée le ${formatDate(intervention.date)} (il y a ${joursDepuis} jours). Veuillez mettre à jour le statut.`,
                intervention,
                joursDepuis
            });
            return;
        }

        // Intervention planifiée avec date passée : alerte retard
        // Note: normalement le service met à jour le statut, mais au cas où
        if (intervention.statut === 'PLANIFIEE' && joursDepuis > 0) {
            alerts.push({
                id: `intervention-retard-${intervention.id}`,
                type: 'INTERVENTION_EN_RETARD',
                severity: 'error',
                titre: 'Intervention en retard',
                message: `"${intervention.titre}" était planifiée pour le ${formatDate(intervention.date)} (il y a ${joursDepuis} jours). Intervention non démarrée !`,
                intervention,
                joursDepuis
            });
            return;
        }

        // Intervention aujourd'hui
        if (joursDepuis === 0) {
            alerts.push({
                id: `intervention-aujourdhui-${intervention.id}`,
                type: 'INTERVENTION_AUJOURDHUI',
                severity: 'info',
                titre: 'Intervention programmée aujourd\'hui',
                message: `"${intervention.titre}" - ${intervention.intervenant}`,
                intervention,
                joursDepuis
            });
            return;
        }

        // Intervention dans les 7 prochains jours (joursDepuis négatif = futur)
        if (joursDepuis >= -7 && joursDepuis < 0) {
            const joursRestants = Math.abs(joursDepuis);
            alerts.push({
                id: `intervention-j-${joursRestants}-${intervention.id}`,
                type: 'INTERVENTION_DANS_7J',
                severity: 'info',
                titre: `Intervention dans ${joursRestants} jour${joursRestants > 1 ? 's' : ''}`,
                message: `"${intervention.titre}" prévue le ${formatDate(intervention.date)} - ${intervention.intervenant}`,
                intervention,
                joursDepuis
            });
        }
    });

    // Trier par urgence (retards d'abord, puis par date)
    return alerts.sort((a, b) => b.joursDepuis - a.joursDepuis);
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// État global partagé
let interventionsState: InterventionCarnet[] = updateInterventionStatuts([...MOCK_INTERVENTIONS_CARNET]);

// Cache
let cachedInterventions: InterventionCarnet[] | null = null;

// Listeners pour notifier les changements
type Listener = () => void;
const listeners: Set<Listener> = new Set();

function notifyListeners() {
    cachedInterventions = null;
    listeners.forEach(listener => listener());
}

/**
 * Abonnement aux changements d'état
 */
export function subscribeToInterventions(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/**
 * Récupérer toutes les interventions avec mise à jour automatique des statuts
 */
export function getAllInterventions(): InterventionCarnet[] {
    if (cachedInterventions === null) {
        // Appliquer la mise à jour automatique des statuts à chaque récupération
        interventionsState = updateInterventionStatuts(interventionsState);
        cachedInterventions = [...interventionsState];
    }
    return cachedInterventions;
}

/**
 * Récupérer une intervention par son ID
 */
export function getInterventionById(id: string): InterventionCarnet | undefined {
    return interventionsState.find(i => i.id === id);
}

/**
 * Ajouter une nouvelle intervention
 */
export function addIntervention(intervention: InterventionCarnet): void {
    interventionsState = [intervention, ...interventionsState];
    notifyListeners();
}

/**
 * Mettre à jour une intervention existante
 */
export function updateIntervention(updatedIntervention: InterventionCarnet): void {
    interventionsState = interventionsState.map(i =>
        i.id === updatedIntervention.id ? updatedIntervention : i
    );
    notifyListeners();
}

/**
 * Supprimer une intervention
 */
export function deleteIntervention(id: string): void {
    interventionsState = interventionsState.filter(i => i.id !== id);
    notifyListeners();
}

/**
 * Marquer une intervention comme terminée
 */
export function terminerIntervention(id: string): void {
    interventionsState = interventionsState.map(i =>
        i.id === id ? { ...i, statut: 'TERMINEE' as const } : i
    );
    notifyListeners();
}

/**
 * Forcer la mise à jour des statuts
 */
export function refreshInterventionStatuts(): void {
    interventionsState = updateInterventionStatuts(interventionsState);
    notifyListeners();
}

/**
 * Réinitialiser l'état (utile pour les tests)
 */
export function resetInterventionsState(): void {
    interventionsState = updateInterventionStatuts([...MOCK_INTERVENTIONS_CARNET]);
    notifyListeners();
}

// ========================================
// FONCTIONS DE STATISTIQUES PAR PRESTATAIRE
// ========================================

/**
 * Calculer le nombre d'interventions par prestataire à partir du carnet d'entretien
 */
export function getInterventionsCountByPrestataire(): Map<string, number> {
    const countMap = new Map<string, number>();
    const interventions = getAllInterventions();

    for (const intervention of interventions) {
        if (intervention.prestataireId) {
            const count = countMap.get(intervention.prestataireId) || 0;
            countMap.set(intervention.prestataireId, count + 1);
        }
    }

    return countMap;
}

/**
 * Calculer la dernière intervention par prestataire
 */
export function getDerniereInterventionByPrestataire(): Map<string, string> {
    const dateMap = new Map<string, string>();
    const interventions = getAllInterventions();

    for (const intervention of interventions) {
        if (intervention.prestataireId && intervention.statut === 'TERMINEE') {
            const currentDate = dateMap.get(intervention.prestataireId);
            if (!currentDate || new Date(intervention.date) > new Date(currentDate)) {
                dateMap.set(intervention.prestataireId, intervention.date);
            }
        }
    }

    return dateMap;
}

/**
 * Obtenir le nombre d'interventions d'un prestataire
 */
export function getInterventionsCountForPrestataire(prestataireId: string): number {
    const countMap = getInterventionsCountByPrestataire();
    return countMap.get(prestataireId) || 0;
}

/**
 * Obtenir la dernière intervention d'un prestataire
 */
export function getDerniereInterventionForPrestataire(prestataireId: string): string | undefined {
    const dateMap = getDerniereInterventionByPrestataire();
    return dateMap.get(prestataireId);
}

/**
 * Obtenir les interventions d'un prestataire spécifique
 */
export function getInterventionsByPrestataire(prestataireId: string): InterventionCarnet[] {
    return getAllInterventions().filter(i => i.prestataireId === prestataireId);
}

/**
 * Obtenir le total d'interventions terminées
 */
export function getTotalInterventionsTerminees(): number {
    return getAllInterventions().filter(i => i.statut === 'TERMINEE').length;
}
