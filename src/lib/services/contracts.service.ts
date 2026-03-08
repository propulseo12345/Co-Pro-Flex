'use client';

/**
 * Service de gestion des contrats
 * Centralise l'état des contrats pour synchroniser liste et détail
 */

import { ContratDetaille, ContratSyndic, StatutContratSyndic } from '@/types';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Seuils pour la mise à jour automatique des statuts
const SEUIL_A_RENOUVELER = 60; // Passe à "À renouveler" à J-60

// Calculer les jours restants avant échéance
function getJoursAvantEcheance(dateFin: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const echeance = new Date(dateFin);
    echeance.setHours(0, 0, 0, 0);
    const diffTime = echeance.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Mettre à jour automatiquement le statut des contrats selon leur échéance
 * Règles :
 * - EXPIRE : échéance < date du jour (joursRestants < 0)
 * - A_RENOUVELER : échéance <= J+60
 * - ACTIF : échéance > J+60
 * Les contrats RESILIE ou BROUILLON ne sont pas modifiés
 */
function updateContratStatuts(contrats: ContratDetaille[]): ContratDetaille[] {
    return contrats.map(contrat => {
        // On ne traite que les contrats actifs ou à renouveler
        // Les contrats RESILIE et BROUILLON gardent leur statut
        if (contrat.statut === 'RESILIE' || contrat.statut === 'BROUILLON') {
            return contrat;
        }

        const joursRestants = getJoursAvantEcheance(contrat.dateFin);

        // Contrat expiré (échéance dépassée)
        if (joursRestants < 0) {
            if (contrat.statut !== 'EXPIRE') {
                return {
                    ...contrat,
                    statut: 'EXPIRE' as const
                };
            }
            return contrat;
        }

        // Contrat à renouveler (échéance dans les 60 prochains jours)
        if (joursRestants <= SEUIL_A_RENOUVELER) {
            if (contrat.statut !== 'A_RENOUVELER') {
                return {
                    ...contrat,
                    statut: 'A_RENOUVELER' as const
                };
            }
            return contrat;
        }

        // Contrat actif (échéance > J+60)
        if (contrat.statut !== 'ACTIF') {
            return {
                ...contrat,
                statut: 'ACTIF' as const
            };
        }

        return contrat;
    });
}

// État global partagé - NEUTRALIZED: empty state, will be replaced by Supabase
let contratsState: ContratDetaille[] = [];
let contratSyndicState: ContratSyndic | null = null;

// Cache pour éviter les nouvelles références à chaque appel
let cachedContrats: ContratDetaille[] | null = null;
let cachedContratSyndic: ContratSyndic | null = null;
let version = 0;

// Listeners pour notifier les changements
type Listener = () => void;
const listeners: Set<Listener> = new Set();

function notifyListeners() {
    // Invalider le cache lors des changements
    cachedContrats = null;
    cachedContratSyndic = null;
    version++;
    listeners.forEach(listener => listener());
}

/**
 * Abonnement aux changements d'état
 */
export function subscribeToContracts(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/**
 * Récupérer tous les contrats avec mise à jour automatique des statuts
 * Le résultat est mis en cache pour éviter les nouvelles références à chaque appel
 */
export function getAllContrats(): ContratDetaille[] {
    if (cachedContrats === null) {
        // Appliquer la mise à jour automatique des statuts à chaque récupération
        contratsState = updateContratStatuts(contratsState);
        cachedContrats = [...contratsState];
    }
    return cachedContrats;
}

/**
 * Forcer la mise à jour des statuts de tous les contrats
 * Utile pour rafraîchir les statuts après un changement de date
 */
export function refreshContratStatuts(): void {
    contratsState = updateContratStatuts(contratsState);
    notifyListeners();
}

/**
 * Récupérer un contrat par son ID
 */
export function getContratById(id: string): ContratDetaille | undefined {
    return contratsState.find(c => c.id === id);
}

/**
 * Ajouter un nouveau contrat
 */
export function addContrat(contrat: ContratDetaille): void {
    contratsState = [contrat, ...contratsState];
    notifyListeners();
}

/**
 * Mettre à jour un contrat existant
 */
export function updateContrat(updatedContrat: ContratDetaille): void {
    contratsState = contratsState.map(c =>
        c.id === updatedContrat.id ? updatedContrat : c
    );
    notifyListeners();
}

/**
 * Supprimer un contrat
 */
export function deleteContrat(id: string): void {
    contratsState = contratsState.filter(c => c.id !== id);
    notifyListeners();
}

/**
 * Load syndic contract from Supabase for a given copro
 */
export async function loadSyndicContract(coproId: string): Promise<void> {
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('contracts')
        .select('id, contract_number, title, start_date, end_date, annual_amount, status, tacit_renewal, notice_months, notes, provider_id, providers(name, email, phone, address, city)')
        .eq('copro_id', coproId)
        .eq('contract_type', 'syndic')
        .in('status', ['active', 'terminated'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error || !data) {
        contratSyndicState = null;
        notifyListeners();
        return;
    }

    const rawProvider = data.providers as unknown;
    const provider = Array.isArray(rawProvider) ? rawProvider[0] as { name: string; email: string | null; phone: string | null; address: string | null; city: string | null } | undefined : rawProvider as { name: string; email: string | null; phone: string | null; address: string | null; city: string | null } | null;

    // Map DB status to frontend status
    let statut: StatutContratSyndic = 'ACTIF';
    if (data.status === 'terminated') {
        statut = 'RESILIE';
    } else {
        const joursRestants = getJoursAvantEcheance(data.end_date);
        if (joursRestants <= SEUIL_A_RENOUVELER) statut = 'A_RENOUVELER';
    }

    contratSyndicState = {
        id: data.id,
        nomSyndic: provider?.name || 'Syndic',
        numeroContrat: data.contract_number || '',
        dateDebut: data.start_date,
        dateFin: data.end_date,
        montantAnnuel: parseFloat(data.annual_amount) || 0,
        statut,
        description: data.notes || undefined,
        taciteReconduction: data.tacit_renewal,
        delaiResiliation: data.notice_months ? data.notice_months * 30 : undefined,
        telephone: provider?.phone || undefined,
        email: provider?.email || undefined,
        adresse: provider?.address ? `${provider.address}${provider.city ? ', ' + provider.city : ''}` : undefined,
    };
    notifyListeners();
}

/**
 * Récupérer le contrat syndic (depuis le cache mémoire)
 */
export function getContratSyndic(): ContratSyndic | null {
    if (contratSyndicState === null) {
        return null;
    }
    if (cachedContratSyndic === null) {
        cachedContratSyndic = { ...contratSyndicState };
    }
    return cachedContratSyndic;
}

/**
 * Mettre à jour le contrat syndic
 */
export function updateContratSyndic(updated: ContratSyndic): void {
    contratSyndicState = { ...updated };
    notifyListeners();
}

/**
 * Renouveler un contrat expiré
 * Crée un nouveau contrat basé sur l'ancien avec nouvelle date de fin
 */
export function renouvelerContrat(contratId: string, nouvelleDateFin: string): ContratDetaille | null {
    const contrat = contratsState.find(c => c.id === contratId);
    if (!contrat) return null;

    // Calculer la nouvelle date de début (aujourd'hui)
    const nouvelleDateDebut = new Date().toISOString().split('T')[0];

    // Mettre à jour le contrat avec les nouvelles dates et statut ACTIF
    const contratRenouvele: ContratDetaille = {
        ...contrat,
        dateDebut: nouvelleDateDebut,
        dateFin: nouvelleDateFin,
        statut: 'ACTIF',
        dateAlerte: calculateNewAlertDate(nouvelleDateFin, contrat.delaiResiliation || 60),
    };

    contratsState = contratsState.map(c =>
        c.id === contratId ? contratRenouvele : c
    );
    notifyListeners();

    return contratRenouvele;
}

/**
 * Résilier et archiver un contrat
 */
export function resilierContrat(contratId: string, raison: string, archiver: boolean): ContratDetaille | null {
    const contrat = contratsState.find(c => c.id === contratId);
    if (!contrat) return null;

    const contratResilie: ContratDetaille = {
        ...contrat,
        statut: archiver ? 'ARCHIVE' : 'RESILIE',
        conditionsParticulieres: `${contrat.conditionsParticulieres || ''}\n\n[RÉSILIATION ${new Date().toLocaleDateString('fr-FR')}] Raison: ${raison}`,
    };

    contratsState = contratsState.map(c =>
        c.id === contratId ? contratResilie : c
    );
    notifyListeners();

    return contratResilie;
}

/**
 * Calculer la date d'alerte en fonction de la date de fin et du délai de résiliation
 */
function calculateNewAlertDate(dateFin: string, delaiResiliation: number): string {
    const date = new Date(dateFin);
    date.setDate(date.getDate() - delaiResiliation);
    return date.toISOString().split('T')[0];
}

/**
 * Obtenir les jours depuis l'expiration d'un contrat
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
 * Réinitialiser l'état (utile pour les tests)
 * NEUTRALIZED: Resets to empty state
 */
export function resetContratsState(): void {
    contratsState = [];
    contratSyndicState = null;
    notifyListeners();
}
