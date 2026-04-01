'use client';

/**
 * Service de gestion des contrats d'assurance
 * Centralise l'état des assurances pour synchroniser liste et détail
 *
 * Note: En production, ce sera remplacé par des appels Supabase
 */

import { ContratAssurance, DocumentAssurance } from '@/types';

// TODO: Replace with Supabase query when assurances table is created
const MOCK_ASSURANCES_COPROPRIETE: ContratAssurance[] = [];

// Interface pour les résultats d'opération
export interface ResultatOperation<T> {
  succes: boolean;
  data?: T;
  erreurs?: Record<string, string>;
  erreurGlobale?: string;
}

// État global partagé (simulant une base de données)
let assurancesState: ContratAssurance[] = [...MOCK_ASSURANCES_COPROPRIETE];

// Listeners pour notifier les changements
type Listener = () => void;
const listeners: Set<Listener> = new Set();

function notifyListeners() {
  listeners.forEach(listener => listener());
}

/**
 * Abonnement aux changements d'état
 */
export function subscribeToAssurances(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Récupérer toutes les assurances
 */
export function getAllAssurances(): ContratAssurance[] {
  return [...assurancesState];
}

/**
 * Récupérer une assurance par son ID
 */
export function getAssuranceById(id: string): ContratAssurance | undefined {
  return assurancesState.find(a => a.id === id);
}

/**
 * Validation des données d'assurance
 */
export function validerAssurance(data: Partial<ContratAssurance>): Record<string, string> {
  const erreurs: Record<string, string> = {};

  if (data.nom !== undefined && !data.nom.trim()) {
    erreurs.nom = 'Le nom est obligatoire';
  }

  if (data.assureur !== undefined && !data.assureur.trim()) {
    erreurs.assureur = 'L\'assureur est obligatoire';
  }

  if (data.numeroPolice !== undefined && !data.numeroPolice.trim()) {
    erreurs.numeroPolice = 'Le numéro de police est obligatoire';
  }

  if (data.dateDebut && data.dateFin) {
    const debut = new Date(data.dateDebut);
    const fin = new Date(data.dateFin);
    if (fin < debut) {
      erreurs.dateFin = 'La date de fin doit être postérieure à la date de début';
    }
  }

  if (data.primeAnnuelle !== undefined && data.primeAnnuelle < 0) {
    erreurs.primeAnnuelle = 'La prime annuelle ne peut pas être négative';
  }

  if (data.franchise !== undefined && data.franchise < 0) {
    erreurs.franchise = 'La franchise ne peut pas être négative';
  }

  return erreurs;
}

/**
 * Ajouter une nouvelle assurance
 */
export function addAssurance(assurance: ContratAssurance): ResultatOperation<ContratAssurance> {
  // Validation
  const erreurs = validerAssurance(assurance);
  if (Object.keys(erreurs).length > 0) {
    return { succes: false, erreurs };
  }

  assurancesState = [assurance, ...assurancesState];
  notifyListeners();

  return { succes: true, data: assurance };
}

/**
 * Mettre à jour une assurance existante
 */
export function updateAssurance(
  id: string,
  updates: Partial<ContratAssurance>
): ResultatOperation<ContratAssurance> {
  const assurance = assurancesState.find(a => a.id === id);
  if (!assurance) {
    return { succes: false, erreurGlobale: 'Assurance non trouvée' };
  }

  // Validation des modifications
  const dataToValidate = { ...assurance, ...updates };
  const erreurs = validerAssurance(dataToValidate);
  if (Object.keys(erreurs).length > 0) {
    return { succes: false, erreurs };
  }

  // Mise à jour
  const updatedAssurance: ContratAssurance = {
    ...assurance,
    ...updates,
  };

  assurancesState = assurancesState.map(a =>
    a.id === id ? updatedAssurance : a
  );
  notifyListeners();

  return { succes: true, data: updatedAssurance };
}

/**
 * Supprimer une assurance
 */
export function deleteAssurance(id: string): ResultatOperation<void> {
  const exists = assurancesState.some(a => a.id === id);
  if (!exists) {
    return { succes: false, erreurGlobale: 'Assurance non trouvée' };
  }

  assurancesState = assurancesState.filter(a => a.id !== id);
  notifyListeners();

  return { succes: true };
}

/**
 * Ajouter un document à une assurance
 */
export function addDocumentToAssurance(
  assuranceId: string,
  document: DocumentAssurance
): ResultatOperation<ContratAssurance> {
  const assurance = assurancesState.find(a => a.id === assuranceId);
  if (!assurance) {
    return { succes: false, erreurGlobale: 'Assurance non trouvée' };
  }

  const updatedAssurance: ContratAssurance = {
    ...assurance,
    documents: [...(assurance.documents || []), document],
  };

  assurancesState = assurancesState.map(a =>
    a.id === assuranceId ? updatedAssurance : a
  );
  notifyListeners();

  return { succes: true, data: updatedAssurance };
}

/**
 * Supprimer un document d'une assurance
 */
export function removeDocumentFromAssurance(
  assuranceId: string,
  documentId: string
): ResultatOperation<ContratAssurance> {
  const assurance = assurancesState.find(a => a.id === assuranceId);
  if (!assurance) {
    return { succes: false, erreurGlobale: 'Assurance non trouvée' };
  }

  const updatedAssurance: ContratAssurance = {
    ...assurance,
    documents: (assurance.documents || []).filter(d => d.id !== documentId),
  };

  assurancesState = assurancesState.map(a =>
    a.id === assuranceId ? updatedAssurance : a
  );
  notifyListeners();

  return { succes: true, data: updatedAssurance };
}

/**
 * Ajouter/Retirer une garantie
 */
export function toggleGarantie(
  assuranceId: string,
  garantie: string
): ResultatOperation<ContratAssurance> {
  const assurance = assurancesState.find(a => a.id === assuranceId);
  if (!assurance) {
    return { succes: false, erreurGlobale: 'Assurance non trouvée' };
  }

  const garanties = assurance.garanties || [];
  const updatedGaranties = garanties.includes(garantie)
    ? garanties.filter(g => g !== garantie)
    : [...garanties, garantie];

  return updateAssurance(assuranceId, { garanties: updatedGaranties });
}

/**
 * Réinitialiser l'état (utile pour les tests)
 */
export function resetAssurancesState(): void {
  assurancesState = [...MOCK_ASSURANCES_COPROPRIETE];
  notifyListeners();
}

/**
 * Obtenir les statistiques des assurances
 */
export function getAssurancesStats() {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const assurances = getAllAssurances();

  return {
    total: assurances.length,
    actives: assurances.filter(a => new Date(a.dateFin) >= now).length,
    expirees: assurances.filter(a => new Date(a.dateFin) < now).length,
    expireSoon: assurances.filter(a => {
      const dateFin = new Date(a.dateFin);
      return dateFin >= now && dateFin <= thirtyDaysFromNow;
    }).length,
    primeAnnuelleTotale: assurances.reduce((sum, a) => sum + (a.primeAnnuelle || 0), 0),
  };
}
