import { Home, CheckCircle2, AlertTriangle, Euro } from 'lucide-react';

export const VENTES_IMPAYES_STATS = [
  {
    id: 'ventes-en-cours',
    label: 'Ventes en cours',
    value: 5,
    icon: Home,
    color: '#4f46e5',
    link: '/ventes-impayes/ventes?statut=en_cours',
    subInfo: '2 avec documents manquants'
  },
  {
    id: 'ventes-finalisees',
    label: 'Ventes finalisées ce mois',
    value: 3,
    icon: CheckCircle2,
    color: '#10b981',
    link: '/ventes-impayes/ventes?statut=finalise',
    subInfo: '+1 par rapport au mois dernier'
  },
  {
    id: 'impayes-en-cours',
    label: 'Impayés en cours',
    value: 8,
    icon: AlertTriangle,
    color: '#ef4444',
    link: '/ventes-impayes/impayes',
    subInfo: '3 en contentieux'
  },
  {
    id: 'montant-impayes',
    label: 'Montant total impayés',
    value: '12 450 €',
    icon: Euro,
    color: '#f59e0b',
    link: '/ventes-impayes/impayes',
    subInfo: 'Retard moyen: 65 jours'
  }
];

export const VENTES_RECENTES = [
  {
    id: 1,
    lot: 'Appartement T3 - Lot 15',
    vendeur: 'Martin DUPONT',
    acquereur: 'Sophie LEBLANC',
    statut: 'en_cours',
    etape: 'Documents en attente',
    dateCompromis: '2025-11-15',
    documentsManquants: 2
  },
  {
    id: 2,
    lot: 'Parking B12',
    vendeur: 'Jean PETIT',
    acquereur: 'Marie DURAND',
    statut: 'en_cours',
    etape: 'Signature notaire',
    dateCompromis: '2025-11-20',
    documentsManquants: 0
  },
  {
    id: 3,
    lot: 'Cave C5',
    vendeur: 'Pierre MARTIN',
    acquereur: 'Luc BERNARD',
    statut: 'finalise',
    etape: 'Terminé',
    dateCompromis: '2025-10-28',
    documentsManquants: 0
  }
];

export const IMPAYES_CRITIQUES = [
  {
    id: 1,
    coproprietaire: 'M. Simon',
    lot: 'Appartement D7',
    montant: 1850,
    retard: 95,
    statut: 'relance_2',
    type: 'Charges T3 2025'
  },
  {
    id: 2,
    coproprietaire: 'Mme Lopez',
    lot: 'Appartement F1',
    montant: 4200,
    retard: 125,
    statut: 'contentieux',
    type: 'Charges T2 2025'
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

export const IMPAYES_BREAKDOWN = [
  { statut: 'en_retard', label: 'En retard', count: 2, montant: 2450, color: '#fef3c7', textColor: '#92400e' },
  { statut: 'relance_1', label: 'Relance 1', count: 2, montant: 2970, color: '#fed7aa', textColor: '#9a3412' },
  { statut: 'relance_2', label: 'Relance 2', count: 2, montant: 3230, color: '#fecaca', textColor: '#991b1b' },
  { statut: 'contentieux', label: 'Contentieux', count: 2, montant: 3800, color: '#fee2e2', textColor: '#7f1d1d' }
];

export const RECENT_ACTIVITY = [
  {
    id: 1,
    type: 'vente',
    title: 'Nouvelle vente - Lot 15 (Appartement T3)',
    description: 'Vendeur: Martin DUPONT - Acquéreur: Sophie LEBLANC',
    date: '2025-11-28T10:30:00',
    icon: Home,
    color: '#4f46e5',
    link: '/ventes-impayes/ventes/1'
  },
  {
    id: 2,
    type: 'impaye',
    title: 'Relance 2 - Copropriétaire Pierre MARTIN',
    description: 'Charges T4 2025 - Montant: 850€',
    date: '2025-11-27T14:20:00',
    icon: AlertTriangle,
    color: '#ef4444',
    link: '/ventes-impayes/impayes'
  },
  {
    id: 3,
    type: 'vente',
    title: 'Vente finalisée - Lot 8 (Parking)',
    description: 'Acte authentique signé',
    date: '2025-11-26T16:00:00',
    icon: CheckCircle2,
    color: '#10b981',
    link: '/ventes-impayes/ventes/3'
  }
];
