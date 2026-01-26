'use client';

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { MOCK_SALES } from '@/data/mock';
import type {
  Vente,
  VenteDocument,
  VenteHistorique,
  VenteStatut,
  VenteEtapeWorkflow,
  CreateVenteData,
  UpdateVenteData,
  VentesStats,
  VentesFilters,
} from '@/types/models/vente';

// Convertir les données mock legacy vers le nouveau type
function convertMockSalesToVentes(): Vente[] {
  return MOCK_SALES.map((sale) => ({
    ...sale,
    etapeWorkflow: determineWorkflowStep(sale) as VenteEtapeWorkflow,
    documents: sale.documents.map((doc) => ({
      ...doc,
      obligatoire: ['PRE_ETAT_DATE', 'ETAT_DATE', 'CERTIFICAT_ARTICLE_20'].includes(doc.type),
    })),
  }));
}

// Déterminer l'étape du workflow basée sur les documents et dates
function determineWorkflowStep(sale: typeof MOCK_SALES[0]): VenteEtapeWorkflow {
  if (sale.dateNotificationArticle6) return 'notification';
  if (sale.dateActeAuthentique) return 'transmission';
  const hasSignedDocs = sale.documents.some((doc) => doc.statut === 'SIGNE');
  if (hasSignedDocs) return 'signature';
  if (sale.documents.length > 0) return 'generation';
  return 'creation';
}

interface VentesContextType {
  // État
  ventes: Vente[];
  isLoading: boolean;

  // CRUD
  createVente: (data: CreateVenteData) => Vente;
  updateVente: (id: string, data: UpdateVenteData) => void;
  deleteVente: (id: string) => void;
  getVenteById: (id: string) => Vente | undefined;

  // Documents
  addDocument: (venteId: string, document: Omit<VenteDocument, 'id'>) => void;
  updateDocumentStatus: (venteId: string, documentId: string, statut: VenteDocument['statut'], signePar?: string) => void;

  // Workflow
  advanceWorkflow: (venteId: string, nextStep: VenteEtapeWorkflow) => void;
  updateStatut: (venteId: string, statut: VenteStatut) => void;

  // Historique
  addHistorique: (venteId: string, action: string, utilisateur: string, details?: string) => void;
}

const VentesContext = createContext<VentesContextType | undefined>(undefined);

export function VentesProvider({ children }: { children: ReactNode }) {
  const [ventes, setVentes] = useState<Vente[]>(() => convertMockSalesToVentes());
  const [isLoading] = useState(false);

  // Créer une nouvelle vente
  const createVente = useCallback((data: CreateVenteData): Vente => {
    const now = new Date().toISOString();
    const newVente: Vente = {
      id: `vente-${Date.now()}`,
      ...data,
      statut: 'EN_COURS',
      etapeWorkflow: 'creation',
      documents: [],
      historique: [
        {
          id: `h-${Date.now()}`,
          date: now,
          action: 'Création de la vente',
          utilisateur: 'Syndic',
        },
      ],
      dateCreation: now,
      dateModification: now,
    };

    setVentes((prev) => [newVente, ...prev]);
    return newVente;
  }, []);

  // Mettre à jour une vente
  const updateVente = useCallback((id: string, data: UpdateVenteData) => {
    setVentes((prev) =>
      prev.map((vente) => {
        if (vente.id !== id) return vente;
        return {
          ...vente,
          ...data,
          dateModification: new Date().toISOString(),
        };
      })
    );
  }, []);

  // Supprimer une vente
  const deleteVente = useCallback((id: string) => {
    setVentes((prev) => prev.filter((vente) => vente.id !== id));
  }, []);

  // Récupérer une vente par ID
  const getVenteById = useCallback(
    (id: string): Vente | undefined => {
      return ventes.find((vente) => vente.id === id);
    },
    [ventes]
  );

  // Ajouter un document
  const addDocument = useCallback((venteId: string, document: Omit<VenteDocument, 'id'>) => {
    const newDoc: VenteDocument = {
      ...document,
      id: `doc-${Date.now()}`,
    };

    setVentes((prev) =>
      prev.map((vente) => {
        if (vente.id !== venteId) return vente;
        return {
          ...vente,
          documents: [...vente.documents, newDoc],
          historique: [
            ...vente.historique,
            {
              id: `h-${Date.now()}`,
              date: new Date().toISOString(),
              action: `Génération du document: ${document.nom}`,
              utilisateur: 'Système',
            },
          ],
          dateModification: new Date().toISOString(),
        };
      })
    );
  }, []);

  // Mettre à jour le statut d'un document
  const updateDocumentStatus = useCallback(
    (venteId: string, documentId: string, statut: VenteDocument['statut'], signePar?: string) => {
      setVentes((prev) =>
        prev.map((vente) => {
          if (vente.id !== venteId) return vente;
          const doc = vente.documents.find((d) => d.id === documentId);
          return {
            ...vente,
            documents: vente.documents.map((d) => {
              if (d.id !== documentId) return d;
              return {
                ...d,
                statut,
                signePar: signePar || d.signePar,
                dateSignature: statut === 'SIGNE' ? new Date().toISOString() : d.dateSignature,
                dateEnvoi: statut === 'ENVOYE' ? new Date().toISOString() : d.dateEnvoi,
              };
            }),
            historique: [
              ...vente.historique,
              {
                id: `h-${Date.now()}`,
                date: new Date().toISOString(),
                action:
                  statut === 'SIGNE'
                    ? `Signature du document: ${doc?.nom}`
                    : `Mise à jour du document: ${doc?.nom}`,
                utilisateur: signePar || 'Système',
              },
            ],
            dateModification: new Date().toISOString(),
          };
        })
      );
    },
    []
  );

  // Avancer dans le workflow
  const advanceWorkflow = useCallback((venteId: string, nextStep: VenteEtapeWorkflow) => {
    const now = new Date().toISOString();

    setVentes((prev) =>
      prev.map((vente) => {
        if (vente.id !== venteId) return vente;

        // Si on atteint 'notification', la vente est terminée
        const newStatut: VenteStatut = nextStep === 'notification' ? 'TERMINEE' : vente.statut;

        return {
          ...vente,
          etapeWorkflow: nextStep,
          statut: newStatut,
          dateNotificationArticle6: nextStep === 'notification' ? now : vente.dateNotificationArticle6,
          historique: [
            ...vente.historique,
            {
              id: `h-${Date.now()}`,
              date: now,
              action: `Progression du workflow: ${nextStep}`,
              utilisateur: 'Syndic',
            },
          ],
          dateModification: now,
        };
      })
    );
  }, []);

  // Mettre à jour le statut directement
  const updateStatut = useCallback((venteId: string, statut: VenteStatut) => {
    setVentes((prev) =>
      prev.map((vente) => {
        if (vente.id !== venteId) return vente;
        return {
          ...vente,
          statut,
          historique: [
            ...vente.historique,
            {
              id: `h-${Date.now()}`,
              date: new Date().toISOString(),
              action: `Changement de statut: ${statut}`,
              utilisateur: 'Syndic',
            },
          ],
          dateModification: new Date().toISOString(),
        };
      })
    );
  }, []);

  // Ajouter une entrée d'historique
  const addHistorique = useCallback(
    (venteId: string, action: string, utilisateur: string, details?: string) => {
      setVentes((prev) =>
        prev.map((vente) => {
          if (vente.id !== venteId) return vente;
          return {
            ...vente,
            historique: [
              ...vente.historique,
              {
                id: `h-${Date.now()}`,
                date: new Date().toISOString(),
                action,
                utilisateur,
                details,
              },
            ],
            dateModification: new Date().toISOString(),
          };
        })
      );
    },
    []
  );

  const value: VentesContextType = {
    ventes,
    isLoading,
    createVente,
    updateVente,
    deleteVente,
    getVenteById,
    addDocument,
    updateDocumentStatus,
    advanceWorkflow,
    updateStatut,
    addHistorique,
  };

  return <VentesContext.Provider value={value}>{children}</VentesContext.Provider>;
}

export function useVentesContext() {
  const context = useContext(VentesContext);
  if (context === undefined) {
    throw new Error('useVentesContext must be used within a VentesProvider');
  }
  return context;
}
