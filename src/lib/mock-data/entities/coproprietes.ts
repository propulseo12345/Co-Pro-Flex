/**
 * Mock Data - Copropriétés
 *
 * @source Créé pour centraliser les références copropriété
 * @created 2025-01-19
 *
 * Relations:
 * - syndic_user_id → users.id
 *
 * Notes:
 * - Entité racine nécessaire pour toutes les autres entités
 * - 2 copropriétés : une principale (active) et une secondaire (pour tests)
 * - L'adresse "50 Route La Carrière au Loup" est utilisée dans les templates OS
 */

import { BaseEntity, Adresse } from '../types';
import { USER_IDS } from './users';

// ============================================
// TYPE COPROPRIETE
// ============================================

export interface Copropriete extends BaseEntity {
  nom: string;
  adresse: Adresse;
  siret?: string;
  code_ape?: string;
  numero_rcs?: string;
  syndic_user_id: string;
  president_cs_user_id?: string;
  date_creation_syndicat: string;
  exercice_debut_mois: number; // 1-12
  exercice_fin_mois: number; // 1-12
  total_tantiemes: number;
  nombre_lots: number;
  nombre_batiments: number;
  annee_construction?: number;
  surface_totale_m2?: number;
  has_ascenseur: boolean;
  has_parking: boolean;
  has_gardien: boolean;
  compte_bancaire_principal?: CompteBancaireCopro;
  compte_bancaire_travaux?: CompteBancaireCopro;
  is_active: boolean;
}

export interface CompteBancaireCopro {
  banque: string;
  iban: string;
  bic: string;
  titulaire: string;
}

// ============================================
// IDS PRÉGÉNÉRÉS (pour cohérence des FK)
// ============================================

export const COPROPRIETE_IDS = {
  PRINCIPALE: 'cop_a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5',
  SECONDAIRE: 'cop_b2c3d4e5-f6a7-4b8c-9d0e-f1a2b3c4d5e6',
} as const;

// ============================================
// DONNÉES MOCK
// ============================================

export const COPROPRIETES_MOCK: Copropriete[] = [
  {
    id: COPROPRIETE_IDS.PRINCIPALE,
    nom: 'Résidence La Carrière au Loup',
    adresse: {
      ligne1: '50 Route La Carrière au Loup',
      codePostal: '75002',
      ville: 'Paris',
      pays: 'France',
    },
    siret: '123 456 789 00012',
    code_ape: '6832A',
    syndic_user_id: USER_IDS.SYNDIC,
    president_cs_user_id: USER_IDS.PRESIDENT_CS,
    date_creation_syndicat: '1985-03-15',
    exercice_debut_mois: 1,
    exercice_fin_mois: 12,
    total_tantiemes: 10000,
    nombre_lots: 30,
    nombre_batiments: 2,
    annee_construction: 1975,
    surface_totale_m2: 2500,
    has_ascenseur: true,
    has_parking: true,
    has_gardien: false,
    compte_bancaire_principal: {
      banque: 'BNP Paribas',
      iban: 'FR76 1234 5678 9012 3456 7890 123',
      bic: 'BNPAFRPP',
      titulaire: 'SDC Résidence La Carrière au Loup',
    },
    compte_bancaire_travaux: {
      banque: 'BNP Paribas',
      iban: 'FR76 9876 5432 1098 7654 3210 987',
      bic: 'BNPAFRPP',
      titulaire: 'SDC Résidence La Carrière au Loup - Fonds Travaux',
    },
    is_active: true,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2025-01-19T10:00:00Z',
  },
  {
    id: COPROPRIETE_IDS.SECONDAIRE,
    nom: 'Résidence Les Tilleuls',
    adresse: {
      ligne1: '12 Avenue des Tilleuls',
      codePostal: '69003',
      ville: 'Lyon',
      pays: 'France',
    },
    siret: '987 654 321 00034',
    code_ape: '6832A',
    syndic_user_id: USER_IDS.SYNDIC,
    date_creation_syndicat: '1992-06-20',
    exercice_debut_mois: 1,
    exercice_fin_mois: 12,
    total_tantiemes: 5000,
    nombre_lots: 15,
    nombre_batiments: 1,
    annee_construction: 1988,
    surface_totale_m2: 1200,
    has_ascenseur: false,
    has_parking: true,
    has_gardien: false,
    compte_bancaire_principal: {
      banque: 'Crédit Agricole',
      iban: 'FR76 1111 2222 3333 4444 5555 666',
      bic: 'AGRIFRPP',
      titulaire: 'SDC Résidence Les Tilleuls',
    },
    is_active: true,
    created_at: '2021-06-01T00:00:00Z',
    updated_at: '2025-01-15T14:30:00Z',
  },
];

// ============================================
// STATISTIQUES
// ============================================

export const COPROPRIETES_STATS = {
  total: COPROPRIETES_MOCK.length,
  actives: COPROPRIETES_MOCK.filter((c) => c.is_active).length,
  total_lots: COPROPRIETES_MOCK.reduce((acc, c) => acc + c.nombre_lots, 0),
  total_tantiemes: COPROPRIETES_MOCK.reduce((acc, c) => acc + c.total_tantiemes, 0),
  avec_ascenseur: COPROPRIETES_MOCK.filter((c) => c.has_ascenseur).length,
  avec_parking: COPROPRIETES_MOCK.filter((c) => c.has_parking).length,
  avec_gardien: COPROPRIETES_MOCK.filter((c) => c.has_gardien).length,
};

// ============================================
// TABLE DE CORRESPONDANCE (ancien → nouveau ID)
// ============================================

/**
 * Note: Les anciens fichiers n'avaient pas d'ID explicite de copropriété,
 * toutes les données étaient implicitement liées à une seule copropriété.
 * On utilise PRINCIPALE comme référence par défaut.
 */
export const COPROPRIETES_ID_MAP: Record<string, string> = {
  default: COPROPRIETE_IDS.PRINCIPALE,
  '1': COPROPRIETE_IDS.PRINCIPALE,
  principale: COPROPRIETE_IDS.PRINCIPALE,
  secondaire: COPROPRIETE_IDS.SECONDAIRE,
};

// ============================================
// HELPERS
// ============================================

/**
 * Récupère une copropriété par son ID
 */
export function getCoproprieteById(id: string): Copropriete | undefined {
  return COPROPRIETES_MOCK.find((c) => c.id === id);
}

/**
 * Récupère la copropriété principale (par défaut)
 */
export function getCoproprietePrincipale(): Copropriete {
  return COPROPRIETES_MOCK.find((c) => c.id === COPROPRIETE_IDS.PRINCIPALE)!;
}

/**
 * Récupère les copropriétés d'un syndic
 */
export function getCoproprietesBySyndic(syndicUserId: string): Copropriete[] {
  return COPROPRIETES_MOCK.filter((c) => c.syndic_user_id === syndicUserId);
}

/**
 * Calcule le pourcentage de tantièmes pour un lot
 */
export function calculerPourcentageTantiemes(
  coproprieteId: string,
  tantiemesLot: number
): number {
  const copro = getCoproprieteById(coproprieteId);
  if (!copro) return 0;
  return (tantiemesLot / copro.total_tantiemes) * 100;
}

/**
 * Retourne l'adresse formatée
 */
export function formatAdresseCopropriete(copro: Copropriete): string {
  const { ligne1, ligne2, codePostal, ville } = copro.adresse;
  const parts = [ligne1];
  if (ligne2) parts.push(ligne2);
  parts.push(`${codePostal} ${ville}`);
  return parts.join(', ');
}

// ============================================
// CONSTANTES MÉTIER
// ============================================

/**
 * Pourcentage minimum du budget pour le fonds ALUR (loi du 10 juillet 1965)
 */
export const FONDS_ALUR_POURCENTAGE_MIN = 5;

/**
 * Seuil de tantièmes pour les votes à l'unanimité
 */
export const SEUIL_UNANIMITE_TANTIEMES = 100; // 100% des tantièmes

/**
 * Délai minimum de convocation AG (jours)
 */
export const DELAI_CONVOCATION_AG_JOURS = 21;
