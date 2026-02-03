import type { LucideIcon } from 'lucide-react';

/**
 * Statut d'une étape du workflow AG
 * - completed: étape terminée (icône verte)
 * - current: étape active en cours (icône accent avec pulse)
 * - pending: étape à venir mais accessible
 * - locked: étape verrouillée (non accessible)
 */
export type StepStatus = 'completed' | 'current' | 'pending' | 'locked';

/**
 * Modèle d'une étape individuelle
 */
export interface StepItemModel {
    id: string;
    numero: number;
    titre: string;
    icon: LucideIcon;
    status: StepStatus;
    optional?: boolean;
    isClickable?: boolean;
    onClick?: () => void;
}

/**
 * Modèle d'un groupe d'étapes (carte)
 */
export interface StepGroupModel {
    id: string;
    titre: string;
    subtitle: string;
    icon: LucideIcon;
    steps: StepItemModel[];
    completedCount: number;
    totalCount: number;
    isActive: boolean;
    isCompleted: boolean;
}

/**
 * Configuration d'une étape (données statiques)
 */
export interface StepConfig {
    id: string;
    numero: number;
    titre: string;
    path: string;
    icon: LucideIcon;
    optional?: boolean;
}
