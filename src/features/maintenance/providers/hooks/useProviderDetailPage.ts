'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    MOCK_PRESTATAIRES_SYNDIC,
    MOCK_PRESTATAIRES_COPRO,
    MOCK_PRESTATAIRES_COPROFLEX,
    MOCK_INTERVENTIONS_DETAILLEES,
    MOCK_CONTRATS_DETAILLES,
    MOCK_AVIS_COPROFLEX
} from '@/data/mock';
import { Prestataire, InterventionDetaille, DomaineActivite } from '@/types';
import type { Provider } from '@/types/supabase';
import { getInterventionsCountByPrestataire, getDerniereInterventionByPrestataire } from '@/lib/services/interventions.service';
import { useToast } from '@/providers/ToastProvider';
import { useProviders, useLogbook } from '@/hooks/modules/useMaintenanceData';

function enrichirPrestataire(p: Prestataire): Prestataire {
    const countMap = getInterventionsCountByPrestataire();
    const dateMap = getDerniereInterventionByPrestataire();
    return {
        ...p,
        nombreInterventions: countMap.get(p.id) || 0,
        derniereIntervention: dateMap.get(p.id)
    };
}

export function useProviderDetailPage(id: string) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showToast } = useToast();
    const { providers: supabaseProviders, updateProvider, deleteProvider } = useProviders({ autoFetch: true });
    const { createEntry } = useLogbook({ autoFetch: false });

    const [showAddIntervention, setShowAddIntervention] = useState(false);
    const [showEditModal, setShowEditModal] = useState(searchParams.get('edit') === 'true');
    const [interventions, setInterventions] = useState<InterventionDetaille[]>(MOCK_INTERVENTIONS_DETAILLEES);

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
    const [prestataire, setPrestataire] = useState<Prestataire | undefined>(
        foundPrestataire ? enrichirPrestataire(foundPrestataire) : undefined
    );

    // Mettre à jour quand les données Supabase arrivent (chargement async)
    useEffect(() => {
        if (!prestataire && foundPrestataire) {
            setPrestataire(enrichirPrestataire(foundPrestataire));
        }
    }, [supabaseProviders]);

    const prestataireInterventions = useMemo(() =>
        interventions
            .filter(i => i.prestataireId === id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        [interventions, id]
    );

    const contrats = useMemo(() =>
        MOCK_CONTRATS_DETAILLES.filter(c => c.prestataireId === id),
        [id]
    );

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
            } catch (err) {
                console.error('[useProviderDetailPage] Supabase deleteProvider error:', err);
            }
            showToast({ type: 'success', message: `Prestataire "${prestataire.nom}" supprimé` });
            setTimeout(() => router.push('/maintenance/providers'), 1500);
        }
    };

    const handleAddIntervention = async (data: Partial<InterventionDetaille>) => {
        setInterventions(prev => [data as InterventionDetaille, ...prev]);
        showToast({ type: 'success', message: 'Intervention ajoutée avec succès' });

        try {
            await createEntry({
                title: data.titre || '',
                description: data.description || '',
                happened_at: data.date || new Date().toISOString(),
                status: data.statut?.toLowerCase() || 'planifiee',
                provider_id: data.prestataireId || id,
                entry_type: 'entretien',
            } as unknown as import('@/types/supabase').LogbookEntryInsert);
        } catch (err) {
            console.error('[useProviderDetailPage] Supabase createEntry error:', err);
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
