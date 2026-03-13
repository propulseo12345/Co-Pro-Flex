'use client';

import { useState, useMemo, useCallback, useSyncExternalStore } from 'react';
import {
    MOCK_INFORMATIONS_COPROPRIETE,
    MOCK_TRAVAUX_PREVISIONNELS,
    MOCK_DOCUMENTS_TECHNIQUES,
    MOCK_PRESTATAIRES_SYNDIC,
    MOCK_PRESTATAIRES_COPRO,
    MOCK_ASSURANCES_COPROPRIETE
} from '@/data/mock';
import {
    getAllContrats,
    subscribeToContracts,
} from '@/lib/services/contracts.service';
import {
    getAllInterventions,
    subscribeToInterventions,
    addIntervention as addInterventionService,
    updateIntervention as updateInterventionService,
    getInterventionAlerts,
    type AlerteIntervention
} from '@/lib/services/interventions.service';
import type {
    Intervention,
    InterventionFormData,
    CoproprieteFormData,
    ActiveTab,
    InterventionView,
    ExportFormat,
    StatsCategorie,
    DocumentStats,
    LogbookKpis,
    DocumentsByCategory,
    CATEGORIES_DOCUMENTS,
    FiltreKpi,
    ResultatCreationIntervention,
    ToastCreationProps,
    ToastType
} from '@/components/features/maintenance/Logbook/types';
import { isDocumentExpired, isDocumentExpiringSoon, isEcheanceProche, isGarantieEnCours, getInitialInterventionForm } from '@/components/features/maintenance/Logbook/utils';
import { DocumentTechnique, ContratAssurance } from '@/types';

// Catégories de documents
const CATEGORIES_DOCS: Record<string, string[]> = {
    DTA: ['DTA'],
    DIAGNOSTICS: ['DIAGNOSTIC_PLOMB', 'DIAGNOSTIC_ELECTRICITE', 'DIAGNOSTIC_GAZ', 'DPE_COLLECTIF'],
    CONTROLES: ['CONTROLE_ASCENSEUR', 'CONTROLE_EXTINCTEURS', 'CONTROLE_CHAUFFERIE', 'RAPPORT_SECURITE'],
    GARANTIES: ['GARANTIE_DECENNALE', 'GARANTIE_PARFAIT_ACHEVEMENT']
};

// Labels des filtres KPI pour l'affichage
const LABELS_FILTRES_KPI: Record<FiltreKpi, string> = {
    tous: 'Toutes les interventions',
    en_cours: 'En cours',
    travaux_prevus: 'Travaux prévus',
    documents_valides: 'Documents valides',
    assurances: 'Assurances',
    contrats: 'Contrats',
};

export function useLogbook() {
    // Synchroniser avec le service partagé des contrats
    const contrats = useSyncExternalStore(
        subscribeToContracts,
        getAllContrats,
        getAllContrats // SSR fallback
    );

    // Synchroniser avec le service partagé des interventions (statuts mis à jour automatiquement)
    const interventions = useSyncExternalStore(
        subscribeToInterventions,
        getAllInterventions,
        getAllInterventions // SSR fallback
    ) as Intervention[];

    // Alertes d'interventions (J-7, J, J+1)
    const interventionAlerts = useMemo<AlerteIntervention[]>(() => {
        return getInterventionAlerts(getAllInterventions());
    }, [interventions]);

    // États onglets et vues
    const [activeTab, setActiveTab] = useState<ActiveTab>('interventions');
    const [interventionView, setInterventionView] = useState<InterventionView>('all');
    const [filtreKpiActif, setFiltreKpiActif] = useState<FiltreKpi>('tous');

    // État du toast de création
    const [toastCreation, setToastCreation] = useState<Omit<ToastCreationProps, 'onClose' | 'onVoirIntervention' | 'onAfficherTout'> | null>(null);

    // États filtres interventions
    const [searchTerm, setSearchTerm] = useState('');
    const [categorieFilter, setCategorieFilter] = useState<'TOUS' | 'COURANTE' | 'TRAVAUX_IMPORTANTS'>('TOUS');
    const [statutFilter, setStatutFilter] = useState<string>('TOUS');
    const [prestataireFilter, setPrestataireFilter] = useState<string>('TOUS');
    const [equipementFilter, setEquipementFilter] = useState<string>('TOUS');
    const [anneeFilter, setAnneeFilter] = useState<string>('TOUS');

    // États filtres documents
    const [searchDocuments, setSearchDocuments] = useState('');
    const [categorieDocFilter, setCategorieDocFilter] = useState<string>('TOUS');
    const [expandedCategories, setExpandedCategories] = useState<string[]>(['DTA', 'DIAGNOSTICS', 'CONTROLES', 'GARANTIES', 'AUTRES']);

    // États UI
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isSimplifiedView, setIsSimplifiedView] = useState(false);

    // États modals
    const [selectedEquipement, setSelectedEquipement] = useState<string | null>(null);
    const [showNewInterventionModal, setShowNewInterventionModal] = useState(false);
    const [editingIntervention, setEditingIntervention] = useState<Intervention | null>(null);
    const [selectedAssurance, setSelectedAssurance] = useState<ContratAssurance | null>(null);
    const [selectedDocument, setSelectedDocument] = useState<DocumentTechnique | null>(null);

    // États formulaires
    const [newInterventionForm, setNewInterventionForm] = useState<InterventionFormData>(getInitialInterventionForm());
    const [formData, setFormData] = useState<CoproprieteFormData>({
        nom: MOCK_INFORMATIONS_COPROPRIETE.nom,
        adresse: MOCK_INFORMATIONS_COPROPRIETE.adresse,
        codePostal: MOCK_INFORMATIONS_COPROPRIETE.codePostal,
        ville: MOCK_INFORMATIONS_COPROPRIETE.ville,
        anneeConstruction: MOCK_INFORMATIONS_COPROPRIETE.anneeConstruction,
        nombreBatiments: MOCK_INFORMATIONS_COPROPRIETE.nombreBatiments,
        nombreLots: MOCK_INFORMATIONS_COPROPRIETE.nombreLots,
        syndicNom: MOCK_INFORMATIONS_COPROPRIETE.syndic.nom,
        syndicTelephone: MOCK_INFORMATIONS_COPROPRIETE.syndic.telephone,
        syndicEmail: MOCK_INFORMATIONS_COPROPRIETE.syndic.email || '',
    });

    // Données
    const allPrestataires = useMemo(() => [...MOCK_PRESTATAIRES_SYNDIC, ...MOCK_PRESTATAIRES_COPRO], []);

    // Helpers pour équipements - utilise les contrats synchronisés
    const getContratsForEquipement = useCallback((equipement: string) => {
        const keywords = equipement.toLowerCase().split(' ');
        return contrats.filter(c => {
            const contratText = `${c.nom} ${c.description || ''} ${c.type}`.toLowerCase();
            return keywords.some(keyword => contratText.includes(keyword)) ||
                (c.type === 'ASCENSEUR' && equipement.toLowerCase().includes('ascenseur')) ||
                (c.type === 'CHAUFFAGE' && equipement.toLowerCase().includes('chaudi')) ||
                (c.type === 'INTERPHONE' && equipement.toLowerCase().includes('interphone')) ||
                (c.type === 'PORTAIL' && equipement.toLowerCase().includes('portail'));
        });
    }, [contrats]);

    const getInterventionsForEquipement = useCallback((equipement: string) => {
        return interventions.filter(i =>
            i.equipementConcerne?.toLowerCase().includes(equipement.toLowerCase()) ||
            i.titre.toLowerCase().includes(equipement.toLowerCase())
        );
    }, [interventions]);

    const getDocumentsForEquipement = useCallback((equipement: string) => {
        const keywords = equipement.toLowerCase().split(' ');
        return MOCK_DOCUMENTS_TECHNIQUES.filter(d => {
            const docText = `${d.nom} ${d.type}`.toLowerCase();
            return keywords.some(keyword => docText.includes(keyword)) ||
                (d.type === 'CONTROLE_ASCENSEUR' && equipement.toLowerCase().includes('ascenseur')) ||
                (d.type === 'CONTROLE_CHAUFFERIE' && equipement.toLowerCase().includes('chaudi'));
        });
    }, []);

    // Filtrage interventions
    const filteredInterventions = useMemo(() => {
        return interventions.filter(intervention => {
            const matchesSearch = searchTerm === '' ||
                intervention.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                intervention.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                intervention.intervenant.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesCategorie = categorieFilter === 'TOUS' || intervention.categorie === categorieFilter;
            const matchesStatut = statutFilter === 'TOUS' || intervention.statut === statutFilter;
            const matchesPrestataire = prestataireFilter === 'TOUS' || intervention.prestataireId === prestataireFilter;
            const matchesEquipement = equipementFilter === 'TOUS' || intervention.equipementConcerne === equipementFilter;
            const matchesAnnee = anneeFilter === 'TOUS' || new Date(intervention.date).getFullYear().toString() === anneeFilter;

            return matchesSearch && matchesCategorie && matchesStatut && matchesPrestataire && matchesEquipement && matchesAnnee;
        }).sort((a, b) => {
            const statutPriority: Record<string, number> = {
                URGENTE: 0, URGENT: 0,
                EN_COURS: 1,
                PLANIFIEE: 2, PLANIFIE: 2,
                TERMINEE: 3, TERMINE: 3,
            };
            const pa = statutPriority[a.statut] ?? 4;
            const pb = statutPriority[b.statut] ?? 4;
            if (pa !== pb) return pa - pb;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
    }, [interventions, searchTerm, categorieFilter, statutFilter, prestataireFilter, equipementFilter, anneeFilter]);

    const interventionsCourantes = useMemo(() =>
        filteredInterventions.filter(i => i.categorie === 'COURANTE'),
        [filteredInterventions]
    );

    const travauxImportants = useMemo(() =>
        filteredInterventions.filter(i => i.categorie === 'TRAVAUX_IMPORTANTS'),
        [filteredInterventions]
    );

    const years = useMemo(() =>
        Array.from(new Set(interventions.map(i => new Date(i.date).getFullYear()))).sort((a, b) => b - a),
        [interventions]
    );

    const equipements = useMemo(() =>
        Array.from(new Set(interventions.map(i => i.equipementConcerne).filter(Boolean))) as string[],
        [interventions]
    );

    // Stats interventions
    const statsCategorie = useMemo<StatsCategorie>(() => {
        const allInterventions = interventions;
        const courantes = allInterventions.filter(i => i.categorie === 'COURANTE');
        const travaux = allInterventions.filter(i => i.categorie === 'TRAVAUX_IMPORTANTS');

        const calcStats = (items: typeof allInterventions) => ({
            total: items.length,
            terminees: items.filter(i => i.statut === 'TERMINEE').length,
            enCours: items.filter(i => i.statut === 'EN_COURS').length,
            planifiees: items.filter(i => i.statut === 'PLANIFIEE').length,
            coutTotal: items.reduce((sum, i) => sum + (i.cout || 0), 0),
            coutTermine: items.filter(i => i.statut === 'TERMINEE').reduce((sum, i) => sum + (i.cout || 0), 0),
        });

        return {
            courantes: calcStats(courantes),
            travaux: calcStats(travaux),
            global: calcStats(allInterventions),
        };
    }, [interventions]);

    // Filtrage documents
    const filteredDocuments = useMemo(() => {
        return MOCK_DOCUMENTS_TECHNIQUES.filter(doc => {
            const matchesSearch = searchDocuments === '' ||
                doc.nom.toLowerCase().includes(searchDocuments.toLowerCase());

            if (categorieDocFilter === 'TOUS') return matchesSearch;

            const categorieTypes = CATEGORIES_DOCS[categorieDocFilter];
            if (categorieTypes) {
                return matchesSearch && categorieTypes.includes(doc.type);
            }
            if (categorieDocFilter === 'AUTRES') {
                const allCategorizedTypes = Object.values(CATEGORIES_DOCS).flat();
                return matchesSearch && !allCategorizedTypes.includes(doc.type);
            }
            return matchesSearch;
        });
    }, [searchDocuments, categorieDocFilter]);

    const documentsByCategory = useMemo<DocumentsByCategory>(() => {
        const allCategorizedTypes = Object.values(CATEGORIES_DOCS).flat();
        return {
            DTA: filteredDocuments.filter(d => CATEGORIES_DOCS.DTA.includes(d.type)),
            DIAGNOSTICS: filteredDocuments.filter(d => CATEGORIES_DOCS.DIAGNOSTICS.includes(d.type)),
            CONTROLES: filteredDocuments.filter(d => CATEGORIES_DOCS.CONTROLES.includes(d.type)),
            GARANTIES: filteredDocuments.filter(d => CATEGORIES_DOCS.GARANTIES.includes(d.type)),
            AUTRES: filteredDocuments.filter(d => !allCategorizedTypes.includes(d.type))
        };
    }, [filteredDocuments]);

    const documentStats = useMemo<DocumentStats>(() => {
        const total = MOCK_DOCUMENTS_TECHNIQUES.length;
        const expired = MOCK_DOCUMENTS_TECHNIQUES.filter(d => isDocumentExpired(d.dateValidite)).length;
        const expiring = MOCK_DOCUMENTS_TECHNIQUES.filter(d => isDocumentExpiringSoon(d.dateValidite)).length;
        const valid = MOCK_DOCUMENTS_TECHNIQUES.filter(d => !d.dateValidite || (!isDocumentExpired(d.dateValidite) && !isDocumentExpiringSoon(d.dateValidite))).length;
        return { total, expired, expiring, valid };
    }, []);

    // KPIs - utilise les contrats synchronisés
    const kpis = useMemo<LogbookKpis>(() => ({
        contratsActifs: contrats.filter(c => c.statut === 'ACTIF').length,
        contratsARenouveler: contrats.filter(c => c.statut === 'A_RENOUVELER' || isEcheanceProche(c.dateFin)).length,
        interventionsEnCours: interventions.filter(i => i.statut === 'EN_COURS').length,
        travauxPrevus: MOCK_TRAVAUX_PREVISIONNELS.filter(t => t.statut === 'PREVU' || t.statut === 'VOTE').length,
        documentsValides: MOCK_DOCUMENTS_TECHNIQUES.filter(d => !d.dateValidite || new Date(d.dateValidite) > new Date()).length,
        assurancesActives: MOCK_ASSURANCES_COPROPRIETE.filter(a => isGarantieEnCours(a.dateFin)).length,
        totalInterventions: interventions.length,
    }), [contrats, interventions]);

    // Handlers
    const handleSaveInfo = useCallback(() => {
        // Mise à jour des informations de la copropriété
        // Note: En production, cela sera persisté via Supabase
        Object.assign(MOCK_INFORMATIONS_COPROPRIETE, {
            nom: formData.nom,
            adresse: formData.adresse,
            codePostal: formData.codePostal,
            ville: formData.ville,
            anneeConstruction: formData.anneeConstruction,
            nombreBatiments: formData.nombreBatiments,
            nombreLots: formData.nombreLots,
            syndic: {
                ...MOCK_INFORMATIONS_COPROPRIETE.syndic,
                nom: formData.syndicNom,
                telephone: formData.syndicTelephone,
                email: formData.syndicEmail,
            },
        });
        setIsEditing(false);
    }, [formData]);

    /** Vérifie si une intervention est visible avec le filtre KPI actuel */
    const estVisibleAvecFiltreKpi = useCallback((intervention: Intervention, filtre: FiltreKpi): boolean => {
        switch (filtre) {
            case 'en_cours':
                return intervention.statut === 'EN_COURS';
            case 'travaux_prevus':
                return intervention.statut === 'PLANIFIEE';
            case 'documents_valides':
            case 'assurances':
            case 'contrats':
                return false; // Ces filtres ne concernent pas les interventions
            case 'tous':
            default:
                return true;
        }
    }, []);

    /** Vérifie si une intervention passe les filtres de liste */
    const estVisibleAvecFiltresListe = useCallback((intervention: Intervention): boolean => {
        const matchesStatut = statutFilter === 'TOUS' || intervention.statut === statutFilter;
        const matchesCategorie = categorieFilter === 'TOUS' || intervention.categorie === categorieFilter;
        const matchesEquipement = equipementFilter === 'TOUS' || intervention.equipementConcerne === equipementFilter;
        const matchesAnnee = anneeFilter === 'TOUS' || new Date(intervention.date).getFullYear().toString() === anneeFilter;
        return matchesStatut && matchesCategorie && matchesEquipement && matchesAnnee;
    }, [statutFilter, categorieFilter, equipementFilter, anneeFilter]);

    /** Ferme le toast de création */
    const fermerToastCreation = useCallback(() => {
        setToastCreation(null);
    }, []);

    const handleCreateIntervention = useCallback((): ResultatCreationIntervention => {
        // Validation
        if (!newInterventionForm.titre?.trim()) {
            setToastCreation({
                visible: true,
                type: 'error',
                titre: 'Erreur de validation',
                message: 'Le titre est obligatoire',
                estVisibleAvecFiltre: false,
            });
            return { succes: false, erreur: 'Le titre est obligatoire', visibleAvecFiltreActuel: false };
        }

        if (!newInterventionForm.intervenant?.trim()) {
            setToastCreation({
                visible: true,
                type: 'error',
                titre: 'Erreur de validation',
                message: 'L\'intervenant est obligatoire',
                estVisibleAvecFiltre: false,
            });
            return { succes: false, erreur: 'L\'intervenant est obligatoire', visibleAvecFiltreActuel: false };
        }

        // Création de l'intervention
        const nouvelleIntervention: Intervention = {
            id: `intervention-${Date.now()}`,
            titre: newInterventionForm.titre.trim(),
            description: newInterventionForm.description || '',
            date: newInterventionForm.date || new Date().toISOString().split('T')[0],
            categorie: newInterventionForm.categorie,
            type: newInterventionForm.type,
            statut: newInterventionForm.statut,
            intervenant: newInterventionForm.intervenant.trim(),
            equipementConcerne: newInterventionForm.equipementConcerne || undefined,
            cout: newInterventionForm.cout ? parseFloat(newInterventionForm.cout) : undefined,
        };

        // Ajout via le service (statuts gérés automatiquement)
        addInterventionService(nouvelleIntervention as unknown as Parameters<typeof addInterventionService>[0]);

        // Vérifier la visibilité avec les filtres actuels
        const visibleKpi = estVisibleAvecFiltreKpi(nouvelleIntervention, filtreKpiActif);
        const visibleListe = estVisibleAvecFiltresListe(nouvelleIntervention);
        const estVisible = visibleKpi && visibleListe && activeTab === 'interventions';

        // Déterminer le message du toast
        let labelFiltre: string | undefined;
        if (!estVisible) {
            if (!visibleKpi && filtreKpiActif !== 'tous') {
                labelFiltre = LABELS_FILTRES_KPI[filtreKpiActif];
            } else if (!visibleListe) {
                labelFiltre = 'Filtres de liste actifs';
            } else if (activeTab !== 'interventions') {
                labelFiltre = 'Onglet actuel';
            }
        }

        // Afficher le toast
        setToastCreation({
            visible: true,
            type: estVisible ? 'success' : 'warning',
            titre: estVisible ? 'Intervention créée' : 'Intervention créée (non visible)',
            message: `"${nouvelleIntervention.titre}" a été enregistrée.`,
            intervention: nouvelleIntervention,
            estVisibleAvecFiltre: estVisible,
            labelFiltre,
        });

        // Fermer la modal et réinitialiser le formulaire
        setShowNewInterventionModal(false);
        setNewInterventionForm(getInitialInterventionForm());

        // Auto-fermeture du toast après 5s si visible, 10s sinon
        setTimeout(() => {
            setToastCreation(null);
        }, estVisible ? 5000 : 10000);

        return {
            succes: true,
            intervention: nouvelleIntervention,
            visibleAvecFiltreActuel: estVisible,
            filtreActuel: filtreKpiActif,
            labelFiltre,
        };
    }, [newInterventionForm, filtreKpiActif, activeTab, estVisibleAvecFiltreKpi, estVisibleAvecFiltresListe]);

    /** Affiche l'intervention créée en réinitialisant les filtres */
    const voirInterventionCreee = useCallback(() => {
        // Réinitialiser les filtres pour voir l'intervention
        setFiltreKpiActif('tous');
        setStatutFilter('TOUS');
        setCategorieFilter('TOUS');
        setEquipementFilter('TOUS');
        setAnneeFilter('TOUS');
        setActiveTab('interventions');
        setToastCreation(null);
    }, []);

    const handleEditIntervention = useCallback((intervention: Intervention) => {
        setEditingIntervention(intervention);
        setNewInterventionForm({
            titre: intervention.titre,
            description: intervention.description,
            date: intervention.date,
            categorie: intervention.categorie,
            type: intervention.type,
            statut: intervention.statut,
            intervenant: intervention.intervenant,
            equipementConcerne: intervention.equipementConcerne || '',
            cout: intervention.cout?.toString() || '',
        });
    }, []);

    const handleSaveIntervention = useCallback(() => {
        // Validation des champs obligatoires
        if (!newInterventionForm.titre?.trim()) {
            setToastCreation({
                visible: true,
                type: 'error',
                titre: 'Erreur de validation',
                message: 'Le titre est obligatoire',
                estVisibleAvecFiltre: false,
            });
            return;
        }

        if (!newInterventionForm.intervenant?.trim()) {
            setToastCreation({
                visible: true,
                type: 'error',
                titre: 'Erreur de validation',
                message: 'L\'intervenant est obligatoire',
                estVisibleAvecFiltre: false,
            });
            return;
        }

        if (!editingIntervention) {
            return;
        }

        // Mise à jour de l'intervention dans la liste
        const interventionModifiee: Intervention = {
            ...editingIntervention,
            titre: newInterventionForm.titre.trim(),
            description: newInterventionForm.description || '',
            date: newInterventionForm.date,
            categorie: newInterventionForm.categorie,
            type: newInterventionForm.type,
            statut: newInterventionForm.statut,
            intervenant: newInterventionForm.intervenant.trim(),
            equipementConcerne: newInterventionForm.equipementConcerne || undefined,
            cout: newInterventionForm.cout ? parseFloat(newInterventionForm.cout) : undefined,
        };

        // Mise à jour via le service
        updateInterventionService(interventionModifiee as unknown as Parameters<typeof updateInterventionService>[0]);

        const titreModifie = newInterventionForm.titre.trim();

        // Fermeture du modal et reset du formulaire
        setEditingIntervention(null);
        setNewInterventionForm(getInitialInterventionForm());

        // Toast de confirmation
        setToastCreation({
            visible: true,
            type: 'success',
            titre: 'Modifications enregistrées',
            message: `"${titreModifie}" a été mis à jour avec succès.`,
            intervention: interventionModifiee,
            estVisibleAvecFiltre: true,
        });

        // Auto-fermeture du toast après 4 secondes
        setTimeout(() => {
            setToastCreation(null);
        }, 4000);
    }, [editingIntervention, newInterventionForm]);

    const handleFiltreKpiChange = useCallback((filtre: FiltreKpi) => {
        // Si on clique sur le même filtre, on reset
        if (filtre === filtreKpiActif && filtre !== 'tous') {
            setFiltreKpiActif('tous');
            setStatutFilter('TOUS');
            setActiveTab('interventions');
            return;
        }

        setFiltreKpiActif(filtre);

        switch (filtre) {
            case 'contrats':
                window.location.href = '/maintenance/contracts';
                break;
            case 'en_cours':
                setActiveTab('interventions');
                setStatutFilter('EN_COURS');
                break;
            case 'travaux_prevus':
                setActiveTab('travaux');
                break;
            case 'assurances':
                document.getElementById('assurances-section')?.scrollIntoView({ behavior: 'smooth' });
                break;
            case 'documents_valides':
                setActiveTab('documents');
                break;
            case 'tous':
                setActiveTab('interventions');
                setStatutFilter('TOUS');
                break;
        }
    }, [filtreKpiActif]);

    const handleExport = useCallback((format: ExportFormat) => {
        alert(`Export ${format} en cours...`);
        setShowExportMenu(false);
    }, []);

    const toggleCategory = useCallback((category: string) => {
        setExpandedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    }, []);

    const handleFilterByEquipement = useCallback(() => {
        if (selectedEquipement) {
            setEquipementFilter(selectedEquipement);
            setActiveTab('interventions');
            setSelectedEquipement(null);
        }
    }, [selectedEquipement]);

    return {
        // Données - contrats et interventions synchronisés avec les services partagés
        coproprieteInfo: MOCK_INFORMATIONS_COPROPRIETE,
        contrats, // Synchronisé avec le service contracts
        travaux: MOCK_TRAVAUX_PREVISIONNELS,
        documents: MOCK_DOCUMENTS_TECHNIQUES,
        assurances: MOCK_ASSURANCES_COPROPRIETE,
        allPrestataires,
        interventionAlerts, // Alertes d'interventions (J-7, J, J+1)

        // États
        activeTab,
        interventionView,
        filtreKpiActif,
        searchTerm,
        categorieFilter,
        statutFilter,
        prestataireFilter,
        equipementFilter,
        anneeFilter,
        searchDocuments,
        categorieDocFilter,
        expandedCategories,
        showExportMenu,
        isEditing,
        isSimplifiedView,
        selectedEquipement,
        showNewInterventionModal,
        editingIntervention,
        selectedAssurance,
        selectedDocument,
        newInterventionForm,
        formData,
        toastCreation,

        // Données calculées
        filteredInterventions,
        interventionsCourantes,
        travauxImportants,
        years,
        equipements,
        statsCategorie,
        filteredDocuments,
        documentsByCategory,
        documentStats,
        kpis,

        // Setters
        setActiveTab,
        setInterventionView,
        setFiltreKpiActif,
        setSearchTerm,
        setCategorieFilter,
        setStatutFilter,
        setPrestataireFilter,
        setEquipementFilter,
        setAnneeFilter,
        setSearchDocuments,
        setCategorieDocFilter,
        setShowExportMenu,
        setIsEditing,
        setIsSimplifiedView,
        setSelectedEquipement,
        setShowNewInterventionModal,
        setEditingIntervention,
        setSelectedAssurance,
        setSelectedDocument,
        setNewInterventionForm,
        setFormData,

        // Helpers
        getContratsForEquipement,
        getInterventionsForEquipement,
        getDocumentsForEquipement,

        // Handlers
        handleSaveInfo,
        handleCreateIntervention,
        handleEditIntervention,
        handleSaveIntervention,
        handleFiltreKpiChange,
        handleExport,
        toggleCategory,
        handleFilterByEquipement,
        fermerToastCreation,
        voirInterventionCreee,
    };
}
