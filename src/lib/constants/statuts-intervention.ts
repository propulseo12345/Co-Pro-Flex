/**
 * Configuration des statuts d'intervention pour le carnet d'entretien
 * Définit les couleurs, icônes et actions disponibles par statut
 */

/** Statuts d'intervention avec sémantique claire */
export type StatutInterventionVisuel = 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE';

export interface StatutConfig {
    valeur: StatutInterventionVisuel;
    label: string;
    labelCourt: string;
    couleur: 'slate' | 'blue' | 'emerald' | 'red';
    icone: 'Calendar' | 'Wrench' | 'CheckCircle' | 'XCircle';
    ordre: number;
}

/** Actions rapides disponibles */
export type ActionRapide = 'cloturer' | 'replanifier' | 'ajouter_pj' | 'annuler';

/** Configuration de chaque statut */
export const STATUTS_INTERVENTION: Record<StatutInterventionVisuel, StatutConfig> = {
    PLANIFIEE: {
        valeur: 'PLANIFIEE',
        label: 'Planifiée',
        labelCourt: 'Planif.',
        couleur: 'slate',
        icone: 'Calendar',
        ordre: 1,
    },
    EN_COURS: {
        valeur: 'EN_COURS',
        label: 'En cours',
        labelCourt: 'En cours',
        couleur: 'blue',
        icone: 'Wrench',
        ordre: 2,
    },
    TERMINEE: {
        valeur: 'TERMINEE',
        label: 'Terminée',
        labelCourt: 'Terminée',
        couleur: 'emerald',
        icone: 'CheckCircle',
        ordre: 3,
    },
    ANNULEE: {
        valeur: 'ANNULEE',
        label: 'Annulée',
        labelCourt: 'Annulée',
        couleur: 'red',
        icone: 'XCircle',
        ordre: 4,
    },
};

/** Couleurs CSS par type de couleur */
export const COULEURS_STATUT = {
    slate: {
        bg: 'var(--color-slate-100, #f1f5f9)',
        text: 'var(--color-slate-700, #334155)',
        border: 'var(--color-slate-300, #cbd5e1)',
        dot: 'var(--color-slate-500, #64748b)',
    },
    blue: {
        bg: 'var(--color-blue-100, #dbeafe)',
        text: 'var(--color-blue-700, #1d4ed8)',
        border: 'var(--color-blue-300, #93c5fd)',
        dot: 'var(--color-blue-500, #3b82f6)',
    },
    emerald: {
        bg: 'var(--color-emerald-100, #d1fae5)',
        text: 'var(--color-emerald-700, #047857)',
        border: 'var(--color-emerald-300, #6ee7b7)',
        dot: 'var(--color-emerald-500, #10b981)',
    },
    red: {
        bg: 'var(--color-red-100, #fee2e2)',
        text: 'var(--color-red-700, #b91c1c)',
        border: 'var(--color-red-300, #fca5a5)',
        dot: 'var(--color-red-500, #ef4444)',
    },
} as const;

/** Actions disponibles par statut */
export const ACTIONS_PAR_STATUT: Record<StatutInterventionVisuel, ActionRapide[]> = {
    PLANIFIEE: ['replanifier', 'ajouter_pj', 'annuler'],
    EN_COURS: ['cloturer', 'ajouter_pj', 'annuler'],
    TERMINEE: ['ajouter_pj'],
    ANNULEE: [],
};

/** Configuration des actions rapides */
export const ACTIONS_CONFIG: Record<ActionRapide, { label: string; icone: 'CheckCircle' | 'Calendar' | 'Paperclip' | 'XCircle'; danger?: boolean }> = {
    cloturer: { label: 'Clôturer', icone: 'CheckCircle' },
    replanifier: { label: 'Replanifier', icone: 'Calendar' },
    ajouter_pj: { label: 'Ajouter PJ / Rapport', icone: 'Paperclip' },
    annuler: { label: 'Annuler', icone: 'XCircle', danger: true },
};
