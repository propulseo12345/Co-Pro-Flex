'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MOCK_PRESTATAIRES_COPROFLEX, MOCK_AVIS_COPROFLEX } from '@/data/mock';
import { Prestataire, DomaineActivite } from '@/types';
import { useToast } from '../../shared/hooks/useToast';

export function useCoproFlexPage() {
    const router = useRouter();
    const { toast, showToast, hideToast } = useToast();

    const [prestataires] = useState<Prestataire[]>(MOCK_PRESTATAIRES_COPROFLEX);
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
        noteMoyenne: prestataires.reduce((acc, p) => acc + (p.noteMoyenne || 0), 0) / prestataires.length
    }), [prestataires]);

    const handleDevisSubmit = () => {
        setShowDevisModal(false);
        setSelectedIds([]);
        showToast('Demande de devis envoyée avec succès !', 'success');
    };

    const getAvisForPrestataire = (prestataireId: string) => {
        return MOCK_AVIS_COPROFLEX.filter(a => a.prestataireId === prestataireId);
    };

    const goBack = () => router.push('/maintenance/providers');
    const goToDetail = (id: string) => router.push(`/maintenance/providers/${id}`);

    return {
        toast,
        hideToast,
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
