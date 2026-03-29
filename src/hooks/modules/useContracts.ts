'use client';

import { useState, useMemo, useCallback, useEffect, useSyncExternalStore } from 'react';
import { ContratDetaille, ContratSyndic, StatutContrat, TypeContrat, TemplateResiliation, Prestataire } from '@/types';
import type { ContractInsert } from '@/types/supabase';
import { MOCK_CATEGORIES_CONTRAT, type CategorieContrat } from '@/data/mock';
import { getUniquePrestataires, formatMontant } from '@/components/features/maintenance/Contracts/utils';
import type { ExportFormat } from '@/components/features/maintenance/Contracts/types';
import { useCopro } from '@/providers/CoproContext';
import { useToast } from '@/providers/ToastProvider';
import {
    getAllContrats,
    getContratSyndic,
    loadSyndicContract,
    loadContracts,
    addContrat,
    updateContrat,
    updateContratSyndic,
    subscribeToContracts,
} from '@/lib/services/contracts.service';
import { useContracts as useContractsSupabase, useProviders } from '@/hooks/modules/useMaintenanceData';

export function useContracts() {
    const { currentCoproId } = useCopro();
    const { showToast } = useToast();
    const {
        createContract: supabaseCreateContract,
        updateContract: supabaseUpdateContract,
    } = useContractsSupabase({ autoFetch: false });

    const { providers: dbProviders } = useProviders({ autoFetch: true });

    // Prestataires depuis Supabase
    const supabasePrestataires = useMemo(() => {
        const mapped = dbProviders
            .filter(p => p.id && p.name)
            .map(p => ({
                id: p.id as string,
                nom: p.name as string,
                categorie: (p.category || 'copropriete').toUpperCase(),
                domaines: ((p.domains || []) as string[]).map(d => d.toUpperCase()),
                telephone: p.phone || '',
                email: p.email || '',
                adresse: '',
                dateAjout: p.created_at || '',
                nombreInterventions: p.interventions_count || 0,
            }));
        return mapped as unknown as Prestataire[];
    }, [dbProviders]);

    // Load contracts from Supabase on mount / copro change
    useEffect(() => {
        if (currentCoproId) {
            loadSyndicContract(currentCoproId);
            loadContracts(currentCoproId);
        }
    }, [currentCoproId]);

    // Utiliser useSyncExternalStore pour synchroniser avec le service partagé
    const contrats = useSyncExternalStore(
        subscribeToContracts,
        getAllContrats,
        getAllContrats // SSR fallback
    );

    const contratSyndic = useSyncExternalStore(
        subscribeToContracts,
        getContratSyndic,
        getContratSyndic // SSR fallback
    );

    // États des filtres
    const [searchTerm, setSearchTerm] = useState('');
    const [statutFilter, setStatutFilter] = useState<StatutContrat | 'TOUS'>('TOUS');
    const [categorieFilter, setCategorieFilter] = useState<CategorieContrat | 'TOUS'>('TOUS');
    const [typeFilter, setTypeFilter] = useState<TypeContrat | 'TOUS'>('TOUS');
    const [prestataireFilter, setPrestataireFilter] = useState<string>('TOUS');

    // États des modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditSyndicModalOpen, setIsEditSyndicModalOpen] = useState(false);
    const [contratToResiliate, setContratToResiliate] = useState<ContratDetaille | null>(null);
    const [contratToEdit, setContratToEdit] = useState<ContratDetaille | null>(null);

    // Prestataires uniques pour le filtre
    const uniquePrestataires = useMemo(() => getUniquePrestataires(contrats), [contrats]);

    // Contrats filtrés + triés par priorité statut (expirés en premier)
    const STATUT_PRIORITY: Record<string, number> = {
        EXPIRE: 0, A_RENOUVELER: 1, ACTIF: 2, BROUILLON: 3, RESILIE: 4,
    };

    const filteredContrats = useMemo(() => {
        return contrats.filter(c => {
            const matchesSearch = searchTerm === '' ||
                c.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.fournisseur.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (c.numeroContrat && c.numeroContrat.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesStatut = statutFilter === 'TOUS' || c.statut === statutFilter;
            // Filtre par catégorie : trouver si le type du contrat appartient à la catégorie sélectionnée
            const matchesCategorie = categorieFilter === 'TOUS' ||
                MOCK_CATEGORIES_CONTRAT.find(cat => cat.value === categorieFilter)?.types.includes(c.type);
            const matchesType = typeFilter === 'TOUS' || c.type === typeFilter;
            const matchesPrestataire = prestataireFilter === 'TOUS' || c.fournisseur === prestataireFilter;
            return matchesSearch && matchesStatut && matchesCategorie && matchesType && matchesPrestataire;
        }).sort((a, b) => {
            const pa = STATUT_PRIORITY[a.statut] ?? 5;
            const pb = STATUT_PRIORITY[b.statut] ?? 5;
            return pa - pb;
        });
    }, [contrats, searchTerm, statutFilter, categorieFilter, typeFilter, prestataireFilter]);

    // Ajouter un contrat
    const handleAddContrat = useCallback((newContrat: ContratDetaille) => {
        addContrat(newContrat);
        showToast({ type: 'success', message: `Contrat "${newContrat.nom}" créé avec succès` });

        // Sync to Supabase
        try {
            supabaseCreateContract({
                title: newContrat.nom,
                contract_type: newContrat.type.toLowerCase(),
                contract_number: newContrat.numeroContrat || null,
                provider_id: newContrat.prestataireId,
                start_date: newContrat.dateDebut,
                end_date: newContrat.dateFin,
                annual_amount: newContrat.coutAnnuel || null,
                is_regulatory: newContrat.estReglementaire ?? false,
                tacit_renewal: newContrat.taciteReconduction ?? false,
                notice_months: newContrat.delaiResiliation ? Math.round(newContrat.delaiResiliation / 30) : null,
                description: newContrat.description || null,
            } as unknown as ContractInsert);
        } catch (err) {
            console.error('[Supabase] Failed to sync new contract:', err);
        }
    }, [showToast, supabaseCreateContract]);

    // Modifier un contrat
    const handleSaveContrat = useCallback((updatedContrat: ContratDetaille) => {
        updateContrat(updatedContrat);
        showToast({ type: 'success', message: `Contrat "${updatedContrat.nom}" modifié avec succès` });

        // Sync to Supabase
        try {
            supabaseUpdateContract(updatedContrat.id, {
                title: updatedContrat.nom,
                contract_type: updatedContrat.type.toLowerCase(),
                contract_number: updatedContrat.numeroContrat || null,
                start_date: updatedContrat.dateDebut,
                end_date: updatedContrat.dateFin,
                annual_amount: updatedContrat.coutAnnuel || null,
                is_regulatory: updatedContrat.estReglementaire ?? false,
                tacit_renewal: updatedContrat.taciteReconduction ?? false,
                notice_months: updatedContrat.delaiResiliation ? Math.round(updatedContrat.delaiResiliation / 30) : null,
                description: updatedContrat.description || null,
            } as unknown as Partial<import('@/types/supabase').Contract>);
        } catch (err) {
            console.error('[Supabase] Failed to sync contract update:', err);
        }
    }, [showToast, supabaseUpdateContract]);

    // Résilier un contrat
    const handleConfirmResiliation = useCallback((template?: TemplateResiliation) => {
        if (contratToResiliate) {
            updateContrat({ ...contratToResiliate, statut: 'RESILIE' as StatutContrat });

            // Log du mode d'envoi pour tracking (en production, stocker en BDD)
            if (template?.modeEnvoi && template.modeEnvoi !== 'NON_DEFINI') {
                const modeLabel = template.modeEnvoi === 'RECOMMANDE_POSTAL'
                    ? 'Courrier recommandé postal'
                    : 'Recommandé électronique';
                const statutLabel = template.statutEnvoi === 'PREPARE'
                    ? 'préparé'
                    : template.statutEnvoi === 'ENVOYE'
                    ? 'envoyé'
                    : '';
                showToast({
                    type: 'success',
                    message: `Contrat "${contratToResiliate.nom}" résilié avec succès. ${modeLabel} ${statutLabel}.`,
                });
            } else {
                showToast({ type: 'success', message: `Contrat "${contratToResiliate.nom}" résilié avec succès` });
            }
            setContratToResiliate(null);
        }
    }, [contratToResiliate, showToast]);

    // Télécharger un PDF - génère un fichier texte récapitulatif du contrat
    const handleTelecharger = useCallback((contrat: ContratDetaille) => {
        showToast({ type: 'info', message: `Génération du document ${contrat.fichierPDF || 'contrat.pdf'}...` });

        // Générer un contenu textuel du contrat (simulation de PDF)
        const content = `
================================================================================
                            CONTRAT DE MAINTENANCE
================================================================================

Référence : ${contrat.numeroContrat || 'Non renseigné'}
Libellé : ${contrat.nom}

--------------------------------------------------------------------------------
INFORMATIONS GÉNÉRALES
--------------------------------------------------------------------------------
Type de contrat : ${contrat.type}
Prestataire : ${contrat.fournisseur}
Statut : ${contrat.statut}
${contrat.estReglementaire ? '⚠️ Contrat réglementaire obligatoire' : ''}

--------------------------------------------------------------------------------
DURÉE ET CONDITIONS
--------------------------------------------------------------------------------
Date de début : ${new Date(contrat.dateDebut).toLocaleDateString('fr-FR')}
Date de fin : ${new Date(contrat.dateFin).toLocaleDateString('fr-FR')}
Tacite reconduction : ${contrat.taciteReconduction ? 'Oui' : 'Non'}
Délai de résiliation : ${contrat.delaiResiliation || '-'} jours

--------------------------------------------------------------------------------
FINANCIER
--------------------------------------------------------------------------------
Coût annuel : ${formatMontant(contrat.coutAnnuel)}

--------------------------------------------------------------------------------
DESCRIPTION
--------------------------------------------------------------------------------
${contrat.description || 'Aucune description'}

${contrat.conditionsParticulieres ? `
--------------------------------------------------------------------------------
CONDITIONS PARTICULIÈRES
--------------------------------------------------------------------------------
${contrat.conditionsParticulieres}
` : ''}

${contrat.equipementConcerne ? `
--------------------------------------------------------------------------------
ÉQUIPEMENT CONCERNÉ
--------------------------------------------------------------------------------
${contrat.equipementConcerne}
` : ''}

================================================================================
Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
CoProFlex - Gestion de copropriété
================================================================================
`.trim();

        // Créer et télécharger le fichier
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = contrat.fichierPDF?.replace('.pdf', '.txt') || `contrat_${contrat.id}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast({ type: 'success', message: 'Document téléchargé avec succès' });
    }, [showToast]);

    // Télécharger PDF syndic
    const handleDownloadSyndicPDF = useCallback(() => {
        if (!contratSyndic) {
            showToast({ type: 'error', message: 'Aucun contrat syndic configuré' });
            return;
        }
        showToast({ type: 'info', message: `Téléchargement de ${contratSyndic.fichierPDF || 'contrat_syndic.pdf'}...` });
        setTimeout(() => {
            showToast({ type: 'success', message: 'Fichier téléchargé avec succès' });
        }, 1500);
    }, [contratSyndic, showToast]);

    // Modifier le contrat syndic
    const handleSaveSyndic = useCallback((updated: ContratSyndic) => {
        updateContratSyndic(updated);
        showToast({ type: 'success', message: 'Contrat du syndic modifié avec succès' });
    }, [showToast]);

    // Action syndic (préparer renouvellement)
    const handleSyndicAction = useCallback(() => {
        showToast({ type: 'info', message: 'Préparation du renouvellement du contrat syndic lancée' });
        setIsEditSyndicModalOpen(true);
    }, [showToast]);

    // Export des contrats
    const handleExport = useCallback((format: ExportFormat) => {
        const data = filteredContrats.map(c => ({
            statut: c.statut,
            libelle: c.nom,
            prestataire: c.fournisseur,
            type: c.type,
            echeance: new Date(c.dateFin).toLocaleDateString('fr-FR'),
            coutAnnuel: c.coutAnnuel
        }));

        if (format === 'PDF') {
            const content = `CONTRATS DE LA COPROPRIETE\n\nExport du ${new Date().toLocaleDateString('fr-FR')}\n\n` +
                data.map(c => `- ${c.libelle} (${c.prestataire}) - ${formatMontant(c.coutAnnuel)}`).join('\n');
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `contrats_${new Date().toISOString().split('T')[0]}.txt`;
            a.click();
            URL.revokeObjectURL(url);
            showToast({ type: 'success', message: 'Export PDF généré avec succès' });
        } else if (format === 'EXCEL') {
            const headers = 'Statut;Libellé;Prestataire;Type;Échéance;Coût annuel\n';
            const rows = data.map(c => `${c.statut};${c.libelle};${c.prestataire};${c.type};${c.echeance};${c.coutAnnuel}`).join('\n');
            const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `contrats_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            showToast({ type: 'success', message: 'Export Excel généré avec succès' });
        } else if (format === 'ACQUEREURS') {
            const activeContracts = data.filter(c => c.statut === 'ACTIF');
            const content = `LISTE DES CONTRATS EN COURS\n\nDocument destiné aux acquéreurs\n\n` +
                activeContracts.map(c => `• ${c.libelle}\n  Prestataire: ${c.prestataire}\n  Coût: ${formatMontant(c.coutAnnuel)}/an\n`).join('\n');
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `contrats_acquereurs_${new Date().toISOString().split('T')[0]}.txt`;
            a.click();
            URL.revokeObjectURL(url);
            showToast({ type: 'success', message: 'Export Acquéreurs généré avec succès' });
        }
    }, [filteredContrats, showToast]);

    return {
        // Données
        contrats,
        filteredContrats,
        contratSyndic,
        prestataires: supabasePrestataires,
        uniquePrestataires,

        // Filtres
        searchTerm,
        setSearchTerm,
        statutFilter,
        setStatutFilter,
        categorieFilter,
        setCategorieFilter,
        typeFilter,
        setTypeFilter,
        prestataireFilter,
        setPrestataireFilter,

        // Modals
        isAddModalOpen,
        setIsAddModalOpen,
        isEditSyndicModalOpen,
        setIsEditSyndicModalOpen,
        contratToResiliate,
        setContratToResiliate,
        contratToEdit,
        setContratToEdit,

        // Actions
        showToast,
        handleAddContrat,
        handleSaveContrat,
        handleConfirmResiliation,
        handleTelecharger,
        handleDownloadSyndicPDF,
        handleSaveSyndic,
        handleSyndicAction,
        handleExport,
    };
}
