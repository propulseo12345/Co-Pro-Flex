// ============================================================================
// Mur (Wall) — Constantes du domaine
// ============================================================================

import type { PostCategory, AuthorRole } from '@/features/communication/mur/domain/types';

// ----------------------------------------------------------------------------
// Configuration par catégorie (label, couleur, icône Lucide)
// ----------------------------------------------------------------------------

export interface ICategoryConfig {
  label: string;
  color: string;
  icon: string;
}

export const CATEGORY_CONFIG: Record<PostCategory, ICategoryConfig> = {
  information: { label: 'Information',  color: '#22c55e', icon: 'Info' },
  urgent:      { label: 'Urgent',       color: '#ef4444', icon: 'AlertTriangle' },
  question:    { label: 'Question',     color: '#8b5cf6', icon: 'HelpCircle' },
  evenement:   { label: 'Événement',    color: '#3b82f6', icon: 'Calendar' },
  sondage:     { label: 'Sondage',      color: '#f59e0b', icon: 'BarChart3' },
};

// ----------------------------------------------------------------------------
// Badge par rôle d'auteur
// ----------------------------------------------------------------------------

export interface IRoleBadge {
  label: string;
  color: string;
}

export const ROLE_BADGE: Record<AuthorRole, IRoleBadge> = {
  syndic:      { label: 'Syndic',            color: '#3b82f6' },
  copro:       { label: 'Copropriétaire',    color: '#8b5cf6' },
  conseil:     { label: 'Conseil syndical',  color: '#22c55e' },
  prestataire: { label: 'Prestataire',       color: '#f59e0b' },
  gardien:     { label: 'Gardien',           color: '#64748b' },
};
