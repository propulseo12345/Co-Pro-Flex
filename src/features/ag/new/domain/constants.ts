import type { BudgetPoste } from './types';

export const BUDGET_PRECEDENT = {
  exercice: new Date().getFullYear(),
  postes: [
    { id: 'prev-1', poste: 'Eau', montant: 2500 },
    { id: 'prev-2', poste: 'Assurance', montant: 4200 },
    { id: 'prev-3', poste: 'Électricité', montant: 1800 },
    { id: 'prev-4', poste: 'Entretien', montant: 3500 },
    { id: 'prev-5', poste: 'Nettoyage', montant: 2800 },
    { id: 'prev-6', poste: 'Ascenseur', montant: 2200 },
    { id: 'prev-7', poste: 'Frais de gestion', montant: 5500 },
  ] as BudgetPoste[],
  total: 22500,
};

export const POSTES_DEPENSES = [
  'Eau',
  'Assurance',
  'Électricité',
  'Chauffage',
  'Entretien',
  'Nettoyage',
  'Gardiennage',
  'Ascenseur',
  'Éclairage',
  'Télésurveillance',
  'Travaux',
  'Maintenance',
  'Fournitures',
  'Frais de gestion',
  'Honoraires',
  'Autre',
];
