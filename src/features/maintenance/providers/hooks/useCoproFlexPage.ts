'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Prestataire, DomaineActivite } from '@/types';
import { useProviders } from '@/hooks/modules/useMaintenanceData';
import { useToast } from '@/providers/ToastProvider';

export function useCoproFlexPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const { providers: supabaseProviders } = useProviders({ autoFetch: true });

    // Map Supabase coproflex providers to legacy Prestataire format
    const prestataires = useMemo<Prestataire[]>(() =>
        supabaseProviders
            .filter(p => p.category === 'coproflex')
            .map(p => ({
                id: p.id as string,
                nom: p.name as string,
                categorie: 'COPROFLEX' as const,
                domaines: ((p.domains as string[]) || []).map(d => d.toUpperCase()) as DomaineActivite[],
                telephone: (p.phone as string) || '',
                email: (p.email as string) || '',
                adresse: (p.address as string) || '',
                codePostal: (p.postal_code as string) || undefined,
                ville: (p.city as string) || undefined,
                dateAjout: (p.created_at as string) || '',
                nombreInterventions: (p.interventions_count as number) || 0,
                noteMoyenne: (p.rating_avg as number) || undefined,
                nombreAvis: (p.rating_count as number) || 0,
                labelCoproFlex: (p.coproflex_label as boolean) || false,
                description: ((p as Record<string, unknown>).description as string) || undefined,
            }) as Prestataire),
    [supabaseProviders]);

    const [searchTerm, setSearchTerm] = useState('');
    const [codePostalFilter, setCodePostalFilter] = useState('');
    const [domaineFilter, setDomaineFilter] = useState<DomaineActivite | 'TOUS'>('TOUS');
    const [sortBy, setSortBy] = useState<'note' | 'avis' | 'tarif' | 'delai'>('note');
    const [labelOnly, setLabelOnly] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showDevisModal, setShowDevisModal] = useState(false);
    const [showCompareModal, setShowCompareModal] = useState(false);

    const filteredPrestataires = useMemo(() => {
        return prestataires
            .filter(p => {
                const matchesSearch = searchTerm === '' ||
                    p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.description?.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesDomaine = domaineFilter === 'TOUS' || p.domaines.includes(domaineFilter);
                const matchesLabel = !labelOnly || p.labelCoproFlex;
                const matchesCP = !codePostalFilter ||
                    p.codePostal?.startsWith(codePostalFilter.slice(0, 2));
                return matchesSearch && matchesDomaine && matchesLabel && matchesCP;
            })
            .sort((a, b) => {
                if (sortBy === 'note') return (b.noteMoyenne || 0) - (a.noteMoyenne || 0);
                if (sortBy === 'avis') return (b.nombreAvis || 0) - (a.nombreAvis || 0);
                return 0;
            });
    }, [prestataires, searchTerm, codePostalFilter, domaineFilter, sortBy, labelOnly]);

    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : prev.length < 5 ? [...prev, id] : prev
        );
    };

    const selectedPrestataires = prestataires.filter(p => selectedIds.includes(p.id));

    const stats = useMemo(() => ({
        total: prestataires.length,
        certifies: prestataires.filter(p => p.labelCoproFlex).length,
        noteMoyenne: prestataires.length > 0
            ? prestataires.reduce((acc, p) => acc + (p.noteMoyenne || 0), 0) / prestataires.length
            : 0,
    }), [prestataires]);

    const handleDevisSubmit = () => {
        setShowDevisModal(false);
        setSelectedIds([]);
        showToast({ type: 'success', message: 'Demande de devis envoyee avec succes !' });
    };

    // CoproFlex reviews will be fetched from Supabase in a future milestone
    const getAvisForPrestataire = (_prestataireId: string) => {
        return [] as Array<{ id: string; prestataireId: string; coproprieteId: string; auteur: string; note: number; commentaire: string; dateAvis: string }>;
    };

    const goBack = () => router.push('/maintenance/providers');
    const goToDetail = (id: string) => router.push(`/maintenance/providers/${id}`);

    return {
        searchTerm,
        setSearchTerm,
        codePostalFilter,
        setCodePostalFilter,
        domaineFilter,
        setDomaineFilter,
        sortBy,
        setSortBy,
        labelOnly,
        setLabelOnly,
        selectedIds,
        selectedPrestataires,
        filteredPrestataires,
        stats,
        showDevisModal,
        setShowDevisModal,
        showCompareModal,
        setShowCompareModal,
        toggleSelection,
        clearSelection: () => setSelectedIds([]),
        handleDevisSubmit,
        getAvisForPrestataire,
        goBack,
        goToDetail
    };
}
