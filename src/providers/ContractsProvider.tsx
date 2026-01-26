'use client';

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import {
    MOCK_CONTRATS_DETAILLES,
    MOCK_CONTRAT_SYNDIC,
    MOCK_PRESTATAIRES_SYNDIC,
    MOCK_PRESTATAIRES_COPRO,
    MOCK_ASSURANCES_COPROPRIETE
} from '@/data/mock';
import type {
    ContratDetaille,
    ContratSyndic,
    StatutContrat,
    TypeContrat,
    Prestataire,
    ContratAssurance,
    TemplateResiliation
} from '@/types';

// Types pour les filtres
export interface ContractsFilters {
    searchTerm: string;
    statutFilter: StatutContrat | 'TOUS';
    typeFilter: TypeContrat | 'TOUS';
    prestataireFilter: string;
    coproprieteId?: string;
}

// Types pour les statistiques
export interface ContractsStats {
    total: number;
    actifs: number;
    aRenouveler: number;
    resilies: number;
    echeancesProchaines: ContratDetaille[];
    montantAnnuelTotal: number;
}

// Type du contexte
interface ContractsContextType {
    // Données partagées
    contrats: ContratDetaille[];
    contratSyndic: ContratSyndic;
    assurances: ContratAssurance[];
    prestataires: Prestataire[];

    // CRUD Contrats
    addContrat: (contrat: ContratDetaille) => void;
    updateContrat: (contrat: ContratDetaille) => void;
    deleteContrat: (id: string) => void;
    resilierContrat: (id: string, template?: TemplateResiliation) => void;
    getContratById: (id: string) => ContratDetaille | undefined;

    // Contrat Syndic
    updateContratSyndic: (contrat: ContratSyndic) => void;

    // Utilitaires
    getContratsFiltres: (filtres: Partial<ContractsFilters>) => ContratDetaille[];
    getContratsForCopropriete: (coproprieteId?: string) => ContratDetaille[];
    getContratsForEquipement: (equipement: string) => ContratDetaille[];
    getStats: (coproprieteId?: string) => ContractsStats;
    getUniquePrestataires: () => string[];

    // État de chargement
    isLoading: boolean;
}

const ContractsContext = createContext<ContractsContextType | undefined>(undefined);

/**
 * Provider unifié pour la gestion des contrats
 * Source unique de vérité utilisée par:
 * - Page Contrats (/maintenance/contracts)
 * - Carnet d'entretien (/maintenance/logbook)
 * - Toute autre page nécessitant des données de contrats
 */
export function ContractsProvider({ children }: { children: ReactNode }) {
    // État partagé des contrats
    const [contrats, setContrats] = useState<ContratDetaille[]>([...MOCK_CONTRATS_DETAILLES]);
    const [contratSyndic, setContratSyndic] = useState<ContratSyndic>(MOCK_CONTRAT_SYNDIC);
    const [assurances] = useState<ContratAssurance[]>([...MOCK_ASSURANCES_COPROPRIETE]);
    const [isLoading] = useState(false);

    // Prestataires combinés
    const prestataires = useMemo(() =>
        [...MOCK_PRESTATAIRES_SYNDIC, ...MOCK_PRESTATAIRES_COPRO],
        []
    );

    // Ajouter un contrat
    const addContrat = useCallback((newContrat: ContratDetaille) => {
        setContrats(prev => [newContrat, ...prev]);
    }, []);

    // Modifier un contrat
    const updateContrat = useCallback((updatedContrat: ContratDetaille) => {
        setContrats(prev => prev.map(c =>
            c.id === updatedContrat.id ? updatedContrat : c
        ));
    }, []);

    // Supprimer un contrat
    const deleteContrat = useCallback((id: string) => {
        setContrats(prev => prev.filter(c => c.id !== id));
    }, []);

    // Résilier un contrat
    const resilierContrat = useCallback((id: string, _template?: TemplateResiliation) => {
        setContrats(prev => prev.map(c =>
            c.id === id
                ? { ...c, statut: 'RESILIE' as StatutContrat }
                : c
        ));
    }, []);

    // Récupérer un contrat par ID
    const getContratById = useCallback((id: string): ContratDetaille | undefined => {
        return contrats.find(c => c.id === id);
    }, [contrats]);

    // Modifier le contrat syndic
    const updateContratSyndic = useCallback((updated: ContratSyndic) => {
        setContratSyndic(updated);
    }, []);

    // Filtrer les contrats
    const getContratsFiltres = useCallback((filtres: Partial<ContractsFilters>): ContratDetaille[] => {
        return contrats.filter(c => {
            const matchesSearch = !filtres.searchTerm ||
                c.nom.toLowerCase().includes(filtres.searchTerm.toLowerCase()) ||
                c.fournisseur.toLowerCase().includes(filtres.searchTerm.toLowerCase()) ||
                (c.numeroContrat && c.numeroContrat.toLowerCase().includes(filtres.searchTerm.toLowerCase()));

            const matchesStatut = !filtres.statutFilter || filtres.statutFilter === 'TOUS' || c.statut === filtres.statutFilter;
            const matchesType = !filtres.typeFilter || filtres.typeFilter === 'TOUS' || c.type === filtres.typeFilter;
            const matchesPrestataire = !filtres.prestataireFilter || filtres.prestataireFilter === 'TOUS' || c.fournisseur === filtres.prestataireFilter;

            return matchesSearch && matchesStatut && matchesType && matchesPrestataire;
        });
    }, [contrats]);

    // Récupérer les contrats pour une copropriété (pour le moment, tous les contrats)
    const getContratsForCopropriete = useCallback((_coproprieteId?: string): ContratDetaille[] => {
        // TODO: Filtrer par coproprieteId quand le champ sera ajouté
        return contrats;
    }, [contrats]);

    // Récupérer les contrats pour un équipement (recherche textuelle)
    const getContratsForEquipement = useCallback((equipement: string): ContratDetaille[] => {
        const keywords = equipement.toLowerCase().split(' ');
        return contrats.filter(c => {
            const contratText = `${c.nom} ${c.description || ''} ${c.type}`.toLowerCase();
            return keywords.some(keyword => contratText.includes(keyword)) ||
                (c.type === 'ASCENSEUR' && equipement.toLowerCase().includes('ascenseur')) ||
                (c.type === 'CHAUFFAGE' && equipement.toLowerCase().includes('chaudi')) ||
                (c.type === 'INTERPHONE' && equipement.toLowerCase().includes('interphone')) ||
                (c.type === 'PORTAIL' && equipement.toLowerCase().includes('portail'));
        });
    }, [contrats]);

    // Calculer les statistiques
    const getStats = useCallback((_coproprieteId?: string): ContractsStats => {
        const now = new Date();
        const dans30Jours = new Date();
        dans30Jours.setDate(dans30Jours.getDate() + 30);

        const actifs = contrats.filter(c => c.statut === 'ACTIF');
        const aRenouveler = contrats.filter(c => c.statut === 'A_RENOUVELER');
        const resilies = contrats.filter(c => c.statut === 'RESILIE');

        const echeancesProchaines = contrats.filter(c => {
            if (c.statut === 'RESILIE') return false;
            const dateFin = new Date(c.dateFin);
            return dateFin >= now && dateFin <= dans30Jours;
        });

        const montantAnnuelTotal = actifs.reduce((sum, c) => sum + (c.coutAnnuel || 0), 0);

        return {
            total: contrats.length,
            actifs: actifs.length,
            aRenouveler: aRenouveler.length,
            resilies: resilies.length,
            echeancesProchaines,
            montantAnnuelTotal,
        };
    }, [contrats]);

    // Récupérer les prestataires uniques
    const getUniquePrestataires = useCallback((): string[] => {
        const fournisseurs = new Set(contrats.map(c => c.fournisseur));
        return Array.from(fournisseurs).sort();
    }, [contrats]);

    const value: ContractsContextType = {
        // Données
        contrats,
        contratSyndic,
        assurances,
        prestataires,

        // CRUD
        addContrat,
        updateContrat,
        deleteContrat,
        resilierContrat,
        getContratById,

        // Syndic
        updateContratSyndic,

        // Utilitaires
        getContratsFiltres,
        getContratsForCopropriete,
        getContratsForEquipement,
        getStats,
        getUniquePrestataires,

        // État
        isLoading,
    };

    return (
        <ContractsContext.Provider value={value}>
            {children}
        </ContractsContext.Provider>
    );
}

/**
 * Hook pour accéder au contexte des contrats
 * Utilisé par useContracts et useLogbook
 */
export function useContractsContext() {
    const context = useContext(ContractsContext);
    if (context === undefined) {
        throw new Error('useContractsContext must be used within a ContractsProvider');
    }
    return context;
}
