'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MOCK_ORDRES_SERVICE } from '@/data/mock';
import { MOCK_FACTURES } from '@/components/features/finance/Factures/data';
import type { Facture } from '@/components/features/finance/Factures/types';
import { OrdreService, PieceJointeOS, StatutOrdreService } from '@/types';
import { simulateFileUpload } from '@/lib/utils/service-order';
import { useServiceOrders } from '@/hooks/modules/useMaintenanceData';
import type { ServiceOrderStatus } from '@/types/supabase';

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

function getAllOrdresService(): OrdreService[] {
    const mockOS = [...MOCK_ORDRES_SERVICE];
    if (typeof window !== 'undefined') {
        const storedOS = localStorage.getItem('newOrdresService');
        if (storedOS) {
            const parsedOS = JSON.parse(storedOS) as OrdreService[];
            return [...mockOS, ...parsedOS];
        }
    }
    return mockOS;
}

export function getFactureLiee(ordreServiceId: string): Facture | undefined {
    return MOCK_FACTURES.find(f => f.ordreServiceId === ordreServiceId);
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

export function useServiceOrderDetailPage(id: string) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const shouldEdit = searchParams.get('edit') === 'true';
    const { updateOrderStatus } = useServiceOrders({ autoFetch: false });

    const [ordreService, setOrdreService] = useState<OrdreService | null>(() => {
        const allOS = getAllOrdresService();
        return allOS.find(os => os.id === id) || null;
    });

    useEffect(() => {
        const allOS = getAllOrdresService();
        const found = allOS.find(os => os.id === id) || null;
        setOrdreService(found);
    }, [id]);

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
        setOrdreService(updatedOS);
        // Sync avec Supabase
        const supabaseStatus = LEGACY_TO_SUPABASE_STATUS[updatedOS.statut];
        if (supabaseStatus && id) {
            try {
                await updateOrderStatus(id, supabaseStatus, {
                    comment: `Statut changé vers ${updatedOS.statut}`,
                    quotedAmount: updatedOS.montantFinal ? updatedOS.montantFinal : undefined,
                });
            } catch (err) {
                console.error('Erreur sync Supabase status:', err);
            }
        }
    }, [id, updateOrderStatus]);

    const handleUploadPJ = useCallback(async (fichiers: File[]) => {
        if (!ordreService) return;
        const uploadPromises = fichiers.map((file) => simulateFileUpload(file));
        const newPJ = await Promise.all(uploadPromises);
        const updatedPJ = [...(editedData.piecesJointes ?? ordreService.piecesJointes), ...newPJ];
        setEditedData(prev => ({ ...prev, piecesJointes: updatedPJ }));
    }, [ordreService, editedData.piecesJointes]);

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
