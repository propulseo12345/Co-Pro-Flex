// NEUTRALIZED: Mock imports removed - will be replaced by Supabase data
import { Impaye, ContratDetaille, OrdreService } from '@/types';

// Placeholder empty arrays until Supabase integration
const MOCK_DEPENSES_BUDGETS: Array<{ poste: string; montant: number }> = [];
const MOCK_IMPAYES: Impaye[] = [];
const MOCK_CONTRATS_DETAILLES: ContratDetaille[] = [];
const MOCK_ORDRES_SERVICE: OrdreService[] = [];
const MOCK_APPELS: Array<{ montantTotal: number; montantEncaisse?: number }> = [];

export type AlertType =
    | 'BUDGET_DEPASSEMENT'
    | 'IMPAYE_CRITIQUE'
    | 'IMPAYE_RELANCE'
    | 'RECOUVREMENT_CRITIQUE'
    | 'RECOUVREMENT_WARNING'
    | 'CONTRAT_EXPIRE'
    | 'CONTRAT_EXPIRE_CRITIQUE'      // Expiré > 30 jours
    | 'CONTRAT_EXPIRE_TRES_CRITIQUE' // Expiré > 60 jours
    | 'CONTRAT_EXPIRATION_J30'
    | 'CONTRAT_EXPIRATION_J60'
    | 'ASSURANCE_EXPIREE'
    | 'ASSURANCE_EXPIREE_CRITIQUE'   // Assurance expirée > 7 jours
    | 'INTERVENTION_AUJOURDHUI'
    | 'INTERVENTION_DANS_7J'
    | 'INTERVENTION_NON_REALISEE'
    | 'INTERVENTION_EN_RETARD'
    | 'ORDRE_SERVICE_BROUILLON'          // Brouillon > 7 jours
    | 'ORDRE_SERVICE_BROUILLON_CRITIQUE' // Brouillon > 14 jours
    | 'ORDRE_SERVICE_BROUILLON_URGENT';  // Brouillon > 30 jours
export type AlertSeverity = 'warning' | 'error' | 'info' | 'critical';

// Configuration des seuils d'alertes contrats (paramétrable)
export const SEUILS_CONTRATS = {
    CRITIQUE: 0,      // Échéance dépassée
    J30: 30,          // 30 jours avant échéance
    J60: 60,          // 60 jours avant échéance (alerte standard)
    J90: 90,          // 90 jours avant échéance (pour affichage)
};

// Seuils d'escalade après expiration (jours dépassés)
export const SEUILS_ESCALADE_EXPIRATION = {
    J7: 7,            // Alerte J+7 (relance)
    J15: 15,          // Alerte J+15 (urgence)
    J30: 30,          // Alerte J+30 (critique)
    J60: 60,          // Alerte J+60 (très critique)
};

// Niveau d'escalade pour les contrats expirés
export type NiveauEscalade = 'standard' | 'relance' | 'urgence' | 'critique' | 'tres_critique';

// Déterminer le niveau d'escalade selon le nombre de jours dépassés
export function getNiveauEscalade(joursDepasses: number): NiveauEscalade {
    if (joursDepasses >= SEUILS_ESCALADE_EXPIRATION.J60) return 'tres_critique';
    if (joursDepasses >= SEUILS_ESCALADE_EXPIRATION.J30) return 'critique';
    if (joursDepasses >= SEUILS_ESCALADE_EXPIRATION.J15) return 'urgence';
    if (joursDepasses >= SEUILS_ESCALADE_EXPIRATION.J7) return 'relance';
    return 'standard';
}

// Actions suggérées selon le niveau d'escalade
export interface ActionContratSuggeree {
    id: string;
    label: string;
    description: string;
    type: 'renouveler' | 'resilier' | 'archiver' | 'contacter';
    priorite: 'haute' | 'moyenne' | 'basse';
}

export const ACTIONS_CONTRAT_EXPIRE: Record<NiveauEscalade, ActionContratSuggeree[]> = {
    standard: [
        { id: 'renouveler', label: 'Renouveler le contrat', description: 'Prolonger le contrat avec le même prestataire', type: 'renouveler', priorite: 'haute' },
        { id: 'contacter', label: 'Contacter le prestataire', description: 'Demander un devis de renouvellement', type: 'contacter', priorite: 'moyenne' },
    ],
    relance: [
        { id: 'renouveler', label: 'Renouveler urgemment', description: 'Le contrat est expiré depuis plus de 7 jours', type: 'renouveler', priorite: 'haute' },
        { id: 'resilier', label: 'Résilier et archiver', description: 'Mettre fin définitivement au contrat', type: 'resilier', priorite: 'moyenne' },
    ],
    urgence: [
        { id: 'renouveler', label: 'Renouveler immédiatement', description: 'Prestation potentiellement non assurée', type: 'renouveler', priorite: 'haute' },
        { id: 'resilier', label: 'Résilier avec motif', description: 'Archiver le contrat avec raison documentée', type: 'resilier', priorite: 'haute' },
    ],
    critique: [
        { id: 'renouveler', label: 'RENOUVELER D\'URGENCE', description: 'Plus de 30 jours sans couverture !', type: 'renouveler', priorite: 'haute' },
        { id: 'resilier', label: 'Clôturer et archiver', description: 'Documenter l\'absence de prestation', type: 'resilier', priorite: 'haute' },
    ],
    tres_critique: [
        { id: 'renouveler', label: 'DÉCISION IMMÉDIATE REQUISE', description: 'Situation critique depuis plus de 60 jours', type: 'renouveler', priorite: 'haute' },
        { id: 'resilier', label: 'Archiver définitivement', description: 'Clôturer avec rapport de non-conformité', type: 'archiver', priorite: 'haute' },
    ],
};

// Configuration des seuils de recouvrement (paramétrable)
export const SEUILS_RECOUVREMENT = {
    CRITIQUE: 50,    // Rouge : < 50%
    WARNING: 70,     // Orange : < 70%
};

// Configuration des seuils d'alertes ordres de service (paramétrable)
export const SEUILS_ORDRE_SERVICE_BROUILLON = {
    WARNING: 7,      // Alerte après 7 jours en brouillon
    ERROR: 14,       // Alerte critique après 14 jours
    URGENT: 30,      // Alerte urgente après 30 jours
};

// Actions suggérées pour les ordres de service en brouillon
export interface ActionOrdreServiceSuggeree {
    id: string;
    label: string;
    description: string;
    type: 'envoyer' | 'supprimer' | 'modifier';
    priorite: 'haute' | 'moyenne' | 'basse';
}

export const ACTIONS_ORDRE_SERVICE_BROUILLON: Record<'warning' | 'error' | 'urgent', ActionOrdreServiceSuggeree[]> = {
    warning: [
        { id: 'envoyer', label: 'Envoyer maintenant', description: 'Envoyer l\'ordre de service au prestataire', type: 'envoyer', priorite: 'haute' },
        { id: 'modifier', label: 'Modifier l\'ordre', description: 'Compléter ou corriger les informations', type: 'modifier', priorite: 'moyenne' },
    ],
    error: [
        { id: 'envoyer', label: 'Envoyer urgemment', description: 'L\'intervention est probablement en retard', type: 'envoyer', priorite: 'haute' },
        { id: 'supprimer', label: 'Supprimer si non pertinent', description: 'Supprimer l\'ordre si l\'intervention n\'est plus nécessaire', type: 'supprimer', priorite: 'moyenne' },
    ],
    urgent: [
        { id: 'envoyer', label: 'ENVOYER IMMÉDIATEMENT', description: 'Intervention en retard critique - risque de non-conformité', type: 'envoyer', priorite: 'haute' },
        { id: 'supprimer', label: 'Supprimer avec justification', description: 'Documenter la raison de l\'annulation', type: 'supprimer', priorite: 'haute' },
    ],
};

// Actions suggérées pour le recouvrement
export interface ActionSuggeree {
    id: string;
    label: string;
    description: string;
    delai: string;
    priorite: 'haute' | 'moyenne' | 'basse';
    icon: string;
}

export const ACTIONS_RECOUVREMENT: ActionSuggeree[] = [
    {
        id: 'relance-amiable',
        label: 'Relance amiable',
        description: 'Envoyer un rappel par email aux copropriétaires en retard',
        delai: 'J+15',
        priorite: 'haute',
        icon: 'Mail'
    },
    {
        id: 'relance-lrar',
        label: 'Lettre RAR',
        description: 'Envoyer une lettre recommandée avec accusé de réception',
        delai: 'J+30',
        priorite: 'haute',
        icon: 'FileText'
    },
    {
        id: 'mise-en-demeure',
        label: 'Mise en demeure',
        description: 'Envoyer une mise en demeure formelle de payer',
        delai: 'J+45',
        priorite: 'moyenne',
        icon: 'AlertTriangle'
    },
    {
        id: 'plan-apurement',
        label: 'Plan d\'apurement',
        description: 'Proposer un échéancier de paiement aux copropriétaires en difficulté',
        delai: 'Sur demande',
        priorite: 'moyenne',
        icon: 'Calendar'
    },
    {
        id: 'contentieux',
        label: 'Procédure contentieuse',
        description: 'Engager une procédure judiciaire pour recouvrement',
        delai: 'J+90',
        priorite: 'basse',
        icon: 'Scale'
    }
];

export interface Alert {
    id: string;
    type: AlertType;
    severity: AlertSeverity;
    title: string;
    message: string;
    link: string;
    data?: {
        poste?: string;
        pourcentage?: number;
        montant?: number;
        proprietaire?: string;
        retard?: number;
        tauxRecouvrement?: number;
        montantTotal?: number;
        montantEncaisse?: number;
        montantRestant?: number;
        actionsSuggerees?: ActionSuggeree[];
        // Données spécifiques aux contrats
        contratId?: string;
        contratNom?: string;
        contratType?: string;
        fournisseur?: string;
        joursRestants?: number;
        joursDepasses?: number;         // Jours depuis expiration
        niveauEscalade?: NiveauEscalade; // Niveau d'escalade
        dateFin?: string;
        estAssurance?: boolean;
        estReglementaire?: boolean;
        actionsContrat?: ActionContratSuggeree[]; // Actions suggérées pour contrats
        // Données spécifiques aux interventions
        interventionId?: string;
        interventionTitre?: string;
        intervenant?: string;
        dateIntervention?: string;
        joursDepuis?: number;
        // Données spécifiques aux ordres de service
        ordreServiceId?: string;
        ordreServiceTitre?: string;
        ordreServiceType?: string;
        prestataire?: string;
        joursEnBrouillon?: number;
        dateCreation?: string;
        estContractuel?: boolean;
        actionsOrdreService?: ActionOrdreServiceSuggeree[];
    };
}

// Configuration des budgets votés par poste
const BUDGET_CONFIG: Record<string, { budget: number; label: string }> = {
    eau: { budget: 12000, label: 'Eau' },
    electricite: { budget: 8500, label: 'Électricité' },
    assurance: { budget: 18500, label: 'Assurance' },
    menage: { budget: 15000, label: 'Ménage' },
    ascenseur: { budget: 12000, label: 'Ascenseur' },
    espaces_verts: { budget: 11000, label: 'Espaces verts' },
    divers: { budget: 10000, label: 'Divers' }
};

// Calculer les alertes de budget (>90%)
function getBudgetAlerts(): Alert[] {
    const alerts: Alert[] = [];

    Object.entries(BUDGET_CONFIG).forEach(([poste, config]) => {
        const consomme = MOCK_DEPENSES_BUDGETS
            .filter(d => d.poste === poste)
            .reduce((sum, d) => sum + d.montant, 0);

        const pourcentage = (consomme / config.budget) * 100;

        if (pourcentage >= 90) {
            const isOverBudget = pourcentage >= 100;
            alerts.push({
                id: `budget-${poste}`,
                type: 'BUDGET_DEPASSEMENT',
                severity: isOverBudget ? 'error' : 'warning',
                title: isOverBudget ? 'Budget dépassé' : 'Alerte budget',
                message: `${config.label} : ${pourcentage.toFixed(0)}% consommé`,
                link: '/finance/budgets',
                data: {
                    poste: config.label,
                    pourcentage,
                    montant: consomme
                }
            });
        }
    });

    return alerts;
}

// Calculer les alertes d'impayés
function getImpayesAlerts(): Alert[] {
    const alerts: Alert[] = [];

    MOCK_IMPAYES.forEach((impaye: Impaye) => {
        // Alertes pour les contentieux (critiques)
        if (impaye.statut === 'CONTENTIEUX') {
            alerts.push({
                id: `impaye-contentieux-${impaye.id}`,
                type: 'IMPAYE_CRITIQUE',
                severity: 'error',
                title: 'Contentieux actif',
                message: `${impaye.proprietaire} - ${impaye.montantDu.toLocaleString('fr-FR')} €`,
                link: '/finance/unpaid',
                data: {
                    proprietaire: impaye.proprietaire,
                    montant: impaye.montantDu,
                    retard: impaye.retard
                }
            });
        }
        // Alertes pour retards importants (>60 jours)
        else if (impaye.retard > 60) {
            alerts.push({
                id: `impaye-retard-${impaye.id}`,
                type: 'IMPAYE_RELANCE',
                severity: 'warning',
                title: 'Impayé en retard',
                message: `${impaye.proprietaire} - ${impaye.retard} jours de retard`,
                link: '/finance/unpaid',
                data: {
                    proprietaire: impaye.proprietaire,
                    montant: impaye.montantDu,
                    retard: impaye.retard
                }
            });
        }
    });

    return alerts;
}

// Calculer les alertes de taux de recouvrement
export function getRecouvrementAlerts(): Alert[] {
    const alerts: Alert[] = [];

    // Calculer le taux de recouvrement global
    const montantTotal = MOCK_APPELS.reduce((sum, a) => sum + a.montantTotal, 0);
    const montantEncaisse = MOCK_APPELS.reduce((sum, a) => sum + (a.montantEncaisse || 0), 0);
    const tauxRecouvrement = montantTotal > 0 ? (montantEncaisse / montantTotal) * 100 : 0;
    const montantRestant = montantTotal - montantEncaisse;

    // Alerte critique : taux < 50%
    if (tauxRecouvrement < SEUILS_RECOUVREMENT.CRITIQUE) {
        alerts.push({
            id: 'recouvrement-critique',
            type: 'RECOUVREMENT_CRITIQUE',
            severity: 'error',
            title: 'Taux de recouvrement critique',
            message: `Seulement ${tauxRecouvrement.toFixed(1)}% des appels de fonds encaissés. ${montantRestant.toLocaleString('fr-FR')} € restent à recouvrer.`,
            link: '/finance/appels-fonds',
            data: {
                tauxRecouvrement,
                montantTotal,
                montantEncaisse,
                montantRestant,
                pourcentage: tauxRecouvrement,
                actionsSuggerees: ACTIONS_RECOUVREMENT.filter(a => a.priorite === 'haute')
            }
        });
    }
    // Alerte warning : taux entre 50% et 70%
    else if (tauxRecouvrement < SEUILS_RECOUVREMENT.WARNING) {
        alerts.push({
            id: 'recouvrement-warning',
            type: 'RECOUVREMENT_WARNING',
            severity: 'warning',
            title: 'Taux de recouvrement insuffisant',
            message: `${tauxRecouvrement.toFixed(1)}% des appels de fonds encaissés. Attention à la trésorerie.`,
            link: '/finance/appels-fonds',
            data: {
                tauxRecouvrement,
                montantTotal,
                montantEncaisse,
                montantRestant,
                pourcentage: tauxRecouvrement,
                actionsSuggerees: ACTIONS_RECOUVREMENT.filter(a => a.priorite !== 'basse')
            }
        });
    }

    return alerts;
}

// Récupérer les stats de recouvrement (pour utilisation externe)
export function getRecouvrementStats() {
    const montantTotal = MOCK_APPELS.reduce((sum, a) => sum + a.montantTotal, 0);
    const montantEncaisse = MOCK_APPELS.reduce((sum, a) => sum + (a.montantEncaisse || 0), 0);
    const tauxRecouvrement = montantTotal > 0 ? (montantEncaisse / montantTotal) * 100 : 0;
    const montantRestant = montantTotal - montantEncaisse;

    return {
        montantTotal,
        montantEncaisse,
        montantRestant,
        tauxRecouvrement,
        isCritique: tauxRecouvrement < SEUILS_RECOUVREMENT.CRITIQUE,
        isWarning: tauxRecouvrement < SEUILS_RECOUVREMENT.WARNING,
        seuilCritique: SEUILS_RECOUVREMENT.CRITIQUE,
        seuilWarning: SEUILS_RECOUVREMENT.WARNING
    };
}

// Calculer les jours restants avant échéance
function getJoursAvantEcheance(dateFin: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const echeance = new Date(dateFin);
    echeance.setHours(0, 0, 0, 0);
    const diffTime = echeance.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Calculer les alertes de contrats (expirés et proches échéance)
// Avec système d'escalade selon le retard après expiration
export function getContractAlerts(): Alert[] {
    const alerts: Alert[] = [];

    MOCK_CONTRATS_DETAILLES.forEach((contrat: ContratDetaille) => {
        // On ne traite que les contrats actifs, à renouveler ou expirés
        if (contrat.statut !== 'ACTIF' && contrat.statut !== 'A_RENOUVELER' && contrat.statut !== 'EXPIRE') {
            return;
        }

        const joursRestants = getJoursAvantEcheance(contrat.dateFin);
        const estAssurance = contrat.type === 'ASSURANCE';
        const delaiAlerte = contrat.delaiResiliation || SEUILS_CONTRATS.J60;

        // CONTRAT EXPIRÉ - Alertes escaladées selon le retard
        if (joursRestants < 0) {
            const joursDepasses = Math.abs(joursRestants);
            const niveauEscalade = getNiveauEscalade(joursDepasses);
            const actions = ACTIONS_CONTRAT_EXPIRE[niveauEscalade];

            if (estAssurance) {
                // Assurance expirée = risque juridique majeur avec escalade
                const estCritique = joursDepasses >= SEUILS_ESCALADE_EXPIRATION.J7;
                alerts.push({
                    id: `assurance-expiree-${contrat.id}`,
                    type: estCritique ? 'ASSURANCE_EXPIREE_CRITIQUE' : 'ASSURANCE_EXPIREE',
                    severity: niveauEscalade === 'tres_critique' || niveauEscalade === 'critique' ? 'critical' : 'error',
                    title: getAlerteTitreAssurance(joursDepasses, niveauEscalade),
                    message: getAlerteMessageAssurance(contrat, joursDepasses, niveauEscalade),
                    link: '/maintenance/contracts',
                    data: {
                        contratId: contrat.id,
                        contratNom: contrat.nom,
                        contratType: contrat.type,
                        fournisseur: contrat.fournisseur,
                        joursRestants,
                        joursDepasses,
                        niveauEscalade,
                        dateFin: contrat.dateFin,
                        estAssurance: true,
                        estReglementaire: contrat.estReglementaire,
                        actionsContrat: actions
                    }
                });
            } else {
                // Autre contrat expiré avec escalade
                alerts.push({
                    id: `contrat-expire-${contrat.id}`,
                    type: getContratExpireType(niveauEscalade),
                    severity: getContratExpireSeverity(niveauEscalade, contrat.estReglementaire),
                    title: getAlerteTitreContrat(joursDepasses, niveauEscalade, contrat.estReglementaire),
                    message: getAlerteMessageContrat(contrat, joursDepasses, niveauEscalade),
                    link: '/maintenance/contracts',
                    data: {
                        contratId: contrat.id,
                        contratNom: contrat.nom,
                        contratType: contrat.type,
                        fournisseur: contrat.fournisseur,
                        joursRestants,
                        joursDepasses,
                        niveauEscalade,
                        dateFin: contrat.dateFin,
                        estAssurance: false,
                        estReglementaire: contrat.estReglementaire,
                        actionsContrat: actions
                    }
                });
            }
        }
        // ALERTE J-30 : Statut devrait passer à "À renouveler"
        else if (joursRestants <= SEUILS_CONTRATS.J30) {
            const severity = estAssurance || contrat.estReglementaire ? 'error' : 'warning';
            alerts.push({
                id: `contrat-j30-${contrat.id}`,
                type: 'CONTRAT_EXPIRATION_J30',
                severity,
                title: estAssurance ? 'Assurance à renouveler urgemment' : 'Contrat à renouveler',
                message: `${contrat.nom} expire dans ${joursRestants} jour${joursRestants > 1 ? 's' : ''}${estAssurance ? ' - Renouvellement prioritaire' : ''}`,
                link: '/maintenance/contracts',
                data: {
                    contratId: contrat.id,
                    contratNom: contrat.nom,
                    contratType: contrat.type,
                    fournisseur: contrat.fournisseur,
                    joursRestants,
                    dateFin: contrat.dateFin,
                    estAssurance,
                    estReglementaire: contrat.estReglementaire,
                    actionsContrat: ACTIONS_CONTRAT_EXPIRE.standard
                }
            });
        }
        // ALERTE J-60 : Notification préventive
        else if (joursRestants <= delaiAlerte || joursRestants <= SEUILS_CONTRATS.J60) {
            alerts.push({
                id: `contrat-j60-${contrat.id}`,
                type: 'CONTRAT_EXPIRATION_J60',
                severity: estAssurance ? 'warning' : 'info',
                title: 'Échéance contrat approche',
                message: `${contrat.nom} expire dans ${joursRestants} jours (délai résiliation : ${delaiAlerte}j)`,
                link: '/maintenance/contracts',
                data: {
                    contratId: contrat.id,
                    contratNom: contrat.nom,
                    contratType: contrat.type,
                    fournisseur: contrat.fournisseur,
                    joursRestants,
                    dateFin: contrat.dateFin,
                    estAssurance,
                    estReglementaire: contrat.estReglementaire,
                    actionsContrat: ACTIONS_CONTRAT_EXPIRE.standard
                }
            });
        }
    });

    // Trier par urgence (critiques d'abord, puis par jours dépassés/restants)
    return alerts.sort((a, b) => {
        // Priorité aux alertes critiques
        const severityOrder: Record<AlertSeverity, number> = { critical: 0, error: 1, warning: 2, info: 3 };
        const sevA = severityOrder[a.severity] ?? 4;
        const sevB = severityOrder[b.severity] ?? 4;
        if (sevA !== sevB) return sevA - sevB;

        // Puis par jours (expirés avec plus de jours dépassés en premier)
        const joursA = a.data?.joursRestants ?? 999;
        const joursB = b.data?.joursRestants ?? 999;
        return joursA - joursB;
    });
}

// Fonctions helper pour les alertes escaladées
function getContratExpireType(niveau: NiveauEscalade): AlertType {
    if (niveau === 'tres_critique') return 'CONTRAT_EXPIRE_TRES_CRITIQUE';
    if (niveau === 'critique') return 'CONTRAT_EXPIRE_CRITIQUE';
    return 'CONTRAT_EXPIRE';
}

function getContratExpireSeverity(niveau: NiveauEscalade, estReglementaire?: boolean): AlertSeverity {
    if (niveau === 'tres_critique' || niveau === 'critique') return 'critical';
    if (niveau === 'urgence' || estReglementaire) return 'error';
    return 'warning';
}

function getAlerteTitreContrat(joursDepasses: number, niveau: NiveauEscalade, estReglementaire?: boolean): string {
    const prefixe = estReglementaire ? '⚠️ ' : '';
    switch (niveau) {
        case 'tres_critique':
            return `${prefixe}CONTRAT EXPIRÉ DEPUIS ${joursDepasses}J - ACTION REQUISE`;
        case 'critique':
            return `${prefixe}Contrat expiré - Situation critique (J+${joursDepasses})`;
        case 'urgence':
            return `${prefixe}Contrat expiré - Urgence (J+${joursDepasses})`;
        case 'relance':
            return `${prefixe}Contrat expiré - Relance (J+${joursDepasses})`;
        default:
            return `${prefixe}Contrat expiré`;
    }
}

function getAlerteMessageContrat(contrat: ContratDetaille, joursDepasses: number, niveau: NiveauEscalade): string {
    const base = `${contrat.nom} (${contrat.fournisseur}) a expiré il y a ${joursDepasses} jour${joursDepasses > 1 ? 's' : ''}.`;
    switch (niveau) {
        case 'tres_critique':
            return `${base} DÉCISION IMMÉDIATE REQUISE : Renouveler ou résilier définitivement.`;
        case 'critique':
            return `${base} Prestation potentiellement non assurée depuis plus d'un mois.`;
        case 'urgence':
            return `${base} Risque d'interruption de service. Action urgente recommandée.`;
        case 'relance':
            return `${base} Contacter le prestataire pour renouvellement ou résiliation.`;
        default:
            return base;
    }
}

function getAlerteTitreAssurance(joursDepasses: number, niveau: NiveauEscalade): string {
    switch (niveau) {
        case 'tres_critique':
            return `🚨 ASSURANCE EXPIRÉE DEPUIS ${joursDepasses}J - RISQUE MAJEUR`;
        case 'critique':
            return `⚠️ ASSURANCE EXPIRÉE - Situation critique (J+${joursDepasses})`;
        case 'urgence':
            return `⚠️ Assurance expirée - Urgence (J+${joursDepasses})`;
        case 'relance':
            return `⚠️ Assurance expirée - Relance (J+${joursDepasses})`;
        default:
            return '⚠️ Assurance expirée - URGENT';
    }
}

function getAlerteMessageAssurance(contrat: ContratDetaille, joursDepasses: number, niveau: NiveauEscalade): string {
    const base = `${contrat.nom} (${contrat.fournisseur}) a expiré il y a ${joursDepasses} jour${joursDepasses > 1 ? 's' : ''}.`;
    switch (niveau) {
        case 'tres_critique':
            return `${base} RISQUE JURIDIQUE MAJEUR ! La copropriété est sans couverture depuis plus de 60 jours.`;
        case 'critique':
            return `${base} La copropriété est exposée sans assurance depuis plus de 30 jours. Action immédiate requise.`;
        case 'urgence':
            return `${base} Risque juridique important. Renouvellement prioritaire.`;
        case 'relance':
            return `${base} Risque juridique. Contacter l'assureur immédiatement.`;
        default:
            return `${base} Risque juridique majeur !`;
    }
}

// Stats des contrats pour utilisation externe
export function getContractStats() {
    const stats = {
        totalActifs: 0,
        expires: 0,
        aRenouvelerJ30: 0,
        alerteJ60: 0,
        assurancesExpirees: 0,
        contratsReglementairesExpires: 0,
    };

    MOCK_CONTRATS_DETAILLES.forEach((contrat: ContratDetaille) => {
        if (contrat.statut !== 'ACTIF' && contrat.statut !== 'A_RENOUVELER') return;

        stats.totalActifs++;
        const joursRestants = getJoursAvantEcheance(contrat.dateFin);

        if (joursRestants < 0) {
            stats.expires++;
            if (contrat.type === 'ASSURANCE') stats.assurancesExpirees++;
            if (contrat.estReglementaire) stats.contratsReglementairesExpires++;
        } else if (joursRestants <= SEUILS_CONTRATS.J30) {
            stats.aRenouvelerJ30++;
        } else if (joursRestants <= SEUILS_CONTRATS.J60) {
            stats.alerteJ60++;
        }
    });

    return stats;
}

// Calculer les jours depuis la création d'un ordre de service
function getJoursDepuisCreation(dateCreation: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const creation = new Date(dateCreation);
    creation.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - creation.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Calculer les alertes d'ordres de service en brouillon
export function getOrdreServiceAlerts(): Alert[] {
    const alerts: Alert[] = [];

    MOCK_ORDRES_SERVICE.forEach((os: OrdreService) => {
        // On ne traite que les ordres en brouillon
        if (os.statut !== 'BROUILLON') {
            return;
        }

        const joursEnBrouillon = getJoursDepuisCreation(os.dateCreation);
        const estContractuel = os.typeOrdre === 'CONTRACTUEL';

        // URGENT : > 30 jours en brouillon
        if (joursEnBrouillon >= SEUILS_ORDRE_SERVICE_BROUILLON.URGENT) {
            alerts.push({
                id: `os-brouillon-urgent-${os.id}`,
                type: 'ORDRE_SERVICE_BROUILLON_URGENT',
                severity: 'critical',
                title: `ORDRE NON ENVOYÉ DEPUIS ${joursEnBrouillon} JOURS`,
                message: `"${os.titre}" n'a jamais été envoyé. ${estContractuel ? 'Intervention contractuelle probablement non réalisée - Risque de non-conformité.' : 'Intervention probablement non réalisée.'}`,
                link: `/maintenance/service-orders/${os.id}`,
                data: {
                    ordreServiceId: os.id,
                    ordreServiceTitre: os.titre,
                    ordreServiceType: os.typeOrdre as string,
                    prestataire: os.fournisseurNom,
                    joursEnBrouillon,
                    dateCreation: os.dateCreation,
                    estContractuel,
                    actionsOrdreService: ACTIONS_ORDRE_SERVICE_BROUILLON.urgent
                }
            });
        }
        // CRITIQUE : > 14 jours en brouillon
        else if (joursEnBrouillon >= SEUILS_ORDRE_SERVICE_BROUILLON.ERROR) {
            alerts.push({
                id: `os-brouillon-critique-${os.id}`,
                type: 'ORDRE_SERVICE_BROUILLON_CRITIQUE',
                severity: 'error',
                title: `Ordre en brouillon depuis ${joursEnBrouillon} jours`,
                message: `"${os.titre}" (${os.fournisseurNom}) n'a pas été envoyé. ${estContractuel ? 'Intervention contractuelle en retard.' : 'Action requise.'}`,
                link: `/maintenance/service-orders/${os.id}`,
                data: {
                    ordreServiceId: os.id,
                    ordreServiceTitre: os.titre,
                    ordreServiceType: os.typeOrdre as string,
                    prestataire: os.fournisseurNom,
                    joursEnBrouillon,
                    dateCreation: os.dateCreation,
                    estContractuel,
                    actionsOrdreService: ACTIONS_ORDRE_SERVICE_BROUILLON.error
                }
            });
        }
        // WARNING : > 7 jours en brouillon
        else if (joursEnBrouillon >= SEUILS_ORDRE_SERVICE_BROUILLON.WARNING) {
            alerts.push({
                id: `os-brouillon-${os.id}`,
                type: 'ORDRE_SERVICE_BROUILLON',
                severity: 'warning',
                title: `Ordre en brouillon depuis ${joursEnBrouillon} jours`,
                message: `"${os.titre}" (${os.fournisseurNom}) attend d'être envoyé.`,
                link: `/maintenance/service-orders/${os.id}`,
                data: {
                    ordreServiceId: os.id,
                    ordreServiceTitre: os.titre,
                    ordreServiceType: os.typeOrdre as string,
                    prestataire: os.fournisseurNom,
                    joursEnBrouillon,
                    dateCreation: os.dateCreation,
                    estContractuel,
                    actionsOrdreService: ACTIONS_ORDRE_SERVICE_BROUILLON.warning
                }
            });
        }
    });

    // Trier par urgence (critiques d'abord, puis par jours en brouillon)
    return alerts.sort((a, b) => {
        const severityOrder: Record<AlertSeverity, number> = { critical: 0, error: 1, warning: 2, info: 3 };
        const sevA = severityOrder[a.severity] ?? 4;
        const sevB = severityOrder[b.severity] ?? 4;
        if (sevA !== sevB) return sevA - sevB;

        // Puis par jours en brouillon (plus longtemps = plus urgent)
        const joursA = a.data?.joursEnBrouillon ?? 0;
        const joursB = b.data?.joursEnBrouillon ?? 0;
        return joursB - joursA;
    });
}

// Stats des ordres de service en brouillon pour utilisation externe
export function getOrdreServiceBrouillonStats() {
    const stats = {
        totalBrouillons: 0,
        alerteJ7: 0,
        alerteJ14: 0,
        alerteJ30: 0,
        contractuelsEnAttente: 0,
    };

    MOCK_ORDRES_SERVICE.forEach((os: OrdreService) => {
        if (os.statut !== 'BROUILLON') return;

        stats.totalBrouillons++;
        const joursEnBrouillon = getJoursDepuisCreation(os.dateCreation);

        if (joursEnBrouillon >= SEUILS_ORDRE_SERVICE_BROUILLON.URGENT) {
            stats.alerteJ30++;
        } else if (joursEnBrouillon >= SEUILS_ORDRE_SERVICE_BROUILLON.ERROR) {
            stats.alerteJ14++;
        } else if (joursEnBrouillon >= SEUILS_ORDRE_SERVICE_BROUILLON.WARNING) {
            stats.alerteJ7++;
        }

        if (os.typeOrdre === 'CONTRACTUEL') {
            stats.contractuelsEnAttente++;
        }
    });

    return stats;
}

// Fonction principale pour obtenir toutes les alertes
// Les alertes du carnet d'entretien (interventions) sont désormais servies
// directement par la vue Supabase v_logbook_alerts via le hook useLogbook.
export function getAllAlerts(): Alert[] {
    return [
        ...getBudgetAlerts(),
        ...getImpayesAlerts(),
        ...getRecouvrementAlerts(),
        ...getContractAlerts(),
        ...getOrdreServiceAlerts()
    ];
}

// Compter les alertes par sévérité
export function getAlertCounts(): { total: number; warnings: number; errors: number } {
    const alerts = getAllAlerts();
    return {
        total: alerts.length,
        warnings: alerts.filter(a => a.severity === 'warning').length,
        errors: alerts.filter(a => a.severity === 'error').length
    };
}
