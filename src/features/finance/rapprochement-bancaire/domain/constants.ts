import type { LigneReleve, LigneLogiciel } from './types';

export const MOIS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export const MOCK_LIGNES_RELEVE: LigneReleve[] = [
  { id: 'rel-1', date: '2025-01-20', libelle: 'VIR LEBLANC MARIE', montant: 1562.50, reference: 'VIR123456' },
  { id: 'rel-2', date: '2025-01-18', libelle: 'PRLV EDF ENERGIE', montant: -1245.50, reference: 'EDF789012' },
  { id: 'rel-3', date: '2025-01-15', libelle: 'VIR MOREAU PIERRE', montant: 1250.00, reference: 'VIR789456' },
  { id: 'rel-4', date: '2025-01-12', libelle: 'PRLV VEOLIA', montant: -890.00, reference: 'VEO456123' },
  { id: 'rel-5', date: '2025-01-10', libelle: 'VIR ENTRANT REF 12345', montant: 2500.00, reference: '12345' },
  { id: 'rel-6', date: '2025-01-08', libelle: 'PRLV OTIS MAINTENANCE', montant: -1890.00, reference: 'OTIS2025' },
  { id: 'rel-7', date: '2025-01-05', libelle: 'VIR MARTIN JEAN', montant: 1562.50, reference: 'VIR555777' },
  { id: 'rel-8', date: '2025-01-03', libelle: 'FRAIS BANCAIRES', montant: -12.50 },
];

export const MOCK_LIGNES_LOGICIEL: LigneLogiciel[] = [
  { id: 'log-1', date: '2025-01-20', libelle: 'VIREMENT LEBLANC MARIE APPEL DE FONDS T4', montant: 1562.50, categorise: true, compteComptable: '701 - Appels de fonds' },
  { id: 'log-2', date: '2025-01-18', libelle: 'PRELEVEMENT EDF ELECTRICITE JANVIER', montant: -1245.50, categorise: true, compteComptable: '606 - Eau et électricité' },
  { id: 'log-3', date: '2025-01-15', libelle: 'VIREMENT MOREAU PIERRE APPEL DE FONDS T4', montant: 1250.00, categorise: true, compteComptable: '701 - Appels de fonds' },
  { id: 'log-4', date: '2025-01-12', libelle: 'PRELEVEMENT VEOLIA EAU DECEMBRE', montant: -890.00, categorise: true, compteComptable: '606 - Eau et électricité' },
  { id: 'log-5', date: '2025-01-10', libelle: 'VIREMENT ENTRANT REF 12345', montant: 2500.00, categorise: false },
  { id: 'log-6', date: '2025-01-08', libelle: 'PRELEVEMENT OTIS MAINTENANCE ASCENSEUR', montant: -1890.00, categorise: true, compteComptable: '615 - Entretien et réparations' },
  { id: 'log-9', date: '2025-01-02', libelle: 'VIREMENT DUPONT PAUL (EN ATTENTE)', montant: 875.00, categorise: false },
];
