import { TypeDocumentTechnique, DocumentTechnique, ContratAssurance, ContratDetaille, TravauxPrevisionnel, Prestataire, InformationsCopropriete } from '@/types';
import type { ActionRapide } from '@/lib/constants/statuts-intervention';

// ================================
// Types pour EquipementCombobox
// ================================

/** Équipement (existant ou libre) */
export interface Equipement {
    id: string;
    nom: string;
    /** Lié à un contrat référencé */
    estReference: boolean;
    /** Catégorie (optionnel) */
    categorie?: string;
    contratId?: string;
}

/** Option dans l'autocomplétion */
export interface EquipementOption {
    value: string;        // ID ou "__new__"
    label: string;        // Nom affiché
    equipement?: Equipement;
    estNouveau: boolean;  // true = création à la volée
}

/** Props du composant EquipementCombobox */
export interface EquipementComboboxProps {
    value: string;
    equipementsPrincipaux: string[];
    onChange: (equipement: string) => void;
    placeholder?: string;
    disabled?: boolean;
    error?: string;
}

// ================================
// Types pour UX Interventions
// ================================

/** Filtres avancés pour les interventions */
export interface FiltresInterventions {
    statuts: InterventionStatut[];
    equipementId: string | null;
    prestataireId: string | null;
    dateDebut: Date | null;
    dateFin: Date | null;
    recherche: string;
}

/** Props pour la barre de filtres */
export interface BarreFiltresInterventionsProps {
    filtres: FiltresInterventions;
    onFiltreChange: <K extends keyof FiltresInterventions>(cle: K, valeur: FiltresInterventions[K]) => void;
    onToggleStatut: (statut: InterventionStatut) => void;
    onReset: () => void;
    nbFiltresActifs: number;
    equipements: string[];
    prestataires: { id: string; nom: string }[];
}

/** Props pour le menu d'actions rapides */
export interface MenuActionsRapidesProps {
    actions: ActionRapide[];
    onAction: (action: ActionRapide) => void;
}

/** Props pour une carte d'intervention */
export interface InterventionCardProps {
    intervention: Intervention;
    onEdit: (intervention: Intervention) => void;
    onActionRapide: (intervention: Intervention, action: ActionRapide) => void;
}

// ================================
// Types pour Intervention
// ================================

// Type pour une intervention
export interface Intervention {
    id: string;
    date: string;
    titre: string;
    description: string;
    statut: InterventionStatut;
    categorie: InterventionCategorie;
    type: InterventionType;
    cout?: number;
    intervenant: string;
    prestataireId?: string;
    equipementConcerne?: string;
    contratId?: string;
    ordreServiceId?: string;
    documentsAssocies?: string[];
}

export type InterventionStatut = 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE';
export type InterventionCategorie = 'COURANTE' | 'TRAVAUX_IMPORTANTS';
export type InterventionType = 'ENTRETIEN' | 'REPARATION' | 'INSPECTION';
export type ExportFormat = 'PDF_COMPLET' | 'PDF_ACQUEREURS' | 'EXCEL';
export type ActiveTab = 'interventions' | 'travaux';
export type InterventionView = 'all' | 'courantes' | 'travaux';

/** Filtre actif sur les tuiles KPI */
export type FiltreKpi =
    | 'en_cours'          // Interventions en cours
    | 'planifiees'        // Interventions planifiées
    | 'travaux_prevus'    // Travaux prévisionnels
    | 'travaux_votes'     // Travaux votés en AG
    | 'cout_annee'        // Coût total année
    | 'urgences'          // Interventions urgentes
    | null;               // Aucun filtre actif

/** Résultat de création d'une intervention */
export interface ResultatCreationIntervention {
    succes: boolean;
    intervention?: Intervention;
    erreur?: string;
    /** L'intervention est-elle visible avec le filtre actuel ? */
    visibleAvecFiltreActuel: boolean;
    filtreActuel?: FiltreKpi;
    /** Label du filtre pour l'affichage */
    labelFiltre?: string;
}

/** Type du toast affiché après création */
export type ToastType = 'success' | 'warning' | 'error';

/** Props du toast de création */
export interface ToastCreationProps {
    visible: boolean;
    type: ToastType;
    titre: string;
    message: string;
    intervention?: Intervention;
    estVisibleAvecFiltre: boolean;
    labelFiltre?: string;
    onClose: () => void;
    onVoirIntervention?: () => void;
    onAfficherTout?: () => void;
}

// Formulaire de création/édition d'intervention
export interface InterventionFormData {
    titre: string;
    description: string;
    date: string;
    categorie: InterventionCategorie;
    type: InterventionType;
    statut: InterventionStatut;
    intervenant: string;
    equipementConcerne: string;
    cout: string;
}

// Données du formulaire copropriété
export interface CoproprieteFormData {
    nom: string;
    adresse: string;
    codePostal: string;
    ville: string;
    anneeConstruction: number;
    nombreBatiments: number;
    nombreLots: number;
    syndicNom: string;
    syndicTelephone: string;
    syndicEmail: string;
}

// Statistiques par catégorie
export interface CategorieStats {
    total: number;
    terminees: number;
    enCours: number;
    planifiees: number;
    coutTotal: number;
    coutTermine: number;
}

export interface StatsCategorie {
    courantes: CategorieStats;
    travaux: CategorieStats;
    global: CategorieStats;
}

// Statistiques des documents
export interface DocumentStats {
    total: number;
    expired: number;
    expiring: number;
    valid: number;
}

// KPIs
export interface LogbookKpis {
    enCours: number;
    planifiees: number;
    travauxPrevus: number;
    travauxVotes: number;
    coutAnnee: number;
    urgences: number;
}

// Catégories de documents
export type DocumentCategory = 'DTA' | 'DIAGNOSTICS' | 'CONTROLES' | 'GARANTIES' | 'AUTRES';

export const CATEGORIES_DOCUMENTS: Record<string, TypeDocumentTechnique[]> = {
    DTA: ['DTA'],
    DIAGNOSTICS: ['DIAGNOSTIC_PLOMB', 'DIAGNOSTIC_ELECTRICITE', 'DIAGNOSTIC_GAZ', 'DPE_COLLECTIF'],
    CONTROLES: ['CONTROLE_ASCENSEUR', 'CONTROLE_EXTINCTEURS', 'CONTROLE_CHAUFFERIE', 'RAPPORT_SECURITE'],
    GARANTIES: ['GARANTIE_DECENNALE', 'GARANTIE_PARFAIT_ACHEVEMENT']
};

// Documents groupés par catégorie
export interface DocumentsByCategory {
    DTA: DocumentTechnique[];
    DIAGNOSTICS: DocumentTechnique[];
    CONTROLES: DocumentTechnique[];
    GARANTIES: DocumentTechnique[];
    AUTRES: DocumentTechnique[];
}

// Props des composants
export interface LogbookHeaderProps {
    formData: CoproprieteFormData;
    kpis: LogbookKpis;
    showExportMenu: boolean;
    filtreActif: FiltreKpi;
    onToggleExportMenu: () => void;
    onExport: (format: ExportFormat) => void;
    onNewIntervention: () => void;
    onFiltreChange: (filtre: FiltreKpi) => void;
}

export interface LogbookInfoSectionProps {
    formData: CoproprieteFormData;
    coproprieteInfo: InformationsCopropriete;
    isEditing: boolean;
    isSimplifiedView: boolean;
    equipementsPrincipaux: string[];
    onFormDataChange: (data: CoproprieteFormData) => void;
    onToggleEdit: () => void;
    onToggleSimplifiedView: () => void;
    onSaveInfo: () => void;
    onSelectEquipement: (equipement: string) => void;
}

export interface LogbookAssurancesProps {
    assurances: ContratAssurance[];
    onSelectAssurance: (assurance: ContratAssurance) => void;
}

export interface LogbookContratsProps {
    contrats: ContratDetaille[];
}

export interface InterventionsTabProps {
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
    onInterventionViewChange: (view: InterventionView) => void;
    onSearchChange: (value: string) => void;
    onStatutFilterChange: (value: string) => void;
    onPrestataireFilterChange: (value: string) => void;
    onEquipementFilterChange: (value: string) => void;
    onAnneeFilterChange: (value: string) => void;
    onEditIntervention: (intervention: Intervention) => void;
}

export interface TravauxTabProps {
    travaux: TravauxPrevisionnel[];
}

export interface DocumentsTabProps {
    documents: DocumentTechnique[];
    filteredDocuments: DocumentTechnique[];
    documentsByCategory: DocumentsByCategory;
    documentStats: DocumentStats;
    searchDocuments: string;
    categorieDocFilter: string;
    expandedCategories: string[];
    onSearchChange: (value: string) => void;
    onCategorieFilterChange: (value: string) => void;
    onToggleCategory: (category: string) => void;
    onSelectDocument: (doc: DocumentTechnique) => void;
}

// Props des modals
export interface EquipementModalProps {
    equipement: string;
    contrats: ContratDetaille[];
    interventions: Intervention[];
    documents: DocumentTechnique[];
    onClose: () => void;
    onFilterByEquipement: () => void;
}

export interface DocumentModalProps {
    document: DocumentTechnique;
    onClose: () => void;
}

export interface InterventionFormModalProps {
    isOpen: boolean;
    isEditing: boolean;
    formData: InterventionFormData;
    equipementsPrincipaux: string[];
    onFormDataChange: (data: InterventionFormData) => void;
    onSubmit: () => void;
    onClose: () => void;
}

export interface AssuranceModalProps {
    assurance: ContratAssurance;
    onClose: () => void;
}
