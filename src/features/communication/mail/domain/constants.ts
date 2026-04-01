// ============================================================================
// Mail — Constantes du domaine
// ============================================================================

import type { SystemFolderType, IMailFolder, IMailLabel } from '@/features/communication/mail/domain/types';

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
// Labels par défaut (version simple)
// ----------------------------------------------------------------------------

export interface IDefaultLabel {
  name: string;
  color: string;
}

export const DEFAULT_LABEL_DEFS: IDefaultLabel[] = [
  { name: 'AG',          color: '#8b5cf6' },
  { name: 'Finance',     color: '#22c55e' },
  { name: 'Maintenance', color: '#f59e0b' },
  { name: 'Relances',    color: '#ef4444' },
  { name: 'Sinistres',   color: '#3b82f6' },
];

// ----------------------------------------------------------------------------
// Dossiers par défaut (typed IMailFolder — fallback avant chargement DB)
// ----------------------------------------------------------------------------

export const DEFAULT_FOLDERS: IMailFolder[] = SYSTEM_FOLDERS.map((sf, i) => ({
  id: `system-${sf.type}`,
  coproprieteId: '',
  userId: '',
  name: sf.name,
  folderType: sf.type,
  icon: sf.icon,
  isSystem: true,
  sortOrder: i,
  unreadCount: 0,
}));

export const DEFAULT_LABELS: IMailLabel[] = DEFAULT_LABEL_DEFS.map((l, i) => ({
  id: `default-label-${i}`,
  coproprieteId: '',
  name: l.name,
  color: l.color,
  sortOrder: i,
}));

// ----------------------------------------------------------------------------
// Durée de rétention corbeille (en jours)
// ----------------------------------------------------------------------------

export const CORBEILLE_JOURS = 30;
