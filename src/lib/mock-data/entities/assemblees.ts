/**
 * Mock Data - Assemblées Générales
 *
 * @source src/data/mock/index.ts → MOCK_ASSEMBLEES (2 AG basiques)
 * @created 2025-01-19
 *
 * Relations:
 * - copropriete_id → coproprietes.id
 * - president_seance_id → coproprietaires.id
 * - secretaire_id → coproprietaires.id
 * - convocation_document_id → documents.id
 * - pv_document_id → documents.id
 *
 * Notes:
 * - Historique 10 ans (2015-2025)
 * - Total tantièmes copropriété: 1818
 * - Quorum AG ordinaire: 25% minimum (455 tantièmes)
 * - Les résolutions sont dans resolutions.ts
 */

import { BaseEntity } from '../types';
import { COPROPRIETE_IDS } from './coproprietes';
import { COPROPRIETAIRE_IDS } from './coproprietaires';
import { DOCUMENT_IDS } from './documents';

// ============================================
// TYPES
// ============================================

export type AGType = 'ordinaire' | 'extraordinaire' | 'mixte' | 'urgente';

export type AGStatut =
  | 'en_preparation'
  | 'convoquee'
  | 'en_cours'
  | 'terminee'
  | 'pv_diffuse'
  | 'annulee';

export interface ParticipationAG {
  coproprietaire_id: string;
  type_presence: 'present' | 'represente' | 'absent' | 'vote_correspondance';
  tantiemes: number;
  mandataire_id?: string; // Si représenté
  heure_arrivee?: string;
  heure_depart?: string;
  signature?: boolean;
}

export interface AssembleeGenerale extends BaseEntity {
  // FK Relations
  copropriete_id: string;
  president_seance_id?: string;
  secretaire_id?: string;
  convocation_document_id?: string;
  pv_document_id?: string;
  feuille_presence_document_id?: string;

  // Identification
  reference: string; // "AG-2024-001"
  type: AGType;
  annee: number;
  numero?: number; // Si plusieurs AG dans l'année

  // Dates et lieu
  date_ag: string;
  heure_debut: string;
  heure_fin?: string;
  lieu: string;
  adresse?: string;
  is_visio_possible: boolean;
  lien_visio?: string;

  // Convocation
  date_convocation?: string;
  date_limite_questions?: string;
  date_limite_mandats?: string;

  // Participation (calculés)
  nb_presents?: number;
  nb_representes?: number;
  nb_vote_correspondance?: number;
  nb_absents?: number;
  tantiemes_presents?: number;
  tantiemes_representes?: number;
  tantiemes_vote_correspondance?: number;
  quorum_atteint?: boolean;

  // Statut
  statut: AGStatut;

  // Scrutateurs
  scrutateurs?: string[]; // IDs copropriétaires

  // Notes
  observations?: string;
}

// ============================================
// CONSTANTES
// ============================================

export const TOTAL_TANTIEMES = 1818;
export const NB_COPROPRIETAIRES = 13;
export const QUORUM_MINIMUM = Math.ceil(TOTAL_TANTIEMES * 0.25); // 455 tantièmes

// ============================================
// IDS PRÉGÉNÉRÉS
// ============================================

export const ASSEMBLEE_IDS = {
  // AG futures
  AG_ORD_2026: 'ag_00000000-0000-4000-8000-000000000000',
  // AG récentes
  AG_ORD_2025: 'ag_11111111-1111-4111-8111-111111111111',
  AG_ORD_2024: 'ag_22222222-2222-4222-8222-222222222222',
  AGE_RAVALEMENT_2023: 'ag_33333333-3333-4333-8333-333333333333',
  AG_ORD_2023: 'ag_44444444-4444-4444-8444-444444444444',
  AG_ORD_2022: 'ag_55555555-5555-4555-8555-555555555555',
  // AG archives
  AG_ORD_2021: 'ag_66666666-6666-4666-8666-666666666666',
  AG_ORD_2020: 'ag_77777777-7777-4777-8777-777777777777',
} as const;

// ============================================
// DONNÉES MOCK
// ============================================

export const ASSEMBLEES_MOCK: AssembleeGenerale[] = [
  // ============================================
  // AG 2026 (future - en préparation)
  // ============================================
  {
    id: ASSEMBLEE_IDS.AG_ORD_2026,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    president_seance_id: undefined,
    secretaire_id: undefined,
    convocation_document_id: undefined,
    pv_document_id: undefined,
    reference: 'AG-2026-001',
    type: 'ordinaire',
    annee: 2026,
    numero: 1,
    date_ag: '2026-06-13',
    heure_debut: '10:00',
    lieu: 'Salle des fêtes - 15 rue de la Mairie',
    adresse: '15 rue de la Mairie, 69003 Lyon',
    is_visio_possible: true,
    lien_visio: 'https://meet.coproflex.fr/ag-2026',
    date_convocation: undefined,
    date_limite_questions: '2026-05-30',
    date_limite_mandats: '2026-06-11',
    statut: 'en_preparation',
    observations: 'AG ordinaire 2026 - Approbation comptes 2025 et budget 2027',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
  },

  // ============================================
  // AG 2025 (terminée - PV diffusé)
  // ============================================
  {
    id: ASSEMBLEE_IDS.AG_ORD_2025,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    president_seance_id: COPROPRIETAIRE_IDS.DUPONT_MARTIN,
    secretaire_id: COPROPRIETAIRE_IDS.LAURENT_SOPHIE,
    convocation_document_id: DOCUMENT_IDS.CONVOC_AG_2024,
    pv_document_id: DOCUMENT_IDS.PV_AG_2024,
    reference: 'AG-2025-001',
    type: 'ordinaire',
    annee: 2025,
    numero: 1,
    date_ag: '2025-06-14',
    heure_debut: '18:00',
    heure_fin: '21:00',
    lieu: 'Salle commune - RDC Bâtiment A',
    adresse: '25 avenue Victor Hugo, 69003 Lyon',
    is_visio_possible: true,
    lien_visio: 'https://meet.coproflex.fr/ag-2025',
    date_convocation: '2025-05-01',
    date_limite_questions: '2025-05-31',
    date_limite_mandats: '2025-06-12',
    nb_presents: 10,
    nb_representes: 2,
    nb_vote_correspondance: 1,
    nb_absents: 0,
    tantiemes_presents: 1318,
    tantiemes_representes: 340,
    tantiemes_vote_correspondance: 160,
    quorum_atteint: true,
    statut: 'pv_diffuse',
    scrutateurs: [COPROPRIETAIRE_IDS.MOREAU_PIERRE, COPROPRIETAIRE_IDS.MARTIN_ANNE],
    observations: 'AG validée - Budget 2026 adopté - Travaux toiture votés (art. 25)',
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2025-07-01T00:00:00Z',
  },

  // ============================================
  // AG 2024 (terminée)
  // ============================================
  {
    id: ASSEMBLEE_IDS.AG_ORD_2024,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    president_seance_id: COPROPRIETAIRE_IDS.DUPONT_MARTIN,
    secretaire_id: COPROPRIETAIRE_IDS.LAURENT_SOPHIE,
    convocation_document_id: DOCUMENT_IDS.CONVOC_AG_2024,
    pv_document_id: DOCUMENT_IDS.PV_AG_2024,
    reference: 'AG-2024-001',
    type: 'ordinaire',
    annee: 2024,
    numero: 1,
    date_ag: '2024-06-15',
    heure_debut: '18:00',
    heure_fin: '21:30',
    lieu: 'Salle commune - RDC Bâtiment A',
    adresse: '25 avenue Victor Hugo, 69003 Lyon',
    is_visio_possible: true,
    lien_visio: 'https://meet.coproflex.fr/ag-2024',
    date_convocation: '2024-05-01',
    date_limite_questions: '2024-06-01',
    date_limite_mandats: '2024-06-13',
    // Participation: 9 présents + 2 représentés + 1 vote correspondance = 12/13 (92%)
    nb_presents: 9,
    nb_representes: 2,
    nb_vote_correspondance: 1,
    nb_absents: 1,
    // Tantièmes: calcul cohérent
    // Présents: LEBLANC(150) + MOREAU(120) + LAURENT(200) + DUBOIS(98) + MARTIN(135) + DUPONT(180) + RODRIGUEZ(130) + SIMON(110) + GARCIA(95) = 1218
    // Représentés: SCI_LES_ORMES(300) + THOMAS(140) = 440
    // Vote correspondance: LOPEZ(160)
    tantiemes_presents: 1218,
    tantiemes_representes: 440,
    tantiemes_vote_correspondance: 160,
    quorum_atteint: true,
    statut: 'pv_diffuse',
    scrutateurs: [COPROPRIETAIRE_IDS.MOREAU_PIERRE, COPROPRIETAIRE_IDS.MARTIN_ANNE],
    observations: 'AG validée - Budget 2025 adopté - Syndic renouvelé pour 3 ans',
    created_at: '2024-05-01T00:00:00Z',
    updated_at: '2024-07-01T00:00:00Z',
  },

  // ============================================
  // AGE Ravalement 2023 (terminée)
  // ============================================
  {
    id: ASSEMBLEE_IDS.AGE_RAVALEMENT_2023,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    president_seance_id: COPROPRIETAIRE_IDS.DUPONT_MARTIN,
    secretaire_id: COPROPRIETAIRE_IDS.MOREAU_PIERRE,
    pv_document_id: DOCUMENT_IDS.PV_AGE_RAVALEMENT_2023,
    reference: 'AG-2023-002',
    type: 'extraordinaire',
    annee: 2023,
    numero: 2,
    date_ag: '2023-10-15',
    heure_debut: '18:30',
    heure_fin: '20:45',
    lieu: 'Salle commune - RDC Bâtiment A',
    adresse: '25 avenue Victor Hugo, 69003 Lyon',
    is_visio_possible: false,
    date_convocation: '2023-09-01',
    date_limite_questions: '2023-10-01',
    date_limite_mandats: '2023-10-13',
    nb_presents: 10,
    nb_representes: 2,
    nb_absents: 1,
    tantiemes_presents: 1358,
    tantiemes_representes: 300, // SCI Les Ormes + 1 autre
    quorum_atteint: true,
    statut: 'pv_diffuse',
    scrutateurs: [COPROPRIETAIRE_IDS.LAURENT_SOPHIE],
    observations: 'Vote travaux ravalement façade - Adopté à la majorité art. 25',
    created_at: '2023-09-01T00:00:00Z',
    updated_at: '2023-11-01T00:00:00Z',
  },

  // ============================================
  // AG Ordinaire 2023 (terminée)
  // ============================================
  {
    id: ASSEMBLEE_IDS.AG_ORD_2023,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    president_seance_id: COPROPRIETAIRE_IDS.DUPONT_MARTIN,
    secretaire_id: COPROPRIETAIRE_IDS.LAURENT_SOPHIE,
    pv_document_id: DOCUMENT_IDS.PV_AG_2023,
    reference: 'AG-2023-001',
    type: 'ordinaire',
    annee: 2023,
    numero: 1,
    date_ag: '2023-05-20',
    heure_debut: '18:00',
    heure_fin: '21:00',
    lieu: 'Salle des fêtes - Mairie annexe',
    adresse: '12 place de la Mairie, 69003 Lyon',
    is_visio_possible: false,
    date_convocation: '2023-04-06',
    date_limite_questions: '2023-05-06',
    date_limite_mandats: '2023-05-18',
    nb_presents: 8,
    nb_representes: 3,
    nb_absents: 2,
    tantiemes_presents: 1043,
    tantiemes_representes: 550,
    quorum_atteint: true,
    statut: 'pv_diffuse',
    scrutateurs: [COPROPRIETAIRE_IDS.MOREAU_PIERRE, COPROPRIETAIRE_IDS.DUBOIS_JEAN],
    observations: 'AG ordinaire - Comptes 2022 approuvés - Budget 2024 voté',
    created_at: '2023-04-06T00:00:00Z',
    updated_at: '2023-06-15T00:00:00Z',
  },

  // ============================================
  // AG Ordinaire 2022 (terminée)
  // ============================================
  {
    id: ASSEMBLEE_IDS.AG_ORD_2022,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    president_seance_id: COPROPRIETAIRE_IDS.DUPONT_MARTIN,
    secretaire_id: COPROPRIETAIRE_IDS.MARTIN_ANNE,
    reference: 'AG-2022-001',
    type: 'ordinaire',
    annee: 2022,
    numero: 1,
    date_ag: '2022-05-18',
    heure_debut: '18:00',
    heure_fin: '20:30',
    lieu: 'Salle commune - RDC Bâtiment A',
    adresse: '25 avenue Victor Hugo, 69003 Lyon',
    is_visio_possible: true,
    date_convocation: '2022-04-04',
    nb_presents: 9,
    nb_representes: 2,
    nb_absents: 2,
    tantiemes_presents: 1193,
    tantiemes_representes: 400,
    quorum_atteint: true,
    statut: 'pv_diffuse',
    observations: 'AG ordinaire - Diagnostic énergétique voté',
    created_at: '2022-04-04T00:00:00Z',
    updated_at: '2022-06-10T00:00:00Z',
  },

  // ============================================
  // AG Ordinaire 2021 (terminée)
  // ============================================
  {
    id: ASSEMBLEE_IDS.AG_ORD_2021,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    president_seance_id: COPROPRIETAIRE_IDS.DUPONT_MARTIN,
    secretaire_id: COPROPRIETAIRE_IDS.LAURENT_SOPHIE,
    reference: 'AG-2021-001',
    type: 'ordinaire',
    annee: 2021,
    numero: 1,
    date_ag: '2021-06-12',
    heure_debut: '18:00',
    heure_fin: '21:15',
    lieu: 'Salle commune - RDC Bâtiment A',
    adresse: '25 avenue Victor Hugo, 69003 Lyon',
    is_visio_possible: true,
    date_convocation: '2021-04-28',
    nb_presents: 7,
    nb_representes: 4,
    nb_absents: 2,
    tantiemes_presents: 1023,
    tantiemes_representes: 570,
    quorum_atteint: true,
    statut: 'pv_diffuse',
    observations: 'AG post-COVID - Nombreux mandats en visio',
    created_at: '2021-04-28T00:00:00Z',
    updated_at: '2021-07-01T00:00:00Z',
  },

  // ============================================
  // AG Ordinaire 2020 (terminée - COVID)
  // ============================================
  {
    id: ASSEMBLEE_IDS.AG_ORD_2020,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    president_seance_id: COPROPRIETAIRE_IDS.DUPONT_MARTIN,
    secretaire_id: COPROPRIETAIRE_IDS.MOREAU_PIERRE,
    reference: 'AG-2020-001',
    type: 'ordinaire',
    annee: 2020,
    numero: 1,
    date_ag: '2020-09-25',
    heure_debut: '18:00',
    heure_fin: '20:00',
    lieu: 'Salle commune - RDC Bâtiment A',
    adresse: '25 avenue Victor Hugo, 69003 Lyon',
    is_visio_possible: true,
    lien_visio: 'https://zoom.us/j/xxx',
    date_convocation: '2020-08-11',
    nb_presents: 6,
    nb_representes: 5,
    nb_vote_correspondance: 2,
    nb_absents: 0,
    tantiemes_presents: 893,
    tantiemes_representes: 625,
    tantiemes_vote_correspondance: 300,
    quorum_atteint: true,
    statut: 'pv_diffuse',
    observations: 'AG reportée de mai à septembre cause COVID-19 - Vote par correspondance autorisé',
    created_at: '2020-08-11T00:00:00Z',
    updated_at: '2020-10-15T00:00:00Z',
  },
];

// ============================================
// PARTICIPATIONS (pour AG 2024)
// ============================================

export const PARTICIPATIONS_AG_2024: ParticipationAG[] = [
  // Présents
  { coproprietaire_id: COPROPRIETAIRE_IDS.LEBLANC_MARIE, type_presence: 'present', tantiemes: 150, signature: true },
  { coproprietaire_id: COPROPRIETAIRE_IDS.MOREAU_PIERRE, type_presence: 'present', tantiemes: 120, signature: true },
  { coproprietaire_id: COPROPRIETAIRE_IDS.LAURENT_SOPHIE, type_presence: 'present', tantiemes: 200, signature: true },
  { coproprietaire_id: COPROPRIETAIRE_IDS.DUBOIS_JEAN, type_presence: 'present', tantiemes: 98, signature: true },
  { coproprietaire_id: COPROPRIETAIRE_IDS.MARTIN_ANNE, type_presence: 'present', tantiemes: 135, signature: true },
  { coproprietaire_id: COPROPRIETAIRE_IDS.DUPONT_MARTIN, type_presence: 'present', tantiemes: 180, signature: true },
  { coproprietaire_id: COPROPRIETAIRE_IDS.RODRIGUEZ_CARLOS, type_presence: 'present', tantiemes: 130, signature: true },
  { coproprietaire_id: COPROPRIETAIRE_IDS.SIMON_M, type_presence: 'present', tantiemes: 110, signature: true },
  { coproprietaire_id: COPROPRIETAIRE_IDS.GARCIA_MME, type_presence: 'present', tantiemes: 95, signature: true },
  // Représentés
  { coproprietaire_id: COPROPRIETAIRE_IDS.SCI_LES_ORMES, type_presence: 'represente', tantiemes: 300, mandataire_id: COPROPRIETAIRE_IDS.DUPONT_MARTIN },
  { coproprietaire_id: COPROPRIETAIRE_IDS.THOMAS_M, type_presence: 'represente', tantiemes: 140, mandataire_id: COPROPRIETAIRE_IDS.LAURENT_SOPHIE },
  // Vote par correspondance
  { coproprietaire_id: COPROPRIETAIRE_IDS.LOPEZ_MME, type_presence: 'vote_correspondance', tantiemes: 160 },
  // Absent (aucun absent dans cet exemple, tous participent)
];

// ============================================
// STATISTIQUES
// ============================================

export const ASSEMBLEES_STATS = {
  total: ASSEMBLEES_MOCK.length,
  par_type: {
    ordinaire: ASSEMBLEES_MOCK.filter((a) => a.type === 'ordinaire').length,
    extraordinaire: ASSEMBLEES_MOCK.filter((a) => a.type === 'extraordinaire').length,
    mixte: ASSEMBLEES_MOCK.filter((a) => a.type === 'mixte').length,
  },
  par_statut: {
    en_preparation: ASSEMBLEES_MOCK.filter((a) => a.statut === 'en_preparation').length,
    convoquee: ASSEMBLEES_MOCK.filter((a) => a.statut === 'convoquee').length,
    en_cours: ASSEMBLEES_MOCK.filter((a) => a.statut === 'en_cours').length,
    terminee: ASSEMBLEES_MOCK.filter((a) => a.statut === 'terminee').length,
    pv_diffuse: ASSEMBLEES_MOCK.filter((a) => a.statut === 'pv_diffuse').length,
    annulee: ASSEMBLEES_MOCK.filter((a) => a.statut === 'annulee').length,
  },
  total_tantiemes: TOTAL_TANTIEMES,
  nb_coproprietaires: NB_COPROPRIETAIRES,
  quorum_minimum: QUORUM_MINIMUM,
};

// ============================================
// TABLE DE CORRESPONDANCE (migration)
// ============================================

export const ASSEMBLEE_ID_MAP: Record<string, string> = {
  '1': ASSEMBLEE_IDS.AG_ORD_2024,
  '2': ASSEMBLEE_IDS.AG_ORD_2023,
};

// ============================================
// HELPERS
// ============================================

export function getAssembleeById(id: string): AssembleeGenerale | undefined {
  return ASSEMBLEES_MOCK.find((a) => a.id === id);
}

export function getAssembleesByCopropriete(coproprieteId: string): AssembleeGenerale[] {
  return ASSEMBLEES_MOCK.filter((a) => a.copropriete_id === coproprieteId);
}

export function getAssembleesByAnnee(annee: number): AssembleeGenerale[] {
  return ASSEMBLEES_MOCK.filter((a) => a.annee === annee);
}

export function getAssembleesByStatut(statut: AGStatut): AssembleeGenerale[] {
  return ASSEMBLEES_MOCK.filter((a) => a.statut === statut);
}

export function getAssembleesTerminees(): AssembleeGenerale[] {
  return ASSEMBLEES_MOCK.filter(
    (a) => a.statut === 'terminee' || a.statut === 'pv_diffuse'
  );
}

export function getAssembleeEnPreparation(): AssembleeGenerale | undefined {
  return ASSEMBLEES_MOCK.find((a) => a.statut === 'en_preparation');
}

export function getProchaineAssemblee(): AssembleeGenerale | undefined {
  const today = new Date().toISOString().split('T')[0];
  return ASSEMBLEES_MOCK.filter((a) => a.date_ag > today && a.statut !== 'annulee')
    .sort((a, b) => a.date_ag.localeCompare(b.date_ag))[0];
}

export function getAssembleesFutures(): AssembleeGenerale[] {
  const today = new Date().toISOString().split('T')[0];
  return ASSEMBLEES_MOCK.filter((a) => a.date_ag >= today && a.statut !== 'annulee')
    .sort((a, b) => a.date_ag.localeCompare(b.date_ag));
}

export function getAssembleesPassees(): AssembleeGenerale[] {
  const today = new Date().toISOString().split('T')[0];
  return ASSEMBLEES_MOCK.filter((a) => a.date_ag < today)
    .sort((a, b) => b.date_ag.localeCompare(a.date_ag)); // Plus récente d'abord
}

export function calculerQuorum(ag: AssembleeGenerale): {
  total_votants: number;
  pourcentage: number;
  atteint: boolean;
} {
  const tantiemesVotants =
    (ag.tantiemes_presents || 0) +
    (ag.tantiemes_representes || 0) +
    (ag.tantiemes_vote_correspondance || 0);
  const pourcentage = (tantiemesVotants / TOTAL_TANTIEMES) * 100;
  return {
    total_votants: tantiemesVotants,
    pourcentage: Math.round(pourcentage * 100) / 100,
    atteint: tantiemesVotants >= QUORUM_MINIMUM,
  };
}

export function calculerSeuilMajorite(
  ag: AssembleeGenerale,
  typeMajorite: 'simple' | 'absolue' | 'double' | 'unanimite'
): number {
  const tantiemesVotants =
    (ag.tantiemes_presents || 0) +
    (ag.tantiemes_representes || 0) +
    (ag.tantiemes_vote_correspondance || 0);

  switch (typeMajorite) {
    case 'simple': // Article 24 - Majorité des présents/représentés
      return Math.floor(tantiemesVotants / 2) + 1;
    case 'absolue': // Article 25 - Majorité absolue de tous
      return Math.floor(TOTAL_TANTIEMES / 2) + 1;
    case 'double': // Article 26 - 2/3 des tantièmes
      return Math.floor((TOTAL_TANTIEMES * 2) / 3) + 1;
    case 'unanimite':
      return TOTAL_TANTIEMES;
    default:
      return Math.floor(tantiemesVotants / 2) + 1;
  }
}
