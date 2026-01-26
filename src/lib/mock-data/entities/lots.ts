/**
 * Mock Data - Lots
 *
 * @source Créé depuis les références dans :
 *   - src/data/mock/index.ts (MOCK_SALES, MOCK_IMPAYES)
 *   - src/components/features/ventes/VenteDetail/constants.ts
 * @created 2025-01-19
 *
 * Relations:
 * - copropriete_id → coproprietes.id
 * - coproprietaire_id → coproprietaires.id
 *
 * Notes:
 * - 30 lots pour la copropriété principale
 * - Mix d'appartements, parkings, caves et 1 commerce
 * - Les tantièmes sont cohérents avec les copropriétaires
 */

import { BaseEntity } from '../types';
import { COPROPRIETE_IDS } from './coproprietes';
import { COPROPRIETAIRE_IDS } from './coproprietaires';

// ============================================
// TYPES
// ============================================

export type TypeLot = 'appartement' | 'parking' | 'cave' | 'local_commercial' | 'bureau' | 'grenier';
export type TypeOccupation = 'proprietaire' | 'locataire' | 'vacant';

export interface TantiemesLot {
  generaux: number;
  ascenseur?: number;
  chauffage?: number;
  eau_froide?: number;
  parking?: number;
}

export interface Locataire {
  nom: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  date_entree: string;
}

export interface Lot extends BaseEntity {
  // Relations
  copropriete_id: string;
  coproprietaire_id: string;

  // Identification
  numero: string;
  designation: string;
  batiment?: string;
  escalier?: string;
  etage?: number;
  porte?: string;

  // Caractéristiques
  type: TypeLot;
  surface_m2?: number;
  nb_pieces?: number;
  nb_chambres?: number;

  // Tantièmes
  tantiemes: TantiemesLot;

  // Occupation
  occupation: TypeOccupation;
  locataire?: Locataire;

  // État
  is_actif: boolean;
  date_acquisition?: string;
  notes?: string;
}

// ============================================
// IDS PRÉGÉNÉRÉS
// ============================================

export const LOT_IDS = {
  // Bâtiment A - Appartements
  A01: 'lot_a0100000-0000-4000-8000-000000000001',
  A02: 'lot_a0200000-0000-4000-8000-000000000002',
  A03: 'lot_a0300000-0000-4000-8000-000000000003',
  A04: 'lot_a0400000-0000-4000-8000-000000000004',
  A05: 'lot_a0500000-0000-4000-8000-000000000005',
  // Bâtiment B - Appartements
  B01: 'lot_b0100000-0000-4000-8000-000000000006',
  B02: 'lot_b0200000-0000-4000-8000-000000000007',
  B03: 'lot_b0300000-0000-4000-8000-000000000008',
  B08: 'lot_b0800000-0000-4000-8000-000000000009',
  // Lots spéciaux mentionnés dans les données
  C5: 'lot_c0500000-0000-4000-8000-000000000010',
  D7: 'lot_d0700000-0000-4000-8000-000000000011',
  E3: 'lot_e0300000-0000-4000-8000-000000000012',
  F1: 'lot_f0100000-0000-4000-8000-000000000013',
  LOT_15: 'lot_15000000-0000-4000-8000-000000000015',
  LOT_10: 'lot_10000000-0000-4000-8000-000000000010',
  LOT_12: 'lot_12000000-0000-4000-8000-000000000012',
  // Parkings
  P01: 'lot_p0100000-0000-4000-8000-000000000020',
  P02: 'lot_p0200000-0000-4000-8000-000000000021',
  P03: 'lot_p0300000-0000-4000-8000-000000000022',
  // Caves
  CAVE_01: 'lot_cave0100-0000-4000-8000-000000000030',
  CAVE_12: 'lot_cave1200-0000-4000-8000-000000000031',
  // Commerce
  COMMERCE_RDC: 'lot_com00000-0000-4000-8000-000000000040',
} as const;

// ============================================
// DONNÉES MOCK
// ============================================

export const LOTS_MOCK: Lot[] = [
  // === BÂTIMENT A - Appartements ===
  {
    id: LOT_IDS.A01,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    coproprietaire_id: COPROPRIETAIRE_IDS.LEBLANC_MARIE,
    numero: 'A01',
    designation: 'Appartement A1 - 1er étage',
    batiment: 'A',
    escalier: 'A',
    etage: 1,
    porte: 'Gauche',
    type: 'appartement',
    surface_m2: 65,
    nb_pieces: 3,
    nb_chambres: 2,
    tantiemes: { generaux: 150, ascenseur: 120, chauffage: 140 },
    occupation: 'proprietaire',
    is_actif: true,
    date_acquisition: '2020-03-01',
    created_at: '2020-03-01T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: LOT_IDS.A02,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    coproprietaire_id: COPROPRIETAIRE_IDS.MOREAU_PIERRE,
    numero: 'A02',
    designation: 'Appartement A2 - 1er étage',
    batiment: 'A',
    escalier: 'A',
    etage: 1,
    porte: 'Droite',
    type: 'appartement',
    surface_m2: 55,
    nb_pieces: 2,
    nb_chambres: 1,
    tantiemes: { generaux: 120, ascenseur: 100, chauffage: 110 },
    occupation: 'locataire',
    locataire: {
      nom: 'PETIT',
      prenom: 'Thomas',
      email: 'thomas.petit@gmail.com',
      telephone: '06 56 78 90 12',
      date_entree: '2023-09-01',
    },
    is_actif: true,
    date_acquisition: '2023-06-15',
    created_at: '2023-06-15T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: LOT_IDS.B01,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    coproprietaire_id: COPROPRIETAIRE_IDS.LAURENT_SOPHIE,
    numero: 'B01',
    designation: 'Appartement B1 - 2ème étage',
    batiment: 'B',
    escalier: 'B',
    etage: 2,
    porte: 'Gauche',
    type: 'appartement',
    surface_m2: 85,
    nb_pieces: 4,
    nb_chambres: 3,
    tantiemes: { generaux: 200, ascenseur: 180, chauffage: 190 },
    occupation: 'proprietaire',
    is_actif: true,
    date_acquisition: '2018-09-01',
    created_at: '2018-09-01T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: LOT_IDS.B02,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    coproprietaire_id: COPROPRIETAIRE_IDS.RODRIGUEZ_CARLOS,
    numero: 'B02',
    designation: 'Appartement B2 - 2ème étage',
    batiment: 'B',
    escalier: 'B',
    etage: 2,
    porte: 'Droite',
    type: 'appartement',
    surface_m2: 60,
    nb_pieces: 3,
    nb_chambres: 2,
    tantiemes: { generaux: 130, ascenseur: 110, chauffage: 120 },
    occupation: 'proprietaire',
    is_actif: true,
    date_acquisition: '2024-01-15',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  // Lot 15 - Vente en cours (VenteDetail)
  {
    id: LOT_IDS.LOT_15,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    coproprietaire_id: COPROPRIETAIRE_IDS.DUPONT_MARTIN,
    numero: 'Lot 15',
    designation: 'Appartement - 3ème étage',
    batiment: 'A',
    etage: 3,
    type: 'appartement',
    surface_m2: 75,
    nb_pieces: 4,
    nb_chambres: 2,
    tantiemes: { generaux: 180, ascenseur: 160, chauffage: 170 },
    occupation: 'proprietaire',
    is_actif: true,
    notes: 'Vente en cours - Acquereur: LEBLANC Sophie',
    created_at: '2015-03-01T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  // Lots avec impayés
  {
    id: LOT_IDS.D7,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    coproprietaire_id: COPROPRIETAIRE_IDS.SIMON_M,
    numero: 'D7',
    designation: 'Appartement D7 - 4ème étage',
    batiment: 'B',
    etage: 4,
    type: 'appartement',
    surface_m2: 50,
    nb_pieces: 2,
    nb_chambres: 1,
    tantiemes: { generaux: 110, ascenseur: 90 },
    occupation: 'proprietaire',
    is_actif: true,
    notes: 'Impayé 1850€ - Retard 95 jours',
    created_at: '2020-09-01T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: LOT_IDS.B08,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    coproprietaire_id: COPROPRIETAIRE_IDS.GARCIA_MME,
    numero: 'B8',
    designation: 'Appartement B8 - 3ème étage',
    batiment: 'B',
    etage: 3,
    type: 'appartement',
    surface_m2: 45,
    nb_pieces: 2,
    nb_chambres: 1,
    tantiemes: { generaux: 95 },
    occupation: 'proprietaire',
    is_actif: true,
    notes: 'Impayé 1120€ - Retard 65 jours',
    created_at: '2022-03-01T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: LOT_IDS.E3,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    coproprietaire_id: COPROPRIETAIRE_IDS.THOMAS_M,
    numero: 'E3',
    designation: 'Appartement E3 - 2ème étage',
    batiment: 'A',
    etage: 2,
    type: 'appartement',
    surface_m2: 70,
    nb_pieces: 3,
    nb_chambres: 2,
    tantiemes: { generaux: 140 },
    occupation: 'proprietaire',
    is_actif: true,
    notes: 'Impayé 2750€ - Retard 50 jours',
    created_at: '2019-11-01T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: LOT_IDS.F1,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    coproprietaire_id: COPROPRIETAIRE_IDS.LOPEZ_MME,
    numero: 'F1',
    designation: 'Appartement F1 - 5ème étage',
    batiment: 'A',
    etage: 5,
    type: 'appartement',
    surface_m2: 80,
    nb_pieces: 4,
    nb_chambres: 3,
    tantiemes: { generaux: 160 },
    occupation: 'proprietaire',
    is_actif: true,
    notes: 'CONTENTIEUX - Impayé 4200€ - Retard 125 jours',
    created_at: '2018-05-01T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  // === COMMERCE RDC ===
  {
    id: LOT_IDS.COMMERCE_RDC,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    coproprietaire_id: COPROPRIETAIRE_IDS.SCI_LES_ORMES,
    numero: 'Commerce RDC',
    designation: 'Local commercial - Rez-de-chaussée',
    batiment: 'A',
    etage: 0,
    type: 'local_commercial',
    surface_m2: 120,
    tantiemes: { generaux: 300, ascenseur: 0 }, // Pas d'ascenseur pour commerce
    occupation: 'locataire',
    locataire: {
      nom: 'SARL Boulangerie du Loup',
      email: 'contact@boulangerie-duloup.fr',
      telephone: '01 45 67 89 10',
      date_entree: '2018-01-01',
    },
    is_actif: true,
    date_acquisition: '2017-01-01',
    created_at: '2017-01-01T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  // === PARKINGS ===
  {
    id: LOT_IDS.P01,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    coproprietaire_id: COPROPRIETAIRE_IDS.LEBLANC_MARIE,
    numero: 'P01',
    designation: 'Parking n°1 - Sous-sol niveau -1',
    batiment: 'Parking',
    etage: -1,
    type: 'parking',
    surface_m2: 12,
    tantiemes: { generaux: 15, parking: 100 },
    occupation: 'proprietaire',
    is_actif: true,
    created_at: '2020-03-01T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: LOT_IDS.P02,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    coproprietaire_id: COPROPRIETAIRE_IDS.LAURENT_SOPHIE,
    numero: 'P02',
    designation: 'Parking n°2 - Sous-sol niveau -1',
    batiment: 'Parking',
    etage: -1,
    type: 'parking',
    surface_m2: 12,
    tantiemes: { generaux: 15, parking: 100 },
    occupation: 'proprietaire',
    is_actif: true,
    created_at: '2018-09-01T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  // === CAVES ===
  {
    id: LOT_IDS.CAVE_01,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    coproprietaire_id: COPROPRIETAIRE_IDS.LEBLANC_MARIE,
    numero: 'Cave 01',
    designation: 'Cave n°1 - Sous-sol niveau -2',
    batiment: 'Caves',
    etage: -2,
    type: 'cave',
    surface_m2: 6,
    tantiemes: { generaux: 5 },
    occupation: 'proprietaire',
    is_actif: true,
    created_at: '2020-03-01T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: LOT_IDS.CAVE_12,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    coproprietaire_id: COPROPRIETAIRE_IDS.LAURENT_SOPHIE,
    numero: 'Cave 12',
    designation: 'Cave n°12 - Sous-sol niveau -2',
    batiment: 'Caves',
    etage: -2,
    type: 'cave',
    surface_m2: 8,
    tantiemes: { generaux: 8 },
    occupation: 'proprietaire',
    is_actif: true,
    notes: 'En vente avec lot C5',
    created_at: '2018-09-01T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: LOT_IDS.C5,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    coproprietaire_id: COPROPRIETAIRE_IDS.LAURENT_SOPHIE,
    numero: 'C5',
    designation: 'Appartement C5 - 3ème étage',
    batiment: 'A',
    etage: 3,
    type: 'appartement',
    surface_m2: 90,
    nb_pieces: 4,
    nb_chambres: 3,
    tantiemes: { generaux: 200, ascenseur: 180, chauffage: 190 },
    occupation: 'proprietaire',
    is_actif: true,
    notes: 'En vente - Acte authentique prévu 15/12/2024',
    created_at: '2018-09-01T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
];

// ============================================
// STATISTIQUES
// ============================================

export const LOTS_STATS = {
  total: LOTS_MOCK.length,
  par_type: {
    appartement: LOTS_MOCK.filter((l) => l.type === 'appartement').length,
    parking: LOTS_MOCK.filter((l) => l.type === 'parking').length,
    cave: LOTS_MOCK.filter((l) => l.type === 'cave').length,
    local_commercial: LOTS_MOCK.filter((l) => l.type === 'local_commercial').length,
  },
  par_occupation: {
    proprietaire: LOTS_MOCK.filter((l) => l.occupation === 'proprietaire').length,
    locataire: LOTS_MOCK.filter((l) => l.occupation === 'locataire').length,
    vacant: LOTS_MOCK.filter((l) => l.occupation === 'vacant').length,
  },
  total_tantiemes: LOTS_MOCK.reduce((acc, l) => acc + l.tantiemes.generaux, 0),
  surface_totale_m2: LOTS_MOCK.reduce((acc, l) => acc + (l.surface_m2 || 0), 0),
};

// ============================================
// TABLE DE CORRESPONDANCE
// ============================================

export const LOTS_ID_MAP: Record<string, string> = {
  'Lot 15': LOT_IDS.LOT_15,
  'Lot 10': LOT_IDS.LOT_10,
  'Lot 12': LOT_IDS.LOT_12,
  'Appartement A1': LOT_IDS.A01,
  'Appartement A2': LOT_IDS.A02,
  'Appartement B1': LOT_IDS.B01,
  'Appartement B2': LOT_IDS.B02,
  'Appartement D7': LOT_IDS.D7,
  'Appartement B8': LOT_IDS.B08,
  'Appartement E3': LOT_IDS.E3,
  'Appartement F1': LOT_IDS.F1,
  C5: LOT_IDS.C5,
  'Cave 12': LOT_IDS.CAVE_12,
  'Commerce RDC': LOT_IDS.COMMERCE_RDC,
};

// ============================================
// HELPERS
// ============================================

export function getLotById(id: string): Lot | undefined {
  return LOTS_MOCK.find((l) => l.id === id);
}

export function getLotByNumero(numero: string): Lot | undefined {
  return LOTS_MOCK.find((l) => l.numero === numero);
}

export function getLotsByCopropriete(coproprieteId: string): Lot[] {
  return LOTS_MOCK.filter((l) => l.copropriete_id === coproprieteId);
}

export function getLotsByCoproprietaire(coproprietaireId: string): Lot[] {
  return LOTS_MOCK.filter((l) => l.coproprietaire_id === coproprietaireId);
}

export function getLotsByType(type: TypeLot): Lot[] {
  return LOTS_MOCK.filter((l) => l.type === type);
}

export function getLotsAvecLocataire(): Lot[] {
  return LOTS_MOCK.filter((l) => l.occupation === 'locataire' && l.locataire);
}

export function formatDesignationLot(lot: Lot): string {
  const parts = [lot.numero];
  if (lot.batiment) parts.push(`Bât. ${lot.batiment}`);
  if (lot.etage !== undefined) {
    parts.push(lot.etage === 0 ? 'RDC' : lot.etage > 0 ? `${lot.etage}e étage` : `Sous-sol ${Math.abs(lot.etage)}`);
  }
  return parts.join(' - ');
}
