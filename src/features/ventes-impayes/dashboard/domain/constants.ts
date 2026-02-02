import type { ImpayeCritique, ImpayeBreakdown } from './types';

// ============================================================================
// Mock Data for Impayés (still mock for MVP - separate module)
// ============================================================================

export const IMPAYES_CRITIQUES: ImpayeCritique[] = [
  {
    id: 1,
    coproprietaire: 'M. Simon',
    lot: 'Appartement D7',
    montant: 1850,
    retard: 95,
    statut: 'relance_2',
    type: 'Charges T3 2026'
  },
  {
    id: 2,
    coproprietaire: 'Mme Lopez',
    lot: 'Appartement F1',
    montant: 4200,
    retard: 125,
    statut: 'contentieux',
    type: 'Charges T2 2026'
  },
  {
    id: 3,
    coproprietaire: 'Mme Garcia',
    lot: 'Appartement B8',
    montant: 1120,
    retard: 65,
    statut: 'relance_1',
    type: 'Charges T4 2025'
  }
];

export const IMPAYES_BREAKDOWN: ImpayeBreakdown[] = [
  { statut: 'en_retard', label: 'En retard', count: 2, montant: 2450, color: '#fef3c7', textColor: '#92400e' },
  { statut: 'relance_1', label: 'Relance 1', count: 2, montant: 2970, color: '#fed7aa', textColor: '#9a3412' },
  { statut: 'relance_2', label: 'Relance 2', count: 2, montant: 3230, color: '#fecaca', textColor: '#991b1b' },
  { statut: 'contentieux', label: 'Contentieux', count: 2, montant: 3800, color: '#fee2e2', textColor: '#7f1d1d' }
];
