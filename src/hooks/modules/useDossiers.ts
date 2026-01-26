'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  IDossier,
  DossierCategorie,
  DossierStatut,
  DossierPriorite,
  DossierFormData
} from '@/types/models/dossier';

const STORAGE_KEY = 'coproflex-dossiers';
const DEFAULT_COPRO_ID = 'copro-mock-001';

// Données mockées initiales
const MOCK_DOSSIERS: IDossier[] = [
  {
    id: 'dossier-001',
    titre: 'Préparer appels de fonds T2',
    description: 'Générer et envoyer les appels de fonds du 2ème trimestre',
    categorie: DossierCategorie.FINANCE,
    statut: DossierStatut.EN_COURS,
    priorite: DossierPriorite.HAUTE,
    deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    coproprieteId: DEFAULT_COPRO_ID,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'dossier-002',
    titre: 'Convoquer AG Ordinaire 2025',
    description: 'Préparer et envoyer les convocations pour l\'AG annuelle',
    categorie: DossierCategorie.AG,
    statut: DossierStatut.A_FAIRE,
    priorite: DossierPriorite.URGENTE,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    coproprieteId: DEFAULT_COPRO_ID,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'dossier-003',
    titre: 'Renouvellement contrat ascenseur',
    description: 'Négocier et signer le nouveau contrat de maintenance ascenseur',
    categorie: DossierCategorie.MAINTENANCE,
    statut: DossierStatut.BLOQUE,
    priorite: DossierPriorite.HAUTE,
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    coproprieteId: DEFAULT_COPRO_ID,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'dossier-004',
    titre: 'Archiver PV AG 2024',
    description: 'Scanner et archiver le procès-verbal de l\'AG 2024',
    categorie: DossierCategorie.DOCUMENTS,
    statut: DossierStatut.TERMINE,
    priorite: DossierPriorite.BASSE,
    deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    coproprieteId: DEFAULT_COPRO_ID,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'dossier-005',
    titre: 'Relancer impayés > 60 jours',
    description: 'Envoyer les mises en demeure pour les impayés de plus de 60 jours',
    categorie: DossierCategorie.FINANCE,
    statut: DossierStatut.A_FAIRE,
    priorite: DossierPriorite.NORMALE,
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    coproprieteId: DEFAULT_COPRO_ID,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'dossier-006',
    titre: 'Devis ravalement façade',
    description: 'Collecter 3 devis pour le ravalement de la façade sud',
    categorie: DossierCategorie.MAINTENANCE,
    statut: DossierStatut.EN_COURS,
    priorite: DossierPriorite.NORMALE,
    deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    coproprieteId: DEFAULT_COPRO_ID,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export interface DossiersFilters {
  categorie: DossierCategorie | 'TOUS';
  statut: DossierStatut | 'TOUS';
  search: string;
}

export interface UseDossiersOptions {
  coproprieteId?: string;
}

export function useDossiers(options: UseDossiersOptions = {}) {
  const coproprieteId = options.coproprieteId || DEFAULT_COPRO_ID;

  // États
  const [dossiers, setDossiers] = useState<IDossier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DossiersFilters>({
    categorie: 'TOUS',
    statut: 'TOUS',
    search: ''
  });

  // Chargement depuis localStorage
  useEffect(() => {
    const loadDossiers = () => {
      setIsLoading(true);
      setError(null);

      // Simulation d'un délai de chargement
      setTimeout(() => {
        try {
          if (typeof window === 'undefined') {
            setDossiers(MOCK_DOSSIERS.filter(d => d.coproprieteId === coproprieteId));
            setIsLoading(false);
            return;
          }

          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const allDossiers = JSON.parse(stored) as IDossier[];
            setDossiers(allDossiers.filter(d => d.coproprieteId === coproprieteId));
          } else {
            // Initialiser avec les données mockées
            localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_DOSSIERS));
            setDossiers(MOCK_DOSSIERS.filter(d => d.coproprieteId === coproprieteId));
          }
        } catch (e) {
          setError('Erreur lors du chargement des dossiers');
          setDossiers([]);
        } finally {
          setIsLoading(false);
        }
      }, 300);
    };

    loadDossiers();
  }, [coproprieteId]);

  // Sauvegarder dans localStorage
  const saveDossiers = useCallback((newDossiers: IDossier[]) => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const allDossiers = stored ? JSON.parse(stored) as IDossier[] : [];

      // Supprimer les dossiers de cette copropriété et ajouter les nouveaux
      const otherDossiers = allDossiers.filter(d => d.coproprieteId !== coproprieteId);
      const updatedAll = [...otherDossiers, ...newDossiers];

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAll));
    } catch (e) {
      setError('Erreur lors de la sauvegarde');
    }
  }, [coproprieteId]);

  // Dossiers filtrés et triés par deadline
  const filteredDossiers = useMemo(() => {
    let result = [...dossiers];

    // Filtre par catégorie
    if (filters.categorie !== 'TOUS') {
      result = result.filter(d => d.categorie === filters.categorie);
    }

    // Filtre par statut
    if (filters.statut !== 'TOUS') {
      result = result.filter(d => d.statut === filters.statut);
    }

    // Filtre par recherche
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(d =>
        d.titre.toLowerCase().includes(searchLower) ||
        d.description?.toLowerCase().includes(searchLower)
      );
    }

    // Tri par deadline (plus proche en premier), puis par priorité
    const prioriteOrder = {
      [DossierPriorite.URGENTE]: 0,
      [DossierPriorite.HAUTE]: 1,
      [DossierPriorite.NORMALE]: 2,
      [DossierPriorite.BASSE]: 3
    };

    result.sort((a, b) => {
      // Terminés en dernier
      if (a.statut === DossierStatut.TERMINE && b.statut !== DossierStatut.TERMINE) return 1;
      if (b.statut === DossierStatut.TERMINE && a.statut !== DossierStatut.TERMINE) return -1;

      // Par deadline
      const dateA = new Date(a.deadline).getTime();
      const dateB = new Date(b.deadline).getTime();
      if (dateA !== dateB) return dateA - dateB;

      // Par priorité
      return prioriteOrder[a.priorite] - prioriteOrder[b.priorite];
    });

    return result;
  }, [dossiers, filters]);

  // Statistiques
  const stats = useMemo(() => ({
    total: dossiers.length,
    aFaire: dossiers.filter(d => d.statut === DossierStatut.A_FAIRE).length,
    enCours: dossiers.filter(d => d.statut === DossierStatut.EN_COURS).length,
    bloques: dossiers.filter(d => d.statut === DossierStatut.BLOQUE).length,
    termines: dossiers.filter(d => d.statut === DossierStatut.TERMINE).length,
    urgents: dossiers.filter(d =>
      d.priorite === DossierPriorite.URGENTE &&
      d.statut !== DossierStatut.TERMINE
    ).length,
    enRetard: dossiers.filter(d =>
      new Date(d.deadline) < new Date() &&
      d.statut !== DossierStatut.TERMINE
    ).length
  }), [dossiers]);

  // Créer un dossier
  const createDossier = useCallback((data: DossierFormData): IDossier => {
    const now = new Date().toISOString();
    const newDossier: IDossier = {
      id: `dossier-${Date.now()}`,
      ...data,
      statut: DossierStatut.A_FAIRE,
      coproprieteId,
      createdAt: now,
      updatedAt: now
    };

    const newDossiers = [...dossiers, newDossier];
    setDossiers(newDossiers);
    saveDossiers(newDossiers);

    return newDossier;
  }, [dossiers, coproprieteId, saveDossiers]);

  // Mettre à jour un dossier
  const updateDossier = useCallback((id: string, data: Partial<IDossier>) => {
    const newDossiers = dossiers.map(d =>
      d.id === id
        ? { ...d, ...data, updatedAt: new Date().toISOString() }
        : d
    );
    setDossiers(newDossiers);
    saveDossiers(newDossiers);
  }, [dossiers, saveDossiers]);

  // Marquer comme terminé
  const markAsComplete = useCallback((id: string) => {
    updateDossier(id, { statut: DossierStatut.TERMINE });
  }, [updateDossier]);

  // Supprimer un dossier
  const deleteDossier = useCallback((id: string) => {
    const newDossiers = dossiers.filter(d => d.id !== id);
    setDossiers(newDossiers);
    saveDossiers(newDossiers);
  }, [dossiers, saveDossiers]);

  // Mettre à jour les filtres
  const updateFilters = useCallback((newFilters: Partial<DossiersFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Réinitialiser les filtres
  const resetFilters = useCallback(() => {
    setFilters({
      categorie: 'TOUS',
      statut: 'TOUS',
      search: ''
    });
  }, []);

  return {
    // Données
    dossiers: filteredDossiers,
    allDossiers: dossiers,
    stats,

    // États
    isLoading,
    error,
    filters,

    // Actions
    createDossier,
    updateDossier,
    markAsComplete,
    deleteDossier,
    updateFilters,
    resetFilters
  };
}
