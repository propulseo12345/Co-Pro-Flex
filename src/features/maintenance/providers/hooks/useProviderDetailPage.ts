'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    MOCK_PRESTATAIRES_SYNDIC,
    MOCK_PRESTATAIRES_COPRO,
    MOCK_PRESTATAIRES_COPROFLEX,
    MOCK_AVIS_COPROFLEX
} from '@/data/mock';
import { Prestataire, InterventionDetaille, ContratDetaille, DomaineActivite } from '@/types';
import type { Provider, LogbookOverview, ContractOverview } from '@/types/supabase';
import { useToast } from '@/providers/ToastProvider';
import { useProviders, useLogbook, useContracts as useContractsSupabase } from '@/hooks/modules/useMaintenanceData';

export function useProviderDetailPage(id: string) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showToast } = useToast();
    const { providers: supabaseProviders, updateProvider, deleteProvider } = useProviders({ autoFetch: true });
    const { entries: dbEntries, createEntry, fetchEntries } = useLogbook({ autoFetch: true });
    const { contracts: dbContracts } = useContractsSupabase({ autoFetch: true });

    const [showAddIntervention, setShowAddIntervention] = useState(false);
    const [showEditModal, setShowEditModal] = useState(searchParams.get('edit') === 'true');

    // Chercher d'abord dans les mocks, puis dans Supabase
    const allPrestataires = [...MOCK_PRESTATAIRES_SYNDIC, ...MOCK_PRESTATAIRES_COPRO, ...MOCK_PRESTATAIRES_COPROFLEX];
    const foundMock = allPrestataires.find(p => p.id === id);

    // Adapter Supabase provider au format legacy Prestataire
    const supabaseProvider = supabaseProviders.find(p => p.id === id);
    const foundSupabase = supabaseProvider ? {
        id: supabaseProvider.id!,
        nom: supabaseProvider.name || '',
        categorie: (supabaseProvider.category?.toUpperCase() || 'COPROPRIETE') as Prestataire['categorie'],
        domaines: (supabaseProvider.domains || []).map(d => d.toUpperCase()) as DomaineActivite[],
        telephone: supabaseProvider.phone || '',
        email: supabaseProvider.email || '',
        adresse: supabaseProvider.address || '',
        codePostal: supabaseProvider.postal_code || undefined,
        ville: supabaseProvider.city || undefined,
        siren: supabaseProvider.siret || undefined,
        contactReferent: supabaseProvider.contact_name || undefined,
        fonctionContact: supabaseProvider.contact_role || undefined,
        dateAjout: supabaseProvider.created_at || new Date().toISOString(),
        nombreInterventions: supabaseProvider.interventions_count || 0,
        noteMoyenne: supabaseProvider.rating_avg || undefined,
    } as Prestataire : undefined;

    const foundPrestataire = foundMock || foundSupabase;
    const [prestataire, setPrestataire] = useState<Prestataire | undefined>(foundPrestataire);

    // Mettre à jour quand les données Supabase arrivent (chargement async)
    useEffect(() => {
        if (foundPrestataire) {
            setPrestataire(foundPrestataire);
        }
    }, [foundPrestataire]);

    // Interventions depuis Supabase, filtrées par provider_id
    const prestataireInterventions = useMemo(() => {
        return dbEntries
            .filter(e => e.provider_id === id)
            .sort((a, b) => new Date(b.happened_at || '').getTime() - new Date(a.happened_at || '').getTime())
            .map(e => ({
                id: e.id || '',
                date: e.happened_at || '',
                titre: e.title || '',
                description: e.description || '',
                statut: (e.status || 'planifiee').toUpperCase() as InterventionDetaille['statut'],
                type: (e.entry_type || 'entretien').toUpperCase() as InterventionDetaille['type'],
                intervenant: e.provider_name || '',
                prestataireId: e.provider_id || '',
                coproprieteId: e.copro_id || undefined,
                contratId: e.contract_id || undefined,
                ordreServiceId: e.service_order_id || undefined,
                domaine: (e.domain || '') as string,
                cout: e.cost ?? undefined,
                montant: e.cost ?? undefined,
            }) as InterventionDetaille);
    }, [dbEntries, id]);

    // Contrats depuis Supabase, filtrés par provider_id
    const contrats = useMemo(() => {
        const STATUS_MAP: Record<string, string> = {
            draft: 'BROUILLON', active: 'ACTIF', to_renew: 'A_RENOUVELER',
            expired: 'EXPIRE', terminated: 'RESILIE', archived: 'ARCHIVE',
        };
        return dbContracts
            .filter(c => c.provider_id === id)
            .map(c => ({
                id: c.id || '',
                nom: c.title || '',
                fournisseur: c.provider_name || '',
                prestataireId: c.provider_id || '',
                type: (c.contract_type || 'autre').toUpperCase(),
                dateDebut: c.start_date || '',
                dateFin: c.end_date || '',
                coutAnnuel: c.annual_amount || 0,
                statut: STATUS_MAP[c.status || ''] || 'ACTIF',
                description: c.description || undefined,
                taciteReconduction: c.tacit_renewal ?? false,
                delaiResiliation: c.notice_months ? c.notice_months * 30 : undefined,
                estReglementaire: c.is_regulatory ?? false,
                interventionIds: [],
                pieceJointes: [],
                numeroContrat: c.contract_number || undefined,
            }) as ContratDetaille);
    }, [dbContracts, id]);

    const avis = useMemo(() =>
        prestataire?.categorie === 'COPROFLEX'
            ? MOCK_AVIS_COPROFLEX.filter(a => a.prestataireId === id)
            : [],
        [prestataire?.categorie, id]
    );

    const backLink = useMemo(() => {
        if (!prestataire) return '/maintenance/providers';
        return prestataire.categorie === 'SYNDIC'
            ? '/maintenance/providers/syndic'
            : prestataire.categorie === 'COPROFLEX'
            ? '/maintenance/providers/coproflex'
            : '/maintenance/providers/copro';
    }, [prestataire]);

    const handleDelete = async () => {
        if (!prestataire) return;
        if (confirm(`Êtes-vous sûr de vouloir supprimer le prestataire "${prestataire.nom}" ?`)) {
            try {
                await deleteProvider(id);
                showToast({ type: 'success', message: `Prestataire "${prestataire.nom}" supprimé` });
                setTimeout(() => router.push('/maintenance/providers'), 1500);
            } catch (err) {
                showToast({ type: 'error', message: `Erreur lors de la suppression du prestataire` });
            }
        }
    };

    const handleAddIntervention = async (data: Partial<InterventionDetaille>) => {
        try {
            await createEntry({
                title: data.titre || '',
                description: data.description || '',
                happened_at: data.date || new Date().toISOString(),
                status: data.statut?.toLowerCase() || 'planifiee',
                provider_id: data.prestataireId || id,
                provider_name_snapshot: prestataire?.nom || '',
                entry_type: 'entretien',
                copro_id: '',
            } as unknown as import('@/types/supabase').LogbookEntryInsert);
            showToast({ type: 'success', message: 'Intervention ajoutée avec succès' });
        } catch (err) {
            console.error('[useProviderDetailPage] Supabase createEntry error:', err);
            showToast({ type: 'error', message: 'Erreur lors de l\'ajout de l\'intervention' });
        }
    };

    const handleEditSave = async (data: Partial<Prestataire>) => {
        setPrestataire(prev => prev ? { ...prev, ...data } : prev);
        showToast({ type: 'success', message: 'Prestataire mis à jour avec succès' });

        try {
            await updateProvider(id, {
                name: data.nom,
                email: data.email,
                phone: data.telephone,
                address: data.adresse,
                postal_code: data.codePostal,
                city: data.ville,
                siret: data.siren,
                contact_name: data.contactReferent,
                contact_role: data.fonctionContact,
                domains: data.domaines?.map(d => d.toLowerCase()) as unknown as import('@/types/supabase').ProviderDomain[],
            });
        } catch (err) {
            console.error('[useProviderDetailPage] Supabase updateProvider error:', err);
        }
    };

    return {
        prestataire,
        showAddIntervention,
        setShowAddIntervention,
        showEditModal,
        setShowEditModal,
        prestataireInterventions,
        contrats,
        avis,
        backLink,
        handleDelete,
        handleAddIntervention,
        handleEditSave,
        goBack: () => router.push(backLink)
    };
}
