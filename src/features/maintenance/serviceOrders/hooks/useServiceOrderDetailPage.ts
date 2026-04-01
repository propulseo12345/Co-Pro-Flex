'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Facture } from '@/components/features/finance/Factures/types';
import { OrdreService, PieceJointeOS, ModificationHistoriqueOS, StatutOrdreService } from '@/types';
import { useServiceOrders } from '@/hooks/modules/useMaintenanceData';
import { useCopro } from '@/providers/CoproContext';
import { uploadDocument } from '@/lib/documents/api';
import type { ServiceOrderOverview, ServiceOrderEvent, ServiceOrderStatus } from '@/types/supabase';
import { createClient } from '@/lib/supabase/client';

// ============================================================================
// Mappings Supabase ↔ Legacy
// ============================================================================

const SUPABASE_TO_LEGACY_STATUS: Record<ServiceOrderStatus, string> = {
    draft: 'BROUILLON',
    to_send: 'A_ENVOYER',
    sent: 'ENVOYE',
    accepted: 'EN_ATTENTE_PRESTATAIRE',
    refused: 'REFUSE',
    scheduled: 'INTERVENTION_PROGRAMMEE',
    in_progress: 'EN_COURS',
    completed: 'INTERVENTION_REALISEE',
    invoiced: 'FACTURE',
    paid: 'PAYE',
    closed: 'CLOTURE',
    cancelled: 'ANNULE',
};

const LEGACY_TO_SUPABASE_STATUS: Record<string, ServiceOrderStatus> = {
    BROUILLON: 'draft',
    A_ENVOYER: 'to_send',
    ENVOYE: 'sent',
    ACCEPTE: 'accepted',
    EN_ATTENTE_PRESTATAIRE: 'accepted',
    REFUSE: 'refused',
    PLANIFIE: 'scheduled',
    INTERVENTION_PROGRAMMEE: 'scheduled',
    EN_COURS: 'in_progress',
    REALISE: 'completed',
    INTERVENTION_REALISEE: 'completed',
    FACTURE: 'invoiced',
    PAYE: 'paid',
    CLOTURE: 'closed',
    ANNULE: 'cancelled',
};

// ============================================================================
// Adapter Supabase → Legacy OrdreService
// ============================================================================

function adaptOverviewToLegacy(
    overview: ServiceOrderOverview,
    events: ServiceOrderEvent[]
): OrdreService {
    const STATUS_LABELS: Record<string, string> = {
        draft: 'Brouillon', to_send: 'À envoyer', sent: 'Envoyé',
        accepted: 'Accepté', refused: 'Refusé', scheduled: 'Programmé',
        in_progress: 'En cours', completed: 'Réalisé', invoiced: 'Facturé',
        paid: 'Payé', closed: 'Clôturé', cancelled: 'Annulé',
    };

    const historique: ModificationHistoriqueOS[] = events.map(evt => {
        const fromLabel = evt.from_status ? STATUS_LABELS[evt.from_status] || evt.from_status : undefined;
        const toLabel = evt.to_status ? STATUS_LABELS[evt.to_status] || evt.to_status : undefined;
        const action = evt.comment && evt.comment !== `Statut changé vers ${evt.to_status}`
            ? evt.comment
            : `Statut changé : ${fromLabel || '?'} → ${toLabel || '?'}`;

        return {
            id: evt.id,
            date: evt.created_at,
            auteur: evt.created_by || 'Système',
            action,
            champModifie: 'statut',
            ancienneValeur: fromLabel,
            nouvelleValeur: toLabel,
        };
    });

    return {
        id: overview.id || '',
        date: overview.created_at || '',
        dateCreation: overview.created_at || '',
        dateModification: overview.created_at || '',
        titre: overview.subject || '',
        description: overview.description || '',
        typeOrdre: overview.order_type === 'contractuel' ? 'CONTRACTUEL' : 'CLASSIQUE',
        fournisseurId: overview.provider_id || undefined,
        fournisseurNom: overview.provider_name || '',
        fournisseurEmail: overview.provider_email || undefined,
        fournisseurTelephone: overview.provider_phone || undefined,
        contratId: overview.contract_id || undefined,
        contratNom: overview.contract_title || undefined,
        statut: (overview.status ? SUPABASE_TO_LEGACY_STATUS[overview.status] || overview.status : 'BROUILLON') as StatutOrdreService,
        dateEnvoi: overview.sent_at || undefined,
        dateInterventionProgrammee: overview.planned_intervention_date || undefined,
        dateInterventionRealisee: overview.completed_at || undefined,
        dateCloture: overview.closed_at || undefined,
        emailObjet: `Ordre de service — ${overview.subject || ''}`,
        emailCorps: '',
        piecesJointes: [],
        montantEstime: overview.estimated_amount || undefined,
        montantFinal: overview.actual_amount || overview.quoted_amount || undefined,
        historique,
    };
}

// ============================================================================
// Fallback localStorage (OS créés localement mais pas encore persistés)
// ============================================================================

function getLocalOrdreService(id: string): OrdreService | null {
    if (typeof window !== 'undefined') {
        const storedOS = localStorage.getItem('newOrdresService');
        if (storedOS) {
            const parsedOS = JSON.parse(storedOS) as OrdreService[];
            return parsedOS.find(os => os.id === id) || null;
        }
    }
    return null;
}

// ============================================================================
// Exports utilitaires
// ============================================================================

export function getFactureLiee(_ordreServiceId: string): Facture | undefined {
    // Factures will be fetched from Supabase in a future migration
    return undefined;
}

export function calculerEcart(montantEstime: number | undefined, montantFacture: number): { ecart: number; pourcentage: number; estAlerte: boolean } | null {
    if (!montantEstime) return null;
    const ecart = montantFacture - montantEstime;
    const pourcentage = (ecart / montantEstime) * 100;
    const estAlerte = Math.abs(pourcentage) > 10;
    return { ecart, pourcentage, estAlerte };
}

export const STATUT_FACTURE_LABELS: Record<string, string> = {
    'BROUILLON': 'Brouillon',
    'A_VALIDER': 'À valider',
    'VALIDEE': 'Validée',
    'A_PAYER': 'À payer',
    'PAYEE': 'Payée'
};

// ============================================================================
// Hook principal
// ============================================================================

export function useServiceOrderDetailPage(id: string) {
    const searchParams = useSearchParams();
    const shouldEdit = searchParams.get('edit') === 'true';
    const supabase = useMemo(() => createClient(), []);
    const { updateOrderStatus, getOrderEvents } = useServiceOrders({ autoFetch: false });
    const { currentCoproId } = useCopro();

    const [ordreService, setOrdreService] = useState<OrdreService | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMock, setIsMock] = useState(false);

    // Fetch depuis Supabase, fallback mock
    const fetchOrder = useCallback(async () => {
        setIsLoading(true);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const client = supabase as any;
            const { data: overview, error: overviewErr } = await client
                .from('v_service_orders_overview')
                .select('*')
                .eq('id', id)
                .single();

            if (overviewErr || !overview) {
                // Fallback mock
                const mock = getLocalOrdreService(id);
                setOrdreService(mock);
                setIsMock(true);
                return;
            }

            // Charger les events (historique) + documents liés
            let events: ServiceOrderEvent[] = [];
            try {
                events = await getOrderEvents(id);
            } catch {
                // Events non critiques, on continue
            }

            // Charger les documents liés à cet OS
            let documents: PieceJointeOS[] = [];
            try {
                const { data: docs } = await client
                    .from('documents')
                    .select('id, file_name, file_path, file_size, mime_type, created_at')
                    .eq('service_order_id', id)
                    .order('created_at', { ascending: false });
                if (docs) {
                    documents = docs.map((doc: { id: string; file_name: string; file_path: string; file_size: number; mime_type: string; created_at: string }) => ({
                        id: doc.id,
                        nom: doc.file_name || 'Document',
                        type: (doc.mime_type?.startsWith('image/') ? 'IMAGE' : doc.mime_type === 'application/pdf' ? 'PDF' : 'AUTRE') as 'PDF' | 'IMAGE' | 'AUTRE',
                        taille: doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} KB` : '',
                        url: doc.file_path || '',
                        dateAjout: doc.created_at || '',
                    }));
                }
            } catch {
                // Documents non critiques
            }

            setOrdreService({ ...adaptOverviewToLegacy(overview as ServiceOrderOverview, events), piecesJointes: documents });
            setIsMock(false);
        } catch {
            // Erreur réseau → fallback mock
            const mock = getLocalOrdreService(id);
            setOrdreService(mock);
            setIsMock(true);
        } finally {
            setIsLoading(false);
        }
    }, [id, supabase, getOrderEvents]);

    useEffect(() => {
        fetchOrder();
    }, [fetchOrder]);

    const [editMode, setEditMode] = useState(shouldEdit);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [editedData, setEditedData] = useState<Partial<OrdreService>>({});

    useEffect(() => {
        if (shouldEdit) {
            setEditMode(true);
        }
    }, [shouldEdit]);

    const handleSaveEdit = useCallback(() => {
        if (!ordreService) return;
        const now = new Date().toISOString();
        const updated: OrdreService = {
            ...ordreService,
            ...editedData,
            dateModification: now,
            historique: [
                ...ordreService.historique,
                {
                    id: `h-edit-${Date.now()}`,
                    date: now,
                    auteur: 'Syndic Admin',
                    action: 'Modification de l\'ordre de service',
                    champModifie: 'multiple'
                }
            ]
        };
        setOrdreService(updated);
        setEditMode(false);
        setEditedData({});
        alert('✓ Modifications enregistrées !');
    }, [ordreService, editedData]);

    const handleCancelEdit = useCallback(() => {
        setEditMode(false);
        setEditedData({});
    }, []);

    const handleStatusUpdate = useCallback(async (updatedOS: OrdreService) => {
        const supabaseStatus = LEGACY_TO_SUPABASE_STATUS[updatedOS.statut];

        if (!isMock && supabaseStatus && id) {
            // Extraire la note utilisateur depuis le dernier entry de l'historique
            const lastEntries = updatedOS.historique.slice(ordreService?.historique.length || 0);
            const userNote = lastEntries
                .map(e => e.action)
                .filter(a => a && !a.startsWith('Changement de statut') && !a.startsWith('Statut changé'))
                .join(' | ');
            const comment = userNote || `Statut changé vers ${updatedOS.statut}`;

            // Supabase-first : persister puis refetch
            try {
                await updateOrderStatus(id, supabaseStatus, {
                    comment,
                    quotedAmount: updatedOS.montantFinal ? updatedOS.montantFinal : undefined,
                });
                // Refetch pour avoir les données à jour depuis Supabase
                await fetchOrder();
                return;
            } catch (err) {
                console.error('Erreur Supabase updateOrderStatus:', err);
                // En cas d'erreur, on tombe dans le fallback local ci-dessous
            }
        }

        // Fallback local (mock ou erreur Supabase)
        setOrdreService(updatedOS);
    }, [id, isMock, updateOrderStatus, fetchOrder]);

    const handleUploadPJ = useCallback(async (fichiers: File[]) => {
        if (!ordreService || !currentCoproId) return;

        for (const file of fichiers) {
            try {
                await uploadDocument(file, currentCoproId, 'ordre_service', {
                    serviceOrderId: id,
                    title: file.name,
                    sourceModule: 'maintenance',
                });
            } catch (err) {
                console.error('[Upload PJ] Erreur:', err);
            }
        }
        // Refetch pour afficher les nouvelles PJ
        await fetchOrder();
    }, [ordreService, currentCoproId, id, fetchOrder]);

    const handleSupprimerPJ = useCallback((pj: PieceJointeOS) => {
        if (!ordreService) return;
        const currentPJ = editedData.piecesJointes ?? ordreService.piecesJointes;
        const updatedPJ = currentPJ.filter((p) => p.id !== pj.id);
        setEditedData(prev => ({ ...prev, piecesJointes: updatedPJ }));
    }, [ordreService, editedData.piecesJointes]);

    const handleDescriptionChange = useCallback((description: string) => {
        setEditedData(prev => ({ ...prev, description }));
    }, []);

    const currentData = useMemo(() => {
        if (!ordreService) return null;
        return editMode ? { ...ordreService, ...editedData } : ordreService;
    }, [ordreService, editedData, editMode]);

    const factureLiee = ordreService ? getFactureLiee(ordreService.id) : undefined;

    return {
        ordreService,
        currentData,
        editMode,
        showStatusModal,
        showEmailModal,
        factureLiee,
        isLoading,
        setEditMode,
        setShowStatusModal,
        setShowEmailModal,
        handleSaveEdit,
        handleCancelEdit,
        handleStatusUpdate,
        handleUploadPJ,
        handleSupprimerPJ,
        handleDescriptionChange,
        editedData
    };
}
