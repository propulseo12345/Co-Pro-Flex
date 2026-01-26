/**
 * Constantes pour le module Convocation
 */

import { Package, FileText, Mail, User } from 'lucide-react';
import type { ReactNode } from 'react';

export type SendingMethod =
  | 'RECOMMANDE'
  | 'LETTRE_SIMPLE'
  | 'AVIS_ELECTRONIQUE'
  | 'EMAIL'
  | 'REMISE_MAIN_PROPRE';

export interface SendingMethodInfo {
  value: SendingMethod;
  label: string;
  iconName: 'Package' | 'FileText' | 'Mail' | 'User';
  requiresAddress: boolean;
  requiresEmail: boolean;
  cost: number;
}

export const SENDING_COSTS: Record<SendingMethod, number> = {
  RECOMMANDE: 6.5,
  LETTRE_SIMPLE: 1.5,
  AVIS_ELECTRONIQUE: 3.2,
  EMAIL: 0.0,
  REMISE_MAIN_PROPRE: 0.0,
};

export const SENDING_METHODS: SendingMethodInfo[] = [
  {
    value: 'RECOMMANDE',
    label: 'Recommandé',
    iconName: 'Package',
    requiresAddress: true,
    requiresEmail: false,
    cost: 6.5,
  },
  {
    value: 'LETTRE_SIMPLE',
    label: 'Lettre simple',
    iconName: 'FileText',
    requiresAddress: true,
    requiresEmail: false,
    cost: 1.5,
  },
  {
    value: 'AVIS_ELECTRONIQUE',
    label: 'Avis électronique',
    iconName: 'Mail',
    requiresAddress: false,
    requiresEmail: true,
    cost: 3.2,
  },
  {
    value: 'EMAIL',
    label: 'Email',
    iconName: 'Mail',
    requiresAddress: false,
    requiresEmail: true,
    cost: 0.0,
  },
  {
    value: 'REMISE_MAIN_PROPRE',
    label: 'Main propre',
    iconName: 'User',
    requiresAddress: false,
    requiresEmail: false,
    cost: 0.0,
  },
];

export function getSendingMethodIcon(iconName: SendingMethodInfo['iconName'], size: number): ReactNode {
  const icons = {
    Package,
    FileText,
    Mail,
    User,
  };
  const IconComponent = icons[iconName];
  // Note: on retourne null ici car les icônes seront rendues dans le composant
  return null;
}
