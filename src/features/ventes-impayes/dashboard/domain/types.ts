'use client';

import type { LucideIcon } from 'lucide-react';

// ============================================================================
// Stats Types
// ============================================================================

export interface StatCard {
  id: string;
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  link: string;
  subInfo?: string;
}

// ============================================================================
// Ventes Types (for dashboard display)
// ============================================================================

export interface VenteRecente {
  id: string;
  lot: string;
  vendeur: string;
  acquereur: string;
  statut: 'en_cours' | 'finalise' | 'annule';
  etape: string;
  dateCompromis: string;
  documentsManquants: number;
}

// ============================================================================
// Impayés Types
// ============================================================================

export interface ImpayeCritique {
  id: number;
  coproprietaire: string;
  lot: string;
  montant: number;
  retard: number;
  statut: string;
  type: string;
}

export interface ImpayeBreakdown {
  statut: string;
  label: string;
  count: number;
  montant: number;
  color: string;
  textColor: string;
}

// ============================================================================
// Activity Types
// ============================================================================

export interface RecentActivity {
  id: string;
  type: 'vente' | 'impaye';
  title: string;
  description: string;
  date: string;
  icon: LucideIcon;
  color: string;
  link: string;
}
