/**
 * Mock Data - Catégories Comptables (Plan Comptable Copropriété)
 *
 * @source Créé depuis :
 *   - src/components/features/finance/Comptabilite/data.ts → comptes utilisés
 *   - Plan comptable des copropriétés (normes françaises)
 * @created 2025-01-19
 *
 * Relations:
 * - parent_id → categories-comptables.id (hiérarchie)
 *
 * Notes:
 * - Plan comptable simplifié pour copropriétés
 * - Classes 1-5 : Bilan (Actif/Passif)
 * - Classe 6 : Charges
 * - Classe 7 : Produits
 */

import { BaseEntity } from '../types';

// ============================================
// TYPES
// ============================================

export type ClasseCompte = '1' | '2' | '3' | '4' | '5' | '6' | '7';
export type TypeCompteCategorie = 'actif' | 'passif' | 'charge' | 'produit';

export interface CategorieComptable extends BaseEntity {
  code: string;
  libelle: string;
  classe: ClasseCompte;
  type: TypeCompteCategorie;
  parent_id?: string;
  description?: string;
  is_actif: boolean;
}

// ============================================
// IDS PRÉGÉNÉRÉS
// ============================================

export const CATEGORIE_COMPTABLE_IDS = {
  // Classe 1 - Capitaux
  C102: 'cat_102_provisions_travaux',
  C105: 'cat_105_fonds_alur',
  // Classe 4 - Tiers
  C401: 'cat_401_fournisseurs',
  C450: 'cat_450_coproprietaires',
  // Classe 5 - Financiers
  C512: 'cat_512_banque',
  C532: 'cat_532_placements',
  // Classe 6 - Charges
  C606: 'cat_606_eau_electricite',
  C614: 'cat_614_personnel_exterieur',
  C615: 'cat_615_entretien_reparations',
  C616: 'cat_616_assurances',
  C622: 'cat_622_honoraires_syndic',
  C627: 'cat_627_services_bancaires',
  C681: 'cat_681_dotations_provisions',
  // Classe 7 - Produits
  C701: 'cat_701_appels_fonds',
  C703: 'cat_703_fonds_travaux_alur',
  C76: 'cat_76_produits_financiers',
} as const;

// ============================================
// DONNÉES MOCK
// ============================================

export const CATEGORIES_COMPTABLES_MOCK: CategorieComptable[] = [
  // ============================================
  // CLASSE 1 - CAPITAUX
  // ============================================
  {
    id: CATEGORIE_COMPTABLE_IDS.C102,
    code: '102',
    libelle: 'Provisions pour travaux',
    classe: '1',
    type: 'passif',
    description: 'Provisions pour travaux futurs votés en AG',
    is_actif: true,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: CATEGORIE_COMPTABLE_IDS.C105,
    code: '105',
    libelle: 'Fonds de travaux ALUR',
    classe: '1',
    type: 'passif',
    description: 'Fonds de travaux obligatoire (loi ALUR)',
    is_actif: true,
    created_at: '2017-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },

  // ============================================
  // CLASSE 4 - COMPTES DE TIERS
  // ============================================
  {
    id: CATEGORIE_COMPTABLE_IDS.C401,
    code: '401',
    libelle: 'Fournisseurs',
    classe: '4',
    type: 'passif',
    description: 'Dettes envers les fournisseurs',
    is_actif: true,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: CATEGORIE_COMPTABLE_IDS.C450,
    code: '450',
    libelle: 'Copropriétaires - Créances',
    classe: '4',
    type: 'actif',
    description: 'Créances sur les copropriétaires (appels de fonds)',
    is_actif: true,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },

  // ============================================
  // CLASSE 5 - COMPTES FINANCIERS
  // ============================================
  {
    id: CATEGORIE_COMPTABLE_IDS.C512,
    code: '512',
    libelle: 'Banque',
    classe: '5',
    type: 'actif',
    description: 'Compte bancaire principal',
    is_actif: true,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: CATEGORIE_COMPTABLE_IDS.C532,
    code: '532',
    libelle: 'Placements',
    classe: '5',
    type: 'actif',
    description: 'Placements financiers (fonds ALUR)',
    is_actif: true,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },

  // ============================================
  // CLASSE 6 - CHARGES
  // ============================================
  {
    id: CATEGORIE_COMPTABLE_IDS.C606,
    code: '606',
    libelle: 'Eau et électricité',
    classe: '6',
    type: 'charge',
    description: 'Charges de fluides (eau, électricité, gaz)',
    is_actif: true,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: CATEGORIE_COMPTABLE_IDS.C614,
    code: '614',
    libelle: 'Charges de personnel extérieur',
    classe: '6',
    type: 'charge',
    description: 'Ménage, gardiennage externalisé',
    is_actif: true,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: CATEGORIE_COMPTABLE_IDS.C615,
    code: '615',
    libelle: 'Entretien et réparations',
    classe: '6',
    type: 'charge',
    description: 'Maintenance, réparations courantes, ascenseur',
    is_actif: true,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: CATEGORIE_COMPTABLE_IDS.C616,
    code: '616',
    libelle: "Primes d'assurance",
    classe: '6',
    type: 'charge',
    description: 'Assurance multirisque immeuble',
    is_actif: true,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: CATEGORIE_COMPTABLE_IDS.C622,
    code: '622',
    libelle: 'Honoraires syndic',
    classe: '6',
    type: 'charge',
    description: 'Honoraires du syndic de copropriété',
    is_actif: true,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: CATEGORIE_COMPTABLE_IDS.C627,
    code: '627',
    libelle: 'Services bancaires',
    classe: '6',
    type: 'charge',
    description: 'Frais bancaires, commissions',
    is_actif: true,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: CATEGORIE_COMPTABLE_IDS.C681,
    code: '681',
    libelle: 'Dotations aux provisions',
    classe: '6',
    type: 'charge',
    description: 'Dotations aux provisions pour travaux',
    is_actif: true,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },

  // ============================================
  // CLASSE 7 - PRODUITS
  // ============================================
  {
    id: CATEGORIE_COMPTABLE_IDS.C701,
    code: '701',
    libelle: 'Appels de fonds',
    classe: '7',
    type: 'produit',
    description: 'Appels de fonds budget prévisionnel',
    is_actif: true,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: CATEGORIE_COMPTABLE_IDS.C703,
    code: '703',
    libelle: 'Fonds de travaux ALUR',
    classe: '7',
    type: 'produit',
    description: 'Cotisations au fonds de travaux ALUR',
    is_actif: true,
    created_at: '2017-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: CATEGORIE_COMPTABLE_IDS.C76,
    code: '76',
    libelle: 'Produits financiers',
    classe: '7',
    type: 'produit',
    description: 'Intérêts sur placements',
    is_actif: true,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

// ============================================
// STATISTIQUES
// ============================================

export const CATEGORIES_COMPTABLES_STATS = {
  total: CATEGORIES_COMPTABLES_MOCK.length,
  par_classe: {
    '1': CATEGORIES_COMPTABLES_MOCK.filter((c) => c.classe === '1').length,
    '4': CATEGORIES_COMPTABLES_MOCK.filter((c) => c.classe === '4').length,
    '5': CATEGORIES_COMPTABLES_MOCK.filter((c) => c.classe === '5').length,
    '6': CATEGORIES_COMPTABLES_MOCK.filter((c) => c.classe === '6').length,
    '7': CATEGORIES_COMPTABLES_MOCK.filter((c) => c.classe === '7').length,
  },
  par_type: {
    actif: CATEGORIES_COMPTABLES_MOCK.filter((c) => c.type === 'actif').length,
    passif: CATEGORIES_COMPTABLES_MOCK.filter((c) => c.type === 'passif').length,
    charge: CATEGORIES_COMPTABLES_MOCK.filter((c) => c.type === 'charge').length,
    produit: CATEGORIES_COMPTABLES_MOCK.filter((c) => c.type === 'produit').length,
  },
};

// ============================================
// TABLE DE CORRESPONDANCE
// ============================================

export const CATEGORIES_COMPTABLES_ID_MAP: Record<string, string> = {
  '102': CATEGORIE_COMPTABLE_IDS.C102,
  '105': CATEGORIE_COMPTABLE_IDS.C105,
  '401': CATEGORIE_COMPTABLE_IDS.C401,
  '450': CATEGORIE_COMPTABLE_IDS.C450,
  '512': CATEGORIE_COMPTABLE_IDS.C512,
  '532': CATEGORIE_COMPTABLE_IDS.C532,
  '606': CATEGORIE_COMPTABLE_IDS.C606,
  '614': CATEGORIE_COMPTABLE_IDS.C614,
  '615': CATEGORIE_COMPTABLE_IDS.C615,
  '616': CATEGORIE_COMPTABLE_IDS.C616,
  '622': CATEGORIE_COMPTABLE_IDS.C622,
  '627': CATEGORIE_COMPTABLE_IDS.C627,
  '681': CATEGORIE_COMPTABLE_IDS.C681,
  '701': CATEGORIE_COMPTABLE_IDS.C701,
  '703': CATEGORIE_COMPTABLE_IDS.C703,
  '76': CATEGORIE_COMPTABLE_IDS.C76,
};

// ============================================
// HELPERS
// ============================================

export function getCategorieByCode(code: string): CategorieComptable | undefined {
  return CATEGORIES_COMPTABLES_MOCK.find((c) => c.code === code);
}

export function getCategorieById(id: string): CategorieComptable | undefined {
  return CATEGORIES_COMPTABLES_MOCK.find((c) => c.id === id);
}

export function getCategoriesByClasse(classe: ClasseCompte): CategorieComptable[] {
  return CATEGORIES_COMPTABLES_MOCK.filter((c) => c.classe === classe);
}

export function getCategoriesByType(type: TypeCompteCategorie): CategorieComptable[] {
  return CATEGORIES_COMPTABLES_MOCK.filter((c) => c.type === type);
}

export function getCharges(): CategorieComptable[] {
  return getCategoriesByType('charge');
}

export function getProduits(): CategorieComptable[] {
  return getCategoriesByType('produit');
}

export function isCharge(code: string): boolean {
  return code.startsWith('6');
}

export function isProduit(code: string): boolean {
  return code.startsWith('7');
}

/**
 * Mapping type de dépense → code comptable
 */
export const TYPE_DEPENSE_TO_COMPTE: Record<string, string> = {
  eau: '606',
  electricite: '606',
  entretien: '615',
  assurance: '616',
  travaux: '615',
  menage: '614',
  ascenseur: '615',
  plomberie: '615',
  espaces_verts: '614',
  divers: '627',
};

/**
 * Retourne le compte comptable pour un type de dépense
 */
export function getCompteForTypeDepense(typeDepense: string): CategorieComptable | undefined {
  const code = TYPE_DEPENSE_TO_COMPTE[typeDepense];
  return code ? getCategorieByCode(code) : undefined;
}
