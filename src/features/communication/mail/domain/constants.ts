// ============================================================================
// Mail — Constantes du domaine
// ============================================================================

import type { SystemFolderType } from '@/features/communication/mail/domain/types';

// ----------------------------------------------------------------------------
// Dossiers système
// ----------------------------------------------------------------------------

export interface ISystemFolder {
  type: SystemFolderType;
  name: string;
  icon: string;
}

export const SYSTEM_FOLDERS: ISystemFolder[] = [
  { type: 'inbox',   name: 'Boîte de réception', icon: 'Inbox' },
  { type: 'sent',    name: 'Envoyés',            icon: 'Send' },
  { type: 'drafts',  name: 'Brouillons',         icon: 'FileEdit' },
  { type: 'archive', name: 'Archives',            icon: 'Archive' },
  { type: 'trash',   name: 'Corbeille',           icon: 'Trash2' },
  { type: 'spam',    name: 'Spam',                icon: 'ShieldAlert' },
];

// ----------------------------------------------------------------------------
// Labels par défaut
// ----------------------------------------------------------------------------

export interface IDefaultLabel {
  name: string;
  color: string;
}

export const DEFAULT_LABELS: IDefaultLabel[] = [
  { name: 'AG',          color: '#8b5cf6' },
  { name: 'Finance',     color: '#22c55e' },
  { name: 'Maintenance', color: '#f59e0b' },
  { name: 'Relances',    color: '#ef4444' },
  { name: 'Sinistres',   color: '#3b82f6' },
];

// ----------------------------------------------------------------------------
// Durée de rétention corbeille (en jours)
// ----------------------------------------------------------------------------

export const CORBEILLE_JOURS = 30;
