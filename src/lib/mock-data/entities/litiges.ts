/**
 * Mock Data - Litiges / Contentieux
 *
 * @source Fusionné depuis :
 *   - src/data/mock/index.ts → MOCK_LITIGES (3)
 * @created 2025-01-19
 *
 * Relations:
 * - copropriete_id → coproprietes.id
 * - plaignant_id → coproprietaires.id (si copropriétaire)
 * - mis_en_cause_id → coproprietaires.id (si copropriétaire)
 * - lot_id → lots.id
 * - responsable_user_id → users.id
 * - documents_ids → documents.id
 *
 * Notes:
 * - Types : voisinage, travaux, charges, dégradation, autre
 * - Résolution : amiable, médiation, tribunal, abandon
 */

import { BaseEntity } from '../types';
import { COPROPRIETE_IDS } from './coproprietes';
import { COPROPRIETAIRE_IDS } from './coproprietaires';
import { LOT_IDS } from './lots';
import { USER_IDS } from './users';

// ============================================
// TYPES
// ============================================

export type LitigeType =
  | 'voisinage' // Nuisances sonores, troubles de voisinage
  | 'travaux' // Travaux non autorisés, malfaçons
  | 'charges' // Contestation de charges
  | 'degradation' // Dégradation parties communes
  | 'impaye' // Litige lié à un impayé
  | 'autre';

export type LitigeStatut =
  | 'ouvert' // Déclaration initiale
  | 'en_cours' // En cours de traitement
  | 'mediation' // Médiation en cours
  | 'contentieux' // Procédure judiciaire
  | 'resolu' // Résolu
  | 'classe'; // Classé sans suite

export type PrioriteNiveau = 'basse' | 'moyenne' | 'haute' | 'urgente';

export type PartieType =
  | 'coproprietaire'
  | 'syndic'
  | 'conseil_syndical'
  | 'prestataire'
  | 'locataire'
  | 'tiers';

export type ResolutionType =
  | 'amiable'
  | 'mediation'
  | 'tribunal'
  | 'abandon'
  | 'transaction';

export interface ActionLitige {
  id: string;
  date: string;
  action: string;
  utilisateur?: string;
  resultat?: string;
  document_id?: string;
}

export interface Litige extends BaseEntity {
  // FK Relations
  copropriete_id: string;
  lot_id?: string; // Lot concerné
  responsable_user_id?: string;
  documents_ids?: string[];

  // Référence
  reference: string; // "LIT-2024-001"

  // Plaignant
  plaignant_type: PartieType;
  plaignant_id?: string; // FK si copropriétaire
  plaignant_nom: string;

  // Mis en cause
  mis_en_cause_type: PartieType;
  mis_en_cause_id?: string; // FK si copropriétaire
  mis_en_cause_nom: string;

  // Objet
  type: LitigeType;
  titre: string;
  description: string;

  // Lots concernés (si applicable)
  lots_concernes?: string[]; // Références des lots impliqués

  // Dates
  date_declaration: string;
  date_faits?: string;
  date_resolution?: string;

  // Statut
  statut: LitigeStatut;
  priorite: PrioriteNiveau;

  // Actions menées
  actions?: ActionLitige[];

  // Résolution
  resolution_type?: ResolutionType;
  resolution_commentaire?: string;
  montant_indemnisation?: number;

  // Notes
  notes?: string;
  notes_confidentielles?: string;
}

// ============================================
// IDS PRÉGÉNÉRÉS
// ============================================

export const LITIGE_IDS = {
  NUISANCES_SONORES: 'lit_11111111-1111-4111-8111-111111111111',
  DEGATS_EAUX: 'lit_22222222-2222-4222-8222-222222222222',
  CONTESTATION_CHARGES: 'lit_33333333-3333-4333-8333-333333333333',
  TRAVAUX_NON_AUTORISES: 'lit_44444444-4444-4444-8444-444444444444',
} as const;

// ============================================
// DONNÉES MOCK
// ============================================

export const LITIGES_MOCK: Litige[] = [
  // ============================================
  // Litige 1: Nuisances sonores récurrentes
  // Source: MOCK_LITIGES[0]
  // ============================================
  {
    id: LITIGE_IDS.NUISANCES_SONORES,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    lot_id: LOT_IDS.C5,
    responsable_user_id: USER_IDS.SYNDIC,
    reference: 'LIT-2024-001',
    plaignant_type: 'coproprietaire',
    plaignant_id: COPROPRIETAIRE_IDS.DUBOIS_JEAN,
    plaignant_nom: 'M. DUBOIS Jean (Appt C4)',
    mis_en_cause_type: 'coproprietaire',
    mis_en_cause_id: COPROPRIETAIRE_IDS.LAURENT_SOPHIE,
    mis_en_cause_nom: 'Mme LAURENT Sophie (Appt C5)',
    type: 'voisinage',
    titre: 'Nuisances sonores récurrentes',
    description:
      'Plainte pour nuisances sonores répétées en soirée. Le plaignant signale des bruits de musique forte et de conversations bruyantes plusieurs soirs par semaine après 22h.',
    lots_concernes: ['C4', 'C5'],
    date_declaration: '2024-10-15',
    date_faits: '2024-10-01',
    statut: 'en_cours',
    priorite: 'moyenne',
    actions: [
      {
        id: 'act-l1-1',
        date: '2024-10-16',
        action: 'Envoi courrier de rappel du règlement intérieur aux deux parties',
        utilisateur: 'Syndic',
        resultat: 'Courriers reçus',
      },
      {
        id: 'act-l1-2',
        date: '2024-10-20',
        action: 'Entretien téléphonique avec Mme LAURENT',
        utilisateur: 'Syndic',
        resultat: 'Engagement à réduire le bruit - Explications travaux terminés',
      },
      {
        id: 'act-l1-3',
        date: '2024-10-25',
        action: 'Contact avec M. DUBOIS pour suivi',
        utilisateur: 'Syndic',
        resultat: 'Situation améliorée mais vigilance maintenue',
      },
    ],
    notes: 'À surveiller pendant les prochaines semaines',
    created_at: '2024-10-15T10:00:00Z',
    updated_at: '2024-10-25T14:00:00Z',
  },

  // ============================================
  // Litige 2: Dégâts des eaux en attente
  // Source: MOCK_LITIGES[1]
  // ============================================
  {
    id: LITIGE_IDS.DEGATS_EAUX,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    lot_id: LOT_IDS.A03,
    responsable_user_id: USER_IDS.SYNDIC,
    reference: 'LIT-2024-002',
    plaignant_type: 'coproprietaire',
    plaignant_id: COPROPRIETAIRE_IDS.LEBLANC_MARIE,
    plaignant_nom: 'Mme LEBLANC Marie (Appt A3)',
    mis_en_cause_type: 'syndic',
    mis_en_cause_nom: 'Syndic - Résidence Les Ormes',
    type: 'travaux',
    titre: 'Dégâts des eaux en attente de réparation',
    description:
      'Dégâts causés par une fuite non réparée depuis plus d\'un mois. Infiltration provenant des parties communes (colonne d\'eau). Le plafond de la salle de bain présente des traces d\'humidité et des décollements de peinture.',
    lots_concernes: ['A3'],
    date_declaration: '2024-09-30',
    date_faits: '2024-09-15',
    statut: 'ouvert',
    priorite: 'haute',
    actions: [
      {
        id: 'act-l2-1',
        date: '2024-10-01',
        action: 'Constat des dégâts sur place',
        utilisateur: 'Syndic',
        resultat: 'Infiltration confirmée - Origine colonne commune',
      },
      {
        id: 'act-l2-2',
        date: '2024-10-05',
        action: 'Demande de devis au plombier',
        utilisateur: 'Syndic',
        resultat: 'Devis reçu: 850€ TTC',
      },
      {
        id: 'act-l2-3',
        date: '2024-10-10',
        action: 'Déclaration sinistre assurance copropriété',
        utilisateur: 'Syndic',
        resultat: 'Dossier en cours - N° sinistre: SIN-2024-1234',
      },
    ],
    notes: 'Urgence: intervention plomberie programmée semaine prochaine',
    notes_confidentielles: 'Assurance a confirmé prise en charge à 80%',
    created_at: '2024-09-30T09:00:00Z',
    updated_at: '2024-10-10T16:00:00Z',
  },

  // ============================================
  // Litige 3: Contestation charges communes (résolu)
  // Source: MOCK_LITIGES[2]
  // ============================================
  {
    id: LITIGE_IDS.CONTESTATION_CHARGES,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    lot_id: LOT_IDS.B02,
    responsable_user_id: USER_IDS.SYNDIC,
    reference: 'LIT-2024-003',
    plaignant_type: 'coproprietaire',
    plaignant_id: COPROPRIETAIRE_IDS.RODRIGUEZ_CARLOS,
    plaignant_nom: 'M. RODRIGUEZ Carlos (Appt D2)',
    mis_en_cause_type: 'syndic',
    mis_en_cause_nom: 'Syndic - Résidence Les Ormes',
    type: 'charges',
    titre: 'Contestation de la répartition des charges d\'entretien',
    description:
      'Contestation de la répartition des charges d\'entretien communes. Le copropriétaire estime que sa quote-part est trop élevée par rapport à la surface de son lot.',
    lots_concernes: ['D2'],
    date_declaration: '2024-08-20',
    date_faits: '2024-08-15',
    date_resolution: '2024-09-15',
    statut: 'resolu',
    priorite: 'basse',
    actions: [
      {
        id: 'act-l3-1',
        date: '2024-08-22',
        action: 'Envoi du tableau de répartition des charges',
        utilisateur: 'Syndic',
        resultat: 'Document transmis par email',
      },
      {
        id: 'act-l3-2',
        date: '2024-08-30',
        action: 'RDV explicatif avec le copropriétaire',
        utilisateur: 'Syndic',
        resultat: 'Explication des tantièmes et de la clé de répartition',
      },
      {
        id: 'act-l3-3',
        date: '2024-09-15',
        action: 'Clôture du litige',
        utilisateur: 'Syndic',
        resultat: 'Copropriétaire satisfait des explications',
      },
    ],
    resolution_type: 'amiable',
    resolution_commentaire:
      'Après explications détaillées sur la clé de répartition et les tantièmes, le copropriétaire a compris et accepté la répartition actuelle.',
    notes: 'Litige résolu à l\'amiable',
    created_at: '2024-08-20T10:00:00Z',
    updated_at: '2024-09-15T11:00:00Z',
  },

  // ============================================
  // Litige 4: Travaux non autorisés (nouveau)
  // ============================================
  {
    id: LITIGE_IDS.TRAVAUX_NON_AUTORISES,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    lot_id: LOT_IDS.E3,
    responsable_user_id: USER_IDS.PRESIDENT_CS,
    reference: 'LIT-2024-004',
    plaignant_type: 'conseil_syndical',
    plaignant_nom: 'Conseil Syndical - Résidence Les Ormes',
    mis_en_cause_type: 'coproprietaire',
    mis_en_cause_id: COPROPRIETAIRE_IDS.THOMAS_M,
    mis_en_cause_nom: 'M. THOMAS Julien (Appt E3)',
    type: 'travaux',
    titre: 'Installation climatisation sans autorisation AG',
    description:
      'Le copropriétaire a fait installer une unité de climatisation extérieure sur son balcon sans demander l\'autorisation préalable en AG. L\'unité est visible depuis la rue et modifie l\'aspect extérieur de l\'immeuble.',
    lots_concernes: ['E3'],
    date_declaration: '2024-11-05',
    date_faits: '2024-10-20',
    statut: 'ouvert',
    priorite: 'moyenne',
    actions: [
      {
        id: 'act-l4-1',
        date: '2024-11-06',
        action: 'Constat photographique de l\'installation',
        utilisateur: 'Président CS',
        resultat: 'Photos prises et archivées',
      },
      {
        id: 'act-l4-2',
        date: '2024-11-08',
        action: 'Envoi courrier de mise en conformité',
        utilisateur: 'Syndic',
        resultat: 'En attente de réponse',
      },
    ],
    notes: 'Point à inscrire à l\'ordre du jour de la prochaine AG pour régularisation ou dépose',
    created_at: '2024-11-05T14:00:00Z',
    updated_at: '2024-11-08T10:00:00Z',
  },
];

// ============================================
// STATISTIQUES
// ============================================

export const LITIGES_STATS = {
  total: LITIGES_MOCK.length,
  par_statut: {
    ouvert: LITIGES_MOCK.filter((l) => l.statut === 'ouvert').length,
    en_cours: LITIGES_MOCK.filter((l) => l.statut === 'en_cours').length,
    mediation: LITIGES_MOCK.filter((l) => l.statut === 'mediation').length,
    contentieux: LITIGES_MOCK.filter((l) => l.statut === 'contentieux').length,
    resolu: LITIGES_MOCK.filter((l) => l.statut === 'resolu').length,
    classe: LITIGES_MOCK.filter((l) => l.statut === 'classe').length,
  },
  par_type: {
    voisinage: LITIGES_MOCK.filter((l) => l.type === 'voisinage').length,
    travaux: LITIGES_MOCK.filter((l) => l.type === 'travaux').length,
    charges: LITIGES_MOCK.filter((l) => l.type === 'charges').length,
    degradation: LITIGES_MOCK.filter((l) => l.type === 'degradation').length,
    autre: LITIGES_MOCK.filter((l) => l.type === 'autre').length,
  },
  par_priorite: {
    basse: LITIGES_MOCK.filter((l) => l.priorite === 'basse').length,
    moyenne: LITIGES_MOCK.filter((l) => l.priorite === 'moyenne').length,
    haute: LITIGES_MOCK.filter((l) => l.priorite === 'haute').length,
    urgente: LITIGES_MOCK.filter((l) => l.priorite === 'urgente').length,
  },
  en_attente_action: LITIGES_MOCK.filter(
    (l) => l.statut === 'ouvert' || l.statut === 'en_cours'
  ).length,
};

// ============================================
// TABLE DE CORRESPONDANCE (migration)
// ============================================

export const LITIGE_ID_MAP: Record<string, string> = {
  '1': LITIGE_IDS.NUISANCES_SONORES,
  '2': LITIGE_IDS.DEGATS_EAUX,
  '3': LITIGE_IDS.CONTESTATION_CHARGES,
};

// ============================================
// HELPERS
// ============================================

export function getLitigeById(id: string): Litige | undefined {
  return LITIGES_MOCK.find((l) => l.id === id);
}

export function getLitigesByCopropriete(coproprieteId: string): Litige[] {
  return LITIGES_MOCK.filter((l) => l.copropriete_id === coproprieteId);
}

export function getLitigesOuverts(): Litige[] {
  return LITIGES_MOCK.filter(
    (l) => l.statut === 'ouvert' || l.statut === 'en_cours'
  );
}

export function getLitigesByCoproprietaire(coproprietaireId: string): Litige[] {
  return LITIGES_MOCK.filter(
    (l) =>
      l.plaignant_id === coproprietaireId ||
      l.mis_en_cause_id === coproprietaireId
  );
}

export function getLitigesParType(type: LitigeType): Litige[] {
  return LITIGES_MOCK.filter((l) => l.type === type);
}

export function getLitigesUrgents(): Litige[] {
  return LITIGES_MOCK.filter(
    (l) =>
      (l.priorite === 'haute' || l.priorite === 'urgente') &&
      l.statut !== 'resolu' &&
      l.statut !== 'classe'
  );
}

export function getLitigesResolus(): Litige[] {
  return LITIGES_MOCK.filter((l) => l.statut === 'resolu');
}

export function getNbActionsParLitige(litige: Litige): number {
  return litige.actions?.length || 0;
}
