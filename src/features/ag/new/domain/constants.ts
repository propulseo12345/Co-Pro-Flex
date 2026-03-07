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
  'Frais AG',
  'Frais postaux et bancaires',
  'Autre',
];

/** Mapping poste prédéfini -> compte comptable + clé de répartition (pré-remplissage auto) */
export const POSTE_ACCOUNT_MAPPING: Record<string, { accountCode: string; accountName: string; repartitionKeyName: string }> = {
  'Eau': { accountCode: '605', accountName: 'Eau', repartitionKeyName: 'Eau froide' },
  'Assurance': { accountCode: '608', accountName: 'Assurances', repartitionKeyName: 'Charges générales' },
  'Électricité': { accountCode: '606', accountName: 'Électricité', repartitionKeyName: 'Charges générales' },
  'Entretien': { accountCode: '602', accountName: 'Entretien et réparations', repartitionKeyName: 'Charges générales' },
  'Nettoyage': { accountCode: '602', accountName: 'Entretien et réparations', repartitionKeyName: 'Charges générales' },
  'Ascenseur': { accountCode: '604', accountName: 'Ascenseur', repartitionKeyName: 'Ascenseur' },
  'Frais de gestion': { accountCode: '609', accountName: 'Honoraires syndic', repartitionKeyName: 'Charges générales' },
  'Honoraires': { accountCode: '609', accountName: 'Honoraires syndic', repartitionKeyName: 'Charges générales' },
  'Fournitures': { accountCode: '601', accountName: 'Achats - Fournitures', repartitionKeyName: 'Charges générales' },
  'Frais AG': { accountCode: '612', accountName: "Frais d'AG", repartitionKeyName: 'Charges générales' },
  'Frais postaux et bancaires': { accountCode: '611', accountName: 'Frais postaux et bancaires', repartitionKeyName: 'Charges générales' },
};
