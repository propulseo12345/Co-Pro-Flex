'use client';

import { useLogbook } from '@/hooks/modules/useLogbook';
import type {
    Intervention,
    InterventionFormData,
    CoproprieteFormData,
    ActiveTab,
    InterventionView,
    ExportFormat,
    StatsCategorie,
    LogbookKpis,
    FiltreKpi,
    PrestataireOption,
    ToastCreationProps,
} from '@/components/features/maintenance/Logbook/types';
import type { DocumentTechnique, ContratAssurance, ContratDetaille, TravauxPrevisionnel, Prestataire, InformationsCopropriete } from '@/types';

// ================================
// Types for grouped props
// ================================

export interface BreadcrumbConfig {
    parentPath: string;
    parentLabel: string;
    currentLabel: string;
}

export interface HeaderHandlers {
    onToggleExportMenu: () => void;
    onExport: (format: ExportFormat) => void;
    onNewIntervention: () => void;
    onFiltreChange: (filtre: FiltreKpi) => void;
}

export interface HeaderProps {
    formData: CoproprieteFormData;
    kpis: LogbookKpis;
    showExportMenu: boolean;
    filtreActif: FiltreKpi;
    handlers: HeaderHandlers;
}

export interface InfoSectionHandlers {
    onFormDataChange: (data: CoproprieteFormData) => void;
    onToggleEdit: () => void;
    onToggleSimplifiedView: () => void;
    onSaveInfo: () => void;
    onSelectEquipement: (equipement: string) => void;
}

export interface InfoSectionProps {
    formData: CoproprieteFormData;
    coproprieteInfo: InformationsCopropriete;
    isEditing: boolean;
    isSimplifiedView: boolean;
    equipementsPrincipaux: string[];
    handlers: InfoSectionHandlers;
}

export interface TabsState {
    activeTab: ActiveTab;
    setActiveTab: (tab: ActiveTab) => void;
    filteredInterventions: Intervention[];
    travaux: TravauxPrevisionnel[];
}

export interface InterventionsTabHandlers {
    onInterventionViewChange: (view: InterventionView) => void;
    onSearchChange: (value: string) => void;
    onStatutFilterChange: (value: string) => void;
    onPrestataireFilterChange: (value: string) => void;
    onEquipementFilterChange: (value: string) => void;
    onAnneeFilterChange: (value: string) => void;
    onEditIntervention: (intervention: Intervention) => void;
}

export interface InterventionsTabState {
    interventions: Intervention[];
    allInterventions: Intervention[];
    interventionsCourantes: Intervention[];
    travauxImportants: Intervention[];
    statsCategorie: StatsCategorie;
    interventionView: InterventionView;
    searchTerm: string;
    statutFilter: string;
    prestataireFilter: string;
    equipementFilter: string;
    anneeFilter: string;
    years: number[];
    equipements: string[];
    allPrestataires: Prestataire[];
    handlers: InterventionsTabHandlers;
}


export interface ModalsState {
    selectedEquipement: string | null;
    showNewInterventionModal: boolean;
    editingIntervention: Intervention | null;
    selectedAssurance: ContratAssurance | null;
    selectedDocument: DocumentTechnique | null;
    newInterventionForm: InterventionFormData;
    coproprieteInfo: InformationsCopropriete;
    prestatairesOptions: PrestataireOption[];
    isSubmitting: boolean;
}

export interface ModalsHandlers {
    setSelectedEquipement: (equipement: string | null) => void;
    setShowNewInterventionModal: (show: boolean) => void;
    setEditingIntervention: (intervention: Intervention | null) => void;
    setSelectedAssurance: (assurance: ContratAssurance | null) => void;
    setSelectedDocument: (document: DocumentTechnique | null) => void;
    setNewInterventionForm: (form: InterventionFormData) => void;
    getContratsForEquipement: (equipement: string) => ContratDetaille[];
    getInterventionsForEquipement: (equipement: string) => Intervention[];
    getDocumentsForEquipement: (equipement: string) => DocumentTechnique[];
    handleFilterByEquipement: () => void;
    handleCreateIntervention: () => void;
    handleSaveIntervention: () => void;
}

export interface ToastState {
    toastCreation: Omit<ToastCreationProps, 'onClose' | 'onVoirIntervention' | 'onAfficherTout'> | null;
    fermerToastCreation: () => void;
    voirInterventionCreee: () => void;
}

export interface AssurancesSectionProps {
    assurances: ContratAssurance[];
    onSelectAssurance: (assurance: ContratAssurance) => void;
}

export interface ContratsSectionProps {
    contrats: ContratDetaille[];
}

export interface UseLogbookPageReturn {
    // Breadcrumb config
    breadcrumb: BreadcrumbConfig;

    // Header section
    header: HeaderProps;

    // Info section
    infoSection: InfoSectionProps;

    // Assurances section
    assurancesSection: AssurancesSectionProps;

    // Contrats section
    contratsSection: ContratsSectionProps;

    // Tabs
    tabs: TabsState;

    // Interventions tab
    interventionsTab: InterventionsTabState;

    // Modals
    modals: ModalsState;
    modalsHandlers: ModalsHandlers;

    // Toast
    toast: ToastState;
}

/**
 * Page-level hook for the Logbook page.
 * Wraps useLogbook and organizes the return values into logical groups
 * for cleaner component composition.
 */
export function useLogbookPage(): UseLogbookPageReturn {
    const logbook = useLogbook();

    const breadcrumb: BreadcrumbConfig = {
        parentPath: '/maintenance',
        parentLabel: 'Maintenance',
        currentLabel: "Carnet d'entretien",
    };

    const header: HeaderProps = {
        formData: logbook.formData,
        kpis: logbook.kpis,
        showExportMenu: logbook.showExportMenu,
        filtreActif: logbook.filtreKpiActif,
        handlers: {
            onToggleExportMenu: () => logbook.setShowExportMenu(!logbook.showExportMenu),
            onExport: logbook.handleExport,
            onNewIntervention: () => logbook.setShowNewInterventionModal(true),
            onFiltreChange: logbook.handleFiltreKpiChange,
        },
    };

    const infoSection: InfoSectionProps = {
        formData: logbook.formData,
        coproprieteInfo: logbook.coproprieteInfo,
        isEditing: logbook.isEditing,
        isSimplifiedView: logbook.isSimplifiedView,
        equipementsPrincipaux: logbook.coproprieteInfo.equipementsPrincipaux,
        handlers: {
            onFormDataChange: logbook.setFormData,
            onToggleEdit: () => logbook.setIsEditing(!logbook.isEditing),
            onToggleSimplifiedView: () => logbook.setIsSimplifiedView(!logbook.isSimplifiedView),
            onSaveInfo: logbook.handleSaveInfo,
            onSelectEquipement: logbook.setSelectedEquipement,
        },
    };

    const assurancesSection: AssurancesSectionProps = {
        assurances: logbook.assurances,
        onSelectAssurance: logbook.setSelectedAssurance,
    };

    const contratsSection: ContratsSectionProps = {
        contrats: logbook.contrats,
    };

    const tabs: TabsState = {
        activeTab: logbook.activeTab,
        setActiveTab: logbook.setActiveTab,
        filteredInterventions: logbook.filteredInterventions,
        travaux: logbook.travaux,
    };

    const interventionsTab: InterventionsTabState = {
        interventions: logbook.filteredInterventions,
        allInterventions: logbook.filteredInterventions,
        interventionsCourantes: logbook.interventionsCourantes,
        travauxImportants: logbook.travauxImportants,
        statsCategorie: logbook.statsCategorie,
        interventionView: logbook.interventionView,
        searchTerm: logbook.searchTerm,
        statutFilter: logbook.statutFilter,
        prestataireFilter: logbook.prestataireFilter,
        equipementFilter: logbook.equipementFilter,
        anneeFilter: logbook.anneeFilter,
        years: logbook.years,
        equipements: logbook.equipements,
        allPrestataires: logbook.allPrestataires,
        handlers: {
            onInterventionViewChange: logbook.setInterventionView,
            onSearchChange: logbook.setSearchTerm,
            onStatutFilterChange: logbook.setStatutFilter,
            onPrestataireFilterChange: logbook.setPrestataireFilter,
            onEquipementFilterChange: logbook.setEquipementFilter,
            onAnneeFilterChange: logbook.setAnneeFilter,
            onEditIntervention: logbook.handleEditIntervention,
        },
    };

    const modals: ModalsState = {
        selectedEquipement: logbook.selectedEquipement,
        showNewInterventionModal: logbook.showNewInterventionModal,
        editingIntervention: logbook.editingIntervention,
        selectedAssurance: logbook.selectedAssurance,
        selectedDocument: logbook.selectedDocument,
        newInterventionForm: logbook.newInterventionForm,
        coproprieteInfo: logbook.coproprieteInfo,
        prestatairesOptions: logbook.prestatairesOptions,
        isSubmitting: logbook.isSubmitting,
    };

    const modalsHandlers: ModalsHandlers = {
        setSelectedEquipement: logbook.setSelectedEquipement,
        setShowNewInterventionModal: logbook.setShowNewInterventionModal,
        setEditingIntervention: logbook.setEditingIntervention,
        setSelectedAssurance: logbook.setSelectedAssurance,
        setSelectedDocument: logbook.setSelectedDocument,
        setNewInterventionForm: logbook.setNewInterventionForm,
        getContratsForEquipement: logbook.getContratsForEquipement,
        getInterventionsForEquipement: logbook.getInterventionsForEquipement,
        getDocumentsForEquipement: logbook.getDocumentsForEquipement,
        handleFilterByEquipement: logbook.handleFilterByEquipement,
        handleCreateIntervention: logbook.handleCreateIntervention,
        handleSaveIntervention: logbook.handleSaveIntervention,
    };

    const toast: ToastState = {
        toastCreation: logbook.toastCreation,
        fermerToastCreation: logbook.fermerToastCreation,
        voirInterventionCreee: logbook.voirInterventionCreee,
    };

    return {
        breadcrumb,
        header,
        infoSection,
        assurancesSection,
        contratsSection,
        tabs,
        interventionsTab,
        modals,
        modalsHandlers,
        toast,
    };
}
