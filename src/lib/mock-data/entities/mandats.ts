/**
 * Mock Data - Mandats (Procurations) pour Assemblées Générales
 *
 * @source Créé à partir des assemblées et copropriétaires existants
 * @created 2025-01-19
 *
 * Relations:
 * - assemblee_id → assemblees.id
 * - mandant_id → coproprietaires.id (celui qui donne le pouvoir)
 * - mandataire_id → coproprietaires.id (celui qui reçoit le pouvoir)
 *
 * Notes:
 * - Un mandataire peut représenter max 3 copropriétaires (loi ELAN)
 * - Les tantièmes représentés sont plafonnés à 10% du total
 * - Le mandat peut être nominatif ou en blanc (mandataire choisi par le bureau)
 */

import { BaseEntity } from '../types';
import { ASSEMBLEE_IDS } from './assemblees';
import { COPROPRIETAIRE_IDS } from './coproprietaires';

// ============================================
// TYPES
// ============================================

export type StatutMandat =
  | 'valide' // Mandat accepté et valide
  | 'utilise' // Mandat utilisé lors de l'AG
  | 'expire' // Mandat expiré (AG passée)
  | 'annule' // Mandat annulé par le mandant
  | 'refuse'; // Mandat refusé par le mandataire

export type TypeMandat =
  | 'nominatif' // Mandataire désigné par le mandant
  | 'en_blanc' // Mandataire choisi par le bureau de l'AG
  | 'syndic' // Donné au syndic
  | 'president_seance'; // Donné au président de séance

export interface Mandat extends BaseEntity {
  // FK Relations
  assemblee_id: string;
  mandant_id: string; // Copropriétaire qui donne le pouvoir
  mandataire_id: string; // Copropriétaire qui reçoit le pouvoir

  // Référence
  reference: string; // "MAN-2024-001"
  numero_ordre: number; // Ordre de réception

  // Type de mandat
  type: TypeMandat;

  // Pouvoir donné
  tantiemes_mandant: number; // Tantièmes du mandant
  instructions_vote?: string; // Instructions spécifiques du mandant

  // Statut
  statut: StatutMandat;

  // Dates
  date_reception: string; // Date de réception du mandat
  date_signature: string; // Date de signature par le mandant
  date_utilisation?: string; // Date d'utilisation effective

  // Validation
  valide_par?: string; // Nom de la personne qui a validé
  date_validation?: string;

  // Notes
  observations?: string;
}

// ============================================
// IDS PRÉGÉNÉRÉS
// ============================================

export const MANDAT_IDS = {
  // AG 2024
  MAN_2024_SIMON: 'man_11111111-1111-4111-8111-111111111111',
  MAN_2024_GARCIA: 'man_22222222-2222-4222-8222-222222222222',
  MAN_2024_THOMAS: 'man_33333333-3333-4333-8333-333333333333',
  MAN_2024_BERNARD: 'man_44444444-4444-4444-8444-444444444444',

  // AGE Ravalement 2023
  MAN_2023_GARCIA: 'man_55555555-5555-4555-8555-555555555555',
  MAN_2023_SIMON: 'man_66666666-6666-4666-8666-666666666666',
  MAN_2023_MOREAU: 'man_77777777-7777-4777-8777-777777777777',

  // AG 2023
  MAN_2023ORD_SIMON: 'man_88888888-8888-4888-8888-888888888888',
  MAN_2023ORD_GARCIA: 'man_99999999-9999-4999-8999-999999999999',
  MAN_2023ORD_THOMAS: 'man_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',

  // AG 2025 (à venir)
  MAN_2025_SIMON: 'man_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  MAN_2025_GARCIA: 'man_cccccccc-cccc-4ccc-8ccc-cccccccccccc',
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

// Plafond légal (loi ELAN)
export const MAX_MANDATS_PAR_MANDATAIRE = 3;
export const PLAFOND_TANTIEMES_PERCENT = 10; // 10% du total

// ============================================
// DONNÉES MOCK - AG ORDINAIRE 2024
// ============================================

const MANDATS_AG_2024: Mandat[] = [
  {
    id: MANDAT_IDS.MAN_2024_SIMON,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    mandant_id: COPROPRIETAIRE_IDS.SIMON_M,
    mandataire_id: COPROPRIETAIRE_IDS.DUPONT_MARTIN,
    reference: 'MAN-2024-001',
    numero_ordre: 1,
    type: 'nominatif',
    tantiemes_mandant: TANTIEMES.SIMON,
    instructions_vote: 'Voter selon les recommandations du Conseil Syndical',
    statut: 'utilise',
    date_reception: '2024-06-10',
    date_signature: '2024-06-08',
    date_utilisation: '2024-06-15',
    valide_par: 'Secrétaire de séance',
    date_validation: '2024-06-15',
    observations: 'Mandat nominatif au Président CS',
    created_at: '2024-06-08T10:00:00Z',
    updated_at: '2024-06-15T19:00:00Z',
  },
  {
    id: MANDAT_IDS.MAN_2024_GARCIA,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    mandant_id: COPROPRIETAIRE_IDS.GARCIA_MME,
    mandataire_id: COPROPRIETAIRE_IDS.LAURENT_SOPHIE,
    reference: 'MAN-2024-002',
    numero_ordre: 2,
    type: 'nominatif',
    tantiemes_mandant: TANTIEMES.GARCIA,
    statut: 'utilise',
    date_reception: '2024-06-12',
    date_signature: '2024-06-11',
    date_utilisation: '2024-06-15',
    valide_par: 'Secrétaire de séance',
    date_validation: '2024-06-15',
    created_at: '2024-06-11T14:00:00Z',
    updated_at: '2024-06-15T19:00:00Z',
  },
  {
    id: MANDAT_IDS.MAN_2024_THOMAS,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    mandant_id: COPROPRIETAIRE_IDS.THOMAS_M,
    mandataire_id: COPROPRIETAIRE_IDS.LOPEZ_MME,
    reference: 'MAN-2024-003',
    numero_ordre: 3,
    type: 'nominatif',
    tantiemes_mandant: TANTIEMES.THOMAS,
    instructions_vote: 'Voter CONTRE les augmentations de charges',
    statut: 'utilise',
    date_reception: '2024-06-14',
    date_signature: '2024-06-13',
    date_utilisation: '2024-06-15',
    valide_par: 'Secrétaire de séance',
    date_validation: '2024-06-15',
    observations: 'Instructions spécifiques - Voté via correspondance mandataire',
    created_at: '2024-06-13T09:00:00Z',
    updated_at: '2024-06-15T19:00:00Z',
  },
  {
    id: MANDAT_IDS.MAN_2024_BERNARD,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    mandant_id: COPROPRIETAIRE_IDS.BERNARD_FRANCOIS,
    mandataire_id: COPROPRIETAIRE_IDS.MARTIN_ANNE,
    reference: 'MAN-2024-004',
    numero_ordre: 4,
    type: 'en_blanc',
    tantiemes_mandant: 95, // Tantièmes estimés
    statut: 'utilise',
    date_reception: '2024-06-14',
    date_signature: '2024-06-12',
    date_utilisation: '2024-06-15',
    valide_par: 'Président de séance',
    date_validation: '2024-06-15',
    observations: 'Mandat en blanc - Attribué par le bureau à Mme Martin',
    created_at: '2024-06-12T16:00:00Z',
    updated_at: '2024-06-15T19:00:00Z',
  },
];

// ============================================
// DONNÉES MOCK - AGE RAVALEMENT 2023
// ============================================

const MANDATS_AGE_2023: Mandat[] = [
  {
    id: MANDAT_IDS.MAN_2023_GARCIA,
    assemblee_id: ASSEMBLEE_IDS.AGE_RAVALEMENT_2023,
    mandant_id: COPROPRIETAIRE_IDS.GARCIA_MME,
    mandataire_id: COPROPRIETAIRE_IDS.LAURENT_SOPHIE,
    reference: 'MAN-2023-AGE-001',
    numero_ordre: 1,
    type: 'nominatif',
    tantiemes_mandant: TANTIEMES.GARCIA,
    statut: 'utilise',
    date_reception: '2023-10-12',
    date_signature: '2023-10-10',
    date_utilisation: '2023-10-15',
    valide_par: 'Secrétaire de séance',
    date_validation: '2023-10-15',
    created_at: '2023-10-10T10:00:00Z',
    updated_at: '2023-10-15T20:00:00Z',
  },
  {
    id: MANDAT_IDS.MAN_2023_SIMON,
    assemblee_id: ASSEMBLEE_IDS.AGE_RAVALEMENT_2023,
    mandant_id: COPROPRIETAIRE_IDS.SIMON_M,
    mandataire_id: COPROPRIETAIRE_IDS.DUPONT_MARTIN,
    reference: 'MAN-2023-AGE-002',
    numero_ordre: 2,
    type: 'nominatif',
    tantiemes_mandant: TANTIEMES.SIMON,
    instructions_vote: 'Voter POUR les travaux de ravalement',
    statut: 'utilise',
    date_reception: '2023-10-13',
    date_signature: '2023-10-11',
    date_utilisation: '2023-10-15',
    valide_par: 'Secrétaire de séance',
    date_validation: '2023-10-15',
    created_at: '2023-10-11T14:00:00Z',
    updated_at: '2023-10-15T20:00:00Z',
  },
  {
    id: MANDAT_IDS.MAN_2023_MOREAU,
    assemblee_id: ASSEMBLEE_IDS.AGE_RAVALEMENT_2023,
    mandant_id: COPROPRIETAIRE_IDS.MOREAU_PIERRE,
    mandataire_id: COPROPRIETAIRE_IDS.LEBLANC_MARIE,
    reference: 'MAN-2023-AGE-003',
    numero_ordre: 3,
    type: 'nominatif',
    tantiemes_mandant: TANTIEMES.MOREAU,
    statut: 'utilise',
    date_reception: '2023-10-14',
    date_signature: '2023-10-12',
    date_utilisation: '2023-10-15',
    valide_par: 'Secrétaire de séance',
    date_validation: '2023-10-15',
    observations: 'Absent pour déplacement professionnel',
    created_at: '2023-10-12T09:00:00Z',
    updated_at: '2023-10-15T20:00:00Z',
  },
];

// ============================================
// DONNÉES MOCK - AG ORDINAIRE 2023
// ============================================

const MANDATS_AG_2023: Mandat[] = [
  {
    id: MANDAT_IDS.MAN_2023ORD_SIMON,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2023,
    mandant_id: COPROPRIETAIRE_IDS.SIMON_M,
    mandataire_id: COPROPRIETAIRE_IDS.DUPONT_MARTIN,
    reference: 'MAN-2023-001',
    numero_ordre: 1,
    type: 'nominatif',
    tantiemes_mandant: TANTIEMES.SIMON,
    statut: 'utilise',
    date_reception: '2023-06-08',
    date_signature: '2023-06-06',
    date_utilisation: '2023-06-10',
    valide_par: 'Secrétaire de séance',
    date_validation: '2023-06-10',
    created_at: '2023-06-06T10:00:00Z',
    updated_at: '2023-06-10T20:00:00Z',
  },
  {
    id: MANDAT_IDS.MAN_2023ORD_GARCIA,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2023,
    mandant_id: COPROPRIETAIRE_IDS.GARCIA_MME,
    mandataire_id: COPROPRIETAIRE_IDS.LAURENT_SOPHIE,
    reference: 'MAN-2023-002',
    numero_ordre: 2,
    type: 'nominatif',
    tantiemes_mandant: TANTIEMES.GARCIA,
    statut: 'utilise',
    date_reception: '2023-06-09',
    date_signature: '2023-06-07',
    date_utilisation: '2023-06-10',
    valide_par: 'Secrétaire de séance',
    date_validation: '2023-06-10',
    created_at: '2023-06-07T14:00:00Z',
    updated_at: '2023-06-10T20:00:00Z',
  },
  {
    id: MANDAT_IDS.MAN_2023ORD_THOMAS,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2023,
    mandant_id: COPROPRIETAIRE_IDS.THOMAS_M,
    mandataire_id: COPROPRIETAIRE_IDS.LOPEZ_MME,
    reference: 'MAN-2023-003',
    numero_ordre: 3,
    type: 'nominatif',
    tantiemes_mandant: TANTIEMES.THOMAS,
    statut: 'utilise',
    date_reception: '2023-06-09',
    date_signature: '2023-06-08',
    date_utilisation: '2023-06-10',
    valide_par: 'Secrétaire de séance',
    date_validation: '2023-06-10',
    created_at: '2023-06-08T09:00:00Z',
    updated_at: '2023-06-10T20:00:00Z',
  },
];

// ============================================
// DONNÉES MOCK - AG 2025 (À VENIR)
// ============================================

const MANDATS_AG_2025: Mandat[] = [
  {
    id: MANDAT_IDS.MAN_2025_SIMON,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2025,
    mandant_id: COPROPRIETAIRE_IDS.SIMON_M,
    mandataire_id: COPROPRIETAIRE_IDS.DUPONT_MARTIN,
    reference: 'MAN-2025-001',
    numero_ordre: 1,
    type: 'nominatif',
    tantiemes_mandant: TANTIEMES.SIMON,
    statut: 'valide',
    date_reception: '2025-05-20',
    date_signature: '2025-05-18',
    valide_par: 'Syndic',
    date_validation: '2025-05-20',
    observations: 'Mandat reçu - AG prévue le 14/06/2025',
    created_at: '2025-05-18T10:00:00Z',
    updated_at: '2025-05-20T14:00:00Z',
  },
  {
    id: MANDAT_IDS.MAN_2025_GARCIA,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2025,
    mandant_id: COPROPRIETAIRE_IDS.GARCIA_MME,
    mandataire_id: COPROPRIETAIRE_IDS.LAURENT_SOPHIE,
    reference: 'MAN-2025-002',
    numero_ordre: 2,
    type: 'nominatif',
    tantiemes_mandant: TANTIEMES.GARCIA,
    statut: 'valide',
    date_reception: '2025-05-22',
    date_signature: '2025-05-21',
    valide_par: 'Syndic',
    date_validation: '2025-05-22',
    observations: 'Mandat reçu - En attente de l\'AG',
    created_at: '2025-05-21T09:00:00Z',
    updated_at: '2025-05-22T10:00:00Z',
  },
];

// ============================================
// EXPORT CONSOLIDÉ
// ============================================

export const MANDATS_MOCK: Mandat[] = [
  ...MANDATS_AG_2024,
  ...MANDATS_AGE_2023,
  ...MANDATS_AG_2023,
  ...MANDATS_AG_2025,
];

// ============================================
// STATISTIQUES
// ============================================

export const MANDATS_STATS = {
  total: MANDATS_MOCK.length,
  par_statut: {
    valide: MANDATS_MOCK.filter((m) => m.statut === 'valide').length,
    utilise: MANDATS_MOCK.filter((m) => m.statut === 'utilise').length,
    expire: MANDATS_MOCK.filter((m) => m.statut === 'expire').length,
    annule: MANDATS_MOCK.filter((m) => m.statut === 'annule').length,
  },
  par_type: {
    nominatif: MANDATS_MOCK.filter((m) => m.type === 'nominatif').length,
    en_blanc: MANDATS_MOCK.filter((m) => m.type === 'en_blanc').length,
    syndic: MANDATS_MOCK.filter((m) => m.type === 'syndic').length,
    president_seance: MANDATS_MOCK.filter((m) => m.type === 'president_seance')
      .length,
  },
  tantiemes_totaux_representes: MANDATS_MOCK.reduce(
    (sum, m) => sum + m.tantiemes_mandant,
    0
  ),
  assemblees_couvertes: Array.from(new Set(MANDATS_MOCK.map((m) => m.assemblee_id)))
    .length,
};

// ============================================
// TABLE DE CORRESPONDANCE (migration)
// ============================================

export const MANDAT_ID_MAP: Record<string, string> = {
  // Mapping pour les anciens IDs si nécessaire
};

// ============================================
// HELPERS
// ============================================

export function getMandatById(id: string): Mandat | undefined {
  return MANDATS_MOCK.find((m) => m.id === id);
}

export function getMandatsByAssemblee(assembleeId: string): Mandat[] {
  return MANDATS_MOCK.filter((m) => m.assemblee_id === assembleeId).sort(
    (a, b) => a.numero_ordre - b.numero_ordre
  );
}

export function getMandatsByMandant(mandantId: string): Mandat[] {
  return MANDATS_MOCK.filter((m) => m.mandant_id === mandantId);
}

export function getMandatsByMandataire(mandataireId: string): Mandat[] {
  return MANDATS_MOCK.filter((m) => m.mandataire_id === mandataireId);
}

export function getMandatsValides(assembleeId: string): Mandat[] {
  return MANDATS_MOCK.filter(
    (m) =>
      m.assemblee_id === assembleeId &&
      (m.statut === 'valide' || m.statut === 'utilise')
  );
}

export function compterMandatsMandataire(
  mandataireId: string,
  assembleeId: string
): number {
  return MANDATS_MOCK.filter(
    (m) =>
      m.mandataire_id === mandataireId &&
      m.assemblee_id === assembleeId &&
      (m.statut === 'valide' || m.statut === 'utilise')
  ).length;
}

export function calculerTantiemesRepresentes(
  mandataireId: string,
  assembleeId: string
): number {
  return MANDATS_MOCK.filter(
    (m) =>
      m.mandataire_id === mandataireId &&
      m.assemblee_id === assembleeId &&
      (m.statut === 'valide' || m.statut === 'utilise')
  ).reduce((sum, m) => sum + m.tantiemes_mandant, 0);
}

export function verifierLimitesMandataire(
  mandataireId: string,
  assembleeId: string,
  totalTantiemes: number
): {
  nb_mandats: number;
  limite_atteinte: boolean;
  tantiemes_representes: number;
  pourcentage_represente: number;
  plafond_depasse: boolean;
} {
  const nbMandats = compterMandatsMandataire(mandataireId, assembleeId);
  const tantiemesRepresentes = calculerTantiemesRepresentes(
    mandataireId,
    assembleeId
  );
  const pourcentageRepresente =
    Math.round((tantiemesRepresentes / totalTantiemes) * 10000) / 100;

  return {
    nb_mandats: nbMandats,
    limite_atteinte: nbMandats >= MAX_MANDATS_PAR_MANDATAIRE,
    tantiemes_representes: tantiemesRepresentes,
    pourcentage_represente: pourcentageRepresente,
    plafond_depasse: pourcentageRepresente > PLAFOND_TANTIEMES_PERCENT,
  };
}

export function getHistoriqueMandatsMandant(
  mandantId: string
): {
  assemblee_id: string;
  date: string;
  mandataire_id: string;
  type: TypeMandat;
  statut: StatutMandat;
}[] {
  return getMandatsByMandant(mandantId)
    .map((m) => ({
      assemblee_id: m.assemblee_id,
      date: m.date_signature,
      mandataire_id: m.mandataire_id,
      type: m.type,
      statut: m.statut,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getStatistiquesMandataire(
  mandataireId: string
): {
  total_mandats: number;
  mandats_par_ag: { assemblee_id: string; count: number }[];
  tantiemes_representes_total: number;
} {
  const mandats = getMandatsByMandataire(mandataireId);

  const mandatsParAG = mandats.reduce(
    (acc, m) => {
      const existing = acc.find((x) => x.assemblee_id === m.assemblee_id);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ assemblee_id: m.assemblee_id, count: 1 });
      }
      return acc;
    },
    [] as { assemblee_id: string; count: number }[]
  );

  return {
    total_mandats: mandats.length,
    mandats_par_ag: mandatsParAG,
    tantiemes_representes_total: mandats.reduce(
      (sum, m) => sum + m.tantiemes_mandant,
      0
    ),
  };
}
