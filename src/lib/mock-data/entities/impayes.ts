/**
 * Mock Data - Impayés / Procédures de recouvrement
 *
 * @source Fusionné depuis :
 *   - src/data/mock/index.ts → MOCK_IMPAYES (4)
 *   - Soldes négatifs des copropriétaires
 * @created 2025-01-19
 *
 * Relations:
 * - copropriete_id → coproprietes.id
 * - coproprietaire_id → coproprietaires.id
 * - appels_fonds_ids → appels-fonds.id
 * - responsable_user_id → users.id
 *
 * Notes:
 * - Procédure de recouvrement : J+15, J+30, J+60, J+90
 * - Montants cohérents avec les soldes négatifs des copropriétaires
 * - Total impayés mock: 9 920€ (vs 1 571,64€ KPI - différent car données simplifiées)
 */

import { BaseEntity } from '../types';
import { COPROPRIETE_IDS } from './coproprietes';
import { COPROPRIETAIRE_IDS } from './coproprietaires';
import { USER_IDS } from './users';

// ============================================
// TYPES
// ============================================

export type ImpayeStatut =
  | 'en_retard' // Retard simple (< 15 jours)
  | 'relance_1' // 1ère relance (J+15)
  | 'relance_2' // 2ème relance (J+30)
  | 'mise_en_demeure' // Mise en demeure (J+60)
  | 'contentieux' // Procédure contentieuse (J+90)
  | 'huissier' // Transmission à l'huissier
  | 'tribunal' // Assignation tribunal
  | 'echeancier' // Plan d'apurement en cours
  | 'solde' // Régularisé
  | 'irrecovrable'; // Créance irrécouvrable

export type PrioriteImpaye = 'basse' | 'moyenne' | 'haute' | 'critique';

export interface EcheancierPaiement {
  id: string;
  date_prevue: string;
  montant: number;
  date_paiement?: string;
  is_paye: boolean;
  reference_paiement?: string;
}

export interface ActionRecouvrement {
  id: string;
  date: string;
  type:
    | 'relance_email'
    | 'relance_courrier'
    | 'appel_telephonique'
    | 'mise_en_demeure'
    | 'envoi_huissier'
    | 'assignation'
    | 'autre';
  description: string;
  utilisateur?: string;
  resultat?: string;
  document_id?: string;
}

export interface Impaye extends BaseEntity {
  // FK Relations
  copropriete_id: string;
  coproprietaire_id: string;
  appels_fonds_ids?: string[]; // Appels concernés
  responsable_user_id?: string;

  // Référence
  reference: string; // "IMP-2024-001"

  // Montants
  montant_initial: number;
  montant_restant: number;

  // Période concernée
  date_premier_impaye: string;
  date_echeance_origine: string;
  nb_mois_retard: number;
  nb_jours_retard: number;

  // Lot concerné
  lot_id?: string;
  lot_designation?: string;

  // Procédure
  statut: ImpayeStatut;
  date_statut: string;
  priorite: PrioriteImpaye;

  // Actions de recouvrement
  date_relance_1?: string;
  date_relance_2?: string;
  date_mise_en_demeure?: string;
  date_envoi_huissier?: string;
  date_assignation?: string;

  // Historique des actions
  actions?: ActionRecouvrement[];

  // Plan d'apurement
  echeancier?: EcheancierPaiement[];
  montant_echeancier_total?: number;
  nb_echeances_payees?: number;

  // Frais
  frais_relance?: number;
  frais_huissier?: number;
  frais_avocat?: number;
  interets_retard?: number;

  // Notes
  notes?: string;
  notes_confidentielles?: string;
}

// ============================================
// IDS PRÉGÉNÉRÉS
// ============================================

export const IMPAYE_IDS = {
  SIMON_RELANCE_2: 'imp_11111111-1111-4111-8111-111111111111',
  GARCIA_RELANCE_1: 'imp_22222222-2222-4222-8222-222222222222',
  THOMAS_EN_RETARD: 'imp_33333333-3333-4333-8333-333333333333',
  LOPEZ_CONTENTIEUX: 'imp_44444444-4444-4444-8444-444444444444',
  MOREAU_RETARD_LEGER: 'imp_55555555-5555-4555-8555-555555555555',
} as const;

// ============================================
// DONNÉES MOCK
// ============================================

export const IMPAYES_MOCK: Impaye[] = [
  // ============================================
  // Impayé 1: M. SIMON - Relance 2 (1850€, 95 jours)
  // ============================================
  {
    id: IMPAYE_IDS.SIMON_RELANCE_2,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    coproprietaire_id: COPROPRIETAIRE_IDS.SIMON_M,
    responsable_user_id: USER_IDS.SYNDIC,
    reference: 'IMP-2024-001',
    montant_initial: 1850,
    montant_restant: 1850,
    date_premier_impaye: '2024-08-31',
    date_echeance_origine: '2024-08-31',
    nb_mois_retard: 3,
    nb_jours_retard: 95,
    lot_id: 'lot_d0700000-0000-4000-8000-000000000011',
    lot_designation: 'Appartement D7',
    statut: 'relance_2',
    date_statut: '2024-10-20',
    priorite: 'haute',
    date_relance_1: '2024-09-15',
    date_relance_2: '2024-10-20',
    actions: [
      {
        id: 'act-1-1',
        date: '2024-09-15',
        type: 'relance_email',
        description: 'Envoi relance 1 par email',
        utilisateur: 'Syndic',
        resultat: 'Non répondu',
      },
      {
        id: 'act-1-2',
        date: '2024-09-20',
        type: 'appel_telephonique',
        description: 'Tentative d\'appel téléphonique',
        utilisateur: 'Syndic',
        resultat: 'Répondeur - Message laissé',
      },
      {
        id: 'act-1-3',
        date: '2024-10-20',
        type: 'relance_courrier',
        description: 'Envoi relance 2 par courrier recommandé',
        utilisateur: 'Syndic',
        resultat: 'AR signé le 22/10',
      },
    ],
    frais_relance: 15,
    notes: 'Copropriétaire joignable difficilement. Prévoir mise en demeure si pas de régularisation.',
    created_at: '2024-09-01T00:00:00Z',
    updated_at: '2024-10-20T10:00:00Z',
  },

  // ============================================
  // Impayé 2: Mme GARCIA - Relance 1 (1120€, 65 jours)
  // ============================================
  {
    id: IMPAYE_IDS.GARCIA_RELANCE_1,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    coproprietaire_id: COPROPRIETAIRE_IDS.GARCIA_MME,
    responsable_user_id: USER_IDS.SYNDIC,
    reference: 'IMP-2024-002',
    montant_initial: 1120,
    montant_restant: 1120,
    date_premier_impaye: '2024-09-30',
    date_echeance_origine: '2024-09-30',
    nb_mois_retard: 2,
    nb_jours_retard: 65,
    lot_id: 'lot_b0800000-0000-4000-8000-000000000009',
    lot_designation: 'Appartement B8',
    statut: 'relance_1',
    date_statut: '2024-10-25',
    priorite: 'moyenne',
    date_relance_1: '2024-10-25',
    actions: [
      {
        id: 'act-2-1',
        date: '2024-10-25',
        type: 'relance_email',
        description: 'Envoi relance 1 par email',
        utilisateur: 'Syndic',
        resultat: 'Accusé de réception email',
      },
    ],
    frais_relance: 5,
    notes: 'Premier impayé - Situation financière à surveiller',
    created_at: '2024-10-01T00:00:00Z',
    updated_at: '2024-10-25T14:00:00Z',
  },

  // ============================================
  // Impayé 3: M. THOMAS - En retard simple (2750€, 50 jours)
  // ============================================
  {
    id: IMPAYE_IDS.THOMAS_EN_RETARD,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    coproprietaire_id: COPROPRIETAIRE_IDS.THOMAS_M,
    reference: 'IMP-2024-003',
    montant_initial: 2750,
    montant_restant: 2750,
    date_premier_impaye: '2024-10-15',
    date_echeance_origine: '2024-10-15',
    nb_mois_retard: 2,
    nb_jours_retard: 50,
    lot_id: 'lot_e0300000-0000-4000-8000-000000000012',
    lot_designation: 'Appartement E3',
    statut: 'en_retard',
    date_statut: '2024-10-15',
    priorite: 'moyenne',
    notes: 'En attente de la 1ère relance (J+15 pas encore atteint au moment de la création)',
    created_at: '2024-10-16T00:00:00Z',
    updated_at: '2024-10-16T00:00:00Z',
  },

  // ============================================
  // Impayé 4: Mme LOPEZ - Contentieux (4200€, 125 jours)
  // ============================================
  {
    id: IMPAYE_IDS.LOPEZ_CONTENTIEUX,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    coproprietaire_id: COPROPRIETAIRE_IDS.LOPEZ_MME,
    responsable_user_id: USER_IDS.SYNDIC,
    reference: 'IMP-2024-004',
    montant_initial: 4200,
    montant_restant: 4200,
    date_premier_impaye: '2024-07-31',
    date_echeance_origine: '2024-07-31',
    nb_mois_retard: 5,
    nb_jours_retard: 125,
    lot_id: 'lot_f0100000-0000-4000-8000-000000000013',
    lot_designation: 'Appartement F1',
    statut: 'contentieux',
    date_statut: '2024-10-30',
    priorite: 'critique',
    date_relance_1: '2024-08-15',
    date_relance_2: '2024-08-30',
    date_mise_en_demeure: '2024-09-15',
    date_envoi_huissier: '2024-10-30',
    actions: [
      {
        id: 'act-4-1',
        date: '2024-08-15',
        type: 'relance_email',
        description: 'Envoi relance 1 par email',
        utilisateur: 'Syndic',
        resultat: 'Email lu mais non répondu',
      },
      {
        id: 'act-4-2',
        date: '2024-08-30',
        type: 'relance_courrier',
        description: 'Envoi relance 2 par courrier recommandé',
        utilisateur: 'Syndic',
        resultat: 'AR signé',
      },
      {
        id: 'act-4-3',
        date: '2024-09-15',
        type: 'mise_en_demeure',
        description: 'Envoi mise en demeure par LRAR',
        utilisateur: 'Syndic',
        resultat: 'AR signé le 17/09 - Délai 15 jours accordé',
      },
      {
        id: 'act-4-4',
        date: '2024-10-01',
        type: 'appel_telephonique',
        description: 'Appel suite à mise en demeure',
        utilisateur: 'Syndic',
        resultat: 'Copropriétaire évoque difficultés financières temporaires',
      },
      {
        id: 'act-4-5',
        date: '2024-10-30',
        type: 'envoi_huissier',
        description: 'Transmission du dossier à Maître DURAND, huissier',
        utilisateur: 'Syndic',
        resultat: 'Dossier en cours',
      },
    ],
    frais_relance: 25,
    frais_huissier: 180,
    interets_retard: 42,
    notes: 'CONTENTIEUX EN COURS - Dossier transmis à l\'huissier',
    notes_confidentielles: 'Copropriétaire en difficulté - Potentiel plan d\'apurement à proposer',
    created_at: '2024-08-01T00:00:00Z',
    updated_at: '2024-10-30T16:00:00Z',
  },

  // ============================================
  // Impayé 5: M. MOREAU - Retard léger (250€)
  // Correspond au solde négatif dans coproprietaires.ts
  // ============================================
  {
    id: IMPAYE_IDS.MOREAU_RETARD_LEGER,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    coproprietaire_id: COPROPRIETAIRE_IDS.MOREAU_PIERRE,
    reference: 'IMP-2024-005',
    montant_initial: 250,
    montant_restant: 250,
    date_premier_impaye: '2024-11-15',
    date_echeance_origine: '2024-11-15',
    nb_mois_retard: 1,
    nb_jours_retard: 35,
    lot_id: 'lot_a0200000-0000-4000-8000-000000000002',
    lot_designation: 'Appartement A2',
    statut: 'en_retard',
    date_statut: '2024-11-15',
    priorite: 'basse',
    notes: 'Retard léger - Vente en cours, sera régularisé à la mutation',
    created_at: '2024-11-16T00:00:00Z',
    updated_at: '2024-11-16T00:00:00Z',
  },
];

// ============================================
// STATISTIQUES
// ============================================

export const IMPAYES_STATS = {
  total: IMPAYES_MOCK.length,
  montant_total: IMPAYES_MOCK.reduce((sum, i) => sum + i.montant_restant, 0),
  par_statut: {
    en_retard: IMPAYES_MOCK.filter((i) => i.statut === 'en_retard').length,
    relance_1: IMPAYES_MOCK.filter((i) => i.statut === 'relance_1').length,
    relance_2: IMPAYES_MOCK.filter((i) => i.statut === 'relance_2').length,
    mise_en_demeure: IMPAYES_MOCK.filter((i) => i.statut === 'mise_en_demeure')
      .length,
    contentieux: IMPAYES_MOCK.filter((i) => i.statut === 'contentieux').length,
    huissier: IMPAYES_MOCK.filter((i) => i.statut === 'huissier').length,
  },
  par_priorite: {
    basse: IMPAYES_MOCK.filter((i) => i.priorite === 'basse').length,
    moyenne: IMPAYES_MOCK.filter((i) => i.priorite === 'moyenne').length,
    haute: IMPAYES_MOCK.filter((i) => i.priorite === 'haute').length,
    critique: IMPAYES_MOCK.filter((i) => i.priorite === 'critique').length,
  },
  frais_totaux: IMPAYES_MOCK.reduce(
    (sum, i) =>
      sum +
      (i.frais_relance || 0) +
      (i.frais_huissier || 0) +
      (i.frais_avocat || 0),
    0
  ),
  retard_moyen_jours: Math.round(
    IMPAYES_MOCK.reduce((sum, i) => sum + i.nb_jours_retard, 0) /
      IMPAYES_MOCK.length
  ),
};

// ============================================
// TABLE DE CORRESPONDANCE (migration)
// ============================================

export const IMPAYE_ID_MAP: Record<string, string> = {
  '1': IMPAYE_IDS.SIMON_RELANCE_2,
  '2': IMPAYE_IDS.GARCIA_RELANCE_1,
  '3': IMPAYE_IDS.THOMAS_EN_RETARD,
  '4': IMPAYE_IDS.LOPEZ_CONTENTIEUX,
};

// ============================================
// SEUILS DE RELANCE (en jours)
// ============================================

export const SEUILS_RELANCE = {
  RELANCE_1: 15,
  RELANCE_2: 30,
  MISE_EN_DEMEURE: 60,
  CONTENTIEUX: 90,
} as const;

// ============================================
// HELPERS
// ============================================

export function getImpayeById(id: string): Impaye | undefined {
  return IMPAYES_MOCK.find((i) => i.id === id);
}

export function getImpayesByCopropriete(coproprieteId: string): Impaye[] {
  return IMPAYES_MOCK.filter((i) => i.copropriete_id === coproprieteId);
}

export function getImpayesByCoproprietaire(coproprietaireId: string): Impaye[] {
  return IMPAYES_MOCK.filter((i) => i.coproprietaire_id === coproprietaireId);
}

export function getImpayesCritiques(): Impaye[] {
  return IMPAYES_MOCK.filter((i) => i.priorite === 'critique');
}

export function getImpayesEnContentieux(): Impaye[] {
  return IMPAYES_MOCK.filter(
    (i) =>
      i.statut === 'contentieux' ||
      i.statut === 'huissier' ||
      i.statut === 'tribunal'
  );
}

export function getImpayesARelancer(): Impaye[] {
  const now = new Date();
  return IMPAYES_MOCK.filter((i) => {
    if (i.statut === 'en_retard' && i.nb_jours_retard >= SEUILS_RELANCE.RELANCE_1) {
      return true;
    }
    if (
      i.statut === 'relance_1' &&
      i.nb_jours_retard >= SEUILS_RELANCE.RELANCE_2
    ) {
      return true;
    }
    if (
      i.statut === 'relance_2' &&
      i.nb_jours_retard >= SEUILS_RELANCE.MISE_EN_DEMEURE
    ) {
      return true;
    }
    return false;
  });
}

export function calculerMontantTotalAvecFrais(impaye: Impaye): number {
  return (
    impaye.montant_restant +
    (impaye.frais_relance || 0) +
    (impaye.frais_huissier || 0) +
    (impaye.frais_avocat || 0) +
    (impaye.interets_retard || 0)
  );
}

export function determinerPrioriteParRetard(nbJours: number): PrioriteImpaye {
  if (nbJours >= 90) return 'critique';
  if (nbJours >= 60) return 'haute';
  if (nbJours >= 30) return 'moyenne';
  return 'basse';
}

export function determinerProchaineAction(impaye: Impaye): string {
  switch (impaye.statut) {
    case 'en_retard':
      return impaye.nb_jours_retard >= 15
        ? 'Envoyer relance 1'
        : 'Attendre J+15';
    case 'relance_1':
      return impaye.nb_jours_retard >= 30
        ? 'Envoyer relance 2'
        : 'Attendre J+30';
    case 'relance_2':
      return impaye.nb_jours_retard >= 60
        ? 'Envoyer mise en demeure'
        : 'Attendre J+60';
    case 'mise_en_demeure':
      return impaye.nb_jours_retard >= 90
        ? 'Transmettre à l\'huissier'
        : 'Attendre J+90';
    case 'contentieux':
      return 'Suivre procédure huissier';
    case 'huissier':
      return 'Attendre retour huissier';
    case 'echeancier':
      return 'Suivre plan d\'apurement';
    default:
      return 'Aucune action requise';
  }
}
