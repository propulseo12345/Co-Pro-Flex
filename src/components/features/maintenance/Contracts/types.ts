import { ContratDetaille, ContratSyndic, StatutContrat, TypeContrat, TypeDocumentSyndic, TypeDocumentAssurance } from '@/types';

// Types d'export disponibles
export type ExportFormat = 'PDF' | 'EXCEL' | 'ACQUEREURS';

// Type de reconduction de contrat
export type TypeReconduction = 'TACITE' | 'EXPRESS' | 'NON_RENOUVELABLE';

// Labels pour les types de reconduction
export const RECONDUCTION_LABELS: Record<TypeReconduction, string> = {
    TACITE: 'Tacite',
    EXPRESS: 'Express',
    NON_RENOUVELABLE: 'Non renouvelable'
};

// Descriptions pour les types de reconduction
export const RECONDUCTION_DESCRIPTIONS: Record<TypeReconduction, string> = {
    TACITE: 'Renouvellement automatique sauf résiliation',
    EXPRESS: 'Renouvellement sur demande explicite',
    NON_RENOUVELABLE: 'Fin définitive à l\'échéance'
};

// Labels pour les types de documents syndic
export const SYNDIC_DOC_LABELS: Record<TypeDocumentSyndic, string> = {
    MANDAT: 'Mandat',
    AVENANT: 'Avenant',
    PV_DESIGNATION: 'PV Désignation',
    RAPPORT_GESTION: 'Rapport de gestion',
    RELEVE_CHARGES: 'Relevé de charges',
    AUTRE: 'Autre'
};

// Labels pour les types de documents assurance
export const ASSURANCE_DOC_LABELS: Record<TypeDocumentAssurance, string> = {
    CONTRAT: 'Contrat',
    CONDITIONS_PARTICULIERES: 'Conditions particulières',
    ATTESTATION: 'Attestation',
    AVENANT: 'Avenant',
    AUTRE: 'Autre'
};

// Interface pour les filtres de contrats
export interface ContractsFilters {
    searchTerm: string;
    statutFilter: StatutContrat | 'TOUS';
    typeFilter: TypeContrat | 'TOUS';
    prestataireFilter: string;
}

// Interface pour les statistiques de contrats
export interface ContractsStats {
    actifs: number;
    aRenouveler: number;
    resilies: number;
    montantTotal: number;
    montantTotalAvecSyndic: number;
}

// Interface pour les alertes de contrats
export interface ContratAlerte extends ContratDetaille {
    joursRestants: number;
    estUrgent: boolean;
}

// Props communes pour les composants
export interface StatusBadgeProps {
    statut: StatutContrat | 'ACTIF' | 'A_RENOUVELER' | 'RESILIE';
}

export interface ActionsDropdownProps {
    contrat: ContratDetaille;
    onModifier: () => void;
    onResilier: () => void;
    onTelecharger: () => void;
}

export interface ExportDropdownProps {
    onExport: (format: ExportFormat) => void;
}

export interface ContractsStatsProps {
    contrats: ContratDetaille[];
    contratSyndic: ContratSyndic;
    onSyndicAction: () => void;
    onEditSyndic: () => void;
}

export interface ContractsAlertSectionProps {
    contrats: ContratDetaille[];
    onAction: (contrat: ContratDetaille) => void;
}

export interface ContractsTableProps {
    contrats: ContratDetaille[];
    onVoirDetails: (contrat: ContratDetaille) => void;
    onModifier: (contrat: ContratDetaille) => void;
    onResilier: (contrat: ContratDetaille) => void;
    onTelecharger: (contrat: ContratDetaille) => void;
}

// Props pour les modals
export interface EditSyndicModalProps {
    contrat: ContratSyndic;
    onSave: (updated: ContratSyndic) => void;
    onClose: () => void;
}

export interface AddContractModalProps {
    isOpen: boolean;
    onClose: () => void;
    prestataires: { id: string; nom: string }[];
    onAdd: (contrat: ContratDetaille) => void;
}

export interface EditContractModalProps {
    contrat: ContratDetaille | null;
    onClose: () => void;
    prestataires: { id: string; nom: string }[];
    onSave: (contrat: ContratDetaille) => void;
}

// Type pour le toast
export interface ToastData {
    message: string;
    type: 'success' | 'error' | 'info';
}
