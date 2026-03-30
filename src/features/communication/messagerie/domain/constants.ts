// ============================================================================
// Messagerie (Chat) — Constantes du domaine
// ============================================================================

import type { UserRole } from '@/features/communication/messagerie/domain/types';

// ----------------------------------------------------------------------------
// Couleurs par rôle (pour les pastilles / avatars)
// ----------------------------------------------------------------------------

export const ROLE_COLORS: Record<UserRole, string> = {
  syndic:      '#3b82f6',
  copro:       '#8b5cf6',
  conseil:     '#22c55e',
  prestataire: '#f59e0b',
  gardien:     '#64748b',
};

// ----------------------------------------------------------------------------
// Labels par rôle (affichage dans les badges)
// ----------------------------------------------------------------------------

export const ROLE_LABELS: Record<UserRole, string> = {
  syndic:      'Syndic',
  copro:       'Copropriétaire',
  conseil:     'Conseil syndical',
  prestataire: 'Prestataire',
  gardien:     'Gardien',
};
