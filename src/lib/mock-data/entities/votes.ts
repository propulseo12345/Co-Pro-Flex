/**
 * Mock Data - Votes individuels par copropriétaire
 *
 * @source Créé à partir des résolutions et copropriétaires existants
 * @created 2025-01-19
 *
 * Relations:
 * - resolution_id → resolutions.id
 * - coproprietaire_id → coproprietaires.id
 * - mandataire_id → coproprietaires.id (si vote par mandat)
 *
 * Notes:
 * - Chaque copropriétaire vote avec ses tantièmes
 * - Les votes via mandat sont tracés (mandataire_id)
 * - Les votes par correspondance sont marqués via_correspondance
 * - Total tantièmes: 1818 (13 copropriétaires)
 */

import { BaseEntity } from '../types';
import { RESOLUTION_IDS } from './resolutions';
import { COPROPRIETAIRE_IDS } from './coproprietaires';
import { ASSEMBLEE_IDS } from './assemblees';

// ============================================
// TYPES
// ============================================

export type TypeVote = 'pour' | 'contre' | 'abstention';

export type ModeVote = 'present' | 'mandat' | 'correspondance';

export interface Vote extends BaseEntity {
  // FK Relations
  resolution_id: string;
  coproprietaire_id: string;
  assemblee_id: string;

  // Vote
  sens: TypeVote;
  tantiemes: number; // Poids du vote

  // Mode de vote
  mode_vote: ModeVote;

  // Si représenté par mandat
  via_mandat: boolean;
  mandataire_id?: string; // FK → coproprietaires

  // Si vote par correspondance
  via_correspondance: boolean;

  // Horodatage
  date_vote: string;
  heure_vote?: string; // HH:MM

  // Notes
  observations?: string;
}

// ============================================
// IDS PRÉGÉNÉRÉS
// ============================================

export const VOTE_IDS = {
  // Approbation comptes 2024
  APPRO_LEBLANC: 'vote_11111111-1111-4111-8111-111111111111',
  APPRO_MOREAU: 'vote_22222222-2222-4222-8222-222222222222',
  APPRO_LAURENT: 'vote_33333333-3333-4333-8333-333333333333',
  APPRO_DUBOIS: 'vote_44444444-4444-4444-8444-444444444444',
  APPRO_MARTIN: 'vote_55555555-5555-4555-8555-555555555555',
  APPRO_DUPONT: 'vote_66666666-6666-4666-8666-666666666666',
  APPRO_SCI: 'vote_77777777-7777-4777-8777-777777777777',
  APPRO_RODRIGUEZ: 'vote_88888888-8888-4888-8888-888888888888',
  APPRO_SIMON: 'vote_99999999-9999-4999-8999-999999999999',
  APPRO_GARCIA: 'vote_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  APPRO_THOMAS: 'vote_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  APPRO_LOPEZ: 'vote_cccccccc-cccc-4ccc-8ccc-cccccccccccc',

  // Budget 2025
  BUDGET_LEBLANC: 'vote_dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  BUDGET_MOREAU: 'vote_eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  BUDGET_LAURENT: 'vote_ffffffff-ffff-4fff-8fff-ffffffffffff',
  BUDGET_DUBOIS: 'vote_11112222-1111-4111-8111-111111111111',
  BUDGET_MARTIN: 'vote_22223333-2222-4222-8222-222222222222',
  BUDGET_DUPONT: 'vote_33334444-3333-4333-8333-333333333333',
  BUDGET_SCI: 'vote_44445555-4444-4444-8444-444444444444',
  BUDGET_RODRIGUEZ: 'vote_55556666-5555-4555-8555-555555555555',
  BUDGET_SIMON: 'vote_66667777-6666-4666-8666-666666666666',
  BUDGET_GARCIA: 'vote_77778888-7777-4777-8777-777777777777',
  BUDGET_THOMAS: 'vote_88889999-8888-4888-8888-888888888888',
  BUDGET_LOPEZ: 'vote_9999aaaa-9999-4999-8999-999999999999',

  // Travaux isolation
  ISOL_LEBLANC: 'vote_aaaabbbb-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  ISOL_MOREAU: 'vote_bbbbcccc-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  ISOL_LAURENT: 'vote_ccccdddd-cccc-4ccc-8ccc-cccccccccccc',
  ISOL_DUBOIS: 'vote_ddddeeee-dddd-4ddd-8ddd-dddddddddddd',
  ISOL_MARTIN: 'vote_eeeeffff-eeee-4eee-8eee-eeeeeeeeeeee',
  ISOL_DUPONT: 'vote_ffff0000-ffff-4fff-8fff-ffffffffffff',
  ISOL_SCI: 'vote_00001111-0000-4000-8000-000000000000',
  ISOL_RODRIGUEZ: 'vote_11110000-1111-4111-8111-111111111112',
  ISOL_SIMON: 'vote_00002222-0000-4000-8000-000000000001',
  ISOL_GARCIA: 'vote_22220000-2222-4222-8222-222222222221',
  ISOL_THOMAS: 'vote_00003333-0000-4000-8000-000000000002',
  ISOL_LOPEZ: 'vote_33330000-3333-4333-8333-333333333331',

  // Renouvellement syndic
  SYNDIC_LEBLANC: 'vote_00004444-0000-4000-8000-000000000003',
  SYNDIC_MOREAU: 'vote_44440000-4444-4444-8444-444444444441',
  SYNDIC_LAURENT: 'vote_00005555-0000-4000-8000-000000000004',
  SYNDIC_DUBOIS: 'vote_55550000-5555-4555-8555-555555555551',
  SYNDIC_MARTIN: 'vote_00006666-0000-4000-8000-000000000005',
  SYNDIC_DUPONT: 'vote_66660000-6666-4666-8666-666666666661',
  SYNDIC_SCI: 'vote_00007777-0000-4000-8000-000000000006',
  SYNDIC_RODRIGUEZ: 'vote_77770000-7777-4777-8777-777777777771',
  SYNDIC_SIMON: 'vote_00008888-0000-4000-8000-000000000007',
  SYNDIC_GARCIA: 'vote_88880000-8888-4888-8888-888888888881',
  SYNDIC_THOMAS: 'vote_00009999-0000-4000-8000-000000000008',
  SYNDIC_LOPEZ: 'vote_99990000-9999-4999-8999-999999999991',
} as const;

// ============================================
// CONSTANTES
// ============================================

// Tantièmes par copropriétaire (référence rapide)
const TANTIEMES = {
  LEBLANC: 150,
  MOREAU: 120,
  LAURENT: 200,
  DUBOIS: 98,
  MARTIN: 135,
  DUPONT: 180,
  SCI: 300,
  RODRIGUEZ: 130,
  SIMON: 110,
  GARCIA: 95,
  THOMAS: 140,
  LOPEZ: 160,
} as const;

// ============================================
// DONNÉES MOCK - AG ORDINAIRE 2024
// ============================================

const DATE_AG_2024 = '2024-06-15';

// ============================================
// VOTES RÉSOLUTION 1: APPROBATION COMPTES 2023
// Résultat: 1700 pour, 68 contre, 50 abstentions
// ============================================

const VOTES_APPROBATION_COMPTES: Vote[] = [
  // PRÉSENTS - Pour (1218 tantièmes présents selon assemblées.ts)
  {
    id: VOTE_IDS.APPRO_LEBLANC,
    resolution_id: RESOLUTION_IDS.APPRO_COMPTES_2024,
    coproprietaire_id: COPROPRIETAIRE_IDS.LEBLANC_MARIE,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.LEBLANC,
    mode_vote: 'present',
    via_mandat: false,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:15',
    created_at: `${DATE_AG_2024}T19:15:00Z`,
    updated_at: `${DATE_AG_2024}T19:15:00Z`,
  },
  {
    id: VOTE_IDS.APPRO_MOREAU,
    resolution_id: RESOLUTION_IDS.APPRO_COMPTES_2024,
    coproprietaire_id: COPROPRIETAIRE_IDS.MOREAU_PIERRE,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.MOREAU,
    mode_vote: 'present',
    via_mandat: false,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:15',
    created_at: `${DATE_AG_2024}T19:15:00Z`,
    updated_at: `${DATE_AG_2024}T19:15:00Z`,
  },
  {
    id: VOTE_IDS.APPRO_LAURENT,
    resolution_id: RESOLUTION_IDS.APPRO_COMPTES_2024,
    coproprietaire_id: COPROPRIETAIRE_IDS.LAURENT_SOPHIE,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.LAURENT,
    mode_vote: 'present',
    via_mandat: false,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:15',
    created_at: `${DATE_AG_2024}T19:15:00Z`,
    updated_at: `${DATE_AG_2024}T19:15:00Z`,
  },
  {
    id: VOTE_IDS.APPRO_DUBOIS,
    resolution_id: RESOLUTION_IDS.APPRO_COMPTES_2024,
    coproprietaire_id: COPROPRIETAIRE_IDS.DUBOIS_JEAN,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'abstention', // Abstention
    tantiemes: TANTIEMES.DUBOIS,
    mode_vote: 'present',
    via_mandat: false,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:15',
    observations: 'Souhaite plus de détails sur certaines dépenses',
    created_at: `${DATE_AG_2024}T19:15:00Z`,
    updated_at: `${DATE_AG_2024}T19:15:00Z`,
  },
  {
    id: VOTE_IDS.APPRO_MARTIN,
    resolution_id: RESOLUTION_IDS.APPRO_COMPTES_2024,
    coproprietaire_id: COPROPRIETAIRE_IDS.MARTIN_ANNE,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.MARTIN,
    mode_vote: 'present',
    via_mandat: false,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:15',
    created_at: `${DATE_AG_2024}T19:15:00Z`,
    updated_at: `${DATE_AG_2024}T19:15:00Z`,
  },
  {
    id: VOTE_IDS.APPRO_DUPONT,
    resolution_id: RESOLUTION_IDS.APPRO_COMPTES_2024,
    coproprietaire_id: COPROPRIETAIRE_IDS.DUPONT_MARTIN,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.DUPONT,
    mode_vote: 'present',
    via_mandat: false,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:15',
    observations: 'Président CS - A présenté les comptes',
    created_at: `${DATE_AG_2024}T19:15:00Z`,
    updated_at: `${DATE_AG_2024}T19:15:00Z`,
  },
  {
    id: VOTE_IDS.APPRO_SCI,
    resolution_id: RESOLUTION_IDS.APPRO_COMPTES_2024,
    coproprietaire_id: COPROPRIETAIRE_IDS.SCI_LES_ORMES,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.SCI,
    mode_vote: 'present',
    via_mandat: false,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:15',
    created_at: `${DATE_AG_2024}T19:15:00Z`,
    updated_at: `${DATE_AG_2024}T19:15:00Z`,
  },
  {
    id: VOTE_IDS.APPRO_RODRIGUEZ,
    resolution_id: RESOLUTION_IDS.APPRO_COMPTES_2024,
    coproprietaire_id: COPROPRIETAIRE_IDS.RODRIGUEZ_CARLOS,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.RODRIGUEZ,
    mode_vote: 'present',
    via_mandat: false,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:15',
    created_at: `${DATE_AG_2024}T19:15:00Z`,
    updated_at: `${DATE_AG_2024}T19:15:00Z`,
  },
  // MANDATS - Représentés (440 tantièmes)
  {
    id: VOTE_IDS.APPRO_SIMON,
    resolution_id: RESOLUTION_IDS.APPRO_COMPTES_2024,
    coproprietaire_id: COPROPRIETAIRE_IDS.SIMON_M,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.SIMON,
    mode_vote: 'mandat',
    via_mandat: true,
    mandataire_id: COPROPRIETAIRE_IDS.DUPONT_MARTIN, // Représenté par le Président CS
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:15',
    observations: 'Mandat donné au Président CS',
    created_at: `${DATE_AG_2024}T19:15:00Z`,
    updated_at: `${DATE_AG_2024}T19:15:00Z`,
  },
  {
    id: VOTE_IDS.APPRO_GARCIA,
    resolution_id: RESOLUTION_IDS.APPRO_COMPTES_2024,
    coproprietaire_id: COPROPRIETAIRE_IDS.GARCIA_MME,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.GARCIA,
    mode_vote: 'mandat',
    via_mandat: true,
    mandataire_id: COPROPRIETAIRE_IDS.LAURENT_SOPHIE, // Représenté par Mme Laurent
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:15',
    created_at: `${DATE_AG_2024}T19:15:00Z`,
    updated_at: `${DATE_AG_2024}T19:15:00Z`,
  },
  {
    id: VOTE_IDS.APPRO_THOMAS,
    resolution_id: RESOLUTION_IDS.APPRO_COMPTES_2024,
    coproprietaire_id: COPROPRIETAIRE_IDS.THOMAS_M,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'contre', // Contre
    tantiemes: TANTIEMES.THOMAS,
    mode_vote: 'mandat',
    via_mandat: true,
    mandataire_id: COPROPRIETAIRE_IDS.LOPEZ_MME, // Représenté par Mme Lopez
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:15',
    observations: 'En désaccord avec charges de gardiennage',
    created_at: `${DATE_AG_2024}T19:15:00Z`,
    updated_at: `${DATE_AG_2024}T19:15:00Z`,
  },
  // VOTE PAR CORRESPONDANCE (160 tantièmes)
  {
    id: VOTE_IDS.APPRO_LOPEZ,
    resolution_id: RESOLUTION_IDS.APPRO_COMPTES_2024,
    coproprietaire_id: COPROPRIETAIRE_IDS.LOPEZ_MME,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.LOPEZ,
    mode_vote: 'correspondance',
    via_mandat: false,
    via_correspondance: true,
    date_vote: '2024-06-10', // Envoyé 5 jours avant
    observations: 'Formulaire de vote par correspondance reçu le 10/06',
    created_at: '2024-06-10T10:00:00Z',
    updated_at: '2024-06-10T10:00:00Z',
  },
];

// ============================================
// VOTES RÉSOLUTION 3: BUDGET 2025
// Résultat: 1580 pour, 138 contre, 100 abstentions
// ============================================

const VOTES_BUDGET_2025: Vote[] = [
  {
    id: VOTE_IDS.BUDGET_LEBLANC,
    resolution_id: RESOLUTION_IDS.BUDGET_2025,
    coproprietaire_id: COPROPRIETAIRE_IDS.LEBLANC_MARIE,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.LEBLANC,
    mode_vote: 'present',
    via_mandat: false,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:35',
    created_at: `${DATE_AG_2024}T19:35:00Z`,
    updated_at: `${DATE_AG_2024}T19:35:00Z`,
  },
  {
    id: VOTE_IDS.BUDGET_MOREAU,
    resolution_id: RESOLUTION_IDS.BUDGET_2025,
    coproprietaire_id: COPROPRIETAIRE_IDS.MOREAU_PIERRE,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'contre', // Contre
    tantiemes: TANTIEMES.MOREAU,
    mode_vote: 'present',
    via_mandat: false,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:35',
    observations: 'Hausse jugée trop importante',
    created_at: `${DATE_AG_2024}T19:35:00Z`,
    updated_at: `${DATE_AG_2024}T19:35:00Z`,
  },
  {
    id: VOTE_IDS.BUDGET_LAURENT,
    resolution_id: RESOLUTION_IDS.BUDGET_2025,
    coproprietaire_id: COPROPRIETAIRE_IDS.LAURENT_SOPHIE,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.LAURENT,
    mode_vote: 'present',
    via_mandat: false,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:35',
    created_at: `${DATE_AG_2024}T19:35:00Z`,
    updated_at: `${DATE_AG_2024}T19:35:00Z`,
  },
  {
    id: VOTE_IDS.BUDGET_DUBOIS,
    resolution_id: RESOLUTION_IDS.BUDGET_2025,
    coproprietaire_id: COPROPRIETAIRE_IDS.DUBOIS_JEAN,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'abstention', // Abstention
    tantiemes: TANTIEMES.DUBOIS,
    mode_vote: 'present',
    via_mandat: false,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:35',
    created_at: `${DATE_AG_2024}T19:35:00Z`,
    updated_at: `${DATE_AG_2024}T19:35:00Z`,
  },
  {
    id: VOTE_IDS.BUDGET_MARTIN,
    resolution_id: RESOLUTION_IDS.BUDGET_2025,
    coproprietaire_id: COPROPRIETAIRE_IDS.MARTIN_ANNE,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.MARTIN,
    mode_vote: 'present',
    via_mandat: false,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:35',
    created_at: `${DATE_AG_2024}T19:35:00Z`,
    updated_at: `${DATE_AG_2024}T19:35:00Z`,
  },
  {
    id: VOTE_IDS.BUDGET_DUPONT,
    resolution_id: RESOLUTION_IDS.BUDGET_2025,
    coproprietaire_id: COPROPRIETAIRE_IDS.DUPONT_MARTIN,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.DUPONT,
    mode_vote: 'present',
    via_mandat: false,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:35',
    created_at: `${DATE_AG_2024}T19:35:00Z`,
    updated_at: `${DATE_AG_2024}T19:35:00Z`,
  },
  {
    id: VOTE_IDS.BUDGET_SCI,
    resolution_id: RESOLUTION_IDS.BUDGET_2025,
    coproprietaire_id: COPROPRIETAIRE_IDS.SCI_LES_ORMES,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.SCI,
    mode_vote: 'present',
    via_mandat: false,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:35',
    created_at: `${DATE_AG_2024}T19:35:00Z`,
    updated_at: `${DATE_AG_2024}T19:35:00Z`,
  },
  {
    id: VOTE_IDS.BUDGET_RODRIGUEZ,
    resolution_id: RESOLUTION_IDS.BUDGET_2025,
    coproprietaire_id: COPROPRIETAIRE_IDS.RODRIGUEZ_CARLOS,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.RODRIGUEZ,
    mode_vote: 'present',
    via_mandat: false,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:35',
    created_at: `${DATE_AG_2024}T19:35:00Z`,
    updated_at: `${DATE_AG_2024}T19:35:00Z`,
  },
  {
    id: VOTE_IDS.BUDGET_SIMON,
    resolution_id: RESOLUTION_IDS.BUDGET_2025,
    coproprietaire_id: COPROPRIETAIRE_IDS.SIMON_M,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.SIMON,
    mode_vote: 'mandat',
    via_mandat: true,
    mandataire_id: COPROPRIETAIRE_IDS.DUPONT_MARTIN,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:35',
    created_at: `${DATE_AG_2024}T19:35:00Z`,
    updated_at: `${DATE_AG_2024}T19:35:00Z`,
  },
  {
    id: VOTE_IDS.BUDGET_GARCIA,
    resolution_id: RESOLUTION_IDS.BUDGET_2025,
    coproprietaire_id: COPROPRIETAIRE_IDS.GARCIA_MME,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.GARCIA,
    mode_vote: 'mandat',
    via_mandat: true,
    mandataire_id: COPROPRIETAIRE_IDS.LAURENT_SOPHIE,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:35',
    created_at: `${DATE_AG_2024}T19:35:00Z`,
    updated_at: `${DATE_AG_2024}T19:35:00Z`,
  },
  {
    id: VOTE_IDS.BUDGET_THOMAS,
    resolution_id: RESOLUTION_IDS.BUDGET_2025,
    coproprietaire_id: COPROPRIETAIRE_IDS.THOMAS_M,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'contre', // Contre
    tantiemes: TANTIEMES.THOMAS,
    mode_vote: 'mandat',
    via_mandat: true,
    mandataire_id: COPROPRIETAIRE_IDS.LOPEZ_MME,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:35',
    created_at: `${DATE_AG_2024}T19:35:00Z`,
    updated_at: `${DATE_AG_2024}T19:35:00Z`,
  },
  {
    id: VOTE_IDS.BUDGET_LOPEZ,
    resolution_id: RESOLUTION_IDS.BUDGET_2025,
    coproprietaire_id: COPROPRIETAIRE_IDS.LOPEZ_MME,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.LOPEZ,
    mode_vote: 'correspondance',
    via_mandat: false,
    via_correspondance: true,
    date_vote: '2024-06-10',
    created_at: '2024-06-10T10:00:00Z',
    updated_at: '2024-06-10T10:00:00Z',
  },
];

// ============================================
// VOTES RÉSOLUTION 8: TRAVAUX ISOLATION
// Résultat: 1350 pour, 318 contre, 150 abstentions
// ============================================

const VOTES_TRAVAUX_ISOLATION: Vote[] = [
  {
    id: VOTE_IDS.ISOL_LEBLANC,
    resolution_id: RESOLUTION_IDS.TRAVAUX_ISOLATION,
    coproprietaire_id: COPROPRIETAIRE_IDS.LEBLANC_MARIE,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.LEBLANC,
    mode_vote: 'present',
    via_mandat: false,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '20:15',
    created_at: `${DATE_AG_2024}T20:15:00Z`,
    updated_at: `${DATE_AG_2024}T20:15:00Z`,
  },
  {
    id: VOTE_IDS.ISOL_MOREAU,
    resolution_id: RESOLUTION_IDS.TRAVAUX_ISOLATION,
    coproprietaire_id: COPROPRIETAIRE_IDS.MOREAU_PIERRE,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'contre', // Contre - Coût trop élevé
    tantiemes: TANTIEMES.MOREAU,
    mode_vote: 'present',
    via_mandat: false,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '20:15',
    observations: 'Souhaite reporter les travaux',
    created_at: `${DATE_AG_2024}T20:15:00Z`,
    updated_at: `${DATE_AG_2024}T20:15:00Z`,
  },
  {
    id: VOTE_IDS.ISOL_LAURENT,
    resolution_id: RESOLUTION_IDS.TRAVAUX_ISOLATION,
    coproprietaire_id: COPROPRIETAIRE_IDS.LAURENT_SOPHIE,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.LAURENT,
    mode_vote: 'present',
    via_mandat: false,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '20:15',
    created_at: `${DATE_AG_2024}T20:15:00Z`,
    updated_at: `${DATE_AG_2024}T20:15:00Z`,
  },
  {
    id: VOTE_IDS.ISOL_DUBOIS,
    resolution_id: RESOLUTION_IDS.TRAVAUX_ISOLATION,
    coproprietaire_id: COPROPRIETAIRE_IDS.DUBOIS_JEAN,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'abstention', // Abstention
    tantiemes: TANTIEMES.DUBOIS,
    mode_vote: 'present',
    via_mandat: false,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '20:15',
    observations: 'Demande plus de devis comparatifs',
    created_at: `${DATE_AG_2024}T20:15:00Z`,
    updated_at: `${DATE_AG_2024}T20:15:00Z`,
  },
  {
    id: VOTE_IDS.ISOL_MARTIN,
    resolution_id: RESOLUTION_IDS.TRAVAUX_ISOLATION,
    coproprietaire_id: COPROPRIETAIRE_IDS.MARTIN_ANNE,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.MARTIN,
    mode_vote: 'present',
    via_mandat: false,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '20:15',
    created_at: `${DATE_AG_2024}T20:15:00Z`,
    updated_at: `${DATE_AG_2024}T20:15:00Z`,
  },
  {
    id: VOTE_IDS.ISOL_DUPONT,
    resolution_id: RESOLUTION_IDS.TRAVAUX_ISOLATION,
    coproprietaire_id: COPROPRIETAIRE_IDS.DUPONT_MARTIN,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.DUPONT,
    mode_vote: 'present',
    via_mandat: false,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '20:15',
    observations: 'A présenté le dossier et les devis',
    created_at: `${DATE_AG_2024}T20:15:00Z`,
    updated_at: `${DATE_AG_2024}T20:15:00Z`,
  },
  {
    id: VOTE_IDS.ISOL_SCI,
    resolution_id: RESOLUTION_IDS.TRAVAUX_ISOLATION,
    coproprietaire_id: COPROPRIETAIRE_IDS.SCI_LES_ORMES,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'contre', // Contre - Commerce pas concerné
    tantiemes: TANTIEMES.SCI,
    mode_vote: 'present',
    via_mandat: false,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '20:15',
    observations: 'RDC non concerné par isolation combles',
    created_at: `${DATE_AG_2024}T20:15:00Z`,
    updated_at: `${DATE_AG_2024}T20:15:00Z`,
  },
  {
    id: VOTE_IDS.ISOL_RODRIGUEZ,
    resolution_id: RESOLUTION_IDS.TRAVAUX_ISOLATION,
    coproprietaire_id: COPROPRIETAIRE_IDS.RODRIGUEZ_CARLOS,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.RODRIGUEZ,
    mode_vote: 'present',
    via_mandat: false,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '20:15',
    created_at: `${DATE_AG_2024}T20:15:00Z`,
    updated_at: `${DATE_AG_2024}T20:15:00Z`,
  },
  {
    id: VOTE_IDS.ISOL_SIMON,
    resolution_id: RESOLUTION_IDS.TRAVAUX_ISOLATION,
    coproprietaire_id: COPROPRIETAIRE_IDS.SIMON_M,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.SIMON,
    mode_vote: 'mandat',
    via_mandat: true,
    mandataire_id: COPROPRIETAIRE_IDS.DUPONT_MARTIN,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '20:15',
    created_at: `${DATE_AG_2024}T20:15:00Z`,
    updated_at: `${DATE_AG_2024}T20:15:00Z`,
  },
  {
    id: VOTE_IDS.ISOL_GARCIA,
    resolution_id: RESOLUTION_IDS.TRAVAUX_ISOLATION,
    coproprietaire_id: COPROPRIETAIRE_IDS.GARCIA_MME,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'abstention', // Abstention
    tantiemes: TANTIEMES.GARCIA,
    mode_vote: 'mandat',
    via_mandat: true,
    mandataire_id: COPROPRIETAIRE_IDS.LAURENT_SOPHIE,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '20:15',
    created_at: `${DATE_AG_2024}T20:15:00Z`,
    updated_at: `${DATE_AG_2024}T20:15:00Z`,
  },
  {
    id: VOTE_IDS.ISOL_THOMAS,
    resolution_id: RESOLUTION_IDS.TRAVAUX_ISOLATION,
    coproprietaire_id: COPROPRIETAIRE_IDS.THOMAS_M,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.THOMAS,
    mode_vote: 'mandat',
    via_mandat: true,
    mandataire_id: COPROPRIETAIRE_IDS.LOPEZ_MME,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '20:15',
    created_at: `${DATE_AG_2024}T20:15:00Z`,
    updated_at: `${DATE_AG_2024}T20:15:00Z`,
  },
  {
    id: VOTE_IDS.ISOL_LOPEZ,
    resolution_id: RESOLUTION_IDS.TRAVAUX_ISOLATION,
    coproprietaire_id: COPROPRIETAIRE_IDS.LOPEZ_MME,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.LOPEZ,
    mode_vote: 'correspondance',
    via_mandat: false,
    via_correspondance: true,
    date_vote: '2024-06-10',
    created_at: '2024-06-10T10:00:00Z',
    updated_at: '2024-06-10T10:00:00Z',
  },
];

// ============================================
// VOTES RÉSOLUTION 5: RENOUVELLEMENT SYNDIC
// Résultat: 1400 pour, 268 contre, 150 abstentions
// ============================================

const VOTES_RENOUVELLEMENT_SYNDIC: Vote[] = [
  {
    id: VOTE_IDS.SYNDIC_LEBLANC,
    resolution_id: RESOLUTION_IDS.RENOUV_SYNDIC,
    coproprietaire_id: COPROPRIETAIRE_IDS.LEBLANC_MARIE,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.LEBLANC,
    mode_vote: 'present',
    via_mandat: false,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:50',
    created_at: `${DATE_AG_2024}T19:50:00Z`,
    updated_at: `${DATE_AG_2024}T19:50:00Z`,
  },
  {
    id: VOTE_IDS.SYNDIC_MOREAU,
    resolution_id: RESOLUTION_IDS.RENOUV_SYNDIC,
    coproprietaire_id: COPROPRIETAIRE_IDS.MOREAU_PIERRE,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'contre', // Contre - Souhaite syndic professionnel
    tantiemes: TANTIEMES.MOREAU,
    mode_vote: 'present',
    via_mandat: false,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:50',
    observations: 'Préférerait un syndic professionnel',
    created_at: `${DATE_AG_2024}T19:50:00Z`,
    updated_at: `${DATE_AG_2024}T19:50:00Z`,
  },
  {
    id: VOTE_IDS.SYNDIC_LAURENT,
    resolution_id: RESOLUTION_IDS.RENOUV_SYNDIC,
    coproprietaire_id: COPROPRIETAIRE_IDS.LAURENT_SOPHIE,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.LAURENT,
    mode_vote: 'present',
    via_mandat: false,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:50',
    created_at: `${DATE_AG_2024}T19:50:00Z`,
    updated_at: `${DATE_AG_2024}T19:50:00Z`,
  },
  {
    id: VOTE_IDS.SYNDIC_DUBOIS,
    resolution_id: RESOLUTION_IDS.RENOUV_SYNDIC,
    coproprietaire_id: COPROPRIETAIRE_IDS.DUBOIS_JEAN,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'abstention', // Abstention
    tantiemes: TANTIEMES.DUBOIS,
    mode_vote: 'present',
    via_mandat: false,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:50',
    created_at: `${DATE_AG_2024}T19:50:00Z`,
    updated_at: `${DATE_AG_2024}T19:50:00Z`,
  },
  {
    id: VOTE_IDS.SYNDIC_MARTIN,
    resolution_id: RESOLUTION_IDS.RENOUV_SYNDIC,
    coproprietaire_id: COPROPRIETAIRE_IDS.MARTIN_ANNE,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.MARTIN,
    mode_vote: 'present',
    via_mandat: false,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:50',
    created_at: `${DATE_AG_2024}T19:50:00Z`,
    updated_at: `${DATE_AG_2024}T19:50:00Z`,
  },
  {
    id: VOTE_IDS.SYNDIC_DUPONT,
    resolution_id: RESOLUTION_IDS.RENOUV_SYNDIC,
    coproprietaire_id: COPROPRIETAIRE_IDS.DUPONT_MARTIN,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'abstention', // Ne vote pas pour lui-même
    tantiemes: TANTIEMES.DUPONT,
    mode_vote: 'present',
    via_mandat: false,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:50',
    observations: 'Abstention - Candidat au poste',
    created_at: `${DATE_AG_2024}T19:50:00Z`,
    updated_at: `${DATE_AG_2024}T19:50:00Z`,
  },
  {
    id: VOTE_IDS.SYNDIC_SCI,
    resolution_id: RESOLUTION_IDS.RENOUV_SYNDIC,
    coproprietaire_id: COPROPRIETAIRE_IDS.SCI_LES_ORMES,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.SCI,
    mode_vote: 'present',
    via_mandat: false,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:50',
    created_at: `${DATE_AG_2024}T19:50:00Z`,
    updated_at: `${DATE_AG_2024}T19:50:00Z`,
  },
  {
    id: VOTE_IDS.SYNDIC_RODRIGUEZ,
    resolution_id: RESOLUTION_IDS.RENOUV_SYNDIC,
    coproprietaire_id: COPROPRIETAIRE_IDS.RODRIGUEZ_CARLOS,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.RODRIGUEZ,
    mode_vote: 'present',
    via_mandat: false,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:50',
    created_at: `${DATE_AG_2024}T19:50:00Z`,
    updated_at: `${DATE_AG_2024}T19:50:00Z`,
  },
  {
    id: VOTE_IDS.SYNDIC_SIMON,
    resolution_id: RESOLUTION_IDS.RENOUV_SYNDIC,
    coproprietaire_id: COPROPRIETAIRE_IDS.SIMON_M,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.SIMON,
    mode_vote: 'mandat',
    via_mandat: true,
    mandataire_id: COPROPRIETAIRE_IDS.DUPONT_MARTIN,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:50',
    created_at: `${DATE_AG_2024}T19:50:00Z`,
    updated_at: `${DATE_AG_2024}T19:50:00Z`,
  },
  {
    id: VOTE_IDS.SYNDIC_GARCIA,
    resolution_id: RESOLUTION_IDS.RENOUV_SYNDIC,
    coproprietaire_id: COPROPRIETAIRE_IDS.GARCIA_MME,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.GARCIA,
    mode_vote: 'mandat',
    via_mandat: true,
    mandataire_id: COPROPRIETAIRE_IDS.LAURENT_SOPHIE,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:50',
    created_at: `${DATE_AG_2024}T19:50:00Z`,
    updated_at: `${DATE_AG_2024}T19:50:00Z`,
  },
  {
    id: VOTE_IDS.SYNDIC_THOMAS,
    resolution_id: RESOLUTION_IDS.RENOUV_SYNDIC,
    coproprietaire_id: COPROPRIETAIRE_IDS.THOMAS_M,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'contre', // Contre
    tantiemes: TANTIEMES.THOMAS,
    mode_vote: 'mandat',
    via_mandat: true,
    mandataire_id: COPROPRIETAIRE_IDS.LOPEZ_MME,
    via_correspondance: false,
    date_vote: DATE_AG_2024,
    heure_vote: '19:50',
    created_at: `${DATE_AG_2024}T19:50:00Z`,
    updated_at: `${DATE_AG_2024}T19:50:00Z`,
  },
  {
    id: VOTE_IDS.SYNDIC_LOPEZ,
    resolution_id: RESOLUTION_IDS.RENOUV_SYNDIC,
    coproprietaire_id: COPROPRIETAIRE_IDS.LOPEZ_MME,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    sens: 'pour',
    tantiemes: TANTIEMES.LOPEZ,
    mode_vote: 'correspondance',
    via_mandat: false,
    via_correspondance: true,
    date_vote: '2024-06-10',
    created_at: '2024-06-10T10:00:00Z',
    updated_at: '2024-06-10T10:00:00Z',
  },
];

// ============================================
// EXPORT CONSOLIDÉ
// ============================================

export const VOTES_MOCK: Vote[] = [
  ...VOTES_APPROBATION_COMPTES,
  ...VOTES_BUDGET_2025,
  ...VOTES_TRAVAUX_ISOLATION,
  ...VOTES_RENOUVELLEMENT_SYNDIC,
];

// ============================================
// STATISTIQUES
// ============================================

export const VOTES_STATS = {
  total: VOTES_MOCK.length,
  par_sens: {
    pour: VOTES_MOCK.filter((v) => v.sens === 'pour').length,
    contre: VOTES_MOCK.filter((v) => v.sens === 'contre').length,
    abstention: VOTES_MOCK.filter((v) => v.sens === 'abstention').length,
  },
  par_mode: {
    present: VOTES_MOCK.filter((v) => v.mode_vote === 'present').length,
    mandat: VOTES_MOCK.filter((v) => v.mode_vote === 'mandat').length,
    correspondance: VOTES_MOCK.filter((v) => v.mode_vote === 'correspondance')
      .length,
  },
  tantiemes_votes: VOTES_MOCK.reduce((sum, v) => sum + v.tantiemes, 0),
  resolutions_couvertes: Array.from(new Set(VOTES_MOCK.map((v) => v.resolution_id)))
    .length,
};

// ============================================
// TABLE DE CORRESPONDANCE (migration)
// ============================================

export const VOTE_ID_MAP: Record<string, string> = {
  // Mapping pour les anciens IDs si nécessaire
};

// ============================================
// HELPERS
// ============================================

export function getVoteById(id: string): Vote | undefined {
  return VOTES_MOCK.find((v) => v.id === id);
}

export function getVotesByResolution(resolutionId: string): Vote[] {
  return VOTES_MOCK.filter((v) => v.resolution_id === resolutionId);
}

export function getVotesByCoproprietaire(coproprietaireId: string): Vote[] {
  return VOTES_MOCK.filter((v) => v.coproprietaire_id === coproprietaireId);
}

export function getVotesByAssemblee(assembleeId: string): Vote[] {
  return VOTES_MOCK.filter((v) => v.assemblee_id === assembleeId);
}

export function getVotesByMandataire(mandataireId: string): Vote[] {
  return VOTES_MOCK.filter((v) => v.mandataire_id === mandataireId);
}

export function calculerResultatVotes(resolutionId: string): {
  total_votants: number;
  tantiemes_pour: number;
  tantiemes_contre: number;
  tantiemes_abstention: number;
  pourcentage_pour: number;
  par_mode: {
    presents: number;
    mandats: number;
    correspondance: number;
  };
} {
  const votes = getVotesByResolution(resolutionId);

  const tantiemesPour = votes
    .filter((v) => v.sens === 'pour')
    .reduce((sum, v) => sum + v.tantiemes, 0);

  const tantiemesContre = votes
    .filter((v) => v.sens === 'contre')
    .reduce((sum, v) => sum + v.tantiemes, 0);

  const tantiemesAbstention = votes
    .filter((v) => v.sens === 'abstention')
    .reduce((sum, v) => sum + v.tantiemes, 0);

  const totalVotants = tantiemesPour + tantiemesContre + tantiemesAbstention;

  return {
    total_votants: totalVotants,
    tantiemes_pour: tantiemesPour,
    tantiemes_contre: tantiemesContre,
    tantiemes_abstention: tantiemesAbstention,
    pourcentage_pour:
      totalVotants > 0
        ? Math.round((tantiemesPour / totalVotants) * 10000) / 100
        : 0,
    par_mode: {
      presents: votes.filter((v) => v.mode_vote === 'present').length,
      mandats: votes.filter((v) => v.mode_vote === 'mandat').length,
      correspondance: votes.filter((v) => v.mode_vote === 'correspondance')
        .length,
    },
  };
}

export function getHistoriqueVotesCoproprietaire(
  coproprietaireId: string
): {
  resolution_id: string;
  date: string;
  sens: TypeVote;
  tantiemes: number;
}[] {
  return getVotesByCoproprietaire(coproprietaireId)
    .map((v) => ({
      resolution_id: v.resolution_id,
      date: v.date_vote,
      sens: v.sens,
      tantiemes: v.tantiemes,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
