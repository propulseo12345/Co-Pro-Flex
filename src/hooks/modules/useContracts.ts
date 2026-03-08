'use client';

import { useState, useMemo, useCallback, useEffect, useSyncExternalStore } from 'react';
import { ContratDetaille, ContratSyndic, StatutContrat, TypeContrat, TemplateResiliation } from '@/types';
import { MOCK_PRESTATAIRES_SYNDIC, MOCK_PRESTATAIRES_COPRO, MOCK_CATEGORIES_CONTRAT, type CategorieContrat } from '@/data/mock';
import { getUniquePrestataires, formatMontant } from '@/components/features/maintenance/Contracts/utils';
import type { ExportFormat, ToastData } from '@/components/features/maintenance/Contracts/types';
import { useCopro } from '@/providers/CoproContext';
import {
    getAllContrats,
    getContratSyndic,
    loadSyndicContract,
    addContrat,
    updateContrat,
    updateContratSyndic,
    subscribeToContracts,
} from '@/lib/services/contracts.service';

// Tous les prestataires combinés
const ALL_PRESTATAIRES = [...MOCK_PRESTATAIRES_SYNDIC, ...MOCK_PRESTATAIRES_COPRO];

export function useContracts() {
    const { currentCoproId } = useCopro();

    // Load syndic contract from Supabase on mount / copro change
    useEffect(() => {
        if (currentCoproId) {
            loadSyndicContract(currentCoproId);
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

    // État du toast
    const [toast, setToast] = useState<ToastData | null>(null);

    // Prestataires uniques pour le filtre
    const uniquePrestataires = useMemo(() => getUniquePrestataires(contrats), [contrats]);

    // Contrats filtrés
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
        });
    }, [contrats, searchTerm, statutFilter, categorieFilter, typeFilter, prestataireFilter]);

    // Fonction pour afficher un toast
    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    }, []);

    // Ajouter un contrat
    const handleAddContrat = useCallback((newContrat: ContratDetaille) => {
        addContrat(newContrat);
        showToast(`Contrat "${newContrat.nom}" créé avec succès`, 'success');
    }, [showToast]);

    // Modifier un contrat
    const handleSaveContrat = useCallback((updatedContrat: ContratDetaille) => {
        updateContrat(updatedContrat);
        showToast(`Contrat "${updatedContrat.nom}" modifié avec succès`, 'success');
    }, [showToast]);

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
                showToast(
                    `Contrat "${contratToResiliate.nom}" résilié avec succès. ${modeLabel} ${statutLabel}.`,
                    'success'
                );
            } else {
                showToast(`Contrat "${contratToResiliate.nom}" résilié avec succès`, 'success');
            }
            setContratToResiliate(null);
        }
    }, [contratToResiliate, showToast]);

    // Télécharger un PDF - génère un fichier texte récapitulatif du contrat
    const handleTelecharger = useCallback((contrat: ContratDetaille) => {
        showToast(`Génération du document ${contrat.fichierPDF || 'contrat.pdf'}...`, 'info');

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

        showToast('Document téléchargé avec succès', 'success');
    }, [showToast]);

    // Télécharger PDF syndic
    const handleDownloadSyndicPDF = useCallback(() => {
        if (!contratSyndic) {
            showToast('Aucun contrat syndic configuré', 'error');
            return;
        }
        showToast(`Téléchargement de ${contratSyndic.fichierPDF || 'contrat_syndic.pdf'}...`, 'info');
        setTimeout(() => {
            showToast('Fichier téléchargé avec succès', 'success');
        }, 1500);
    }, [contratSyndic, showToast]);

    // Modifier le contrat syndic
    const handleSaveSyndic = useCallback((updated: ContratSyndic) => {
        updateContratSyndic(updated);
        showToast('Contrat du syndic modifié avec succès', 'success');
    }, [showToast]);

    // Action syndic (préparer renouvellement)
    const handleSyndicAction = useCallback(() => {
        showToast('Préparation du renouvellement du contrat syndic lancée', 'info');
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
            showToast('Export PDF généré avec succès', 'success');
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
            showToast('Export Excel généré avec succès', 'success');
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
            showToast('Export Acquéreurs généré avec succès', 'success');
        }
    }, [filteredContrats, showToast]);

    return {
        // Données
        contrats,
        filteredContrats,
        contratSyndic,
        prestataires: ALL_PRESTATAIRES,
        uniquePrestataires,
        toast,

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
        setToast,
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
