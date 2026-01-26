import { TypeDocumentTechnique, SousTypeAssurance } from '@/types';

// Helper pour obtenir le label d'une catégorie de document
export const getCategorieDocLabel = (cat: string): string => {
    const labels: Record<string, string> = {
        DTA: 'DTA (Dossier Technique Amiante)',
        DIAGNOSTICS: 'Diagnostics réglementaires',
        CONTROLES: 'Rapports de contrôle',
        GARANTIES: 'Garanties travaux',
        AUTRES: 'Autres documents'
    };
    return labels[cat] || 'Autres';
};

// Helper pour obtenir le label d'un type de document
export const getTypeDocLabel = (type: TypeDocumentTechnique): string => {
    const labels: Record<TypeDocumentTechnique, string> = {
        DTA: 'DTA',
        DIAGNOSTIC_PLOMB: 'Diagnostic plomb',
        DIAGNOSTIC_ELECTRICITE: 'Diagnostic électricité',
        DIAGNOSTIC_GAZ: 'Diagnostic gaz',
        DPE_COLLECTIF: 'DPE collectif',
        CONTROLE_ASCENSEUR: 'Contrôle ascenseur',
        CONTROLE_EXTINCTEURS: 'Contrôle extincteurs',
        CONTROLE_CHAUFFERIE: 'Contrôle chaufferie',
        GARANTIE_DECENNALE: 'Garantie décennale',
        GARANTIE_PARFAIT_ACHEVEMENT: 'Garantie parfait achèvement',
        RAPPORT_SECURITE: 'Rapport sécurité',
        AUTRE: 'Autre'
    };
    return labels[type] || type;
};

// Helper pour vérifier si un document expire bientôt (dans les 90 jours)
export const isDocumentExpiringSoon = (dateValidite?: string): boolean => {
    if (!dateValidite) return false;
    const validite = new Date(dateValidite);
    const now = new Date();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
    return validite > now && validite <= ninetyDaysFromNow;
};

// Helper pour vérifier si un document est expiré
export const isDocumentExpired = (dateValidite?: string): boolean => {
    if (!dateValidite) return false;
    return new Date(dateValidite) < new Date();
};

// Helper pour les labels des types d'assurance
export const getAssuranceTypeLabel = (sousType: SousTypeAssurance): string => {
    switch (sousType) {
        case 'MRI': return 'MRI';
        case 'RC_SYNDICAT': return 'RC Syndicat';
        case 'DOMMAGES_OUVRAGE': return 'Dommages-Ouvrage';
        case 'PROTECTION_JURIDIQUE': return 'Protection Juridique';
        default: return 'Autre';
    }
};

// Helper pour vérifier si une date est dans les 3 prochains mois
export const isEcheanceProche = (dateFin: string): boolean => {
    const echeance = new Date(dateFin);
    const now = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    return echeance <= threeMonthsFromNow && echeance > now;
};

// Helper pour vérifier si la garantie est encore en cours
export const isGarantieEnCours = (dateFin: string): boolean => {
    return new Date(dateFin) > new Date();
};

// Helper pour formater une date en français
export const formatDateFr = (dateStr: string, options?: Intl.DateTimeFormatOptions): string => {
    const defaultOptions: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    };
    return new Date(dateStr).toLocaleDateString('fr-FR', options || defaultOptions);
};

// Helper pour formater un montant en euros
export const formatEuro = (amount: number): string => {
    return amount.toLocaleString() + ' €';
};

// Valeur initiale du formulaire d'intervention
export const getInitialInterventionForm = () => ({
    titre: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    categorie: 'COURANTE' as const,
    type: 'ENTRETIEN' as const,
    statut: 'PLANIFIEE' as const,
    intervenant: '',
    equipementConcerne: '',
    cout: '',
});
