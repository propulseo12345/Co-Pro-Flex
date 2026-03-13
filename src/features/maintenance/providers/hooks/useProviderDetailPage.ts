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
import { Prestataire, InterventionDetaille } from '@/types';
import { getInterventionsCountByPrestataire, getDerniereInterventionByPrestataire } from '@/lib/services/interventions.service';
import { useToast } from '@/providers/ToastProvider';

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

    const [showAddIntervention, setShowAddIntervention] = useState(false);
    const [showEditModal, setShowEditModal] = useState(searchParams.get('edit') === 'true');
    const [interventions, setInterventions] = useState<InterventionDetaille[]>(MOCK_INTERVENTIONS_DETAILLEES);

    const allPrestataires = [...MOCK_PRESTATAIRES_SYNDIC, ...MOCK_PRESTATAIRES_COPRO, ...MOCK_PRESTATAIRES_COPROFLEX];
    const foundPrestataire = allPrestataires.find(p => p.id === id);
    const [prestataire, setPrestataire] = useState<Prestataire | undefined>(
        foundPrestataire ? enrichirPrestataire(foundPrestataire) : undefined
    );

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

    const handleDelete = () => {
        if (!prestataire) return;
        if (confirm(`Êtes-vous sûr de vouloir supprimer le prestataire "${prestataire.nom}" ?`)) {
            showToast({ type: 'success', message: `Prestataire "${prestataire.nom}" supprimé` });
            setTimeout(() => router.push('/maintenance/providers'), 1500);
        }
    };

    const handleAddIntervention = (data: Partial<InterventionDetaille>) => {
        setInterventions(prev => [data as InterventionDetaille, ...prev]);
        showToast({ type: 'success', message: 'Intervention ajoutée avec succès' });
    };

    const handleEditSave = (data: Partial<Prestataire>) => {
        setPrestataire(prev => prev ? { ...prev, ...data } : prev);
        showToast({ type: 'success', message: 'Prestataire mis à jour avec succès' });
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
